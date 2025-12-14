import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadImageWithFallback, updateGalleryWithWebP, preloadImages } from '../../scripts/webp-loader.js';

describe('webp-loader advanced', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loadImageWithFallback', () => {
        it('should return path with jpg extension', async () => {
            // Mock Image to fail loading
            const originalImage = global.Image;
            global.Image = vi.fn().mockImplementation(function() {
                this.onerror = null;
                this.onload = null;
                setTimeout(() => this.onerror?.(), 0);
                return this;
            });

            const result = await loadImageWithFallback('test-image');
            expect(result).toContain('.jpg');
            
            global.Image = originalImage;
        });
    });

    describe('preloadImages', () => {
        it('should preload multiple images', async () => {
            const originalImage = global.Image;
            global.Image = vi.fn().mockImplementation(function() {
                this.onerror = null;
                this.onload = null;
                setTimeout(() => this.onerror?.(), 0);
                return this;
            });

            const paths = ['img1', 'img2', 'img3'];
            const results = await preloadImages(paths);
            
            expect(results.length).toBe(3);
            
            global.Image = originalImage;
        });
    });

    describe('updateGalleryWithWebP', () => {
        it('should update gallery items with webp paths', async () => {
            const originalImage = global.Image;
            global.Image = vi.fn().mockImplementation(function() {
                this.onerror = null;
                this.onload = null;
                setTimeout(() => this.onerror?.(), 0);
                return this;
            });

            const items = [
                { src: 'img1.jpg', alt: 'Image 1' },
                { src: 'img2.jpg', alt: 'Image 2' }
            ];
            
            const results = await updateGalleryWithWebP(items);
            
            expect(results.length).toBe(2);
            expect(results[0]).toHaveProperty('webpSrc');
            expect(results[0]).toHaveProperty('fallbackSrc');
            
            global.Image = originalImage;
        });
    });
});
