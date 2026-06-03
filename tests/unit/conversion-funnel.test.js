import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('conversion-tracking funnel extensions', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        document.body.innerHTML = '';
        window.SKYVIEW_CONFIG = {
            features: { analytics: false },
            analytics: { provider: 'none' }
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete window.SKYVIEW_CONFIG;
    });

    it('getFunnelDropOff returns a step for each funnel stage', async () => {
        const { getFunnelDropOff } = await import('../../scripts/conversion-tracking.js?funneltest=' + Date.now());
        const steps = getFunnelDropOff();
        expect(steps).toHaveLength(4);
        expect(steps[0].step).toBe('landing_view');
        expect(steps[3].step).toBe('contact_submit');
    });

    it('calculates 100% conversion rate for the top funnel step', async () => {
        const { getFunnelDropOff, trackConversionEvent } = await import('../../scripts/conversion-tracking.js?funneltest2=' + Date.now());
        trackConversionEvent('landing_view');
        trackConversionEvent('landing_view');
        trackConversionEvent('gallery_engagement');
        const steps = getFunnelDropOff();
        expect(steps[0].conversionRate).toBe(100);
        expect(steps[1].conversionRate).toBe(50);
    });

    it('exportMetricsJSON returns a valid JSON string', async () => {
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
        vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);

        const originalCreate = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tag) => {
            const el = originalCreate(tag);
            if (tag === 'a') el.click = vi.fn();
            return el;
        });

        const { exportMetricsJSON, trackConversionEvent } = await import('../../scripts/conversion-tracking.js?jsontest=' + Date.now());
        trackConversionEvent('landing_view', { source: 'page_load' });
        const json = exportMetricsJSON();
        const parsed = JSON.parse(json);
        expect(parsed).toHaveProperty('totals');
        expect(parsed).toHaveProperty('funnelDropOff');
        expect(parsed).toHaveProperty('events');
        expect(parsed.totals.landing_view).toBe(1);
    });

    it('exportMetricsCSV returns a CSV string with header row', async () => {
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
        vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);

        const originalCreate = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tag) => {
            const el = originalCreate(tag);
            if (tag === 'a') el.click = vi.fn();
            return el;
        });

        const { exportMetricsCSV, trackConversionEvent } = await import('../../scripts/conversion-tracking.js?csvtest=' + Date.now());
        trackConversionEvent('booking_cta_click', { source: 'hero' });
        const csv = exportMetricsCSV();
        expect(csv).toContain('"event"');
        expect(csv).toContain('"timestamp"');
        expect(csv).toContain('booking_cta_click');
    });

    it('referrer and campaign are allowed metadata keys', async () => {
        const { getConversionMetrics, trackConversionEvent } = await import('../../scripts/conversion-tracking.js?reftest=' + Date.now());
        trackConversionEvent('landing_view', { source: 'page_load', referrer: 'google.com', campaign: 'summer' });
        const metrics = getConversionMetrics();
        expect(metrics.events[0].referrer).toBe('google.com');
        expect(metrics.events[0].campaign).toBe('summer');
    });
});
