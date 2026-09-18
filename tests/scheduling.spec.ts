import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLATFORM_BASE = 'http://127.0.0.1:3001';

// features.platform defaults to false in config.js on purpose (see the
// comment there and ROADMAP.md "Marketplace Platform / Calendly Cutover") —
// it needs a production DB migration + env vars first. These tests verify
// the swap-to-native-scheduling code path itself works correctly once that
// flag is turned on, by serving a patched config.js with platform forced
// true, rather than asserting it's what ships today.
function withPlatformEnabled(route) {
  const original = readFileSync(resolve(__dirname, '..', 'config.js'), 'utf8');
  const patched = original.replace('platform: false', 'platform: true');
  if (patched === original) throw new Error('config.js no longer contains "platform: false" — update this test');
  return route.fulfill({ status: 200, contentType: 'application/javascript', body: patched });
}

test.describe('Marketing site uses native platform scheduling, not Calendly', () => {
  test('booking section shows the platform CTA instead of the Calendly widget', async ({ page }) => {
    await page.route('**/config.js*', withPlatformEnabled);
    await page.goto('/');

    const bookingSection = page.locator('#booking');
    await expect(bookingSection.getByRole('heading', { name: 'FIND A DRONE OPERATOR' })).toBeVisible();
    await expect(bookingSection.getByRole('link', { name: 'POST A JOB' })).toHaveAttribute('href', '/app/register?role=client');
    await expect(bookingSection.getByRole('link', { name: /list as an operator/i })).toHaveAttribute('href', '/app/register?role=operator');

    // The Calendly widget element is still in the DOM (config.js just hides
    // it) — assert it's actually hidden, not merely absent from a selector.
    const calendlyWidget = page.locator('.calendly-inline-widget');
    await expect(calendlyWidget).toBeHidden();
  });

  test('with the flag off (today\'s shipped default), Calendly still renders unchanged', async ({ page }) => {
    await page.goto('/');
    const bookingSection = page.locator('#booking');
    await expect(bookingSection.locator('.calendly-inline-widget')).toBeVisible();
    await expect(bookingSection.getByRole('heading', { name: 'FIND A DRONE OPERATOR' })).toHaveCount(0);
  });

  test('hero CTA points into the platform instead of #booking', async ({ page }) => {
    await page.route('**/config.js*', withPlatformEnabled);
    await page.goto('/');
    const heroCta = page.locator('.hero-content .cta-button:not(.cta-button-secondary)');
    await expect(heroCta).toHaveAttribute('href', '/app/register');
    await expect(heroCta.locator('.cta-text')).toHaveText('FIND AN OPERATOR');
  });
});

test.describe('Operator availability setup', () => {
  test('weekly hours and a blocked date are sent to the availability endpoint', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: 'op-1', role: 'operator', name: 'Op One', email: 'op@example.com', active: true, profile: { verification_status: 'verified' } }),
    }));
    await page.route('**/api/operators/op-1/availability', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"weekly":[],"blocked":[]}' });
      }
      // PUT — echo back what was sent so the test can also sanity-check the response path
      const body = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.route('**/api/operators/op-1', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 404, body: '{"error":"not found"}' }); // fresh onboarding — no profile yet
      }
      const body = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.goto(`${PLATFORM_BASE}/app/operator/onboarding`);

    // Step 1: pick a service, advance
    await page.getByText('Real Estate').click();
    await page.getByRole('button', { name: /next: rates/i }).click();

    // Step 2: advance straight to availability
    await page.getByRole('button', { name: /next: availability/i }).click();
    await expect(page.getByText('Availability', { exact: true })).toBeVisible();

    // Step 3: enable Monday, set hours, add a blocked date
    await page.getByText('Mon', { exact: true }).click();
    const timeInputs = page.locator('input[type="time"]');
    await timeInputs.nth(0).fill('09:00');
    await timeInputs.nth(1).fill('17:00');

    await page.locator('input[type="date"]').fill('2027-02-01');
    await page.getByPlaceholder('Reason (optional)').fill('Maintenance');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Maintenance')).toBeVisible();

    const [putReq] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/operators/op-1/availability') && req.method() === 'PUT'),
      page.getByRole('button', { name: /next: certification/i }).click(),
    ]);
    const sent = putReq.postDataJSON();
    expect(sent.weekly).toEqual([{ day_of_week: 1, start_time: '09:00', end_time: '17:00' }]);
    expect(sent.blocked).toEqual([{ date: '2027-02-01', reason: 'Maintenance' }]);

    await expect(page.getByText('FAA Part 107 certification')).toBeVisible();
  });
});

test.describe('Booking an operator proposes a date/time', () => {
  test('selecting a job prefills the date and the booking request includes scheduled_at', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: 'client-1', role: 'client', name: 'Test Client', email: 'client@example.com', active: true }),
    }));
    await page.route('**/api/operators/op-1', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: 'op-1', name: 'Op One', avg_rating: 0, review_count: 0, service_types: ['real_estate'], base_rate_cents: 35000, coverage_radius_mi: 50 }),
    }));
    await page.route('**/api/operators/op-1/availability', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ weekly: [{ day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00' }], blocked: [] }),
    }));
    await page.route('**/api/reviews*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/api/jobs', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([{ id: 'job-1', title: 'Backyard listing', status: 'open', preferred_date: '2027-02-01', preferred_time: 'morning' }]),
    }));

    let createdBooking = null;
    await page.route('**/api/bookings', async (route) => {
      createdBooking = route.request().postDataJSON();
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'booking-1', ...createdBooking }) });
    });

    await page.goto(`${PLATFORM_BASE}/app/operators/op-1`);
    await page.getByRole('button', { name: 'Book This Operator' }).click();

    // The single open job auto-selects and prefills date/time from its
    // preferred_date/preferred_time (see selectJob in OperatorProfile.jsx).
    await expect(page.locator('input[type="date"]')).toHaveValue('2027-02-01');
    await expect(page.locator('input[type="time"]')).toHaveValue('09:00');
    await expect(page.getByText("Within this operator's declared availability.")).toBeVisible();

    await page.locator('.currency-input').fill('300');
    await page.getByRole('button', { name: /send booking request/i }).click();

    await expect(page.getByText('Booking request sent!')).toBeVisible();
    expect(createdBooking.scheduled_at).toBe('2027-02-01T09:00:00Z');
    expect(createdBooking.duration_hours).toBe(2);
  });
});
