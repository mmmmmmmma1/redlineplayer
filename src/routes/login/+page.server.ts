import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '#lib/server/db/index.js';
import { checkLogin } from '#lib/server/accounts.js';
import { createSession } from '#lib/server/auth/session.js';
import { setSessionCookie } from '#lib/server/cookies.js';
import { loginBlocked, recordLoginFailure } from '#lib/server/limits.js';
import { normaliseUsername } from '#lib/server/auth/username.js';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const f = await request.formData();
		const username = String(f.get('username') ?? '');
		const password = String(f.get('password') ?? '');
		const n = normaliseUsername(username);
		const ip = getClientAddress();
		const key = 'key' in n ? n.key : username.slice(0, 40);
		if (loginBlocked(ip, key)) {
			return fail(429, { username, error: 'Too many tries. Wait a minute and try again.' });
		}
		const db = getDb();
		const user = await checkLogin(db, username, password);
		if (!user) {
			recordLoginFailure(ip, key);
			return fail(400, { username, error: 'Wrong username or password.' });
		}
		if (user.status === 'declined') return fail(403, { username, error: "Your account wasn't approved." });
		if (user.status === 'suspended') return fail(403, { username, error: 'Your account is suspended. Talk to a staff member.' });
		const { token } = await createSession(db, user.id);
		setSessionCookie(cookies, token);
		redirect(303, user.status === 'pending' ? '/pending' : '/');
	}
};
