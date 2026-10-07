import { defineConfig, devices } from '@playwright/test';

/**
 * Pre-marketing E2E suite. Defaults target the local stack (Vite on :3000, API on :5101); point it at another environment with
 *   E2E_BASE_URL=https://jobcharcha.com E2E_API_URL=https://jobcharcha.com npx playwright test
 *
 * Safety: these tests are read-only against the data (no registrations, no orders, NO real payments). Money paths are proven by
 * unauthenticated/forged-request checks here and by the backend unit tests (StoreSecurityTests); the Razorpay modal itself needs a
 * manual run with test keys (see docs/audit/07-E2E-TEST-REPORT.md).
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'e2e-report', open: 'never' }], ['json', { outputFile: 'e2e-results.json' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-IN',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
});
