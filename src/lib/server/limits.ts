import { createRateLimiter } from './rateLimit';

const ipHourly = Number(process.env.LOGIN_IP_LIMIT_PER_HOUR) || 20;

/** Log-in and sign-up limits: 5 a minute for one IP + username, and a cap per IP per hour. */
export const authPerName = createRateLimiter({ max: 5, windowMs: 60_000 });
export const authPerIp = createRateLimiter({ max: ipHourly, windowMs: 3_600_000 });

export function allowAuthAttempt(ip: string, usernameKey: string): boolean {
	const a = authPerName.hit(`${ip}|${usernameKey}`);
	const b = authPerIp.hit(ip);
	return a && b;
}
