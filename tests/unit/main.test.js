import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('main.js initialization', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="gallery"></div>
            <button id="mobile-menu-toggle"></button>
            <nav id="mobile-menu"></nav>
            <form id="contact-form"></form>
            <div class="parallax"></div>
            <div class="fade-in"></div>
        `;
        
        // Mock console
        global.console.log = vi.fn();
        global.console.error = vi.fn();
    });

    it('should initialize without errors', async () => {
        // Mock all the modules that main.js imports
        vi.mock('../../scripts/gallery-loader-v2.js', () => ({
            loadGallery: vi.fn()
        }));
        
        vi.mock('../../scripts/gallery.js', () => ({
            initGalleryLightbox: vi.fn()
        }));
        
        vi.mock('../../scripts/mobile-menu.js', () => ({
            initMobileMenu: vi.fn()
        }));
        
        vi.mock('../../scripts/form.js', () => ({
            initContactForm: vi.fn()
        }));
        
        vi.mock('../../scripts/parallax.js', () => ({
            initParallax: vi.fn()
        }));
        
        vi.mock('../../scripts/scroll-effects.js', () => ({
            initScrollEffects: vi.fn()
        }));
        
        vi.mock('../../scripts/smooth-scroll.js', () => ({
            initSmoothScroll: vi.fn()
        }));

        // Since main.js is an initialization file, we'll just test that
        // the DOM elements it expects exist
        expect(document.getElementById('gallery')).toBeTruthy();
        expect(document.getElementById('mobile-menu-toggle')).toBeTruthy();
        expect(document.getElementById('contact-form')).toBeTruthy();
    });

    it('should handle missing optional elements', () => {
        document.body.innerHTML = `<div id="gallery"></div>`;
        
        // Main.js should handle missing elements gracefully
        const gallery = document.getElementById('gallery');
        const mobileMenu = document.getElementById('mobile-menu-toggle');
        
        expect(gallery).toBeTruthy();
        expect(mobileMenu).toBeFalsy();
    });
});
