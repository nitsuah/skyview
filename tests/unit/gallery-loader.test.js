import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadGallery } from '../../scripts/gallery-loader.js';

describe('loadGallery', () => {
    let galleryGrid;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '<div class="gallery-grid"></div>';
        galleryGrid = document.querySelector('.gallery-grid');

        // Mock getComputedStyle
        window.getComputedStyle = vi.fn().mockReturnValue({
            getPropertyValue: vi.fn((prop) => {
                if (prop === '--gallery-animation-duration') return '0.5s';
                if (prop === '--gallery-animation-stagger-delay') return '0.1s';
                return '';
            })
        });

        // Mock global fetch
        global.fetch = vi.fn();
    });

    it('should load gallery items successfully', async () => {
        const mockData = {
            items: [
                { src: 'test1.jpg', alt: 'Test 1', category: 'cat1' },
                { src: 'test2.jpg', alt: 'Test 2', category: 'cat2' }
            ]
        };

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockData
        });

        await loadGallery();

        const items = galleryGrid.querySelectorAll('.gallery-item');
        expect(items.length).toBe(2);
        expect(items[0].dataset.category).toBe('cat1');
        expect(items[0].querySelector('img').src).toContain('test1.jpg');
        expect(items[0].querySelector('img').alt).toBe('Test 1');
    });

    it('should handle default category if missing', async () => {
        const mockData = { items: [{ src: 'test.jpg' }] };

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockData
        });

        await loadGallery();

        const item = galleryGrid.querySelector('.gallery-item');
        expect(item.dataset.category).toBe('all');
    });

    it('should display error message on fetch failure', async () => {
        global.fetch.mockRejectedValue(new Error('Network error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        await loadGallery();

        expect(galleryGrid.innerHTML).toContain('Unable to load gallery images');
        consoleSpy.mockRestore();
    });

    it('should display error message on non-ok response', async () => {
        global.fetch.mockResolvedValue({ ok: false });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        await loadGallery();

        expect(galleryGrid.innerHTML).toContain('Unable to load gallery images');
        consoleSpy.mockRestore();
    });

    it('should do nothing if gallery-grid is missing', async () => {
        document.body.innerHTML = ''; // Remove grid
        const result = await loadGallery();
        expect(result).toBeUndefined();
    });
});
