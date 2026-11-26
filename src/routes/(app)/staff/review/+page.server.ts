import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '#lib/server/db/index.js';
import { requireStaff } from '#lib/server/guard.js';
import { approveVideo, declineVideo, dismissReport, removeVideo, reviewQueue } from '#lib/server/video/review.js';

export const load: PageServerLoad = (event) => {
	requireStaff(event);
	return reviewQueue(getDb());
};

const form = async (request: Request) => {
	const f = await request.formData();
	return { id: String(f.get('id') ?? ''), reason: String(f.get('reason') ?? '') };
};
const done = (r: { ok: true } | { error: string }) => ('error' in r ? fail(400, r) : r);

export const actions: Actions = {
	approve: async (e) => done(approveVideo(getDb(), requireStaff(e), (await form(e.request)).id)),
	decline: async (e) => {
		const { id, reason } = await form(e.request);
		return done(declineVideo(getDb(), requireStaff(e), id, reason));
	},
	remove: async (e) => {
		const { id, reason } = await form(e.request);
		return done(removeVideo(getDb(), requireStaff(e), id, reason));
	},
	dismiss: async (e) => done(dismissReport(getDb(), requireStaff(e), (await form(e.request)).id))
};
