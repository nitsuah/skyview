import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initGalleryLightbox } from '../../scripts/gallery.js';

describe('gallery lightbox', () => {
    let lightbox, closeBtn, prevBtn, nextBtn, counter, img;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="gallery-item">
                <img src="img1.jpg" alt="Img 1" />
            </div>
            <div class="gallery-item">
                <img src="img2.jpg" alt="Img 2" />
            </div>
            <div id="lightbox">
                <img class="lightbox-image" />
                <video class="lightbox-video"></video>
                <div class="lightbox-close"></div>
                <div class="lightbox-prev"></div>
                <div class="lightbox-next"></div>
                <div class="lightbox-counter"></div>
            </div>
        `;
        lightbox = document.getElementById('lightbox');
        closeBtn = lightbox.querySelector('.lightbox-close');
        prevBtn = lightbox.querySelector('.lightbox-prev');
        nextBtn = lightbox.querySelector('.lightbox-next');
        counter = lightbox.querySelector('.lightbox-counter');
        img = lightbox.querySelector('.lightbox-image');
    });

    it('should open lightbox on item click', () => {
        initGalleryLightbox();
        const items = document.querySelectorAll('.gallery-item');

        items[1].click(); // Click second item

        expect(lightbox.classList.contains('active')).toBe(true);
        expect(img.src).toContain('img2.jpg');
        expect(img.alt).toBe('Img 2');
        expect(counter.textContent).toBe('2 / 2');
        expect(document.body.style.overflow).toBe('hidden');
    });

    it('should close lightbox on close button click', () => {
        initGalleryLightbox();
        const item = document.querySelector('.gallery-item');
        item.click();

        closeBtn.click();
        expect(lightbox.classList.contains('active')).toBe(false);
        expect(document.body.style.overflow).toBe('');
    });

    it('should nav next', () => {
        initGalleryLightbox();
        document.querySelectorAll('.gallery-item')[0].click(); // Open 1st

        nextBtn.click();
        expect(img.src).toContain('img2.jpg');
        expect(counter.textContent).toBe('2 / 2');

        nextBtn.click(); // Wrap around to 1st
        expect(img.src).toContain('img1.jpg');
    });

    it('should nav prev', () => {
        initGalleryLightbox();
        document.querySelectorAll('.gallery-item')[0].click(); // Open 1st

        prevBtn.click(); // Wrap back to last (2nd)
        expect(img.src).toContain('img2.jpg');
        expect(counter.textContent).toBe('2 / 2');
    });

    it('should handle keyboard nav', () => {
        initGalleryLightbox();
        document.querySelectorAll('.gallery-item')[0].click();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        expect(img.src).toContain('img2.jpg');

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        expect(img.src).toContain('img1.jpg');

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(lightbox.classList.contains('active')).toBe(false);
    });

    it('should ignore keyboard if closed', () => {
        initGalleryLightbox();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        // Expect no errors, no state change (hard to test without spy, but checking if active class mysteriously appears)
        expect(lightbox.classList.contains('active')).toBe(false);
    });
});
