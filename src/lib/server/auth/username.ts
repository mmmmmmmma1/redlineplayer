/**
 * Usernames are compared by a key: NFKC-normalised (so full-width and other look-alike
 * letters fold to plain ones) and lower-cased. Only a-z, 0-9, _ and . are allowed.
 */
export function normaliseUsername(name: string): { display: string; key: string } | { error: string } {
	const display = name.normalize('NFKC').trim();
	if (display.length < 3 || display.length > 24) return { error: 'Usernames are 3 to 24 characters.' };
	if (!/^[A-Za-z0-9_.]+$/.test(display)) return { error: 'Use only letters, numbers, _ and .' };
	return { display, key: display.toLowerCase() };
}
