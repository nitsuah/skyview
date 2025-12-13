/**
 * Fetches gallery data and renders it to the DOM.
 * @returns {Promise<void>}
 */
export async function loadGallery() {
    const galleryGrid = document.querySelector('.gallery-grid');
    if (!galleryGrid) return;

    // Read animation constants from CSS custom properties
    const computedStyles = getComputedStyle(galleryGrid);
    const ANIMATION_DURATION = computedStyles.getPropertyValue('--gallery-animation-duration').trim() || '0.5s';
    // Parse the delay to a number if used in a calculation, or handle string manipulation. 
    // The previous logic used `index * 0.1`. If the CSS val is '0.1s', parseFloat works.
    const staggerDelayVal = parseFloat(computedStyles.getPropertyValue('--gallery-animation-stagger-delay')) || 0.1;

    try {
        const response = await fetch('assets/gallery.json');
        if (!response.ok) throw new Error('Failed to load gallery manifest');

        const data = await response.json();
        const items = data.items || [];

        // Clear existing static items
        galleryGrid.innerHTML = '';

        items.forEach((item, index) => {
            const galleryItem = document.createElement('div');
            galleryItem.classList.add('gallery-item');
            galleryItem.dataset.index = index;
            galleryItem.dataset.category = item.category || 'all';

            // Fade in animation class (handled by CSS)
            galleryItem.style.opacity = '0';
            galleryItem.style.animation = `fadeInUp ${ANIMATION_DURATION} ease forwards ${index * staggerDelayVal}s`;

            const img = document.createElement('img');
            img.src = item.src;
            img.alt = item.alt;
            img.loading = 'lazy';

            const overlay = document.createElement('div');
            overlay.classList.add('gallery-overlay');
            overlay.innerHTML = '<span class="gallery-icon">+</span>';

            galleryItem.appendChild(img);
            galleryItem.appendChild(overlay);

            galleryGrid.appendChild(galleryItem);
        });

    } catch (error) {
        console.error('Error loading gallery:', error);
        galleryGrid.innerHTML = '<p class="error-message" role="alert" aria-live="polite">Unable to load gallery images at this time.</p>';
    }
}
