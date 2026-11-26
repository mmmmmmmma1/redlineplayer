import { randomUUID } from 'node:crypto';
import { createWriteStream, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as WebStream } from 'node:stream/web';
import busboy from 'busboy';
import { dataDir } from '../db/index';
import { MAX_BYTES } from './intake';

export type Upload = { tmpPath: string; size: number; fields: Record<string, string> };
export type UploadError = 'too_big' | 'no_file' | 'bad_request';

/**
 * Streams one multipart file to a temp file without holding it in memory, stopping as soon as
 * it passes the size limit. Text fields are capped at 200 characters.
 */
export function receiveUpload(request: Request): Promise<Upload | { error: UploadError }> {
	const type = request.headers.get('content-type') ?? '';
	const length = Number(request.headers.get('content-length') ?? 0);
	if (!type.startsWith('multipart/form-data') || !request.body) return Promise.resolve({ error: 'bad_request' });
	if (length > MAX_BYTES + 1024 * 1024) return Promise.resolve({ error: 'too_big' });

	const dir = join(dataDir(), 'tmp');
	mkdirSync(dir, { recursive: true });
	const tmpPath = join(dir, randomUUID());

	return new Promise((resolve) => {
		const fields: Record<string, string> = {};
		let size = 0;
		let gotFile = false;
		let failed: UploadError | null = null;
		let writing: Promise<void> = Promise.resolve();

		const bb = busboy({
			headers: { 'content-type': type },
			limits: { files: 1, fileSize: MAX_BYTES + 1, fields: 10, fieldSize: 200 }
		});
		bb.on('field', (name, value) => {
			fields[name] = value;
		});
		bb.on('file', (_name, stream) => {
			if (gotFile) return stream.resume();
			gotFile = true;
			const out = createWriteStream(tmpPath);
			writing = new Promise((done) => out.on('close', () => done()));
			stream.on('data', (chunk: Buffer) => (size += chunk.length));
			stream.on('limit', () => {
				failed = 'too_big';
				stream.unpipe(out);
				out.destroy();
				stream.resume();
			});
			stream.pipe(out);
		});
		bb.on('error', () => {
			failed ??= 'bad_request';
			finish();
		});
		bb.on('close', finish);

		let finished = false;
		async function finish() {
			if (finished) return;
			finished = true;
			await writing;
			if (failed || !gotFile || size === 0) {
				rmSync(tmpPath, { force: true });
				return resolve({ error: failed ?? 'no_file' });
			}
			resolve({ tmpPath, size, fields });
		}

		Readable.fromWeb(request.body as unknown as WebStream).on('error', () => {
			failed ??= 'bad_request';
			finish();
		}).pipe(bb);
	});
}
