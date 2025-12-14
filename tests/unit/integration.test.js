import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as parallax from '../../scripts/parallax.js';
import * as scrollEffects from '../../scripts/scroll-effects.js';

describe('parallax integration', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="parallax" data-speed="0.5">
                <div class="parallax-content">Content</div>
            </div>
        `;
        
        // Mock scroll position
        window.scrollY = 0;
    });

    it('should initialize parallax effect', () => {
        expect(typeof parallax.initParallax).toBe('function');
        parallax.initParallax();
        
        const parallaxEl = document.querySelector('.parallax');
        expect(parallaxEl).toBeTruthy();
    });
});

describe('scroll effects integration', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="fade-in">Fade</div>
            <div class="slide-up">Slide</div>
        `;
        
        // Mock IntersectionObserver
        global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
            observe: vi.fn((el) => {
                // Immediately call callback as if element is visible
                callback([{ target: el, isIntersecting: true }]);
            }),
            unobserve: vi.fn(),
            disconnect: vi.fn()
        }));
    });

    it('should initialize scroll effects', () => {
        expect(typeof scrollEffects.initScrollEffects).toBe('function');
        scrollEffects.initScrollEffects();
        
        const fadeEl = document.querySelector('.fade-in');
        expect(fadeEl).toBeTruthy();
    });
});
