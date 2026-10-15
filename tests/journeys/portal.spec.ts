import { test, expect, step, settle, SITE, NOW } from './skyview';

test('client with an old access code is turned away by the portal', {
  tag: ['@feature:time-bound-token-expiry'],
}, async ({ page }) => {
  await page.goto(SITE + '/pages/client-portal.html');
  await settle(page);

  await step(page, 'enter an expired access code', async () => {
    const expired = Math.floor(NOW.getTime() / 1000) - 86400;
    await page.fill('#accessCode', `ZGVtby1jbGllbnQ.${expired}.${'0'.repeat(64)}`);
    await page.click('#submitBtn');
    await expect(page.locator('#errorMessage')).toHaveClass(/show/);
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
