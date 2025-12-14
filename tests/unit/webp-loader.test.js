import { describe, it, expect } from 'vitest';
import { supportsWebP, createPictureElement } from '../../scripts/webp-loader.js';

describe('webp-loader', () => {
    describe('supportsWebP', () => {
        it('should detect WebP support', () => {
            const result = supportsWebP();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('createPictureElement', () => {
        it('should create picture element with img fallback', () => {
            const picture = createPictureElement({ basePath: 'test', alt: 'Test Image' });
            
            expect(picture.tagName).toBe('PICTURE');
            const img = picture.querySelector('img');
            expect(img).toBeTruthy();
            expect(img.alt).toBe('Test Image');
            expect(img.loading).toBe('lazy');
        });

        it('should handle custom className', () => {
            const picture = createPictureElement({ basePath: 'test', alt: 'Test', className: 'custom-class' });
            const img = picture.querySelector('img');
            expect(img.className).toContain('custom-class');
        });

        it('should create WebP source', () => {
            const picture = createPictureElement({ basePath: 'test', alt: 'Test' });
            const sources = picture.querySelectorAll('source');
            expect(sources.length).toBeGreaterThan(0);
        });
    });
});
