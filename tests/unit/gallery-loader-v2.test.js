import { describe, it, expect } from 'vitest';

// Integration test - verifies the module can be imported
describe('gallery-loader-v2 module', () => {
    it('should export loadGallery function', async () => {
        const module = await import('../../scripts/gallery-loader-v2.js');
        expect(module).toBeDefined();
        expect(typeof module.loadGallery).toBe('function');
    });
});
