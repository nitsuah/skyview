// Scroll Effects Module
import { throttle } from './utils.js';

export function initScrollEffects() {
    const header = document.querySelector('.header');
    if (!header) return;

    const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
    const trackedSections = navLinks
        .map((link) => ({
            link,
            section: document.querySelector(link.getAttribute('href'))
        }))
        .filter((entry) => entry.section);

    let lastScroll = 0;

    // Use throttle for better performance
    const throttledScroll = throttle(() => {
        const currentScroll = window.pageYOffset;

        // Add/remove header background on scroll
        if (currentScroll > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Hide/show header on scroll
        if (currentScroll > lastScroll && currentScroll > 500) {
            header.classList.add('header-hidden');
        } else {
            header.classList.remove('header-hidden');
        }

        updateActiveNavLink(trackedSections);
        lastScroll = currentScroll;

        // Animate elements on scroll
        animateOnScroll();
    }, 100);

    window.addEventListener('scroll', throttledScroll);
    updateActiveNavLink(trackedSections);
    animateOnScroll();
}

function updateActiveNavLink(trackedSections) {
    if (!trackedSections.length) return;

    const activationPoint = window.innerHeight * 0.35;
    let activeEntry = trackedSections[0];

    trackedSections.forEach((entry) => {
        const rect = entry.section.getBoundingClientRect();
        if (rect.top <= activationPoint && rect.bottom >= activationPoint) {
            activeEntry = entry;
        }
    });

    trackedSections.forEach((entry) => {
        const isActive = entry === activeEntry;
        entry.link.classList.toggle('is-active', isActive);
        if (isActive) {
            entry.link.setAttribute('aria-current', 'page');
        } else {
            entry.link.removeAttribute('aria-current');
        }
    });
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

    // Immediately show elements that are already in viewport
    setTimeout(() => animateOnScroll(), 100);
}
