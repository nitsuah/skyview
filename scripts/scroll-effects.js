// Scroll Effects Module
import { throttle } from './utils.js';

export function initScrollEffects() {
    const header = document.querySelector('.header');
    let lastScroll = 0;

    // Use throttle for better performance
    const throttledScroll = throttle(() => {
        const currentScroll = window.pageYOffset;

        // Add/remove header background on scroll
        if (currentScroll > 100) {
            header.style.background = 'rgba(26, 26, 26, 0.95)';
            header.style.boxShadow = '0 5px 20px rgba(0, 255, 255, 0.1)';
        } else {
            header.style.background = 'rgba(26, 26, 26, 0.4)';
            header.style.boxShadow = 'none';
        }

        // Hide/show header on scroll
        if (currentScroll > lastScroll && currentScroll > 500) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }

        lastScroll = currentScroll;

        // Animate elements on scroll
        animateOnScroll();
    }, 100);

    window.addEventListener('scroll', throttledScroll);
}

function animateOnScroll() {
    const elements = document.querySelectorAll('.service-card, .gallery-item, .preview-card, .contact-info, .contact-form');

    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementBottom = element.getBoundingClientRect().bottom;
        const windowHeight = window.innerHeight;

        if (elementTop < windowHeight * 0.85 && elementBottom > 0) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
}

// Initialize animation states
export function initAnimationStates() {
    const elements = document.querySelectorAll('.service-card, .gallery-item, .preview-card, .contact-info, .contact-form');
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
}
