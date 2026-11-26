import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	workers: 1,
	webServer: {
		command: 'npm run build && node build',
		port: 4173,
		env: { PORT: '4173', ORIGIN: 'http://localhost:4173', DATA_DIR: 'test-data/e2e' },
		reuseExistingServer: false,
		timeout: 180_000
	},
	use: { baseURL: 'http://localhost:4173' },
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
