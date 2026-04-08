import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('config branding', () => {
    beforeEach(() => {
        vi.resetModules();
        document.title = 'Placeholder Title';
        document.head.innerHTML = `
            <meta name="author" content="Placeholder Co">
            <meta property="og:title" content="Placeholder Co | Demo">
            <meta property="og:site_name" content="Placeholder Co">
            <meta property="og:url" content="https://placeholder.invalid/">
            <meta name="twitter:title" content="Placeholder Co | Demo">
            <meta name="twitter:url" content="https://placeholder.invalid/">
            <link rel="canonical" href="https://placeholder.invalid/">
        `;
        document.body.innerHTML = `
            <header>
                <span class="logo-text" data-company-name>Placeholder Co</span>
            </header>
            <main>
                <span data-contact-email>old@example.com</span>
                <span data-contact-phone>+0 (000) 000-0000</span>
                <a data-social-link="twitter" href="https://old-twitter.example">Twitter</a>
                <a data-social-link="instagram" href="https://old-instagram.example">Instagram</a>
                <a data-social-link="youtube" href="https://old-youtube.example">YouTube</a>
            </main>
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
        expect(document.querySelector('meta[property="og:url"]').getAttribute('content')).toBe(window.SKYVIEW_CONFIG.brand.website);
        expect(document.querySelector('meta[name="twitter:url"]').getAttribute('content')).toBe(window.SKYVIEW_CONFIG.brand.website);
        expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(window.SKYVIEW_CONFIG.brand.website);
        expect(document.querySelector('[data-contact-email]').textContent).toBe(window.SKYVIEW_CONFIG.contact.email);
        expect(document.querySelector('[data-contact-phone]').textContent).toBe(window.SKYVIEW_CONFIG.contact.phone);
        expect(document.querySelector('[data-social-link="instagram"]').getAttribute('href')).toBe(window.SKYVIEW_CONFIG.contact.social.instagram);
    });
});
