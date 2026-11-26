import { randomUUID } from 'node:crypto';
import { and, asc, count, eq, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { Db } from '../db/index';
import { reports, users, videos, type User } from '../db/schema';
import { audit } from '../audit';
import { canReport, canReview } from '../permissions';
import { byId } from '../../data/library';
import { getVideo, type Result } from './videos';

const clip = (s: string, n: number) => s.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, n);
const gone = { error: 'That video has changed. Reload the page.' } as const;

export function approveVideo(db: Db, actor: User, id: string): Result {
	if (!canReview(actor)) return { error: 'Staff only.' };
	const v = getVideo(db, id);
	if (!v || v.status !== 'requested') return gone;
	db.update(videos).set({ status: 'added', declineReason: null, reviewedBy: actor.id, reviewedAt: Date.now() }).where(eq(videos.id, id)).run();
	audit(db, actor, 'approve_video', 'video', id);
	return { ok: true };
}

export function declineVideo(db: Db, actor: User, id: string, reason: string): Result {
	if (!canReview(actor)) return { error: 'Staff only.' };
	const v = getVideo(db, id);
	if (!v || v.status !== 'requested') return gone;
	const why = clip(reason, 200) || null;
	db.update(videos).set({ status: 'declined', declineReason: why, reviewedBy: actor.id, reviewedAt: Date.now() }).where(eq(videos.id, id)).run();
	audit(db, actor, 'decline_video', 'video', id, why ?? undefined);
	return { ok: true };
}

/** Takes a video down for everyone (staff still see it in the log). Closes its open reports. */
export function removeVideo(db: Db, actor: User, id: string, reason = ''): Result {
	if (!canReview(actor)) return { error: 'Staff only.' };
	const v = getVideo(db, id);
	if (!v || v.status === 'removed') return gone;
	db.update(videos).set({ status: 'removed', reviewedBy: actor.id, reviewedAt: Date.now() }).where(eq(videos.id, id)).run();
	db.update(reports).set({ resolvedBy: actor.id, resolvedAt: Date.now() }).where(and(eq(reports.videoId, id), isNull(reports.resolvedAt))).run();
	audit(db, actor, 'remove_video', 'video', id, clip(reason, 200) || undefined);
	return { ok: true };
}

export function reportVideo(db: Db, actor: User, id: string, reason: string): Result {
	const v = getVideo(db, id);
	if (!v || !canReport(actor, v)) return { error: "You can't report that video." };
	const dupe = db
		.select({ id: reports.id })
		.from(reports)
		.where(and(eq(reports.videoId, id), eq(reports.reporterId, actor.id)))
		.get();
	if (dupe) return { error: 'You already reported this video.' };
	db.insert(reports).values({ id: randomUUID(), videoId: id, reporterId: actor.id, reason: clip(reason, 300) || 'No reason given', createdAt: Date.now() }).run();
	return { ok: true };
}

export function dismissReport(db: Db, actor: User, reportId: string): Result {
	if (!canReview(actor)) return { error: 'Staff only.' };
	const r = db.select().from(reports).where(eq(reports.id, reportId)).get();
	if (!r || r.resolvedAt) return gone;
	db.update(reports).set({ resolvedBy: actor.id, resolvedAt: Date.now() }).where(eq(reports.id, reportId)).run();
	audit(db, actor, 'resolve_report', 'report', reportId, 'kept video');
	return { ok: true };
}

export function reviewQueue(db: Db) {
	const owner = alias(users, 'owner');
	const requests = db
		.select({ id: videos.id, title: videos.title, exerciseId: videos.exerciseId, owner: owner.displayName, createdAt: videos.createdAt })
		.from(videos)
		.innerJoin(owner, eq(owner.id, videos.ownerId))
		.where(eq(videos.status, 'requested'))
		.orderBy(asc(videos.createdAt))
		.all()
		.map((r) => ({ ...r, exercise: byId(r.exerciseId)?.name ?? r.exerciseId }));
	const reporter = alias(users, 'reporter');
	const open = db
		.select({
			id: reports.id,
			videoId: reports.videoId,
			reason: reports.reason,
			createdAt: reports.createdAt,
			reporter: reporter.username,
			title: videos.title,
			exerciseId: videos.exerciseId,
			owner: owner.displayName
		})
		.from(reports)
		.innerJoin(videos, eq(videos.id, reports.videoId))
		.innerJoin(owner, eq(owner.id, videos.ownerId))
		.innerJoin(reporter, eq(reporter.id, reports.reporterId))
		.where(isNull(reports.resolvedAt))
		.orderBy(asc(reports.createdAt))
		.all()
		.map((r) => ({ ...r, exercise: byId(r.exerciseId)?.name ?? r.exerciseId }));
	return { requests, reports: open };
}

export function staffCounts(db: Db) {
	const n = (q: { n: number } | undefined) => q?.n ?? 0;
	const accounts = n(db.select({ n: count() }).from(users).where(eq(users.status, 'pending')).get());
	const requests = n(db.select({ n: count() }).from(videos).where(eq(videos.status, 'requested')).get());
	const open = n(db.select({ n: count() }).from(reports).where(isNull(reports.resolvedAt)).get());
	return { accounts, requests, reports: open, total: accounts + requests + open };
}
