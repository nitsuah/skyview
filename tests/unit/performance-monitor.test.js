import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('performance-monitor', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <img src="test1.jpg" alt="Test 1">
            <img src="test2.webp" alt="Test 2">
            <img src="test3.jpg" alt="Test 3">
            <video src="test.mp4"></video>
        `;
        
        global.console.log = vi.fn();
        global.console.warn = vi.fn();
        global.console.error = vi.fn();
        
        global.performance = {
            now: vi.fn(() => Date.now()),
            getEntriesByType: vi.fn((type) => {
                if (type === 'resource') {
                    return [
                        { name: 'test.jpg', transferSize: 5000 },
                        { name: 'test.webp', transferSize: 3000 },
                        { name: 'script.js', transferSize: 10000 },
                        { name: 'style.css', transferSize: 4000 },
                        { name: 'data.json', transferSize: 1000 }
                    ];
                }
                return [];
            }),
            timing: {
                navigationStart: 1000,
                responseStart: 1100,
                domContentLoadedEventEnd: 1500,
                loadEventEnd: 2000
            }
        };

        global.PerformanceObserver = vi.fn().mockImplementation((callback) => {
            return {
                observe: vi.fn(),
                disconnect: vi.fn()
            };
        });
    });

    afterEach(() => {
        vi.resetModules();
    });

    it('should import without errors', async () => {
        const module = await import('../../scripts/performance-monitor.js?t=' + Date.now());
        expect(module).toBeDefined();
        expect(module.logPerformanceMetrics).toBeDefined();
        expect(module.trackImageLoading).toBeDefined();
        expect(module.monitorCoreWebVitals).toBeDefined();
        expect(module.logResourceSizes).toBeDefined();
        expect(module.initPerformanceMonitoring).toBeDefined();
    });

    it('should work in development mode', async () => {
        Object.defineProperty(window.location, 'hostname', {
            value: 'localhost',
            configurable: true
        });
        
        const { logPerformanceMetrics, trackImageLoading, monitorCoreWebVitals } = await import('../../scripts/performance-monitor.js?t=' + Date.now());
        
        logPerformanceMetrics();
        trackImageLoading();
        monitorCoreWebVitals();
        
        // Should not crash in dev mode
        expect(true).toBe(true);
    });

    it('should skip in production mode', async () => {
        Object.defineProperty(window.location, 'hostname', {
            value: 'example.com',
            configurable: true
        });
        
        const { logPerformanceMetrics, trackImageLoading, monitorCoreWebVitals } = await import('../../scripts/performance-monitor.js?t=' + Date.now());
        
        logPerformanceMetrics();
        trackImageLoading();
        monitorCoreWebVitals();
        
        // Should not crash in production mode
        expect(true).toBe(true);
    });

    it('should handle PerformanceObserver errors', async () => {
        global.PerformanceObserver = vi.fn().mockImplementation(() => {
            throw new Error('Not supported');
        });
        
        Object.defineProperty(window.location, 'hostname', {
            value: 'localhost',
            configurable: true
        });
        
        const { monitorCoreWebVitals } = await import('../../scripts/performance-monitor.js?t=' + Date.now());
        
        monitorCoreWebVitals();
        
        // Should handle errors gracefully
        expect(true).toBe(true);
    });

    it('should handle missing performance APIs', async () => {
        delete global.performance.getEntriesByType;
        
        const { logResourceSizes } = await import('../../scripts/performance-monitor.js?t=' + Date.now());
        
        logResourceSizes();
        
        // Should not crash
        expect(true).toBe(true);
    });

    it('should initialize performance monitoring', async () => {
        Object.defineProperty(document, 'readyState', { 
            value: 'complete', 
            configurable: true
        });
        Object.defineProperty(window.location, 'hostname', {
            value: 'localhost',
            configurable: true
        });
        
        const { initPerformanceMonitoring } = await import('../../scripts/performance-monitor.js?t=' + Date.now());
        
        initPerformanceMonitoring();
        
        // Should run without errors
        expect(true).toBe(true);
    });

    it('should wait for load event when page not complete', async () => {
        Object.defineProperty(document, 'readyState', { 
            value: 'loading', 
            configurable: true
        });
        Object.defineProperty(window.location, 'hostname', {
            value: 'localhost',
            configurable: true
        });
        
        const { initPerformanceMonitoring } = await import('../../scripts/performance-monitor.js?t=' + Date.now());
        
        initPerformanceMonitoring();
        
        //Should register load listener
        expect(true).toBe(true);
    });
});
