import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/appLaunch.test.ts',
  timeout: 60000,
  expect: {
    timeout: 30000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 3,
  use: {
    actionTimeout: 30000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  }
});
