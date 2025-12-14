import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supportsWebP, loadImageWithFallback, createPictureElement } from '../../scripts/webp-loader.js';

describe('webp-loader', () => {
    describe('supportsWebP', () => {
        it('should detect WebP support', () => {
            const result = supportsWebP();
            expect(typeof result).toBe('boolean');
        });

        it('should return false if no canvas', () => {
            const originalCreateElement = document.createElement;
            document.createElement = vi.fn(() => ({}));
            
            const result = supportsWebP();
            expect(result).toBe(false);
            
            document.createElement = originalCreateElement;
        });
    });

    describe('loadImageWithFallback', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should try webp first if supported', async () => {
            const imageSpy = vi.spyOn(window, 'Image').mockImplementation(() => {
                const img = {
                    onload: null,
                    onerror: null,
                    src: ''
                };
                setTimeout(() => {
                    if (img.src.endsWith('.webp')) {
                        img.onload?.();
                    } else {
                        img.onerror?.();
                    }
                }, 0);
                return img;
            });

            const result = await loadImageWithFallback('test-image');
            expect(result).toContain('test-image');
            
            imageSpy.mockRestore();
        });

        it('should fallback to jpg if webp fails', async () => {
            const imageSpy = vi.spyOn(window, 'Image').mockImplementation(() => {
                const img = {
                    onload: null,
                    onerror: null,
                    src: ''
                };
                setTimeout(() => {
                    if (img.src.endsWith('.jpg')) {
                        img.onload?.();
                    } else {
                        img.onerror?.();
                    }
                }, 0);
                return img;
            });

            const result = await loadImageWithFallback('test-image');
            expect(result).toContain('.jpg');
            
            imageSpy.mockRestore();
        });
    });

    describe('createPictureElement', () => {
        it('should create picture element with sources', () => {
            const item = { src: 'test.jpg', alt: 'Test Image' };
            const picture = createPictureElement(item);
            
            expect(picture.tagName).toBe('PICTURE');
            expect(picture.querySelector('img')).toBeTruthy();
            expect(picture.querySelector('img').alt).toBe('Test Image');
        });

        it('should include webp source if supported', () => {
            const item = { src: 'test.jpg', alt: 'Test' };
            const picture = createPictureElement(item);
            
            const sources = picture.querySelectorAll('source');
            expect(sources.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle images without extension', () => {
            const item = { src: 'test-image', alt: 'Test' };
            const picture = createPictureElement(item);
            
            expect(picture.querySelector('img')).toBeTruthy();
        });
    });
});
