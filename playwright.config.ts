import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: 'tests/e2e',
  // One worker: every test shares the same seeded SQLite database.
  workers: 1,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['junit'], ['list']] : [['list'], ['html', { open: 'never' }]],
  use: {
    // The agentic QA workflows set APP_URL; locally the app runs on :4200. BASE_URL is deliberately not
    // read: other tools set it for their own purposes.
    baseURL: process.env.APP_URL || 'http://localhost:4200',
    trace: isCI ? 'retain-on-failure' : 'on',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      // Production build of the API and the web app, started on a freshly seeded database.
      // ensure-env.mjs creates api/.env (JWT_SECRET) on a fresh checkout, as `npm run setup` would.
      command: 'node scripts/ensure-env.mjs && npm run build && npm run db:reset && npm start',
      url: 'http://localhost:3000/api/tags',
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
    {
      // `npm start` above also serves the web app on :4200. This entry only waits until it answers too:
      // its command is a placeholder that keeps running while Playwright waits, and it isn't started at all
      // when :4200 is already up.
      command: 'node -e "setInterval(function () {}, 1000000)"',
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
