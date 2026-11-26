import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { and, asc, eq } from 'drizzle-orm';
import { dataDir, type Db } from '../db/index';
import { reports, users, videos, type User, type Video } from '../db/schema';
import { audit } from '../audit';
import { canDeleteVideo, canMakePrivate, canRequestVideo, canSeeVideo, isStaff } from '../permissions';
import { diskStorage, type VideoStorage } from './storage';

export type Result = { ok: true } | { error: string };

export type VideoView = {
	id: string;
	title: string;
	status: Video['status'];
	kind: Video['kind'];
	declineReason: string | null;
	ownerName: string;
	mine: boolean;
	reportedByMe: boolean;
};

let storage: VideoStorage | undefined;
export const getStorage = () => (storage ??= diskStorage(join(dataDir(), 'videos')));

export const cleanTitle = (t: string) => t.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 60) || 'How-to';

/** Staff videos go straight to everyone. Player videos start private, or requested if they ask. */
export function createVideo(
	db: Db,
	actor: User,
	v: { exerciseId: string; title: string; fileId: string; durationS: number; request?: boolean }
): Video {
	const staff = isStaff(actor);
	const row: Video = {
		id: randomUUID(),
		ownerId: actor.id,
		exerciseId: v.exerciseId,
		kind: staff ? 'staff' : 'player',
		status: staff ? 'added' : v.request ? 'requested' : 'private',
		title: cleanTitle(v.title),
		declineReason: null,
		file: v.fileId,
		durationS: v.durationS,
		createdAt: Date.now(),
		reviewedBy: null,
		reviewedAt: null
	};
	db.insert(videos).values(row).run();
	if (staff) audit(db, actor, 'post_staff_video', 'video', row.id, v.exerciseId);
	return row;
}

export const getVideo = (db: Db, id: string): Video | undefined => db.select().from(videos).where(eq(videos.id, id)).get();

export function listVideosFor(db: Db, actor: User, exerciseId: string): { staff: VideoView[]; mine: VideoView[]; community: VideoView[] } {
	const rows = db
		.select({ v: videos, ownerName: users.displayName })
		.from(videos)
		.innerJoin(users, eq(users.id, videos.ownerId))
		.where(eq(videos.exerciseId, exerciseId))
		.orderBy(asc(videos.createdAt))
		.all();
	const reported = new Set(
		db.select({ id: reports.videoId }).from(reports).where(eq(reports.reporterId, actor.id)).all().map((r) => r.id)
	);
	const out = { staff: [] as VideoView[], mine: [] as VideoView[], community: [] as VideoView[] };
	for (const { v, ownerName } of rows) {
		if (v.status === 'removed' || !canSeeVideo(actor, v)) continue;
		const view: VideoView = {
			id: v.id,
			title: v.title,
			status: v.status,
			kind: v.kind,
			declineReason: v.ownerId === actor.id ? v.declineReason : null,
			ownerName,
			mine: v.ownerId === actor.id,
			reportedByMe: reported.has(v.id)
		};
		if (v.kind === 'staff') out.staff.push(view);
		else if (view.mine) out.mine.push(view);
		else if (v.status === 'added') out.community.push(view);
	}
	return out;
}

const NOT_FOUND = { error: 'That video is gone. Reload the page.' } as const;

export function requestVideo(db: Db, actor: User, id: string): Result {
	const v = getVideo(db, id);
	if (!v || !canRequestVideo(actor, v)) return NOT_FOUND;
	db.update(videos).set({ status: 'requested', declineReason: null }).where(and(eq(videos.id, id), eq(videos.status, v.status))).run();
	return { ok: true };
}

export function makePrivate(db: Db, actor: User, id: string): Result {
	const v = getVideo(db, id);
	if (!v || !canMakePrivate(actor, v)) return NOT_FOUND;
	db.update(videos).set({ status: 'private' }).where(eq(videos.id, id)).run();
	return { ok: true };
}

/** Deletes the video and its file for good. */
export async function deleteVideo(db: Db, store: VideoStorage, actor: User, id: string): Promise<Result> {
	const v = getVideo(db, id);
	if (!v || !canDeleteVideo(actor, v) || !canSeeVideo(actor, v)) return NOT_FOUND;
	db.delete(videos).where(eq(videos.id, id)).run();
	await store.remove(v.file);
	if (v.ownerId !== actor.id) audit(db, actor, 'remove_video', 'video', id, 'deleted');
	return { ok: true };
}
