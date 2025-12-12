// Form Handling Module
export function initFormHandling() {
    const form = document.getElementById('contactForm');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitButton = form.querySelector('.submit-button');
        const originalText = submitButton.querySelector('.submit-text').textContent;

        // Disable button and show loading state
        submitButton.disabled = true;
        submitButton.querySelector('.submit-text').textContent = 'SENDING...';

        try {
            // If using Formspree or similar service, the form will handle submission
            // For now, we'll simulate a successful submission
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Show success message
            showFormMessage('success', 'Thank you! Your message has been sent successfully.');
            form.reset();
        } catch (error) {
            // Show error message
            showFormMessage('error', 'Oops! Something went wrong. Please try again.');
        } finally {
            // Re-enable button
            submitButton.disabled = false;
            submitButton.querySelector('.submit-text').textContent = originalText;
        }
    });

    // Form validation with visual feedback
    const inputs = form.querySelectorAll('input, select, textarea');
    const errorColor = getComputedStyle(document.documentElement).getPropertyValue('--color-error') || '#ff4444';

    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            if (input.value.trim() === '' && input.hasAttribute('required')) {
                input.style.borderColor = errorColor;
            } else {
                input.style.borderColor = '';
            }
        });

        input.addEventListener('input', () => {
            input.style.borderColor = '';
        });
    });
}

function showFormMessage(type, message) {
    const messageEl = document.createElement('div');
    messageEl.className = `form-message form-message-${type}`;
    messageEl.textContent = message;

    // Dynamically calculate top offset based on header height
    const header = document.querySelector('.header');
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const topOffset = headerHeight + 20;

    messageEl.style.cssText = `
        position: fixed;
        top: ${topOffset}px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)'};
        border: 2px solid ${type === 'success' ? '#00ff00' : '#ff0000'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        font-weight: 600;
        z-index: 3000;
        animation: slideDown 0.3s ease;
        backdrop-filter: blur(10px);
    `;

    document.body.appendChild(messageEl);

    // Remove after 5 seconds
    setTimeout(() => {
        messageEl.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => messageEl.remove(), 300);
    }, 5000);
}
