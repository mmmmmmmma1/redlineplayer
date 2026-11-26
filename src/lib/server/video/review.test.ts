import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDb, type Db } from '../db/index';
import { auditLog, users, videos, type Role, type User } from '../db/schema';
import { createVideo, listVideosFor, requestVideo } from './videos';
import { approveVideo, declineVideo, dismissReport, removeVideo, reportVideo, reviewQueue, staffCounts } from './review';

function add(db: Db, id: string, role: Role = 'player'): User {
	const u: User = {
		id, username: id, usernameKey: id, displayName: id, passwordHash: 'x', role,
		status: 'active', createdAt: 0, decidedBy: null, decidedAt: null
	};
	db.insert(users).values(u).run();
	return u;
}

function setup() {
	const db = createDb(':memory:');
	const coach = add(db, 'coach', 'staff');
	const andrew = add(db, 'andrew');
	const myles = add(db, 'myles');
	const v = createVideo(db, andrew, { exerciseId: 'skater-bound', title: 'Bound', fileId: 'f', durationS: 3, request: true });
	return { db, coach, andrew, myles, v };
}
const status = (db: Db, id: string) => db.select().from(videos).where(eq(videos.id, id)).get()?.status;

describe('reviewing requests', () => {
	it('staff approves a request and it shows for everyone', () => {
		const { db, coach, myles, v } = setup();
		expect(reviewQueue(db).requests.map((r) => r.id)).toEqual([v.id]);
		expect(approveVideo(db, coach, v.id)).toEqual({ ok: true });
		expect(listVideosFor(db, myles, 'skater-bound').community.map((x) => x.id)).toEqual([v.id]);
		expect(reviewQueue(db).requests).toHaveLength(0);
		expect(db.select().from(auditLog).get()?.action).toBe('approve_video');
	});

	it('staff declines with a reason and the owner sees the reason', () => {
		const { db, coach, andrew, v } = setup();
		expect(declineVideo(db, coach, v.id, 'Too dark to see')).toEqual({ ok: true });
		expect(listVideosFor(db, andrew, 'skater-bound').mine[0]).toMatchObject({ status: 'declined', declineReason: 'Too dark to see' });
	});

	it('the owner can ask again after a decline', () => {
		const { db, coach, andrew, v } = setup();
		declineVideo(db, coach, v.id, '');
		expect(requestVideo(db, andrew, v.id)).toEqual({ ok: true });
		expect(status(db, v.id)).toBe('requested');
	});

	it('players cannot review', () => {
		const { db, myles, v } = setup();
		expect(approveVideo(db, myles, v.id)).toHaveProperty('error');
		expect(declineVideo(db, myles, v.id, '')).toHaveProperty('error');
		expect(removeVideo(db, myles, v.id)).toHaveProperty('error');
		expect(status(db, v.id)).toBe('requested');
	});

	it('only requested videos can be approved or declined', () => {
		const { db, coach, andrew } = setup();
		const p = createVideo(db, andrew, { exerciseId: 'e', title: 't', fileId: 'g', durationS: 1 });
		expect(approveVideo(db, coach, p.id)).toHaveProperty('error');
		expect(status(db, p.id)).toBe('private');
	});
});

describe('reports', () => {
	it('report appears in review; remove hides the video from everyone but staff', () => {
		const { db, coach, andrew, myles, v } = setup();
		approveVideo(db, coach, v.id);
		expect(reportVideo(db, myles, v.id, 'Not the right exercise')).toEqual({ ok: true });
		const q = reviewQueue(db);
		expect(q.reports).toHaveLength(1);
		expect(q.reports[0]).toMatchObject({ videoId: v.id, reason: 'Not the right exercise', reporter: 'myles' });
		expect(removeVideo(db, coach, v.id)).toEqual({ ok: true });
		expect(listVideosFor(db, myles, 'skater-bound').community).toHaveLength(0);
		expect(listVideosFor(db, andrew, 'skater-bound').mine).toHaveLength(0);
		expect(reviewQueue(db).reports).toHaveLength(0);
	});

	it("the same player can't report a video twice", () => {
		const { db, coach, myles, v } = setup();
		approveVideo(db, coach, v.id);
		reportVideo(db, myles, v.id, 'a');
		expect(reportVideo(db, myles, v.id, 'b')).toEqual({ error: 'You already reported this video.' });
	});

	it('a reported video is marked as reported for that player only', () => {
		const { db, coach, myles, v } = setup();
		approveVideo(db, coach, v.id);
		const other = add(db, 'other');
		reportVideo(db, myles, v.id, 'a');
		expect(listVideosFor(db, myles, 'skater-bound').community[0].reportedByMe).toBe(true);
		expect(listVideosFor(db, other, 'skater-bound').community[0].reportedByMe).toBe(false);
	});

	it("players can't report videos they can't see, or their own", () => {
		const { db, andrew, myles, v } = setup();
		expect(reportVideo(db, myles, v.id, 'x')).toHaveProperty('error');
		expect(reportVideo(db, andrew, v.id, 'x')).toHaveProperty('error');
	});

	it('dismissing a report keeps the video', () => {
		const { db, coach, myles, v } = setup();
		approveVideo(db, coach, v.id);
		reportVideo(db, myles, v.id, 'meh');
		const r = reviewQueue(db).reports[0];
		expect(dismissReport(db, coach, r.id)).toEqual({ ok: true });
		expect(reviewQueue(db).reports).toHaveLength(0);
		expect(status(db, v.id)).toBe('added');
	});
});

describe('counts', () => {
	it('counts pending accounts, requests and open reports', () => {
		const { db } = setup();
		db.insert(users).values({ id: 'p', username: 'p', usernameKey: 'p', displayName: 'p', passwordHash: 'x', role: 'player', status: 'pending', createdAt: 0 }).run();
		expect(staffCounts(db)).toEqual({ accounts: 1, requests: 1, reports: 0, total: 2 });
	});
});
