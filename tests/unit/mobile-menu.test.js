import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initMobileMenu } from '../../scripts/mobile-menu.js';

describe('mobile-menu', () => {
    let menuToggle, navLinks;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="mobile-menu-toggle">Toggle</div>
            <nav class="nav-links">
                <a href="#home">Home</a>
                <a href="#about">About</a>
            </nav>
        `;
        menuToggle = document.querySelector('.mobile-menu-toggle');
        navLinks = document.querySelector('.nav-links');

        // Mock getComputedStyle for any layout checks if needed
        window.getComputedStyle = vi.fn().mockReturnValue({ display: 'block' });
    });

    it('should toggle active classes on click', () => {
        initMobileMenu();

        menuToggle.click();
        expect(menuToggle.classList.contains('active')).toBe(true);
        expect(navLinks.classList.contains('active')).toBe(true);
        expect(document.body.style.overflow).toBe('hidden');

        menuToggle.click();
        expect(menuToggle.classList.contains('active')).toBe(false);
        expect(navLinks.classList.contains('active')).toBe(false);
        expect(document.body.style.overflow).toBe('');
    });

    it('should close menu when clicking a link', () => {
        initMobileMenu();
        const link = navLinks.querySelector('a');

        // Open menu first
        menuToggle.click();

        link.click();
        expect(menuToggle.classList.contains('active')).toBe(false);
        expect(navLinks.classList.contains('active')).toBe(false);
    });

    it('should close menu when clicking outside', () => {
        initMobileMenu();

        // Open menu
        menuToggle.click();

        // Click outside (e.g., body)
        document.body.click();

        expect(menuToggle.classList.contains('active')).toBe(false);
        expect(navLinks.classList.contains('active')).toBe(false);
    });

    it('should not close menu when clicking inside nav', () => {
        initMobileMenu();

        // Open menu
        menuToggle.click();

        // Click inside nav
        navLinks.click();

        expect(navLinks.classList.contains('active')).toBe(true);
    });

    it('should do nothing if elements are missing', () => {
        document.body.innerHTML = '';
        // Should not throw
        expect(() => initMobileMenu()).not.toThrow();
    });
});
