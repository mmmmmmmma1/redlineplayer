import { error } from '@sveltejs/kit';
import { createReadStream, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import type { RequestHandler } from './$types';
import { getDb } from '#lib/server/db/index.js';
import { requireActive } from '#lib/server/guard.js';
import { canSeeVideo } from '#lib/server/permissions.js';
import { getStorage, getVideo } from '#lib/server/video/videos.js';

/** Streams a video someone is allowed to see. Anything else is a 404, so ids can't be probed. */
export const GET: RequestHandler = async (event) => {
	const user = requireActive(event);
	const v = getVideo(getDb(), event.params.id);
	if (!v || !canSeeVideo(user, v)) error(404, 'Not found.');

	let path: string;
	let size: number;
	try {
		path = getStorage().path(v.file);
		size = statSync(path).size;
	} catch {
		error(404, 'Not found.');
	}

	const headers: Record<string, string> = {
		'Content-Type': 'video/mp4',
		'Accept-Ranges': 'bytes',
		'Cache-Control': 'private, max-age=3600',
		'Content-Disposition': 'inline',
		'X-Content-Type-Options': 'nosniff'
	};

	const range = event.request.headers.get('range');
	const m = range?.match(/^bytes=(\d*)-(\d*)$/);
	if (range && m && (m[1] || m[2])) {
		let start = m[1] ? Number(m[1]) : size - Number(m[2]);
		let end = m[1] && m[2] ? Number(m[2]) : size - 1;
		start = Math.max(0, start);
		end = Math.min(size - 1, end);
		if (start > end || start >= size) {
			return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } });
		}
		const body = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream;
		return new Response(body, {
			status: 206,
			headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) }
		});
	}
	const body = Readable.toWeb(createReadStream(path)) as ReadableStream;
	return new Response(body, { headers: { ...headers, 'Content-Length': String(size) } });
};
