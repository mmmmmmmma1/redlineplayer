import { describe, expect, it } from 'vitest';
import { createDb } from './index';
import { users } from './schema';

const user = (id: string, username: string) => ({
	id,
	username,
	usernameKey: username.toLowerCase(),
	displayName: username,
	passwordHash: 'x',
	role: 'player' as const,
	status: 'pending' as const,
	createdAt: Date.now()
});

describe('database', () => {
	it('creates tables and enforces unique usernameKey', () => {
		const db = createDb(':memory:');
		db.insert(users).values(user('a', 'Andrew')).run();
		expect(() => db.insert(users).values(user('b', 'andrew')).run()).toThrow();
	});
});
