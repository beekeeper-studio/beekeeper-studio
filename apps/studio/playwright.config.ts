import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: {
    timeout: 30000,
  },
  fullyParallel: true,
  workers: 3,
  // Retry failed tests
  retries: process.env.CI ? 2 : 0, // 2 retries in CI, 0 locally
  use: {
    actionTimeout: 10000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  }
});
