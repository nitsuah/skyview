import { test, expect, step, settle, mockPlatform, client, PLATFORM } from './skyview';

test('client checks their jobs, then browses drone operators', {
  tag: ['@feature:two-sided-marketplace'],
}, async ({ page }) => {
  await mockPlatform(page, client);

  await step(page, 'open the dashboard with jobs and bookings', async () => {
    await page.goto(`${PLATFORM}/app/dashboard`);
    await expect(page.getByText('Lot 14 progress survey')).toBeVisible();
    await expect(page.getByText('Welcome back, Dana Whitfield')).toBeVisible();
    await settle(page);
  }, { docs: 'two-sided-marketplace' });

  await step(page, 'browse the operator directory', async () => {
    await page.goto(`${PLATFORM}/app/operators`);
    await expect(page.getByText('Harbor Aerial Co.')).toBeVisible();
    await expect(page.getByText('Ridgeline Survey')).toBeVisible();
    await expect(page.getByText('Lumen Flight Films')).toBeVisible();
    await settle(page);
  }, { docs: 'two-sided-marketplace-operators' });
});

test('client posts a waterfront listing job', {
  tag: ['@feature:two-sided-marketplace'],
}, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1180 });
  await mockPlatform(page, client);
  await page.goto(`${PLATFORM}/app/jobs/new`);

  await step(page, 'fill in the job details', async () => {
    await page.getByText('Real Estate').click();
    await page.getByPlaceholder(/Real estate listing shoot/).fill('Waterfront listing shoot, 3BR');
    await page.getByPlaceholder(/Any specific requirements/).fill('Golden-hour exterior stills plus a 30-second reel. Dock access from the north gate.');
    await page.getByPlaceholder(/Street address or area/).fill('Downtown Austin, TX');
    await page.locator('input[type="date"]').fill('2027-02-01');
    await page.locator('.currency-input').fill('400');
    await page.locator('.currency-input').blur();
    await expect(page.getByText('Looking up coordinates')).toHaveCount(0);
    await settle(page);
  }, { docs: 'two-sided-marketplace-post-job' });
});

test('client books Harbor Aerial for an open job', {
  tag: ['@feature:native-operator-scheduling'],
}, async ({ page }) => {
  await mockPlatform(page, client);
  await page.goto(`${PLATFORM}/app/operators/op-1`);

  await step(page, 'open the booking dialog and pick the job', async () => {
    await page.getByRole('button', { name: 'Book This Operator' }).click();
    await page.locator('select').selectOption('job-1');
    await expect(page.locator('input[type="date"]')).toHaveValue('2027-02-01');
    await expect(page.getByText("Within this operator's declared availability.")).toBeVisible();
    await page.locator('.currency-input').fill('400');
    await page.locator('.currency-input').blur();
    await settle(page);
    await page.waitForTimeout(600); // modal fade-in
  }, { docs: 'native-operator-scheduling' });
});

test('operator sets weekly availability while onboarding', {
  tag: ['@feature:native-operator-scheduling'],
}, async ({ page }) => {
  await mockPlatform(page, { id: 'op-1', role: 'operator', name: 'Harbor Aerial Co.', email: 'pilot@example.com', active: true, profile: { verification_status: 'verified' } });
  // No profile row yet (first-time onboarding); saves succeed.
  await page.route('**/api/operators/op-1', (route) => route.fulfill(route.request().method() === 'GET' ? { status: 404, contentType: 'application/json', body: '{"error":"not found"}' } : { status: 200, contentType: 'application/json', body: '{}' }));
  await page.goto(`${PLATFORM}/app/operator/onboarding`);

  await step(page, 'choose a service and step through to availability', async () => {
    await page.getByText('Real Estate').click();
    await page.getByRole('button', { name: /next: rates/i }).click();
    await page.getByRole('button', { name: /next: availability/i }).click();
    await expect(page.getByLabel('Mon')).toBeChecked();
    await settle(page);
  }, { docs: 'native-operator-scheduling-availability' });
});
