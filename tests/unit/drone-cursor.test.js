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

    it('renders a transparent beam from the drone to the pointer, offset up-and-right', async () => {
        const { initDroneCursor } = await import('../../scripts/drone-cursor.js');

        initDroneCursor();

        window.dispatchEvent(new MouseEvent('pointermove', {
            clientX: 300,
            clientY: 300
        }));

        const beam = document.querySelector('.cursor-drone__beam');
        expect(beam).toBeTruthy();
        expect(beam.classList.contains('is-visible')).toBe(true);
        // Beam should stretch from the drone toward the pointer.
        expect(parseFloat(beam.style.width)).toBeGreaterThan(0);
        expect(beam.style.transform).toContain('rotate(');
    });
});
