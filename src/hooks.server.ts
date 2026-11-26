import type { Handle } from '@sveltejs/kit/hooks';
import { getDb } from '#lib/server/db/index.js';
import { validateSession } from '#lib/server/auth/session.js';
import { SESSION_COOKIE, clearSessionCookie } from '#lib/server/cookies.js';
import { sweepTmp } from '#lib/server/video/upload.js';

/** Only the video upload route takes big bodies; everything else is a small form. */
const UPLOAD_ROUTE = /^\/exercise\/[^/]+\/videos$/;
const SMALL_BODY = 64 * 1024;

export const handle: Handle = async ({ event, resolve }) => {
	const { method, headers } = event.request;
	if (method !== 'GET' && method !== 'HEAD' && !UPLOAD_ROUTE.test(event.url.pathname)) {
		const length = headers.get('content-length');
		if (length === null && headers.get('transfer-encoding')) return new Response('Length required', { status: 411 });
		if (Number(length) > SMALL_BODY) return new Response('Too large', { status: 413 });
	}
	event.locals.user = null;
	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const found = await validateSession(getDb(), token);
		if (found) event.locals.user = found.user;
		else clearSessionCookie(event.cookies);
	}

	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'same-origin');
	response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
	return response;
};

// Uploads interrupted by a restart leave temp files behind.
sweepTmp();
