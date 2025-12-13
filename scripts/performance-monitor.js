/**
 * Performance Monitoring Utilities
 * 
 * Tracks page load performance, image loading, and Core Web Vitals
 * Automatically logs metrics to console in development
 */

// Check if we're in development mode
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

/**
 * Log performance metrics
 */
export function logPerformanceMetrics() {
    if (!isDev) return;
    
    if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
        const firstByte = timing.responseStart - timing.navigationStart;
        
        console.log('📊 Performance Metrics:');
        console.log(`   ⏱️  Time to First Byte: ${firstByte}ms`);
        console.log(`   📄 DOM Ready: ${domReady}ms`);
        console.log(`   ✅ Page Load Complete: ${loadTime}ms`);
    }
}

/**
 * Track image loading performance
 */
export function trackImageLoading() {
    if (!isDev) return;
    
    const images = document.querySelectorAll('img, picture source');
    const imageMetrics = {
        total: images.length,
        loaded: 0,
        failed: 0,
        webp: 0,
        fallback: 0
    };
    
    images.forEach(img => {
        if (img.complete) {
            imageMetrics.loaded++;
            if (img.currentSrc && img.currentSrc.includes('.webp')) {
                imageMetrics.webp++;
            } else {
                imageMetrics.fallback++;
            }
        } else {
            img.addEventListener('load', () => {
                imageMetrics.loaded++;
                if (img.currentSrc && img.currentSrc.includes('.webp')) {
                    imageMetrics.webp++;
                } else {
                    imageMetrics.fallback++;
                }
                
                if (imageMetrics.loaded + imageMetrics.failed === imageMetrics.total) {
                    logImageMetrics();
                }
            });
            
            img.addEventListener('error', () => {
                imageMetrics.failed++;
                console.warn('❌ Failed to load image:', img.src || img.srcset);
                
                if (imageMetrics.loaded + imageMetrics.failed === imageMetrics.total) {
                    logImageMetrics();
                }
            });
        }
    });
    
    function logImageMetrics() {
        console.log('\n📸 Image Loading Metrics:');
        console.log(`   Total: ${imageMetrics.total}`);
        console.log(`   ✅ Loaded: ${imageMetrics.loaded}`);
        console.log(`   ❌ Failed: ${imageMetrics.failed}`);
        console.log(`   🖼️  WebP: ${imageMetrics.webp}`);
        console.log(`   📄 Fallback: ${imageMetrics.fallback}`);
        
        if (imageMetrics.webp > 0) {
            const webpPercent = (imageMetrics.webp / imageMetrics.loaded * 100).toFixed(1);
            console.log(`   💚 WebP Usage: ${webpPercent}%`);
        }
    }
}

/**
 * Monitor Core Web Vitals
 * Tracks LCP, FID, CLS for real user monitoring
 */
export function monitorCoreWebVitals() {
    if (!isDev) return;
    
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
        try {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                console.log(`🎯 Largest Contentful Paint: ${Math.round(lastEntry.renderTime || lastEntry.loadTime)}ms`);
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            
            // First Input Delay (FID)
            const fidObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    console.log(`⚡ First Input Delay: ${Math.round(entry.processingStart - entry.startTime)}ms`);
                });
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
            
            // Cumulative Layout Shift (CLS)
            let clsScore = 0;
            const clsObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if (!entry.hadRecentInput) {
                        clsScore += entry.value;
                    }
                });
                console.log(`📐 Cumulative Layout Shift: ${clsScore.toFixed(3)}`);
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
            
        } catch (e) {
            // PerformanceObserver not fully supported
            console.log('ℹ️  Core Web Vitals monitoring not available in this browser');
        }
    }
}

/**
 * Measure resource sizes
 */
export function logResourceSizes() {
    if (!isDev) return;
    
    if (window.performance && window.performance.getEntriesByType) {
        const resources = window.performance.getEntriesByType('resource');
        const resourceSizes = {
            images: 0,
            scripts: 0,
            styles: 0,
            other: 0,
            total: 0
        };
        
        resources.forEach(resource => {
            const size = resource.transferSize || resource.encodedBodySize || 0;
            resourceSizes.total += size;
            
            if (resource.name.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
                resourceSizes.images += size;
            } else if (resource.name.match(/\.js$/i)) {
                resourceSizes.scripts += size;
            } else if (resource.name.match(/\.css$/i)) {
                resourceSizes.styles += size;
            } else {
                resourceSizes.other += size;
            }
        });
        
        console.log('\n📦 Resource Sizes:');
        console.log(`   🖼️  Images: ${(resourceSizes.images / 1024).toFixed(1)} KB`);
        console.log(`   📜 Scripts: ${(resourceSizes.scripts / 1024).toFixed(1)} KB`);
        console.log(`   🎨 Styles: ${(resourceSizes.styles / 1024).toFixed(1)} KB`);
        console.log(`   📁 Other: ${(resourceSizes.other / 1024).toFixed(1)} KB`);
        console.log(`   ✅ Total: ${(resourceSizes.total / 1024).toFixed(1)} KB`);
    }
}

/**
 * Initialize all performance monitoring
 */
export function initPerformanceMonitoring() {
    if (!isDev) return;
    
    console.log('🚀 Performance Monitoring Enabled (Development Mode)');
    console.log('');
    
    // Wait for page load
    if (document.readyState === 'complete') {
        logAllMetrics();
    } else {
        window.addEventListener('load', logAllMetrics);
    }
    
    function logAllMetrics() {
        setTimeout(() => {
            logPerformanceMetrics();
            trackImageLoading();
            logResourceSizes();
            monitorCoreWebVitals();
            console.log('\n💡 Tip: Run Lighthouse in Chrome DevTools for detailed analysis');
        }, 100);
    }
}

// Auto-initialize if this script is loaded
if (typeof window !== 'undefined') {
    initPerformanceMonitoring();
}
