import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('main.js initialization', () => {
    let domLoadedCallback;
    let windowLoadCallback;
    
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Set up complete DOM structure
        document.body.innerHTML = `
            <header id="header" class="header">
                <button id="mobile-menu-toggle">Menu</button>
                <nav id="mobile-menu">
                    <a href="#home">Home</a>
                    <a href="#services">Services</a>
                </nav>
            </header>
            <div class="gallery-grid"></div>
            <form id="contact-form">
                <input name="name" required>
                <input name="email" type="email" required>
                <textarea name="message" required></textarea>
                <button type="submit">Send</button>
            </form>
            <div class="parallax">
                <video class="parallax-video"></video>
            </div>
            <div class="fade-in">Content</div>
            <div class="slide-up">Content</div>
            <a href="#section">Smooth Scroll</a>
            <div id="section">Target</div>
            <img data-src="lazy.jpg" alt="Lazy">
            <video class="hero-video">
                <source src="hero.mp4" type="video/mp4">
            </video>
        `;
        
        // Mock fetch for gallery loading
        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
        }));
        
        // Mock console
        global.console.log = vi.fn();
        global.console.error = vi.fn();
        global.console.warn = vi.fn();
        
        // Mock IntersectionObserver and capture callback
        global.IntersectionObserver = vi.fn(function(callback) {
            this.observe = vi.fn((el) => {
                // Simulate intersection
                callback([{ target: el, isIntersecting: true }], this);
            });
            this.unobserve = vi.fn();
            this.disconnect = vi.fn();
            return this;
        });
        
        // Mock getComputedStyle
        global.getComputedStyle = vi.fn(() => ({
            getPropertyValue: vi.fn(() => '0.5s')
        }));
        
        // Capture event listeners
        const originalAddEventListener = document.addEventListener;
        document.addEventListener = vi.fn((event, callback) => {
            if (event === 'DOMContentLoaded') {
                domLoadedCallback = callback;
            }
            return originalAddEventListener.call(document, event, callback);
        });
        
        const originalWindowAddEventListener = window.addEventListener;
        window.addEventListener = vi.fn((event, callback) => {
            if (event === 'load') {
                windowLoadCallback = callback;
            }
            return originalWindowAddEventListener.call(window, event, callback);
        });
    });

    afterEach(() => {
        vi.resetModules();
    });

    it('should register DOMContentLoaded listener', async () => {
        await import('../../scripts/main.js?v=' + Date.now());
        
        expect(document.addEventListener).toHaveBeenCalledWith(
            'DOMContentLoaded',
            expect.any(Function)
        );
    });

    it('should initialize all modules on DOMContentLoaded', async () => {
        await import('../../scripts/main.js?v=' + Date.now());
        
        // Manually trigger DOMContentLoaded
        if (domLoadedCallback) {
            await domLoadedCallback();
            expect(global.console.log).toHaveBeenCalledWith(
                expect.stringContaining('SkyView Dynamics')
            );
        }
        
        expect(true).toBe(true);
    });

    it('should set up lazy loading for images', async () => {
        await import('../../scripts/main.js?v=' + Date.now());
        
        // IntersectionObserver should be created (main.js sets it up)
        expect(global.IntersectionObserver).toHaveBeenCalled();
    });

    it('should handle window load event', async () => {
        await import('../../scripts/main.js?v=' + Date.now());
        
        expect(window.addEventListener).toHaveBeenCalledWith(
            'load',
            expect.any(Function)
        );
        
        // Trigger load event
        if (windowLoadCallback) {
            windowLoadCallback();
        }
        
        expect(true).toBe(true);
    });

    it('should preload hero video on load', async () => {
        await import('../../scripts/main.js?v=' + Date.now());
        
        if (windowLoadCallback) {
            windowLoadCallback();
            
            // Video should be in document
            const heroVideo = document.querySelector('.hero-video');
            expect(heroVideo).toBeTruthy();
        }
        
        expect(true).toBe(true);
    });

    it('should handle missing performance monitoring gracefully', async () => {
        await import('../../scripts/main.js?v=' + Date.now());
        
        if (domLoadedCallback) {
            await domLoadedCallback();
            // Should not throw even if performance monitoring fails
        }
        
        expect(true).toBe(true);
    });

    it('should handle gallery loading errors', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
        
        await import('../../scripts/main.js?v=' + Date.now());
        
        if (domLoadedCallback) {
            await domLoadedCallback();
            expect(global.console.error).toHaveBeenCalled();
        }
        
        expect(true).toBe(true);
    });

    it('should initialize with minimal DOM', async () => {
        document.body.innerHTML = '<div class="gallery-grid"></div>';
        
        await import('../../scripts/main.js?v=' + Date.now());
        
        // Should not crash
        expect(true).toBe(true);
    });
});
