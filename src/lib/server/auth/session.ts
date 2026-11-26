import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { sessions, users, type Session, type User } from '../db/schema';

const DAY = 86_400_000;
export const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(db: Db, userId: string): Promise<{ token: string; expiresAt: Date }> {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = Date.now() + SESSION_DAYS * DAY;
	db.insert(sessions).values({ idHash: hashToken(token), userId, expiresAt }).run();
	return { token, expiresAt: new Date(expiresAt) };
}

/** The user behind a cookie token, or null. Expired sessions are deleted; ones under 15 days left are extended. */
export async function validateSession(db: Db, token: string): Promise<{ user: User; session: Session } | null> {
	const idHash = hashToken(token);
	const row = db
		.select({ session: sessions, user: users })
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(eq(sessions.idHash, idHash))
		.get();
	if (!row) return null;
	if (row.session.expiresAt <= Date.now()) {
		db.delete(sessions).where(eq(sessions.idHash, idHash)).run();
		return null;
	}
	if (row.session.expiresAt - Date.now() < 15 * DAY) {
		row.session.expiresAt = Date.now() + SESSION_DAYS * DAY;
		db.update(sessions).set({ expiresAt: row.session.expiresAt }).where(eq(sessions.idHash, idHash)).run();
	}
	return row;
}

export async function invalidateSession(db: Db, token: string): Promise<void> {
	db.delete(sessions).where(eq(sessions.idHash, hashToken(token))).run();
}

export async function invalidateUserSessions(db: Db, userId: string): Promise<void> {
	db.delete(sessions).where(eq(sessions.userId, userId)).run();
}
