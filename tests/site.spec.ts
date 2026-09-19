import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SkyView Dynamics/);
});

test('navigates to services', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="#services"]');
    // Check if the services section is visible (or at least valid)
    const servicesSection = page.locator('#services');
    await expect(servicesSection).toBeVisible();
});

test('displays service cards', async ({ page }) => {
    await page.goto('/');
    const realEstateCard = page.getByRole('heading', { name: 'REAL ESTATE' });
    await expect(realEstateCard).toBeVisible();

    const cinemaCard = page.getByRole('heading', { name: 'CINEMATOGRAPHY' });
    await expect(cinemaCard).toBeVisible();
});

test('the contact form is gone; people are sent to the platform instead', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('form[name="contact"]')).toHaveCount(0);
    await expect(page.locator('#contact')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'CONTACT', exact: true })).toHaveCount(0);
    // No contact details on the homepage either — they live on the privacy page.
    await expect(page.getByText('contact@skyviewdynamics.com')).toHaveCount(0);
    await expect(page.getByText('Get In Touch')).toHaveCount(0);

    const bookNow = page.getByRole('link', { name: 'BOOK NOW' });
    await expect(bookNow).toHaveAttribute('href', '/app');
    await expect(page.getByRole('link', { name: 'PLATFORM', exact: true })).toHaveCount(0);
});

test('the privacy page carries just the contact email and phone', async ({ page }) => {
    await page.goto('/pages/privacy.html');
    const box = page.locator('.contact-box');
    await expect(box.getByRole('link', { name: 'contact@skyviewdynamics.com' })).toHaveAttribute('href', 'mailto:contact@skyviewdynamics.com');
    await expect(box.getByRole('link', { name: '+1 (555) 123-4567' })).toHaveAttribute('href', 'tel:+15551234567');
    // None of the old homepage contact boilerplate came along.
    await expect(page.getByText('Response within 1 business day')).toHaveCount(0);
    await expect(page.getByText('Get In Touch')).toHaveCount(0);
});

test('gallery interaction', async ({ page }) => {
    await page.goto('/');
    // Click the first gallery item
    const firstItem = page.locator('.gallery-item').first();
    await firstItem.click();

    // Expect lightbox to appear
    const lightbox = page.locator('#lightbox');
    await expect(lightbox).toHaveClass(/active/);

    // Close it
    const closeBtn = page.locator('.lightbox-close');
    await closeBtn.click();
    await expect(lightbox).not.toHaveClass(/active/);
});
