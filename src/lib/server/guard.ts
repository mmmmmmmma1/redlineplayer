import { error } from '@sveltejs/kit';
import type { User } from './db/schema';
import { isActive, isStaff } from './permissions';

type HasUser = { locals: { user: User | null } };

/** For server routes and actions: the signed-in, approved user, or a 401/403. */
export function requireActive(event: HasUser): User {
	const u = event.locals.user;
	if (!u) error(401, 'Log in first.');
	if (!isActive(u)) error(403, 'Your account is not active.');
	return u;
}

export function requireStaff(event: HasUser): User {
	const u = requireActive(event);
	if (!isStaff(u)) error(403, 'Staff only.');
	return u;
}
