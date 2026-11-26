import { hash, verify } from '@node-rs/argon2';

// Argon2id with OWASP's minimum settings.
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(pw: string): Promise<string> {
	return hash(pw, OPTS);
}

export async function verifyPassword(stored: string, pw: string): Promise<boolean> {
	try {
		return await verify(stored, pw);
	} catch {
		return false;
	}
}

/** An error to show, or null when the password is fine. */
export function validatePassword(pw: string): string | null {
	if (pw.length < 10) return 'Use at least 10 characters.';
	if (pw.length > 128) return 'Use at most 128 characters.';
	return null;
}
