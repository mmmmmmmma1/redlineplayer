import { randomUUID } from 'node:crypto';
import { createWriteStream, mkdirSync, readdirSync, rmSync, type WriteStream } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as WebStream } from 'node:stream/web';
import busboy from 'busboy';
import { dataDir } from '../db/index';
import { MAX_BYTES } from './intake';

export type Upload = { tmpPath: string; size: number; fields: Record<string, string> };
export type UploadError = 'too_big' | 'no_file' | 'bad_request';

export const tmpDir = () => join(dataDir(), 'tmp');

/** Deletes leftover temp files, e.g. from a restart in the middle of an upload. Run at startup. */
export function sweepTmp(): void {
	const dir = tmpDir();
	try {
		for (const f of readdirSync(dir)) rmSync(join(dir, f), { force: true });
	} catch {
		// No tmp folder yet.
	}
}

/**
 * Streams one multipart file to a temp file without holding it in memory, stopping as soon as
 * it passes the size limit. Text fields are capped at 200 characters. Any error (a broken
 * body, a dropped connection) settles the promise and deletes the temp file right away.
 */
export function receiveUpload(request: Request): Promise<Upload | { error: UploadError }> {
	const type = request.headers.get('content-type') ?? '';
	const length = Number(request.headers.get('content-length') ?? 0);
	if (!type.startsWith('multipart/form-data') || !request.body) return Promise.resolve({ error: 'bad_request' });
	if (length > MAX_BYTES + 1024 * 1024) return Promise.resolve({ error: 'too_big' });

	mkdirSync(tmpDir(), { recursive: true });
	const tmpPath = join(tmpDir(), randomUUID());

	return new Promise((resolve) => {
		const fields: Record<string, string> = {};
		let size = 0;
		let gotFile = false;
		let out: WriteStream | null = null;
		let written: Promise<void> = Promise.resolve();
		let settled = false;

		let bb: busboy.Busboy;
		try {
			bb = busboy({ headers: { 'content-type': type }, limits: { files: 1, fileSize: MAX_BYTES + 1, fields: 10, fieldSize: 200 } });
		} catch {
			return resolve({ error: 'bad_request' });
		}
		const source = Readable.fromWeb(request.body as unknown as WebStream);

		function fail(error: UploadError) {
			if (settled) return;
			settled = true;
			source.unpipe(bb);
			source.destroy();
			out?.destroy();
			bb.removeAllListeners();
			bb.on('error', () => {}); // swallow anything still in flight
			rmSync(tmpPath, { force: true });
			// The write stream may still be closing; delete again once it has.
			out?.once('close', () => rmSync(tmpPath, { force: true }));
			resolve({ error });
		}

		bb.on('field', (name, value) => {
			fields[name] = value;
		});
		bb.on('file', (_name, stream) => {
			if (gotFile) return stream.resume();
			gotFile = true;
			out = createWriteStream(tmpPath);
			const o = out;
			written = new Promise((done, failed) => {
				o.on('finish', () => done());
				o.on('error', failed);
			});
			written.catch(() => fail('bad_request'));
			stream.on('data', (chunk: Buffer) => (size += chunk.length));
			stream.on('limit', () => fail('too_big'));
			stream.on('error', () => fail('bad_request'));
			stream.pipe(o);
		});
		bb.on('error', () => fail('bad_request'));
		bb.on('close', async () => {
			if (settled) return;
			try {
				await written;
			} catch {
				return fail('bad_request');
			}
			if (settled) return;
			if (!gotFile || size === 0) return fail('no_file');
			settled = true;
			resolve({ tmpPath, size, fields });
		});
		source.on('error', () => fail('bad_request'));
		source.pipe(bb);
	});
}
