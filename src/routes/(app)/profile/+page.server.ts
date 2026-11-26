import type { PageServerLoad } from './$types';
import { requireActive } from '#lib/server/guard.js';

export const load: PageServerLoad = (event) => {
	const u = requireActive(event);
	return { username: u.username, displayName: u.displayName, role: u.role, since: u.createdAt };
};
