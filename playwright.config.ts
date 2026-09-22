import { defineConfig, devices } from '@playwright/test';

/**
 * Deterministic browser journeys (T1). These run against the app in fake-provider
 * mode with synthetic fixtures. They are not evidence for T2 visual review, native
 * clipboard behaviour or physical device behaviour.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    // The workspace is designed at 600x900 first (D01).
    viewport: { width: 600, height: 900 },
  },
  projects: [
    { name: 'narrow-600', use: { ...devices['Desktop Chrome'], viewport: { width: 600, height: 900 } } },
    { name: 'wide-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 1000 } } },
  ],
  webServer: {
    command: 'npm run build && npm run start -- --port 3100',
    url: 'http://127.0.0.1:3100/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      SR_TEST_MODE: 'e2e',
      AI_PROVIDER: 'fake',
      EMBEDDING_PROVIDER: 'fake',
    },
  },
});
