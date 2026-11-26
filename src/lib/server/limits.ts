import { createRateLimiter } from './rateLimit';

const ipHourly = Number(process.env.LOGIN_IP_LIMIT_PER_HOUR) || 20;

// 5 a minute for one IP + username, and a cap per IP per hour.
const perName = createRateLimiter({ max: 5, windowMs: 60_000 });
const perIp = createRateLimiter({ max: ipHourly, windowMs: 3_600_000 });

/** Sign-ups count every try. */
export function allowSignUp(ip: string, usernameKey: string): boolean {
	const a = perName.hit(`${ip}|${usernameKey}`);
	const b = perIp.hit(ip);
	return a && b;
}

/** Log-ins only count failures, so someone who logs in often is never locked out. */
export function loginBlocked(ip: string, usernameKey: string): boolean {
	return perName.blocked(`${ip}|${usernameKey}`) || perIp.blocked(ip);
}

export function recordLoginFailure(ip: string, usernameKey: string): void {
	perName.hit(`${ip}|${usernameKey}`);
	perIp.hit(ip);
}
