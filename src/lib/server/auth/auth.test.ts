import { describe, expect, it } from 'vitest';
import { createDb } from '../db';
import { sessions, users } from '../db/schema';
import { hashPassword, validatePassword, verifyPassword } from './password';
import { normaliseUsername } from './username';
import { createSession, invalidateSession, invalidateUserSessions, validateSession } from './session';
import { eq } from 'drizzle-orm';

function withUser() {
	const db = createDb(':memory:');
	db.insert(users)
		.values({
			id: 'u1',
			username: 'andrew',
			usernameKey: 'andrew',
			displayName: 'Andrew',
			passwordHash: 'x',
			role: 'player',
			status: 'active',
			createdAt: Date.now()
		})
		.run();
	return db;
}

describe('passwords', () => {
	it('hashes and verifies', async () => {
		const h = await hashPassword('correct horse battery');
		expect(h).not.toContain('correct horse');
		expect(await verifyPassword(h, 'correct horse battery')).toBe(true);
		expect(await verifyPassword(h, 'wrong password!!')).toBe(false);
	});

	it('rejects short passwords', () => {
		expect(validatePassword('short')).toMatch(/10/);
		expect(validatePassword('x'.repeat(129))).toMatch(/128/);
		expect(validatePassword('long enough pw')).toBeNull();
	});
});

describe('usernames', () => {
	it('normalises usernames', () => {
		const a = normaliseUsername('Andrew');
		const b = normaliseUsername('ａｎｄｒｅｗ');
		expect('key' in a && a.key).toBe('andrew');
		expect('key' in b && b.key).toBe('andrew');
		expect(normaliseUsername('a')).toHaveProperty('error');
		expect(normaliseUsername('bad name!')).toHaveProperty('error');
		expect(normaliseUsername('  Myles_9.k ')).toEqual({ display: 'Myles_9.k', key: 'myles_9.k' });
	});
});

describe('sessions', () => {
	it('session token is not stored in plain text', async () => {
		const db = withUser();
		const { token } = await createSession(db, 'u1');
		const rows = db.select().from(sessions).all();
		expect(rows).toHaveLength(1);
		expect(rows[0].idHash).not.toBe(token);
		expect((await validateSession(db, token))?.user.id).toBe('u1');
	});

	it('expired session is rejected', async () => {
		const db = withUser();
		const { token } = await createSession(db, 'u1');
		db.update(sessions).set({ expiresAt: Date.now() - 1000 }).run();
		expect(await validateSession(db, token)).toBeNull();
		expect(db.select().from(sessions).all()).toHaveLength(0);
	});

	it('logging out ends that session', async () => {
		const db = withUser();
		const { token } = await createSession(db, 'u1');
		await invalidateSession(db, token);
		expect(await validateSession(db, token)).toBeNull();
	});

	it('invalidateUserSessions ends every session', async () => {
		const db = withUser();
		const a = await createSession(db, 'u1');
		const b = await createSession(db, 'u1');
		await invalidateUserSessions(db, 'u1');
		expect(await validateSession(db, a.token)).toBeNull();
		expect(await validateSession(db, b.token)).toBeNull();
		expect(db.select().from(sessions).where(eq(sessions.userId, 'u1')).all()).toHaveLength(0);
	});

	it('extends a session with less than 15 days left', async () => {
		const db = withUser();
		const { token } = await createSession(db, 'u1');
		const soon = Date.now() + 2 * 86_400_000;
		db.update(sessions).set({ expiresAt: soon }).run();
		await validateSession(db, token);
		expect(db.select().from(sessions).all()[0].expiresAt).toBeGreaterThan(soon + 20 * 86_400_000);
	});
});
