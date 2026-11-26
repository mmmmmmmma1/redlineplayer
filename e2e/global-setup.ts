import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

/** Small clips for upload tests. */
export default function setup() {
	mkdirSync('test-data/fixtures', { recursive: true });
	execFileSync('ffmpeg', [
		'-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=15', '-f', 'lavfi', '-i', 'sine=frequency=440',
		'-t', '2', '-c:v', 'libx264', '-c:a', 'aac', '-metadata', 'location=+40.6892-074.0445/', 'test-data/fixtures/clip.mp4'
	]);
	writeFileSync('test-data/fixtures/fake.mp4', 'not really a video\n'.repeat(40));
}
