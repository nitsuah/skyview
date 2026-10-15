import { test, expect, step, settle, SITE } from './skyview';
import type { Page } from '@playwright/test';

// The fixed nav would sit on top of a section's heading in element shots.
const hideNav = (page: Page) => page.addStyleTag({ content: 'header, .navbar { visibility: hidden !important; }' });

test('visitor scrolls the landing page, from hero to gallery', {
  tag: ['@feature:immersive-hero-section', '@feature:service-packages', '@feature:dynamic-gallery'],
}, async ({ page }) => {
  await page.goto(SITE + '/');
  await settle(page);

  await step(page, 'see the hero headline and booking call to action', async () => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/ELEVATE YOUR VISION\s+FROM ABOVE/);
    await expect(page.getByRole('link', { name: 'BOOK NOW' })).toHaveAttribute('href', '/app');
  }, { docs: 'immersive-hero-section' });

  await step(page, 'compare the service packages', async () => {
    const services = page.locator('#services');
    await services.scrollIntoViewIfNeeded();
    await expect(services.locator('.service-title').first()).toHaveText('REAL ESTATE');
    await expect(page.getByRole('heading', { name: 'CINEMATOGRAPHY' })).toBeVisible();
    await page.waitForTimeout(900); // scroll-reveal transitions
    await hideNav(page);
  }, { target: page.locator('#services'), docs: 'service-packages' });

  await step(page, 'open a gallery photo in the lightbox', async () => {
    await page.locator('#gallery').scrollIntoViewIfNeeded();
    await expect(page.locator('.gallery-item').first()).toBeVisible();
    await page.locator('.gallery-item').first().click();
    await expect(page.locator('#lightbox')).toHaveClass(/active/);
    await page.waitForTimeout(600);
  });

  await step(page, 'close the lightbox', async () => {
    await page.locator('.lightbox-close').click();
    await expect(page.locator('#lightbox')).not.toHaveClass(/active/);
    await page.waitForTimeout(600);
  }, { screenshot: false });
});

test('visitor on a phone gets the one-column site', {
  tag: ['@feature:responsive-design'],
}, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(SITE + '/');
  await settle(page);

  await step(page, 'see the hero on a phone', async () => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'BOOK NOW' })).toBeVisible();
    await page.waitForTimeout(600);
  }, { docs: 'responsive-design' });

  await step(page, 'page does not scroll sideways', async () => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  }, { screenshot: false });
});

test('owner checks the conversion dashboard', {
  tag: ['@feature:local-dashboard'],
}, async ({ page }) => {
  await page.addInitScript((updatedAt) => {
    const totals = { landing_view: 412, gallery_engagement: 187, booking_cta_click: 64, contact_submit: 21, service_interest: 96 };
    const events = [
      { name: 'booking_cta_click', at: updatedAt, metadata: { source: 'instagram', location: 'hero' } },
      { name: 'gallery_engagement', at: updatedAt, metadata: { source: 'google', target: 'sunset-marina' } },
    ];
    localStorage.setItem('skyview:conversion-metrics:v1', JSON.stringify({ version: 1, updatedAt, totals, events }));
    sessionStorage.setItem('skyview:landing-view-recorded:v1', '1');
  }, '2027-01-15T15:00:00.000Z');

  await step(page, 'open the funnel dashboard on localhost', async () => {
    await page.goto(SITE + '/?metrics=1');
    await settle(page);
    const dash = page.locator('#skyview-conversion-dashboard');
    await expect(dash).toBeVisible();
    await expect(dash).toContainText('412');
    await page.waitForTimeout(600);
  }, { target: page.locator('#skyview-conversion-dashboard'), docs: 'local-dashboard' });
});
