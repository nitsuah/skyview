// Main Entry Point - SkyView Dynamics
import { initMobileMenu } from './mobile-menu.js';
import { initSmoothScroll } from './smooth-scroll.js';
import { initGalleryLightbox } from './gallery.js';
import { initFormHandling } from './form.js';
import { initScrollEffects, initAnimationStates } from './scroll-effects.js';
import { initParallax } from './parallax.js';

// Initialize all modules when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initSmoothScroll();
    initGalleryLightbox();
    initFormHandling();
    initScrollEffects();
    initParallax();
    initAnimationStates();

    console.log('🚁 SkyView Dynamics - Website Initialized');
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
