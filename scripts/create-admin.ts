/**
 * Makes (or promotes) an admin account. Run on the server:
 *   npm run create-admin -- --username Andrew
 * The password is read from standard input, so it never shows up in shell history.
 */
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { createDb, dataDir } from '../src/lib/server/db/index';
import { users } from '../src/lib/server/db/schema';
import { hashPassword, validatePassword } from '../src/lib/server/auth/password';
import { normaliseUsername } from '../src/lib/server/auth/username';
import { audit } from '../src/lib/server/audit';

function fail(msg: string): never {
	console.error(msg);
	process.exit(1);
}

async function readPassword(): Promise<string> {
	if (process.stdin.isTTY) process.stdout.write('Password (at least 10 characters): ');
	const rl = createInterface({ input: process.stdin, terminal: false });
	for await (const line of rl) {
		rl.close();
		return line;
	}
	return '';
}

const i = process.argv.indexOf('--username');
const raw = i > 0 ? process.argv[i + 1] : undefined;
if (!raw) fail('Usage: npm run create-admin -- --username <name>');
const name = normaliseUsername(raw);
if ('error' in name) fail(name.error);

const password = await readPassword();
const pwErr = validatePassword(password);
if (pwErr) fail(pwErr);

const db = createDb(join(dataDir(), 'edgework.db'));
const hash = await hashPassword(password);
const existing = db.select().from(users).where(eq(users.usernameKey, name.key)).get();
let id: string;
if (existing) {
	id = existing.id;
	db.update(users).set({ role: 'admin', status: 'active', passwordHash: hash }).where(eq(users.id, id)).run();
} else {
	id = randomUUID();
	db.insert(users)
		.values({
			id,
			username: name.display,
			usernameKey: name.key,
			displayName: name.display,
			passwordHash: hash,
			role: 'admin',
			status: 'active',
			createdAt: Date.now()
		})
		.run();
}
audit(db, { id: 'system' }, 'create_admin', 'user', id);
console.log(`${name.display} is now an admin.`);
