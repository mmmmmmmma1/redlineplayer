import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from './rateLimit';

afterEach(() => vi.useRealTimers());

describe('rate limiter', () => {
	it('rate limiter blocks after max and resets after window', () => {
		vi.useFakeTimers();
		const rl = createRateLimiter({ max: 3, windowMs: 60_000 });
		expect([rl.hit('k'), rl.hit('k'), rl.hit('k')]).toEqual([true, true, true]);
		expect(rl.hit('k')).toBe(false);
		expect(rl.hit('other')).toBe(true);
		vi.advanceTimersByTime(60_001);
		expect(rl.hit('k')).toBe(true);
	});
});
