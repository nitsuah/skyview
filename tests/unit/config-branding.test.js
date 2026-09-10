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
            <script type="application/ld+json">
            {
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                "name": "Placeholder Co",
                "email": "old@example.com",
                "telephone": "+0 (000) 000-0000",
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "Old City",
                    "addressRegion": "Old State",
                    "addressCountry": "US"
                },
                "sameAs": ["https://old-twitter.example"]
            }
            </script>
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

        const jsonLd = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
        expect(jsonLd.address.addressLocality).toBe(window.SKYVIEW_CONFIG.contact.address.locality);
        expect(jsonLd.address.addressRegion).toBe(window.SKYVIEW_CONFIG.contact.address.region);
        expect(jsonLd.address.addressCountry).toBe(window.SKYVIEW_CONFIG.contact.address.country);
        expect(jsonLd.sameAs).toEqual([
            window.SKYVIEW_CONFIG.contact.social.facebook,
            window.SKYVIEW_CONFIG.contact.social.twitter,
            window.SKYVIEW_CONFIG.contact.social.instagram,
            window.SKYVIEW_CONFIG.contact.social.youtube
        ]);
    });

    it('does not publish placeholder (0,0) coordinates in structured data', async () => {
        // contact.geo is still '0.0'/'0.0' in the shipped config (see
        // docs/CONFIG.md) — publishing that verbatim would claim a real
        // location in the Gulf of Guinea. updateStructuredData() must leave
        // "geo" out of the JSON-LD entirely until real coordinates are set,
        // matching the static index.html template (which also omits it).
        await import('../../config.js?test=' + Date.now());
        document.dispatchEvent(new Event('DOMContentLoaded'));

        expect(window.SKYVIEW_CONFIG.contact.geo.latitude).toBe('0.0');
        expect(window.SKYVIEW_CONFIG.contact.geo.longitude).toBe('0.0');

        const jsonLd = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
        expect(jsonLd.geo).toBeUndefined();
    });

    it('publishes structured-data geo coordinates once phone/phoneE164 fallback and real geo are both configured', async () => {
        // Exercise the phone -> phoneE164 fallback in the visible contact
        // element too, since both use the same config object.
        document.body.querySelector('[data-contact-phone]').remove();
        document.body.querySelector('main').insertAdjacentHTML(
            'beforeend',
            '<span data-contact-phone></span>',
        );

        await import('../../config.js?test=' + Date.now());
        // Simulate a fully-configured deployment by overwriting the
        // placeholders the way a real site's config.js would ship them,
        // then re-run the same DOMContentLoaded handler the module already
        // registered.
        window.SKYVIEW_CONFIG.contact.phone = '';
        window.SKYVIEW_CONFIG.contact.phoneE164 = '+15551234567';
        window.SKYVIEW_CONFIG.contact.geo.latitude = '33.7490';
        window.SKYVIEW_CONFIG.contact.geo.longitude = '-84.3880';
        document.dispatchEvent(new Event('DOMContentLoaded'));

        expect(document.querySelector('[data-contact-phone]').textContent).toBe('+15551234567');

        const jsonLd = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
        expect(jsonLd.geo).toEqual({
            '@type': 'GeoCoordinates',
            latitude: '33.7490',
            longitude: '-84.3880',
        });
    });
});
