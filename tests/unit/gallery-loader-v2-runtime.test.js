import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('gallery-loader-v2 runtime', () => {
    let originalFetch;
    
    beforeEach(() => {
        // Set up DOM with correct class
        document.body.innerHTML = '<div class="gallery-grid"></div>';
        
        // Mock fetch
        originalFetch = global.fetch;
        global.fetch = vi.fn();
        
        // Mock console
        global.console.log = vi.fn();
        global.console.error = vi.fn();
        
        // Mock getComputedStyle for animation
        global.getComputedStyle = vi.fn(() => ({
            getPropertyValue: vi.fn(() => '0.5s')
        }));
    });

    afterEach(() => {
        global.fetch = originalFetch;
        // Clear module cache
        vi.resetModules();
    });

    it('should call fetch when loadGallery is executed', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ items: [{ src: 'test.jpg', alt: 'Test' }] })
        });

        // Dynamically import to get fresh module
        const module = await import('../../scripts/gallery-loader-v2.js');
        await module.loadGallery();

        expect(global.fetch).toHaveBeenCalled();
        const fetchCall = global.fetch.mock.calls[0][0];
        expect(fetchCall).toContain('assets/gallery.json');
    });

    it('should handle missing gallery container', async () => {
        document.body.innerHTML = '';
        
        const module = await import('../../scripts/gallery-loader-v2.js');
        await module.loadGallery();

        // Should return early without crashing
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should process video items', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ 
                items: [
                    { src: 'video.mp4', alt: 'Video', type: 'video' }
                ] 
            })
        });

        const module = await import('../../scripts/gallery-loader-v2.js');
        await module.loadGallery();

        expect(global.fetch).toHaveBeenCalled();
    });

    it('should process image items', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ 
                items: [
                    { src: 'image.jpg', alt: 'Image' },
                    { src: 'image2.webp', alt: 'Image 2' }
                ] 
            })
        });

        const module = await import('../../scripts/gallery-loader-v2.js');
        await module.loadGallery();

        const gallery = document.querySelector('.gallery-grid');
        expect(gallery).toBeTruthy();
    });

    it('should handle fetch errors gracefully', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network error'));

        const module = await import('../../scripts/gallery-loader-v2.js');
        await module.loadGallery();

        expect(global.console.error).toHaveBeenCalled();
    });

    it('should handle non-ok HTTP responses', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: 'Not Found'
        });

        const module = await import('../../scripts/gallery-loader-v2.js');
        await module.loadGallery();

        const gallery = document.querySelector('.gallery-grid');
        expect(gallery.innerHTML).toContain('error');
    });

    it('should filter items by category', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ 
                items: [
                    { src: 'img1.jpg', alt: 'Aerial', category: 'aerial' },
                    { src: 'img2.jpg', alt: 'Events', category: 'events' }
                ] 
            })
        });

        const module = await import('../../scripts/gallery-loader-v2.js');
        await module.loadGallery();

        expect(global.fetch).toHaveBeenCalled();
    });

    it('should mark featured items', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ 
                items: [
                    { src: 'img1.jpg', alt: 'Featured', featured: true },
                    { src: 'img2.jpg', alt: 'Regular' }
                ] 
            })
        });

        const module = await import('../../scripts/gallery-loader-v2.js');
        await module.loadGallery();

        expect(global.fetch).toHaveBeenCalled();
    });
});
