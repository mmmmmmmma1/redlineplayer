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

export async function logIn(page: Page, username: string, password = PASSWORD) {
	await page.goto('/login');
	await page.getByLabel('Username').fill(username);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Log in' }).click();
}

export async function logOut(page: Page) {
	await page.getByRole('button', { name: 'Log out' }).click();
}
