import { execFile } from 'node:child_process';
import { rmSync } from 'node:fs';
import { promisify } from 'node:util';
import { fileTypeFromFile } from 'file-type';
import type { VideoStorage } from './storage';

const run = promisify(execFile);

export const MAX_BYTES = 200 * 1024 * 1024;
export const MAX_SECONDS = 180;

export type IntakeError = 'too_big' | 'not_video' | 'too_long' | 'failed';

async function probeDuration(file: string): Promise<number | null> {
	try {
		const { stdout } = await run(
			'ffprobe',
			['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_type:format=duration', '-of', 'json', file],
			{ timeout: 30_000 }
		);
		const info = JSON.parse(stdout) as { streams?: { codec_type: string }[]; format?: { duration?: string } };
		if (!info.streams?.some((s) => s.codec_type === 'video')) return null;
		const d = Number(info.format?.duration);
		return Number.isFinite(d) && d > 0 ? d : null;
	} catch {
		return null;
	}
}

/**
 * Checks an uploaded file and re-encodes it to a plain H.264/AAC MP4 with all metadata
 * (GPS location, device, dates) stripped. The uploaded file is always deleted.
 * ffmpeg is run with an argument list, never through a shell.
 */
export async function intakeVideo(
	input: { tmpPath: string; size: number },
	storage: VideoStorage
): Promise<{ fileId: string; durationS: number } | { error: IntakeError }> {
	const out = `${input.tmpPath}.out.mp4`;
	try {
		if (input.size > MAX_BYTES) return { error: 'too_big' };
		const type = await fileTypeFromFile(input.tmpPath).catch(() => undefined);
		if (!type?.mime.startsWith('video/')) return { error: 'not_video' };
		const duration = await probeDuration(input.tmpPath);
		if (duration === null) return { error: 'not_video' };
		if (duration > MAX_SECONDS) return { error: 'too_long' };
		try {
			await run(
				'ffmpeg',
				[
					'-v', 'error', '-y', '-nostdin',
					'-i', input.tmpPath,
					'-map', '0:v:0', '-map', '0:a:0?',
					'-map_metadata', '-1', '-map_chapters', '-1',
					'-t', String(MAX_SECONDS),
					'-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p',
					'-vf', "scale='min(1080,iw)':-2",
					'-c:a', 'aac', '-b:a', '128k',
					'-threads', '2',
					'-movflags', '+faststart',
					out
				],
				{ timeout: 10 * 60_000 }
			);
		} catch {
			return { error: 'failed' };
		}
		const fileId = await storage.save(out);
		return { fileId, durationS: Math.round(duration * 10) / 10 };
	} finally {
		rmSync(input.tmpPath, { force: true });
		rmSync(out, { force: true });
	}
}
