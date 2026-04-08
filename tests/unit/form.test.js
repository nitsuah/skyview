import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initFormHandling } from '../../scripts/form.js';

describe('form logic', () => {
    let form, submitBtn, submitText;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        document.body.innerHTML = `
            <div class="header" style="height: 50px;"></div>
            <button type="button" data-service-interest="mapping" data-service-label="3D Mapping & Inspections">Request mapping</button>
            <form id="contactForm">
                <input type="text" required value="Test lead" />
                <select name="project-type">
                    <option value="">Project Type</option>
                    <option value="real_estate">Real Estate & Commercial</option>
                    <option value="events" selected>Events & Festivals</option>
                    <option value="mapping">3D Mapping & Inspections</option>
                </select>
                <textarea placeholder="Tell us about your project"></textarea>
                <button class="submit-button">
                    <span class="submit-text">Submit</span>
                </button>
            </form>
        `;
        form = document.getElementById('contactForm');
        submitBtn = form.querySelector('.submit-button');
        submitText = form.querySelector('.submit-text');

        // Mock getComputedStyle for error color
        window.getComputedStyle = vi.fn().mockReturnValue({
            getPropertyValue: () => '#ff0000',
            height: '50px' // for header height check
        });

        // Mock getBoundingClientRect
        Element.prototype.getBoundingClientRect = vi.fn(() => ({ height: 50 }));
    });

    it('should handle submission state', async () => {
        vi.useFakeTimers();
        initFormHandling();

        // Trigger submit
        form.dispatchEvent(new Event('submit'));

        // Check loading state
        expect(submitBtn.disabled).toBe(true);
        expect(submitText.textContent).toBe('SENDING...');

        // Fast forward past the simulated delay (1500ms)
        await vi.advanceTimersByTimeAsync(1600);

        // Check success state
        expect(submitBtn.disabled).toBe(false);
        expect(submitText.textContent).toBe('Submit');

        // Check success message appeared
        const msg = document.querySelector('.form-message-success');
        expect(msg).toBeTruthy();
        expect(msg.textContent).toContain('Thank you');
    });

    it('should capture the selected project type in privacy-safe funnel data', async () => {
        vi.useFakeTimers();
        initFormHandling();
        form.querySelector('select').value = 'events';

        form.dispatchEvent(new Event('submit'));
        await vi.advanceTimersByTimeAsync(1600);

        expect(window.__SKYVIEW_CONVERSION_METRICS__.events[0]).toEqual(expect.objectContaining({
            name: 'contact_submit',
            source: 'contact_form',
            target: 'events'
        }));
    });

    it('should prefill the contact flow when a visitor picks a service card CTA', () => {
        initFormHandling();

        const serviceButton = document.querySelector('[data-service-interest="mapping"]');
        const projectSelect = form.querySelector('select');
        const detailsField = form.querySelector('textarea');

        serviceButton.click();

        expect(projectSelect.value).toBe('mapping');
        expect(detailsField.placeholder.toLowerCase()).toContain('mapping');
        expect(window.__SKYVIEW_CONVERSION_METRICS__.events[0]).toEqual(expect.objectContaining({
            name: 'service_interest',
            source: 'service_card',
            target: 'mapping'
        }));
    });

    it('should validate inputs on blur', () => {
        initFormHandling();
        const input = form.querySelector('input');

        // Blur with empty value
        input.value = '   ';
        input.dispatchEvent(new Event('blur'));

        // Should be red (error color mocked above as #ff0000)
        expect(input.style.borderColor).toBe('#ff0000');

        // Input something
        input.value = 'Valid';
        input.dispatchEvent(new Event('input')); // clears error
        expect(input.style.borderColor).toBe('');
    });

    it('should do nothing if form missing', () => {
        document.body.innerHTML = '';
        expect(() => initFormHandling()).not.toThrow();
    });
});
