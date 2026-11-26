import type { LayoutServerLoad } from './$types';
import { getDb } from '#lib/server/db/index.js';
import { isStaff } from '#lib/server/permissions.js';
import { staffCounts } from '#lib/server/video/review.js';

export const load: LayoutServerLoad = ({ locals }) => ({
	me: locals.user
		? { id: locals.user.id, displayName: locals.user.displayName, role: locals.user.role, status: locals.user.status }
		: null,
	staffWaiting: isStaff(locals.user) ? staffCounts(getDb()).total : 0
});
