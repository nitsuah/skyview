import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initSmoothScroll } from '../../scripts/smooth-scroll.js';

describe('smooth scroll', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <a href="#target" id="link">Link</a>
            <a href="#" id="dummy">Dummy</a>
            <div id="target" style="margin-top: 1000px">Target</div>
        `;

        // Mock scrollTo
        window.scrollTo = vi.fn();
        window.pageYOffset = 0;

        // Mock getBoundingClientRect
        Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({ top: 500 });
    });

    it('should scroll to target', () => {
        initSmoothScroll();
        const link = document.getElementById('link');

        link.click();

        expect(window.scrollTo).toHaveBeenCalledWith({
            top: 440, // 500 (pos) + 0 (pageY) - 60 (headerOffset)
            behavior: 'smooth'
        });
    });

    it('should ignore # links', () => {
        initSmoothScroll();
        const link = document.getElementById('dummy');

        link.click();
        expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it('should ignore if target missing', () => {
        document.body.innerHTML = '<a href="#missing" id="link">Link</a>';
        initSmoothScroll();

        document.getElementById('link').click();
        expect(window.scrollTo).not.toHaveBeenCalled();
    });
});
