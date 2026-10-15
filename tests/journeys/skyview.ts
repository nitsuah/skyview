// Skyview journey fixture: backend-free, fictional demo data only.
// - every /api call is mocked (same fictional people as tests/visual-docs)
// - the clock is pinned to the demo's "today"
// - the hero video is aborted (its poster shows), so frames don't depend on decode timing
// - settle() = web fonts + eager images, run after every navigation
import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export { expect };
export { step, slug } from './journey';

export const SITE = 'http://127.0.0.1:3000';
export const PLATFORM = 'http://127.0.0.1:3001';
export const NOW = new Date('2027-01-15T15:00:00Z');

export const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

export const client = { id: 'client-1', role: 'client', name: 'Dana Whitfield', email: 'dana@example.com', active: true };
export const operator = {
  id: 'op-1', name: 'Harbor Aerial Co.', bio: 'Part 107 pilot flying waterfront listings, marinas and golden-hour reels since 2021.',
  avg_rating: 4.9, review_count: 38, service_types: ['real_estate', 'cinema', 'events'], base_rate_cents: 35000, coverage_radius_mi: 50,
};
export const operators = [
  operator,
  { id: 'op-2', name: 'Ridgeline Survey', bio: 'Orthomosaic mapping, volumetrics and progress flights for builders.', avg_rating: 4.8, review_count: 21, service_types: ['mapping', 'inspection'], base_rate_cents: 48000 },
  { id: 'op-3', name: 'Lumen Flight Films', bio: 'FPV and cinema rigs for weddings, festivals and brand films.', avg_rating: 5, review_count: 12, service_types: ['cinema', 'events'], base_rate_cents: 60000 },
];
export const jobs = [
  { id: 'job-1', title: 'Waterfront listing shoot, 3BR', service_type: 'real_estate', status: 'open', preferred_date: '2027-02-01', preferred_time: 'morning', budget_cents: 40000 },
  { id: 'job-2', title: 'Marina grand-opening reel', service_type: 'events', status: 'matched', preferred_date: '2027-02-06', budget_cents: 75000 },
  { id: 'job-3', title: 'Lot 14 progress survey', service_type: 'mapping', status: 'booked', preferred_date: '2027-01-22', budget_cents: 52000 },
  { id: 'job-4', title: 'Rooftop inspection, Pier 9', service_type: 'inspection', status: 'completed', preferred_date: '2026-12-18', budget_cents: 30000 },
];

/** Writes the page made, so a journey can assert the action reached the API. */
export interface PlatformWrites {
  jobs: Record<string, any>[];
  bookings: Record<string, any>[];
  availability: Record<string, any>[];
}

export async function mockPlatform(page: Page, me: object): Promise<PlatformWrites> {
  const writes: PlatformWrites = { jobs: [], bookings: [], availability: [] };
  const liveJobs = [...jobs];
  const liveBookings: Record<string, any>[] = [{ id: 'bk-1', job_id: 'job-3', status: 'confirmed', operator_name: 'Ridgeline Survey' }];
  await page.route('**/api/auth/me', (route) => route.fulfill(json(me)));
  await page.route('**/api/notifications*', (route) => route.fulfill(json({ unread_count: 2, notifications: [] })));
  await page.route('**/api/jobs', (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      writes.jobs.push(body);
      const created = { id: 'job-new', status: 'open', preferred_time: null, ...body };
      liveJobs.unshift(created);
      return route.fulfill(json(created, 201));
    }
    return route.fulfill(json(liveJobs));
  });
  await page.route('**/api/bookings', (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      writes.bookings.push(body);
      const created = { id: 'bk-new', status: 'pending', operator_name: 'Harbor Aerial Co.', ...body };
      liveBookings.push(created);
      return route.fulfill(json(created, 201));
    }
    return route.fulfill(json(liveBookings));
  });
  await page.route('**/api/reviews*', (route) => route.fulfill(json([])));
  await page.route('**/api/operators*', (route) => route.fulfill(json(operators)));
  await page.route('**/api/operators/op-1', (route) => route.fulfill(json(operator)));
  await page.route('**/api/operators/op-1/availability', (route) => {
    if (route.request().method() === 'PUT') {
      writes.availability.push(route.request().postDataJSON());
      return route.fulfill(json({ success: true }));
    }
    return route.fulfill(json({
      weekly: [1, 2, 3, 4, 5].map((d) => ({ day_of_week: d, start_time: '09:00:00', end_time: '17:00:00' })),
      blocked: [{ blocked_date: '2027-02-02', reason: 'Maintenance' }],
    }));
  });
  await page.route('**/nominatim.openstreetmap.org/**', (route) => route.fulfill(json([{ lat: '30.2672', lon: '-97.7431' }])));
  return writes;
}

/** Web fonts and every eager image are in; call after each navigation. */
export async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => Array.from(document.images).filter((i) => i.loading !== 'lazy').every((i) => i.complete));
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(NOW);
    await page.route(/\.(mp4|mov|webm)(\?.*)?$/, (route) => route.abort());
    // Google Fonts: whether Inter arrives before the screenshot depends on the network, and the
    // headline wraps differently with and without it (CI vs local). Block it so every
    // environment renders the same installed fallback font.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    await use(page);
  },
});
