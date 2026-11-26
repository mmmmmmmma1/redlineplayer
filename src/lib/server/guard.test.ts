import { describe, expect, it } from 'vitest';
import type { User } from './db/schema';
import { requireActive, requireStaff } from './guard';

const user = (o: Partial<User>): User => ({
	id: 'u',
	username: 'u',
	usernameKey: 'u',
	displayName: 'U',
	passwordHash: 'x',
	role: 'player',
	status: 'active',
	createdAt: 0,
	decidedBy: null,
	decidedAt: null,
	...o
});
const ev = (u: User | null) => ({ locals: { user: u } });
const status = (fn: () => unknown) => {
	try {
		fn();
	} catch (e) {
		return (e as { status?: number }).status;
	}
	return 200;
};

describe('guards', () => {
	it('blocks API for pending users', () => {
		expect(status(() => requireActive(ev(null)))).toBe(401);
		for (const s of ['pending', 'declined', 'suspended'] as const) {
			expect(status(() => requireActive(ev(user({ status: s }))))).toBe(403);
		}
		expect(requireActive(ev(user({}))).id).toBe('u');
	});

	it('requireStaff lets only active staff and admins through', () => {
		expect(status(() => requireStaff(ev(user({ role: 'player' }))))).toBe(403);
		expect(status(() => requireStaff(ev(user({ role: 'staff', status: 'pending' }))))).toBe(403);
		expect(status(() => requireStaff(ev(null)))).toBe(401);
		expect(requireStaff(ev(user({ role: 'admin' }))).role).toBe('admin');
	});
});
