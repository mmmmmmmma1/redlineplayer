import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { receiveUpload } from './upload';

const B = 'XBOUNDARYX';
const head = `--${B}\r\nContent-Disposition: form-data; name="title"\r\n\r\nHi\r\n--${B}\r\nContent-Disposition: form-data; name="video"; filename="a.mp4"\r\nContent-Type: video/mp4\r\n\r\n`;
const enc = new TextEncoder();

function req(body: ReadableStream<Uint8Array>, length?: number) {
	const headers: Record<string, string> = { 'content-type': `multipart/form-data; boundary=${B}` };
	if (length) headers['content-length'] = String(length);
	return new Request('http://x/upload', { method: 'POST', headers, body, duplex: 'half' } as RequestInit);
}

let dir: string;
beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'edgework-up-'));
	process.env.DATA_DIR = dir;
});
afterEach(() => delete process.env.DATA_DIR);
const tmpFiles = () => (existsSync(join(dir, 'tmp')) ? readdirSync(join(dir, 'tmp')) : []);

describe('receiving uploads', () => {
	it('saves a complete upload', async () => {
		const body = new ReadableStream({
			start(c) {
				c.enqueue(enc.encode(head + 'x'.repeat(1000) + `\r\n--${B}--\r\n`));
				c.close();
			}
		});
		const r = await receiveUpload(req(body));
		if ('error' in r) throw new Error(r.error);
		expect(r.size).toBe(1000);
		expect(r.fields.title).toBe('Hi');
	});

	it('a truncated multipart body is rejected without crashing and leaves no file', async () => {
		const body = new ReadableStream({
			start(c) {
				c.enqueue(enc.encode(head + 'x'.repeat(100_000)));
				c.close(); // no closing boundary
			}
		});
		const r = await Promise.race([receiveUpload(req(body)), new Promise((res) => setTimeout(() => res('hung'), 3000))]);
		expect(r).toEqual({ error: 'bad_request' });
		expect(tmpFiles()).toEqual([]);
	});

	it('an aborted upload settles and leaves no file', async () => {
		const body = new ReadableStream({
			start(c) {
				c.enqueue(enc.encode(head + 'x'.repeat(100_000)));
				setTimeout(() => c.error(new Error('connection lost')), 50);
			}
		});
		const r = await Promise.race([receiveUpload(req(body)), new Promise((res) => setTimeout(() => res('hung'), 3000))]);
		expect(r).toEqual({ error: 'bad_request' });
		expect(tmpFiles()).toEqual([]);
	});
});
