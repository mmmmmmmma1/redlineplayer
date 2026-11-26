import type { Page } from '@playwright/test';

let n = 0;
/** A username no other test has used in this run. */
export const uniqueName = (prefix = 'user') => `${prefix}_${Date.now().toString(36)}${(n++).toString(36)}`;

export const PASSWORD = 'correct horse battery';

export async function signUp(page: Page, username: string, password = PASSWORD) {
	await page.goto('/signup');
	await page.getByLabel('Username').fill(username);
	await page.getByLabel('Name to show').fill(username);
	await page.getByLabel('Password', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Create account' }).click();
}

export async function logIn(page: Page, username: string, password = username === 'e2e_admin' ? 'e2e admin password' : PASSWORD) {
	await page.goto('/login');
	await page.getByLabel('Username').fill(username);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Log in' }).click();
}

export async function logOut(page: Page) {
	await page.getByRole('button', { name: 'Log out' }).click();
}

/** Made by the create-admin script before the test server starts (see playwright.config.ts). */
export const ADMIN = 'e2e_admin';
export const ADMIN_PASSWORD = 'e2e admin password';

/** Signs up a new player, has the admin approve them, and leaves them logged in. Returns the username. */
export async function activePlayer(page: Page, prefix = 'player'): Promise<string> {
	const name = uniqueName(prefix);
	await signUp(page, name);
	await logOut(page);
	await logIn(page, ADMIN);
	await page.goto('/staff/accounts');
	await page.getByRole('listitem').filter({ hasText: name }).getByRole('button', { name: 'Approve' }).click();
	await page.getByRole('listitem').filter({ hasText: name }).getByRole('button', { name: 'Suspend' }).waitFor();
	await logOut(page);
	await logIn(page, name);
	return name;
}
