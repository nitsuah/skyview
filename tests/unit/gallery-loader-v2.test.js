import { describe, it, expect, vi } from 'vitest';

// Test the internal functions directly by reading the module
describe('gallery-loader-v2 module', () => {
    it('should be importable', async () => {
        const module = await import('../../scripts/gallery-loader-v2.js');
        expect(module).toBeDefined();
        expect(typeof module.loadGallery).toBe('function');
    });

    it('should load gallery items with videos', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                items: [
                    { src: 'test1.mp4', alt: 'Video 1', type: 'video' },
                    { src: 'test2.jpg', alt: 'Image 1' }
                ]
            })
        });

        await loadGallery();

        const items = container.querySelectorAll('.gallery-item');
        expect(items.length).toBe(2);
        
        const video = container.querySelector('video');
        expect(video).toBeTruthy();
        expect(video.src).toContain('test1.mp4');
    });

    it('should handle featured items', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                items: [
                    { src: 'test1.jpg', alt: 'Test 1', featured: true },
                    { src: 'test2.jpg', alt: 'Test 2' }
                ]
            })
        });

        await loadGallery();

        const featuredItem = container.querySelector('.gallery-item.featured');
        expect(featuredItem).toBeTruthy();
    });

    it('should filter by category', async () => {
        container.dataset.category = 'aerial';
        
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                items: [
                    { src: 'test1.jpg', alt: 'Test 1', category: 'aerial' },
                    { src: 'test2.jpg', alt: 'Test 2', category: 'events' }
                ]
            })
        });

        await loadGallery();

        const items = container.querySelectorAll('.gallery-item');
        expect(items.length).toBe(1);
    });

    it('should handle fetch errors', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network error'));

        await loadGallery();

        expect(console.error).toHaveBeenCalled();
        expect(container.innerHTML).toContain('error');
    });

    it('should handle non-ok response', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 404
        });

        await loadGallery();

        expect(container.innerHTML).toContain('error');
    });

    it('should add loading class during fetch', async () => {
        global.fetch.mockImplementationOnce(() => {
            expect(container.classList.contains('loading')).toBe(true);
            return Promise.resolve({
                ok: true,
                json: async () => ({ items: [] })
            });
        });

        await loadGallery();
        
        expect(container.classList.contains('loading')).toBe(false);
    });

    it('should detect video files by extension', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                items: [
                    { src: 'test.mp4', alt: 'MP4' },
                    { src: 'test.mov', alt: 'MOV' },
                    { src: 'test.webm', alt: 'WEBM' }
                ]
            })
        });

        await loadGallery();

        const videos = container.querySelectorAll('video');
        expect(videos.length).toBe(3);
    });

    it('should add poster to videos', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                items: [
                    { src: 'test-video.mp4', alt: 'Test Video', type: 'video' }
                ]
            })
        });

        await loadGallery();

        const video = container.querySelector('video');
        expect(video.poster).toContain('test-video.jpg');
    });

    it('should create picture elements for images', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                items: [
                    { src: 'test.jpg', alt: 'Test Image' }
                ]
            })
        });

        await loadGallery();

        const picture = container.querySelector('picture');
        expect(picture).toBeTruthy();
        expect(picture.querySelector('img')).toBeTruthy();
    });

    it('should use cache version parameter', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ items: [] })
        });

        await loadGallery();

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('?v=')
        );
    });
});
