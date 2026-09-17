import { test, expect } from '@playwright/test';

// See tests/auth.spec.ts for why every test mocks GET /api/auth/me.
const PLATFORM_BASE = 'http://127.0.0.1:3001';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, body: '{"error":"Unauthorized"}' }));
});

test.describe('Forgot password request', () => {
  test('submitting an email shows the "check your email" confirmation', async ({ page }) => {
    let requestedEmail: string | null = null;
    await page.route('**/api/auth/forgot-password', async (route) => {
      requestedEmail = route.request().postDataJSON().email;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });

    await page.goto(`${PLATFORM_BASE}/app/forgot-password`);
    await page.getByPlaceholder('you@example.com').fill('reset-me@example.com');
    await page.getByRole('button', { name: /send reset link/i }).click();

    await expect(page.getByText('Check your email')).toBeVisible();
    expect(requestedEmail).toBe('reset-me@example.com');
  });
});

test.describe('Reset password page', () => {
  test('a missing token shows the invalid-link state instead of a form', async ({ page }) => {
    await page.goto(`${PLATFORM_BASE}/app/reset-password`);
    await expect(page.getByText('Invalid link')).toBeVisible();
    await expect(page.getByRole('link', { name: /request new link/i })).toHaveAttribute('href', '/app/forgot-password');
  });

  test('mismatched passwords are rejected client-side without calling the API', async ({ page }) => {
    let apiCalled = false;
    await page.route('**/api/auth/reset-password', async (route) => {
      apiCalled = true;
      await route.fulfill({ status: 200, body: '{"ok":true}' });
    });

    await page.goto(`${PLATFORM_BASE}/app/reset-password?token=valid-token-123`);
    await page.getByPlaceholder('At least 8 characters').fill('newpassword1');
    await page.getByPlaceholder('Repeat your password').fill('newpassword2');
    await page.getByRole('button', { name: /set password/i }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
    expect(apiCalled).toBe(false);
  });

  test('a valid token and matching password resets successfully and redirects to login', async ({ page }) => {
    let sentBody: { token: string; password: string } | null = null;
    await page.route('**/api/auth/reset-password', async (route) => {
      sentBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });

    await page.goto(`${PLATFORM_BASE}/app/reset-password?token=valid-token-123`);
    await page.getByPlaceholder('At least 8 characters').fill('brand-new-password');
    await page.getByPlaceholder('Repeat your password').fill('brand-new-password');
    await page.getByRole('button', { name: /set password/i }).click();

    await expect(page).toHaveURL(/\/app\/login\?reset=1$/);
    await expect(page.locator('.alert-success')).toContainText('Password updated');
    expect(sentBody).toEqual({ token: 'valid-token-123', password: 'brand-new-password' });
  });

  test('an expired or already-used token surfaces the server error', async ({ page }) => {
    await page.route('**/api/auth/reset-password', (route) => route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Invalid or expired reset link' }),
    }));

    await page.goto(`${PLATFORM_BASE}/app/reset-password?token=expired-token`);
    await page.getByPlaceholder('At least 8 characters').fill('brand-new-password');
    await page.getByPlaceholder('Repeat your password').fill('brand-new-password');
    await page.getByRole('button', { name: /set password/i }).click();

    await expect(page.locator('.alert-error')).toContainText('Invalid or expired reset link');
    // Stays on the reset page — it must not silently pretend the reset worked.
    await expect(page).toHaveURL(/\/app\/reset-password/);
  });
});
