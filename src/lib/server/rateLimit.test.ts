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

describe('checking without counting', () => {
	it('blocked() reports the limit without using up a try', () => {
		vi.useFakeTimers();
		const rl = createRateLimiter({ max: 2, windowMs: 60_000 });
		expect(rl.blocked('k')).toBe(false);
		rl.hit('k');
		rl.hit('k');
		expect(rl.blocked('k')).toBe(true);
		expect(rl.blocked('other')).toBe(false);
		vi.advanceTimersByTime(60_001);
		expect(rl.blocked('k')).toBe(false);
	});
});

describe('refunds and memory', () => {
	it('refund gives a try back', () => {
		const rl = createRateLimiter({ max: 1, windowMs: 60_000 });
		rl.hit('k');
		rl.refund('k');
		expect(rl.hit('k')).toBe(true);
	});

	it('never keeps more than maxKeys keys', () => {
		const rl = createRateLimiter({ max: 5, windowMs: 60_000, maxKeys: 100 });
		for (let i = 0; i < 1000; i++) rl.hit('k' + i);
		expect(rl.size()).toBeLessThanOrEqual(100);
	});
});
