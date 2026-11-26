import { expect, test } from '@playwright/test';
import { ADMIN, logIn, logOut, signUp, uniqueName } from './helpers';

async function decide(page: import('@playwright/test').Page, username: string, button: string) {
	await logIn(page, ADMIN);
	await page.goto('/staff/accounts');
	const row = page.getByRole('listitem').filter({ hasText: username });
	await row.getByRole('button', { name: button }).click();
	await expect(page.getByRole('listitem').filter({ hasText: username })).not.toContainText(button === 'Approve' ? 'Approve' : '_none_');
	await logOut(page);
}

test('staff approves a pending user who can then use the app', async ({ page }) => {
	const name = uniqueName();
	await signUp(page, name);
	await logOut(page);
	await decide(page, name, 'Approve');
	await logIn(page, name);
	await page.goto('/library');
	await expect(page).toHaveURL(/\/library$/);
});

test("staff declines and the user can't log in", async ({ page }) => {
	const name = uniqueName();
	await signUp(page, name);
	await logOut(page);
	await decide(page, name, 'Decline');
	await logIn(page, name);
	await expect(page.getByText("Your account wasn't approved.")).toBeVisible();
});

test('suspend logs the user out', async ({ browser }) => {
	const name = uniqueName();
	const player = await browser.newPage();
	await signUp(player, name);
	await logOut(player);
	const staff = await browser.newPage();
	await decide(staff, name, 'Approve');
	await logIn(player, name);
	await player.goto('/library');
	await logIn(staff, ADMIN);
	await staff.goto('/staff/accounts');
	await staff.getByRole('listitem').filter({ hasText: name }).getByRole('button', { name: 'Suspend' }).click();
	await expect(staff.getByRole('listitem').filter({ hasText: name })).toContainText('Restore');
	await player.reload();
	await expect(player).toHaveURL(/\/login/);
});

test('players cannot open staff pages', async ({ page }) => {
	const name = uniqueName();
	await signUp(page, name);
	await logOut(page);
	await decide(page, name, 'Approve');
	await logIn(page, name);
	const res = await page.goto('/staff/accounts');
	expect(res?.status()).toBe(403);
});

test('audit page lists staff actions', async ({ page }) => {
	const name = uniqueName();
	await signUp(page, name);
	await logOut(page);
	await decide(page, name, 'Approve');
	await logIn(page, ADMIN);
	await page.goto('/staff/audit');
	await expect(page.getByText(`approve_user`).first()).toBeVisible();
	await expect(page.getByText(name).first()).toBeVisible();
});
