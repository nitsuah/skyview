import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('config branding', () => {
    beforeEach(() => {
        vi.resetModules();
        document.title = 'Placeholder Title';
        document.head.innerHTML = `
            <meta name="author" content="Placeholder Co">
            <meta property="og:title" content="Placeholder Co | Demo">
            <meta property="og:site_name" content="Placeholder Co">
            <meta name="twitter:title" content="Placeholder Co | Demo">
        `;
        document.body.innerHTML = `
            <header>
                <span class="logo-text" data-company-name>Placeholder Co</span>
            </header>
            <footer>
                <span class="logo-text" data-company-name>Placeholder Co</span>
                <p data-company-legal>Placeholder Co</p>
            </footer>
        `;
        delete window.SKYVIEW_CONFIG;
    });

    afterEach(() => {
        delete window.SKYVIEW_CONFIG;
    });

    it('applies the configured company name across visible branding and metadata', async () => {
        await import('../../config.js?test=' + Date.now());
        document.dispatchEvent(new Event('DOMContentLoaded'));

        expect(window.SKYVIEW_CONFIG.brand.name).toBeTruthy();
        expect(document.querySelectorAll('[data-company-name]')[0].textContent).toBe(window.SKYVIEW_CONFIG.brand.name);
        expect(document.title).toContain(window.SKYVIEW_CONFIG.brand.name);
        expect(document.querySelector('meta[property="og:site_name"]').getAttribute('content')).toBe(window.SKYVIEW_CONFIG.brand.name);
    });
});
