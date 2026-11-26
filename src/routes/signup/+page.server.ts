import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '#lib/server/db/index.js';
import { signUp } from '#lib/server/accounts.js';
import { createSession } from '#lib/server/auth/session.js';
import { setSessionCookie } from '#lib/server/cookies.js';
import { allowAuthAttempt } from '#lib/server/limits.js';
import { normaliseUsername } from '#lib/server/auth/username.js';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const f = await request.formData();
		const username = String(f.get('username') ?? '');
		const displayName = String(f.get('displayName') ?? '');
		const password = String(f.get('password') ?? '');
		const n = normaliseUsername(username);
		if (!allowAuthAttempt(getClientAddress(), 'key' in n ? n.key : username.slice(0, 40))) {
			return fail(429, { username, displayName, error: 'Too many tries. Wait a minute and try again.' });
		}
		const db = getDb();
		const res = await signUp(db, { username, displayName, password });
		if ('error' in res) return fail(400, { username, displayName, error: res.error });
		const { token } = await createSession(db, res.user.id);
		setSessionCookie(cookies, token);
		redirect(303, '/pending');
	}
};
