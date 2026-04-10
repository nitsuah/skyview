import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('drone cursor', () => {
    beforeEach(() => {
        document.body.innerHTML = '<main><section class="hero"></section></main>';

        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            writable: true,
            value: vi.fn().mockImplementation((query) => ({
                matches: false,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            }))
        });

        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
            callback();
            return 1;
        });
    });

    it('adds a mini drone cursor and follows pointer movement', async () => {
        const { initDroneCursor } = await import('../../scripts/drone-cursor.js');

        initDroneCursor();

        const drone = document.querySelector('.cursor-drone');
        expect(drone).toBeTruthy();

        window.dispatchEvent(new MouseEvent('pointermove', {
            clientX: 140,
            clientY: 180
        }));

        expect(drone.style.transform).toContain('translate3d');
    });
});
