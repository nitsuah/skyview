import { test, expect, step, settle, SITE, NOW } from './skyview';
// The repo's own signing and verification code (the same module the Netlify function uses).
// @ts-ignore plain JS module
import { generatePortalToken, verifyPortalToken } from '../../netlify/functions/utils/portal.js';

const TEST_SALT = 'skyview-journeys-test-salt'; // throwaway; never a production PORTAL_SALT

/** Run `fn` with Date.now pinned, so tokens are signed and checked at the demo's "now". */
function atTime<T>(ms: number, fn: () => T): T {
  const real = Date.now;
  Date.now = () => ms;
  try { return fn(); } finally { Date.now = real; }
}

test('client with an old access code is turned away by the portal', {
  tag: ['@feature:time-bound-token-expiry'],
}, async ({ page }) => {
  await page.goto(SITE + '/pages/client-portal.html');
  await settle(page);

  // Signed with the real helper one day before the demo's "now", valid for one day: it expired
  // yesterday, and its signature is genuine, so only the expiry can be the reason it is refused.
  const code = atTime(NOW.getTime() - 2 * 86400 * 1000, () => generatePortalToken('demo-client', 1, TEST_SALT));
  expect(atTime(NOW.getTime(), () => verifyPortalToken(code, TEST_SALT))).toMatchObject({ valid: false, reason: 'expired' });

  await step(page, 'enter an expired access code', async () => {
    await page.fill('#accessCode', code);
    await page.click('#submitBtn');
    await expect(page.locator('#errorMessage')).toHaveClass(/show/);
    await expect(page.locator('#errorMessage')).toHaveText('This access link has expired. Please contact us to request a new one.');
  }, { docs: 'time-bound-token-expiry' });
});

test('client who mistypes too often is locked out for 15 minutes', {
  tag: ['@feature:rate-limiting'],
}, async ({ page }) => {
  await page.addInitScript((lockedUntil) => {
    localStorage.setItem('skyview:portal-attempts:v1', JSON.stringify({ count: 5, lockedUntil }));
  }, NOW.getTime() + 15 * 60 * 1000);
  await page.goto(SITE + '/pages/client-portal.html');
  await settle(page);

  await step(page, 'see the locked sign-in button', async () => {
    await expect(page.getByRole('button', { name: 'Too many attempts' })).toBeDisabled();
  }, { docs: 'rate-limiting' });
});
