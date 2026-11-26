import { expect, test, type Page } from '@playwright/test';
import { ADMIN, activePlayer, logIn, logOut, uploadClip } from './helpers';

const mineCard = (page: Page, title: string) =>
	page.getByRole('region', { name: 'Your videos' }).getByRole('article').filter({ hasText: title });

async function requestedClip(page: Page, exercise: string, title: string) {
	const name = await activePlayer(page);
	await uploadClip(page, exercise, title, { request: true });
	await expect(mineCard(page, title).getByText('Waiting for staff')).toBeVisible({ timeout: 30_000 });
	await logOut(page);
	return name;
}

async function reviewRow(page: Page, title: string) {
	await logIn(page, ADMIN);
	await page.goto('/staff/review');
	return page.getByRole('region', { name: 'Video requests' }).getByRole('article').filter({ hasText: title });
}

test('staff approves a request and it shows for everyone', async ({ page }) => {
	const owner = await requestedClip(page, 'skater-bound', 'Approve me');
	const row = await reviewRow(page, 'Approve me');
	await row.getByRole('button', { name: 'Add for everyone' }).click();
	await expect(row).toHaveCount(0);
	await logOut(page);
	await activePlayer(page);
	await page.goto('/exercise/skater-bound');
	const community = page.getByRole('region', { name: 'Added by players' });
	await expect(community.getByText('Approve me')).toBeVisible();
	await expect(community.getByText(owner)).toBeVisible();
});

test('staff declines with a reason and the owner sees the reason', async ({ page }) => {
	const owner = await requestedClip(page, 'high-knees', 'Decline me');
	const row = await reviewRow(page, 'Decline me');
	await row.getByLabel('Reason (optional)').fill('Too dark to see');
	await row.getByRole('button', { name: 'Decline' }).click();
	await expect(row).toHaveCount(0);
	await logOut(page);
	await logIn(page, owner);
	await page.goto('/exercise/high-knees');
	const card = mineCard(page, 'Decline me');
	await expect(card.getByText('Declined')).toBeVisible();
	await expect(card.getByText('Staff said: Too dark to see')).toBeVisible();
});

test('report appears in review; remove hides the video from everyone but staff', async ({ page }) => {
	await requestedClip(page, 'carioca', 'Report me');
	const row = await reviewRow(page, 'Report me');
	await row.getByRole('button', { name: 'Add for everyone' }).click();
	await logOut(page);

	await activePlayer(page);
	await page.goto('/exercise/carioca');
	const card = page.getByRole('region', { name: 'Added by players' }).getByRole('article').filter({ hasText: 'Report me' });
	await card.getByText('Report', { exact: true }).click();
	await card.getByLabel('What is wrong?').fill('Not this exercise');
	await card.getByRole('button', { name: 'Send report' }).click();
	await expect(page.getByText('Thanks. Staff will look at it.')).toBeVisible();
	// After reporting, the card says so and can't be reported again.
	await expect(card.getByText('Reported', { exact: true })).toBeVisible();
	await expect(card.getByText('Report', { exact: true })).toHaveCount(0);
	await logOut(page);

	await logIn(page, ADMIN);
	await page.goto('/staff/review');
	const report = page.getByRole('region', { name: 'Reports' }).getByRole('article').filter({ hasText: 'Report me' });
	await expect(report.getByText('Not this exercise')).toBeVisible();
	await report.getByRole('button', { name: 'Remove video' }).click();
	await expect(report).toHaveCount(0);
	await logOut(page);

	await activePlayer(page);
	await page.goto('/exercise/carioca');
	await expect(page.getByText('Report me')).toHaveCount(0);
});

test("player can't open /staff/review", async ({ page }) => {
	await activePlayer(page);
	const res = await page.goto('/staff/review');
	expect(res?.status()).toBe(403);
});

test('staff tab shows how many things are waiting', async ({ page }) => {
	await requestedClip(page, 'broad-jump', 'Count me');
	await logIn(page, ADMIN);
	await page.goto('/library');
	await expect(page.getByRole('navigation').getByRole('link', { name: /Staff \d+/ })).toBeVisible();
});
