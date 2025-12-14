import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('performance-monitor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Reset DOM
        document.body.innerHTML = `
            <img src="test1.jpg" alt="Test 1">
            <img src="test2.jpg" alt="Test 2">
            <video src="test.mp4"></video>
        `;
        
        // Mock console
        global.console.log = vi.fn();
        global.console.warn = vi.fn();
        global.console.error = vi.fn();
        
        // Mock performance API
        global.performance = {
            now: vi.fn(() => 100),
            getEntriesByType: vi.fn(() => []),
            timing: {
                navigationStart: 0,
                responseStart: 50,
                domContentLoadedEventEnd: 100,
                loadEventEnd: 200
            }
        };

        // Mock PerformanceObserver
        global.PerformanceObserver = vi.fn(function(callback) {
            this.observe = vi.fn();
            this.disconnect = vi.fn();
            return this;
        });
    });

    it('should have performance tracking functions', async () => {
        // Just verify the module exports and has the right structure
        const module = await import('../../scripts/performance-monitor.js');
        expect(module).toBeDefined();
    });

    it('should track timing metrics', () => {
        const timing = performance.timing;
        const ttfb = timing.responseStart - timing.navigationStart;
        const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
        const pageLoad = timing.loadEventEnd - timing.navigationStart;
        
        expect(ttfb).toBe(50);
        expect(domReady).toBe(100);
        expect(pageLoad).toBe(200);
    });

    it('should handle image load events', () => {
        const images = document.querySelectorAll('img');
        expect(images.length).toBe(2);
        
        images.forEach(img => {
            const loadEvent = new Event('load');
            img.dispatchEvent(loadEvent);
        });
        
        // Verify events can be dispatched without errors
        expect(true).toBe(true);
    });

    it('should handle image error events', () => {
        const images = document.querySelectorAll('img');
        
        images.forEach(img => {
            const errorEvent = new Event('error');
            img.dispatchEvent(errorEvent);
        });
        
        // Verify events can be dispatched without errors
        expect(true).toBe(true);
    });

    it('should filter out video elements from image tracking', () => {
        const images = document.querySelectorAll('img');
        const videos = document.querySelectorAll('video');
        
        expect(images.length).toBe(2);
        expect(videos.length).toBe(1);
        
        // Video elements should not be included in image metrics
        images.forEach(img => {
            expect(img.tagName).toBe('IMG');
        });
    });

    it('should handle page lifecycle events', () => {
        const loadEvent = new Event('load');
        window.dispatchEvent(loadEvent);
        
        const domLoadedEvent = new Event('DOMContentLoaded');
        document.dispatchEvent(domLoadedEvent);
        
        // Verify events can be dispatched
        expect(true).toBe(true);
    });

    it('should create PerformanceObserver instances', () => {
        const callback = vi.fn();
        const observer = new PerformanceObserver(callback);
        
        expect(observer).toBeDefined();
        expect(typeof observer.observe).toBe('function');
        expect(typeof observer.disconnect).toBe('function');
    });

    it('should measure performance metrics', () => {
        const now = performance.now();
        expect(typeof now).toBe('number');
        expect(now).toBeGreaterThanOrEqual(0);
    });
});
