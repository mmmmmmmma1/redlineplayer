import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { byId } from '#lib/data/library.js';
import { getDb } from '#lib/server/db/index.js';
import { requireActive } from '#lib/server/guard.js';
import { isStaff } from '#lib/server/permissions.js';
import { deleteVideo, getStorage, listVideosFor, makePrivate, requestVideo } from '#lib/server/video/videos.js';

export const load: PageServerLoad = (event) => {
	const user = requireActive(event);
	const exercise = byId(event.params.id);
	if (!exercise) error(404, 'No such exercise.');
	return { exercise, videos: listVideosFor(getDb(), user, exercise.id), staff: isStaff(user) };
};

const videoId = async (request: Request) => String((await request.formData()).get('id') ?? '');

export const actions: Actions = {
	request: async (event) => {
		const r = requestVideo(getDb(), requireActive(event), await videoId(event.request));
		return 'error' in r ? fail(400, r) : r;
	},
	makePrivate: async (event) => {
		const r = makePrivate(getDb(), requireActive(event), await videoId(event.request));
		return 'error' in r ? fail(400, r) : r;
	},
	delete: async (event) => {
		const r = await deleteVideo(getDb(), getStorage(), requireActive(event), await videoId(event.request));
		return 'error' in r ? fail(400, r) : r;
	}
};
