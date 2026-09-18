import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/unit/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
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
      command: 'npx http-server . -p 3000',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      // Serves the built platform SPA (operator onboarding, booking, login,
      // password reset) at its production base path so e2e specs can
      // exercise real client-side routing. `npm ci` runs here because CI's
      // job only installs the repo-root deps, never platform/'s.
      command: 'npm ci && npm run build && npm run preview -- --port 3001 --strictPort --host 127.0.0.1',
      cwd: 'platform',
      url: 'http://127.0.0.1:3001/app/',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
