import { defineConfig, devices } from '@playwright/test'

/**
 * E2E is deliberately NOT part of `pnpm test`. These specs need the full stack:
 *
 *   pnpm db:up && pnpm db:setup    # Docker Desktop must be running
 *   pnpm watch                     # web :4141 + api :4142
 *   pnpm test:e2e
 *
 * Keeping it separate means `pnpm test` stays a fast, dependency-free gate that can run
 * anywhere, while E2E stays opt-in.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4141'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'blob' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // The refactor targeted mobile first; a phone viewport is the one that regresses.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
