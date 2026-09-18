import { test, expect } from '@playwright/test';

// The platform SPA (login/register/dashboard) is served separately from the
// marketing site — see the second `webServer` entry in playwright.config.ts.
// AuthProvider calls GET /api/auth/me on every mount, so every test here
// mocks it up front (401 = signed out, 200 = signed in).
const PLATFORM_BASE = 'http://127.0.0.1:3001';

test.describe('Google sign-in entry point', () => {
  test('Login page CTA points at the real /api/auth/google endpoint', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, body: '{"error":"Unauthorized"}' }));
    await page.goto(`${PLATFORM_BASE}/app/login`);

    const googleLink = page.getByRole('link', { name: /continue with google/i });
    await expect(googleLink).toBeVisible();
    // Regression guard: this endpoint 404'd in production because a second
    // Netlify function (api-auth-google.mjs) claimed an overlapping path
    // ('/api/auth/google*') and won routing over api-auth.mjs's '/api/auth/*',
    // which has no '/google' case. Both handlers now live in one function.
    await expect(googleLink).toHaveAttribute('href', '/api/auth/google');
  });

  test('Register page CTA carries the selected role through to Google sign-in', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, body: '{"error":"Unauthorized"}' }));
    await page.goto(`${PLATFORM_BASE}/app/register`);

    const googleLink = page.getByRole('link', { name: /continue with google/i });
    // Default role is 'client'.
    await expect(googleLink).toHaveAttribute('href', '/api/auth/google?role=client');

    await page.getByText("I'm a licensed operator").click();
    await expect(googleLink).toHaveAttribute('href', '/api/auth/google?role=operator');
  });
});

test.describe('Google OAuth failure states surfaced on /app/login', () => {
  const cases: [string, string][] = [
    ['oauth_failed', 'Google sign-in failed'],
    ['account_disabled', 'account has been disabled'],
    ['email_not_verified', 'Google account email is not verified'],
  ];

  for (const [code, expectedText] of cases) {
    test(`?error=${code} shows the matching message`, async ({ page }) => {
      await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, body: '{"error":"Unauthorized"}' }));
      await page.goto(`${PLATFORM_BASE}/app/login?error=${code}`);
      await expect(page.locator('.alert-error')).toContainText(expectedText, { ignoreCase: true });
    });
  }
});

test.describe('Authenticated state', () => {
  test('an unauthenticated visitor hitting a protected route is bounced to /app/login', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, body: '{"error":"Unauthorized"}' }));
    await page.goto(`${PLATFORM_BASE}/app/dashboard`);
    await expect(page).toHaveURL(/\/app\/login$/);
  });

  test('a signed-in client reaches the client dashboard instead of the login form', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, email: 'client@example.com', role: 'client', name: 'Test Client', active: true }),
    }));
    await page.route('**/api/jobs', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/api/bookings', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

    await page.goto(`${PLATFORM_BASE}/app/dashboard`);
    await expect(page).toHaveURL(/\/app\/dashboard$/);
    await expect(page.locator('.loading-screen')).toHaveCount(0);
  });

  test('email/password login succeeds and lands on the client dashboard', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, body: '{"error":"Unauthorized"}' }));
    await page.route('**/api/auth/login', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 1, email: 'client@example.com', role: 'client', name: 'Test Client' },
        token: 'fake.jwt.token',
      }),
    }));
    await page.route('**/api/jobs', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/api/bookings', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

    await page.goto(`${PLATFORM_BASE}/app/login`);
    await page.getByPlaceholder('you@example.com').fill('client@example.com');
    await page.getByPlaceholder('········').fill('correct-horse-battery-staple');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/app\/dashboard$/);
  });
});
