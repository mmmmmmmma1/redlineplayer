import { expect, test } from '@playwright/test';
import { logIn, logOut, signUp, uniqueName } from './helpers';

test('sign up lands on pending page', async ({ page }) => {
	await signUp(page, uniqueName());
	await expect(page).toHaveURL(/\/pending$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Waiting for approval');
});

test('pending user is sent to /pending from any app page', async ({ page }) => {
	await signUp(page, uniqueName());
	await page.goto('/library');
	await expect(page).toHaveURL(/\/pending$/);
});

test('logged-out visitor is sent to log in', async ({ page }) => {
	await page.goto('/library');
	await expect(page).toHaveURL(/\/login/);
});

test('same username in another case is taken', async ({ page }) => {
	const name = uniqueName('Case');
	await signUp(page, name);
	await logOut(page);
	await signUp(page, name.toLowerCase());
	await expect(page.getByText('That username is taken.')).toBeVisible();
});

test('wrong password shows one generic message', async ({ page }) => {
	const name = uniqueName();
	await signUp(page, name);
	await logOut(page);
	await logIn(page, name, 'not the password');
	await expect(page.getByText('Wrong username or password.')).toBeVisible();
	await logIn(page, uniqueName('nobody'), 'not the password');
	await expect(page.getByText('Wrong username or password.')).toBeVisible();
});

test('sixth failed login in a minute is rate limited', async ({ page }) => {
	const name = uniqueName();
	for (let i = 0; i < 5; i++) {
		await logIn(page, name, 'wrong password ' + i);
		await expect(page.getByText('Wrong username or password.')).toBeVisible();
	}
	await logIn(page, name, 'wrong password 6');
	await expect(page.getByText('Too many tries. Wait a minute and try again.')).toBeVisible();
});

test('logout ends the session', async ({ page }) => {
	await signUp(page, uniqueName());
	await logOut(page);
	await expect(page).toHaveURL(/\/login$/);
	await page.goto('/pending');
	await expect(page).toHaveURL(/\/login/);
});

test('pages send security headers', async ({ request }) => {
	const res = await request.get('/login');
	const h = res.headers();
	expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
	expect(h['content-security-policy']).toContain("script-src 'self'");
	expect(h['x-content-type-options']).toBe('nosniff');
	expect(h['referrer-policy']).toBe('same-origin');
});

test('logging in successfully many times is not rate limited', async ({ page }) => {
	const name = uniqueName();
	await signUp(page, name);
	for (let i = 0; i < 7; i++) {
		await logOut(page);
		await logIn(page, name);
		await expect(page).toHaveURL(/\/pending$/);
	}
});
