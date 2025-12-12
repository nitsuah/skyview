// Parallax Effect Module
import { throttle } from './utils.js';

export function initParallax() {
    const heroVideo = document.querySelector('.hero-video');

    if (!heroVideo) return;

    // Named constants for clarity
    const BASE_OFFSET = 50;
    const PARALLAX_SPEED = 0.3;
    const PARALLAX_MULTIPLIER = 0.05;

    // Use throttle for better performance
    const throttledParallax = throttle(() => {
        const scrolled = window.pageYOffset;

        // Only apply parallax to video, not the background image
        // Background image uses CSS background-attachment: fixed for better performance
        if (heroVideo) {
            heroVideo.style.transform = `translate(-50%, -${BASE_OFFSET + scrolled * PARALLAX_SPEED * PARALLAX_MULTIPLIER}%)`;
        }
    }, 16); // ~60fps

    window.addEventListener('scroll', throttledParallax);
}
