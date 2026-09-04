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

        const pointerX = 300;
        const pointerY = 300;
        window.dispatchEvent(new MouseEvent('pointermove', {
            clientX: pointerX,
            clientY: pointerY
        }));

        const beam = document.querySelector('.cursor-drone__beam');
        expect(beam).toBeTruthy();
        expect(beam.classList.contains('is-visible')).toBe(true);

        // The rAF mock runs synchronously and recursively until the easing
        // loop converges (within 0.3px), so the drone settles near its target.
        // Compute the expected beam geometry from the same constants, allowing
        // a small tolerance for the convergence threshold.
        const DRONE_OFFSET_X = 52;
        const DRONE_OFFSET_Y = -46;
        const DRONE_CENTER_X = 28;
        const DRONE_CENTER_Y = 21;

        const droneCenterX = pointerX + DRONE_OFFSET_X + DRONE_CENTER_X;
        const droneCenterY = pointerY + DRONE_OFFSET_Y + DRONE_CENTER_Y;
        const beamDx = pointerX - droneCenterX;
        const beamDy = pointerY - droneCenterY;
        const expectedLength = Math.hypot(beamDx, beamDy);
        const expectedAngle = Math.atan2(beamDy, beamDx) * (180 / Math.PI);

        expect(parseFloat(beam.style.width)).toBeCloseTo(expectedLength, 0);

        const actualAngle = parseFloat(beam.style.transform.match(/rotate\(([-\d.]+)deg\)/)[1]);
        expect(actualAngle).toBeCloseTo(expectedAngle, 0);
    });
});
