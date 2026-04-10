import { beforeEach, describe, expect, it } from 'vitest';

describe('interactive polish', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <a class="cta-button" href="#booking">Book</a>
            <div class="service-card"></div>
            <div class="gallery-item"></div>
        `;
    });

    it('adds magnetic hover transforms and resets them on leave', async () => {
        const { initInteractivePolish } = await import('../../scripts/interactive-polish.js');

        initInteractivePolish();

        const card = document.querySelector('.service-card');
        card.dispatchEvent(new MouseEvent('pointermove', {
            bubbles: true,
            clientX: 120,
            clientY: 70
        }));

        expect(card.style.transform).toContain('rotateX');

        card.dispatchEvent(new MouseEvent('pointerleave', { bubbles: true }));
        expect(card.style.transform).toBe('');
    });
});
