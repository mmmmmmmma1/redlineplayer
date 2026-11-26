import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { byId } from '#lib/data/library.js';
import { getDb } from '#lib/server/db/index.js';
import { requireActive } from '#lib/server/guard.js';
import { createRateLimiter } from '#lib/server/rateLimit.js';
import { intakeVideo } from '#lib/server/video/intake.js';
import { receiveUpload } from '#lib/server/video/upload.js';
import { createSemaphore, createUserLocks } from '#lib/server/video/slots.js';
import { createVideo, getStorage } from '#lib/server/video/videos.js';

const MESSAGES = {
	too_big: 'That video is too big. The limit is 200 MB.',
	too_long: 'That video is too long. Keep it under 3 minutes.',
	not_video: "That file isn't a video we can play.",
	no_file: 'Choose a video first.',
	bad_request: 'The upload went wrong. Try again.',
	failed: "We couldn't process that video. Try another one."
} as const;

// 20 uploads an hour per person, one at a time, and at most 2 videos encoding on the server at once.
const perUser = createRateLimiter({ max: 20, windowMs: 3_600_000 });
const uploading = createUserLocks();
const encoding = createSemaphore(2);

export const POST: RequestHandler = async (event) => {
	const user = requireActive(event);
	const exercise = byId(event.params.id);
	if (!exercise) error(404, 'No such exercise.');
	const release = uploading.take(user.id);
	if (!release) return json({ error: 'Wait for your other upload to finish.' }, { status: 429 });
	try {
		if (!perUser.hit(user.id)) return json({ error: 'You have uploaded a lot this hour. Try again later.' }, { status: 429 });

		const up = await receiveUpload(event.request);
		if ('error' in up) return json({ error: MESSAGES[up.error] }, { status: up.error === 'too_big' ? 413 : 400 });

		const storage = getStorage();
		const result = await encoding.run(() => intakeVideo(up, storage));
		if ('error' in result) return json({ error: MESSAGES[result.error] }, { status: 400 });

		try {
			const v = createVideo(getDb(), user, {
				exerciseId: exercise.id,
				title: up.fields.title ?? '',
				fileId: result.fileId,
				durationS: result.durationS,
				request: up.fields.request === 'on'
			});
			return json({ ok: true, id: v.id, status: v.status });
		} catch (e) {
			await storage.remove(result.fileId);
			throw e;
		}
	} finally {
		release();
	}
};
