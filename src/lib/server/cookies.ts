import type { Cookies } from '@sveltejs/kit';
import { SESSION_DAYS } from './auth/session';

export const SESSION_COOKIE = 'session';

export function setSessionCookie(cookies: Cookies, token: string) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: SESSION_DAYS * 86_400
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
