// Nightly "AI user" journeys: happy paths a real user takes, one visual
// baseline per step. Run by .github/workflows/journeys.yml through the shared
// nitsuah/.github journeys harness, which files/dedups/closes `bot:journey`
// issues from the JSON report. Contract: nitsuah/.github journeys/STANDARD.md.
//
// Baselines are Linux-only: generate them in the Playwright Docker image
// (see tests/journeys/README.md).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  ...base,
  testDir: path.join(repoRoot, 'tests', 'journeys'),
  testIgnore: [],
  // One baseline per step, Linux only: CI and local runs both use the Playwright image.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{testName}/{arg}{ext}',
  // A missing baseline must fail in CI instead of being written and thrown away.
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0, // pass-on-retry = flaky, not an issue
  reporter: [['list'], ['json', { outputFile: path.join(repoRoot, 'journeys-report', 'report.json') }]],
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 20, // soaked at 0 px noise (DOM-only site, 81/81 runs, Google Fonts blocked so the font is the installed fallback); one changed letter is ~27 px
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  use: {
    ...base.use,
    colorScheme: 'dark',
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // A project's device defaults win over top-level use, so set the viewport here.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});
