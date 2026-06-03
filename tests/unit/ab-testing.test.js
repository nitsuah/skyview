import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('ab-testing', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <section class="hero-content">
                <h1 class="hero-headline">CINEMATIC DRONE SERVICES</h1>
                <a class="cta-button"><span class="cta-text">BOOK A CONSULTATION</span></a>
            </section>
        `;
    });

    afterEach(() => {
        vi.resetModules();
        delete window.SKYVIEW_CONFIG;
    });

    it('returns the same variant for the same visitor across calls', async () => {
        const { getVariant } = await import('../../scripts/ab-testing.js?t=' + Date.now());
        const v1 = getVariant('test-exp-1', ['control', 'treatment']);
        const v2 = getVariant('test-exp-1', ['control', 'treatment']);
        expect(v1).toBe(v2);
        expect(['control', 'treatment']).toContain(v1);
    });

    it('assigns different experiments independently', async () => {
        const { getVariant } = await import('../../scripts/ab-testing.js?t=' + Date.now());
        const v1 = getVariant('exp-a', ['a', 'b']);
        const v2 = getVariant('exp-b', ['x', 'y']);
        expect(['a', 'b']).toContain(v1);
        expect(['x', 'y']).toContain(v2);
    });

    it('does not apply experiments when disabled', async () => {
        window.SKYVIEW_CONFIG = { experiments: { enabled: false } };
        const { initAbTesting } = await import('../../scripts/ab-testing.js?t=' + Date.now());
        const result = initAbTesting();
        expect(result).toEqual({});
    });

    it('applies hero headline variant when experiments are enabled', async () => {
        window.SKYVIEW_CONFIG = {
            experiments: {
                enabled: true,
                heroHeadline: {
                    id: 'headline-test',
                    variants: { control: 'ORIGINAL HEADLINE', treatment: 'NEW HEADLINE' }
                }
            }
        };
        const { initAbTesting } = await import('../../scripts/ab-testing.js?t=' + Date.now());
        initAbTesting();
        const headline = document.querySelector('.hero-headline');
        expect(['ORIGINAL HEADLINE', 'NEW HEADLINE']).toContain(headline.textContent);
    });
});
