import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDb, type Db } from '../db/index';
import { auditLog, users, videos, type Role, type User } from '../db/schema';
import type { VideoStorage } from './storage';
import { createVideo, deleteVideo, listVideosFor, makePrivate, requestVideo } from './videos';

function add(db: Db, id: string, role: Role = 'player'): User {
	const u: User = {
		id, username: id, usernameKey: id, displayName: id.toUpperCase(), passwordHash: 'x', role,
		status: 'active', createdAt: 0, decidedBy: null, decidedAt: null
	};
	db.insert(users).values(u).run();
	return u;
}

function fakeStorage(): VideoStorage & { removed: string[] } {
	const removed: string[] = [];
	return { removed, save: async () => 'id', path: (id) => `/x/${id}`, remove: async (id) => void removed.push(id) };
}

function setup() {
	const db = createDb(':memory:');
	return { db, coach: add(db, 'coach', 'staff'), andrew: add(db, 'andrew'), myles: add(db, 'myles') };
}

const upload = (db: Db, who: User, file = 'f1') =>
	createVideo(db, who, { exerciseId: 'skater-bound', title: 'My bound', fileId: file, durationS: 4 });

const setStatus = (db: Db, id: string, status: 'added' | 'declined') =>
	db.update(videos).set({ status, declineReason: status === 'declined' ? 'Too dark' : null }).where(eq(videos.id, id)).run();

describe('creating videos', () => {
	it('player upload is private by default', () => {
		const { db, andrew } = setup();
		const v = upload(db, andrew);
		expect(v).toMatchObject({ kind: 'player', status: 'private', ownerId: 'andrew' });
	});

	it('player can ask for it at upload', () => {
		const { db, andrew } = setup();
		const v = createVideo(db, andrew, { exerciseId: 'skater-bound', title: 't', fileId: 'f', durationS: 1, request: true });
		expect(v.status).toBe('requested');
	});

	it('staff upload is visible to all at once', () => {
		const { db, coach, myles } = setup();
		const v = upload(db, coach);
		expect(v).toMatchObject({ kind: 'staff', status: 'added' });
		expect(listVideosFor(db, myles, 'skater-bound').staff.map((x) => x.id)).toEqual([v.id]);
		expect(db.select().from(auditLog).get()?.action).toBe('post_staff_video');
	});

	it('trims and limits titles', () => {
		const { db, andrew } = setup();
		const v = createVideo(db, andrew, { exerciseId: 'e', title: '  ' + 'x'.repeat(100), fileId: 'f', durationS: 1 });
		expect(v.title).toHaveLength(60);
		const blank = createVideo(db, andrew, { exerciseId: 'e', title: '   ', fileId: 'g', durationS: 1 });
		expect(blank.title).toBe('How-to');
	});
});

describe('changing videos', () => {
	it('request moves private → requested', () => {
		const { db, andrew } = setup();
		const v = upload(db, andrew);
		expect(requestVideo(db, andrew, v.id)).toEqual({ ok: true });
		expect(listVideosFor(db, andrew, 'skater-bound').mine[0].status).toBe('requested');
	});

	it("others can't request someone else's video", () => {
		const { db, andrew, myles } = setup();
		const v = upload(db, andrew);
		expect(requestVideo(db, myles, v.id)).toHaveProperty('error');
	});

	it('make private pulls an added video back', () => {
		const { db, andrew, myles } = setup();
		const v = upload(db, andrew);
		setStatus(db, v.id, 'added');
		expect(makePrivate(db, andrew, v.id)).toEqual({ ok: true });
		expect(listVideosFor(db, myles, 'skater-bound').community).toHaveLength(0);
	});

	it('owner can delete an added video and it disappears for everyone', async () => {
		const { db, andrew, myles } = setup();
		const storage = fakeStorage();
		const v = upload(db, andrew, 'file-a');
		setStatus(db, v.id, 'added');
		expect(listVideosFor(db, myles, 'skater-bound').community).toHaveLength(1);
		expect(await deleteVideo(db, storage, andrew, v.id)).toEqual({ ok: true });
		expect(listVideosFor(db, myles, 'skater-bound').community).toHaveLength(0);
		expect(listVideosFor(db, andrew, 'skater-bound').mine).toHaveLength(0);
		expect(storage.removed).toEqual(['file-a']);
	});

	it("others can't delete someone else's video", async () => {
		const { db, andrew, myles } = setup();
		const v = upload(db, andrew);
		expect(await deleteVideo(db, fakeStorage(), myles, v.id)).toHaveProperty('error');
	});
});

describe('listing videos', () => {
	it('owner still sees a declined video, with the reason', () => {
		const { db, andrew } = setup();
		const v = upload(db, andrew);
		setStatus(db, v.id, 'declined');
		const mine = listVideosFor(db, andrew, 'skater-bound').mine;
		expect(mine).toHaveLength(1);
		expect(mine[0]).toMatchObject({ status: 'declined', declineReason: 'Too dark', mine: true });
	});

	it("hides other players' private, requested and declined videos", () => {
		const { db, andrew, myles } = setup();
		const a = upload(db, andrew, 'a');
		upload(db, andrew, 'b');
		requestVideo(db, andrew, a.id);
		const c = upload(db, andrew, 'c');
		setStatus(db, c.id, 'declined');
		const seen = listVideosFor(db, myles, 'skater-bound');
		expect(seen.mine).toHaveLength(0);
		expect(seen.community).toHaveLength(0);
	});

	it('added player videos show under community with the owner name', () => {
		const { db, andrew, myles } = setup();
		const v = upload(db, andrew);
		setStatus(db, v.id, 'added');
		expect(listVideosFor(db, myles, 'skater-bound').community[0]).toMatchObject({ ownerName: 'ANDREW', mine: false });
		// The owner sees it once, under their own videos.
		const own = listVideosFor(db, andrew, 'skater-bound');
		expect(own.mine).toHaveLength(1);
		expect(own.community).toHaveLength(0);
	});

	it('only lists videos for that exercise', () => {
		const { db, andrew } = setup();
		upload(db, andrew);
		expect(listVideosFor(db, andrew, 'jumping-jacks').mine).toHaveLength(0);
	});
});
