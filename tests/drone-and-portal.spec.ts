import { test, expect } from '@playwright/test';

test.describe('drone cursor offset + beam', () => {
    test('hovers offset from the pointer and renders a beam back to it', async ({ page }) => {
        await page.goto('/');

        const drone = page.locator('.cursor-drone');
        const beam = page.locator('.cursor-drone__beam');

        // Move the pointer to a known spot, then let the drone's eased
        // animation settle toward its offset target.
        await page.mouse.move(400, 400);
        await page.mouse.move(420, 420);
        await page.waitForTimeout(500);

        await expect(drone).toHaveClass(/is-visible/);
        await expect(beam).toHaveClass(/is-visible/);

        const droneBox = await drone.boundingBox();
        expect(droneBox).not.toBeNull();

        // The drone box is positioned via translate3d at (currentX, currentY),
        // which is DRONE_OFFSET_X/Y (up-and-right) from the raw pointer
        // position once settled — so its center should read to the right of
        // and above the pointer coordinates we moved to.
        const droneCenterX = droneBox!.x + droneBox!.width / 2;
        const droneCenterY = droneBox!.y + droneBox!.height / 2;
        expect(droneCenterX).toBeGreaterThan(420);
        expect(droneCenterY).toBeLessThan(420);

        // Beam should have a non-zero rendered width (it stretches from the
        // drone body to the pointer) and be angled, not just a stub.
        const beamBox = await beam.boundingBox();
        expect(beamBox).not.toBeNull();
        expect(beamBox!.width).toBeGreaterThan(10);
    });
});

test.describe('client portal — server-side token verification (mocked backend)', () => {
    // The Playwright webServer here is a static http-server with no Netlify
    // Functions runtime, so /api/portal/verify is mocked at the network
    // layer. This still exercises the real client-side call path in
    // pages/client-portal.html (verifyAccessCode -> fetch -> redirect logic)
    // against both a success and a fail-closed (503) response, which is as
    // much of the end-to-end flow as is testable outside `netlify dev`.

    test('valid code (per mocked server) redirects to the gallery via a session token in the URL fragment', async ({ page }) => {
        const fakeSessionToken = `sess.ZTJlLXRlc3QtY2xpZW50.9999999999.${'b'.repeat(64)}`;

        await page.route('**/api/portal/verify', async (route) => {
            const body = route.request().postDataJSON();
            expect(body.code).toBeTruthy();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    valid: true,
                    clientId: 'e2e-test-client',
                    expiresAt: 9999999999,
                    sessionToken: fakeSessionToken,
                    sessionExpiresAt: 9999999999
                })
            });
        });

        // The gallery re-verifies the session server-side before showing any
        // files — mock that call too so the redirect target actually renders.
        await page.route('**/api/portal/files', async (route) => {
            expect(route.request().headers().authorization).toBe(`Bearer ${fakeSessionToken}`);
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    clientId: 'e2e-test-client',
                    projectName: 'E2E Test Project',
                    deliveredAt: '2025-12-10',
                    files: [{ id: 'sample-file', title: 'Sample File', type: 'photo', meta: 'Photo · JPG' }]
                })
            });
        });

        const futureExpiry = Math.floor(Date.now() / 1000) + 86400;
        const fakeCode = `dGVzdA.${futureExpiry}.${'a'.repeat(64)}`;

        await page.goto(`/pages/client-portal.html?code=${encodeURIComponent(fakeCode)}`);
        await page.waitForURL(/client-gallery\.html/, { timeout: 5000 });

        // The CWE-598 fix: the access token/session must never ride in the
        // query string on this redirect — it travels via URL fragment (which
        // this assertion catches immediately after redirect, before the page
        // script strips it via history.replaceState) and is then scrubbed
        // from the visible URL entirely.
        expect(page.url()).toContain('client-gallery.html');
        expect(page.url()).not.toContain('code=');

        await expect(page.getByText('Sample File')).toBeVisible({ timeout: 5000 });
        // Confirms the fragment was scrubbed from the address bar after read.
        expect(page.url()).not.toContain('session=');
    });

    test('fails closed with a clear message when the server is unavailable (503)', async ({ page }) => {
        await page.route('**/api/portal/verify', async (route) => {
            await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Client portal is not available' }) });
        });

        const futureExpiry = Math.floor(Date.now() / 1000) + 86400;
        const fakeCode = `dGVzdA.${futureExpiry}.${'a'.repeat(64)}`;

        await page.goto('/pages/client-portal.html');
        await page.fill('#accessCode', fakeCode);
        await page.click('#submitBtn');

        const errorMessage = page.locator('#errorMessage');
        await expect(errorMessage).toHaveClass(/show/, { timeout: 5000 });
        await expect(errorMessage).toContainText(/temporarily unavailable/i);
        expect(page.url()).not.toContain('client-gallery.html');
    });

    test('invalid code (per mocked server) shows an error and does not redirect', async ({ page }) => {
        await page.route('**/api/portal/verify', async (route) => {
            await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Invalid or expired access code' }) });
        });

        await page.goto('/pages/client-portal.html');
        await page.fill('#accessCode', 'not-a-real-token-but-long-enough');
        await page.click('#submitBtn');

        const errorMessage = page.locator('#errorMessage');
        await expect(errorMessage).toHaveClass(/show/, { timeout: 5000 });
        expect(page.url()).not.toContain('client-gallery.html');
    });
});
