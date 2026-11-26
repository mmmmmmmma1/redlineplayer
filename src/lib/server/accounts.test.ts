import { describe, expect, it } from 'vitest';
import { createDb } from './db/index';
import { checkLogin, signUp } from './accounts';

describe('checkLogin', () => {
	it('turns away huge passwords without hashing them', async () => {
		const db = createDb(':memory:');
		await signUp(db, { username: 'andrew', displayName: 'Andrew', password: 'correct horse battery' });
		const t = performance.now();
		expect(await checkLogin(db, 'andrew', 'x'.repeat(1_000_000))).toBeNull();
		expect(performance.now() - t).toBeLessThan(5);
		expect((await checkLogin(db, 'andrew', 'correct horse battery'))?.username).toBe('andrew');
	});
});
