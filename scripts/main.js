// Main Entry Point - SkyView Dynamics
import { initMobileMenu } from './mobile-menu.js';
import { initSmoothScroll } from './smooth-scroll.js';
import { initGalleryLightbox } from './gallery.js?v=20251213013';
import { initFormHandling } from './form.js?v=20251213013';
import { initScrollEffects, initAnimationStates } from './scroll-effects.js';
import { initParallax } from './parallax.js';
import { loadGallery } from './gallery-loader-v2.js?v=video-support';
import { initPerformanceMonitoring } from './performance-monitor.js';
import { initConversionTracking } from './conversion-tracking.js?v=20251213013';
import { initDroneCursor } from './drone-cursor.js?v=20251213013';
import { initInteractivePolish } from './interactive-polish.js?v=20251213013';

// Initialize all modules when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    initMobileMenu();
    initSmoothScroll();
    initConversionTracking();
    initDroneCursor();
    initFormHandling();

    // Load dynamic content
    await loadGallery();

    // Initialize interactive modules that depend on content
    initGalleryLightbox();
    initScrollEffects();
    initParallax();
    initAnimationStates();
    initInteractivePolish();

    console.log('🚁 SkyView Dynamics - Website Initialized');
    
    // Initialize performance monitoring (development only)
    if (typeof initPerformanceMonitoring === 'function') {
        try {
            initPerformanceMonitoring();
        } catch (e) {
            console.warn('Performance monitoring failed to initialize:', e);
        }
    }
});

// Lazy load images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Preload critical assets
window.addEventListener('load', () => {
    const heroVideo = document.querySelector('.hero-video source');
    if (heroVideo) {
        const video = document.createElement('video');
        video.src = heroVideo.src;
        video.preload = 'auto';
    }
});
