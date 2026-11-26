import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDb } from '../src/lib/server/db/index';
import { users } from '../src/lib/server/db/schema';
import { verifyPassword } from '../src/lib/server/auth/password';

describe('create-admin script', () => {
	it('create-admin makes an active admin', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'edgework-'));
		const out = execFileSync('npx', ['tsx', 'scripts/create-admin.ts', '--username', 'Andrew'], {
			input: 'a strong admin password\n',
			env: { ...process.env, DATA_DIR: dir },
			encoding: 'utf8'
		});
		expect(out).toContain('Andrew is now an admin');
		const u = createDb(join(dir, 'edgework.db')).select().from(users).get()!;
		expect(u).toMatchObject({ username: 'Andrew', role: 'admin', status: 'active' });
		expect(await verifyPassword(u.passwordHash, 'a strong admin password')).toBe(true);
	}, 30_000);

	it('refuses a weak password', () => {
		const dir = mkdtempSync(join(tmpdir(), 'edgework-'));
		expect(() =>
			execFileSync('npx', ['tsx', 'scripts/create-admin.ts', '--username', 'Andrew'], {
				input: 'short\n',
				env: { ...process.env, DATA_DIR: dir },
				encoding: 'utf8',
				stdio: 'pipe'
			})
		).toThrow();
	}, 30_000);
});
