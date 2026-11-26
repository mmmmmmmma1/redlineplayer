import { describe, expect, it } from 'vitest';
import { createAuthLimits, ipKey } from './limits';

describe('auth limits', () => {
	it('attempts running at the same time all count', () => {
		const l = createAuthLimits(20);
		const starts = Array.from({ length: 6 }, () => l.startLogin('1.2.3.4', 'andrew'));
		expect(starts).toEqual([true, true, true, true, true, false]);
	});

	it('successful logins are given back, so regular users are never locked out', () => {
		const l = createAuthLimits(20);
		for (let i = 0; i < 30; i++) {
			expect(l.startLogin('1.2.3.4', 'andrew')).toBe(true);
			l.loginSucceeded('1.2.3.4', 'andrew');
		}
	});

	it('a blocked IP stops adding new keys on sign-up', () => {
		const l = createAuthLimits(3);
		for (let i = 0; i < 3; i++) l.allowSignUp('9.9.9.9', 'name' + i);
		const before = l.keys();
		for (let i = 0; i < 500; i++) expect(l.allowSignUp('9.9.9.9', 'spam' + i)).toBe(false);
		expect(l.keys()).toBe(before);
	});

	it('IPv6 addresses are limited per /64', () => {
		expect(ipKey('2001:db8:1:2:aaaa:bbbb:cccc:dddd')).toBe(ipKey('2001:db8:1:2::1'));
		expect(ipKey('2001:db8:1:3::1')).not.toBe(ipKey('2001:db8:1:2::1'));
		expect(ipKey('::ffff:1.2.3.4')).toBe('1.2.3.4');
		expect(ipKey('1.2.3.4')).toBe('1.2.3.4');
	});
});
