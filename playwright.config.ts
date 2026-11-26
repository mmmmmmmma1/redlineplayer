import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	workers: 1,
	webServer: {
		command:
			"rm -rf test-data/e2e && npm run build && printf 'e2e admin password\\n' | DATA_DIR=test-data/e2e npx tsx scripts/create-admin.ts --username e2e_admin && node build",
		port: 4173,
		env: { PORT: '4173', ORIGIN: 'http://localhost:4173', DATA_DIR: 'test-data/e2e', LOGIN_IP_LIMIT_PER_HOUR: '100000' },
		reuseExistingServer: false,
		timeout: 180_000
	},
	use: { baseURL: 'http://localhost:4173' },
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
