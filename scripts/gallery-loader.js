/**
 * Fetches gallery data and renders it to the DOM.
 * @returns {Promise<void>}
 */
export async function loadGallery() {
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
            galleryItem.style.animation = `fadeInUp 0.5s ease forwards ${index * 0.1}s`;

            galleryItem.innerHTML = `
                <img src="${item.src}" alt="${item.alt}" loading="lazy">
                <div class="gallery-overlay">
                    <span class="gallery-icon">+</span>
                </div>
            `;

            galleryGrid.appendChild(galleryItem);
        });

    } catch (error) {
        console.error('Error loading gallery:', error);
        galleryGrid.innerHTML = '<p class="error-message">Unable to load gallery images at this time.</p>';
    }
}
