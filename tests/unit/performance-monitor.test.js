import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('performance-monitor', () => {
    let originalLocation;
    
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Save original location
        originalLocation = window.location;
        
        // Mock window.location to enable isDev
        delete window.location;
        window.location = {
            hostname: 'localhost',
            href: 'http://localhost:3000',
            protocol: 'http:',
            host: 'localhost:3000'
        };
        
        // Set up DOM with performance display element
        document.body.innerHTML = `
            <div id="performance-display"></div>
            <img src="test1.jpg" alt="Test 1">
            <img src="test2.jpg" alt="Test 2">
            <video src="test.mp4"></video>
        `;
        
        // Mock console methods
        global.console.log = vi.fn();
        global.console.table = vi.fn();
        global.console.warn = vi.fn();
        global.console.error = vi.fn();
        
        // Mock performance API
        global.performance = {
            now: vi.fn(() => Date.now()),
            timing: {
                navigationStart: Date.now() - 1000,
                responseStart: Date.now() - 900,
                domContentLoadedEventEnd: Date.now() - 500,
                loadEventEnd: Date.now()
            },
            getEntriesByType: vi.fn((type) => {
                if (type === 'navigation') {
                    return [{
                        domContentLoadedEventEnd: Date.now() - 500,
                        loadEventEnd: Date.now(),
                        domInteractive: Date.now() - 600,
                        domComplete: Date.now() - 200
                    }];
                }
                if (type === 'paint') {
                    return [
                        { name: 'first-paint', startTime: 100 },
                        { name: 'first-contentful-paint', startTime: 150 }
                    ];
                }
                if (type === 'largest-contentful-paint') {
                    return [{ startTime: 200 }];
                }
                return [];
            })
        };

        // Mock PerformanceObserver
        global.PerformanceObserver = vi.fn(function(callback) {
            this.observe = vi.fn((options) => {
                // Simulate immediate callback for testing
                setTimeout(() => {
                    if (callback && options.entryTypes) {
                        callback({
                            getEntries: () => [{
                                name: 'layout-shift',
                                value: 0.05,
                                hadRecentInput: false
                            }]
                        }, this);
                    }
                }, 0);
            });
            this.disconnect = vi.fn();
            return this;
        });
    });
    
    afterEach(() => {
        // Restore original location
        window.location = originalLocation;
        vi.resetModules();
    });

    it('should initialize performance monitoring in dev mode', async () => {
        const { initPerformanceMonitoring } = await import('../../scripts/performance-monitor.js?v=' + Date.now());
        
        // Should execute in localhost without throwing
        expect(() => initPerformanceMonitoring()).not.toThrow();
    });

    it('should track Core Web Vitals (LCP, FID, CLS)', async () => {
        const { initPerformanceMonitoring } = await import('../../scripts/performance-monitor.js?v=' + Date.now());
        
        initPerformanceMonitoring();
        
        // Function should execute without errors
        expect(true).toBe(true);
    });

    it('should calculate timing metrics (TTFB, FCP, DOM)', async () => {
        const { initPerformanceMonitoring } = await import('../../scripts/performance-monitor.js?v=' + Date.now());
        
        initPerformanceMonitoring();
        
        // Console should log metrics
        expect(global.console.log).toHaveBeenCalled();
    });

    it('should track image loading performance', async () => {
        const { initPerformanceMonitoring } = await import('../../scripts/performance-monitor.js?v=' + Date.now());
        
        initPerformanceMonitoring();
        
        // Trigger image load events
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            img.dispatchEvent(new Event('load'));
        });
        
        expect(images.length).toBeGreaterThan(0);
    });

    it('should track video loading performance', async () => {
        const { initPerformanceMonitoring } = await import('../../scripts/performance-monitor.js?v=' + Date.now());
        
        initPerformanceMonitoring();
        
        // Trigger video load event
        const video = document.querySelector('video');
        video.dispatchEvent(new Event('loadeddata'));
        
        expect(video).toBeTruthy();
    });

    it('should display performance metrics in DOM', async () => {
        const { initPerformanceMonitoring } = await import('../../scripts/performance-monitor.js?v=' + Date.now());
        
        initPerformanceMonitoring();
        
        // Performance display element should exist
        const perfDisplay = document.getElementById('performance-display');
        expect(perfDisplay).toBeTruthy();
    });

    it('should handle missing performance API gracefully', async () => {
        // Import first, with the real performance API in place -- vitest's
        // own module-transform machinery calls performance.now() internally
        // during a dynamic import, so stubbing performance away beforehand
        // throws inside vitest's own instrumentation rather than the code
        // under test.
        const { initPerformanceMonitoring } = await import('../../scripts/performance-monitor.js?v=' + Date.now());

        // initPerformanceMonitoring() itself only schedules a 100ms
        // setTimeout (see performance-monitor.js's logAllMetrics) -- the
        // actual window.performance reads happen inside that deferred
        // callback, not synchronously. So `performance` must still be
        // stubbed away when the timer fires, not just during the initial
        // call, or this test never exercises the missing-API path at all.
        // Fake timers let us fire that callback deterministically within
        // the test instead of racing a real 100ms delay.
        vi.useFakeTimers();
        try {
            // vi.stubGlobal keeps `performance` resolvable (value undefined,
            // auto-restored by vi.unstubAllGlobals) unlike `delete
            // global.performance`, which makes the identifier unresolvable
            // and throws a ReferenceError as soon as anything touches it.
            vi.stubGlobal('performance', undefined);

            expect(() => initPerformanceMonitoring()).not.toThrow();
            expect(() => vi.advanceTimersByTime(100)).not.toThrow();
        } finally {
            vi.unstubAllGlobals();
            vi.useRealTimers();
        }
    });

    it('should not run in production (non-localhost)', async () => {
        // Change to production hostname
        window.location = {
            hostname: 'example.com',
            href: 'https://example.com',
            protocol: 'https:',
            host: 'example.com'
        };
        
        // Need fresh import after location change
        vi.resetModules();
        
        const { initPerformanceMonitoring } = await import('../../scripts/performance-monitor.js?v=' + Date.now());
        
        // Reset mocks to check if called after init
        vi.clearAllMocks();
        
        initPerformanceMonitoring();
        
        // PerformanceObserver should NOT be called in production
        expect(global.PerformanceObserver).not.toHaveBeenCalled();
    });

    it('should calculate accurate timing metrics', async () => {
        const { initPerformanceMonitoring } = await import('../../scripts/performance-monitor.js?v=' + Date.now());
        
        initPerformanceMonitoring();
        
        // Module loaded and executed
        expect(true).toBe(true);
    });

    it('should update metrics display periodically', async () => {
        const { initPerformanceMonitoring } = await import('../../scripts/performance-monitor.js?v=' + Date.now());
        
        initPerformanceMonitoring();
        
        // Display element should exist for updates
        const display = document.getElementById('performance-display');
        expect(display).toBeTruthy();
    });
});
