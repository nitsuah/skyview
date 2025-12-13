/**
 * Check if browser supports WebP images
 * @returns {boolean}
 */
function supportsWebP() {
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
}

/**
 * Check if the item is a video based on file extension or type property
 * @param {Object} item - Gallery item
 * @returns {boolean}
 */
function isVideo(item) {
    return item.type === 'video' || /\.(mp4|mov|webm|ogg)$/i.test(item.src);
}

/**
 * Create video element for video files
 * @param {Object} item - Gallery item with src, alt properties
 * @returns {HTMLVideoElement}
 */
function createVideoElement(item) {
    const video = document.createElement('video');
    video.src = item.src;
    video.alt = item.alt;
    video.title = item.alt;
    video.controls = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.loading = 'lazy';
    
    // Add poster image if available (same name as video, but .jpg)
    const posterPath = item.src.replace(/\.(mp4|mov|webm|ogg)$/i, '.jpg');
    if (posterPath !== item.src) {
        video.poster = posterPath;
    }
    
    return video;
}

/**
 * Create picture element with WebP and fallback sources
 * @param {Object} item - Gallery item with src, alt properties
 * @returns {HTMLPictureElement}
 */
function createPictureElement(item) {
    const picture = document.createElement('picture');
    
    // Safety check: don't process video files
    if (isVideo(item)) {
        console.warn('Attempted to create picture element for video:', item.src);
        const img = document.createElement('img');
        img.src = item.src;
        img.alt = item.alt;
        picture.appendChild(img);
        return picture;
    }
    
    // Remove extension from src to get base path
    const basePath = item.src.replace(/\.(jpg|jpeg|png|webp)$/i, '');
    
    // WebP source (if supported)
    const webpSource = document.createElement('source');
    webpSource.srcset = `${basePath}.webp`;
    webpSource.type = 'image/webp';
    picture.appendChild(webpSource);
    
    // JPEG/PNG fallback source
    const fallbackExt = item.src.match(/\.(jpg|jpeg|png)$/i)?.[1] || 'jpg';
    const fallbackSource = document.createElement('source');
    fallbackSource.srcset = `${basePath}.${fallbackExt}`;
    fallbackSource.type = `image/${fallbackExt === 'jpg' ? 'jpeg' : fallbackExt}`;
    picture.appendChild(fallbackSource);
    
    // IMG fallback for older browsers
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.alt;
    img.loading = 'lazy';
    picture.appendChild(img);
    
    return picture;
}

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

    // Log WebP support
    const hasWebP = supportsWebP();
    console.log(`🖼️ WebP Support: ${hasWebP ? '✅ Enabled' : '❌ Using fallback'}`);

    try {
        // Add cache busting to ensure fresh gallery data
        const cacheBuster = new Date().getTime();
        const url = `assets/gallery.json?v=${cacheBuster}`;
        console.log(`📥 Fetching gallery from: ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load gallery manifest');

        const data = await response.json();
        const items = data.items || [];
        console.log(`📸 Loaded ${items.length} gallery items:`, items.map(i => i.src));

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

            // Use video element for videos, picture element for images
            const itemIsVideo = isVideo(item);
            console.log(`Processing item ${index}: ${item.src} - ${itemIsVideo ? '🎬 VIDEO' : '🖼️ IMAGE'}`);
            const mediaElement = itemIsVideo ? createVideoElement(item) : createPictureElement(item);

            const overlay = document.createElement('div');
            overlay.classList.add('gallery-overlay');
            overlay.innerHTML = '<span class="gallery-icon">+</span>';

            galleryItem.appendChild(mediaElement);
            galleryItem.appendChild(overlay);

            galleryGrid.appendChild(galleryItem);
        });

    } catch (error) {
        console.error('Error loading gallery:', error);
        galleryGrid.innerHTML = '<p class="error-message" role="alert" aria-live="polite">Unable to load gallery images at this time.</p>';
    }
}
