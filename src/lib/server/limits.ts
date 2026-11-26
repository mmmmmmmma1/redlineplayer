import { isIPv6 } from 'node:net';
import { createRateLimiter } from './rateLimit';

/** IPv4 as is; IPv6 by its /64, since one home or phone usually gets a whole /64. */
export function ipKey(ip: string): string {
	const v4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
	if (v4) return v4[1];
	if (!isIPv6(ip)) return ip;
	const [head, tail = ''] = ip.toLowerCase().split('::');
	const h = head ? head.split(':') : [];
	const t = tail ? tail.split(':') : [];
	const full = [...h, ...Array(8 - h.length - t.length).fill('0'), ...t];
	return full.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, '')).join(':') + '::/64';
}

/** 5 tries a minute for one IP + username, and a cap per IP per hour. */
export function createAuthLimits(ipHourly: number) {
	const perName = createRateLimiter({ max: 5, windowMs: 60_000 });
	const perIp = createRateLimiter({ max: ipHourly, windowMs: 3_600_000 });
	const name = (ip: string, key: string) => `${ipKey(ip)}|${key}`;

	return {
		/** Sign-ups count every try. A blocked IP is turned away before anything new is stored. */
		allowSignUp(ip: string, key: string): boolean {
			if (perIp.blocked(ipKey(ip))) return false;
			const a = perIp.hit(ipKey(ip));
			const b = perName.hit(name(ip, key));
			return a && b;
		},
		/**
		 * Log-ins count the try before the password is checked, so tries sent all at once still
		 * add up. Call loginSucceeded() after a correct password to give the try back.
		 */
		startLogin(ip: string, key: string): boolean {
			if (perIp.blocked(ipKey(ip)) || perName.blocked(name(ip, key))) return false;
			const a = perIp.hit(ipKey(ip));
			const b = perName.hit(name(ip, key));
			return a && b;
		},
		loginSucceeded(ip: string, key: string): void {
			perIp.refund(ipKey(ip));
			perName.refund(name(ip, key));
		},
		keys: () => perName.size() + perIp.size()
	};
}

export const authLimits = createAuthLimits(Number(process.env.LOGIN_IP_LIMIT_PER_HOUR) || 20);
