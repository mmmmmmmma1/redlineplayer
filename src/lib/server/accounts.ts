import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from './db';
import { users, type User } from './db/schema';
import { hashPassword, validatePassword, verifyPassword } from './auth/password';
import { normaliseUsername } from './auth/username';

export type SignUpInput = { username: string; displayName: string; password: string };

/** Creates a pending player, or returns what's wrong. */
export async function signUp(db: Db, input: SignUpInput): Promise<{ user: User } | { error: string }> {
	const name = normaliseUsername(input.username);
	if ('error' in name) return name;
	const display = input.displayName.normalize('NFKC').trim().replace(/\s+/g, ' ');
	if (display.length < 1 || display.length > 40) return { error: 'Names are 1 to 40 characters.' };
	const pwErr = validatePassword(input.password);
	if (pwErr) return { error: pwErr };
	if (db.select({ id: users.id }).from(users).where(eq(users.usernameKey, name.key)).get()) {
		return { error: 'That username is taken.' };
	}
	const user: User = {
		id: randomUUID(),
		username: name.display,
		usernameKey: name.key,
		displayName: display,
		passwordHash: await hashPassword(input.password),
		role: 'player',
		status: 'pending',
		createdAt: Date.now(),
		decidedBy: null,
		decidedAt: null
	};
	try {
		db.insert(users).values(user).run();
	} catch {
		return { error: 'That username is taken.' };
	}
	return { user };
}

// Verified against when the username doesn't exist, so a wrong name takes as long as a wrong password.
let dummyHash: Promise<string> | undefined;

/** The user for a username and password, or null. Status is checked by the caller. */
export async function checkLogin(db: Db, username: string, password: string): Promise<User | null> {
	// No account can have a longer password, so don't spend time hashing one.
	if (password.length > 128) return null;
	const name = normaliseUsername(username);
	const user = 'key' in name ? db.select().from(users).where(eq(users.usernameKey, name.key)).get() : undefined;
	if (!user) {
		dummyHash ??= hashPassword('not a real password');
		await verifyPassword(await dummyHash, password);
		return null;
	}
	return (await verifyPassword(user.passwordHash, password)) ? user : null;
}
