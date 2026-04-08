function supportsFinePointer() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return true;
    }

    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
        window.matchMedia('(pointer: fine)').matches;
}

function applyInteractiveTransform(element, event) {
    const rect = element.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const offsetX = (x / width) - 0.5;
    const offsetY = (y / height) - 0.5;

    element.style.setProperty('--glow-x', `${x.toFixed(1)}px`);
    element.style.setProperty('--glow-y', `${y.toFixed(1)}px`);

    if (element.classList.contains('cta-button')) {
        element.style.transform = `translate3d(${(offsetX * 8).toFixed(2)}px, ${(offsetY * 8).toFixed(2)}px, 0)`;
        return;
    }

    const rotateX = (offsetY * -8).toFixed(2);
    const rotateY = (offsetX * 10).toFixed(2);
    const lift = element.classList.contains('gallery-item') ? -8 : -10;

    element.style.transform = `perspective(900px) translate3d(0, ${lift}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}

function resetInteractiveTransform(element) {
    element.style.transform = '';
}

export function initInteractivePolish() {
    if (!supportsFinePointer()) {
        return [];
    }

    const interactiveElements = document.querySelectorAll(
        '.cta-button, .service-card, .gallery-item, .preview-card, .contact-info, .contact-form'
    );

    interactiveElements.forEach((element) => {
        if (element.dataset.interactiveReady === 'true') {
            return;
        }

        element.dataset.interactiveReady = 'true';
        element.addEventListener('pointermove', (event) => applyInteractiveTransform(element, event));
        element.addEventListener('pointerleave', () => resetInteractiveTransform(element));
        element.addEventListener('blur', () => resetInteractiveTransform(element));
    });

    return [...interactiveElements];
}
