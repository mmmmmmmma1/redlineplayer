import { expect, test } from '@playwright/test';
import { activePlayer } from './helpers';

test('library search finds Skater Bound', async ({ page }) => {
	await activePlayer(page);
	await page.goto('/library');
	await page.getByRole('searchbox', { name: 'Search exercises' }).fill('skater bound');
	await page.getByRole('searchbox', { name: 'Search exercises' }).press('Enter');
	await expect(page.getByRole('link', { name: /Skater Bound/ })).toBeVisible();
	await expect(page.getByRole('link', { name: /Jumping Jacks/ })).toHaveCount(0);
});

test('library filters by category', async ({ page }) => {
	await activePlayer(page);
	await page.goto('/library?category=core');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Library');
	await expect(page.getByRole('link', { name: /Jumping Jacks/ })).toHaveCount(0);
});

test('exercise page shows steps and cues', async ({ page }) => {
	await activePlayer(page);
	await page.goto('/exercise/jumping-jacks');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jumping Jacks');
	await expect(page.getByText('1 × 30')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'How to do it' })).toBeVisible();
	await expect(page.getByText('Stand tall, feet together, arms at your sides.')).toBeVisible();
	await expect(page.getByText('Stay light on the balls of your feet')).toBeVisible();
});

test('unknown exercise id gives 404', async ({ page }) => {
	await activePlayer(page);
	const res = await page.goto('/exercise/not-a-real-move');
	expect(res?.status()).toBe(404);
});
