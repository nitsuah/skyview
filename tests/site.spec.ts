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

test('contact form has netlify attributes', async ({ page }) => {
    await page.goto('/');
    const form = page.locator('form[name="contact"]');
    await expect(form).toHaveAttribute('data-netlify', 'true');

    // Check hidden input
    const hiddenInput = form.locator('input[name="form-name"]');
    await expect(hiddenInput).toHaveValue('contact');
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
