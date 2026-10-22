import { defineConfig, devices } from '@playwright/test'

/**
 * Browser tests (Playwright Test). Local production Worker build par chalte hain:
 *   pnpm test:e2e            (build maujood ho to wahi, warna pehle build)
 *   BUILD=1 pnpm test:e2e    (hamesha naya build)
 *   pnpm test:e2e:report     (HTML report: har check, screenshots, video, trace)
 * Har spec file apna saaf local database leti hai (`tests/e2e/server.sh`); dev/production DB kabhi nahi.
 * CHROMIUM_PATH=/path/to/chrome se apna browser (na ho to Playwright ka installed browser).
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.mjs',
  // Suites ek hi local server/DB use karti hain: ek waqt me ek file
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Har suite ek lamba flow hai
  timeout: 15 * 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './tests/e2e/global-setup.mjs',
  globalTeardown: './tests/e2e/global-teardown.mjs',
  outputDir: 'test-results/e2e',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:8787',
    // Fail hone par video, trace (har qadam, network, console) aur screenshot report me
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
