import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	me: locals.user
		? { id: locals.user.id, displayName: locals.user.displayName, role: locals.user.role, status: locals.user.status }
		: null
});
