import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diskStorage } from './storage';
import { intakeVideo } from './intake';

let dir: string;
const fixture = (name: string) => join(dir, 'fixtures', name);
/** A fresh copy, since intake deletes its input. */
function input(name: string): { tmpPath: string; size: number } {
	const p = join(dir, 'in', `${Math.random().toString(36).slice(2)}-${name}`);
	copyFileSync(fixture(name), p);
	return { tmpPath: p, size: statSync(p).size };
}
const tags = (file: string) =>
	execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format_tags', '-of', 'json', file], { encoding: 'utf8' });

beforeAll(() => {
	dir = mkdtempSync(join(tmpdir(), 'edgework-intake-'));
	for (const d of ['fixtures', 'in', 'store']) execFileSync('mkdir', ['-p', join(dir, d)]);
	const lavfi = ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=15', '-f', 'lavfi', '-i', 'sine=frequency=440'];
	execFileSync('ffmpeg', [...lavfi, '-t', '2', '-c:v', 'libx264', '-c:a', 'aac', '-metadata', 'location=+40.6892-074.0445/', '-metadata', 'make=Phone', fixture('short.mp4')]);
	execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=size=64x64:rate=2', '-t', '200', '-c:v', 'libx264', fixture('long.mp4')]);
	writeFileSync(fixture('notes.mp4'), 'this is just text pretending to be a video\n'.repeat(50));
}, 120_000);

describe('video intake', () => {
	it('accepts a short clip and strips GPS', async () => {
		const storage = diskStorage(join(dir, 'store'));
		const inp = input('short.mp4');
		expect(tags(inp.tmpPath)).toContain('location');
		const r = await intakeVideo(inp, storage);
		if ('error' in r) throw new Error(r.error);
		expect(r.durationS).toBeGreaterThan(1.5);
		expect(r.durationS).toBeLessThan(2.5);
		const out = storage.path(r.fileId);
		expect(existsSync(out)).toBe(true);
		expect(tags(out)).not.toContain('location');
		expect(tags(out)).not.toContain('Phone');
		expect(existsSync(inp.tmpPath)).toBe(false);
	}, 60_000);

	it('rejects a renamed text file as not_video', async () => {
		const inp = input('notes.mp4');
		expect(await intakeVideo(inp, diskStorage(join(dir, 'store')))).toEqual({ error: 'not_video' });
		expect(existsSync(inp.tmpPath)).toBe(false);
	});

	it('rejects a 200 s clip as too_long', async () => {
		const inp = input('long.mp4');
		expect(await intakeVideo(inp, diskStorage(join(dir, 'store')))).toEqual({ error: 'too_long' });
		expect(existsSync(inp.tmpPath)).toBe(false);
	}, 30_000);

	it('rejects size over 200 MB as too_big', async () => {
		const inp = input('short.mp4');
		expect(await intakeVideo({ ...inp, size: 200 * 1024 * 1024 + 1 }, diskStorage(join(dir, 'store')))).toEqual({ error: 'too_big' });
		expect(existsSync(inp.tmpPath)).toBe(false);
	});

	it('leaves no temp file behind', () => {
		expect(readdirSync(join(dir, 'in'))).toEqual([]);
	});
});

describe('disk storage', () => {
	it('refuses file ids that try to leave the folder', () => {
		const s = diskStorage(join(dir, 'store'));
		expect(() => s.path('../../etc/passwd')).toThrow();
		expect(() => s.path('abc')).toThrow();
	});
});
