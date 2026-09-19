import { test, expect } from '@playwright/test';

const PLATFORM_BASE = 'http://127.0.0.1:3001';

// The marketing page's scheduling entry point is static HTML that sends people
// into the platform — no Calendly, no JS-toggled sections. These run with
// JavaScript DISABLED to prove nothing here depends on a script loading
// (a stale cached module used to leave JS-hidden sections visible).
test.describe('Marketing site sends scheduling into the platform', () => {
  test.use({ javaScriptEnabled: false });

  // These pages close immediately, aborting the hero video mid-stream, which
  // crashes the plain http-server used for e2e (ERR_HTTP_HEADERS_SENT) and
  // takes every later test down with it. None of this needs the video.
  test.beforeEach(async ({ page }) => {
    await page.route(/\.(mp4|mov|webm)(\?.*)?$/, (route) => route.abort());
  });

  test('booking section is a static platform CTA with no Calendly', async ({ page }) => {
    await page.goto('/');

    const booking = page.locator('#booking');
    await expect(booking.getByRole('heading', { name: 'FIND A DRONE OPERATOR' })).toBeVisible();
    await expect(booking.getByRole('link', { name: 'POST A JOB' })).toHaveAttribute('href', '/app/register?role=client');
    await expect(booking.getByRole('link', { name: /list as an operator/i })).toHaveAttribute('href', '/app/register?role=operator');

    await expect(page.locator('.calendly-inline-widget')).toHaveCount(0);
    expect(await page.content()).not.toMatch(/calendly/i);
  });

  test('hero CTA goes to the platform', async ({ page }) => {
    await page.goto('/');
    const heroCta = page.locator('.hero-content .cta-button:not(.cta-button-secondary)');
    await expect(heroCta).toHaveAttribute('href', '/app/register');
    await expect(heroCta.locator('.cta-text')).toHaveText('FIND AN OPERATOR');
  });

  test('testimonials and the unfinished 3D preview are not in the page at all', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#testimonials')).toHaveCount(0);
    await expect(page.locator('#preview3d')).toHaveCount(0);
    await expect(page.getByText('INTERACTIVE 3D PREVIEW')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'REVIEWS' })).toHaveCount(0);
  });
});

test('the gallery still loads with JavaScript on', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.gallery-item').first()).toBeVisible();
  await expect(page.getByText('Loading Gallery...')).toHaveCount(0);
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

test.describe('Onboarding availability step is safe against destructive saves', () => {
  const mockOperator = async (page, availabilityHandler) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: 'op-1', role: 'operator', name: 'Op One', email: 'op@example.com', active: true, profile: { verification_status: 'verified' } }),
    }));
    await page.route('**/api/operators/op-1/availability', availabilityHandler);
    await page.route('**/api/operators/op-1', (route) => route.request().method() === 'GET'
      ? route.fulfill({ status: 404, body: '{"error":"not found"}' })
      : route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  };
  const toAvailabilityStep = async (page) => {
    await page.goto(`${PLATFORM_BASE}/app/operator/onboarding`);
    await page.getByText('Real Estate').click();
    await page.getByRole('button', { name: /next: rates/i }).click();
    await page.getByRole('button', { name: /next: availability/i }).click();
  };

  test('a failed availability load disables saving until a retry succeeds', async ({ page }) => {
    let calls = 0;
    await mockOperator(page, (route) => {
      calls += 1;
      return calls === 1
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' })
        : route.fulfill({ status: 200, contentType: 'application/json', body: '{"weekly":[{"day_of_week":2,"start_time":"08:00:00","end_time":"12:00:00"}],"blocked":[]}' });
    });
    await toAvailabilityStep(page);

    await expect(page.getByText(/couldn't load your saved availability/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /next: certification/i })).toBeDisabled();

    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByRole('button', { name: /next: certification/i })).toBeEnabled();
    // The retried data actually hydrated the form (Tuesday is checked).
    await expect(page.getByLabel('Tue')).toBeChecked();
  });

  test('extra same-day windows are re-sent on save instead of being dropped', async ({ page }) => {
    await mockOperator(page, (route) => route.request().method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          weekly: [
            { day_of_week: 1, start_time: '09:00:00', end_time: '12:00:00' },
            { day_of_week: 1, start_time: '14:00:00', end_time: '18:00:00' },
          ], blocked: [] }) })
      : route.fulfill({ status: 200, contentType: 'application/json', body: '{"weekly":[],"blocked":[]}' }));
    await toAvailabilityStep(page);
    await expect(page.getByRole('button', { name: /next: certification/i })).toBeEnabled();

    const [putReq] = await Promise.all([
      page.waitForRequest(r => r.url().includes('/availability') && r.method() === 'PUT'),
      page.getByRole('button', { name: /next: certification/i }).click(),
    ]);
    expect(putReq.postDataJSON().weekly).toEqual([
      { day_of_week: 1, start_time: '09:00', end_time: '12:00' },
      { day_of_week: 1, start_time: '14:00', end_time: '18:00' },
    ]);
  });
});

test.describe('Booking modal schedule handling', () => {
  const mockClient = async (page, jobs) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: 'client-1', role: 'client', name: 'Test Client', email: 'client@example.com', active: true }),
    }));
    await page.route('**/api/operators/op-1', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: 'op-1', name: 'Op One', avg_rating: 0, review_count: 0, service_types: [], coverage_radius_mi: 50 }),
    }));
    await page.route('**/api/operators/op-1/availability', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ weekly: [{ day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00' }], blocked: [{ blocked_date: '2027-02-02' }] }),
    }));
    await page.route('**/api/reviews*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/api/jobs', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(jobs) }));
    await page.goto(`${PLATFORM_BASE}/app/operators/op-1`);
    await page.getByRole('button', { name: 'Book This Operator' }).click();
    // Jobs (and the single-job auto-select, which resets date/time) settle
    // together with the <select> rendering — wait so later fills aren't clobbered.
    await expect(page.locator('select')).toBeVisible();
  };

  test('the availability hint accounts for duration, not just the start time', async ({ page }) => {
    await mockClient(page, [{ id: 'job-1', title: 'A', status: 'open' }]);
    await page.locator('input[type="date"]').fill('2027-02-01'); // a Monday
    await page.locator('input[type="time"]').fill('16:30');

    // 2h from 16:30 ends 18:30, past the 17:00 close.
    await expect(page.getByText(/only available Mon 09:00–17:00/)).toBeVisible();

    await page.locator('input[type="number"][min="0.5"]').fill('0.5');
    await expect(page.getByText("Within this operator's declared availability.")).toBeVisible();
  });

  test('a booking that runs into a blocked date is flagged', async ({ page }) => {
    await mockClient(page, [{ id: 'job-1', title: 'A', status: 'open' }]);
    await page.locator('input[type="date"]').fill('2027-02-01');
    await page.locator('input[type="time"]').fill('23:00');
    await page.locator('input[type="number"][min="0.5"]').fill('3'); // runs into the blocked Feb 2
    await expect(page.getByText('This operator has marked that date unavailable.')).toBeVisible();
  });

  test('switching to a job without preferences clears the previous job\'s date and time', async ({ page }) => {
    await mockClient(page, [
      { id: 'job-1', title: 'Has prefs', status: 'open', preferred_date: '2027-02-01', preferred_time: 'morning' },
      { id: 'job-2', title: 'No prefs', status: 'open' },
    ]);
    await page.locator('select').selectOption('job-1');
    await expect(page.locator('input[type="date"]')).toHaveValue('2027-02-01');
    await expect(page.locator('input[type="time"]')).toHaveValue('09:00');

    await page.locator('select').selectOption('job-2');
    await expect(page.locator('input[type="date"]')).toHaveValue('');
    await expect(page.locator('input[type="time"]')).toHaveValue('');
  });
});
