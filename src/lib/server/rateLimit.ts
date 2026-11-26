/** Fixed-window counter per key, kept in memory. hit() returns false once a key is over the limit. */
export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
	const hits = new Map<string, { count: number; reset: number }>();
	return {
		hit(key: string): boolean {
			const now = Date.now();
			let h = hits.get(key);
			if (!h || h.reset <= now) {
				h = { count: 0, reset: now + windowMs };
				hits.set(key, h);
				if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
			}
			h.count++;
			return h.count <= max;
		}
	};
}
