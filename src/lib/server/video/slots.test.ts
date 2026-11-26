import { describe, expect, it } from 'vitest';
import { createSemaphore, createUserLocks } from './slots';

describe('upload slots', () => {
	it('one upload at a time per person', () => {
		const locks = createUserLocks();
		const release = locks.take('andrew');
		expect(release).toBeTypeOf('function');
		expect(locks.take('andrew')).toBeNull();
		expect(locks.take('myles')).toBeTypeOf('function');
		release!();
		expect(locks.take('andrew')).toBeTypeOf('function');
	});

	it('only n encodes run at once; the rest wait their turn', async () => {
		const sem = createSemaphore(2);
		let running = 0;
		let peak = 0;
		const job = () =>
			sem.run(async () => {
				running++;
				peak = Math.max(peak, running);
				await new Promise((r) => setTimeout(r, 20));
				running--;
			});
		await Promise.all(Array.from({ length: 6 }, job));
		expect(peak).toBe(2);
	});

	it('a failing job frees its slot', async () => {
		const sem = createSemaphore(1);
		await expect(sem.run(async () => { throw new Error('x'); })).rejects.toThrow('x');
		await expect(sem.run(async () => 'ok')).resolves.toBe('ok');
	});
});
