import { expect, test } from '@playwright/test';
import { ADMIN, FAKE_CLIP, activePlayer, logIn, logOut, uploadClip } from './helpers';

const section = (page: import('@playwright/test').Page, name: string) => page.getByRole('region', { name });

test('choose a file, see it under Your videos as Private', async ({ page }) => {
	await activePlayer(page);
	await uploadClip(page, 'skater-bound', 'My skater bound');
	const mine = section(page, 'Your videos');
	await expect(mine.getByText('My skater bound')).toBeVisible({ timeout: 30_000 });
	await expect(mine.getByText('Private')).toBeVisible();
	await expect(mine.locator('video')).toHaveCount(1);
});

test('request, then make private again', async ({ page }) => {
	await activePlayer(page);
	await uploadClip(page, 'skater-bound', 'Request me');
	const card = section(page, 'Your videos').getByRole('article').filter({ hasText: 'Request me' });
	await card.getByRole('button', { name: 'Ask staff to add it' }).click();
	await expect(card.getByText('Waiting for staff')).toBeVisible();
	await card.getByRole('button', { name: 'Make private' }).click();
	await expect(card.getByText('Private')).toBeVisible();
});

test('a fake video file is rejected with a clear message', async ({ page }) => {
	await activePlayer(page);
	await uploadClip(page, 'skater-bound', 'Fake', { file: FAKE_CLIP });
	await expect(page.getByRole('alert')).toHaveText("That file isn't a video we can play.");
});

test("hides other players' private videos", async ({ browser }) => {
	const a = await browser.newPage();
	await activePlayer(a, 'owner');
	await uploadClip(a, 'jumping-jacks', 'Secret clip');
	const card = section(a, 'Your videos').getByRole('article').filter({ hasText: 'Secret clip' });
	await expect(card).toBeVisible({ timeout: 30_000 });
	const src = await card.locator('video').getAttribute('src');
	expect(src).toMatch(/^\/video\/[0-9a-f-]+\/file$/);

	const b = await browser.newPage();
	await activePlayer(b, 'other');
	await b.goto('/exercise/jumping-jacks');
	await expect(b.getByText('Secret clip')).toHaveCount(0);
	const res = await b.request.get(src!);
	expect(res.status()).toBe(404);
	// Logged out gets nothing either.
	const anon = await browser.newContext();
	expect((await anon.request.get(src!)).status()).toBe(401);
});

test('file route supports Range requests', async ({ page }) => {
	await activePlayer(page);
	await uploadClip(page, 'high-knees', 'Range clip');
	const card = section(page, 'Your videos').getByRole('article').filter({ hasText: 'Range clip' });
	await expect(card).toBeVisible({ timeout: 30_000 });
	const src = (await card.locator('video').getAttribute('src'))!;
	const full = await page.request.get(src);
	expect(full.status()).toBe(200);
	expect(full.headers()['content-type']).toBe('video/mp4');
	const size = Number(full.headers()['content-length']);
	const part = await page.request.get(src, { headers: { Range: 'bytes=0-99' } });
	expect(part.status()).toBe(206);
	expect(part.headers()['content-range']).toBe(`bytes 0-99/${size}`);
	expect((await part.body()).length).toBe(100);
});

test('owner deletes their video', async ({ page }) => {
	await activePlayer(page);
	await uploadClip(page, 'carioca', 'Delete me');
	const card = section(page, 'Your videos').getByRole('article').filter({ hasText: 'Delete me' });
	await expect(card).toBeVisible({ timeout: 30_000 });
	await card.getByRole('button', { name: 'Delete' }).click();
	await expect(page.getByText('Delete me')).toHaveCount(0);
});

test('staff upload is visible to everyone at once', async ({ page }) => {
	await logIn(page, ADMIN);
	await uploadClip(page, 'broad-jump', 'Coach demo');
	await expect(section(page, 'Coach videos').getByText('Coach demo')).toBeVisible({ timeout: 30_000 });
	await logOut(page);
	await activePlayer(page);
	await page.goto('/exercise/broad-jump');
	await expect(section(page, 'Coach videos').getByText('Coach demo')).toBeVisible();
});

test('uploads from another site are refused', async ({ request }) => {
	const res = await request.post('/exercise/skater-bound/videos', {
		headers: { origin: 'https://evil.example' },
		multipart: { title: 'x' }
	});
	expect(res.status()).toBe(403);
});
