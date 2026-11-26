/** Lets each person run one upload at a time. take() returns a release function, or null if busy. */
export function createUserLocks() {
	const busy = new Set<string>();
	return {
		take(userId: string): (() => void) | null {
			if (busy.has(userId)) return null;
			busy.add(userId);
			let done = false;
			return () => {
				if (!done) busy.delete(userId);
				done = true;
			};
		}
	};
}

/** Runs at most `n` jobs at once; others queue in order. */
export function createSemaphore(n: number) {
	let active = 0;
	const queue: (() => void)[] = [];
	return {
		async run<T>(job: () => Promise<T>): Promise<T> {
			if (active >= n) await new Promise<void>((r) => queue.push(r));
			active++;
			try {
				return await job();
			} finally {
				active--;
				queue.shift()?.();
			}
		}
	};
}
