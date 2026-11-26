/**
 * Fixed-window counter per key, kept in memory.
 * hit() counts a try and returns false once a key is over the limit; blocked() checks without counting.
 */
export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
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
				hits.set(key, h);
				if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
			}
			h.count++;
			return h.count <= max;
		},
		blocked(key: string): boolean {
			return (current(key, Date.now())?.count ?? 0) >= max;
		}
	};
}
