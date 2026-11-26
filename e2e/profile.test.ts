import { expect, test } from '@playwright/test';
import { activePlayer } from './helpers';

test('profile page shows who you are and the credits', async ({ page }) => {
	const name = await activePlayer(page);
	await page.getByRole('navigation').getByRole('link', { name: 'Profile' }).click();
	await expect(page).toHaveURL(/\/profile$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
	await expect(page.getByText(`@${name}`)).toBeVisible();
	const credits = page.getByRole('region', { name: 'Credits' });
	await expect(credits).toContainText('Andrew (obaba-samich)');
	await expect(credits).toContainText('Myles');
});
