/**
 * Fixed-window counter per key, kept in memory and capped at `maxKeys` keys (oldest dropped first).
 * hit() counts a try and returns false once a key is over the limit; blocked() checks without
 * counting; refund() gives one try back.
 */
export function createRateLimiter({ max, windowMs, maxKeys = 10_000 }: { max: number; windowMs: number; maxKeys?: number }) {
	const hits = new Map<string, { count: number; reset: number }>();
	const current = (key: string, now: number) => {
		const h = hits.get(key);
		return h && h.reset > now ? h : undefined;
	};
	return {
		hit(key: string): boolean {
			const now = Date.now();
			let h = current(key, now);
			if (!h) {
				h = { count: 0, reset: now + windowMs };
				hits.delete(key);
				hits.set(key, h);
				// Map keeps insertion order, so the first keys are the oldest windows.
				while (hits.size > maxKeys) hits.delete(hits.keys().next().value!);
			}
			h.count++;
			return h.count <= max;
		},
		blocked(key: string): boolean {
			return (current(key, Date.now())?.count ?? 0) >= max;
		},
		refund(key: string): void {
			const h = current(key, Date.now());
			if (h && h.count > 0) h.count--;
		},
		size: () => hits.size
	};
}
