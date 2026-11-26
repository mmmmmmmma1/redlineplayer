import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export interface VideoStorage {
	/** Moves a finished file into storage and returns its id. */
	save(tmpPath: string): Promise<string>;
	/** Where a stored file lives. Throws on ids that aren't ours. */
	path(fileId: string): string;
	remove(fileId: string): Promise<void>;
}

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Videos on the server's disk, named by random ids, outside any public folder. */
export function diskStorage(dir: string): VideoStorage {
	mkdirSync(dir, { recursive: true });
	const path = (fileId: string) => {
		if (!ID.test(fileId)) throw new Error('Bad file id');
		return join(dir, `${fileId}.mp4`);
	};
	return {
		path,
		async save(tmpPath) {
			const id = randomUUID();
			try {
				renameSync(tmpPath, path(id));
			} catch {
				// Different disk: copy, then delete.
				copyFileSync(tmpPath, path(id));
				rmSync(tmpPath, { force: true });
			}
			return id;
		},
		async remove(fileId) {
			rmSync(path(fileId), { force: true });
		}
	};
}
