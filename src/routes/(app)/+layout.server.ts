import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/** Every page in (app) needs an approved account. */
export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.user) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	if (locals.user.status !== 'active') redirect(303, '/pending');
};
