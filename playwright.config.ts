import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for JobStream E2E tests.
 *
 * Tests run against an already-running server (local dev or deployed).
 * Set PLAYWRIGHT_BASE_URL to override the default http://localhost:3000.
 *
 * Usage:
 *   npx playwright test              # run all tests
 *   npx playwright test --ui         # open the interactive UI
 *   npx playwright show-report       # view the HTML report after a run
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1, // Single worker to avoid database conflicts between tests
  reporter: 'html',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
