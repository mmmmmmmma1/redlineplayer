import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '#lib/server/db/index.js';
import { invalidateSession } from '#lib/server/auth/session.js';
import { SESSION_COOKIE, clearSessionCookie } from '#lib/server/cookies.js';

export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) await invalidateSession(getDb(), token);
		clearSessionCookie(cookies);
		redirect(303, '/login');
	}
};
