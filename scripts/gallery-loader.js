/**
 * Fetches gallery data and renders it to the DOM.
 * @returns {Promise<void>}
 */
export async function loadGallery() {
    const ANIMATION_DURATION = '0.5s';
    const ANIMATION_STAGGER_DELAY = 0.1;
    const galleryGrid = document.querySelector('.gallery-grid');
    if (!galleryGrid) return;

    try {
        const response = await fetch('assets/gallery.json');
        if (!response.ok) throw new Error('Failed to load gallery manifest');

        const data = await response.json();
        const items = data.items || [];

        // Clear existing static items (if any, though we will remove them from HTML)
        galleryGrid.innerHTML = '';

        items.forEach((item, index) => {
            const galleryItem = document.createElement('div');
            galleryItem.classList.add('gallery-item');
            galleryItem.dataset.index = index;
            galleryItem.dataset.category = item.category || 'all';

            // Fade in animation class (handled by CSS)
            galleryItem.style.opacity = '0';
            galleryItem.style.animation = `fadeInUp ${ANIMATION_DURATION} ease forwards ${index * ANIMATION_STAGGER_DELAY}s`;

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
        galleryGrid.innerHTML = '<p class="error-message">Unable to load gallery images at this time.</p>';
    }
}
