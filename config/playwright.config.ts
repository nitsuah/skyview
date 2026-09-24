import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

// This config lives in config/, and Playwright resolves every relative path
// (testDir, outputDir, reporter output, webServer cwd) against the config
// file's directory, so anchor them all to the repo root explicitly.
// Run with: npx playwright test --config config/playwright.config.ts
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  testDir: path.join(repoRoot, 'tests'),
  outputDir: path.join(repoRoot, 'test-results'),
  testIgnore: '**/unit/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: path.join(repoRoot, 'playwright-report') }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node tests/support/static-server.mjs 3000',
      cwd: repoRoot,
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      // Serves the built platform SPA (login/register/password-reset,
      // operator onboarding, booking) at its production base path so e2e
      // specs can exercise real client-side routing. `npm ci` runs here
      // because CI's job only installs the repo-root deps, never platform/'s.
      command: 'npm ci && npm run build && npm run preview -- --port 3001 --strictPort --host 127.0.0.1',
      cwd: path.join(repoRoot, 'platform'),
      url: 'http://127.0.0.1:3001/app/',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
