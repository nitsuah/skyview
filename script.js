// ===================================
// SKYVIEW DYNAMICS - INTERACTIVE FEATURES
// ===================================

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initSmoothScroll();
    initGalleryLightbox();
    initFormHandling();
    initScrollEffects();
    initParallax();
});

// ===================================
// MOBILE MENU
// ===================================

function initMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const links = document.querySelectorAll('.nav-links a');

    if (!menuToggle || !navLinks) return;

    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu when clicking on a link
    links.forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
            menuToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// ===================================
// SMOOTH SCROLLING
// ===================================

function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            // Skip if it's just "#"
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ===================================
// GALLERY LIGHTBOX
// ===================================

function initGalleryLightbox() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = lightbox.querySelector('.lightbox-image');
    const lightboxClose = lightbox.querySelector('.lightbox-close');
    const lightboxPrev = lightbox.querySelector('.lightbox-prev');
    const lightboxNext = lightbox.querySelector('.lightbox-next');
    const lightboxCounter = lightbox.querySelector('.lightbox-counter');

    let currentIndex = 0;
    const images = Array.from(galleryItems).map(item => ({
        src: item.querySelector('img').src,
        alt: item.querySelector('img').alt
    }));

    // Open lightbox
    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            currentIndex = index;
            openLightbox();
        });
    });

    // Close lightbox
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Navigation
    lightboxPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        showPrevImage();
    });

    lightboxNext.addEventListener('click', (e) => {
        e.stopPropagation();
        showNextImage();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;

        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPrevImage();
        if (e.key === 'ArrowRight') showNextImage();
    });

    function openLightbox() {
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateLightboxImage();
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function showPrevImage() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        updateLightboxImage();
    }

    function showNextImage() {
        currentIndex = (currentIndex + 1) % images.length;
        updateLightboxImage();
    }

    function updateLightboxImage() {
        const image = images[currentIndex];
        lightboxImage.src = image.src;
        lightboxImage.alt = image.alt;
        lightboxCounter.textContent = `${currentIndex + 1} / ${images.length}`;
    }
}

// ===================================
// FORM HANDLING
// ===================================

function initFormHandling() {
    const form = document.getElementById('contactForm');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitButton = form.querySelector('.submit-button');
        const originalText = submitButton.querySelector('.submit-text').textContent;

        // Disable button and show loading state
        submitButton.disabled = true;
        submitButton.querySelector('.submit-text').textContent = 'SENDING...';

        try {
            // If using Formspree or similar service, the form will handle submission
            // For now, we'll simulate a successful submission
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Show success message
            showFormMessage('success', 'Thank you! Your message has been sent successfully.');
            form.reset();
        } catch (error) {
            // Show error message
            showFormMessage('error', 'Oops! Something went wrong. Please try again.');
        } finally {
            // Re-enable button
            submitButton.disabled = false;
            submitButton.querySelector('.submit-text').textContent = originalText;
        }
    });

    // Form validation with visual feedback
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            if (input.value.trim() === '' && input.hasAttribute('required')) {
                input.style.borderColor = '#ff4444';
            } else {
                input.style.borderColor = '';
            }
        });

        input.addEventListener('input', () => {
            input.style.borderColor = '';
        });
    });
}

function showFormMessage(type, message) {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `form-message form-message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)'};
        border: 2px solid ${type === 'success' ? '#00ff00' : '#ff0000'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        font-weight: 600;
        z-index: 3000;
        animation: slideDown 0.3s ease;
        backdrop-filter: blur(10px);
    `;

    document.body.appendChild(messageEl);

    // Remove after 5 seconds
    setTimeout(() => {
        messageEl.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => messageEl.remove(), 300);
    }, 5000);
}

// ===================================
// SCROLL EFFECTS
// ===================================

function initScrollEffects() {
    const header = document.querySelector('.header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
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
document.addEventListener('DOMContentLoaded', () => {
    const elements = document.querySelectorAll('.service-card, .gallery-item, .preview-card, .contact-info, .contact-form');
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
});

// ===================================
// PARALLAX EFFECT
// ===================================

function initParallax() {
    const heroImage = document.querySelector('.hero-image');
    const heroVideo = document.querySelector('.hero-video');

    if (!heroImage && !heroVideo) return;

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxSpeed = 0.5;

        if (heroImage) {
            heroImage.style.transform = `translate(-50%, -${50 + scrolled * parallaxSpeed * 0.05}%)`;
        }
        if (heroVideo) {
            heroVideo.style.transform = `translate(-50%, -${50 + scrolled * parallaxSpeed * 0.05}%)`;
        }
    });
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }

    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

// ===================================
// PERFORMANCE OPTIMIZATION
// ===================================

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
    // Preload hero video if it exists
    const heroVideo = document.querySelector('.hero-video source');
    if (heroVideo) {
        const video = document.createElement('video');
        video.src = heroVideo.src;
        video.preload = 'auto';
    }
});

console.log('🚁 SkyView Dynamics - Website Initialized');
