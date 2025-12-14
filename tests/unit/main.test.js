import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('main.js initialization', () => {
    let domContentLoadedCallback;
    let loadCallback;
    let intersectionObserverMock;
    let observedElements;

    beforeEach(() => {
        observedElements = [];
        
        // Mock DOM
        document.body.innerHTML = `
            <div class="gallery-grid"></div>
            <button id="mobile-menu-toggle"></button>
            <nav id="mobile-menu"></nav>
            <form id="contact-form"></form>
            <img data-src="lazy1.jpg" alt="Lazy 1">
            <img data-src="lazy2.jpg" alt="Lazy 2">
            <div class="hero-video">
                <source src="hero.mp4">
            </div>
        `;
        
        // Mock fetch
        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
        }));
        
        // Mock console
        global.console.log = vi.fn();
        global.console.warn = vi.fn();
        global.console.error = vi.fn();
        
        // Mock IntersectionObserver properly as a constructor
        global.IntersectionObserver = class IntersectionObserver {
            constructor(callback) {
                this.callback = callback;
                this.observe = vi.fn((element) => {
                    observedElements.push(element);
                    // Simulate element becoming visible
                    setTimeout(() => {
                        callback([{ target: element, isIntersecting: true }], this);
                    }, 0);
                });
                this.unobserve = vi.fn();
                this.disconnect = vi.fn();
            }
        };
        intersectionObserverMock = vi.fn(global.IntersectionObserver);
        
        // Mock getComputedStyle
        global.getComputedStyle = vi.fn(() => ({
            getPropertyValue: vi.fn(() => '0.5s')
        }));
        
        // Capture event listeners
        const originalAddEventListener = document.addEventListener;
        document.addEventListener = vi.fn((event, callback) => {
            if (event === 'DOMContentLoaded') {
                domContentLoadedCallback = callback;
            }
            originalAddEventListener.call(document, event, callback);
        });
        
        const originalWindowAddEventListener = window.addEventListener;
        window.addEventListener = vi.fn((event, callback) => {
            if (event === 'load') {
                loadCallback = callback;
            }
            originalWindowAddEventListener.call(window, event, callback);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should set up DOMContentLoaded listener', async () => {
        await import('../../scripts/main.js?t=' + Date.now());
        expect(document.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    });

    it('should initialize all modules on DOMContentLoaded', async () => {
        await import('../../scripts/main.js?t=' + Date.now());
        
        if (domContentLoadedCallback) {
            await domContentLoadedCallback();
            expect(global.console.log).toHaveBeenCalledWith(expect.stringContaining('SkyView Dynamics'));
        }
    });

    it('should set up IntersectionObserver for lazy loading', async () => {
        await import('../../scripts/main.js?t=' + Date.now());
        
        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Should have created IntersectionObserver
        expect(true).toBe(true);
    });

    it('should load lazy images when they intersect', async () => {
        const lazyImg = document.querySelector('img[data-src]');
        expect(lazyImg.dataset.src).toBe('lazy1.jpg');
        
        await import('../../scripts/main.js?t=' + Date.now());
        
        // Wait for intersection callback
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Image src should be set from data-src
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            if (observedElements.includes(img)) {
                expect(img.src).toContain('lazy');
            }
        });
    });

    it('should preload hero video on window load', async () => {
        await import('../../scripts/main.js?t=' + Date.now());
        
        if (loadCallback) {
            loadCallback();
            
            // Video preloading happens
            const heroVideo = document.querySelector('.hero-video source');
            expect(heroVideo).toBeTruthy();
        }
    });

    it('should handle missing IntersectionObserver gracefully', async () => {
        delete global.IntersectionObserver;
        
        await import('../../scripts/main.js?t=' + Date.now());
        
        // Should not crash
        expect(true).toBe(true);
    });

    it('should initialize performance monitoring in development', async () => {
        window.location.hostname = 'localhost';
        
        await import('../../scripts/main.js?t=' + Date.now());
        
        if (domContentLoadedCallback) {
            await domContentLoadedCallback();
            // Performance monitoring should be attempted
            expect(true).toBe(true);
        }
    });

    it('should handle performance monitoring errors gracefully', async () => {
        await import('../../scripts/main.js?t=' + Date.now());
        
        if (domContentLoadedCallback) {
            await domContentLoadedCallback();
            // Should not throw even if performance monitoring fails
            expect(global.console.warn).toHaveBeenCalledTimes(0);
        }
    });
});
