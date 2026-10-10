import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

// README / Pages screenshots (docs/screenshots/<feature-id>.png). Backend-free:
// every /api call is mocked in the spec, same servers as the e2e suite.
//
//   npx playwright test --config config/playwright.visual-docs.config.ts
//
// Run by .github/workflows/visual-docs.yml. File names are the feature ids in
// promo/spots.json, so `vigil showcase audit` matches them without path edits.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: path.join(repoRoot, 'tests', 'visual-docs'),
  outputDir: path.join(repoRoot, 'test-results', 'visual-docs'),
  fullyParallel: false,
  workers: 1,
  timeout: 90 * 1000,
  reporter: 'list',
  // Screenshots are "snapshots" that live in docs/screenshots and are rewritten
  // only when they differ beyond the tolerance below, so the bot PR stays quiet
  // until the UI actually changes.
  snapshotPathTemplate: path.join(repoRoot, 'docs', 'screenshots', '{arg}{ext}'),
  updateSnapshots: 'changed',
  expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.002 } },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    colorScheme: 'dark',
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        ...(chromiumExecutable ? { launchOptions: { executablePath: chromiumExecutable } } : {}),
      },
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
      command: 'npm ci && npm run build && npm run preview -- --port 3001 --strictPort --host 127.0.0.1',
      cwd: path.join(repoRoot, 'platform'),
      url: 'http://127.0.0.1:3001/app/',
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000,
    },
  ],
});
