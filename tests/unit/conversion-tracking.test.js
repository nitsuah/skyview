import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('conversion-tracking', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        document.body.innerHTML = `
            <a id="hero-book" href="#booking" class="cta-button">Book a consultation</a>
            <nav><a id="nav-book" href="#booking">Booking</a></nav>
            <form id="contactForm"></form>
        `;

        window.SKYVIEW_CONFIG = {
            features: { analytics: true },
            analytics: { provider: 'plausible', domain: 'skyviewdynamics.com' }
        };
        window.plausible = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete window.plausible;
        delete window.SKYVIEW_CONFIG;
    });

    it('records a single landing view per browser session', async () => {
        const { getConversionMetrics, initConversionTracking } = await import('../../scripts/conversion-tracking.js?test=' + Date.now());

        initConversionTracking();
        initConversionTracking();

        const metrics = getConversionMetrics();
        expect(metrics.totals.landing_view).toBe(1);
    });

    it('tracks booking CTA clicks and forwards privacy-safe analytics events', async () => {
        const { getConversionMetrics, initConversionTracking } = await import('../../scripts/conversion-tracking.js?test=' + Date.now());

        initConversionTracking();
        document.getElementById('hero-book').click();

        const metrics = getConversionMetrics();
        expect(metrics.totals.booking_cta_click).toBe(1);
        expect(window.plausible).toHaveBeenCalledWith('booking_cta_click', {
            props: expect.objectContaining({ source: 'booking_link' })
        });
    });

    it('is hidden by default, even on localhost', async () => {
        window.history.replaceState({}, '', '/');
        const { initConversionTracking } = await import('../../scripts/conversion-tracking.js?test=' + Date.now());

        initConversionTracking();

        expect(document.querySelector('.conversion-dashboard')).toBeNull();
    });

    it('renders a lightweight local conversion dashboard when a developer opts in on localhost', async () => {
        window.history.replaceState({}, '', '/?metrics=1');
        const { initConversionTracking } = await import('../../scripts/conversion-tracking.js?test=' + Date.now());

        initConversionTracking();
        document.getElementById('hero-book').click();

        const dashboard = document.querySelector('.conversion-dashboard');
        expect(dashboard).toBeTruthy();
        expect(dashboard.querySelector('[data-event-name="landing_view"]').textContent).toContain('1');
        expect(dashboard.querySelector('[data-event-name="booking_cta_click"]').textContent).toContain('1');
    });

    describe('on a real host the dashboard is owner-only', () => {
        const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
        const load = async () => {
            const mod = await import('../../scripts/conversion-tracking.js?test=' + Date.now());
            mod.initConversionTracking();
            await flush();
            await flush();
        };

        beforeEach(() => {
            window.happyDOM.setURL('https://skyviewd.netlify.app/?metrics=1');
            window.SKYVIEW_CONFIG.features.analyticsDebugPanel = true; // the old public opt-ins must no longer work
        });

        afterEach(() => {
            window.happyDOM.setURL('http://localhost:3000/');
            vi.unstubAllGlobals();
        });

        it('is not shown to anonymous visitors, even with ?metrics=1', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
            await load();
            expect(document.querySelector('.conversion-dashboard')).toBeNull();
        });

        it('is not shown to a signed-in client', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ role: 'client' }) }));
            await load();
            expect(document.querySelector('.conversion-dashboard')).toBeNull();
        });

        it('is not shown when the auth check fails', async () => {
            vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
            await load();
            expect(document.querySelector('.conversion-dashboard')).toBeNull();
        });

        it('is shown once the session is confirmed to be an admin', async () => {
            const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ role: 'admin' }) });
            vi.stubGlobal('fetch', fetchMock);
            await load();
            expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.any(Object));
            expect(document.querySelector('.conversion-dashboard')).toBeTruthy();
        });
    });

    it('sanitizes contact-submit metadata so no PII is persisted', async () => {
        const { getConversionMetrics, trackConversionEvent } = await import('../../scripts/conversion-tracking.js?test=' + Date.now());

        trackConversionEvent('contact_submit', {
            source: 'contact_form',
            email: 'person@example.com',
            message: 'Need a quote for my event'
        });

        const metrics = getConversionMetrics();
        expect(metrics.totals.contact_submit).toBe(1);
        expect(metrics.events[0]).toEqual(expect.objectContaining({
            name: 'contact_submit',
            source: 'contact_form'
        }));
        expect(metrics.events[0]).not.toHaveProperty('email');
        expect(metrics.events[0]).not.toHaveProperty('message');
    });
});
