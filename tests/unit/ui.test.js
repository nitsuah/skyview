import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initParallax } from '../../scripts/parallax.js';
import { initScrollEffects, initAnimationStates } from '../../scripts/scroll-effects.js';

describe('UI Effects', () => {

    describe('parallax', () => {
        let heroVideo;

        beforeEach(() => {
            document.body.innerHTML = '<video class="hero-video"></video>';
            heroVideo = document.querySelector('.hero-video');
            window.pageYOffset = 0;
        });

        it('should update transform on scroll', () => {
            initParallax();

            // Scroll down
            window.pageYOffset = 100;
            window.dispatchEvent(new Event('scroll'));

            // Logic: - (50 + 100 * 0.3 * 0.05)% = -(50 + 1.5)% = -51.5%
            // But throttle logic might delay it. Since we are using the real throttle, 
            // the first call happens immediately.
            expect(heroVideo.style.transform).toContain('translate');
        });

        it('should do nothing if video missing', () => {
            document.body.innerHTML = '';
            const spy = vi.spyOn(window, 'addEventListener');
            initParallax();
            expect(spy).not.toHaveBeenCalledWith('scroll', expect.any(Function));
        });
    });

    describe('scroll effects', () => {
        let header, element;

        beforeEach(() => {
            document.body.innerHTML = `
                <header class="header"></header>
                <div class="service-card" style="opacity: 0"></div>
            `;
            header = document.querySelector('.header');
            element = document.querySelector('.service-card');

            window.pageYOffset = 0;
            window.innerHeight = 1000;
            Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
                top: 500,
                bottom: 600
            });
        });

        it('should change header style on scroll', () => {
            initScrollEffects();

            window.pageYOffset = 200;
            window.dispatchEvent(new Event('scroll'));

            expect(header.style.background).toContain('rgba(26, 26, 26, 0.95)');
        });

        it('should hide header on scroll down', () => {
            initScrollEffects();

            // Set initial state
            window.pageYOffset = 600;
            window.dispatchEvent(new Event('scroll'));

            // Scroll down more
            window.pageYOffset = 700;
            window.dispatchEvent(new Event('scroll'));

            expect(header.style.transform).toBe('translateY(-100%)');
        });

        it('should show elements on scroll', () => {
            initScrollEffects();

            window.dispatchEvent(new Event('scroll'));

            expect(element.style.opacity).toBe('1');
            expect(element.style.transform).toBe('translateY(0)');
        });

        it('should initialize animation states', async () => {
            // Reset styles
            element.style.opacity = '1';

            // Use fake timers for the setTimeout in initAnimationStates
            vi.useFakeTimers();

            initAnimationStates();

            expect(element.style.opacity).toBe('0');
            expect(element.style.transform).toBe('translateY(30px)');

            // Check that it calls animateOnScroll after timeout
            await vi.advanceTimersByTimeAsync(150);

            // Should be visible again beause it's in viewport (mocked rect)
            expect(element.style.opacity).toBe('1');
        });
    });
});
