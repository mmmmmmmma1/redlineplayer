import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import * as schema from './schema';

export type Db = BetterSQLite3Database<typeof schema>;

const MIGRATIONS = resolve(process.cwd(), 'drizzle');

/** Opens (or creates) the database and brings it up to date. Use ':memory:' in tests. */
export function createDb(path: string): Db {
	if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
	const sqlite = new Database(path);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: MIGRATIONS });
	return db;
}

export const dataDir = () => resolve(process.env.DATA_DIR || 'data');

let app: Db | undefined;
/** The app's database in DATA_DIR. Opened on first use. */
export function getDb(): Db {
	app ??= createDb(join(dataDir(), 'edgework.db'));
	return app;
}
