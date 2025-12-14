/**
 * WebP Image Loader with Automatic Fallback
 * 
 * This utility checks if WebP version exists, otherwise falls back to JPG/PNG
 * Usage: const img = await loadImage('assets/gallery/sunset-marina');
 */

/**
 * Check if WebP is supported in the current browser
 */
export function supportsWebP() {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
}

/**
 * Load image with WebP fallback
 * @param {string} basePath - Path without extension (e.g., 'assets/gallery/image1')
 * @returns {Promise<string>} - Full path to the image that loaded successfully
 */
export async function loadImageWithFallback(basePath) {
    const extensions = supportsWebP() ? ['.webp', '.jpg', '.jpeg', '.png'] : ['.jpg', '.jpeg', '.png', '.webp'];
    
    for (const ext of extensions) {
        const imagePath = basePath + ext;
        if (await imageExists(imagePath)) {
            return imagePath;
        }
    }
    
    // If no image found, return original path with .jpg
    console.warn(`No image found for: ${basePath}`);
    return basePath + '.jpg';
}

/**
 * Check if an image exists and can be loaded
 * @param {string} url - Image URL to check
 * @returns {Promise<boolean>}
 */
function imageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

/**
 * Preload images for better performance
 * @param {Array<string>} basePaths - Array of image paths without extensions
 * @returns {Promise<Array<string>>} - Array of loaded image paths
 */
export async function preloadImages(basePaths) {
    const promises = basePaths.map(path => loadImageWithFallback(path));
    return Promise.all(promises);
}

/**
 * Create picture element with WebP and fallback sources
 * @param {Object} options - Image options
 * @returns {HTMLPictureElement}
 */
export function createPictureElement({ basePath, alt, className = '', sizes = '100vw' }) {
    const picture = document.createElement('picture');
    
    // WebP source
    const webpSource = document.createElement('source');
    webpSource.srcset = `${basePath}.webp`;
    webpSource.type = 'image/webp';
    webpSource.sizes = sizes;
    picture.appendChild(webpSource);
    
    // JPEG fallback source
    const jpegSource = document.createElement('source');
    jpegSource.srcset = `${basePath}.jpg`;
    jpegSource.type = 'image/jpeg';
    jpegSource.sizes = sizes;
    picture.appendChild(jpegSource);
    
    // IMG fallback
    const img = document.createElement('img');
    img.src = `${basePath}.jpg`;
    img.alt = alt;
    img.className = className;
    img.loading = 'lazy';
    picture.appendChild(img);
    
    return picture;
}

/**
 * Update gallery items to use WebP with fallback
 * @param {Array} galleryItems - Array of gallery item objects
 * @returns {Array} - Updated gallery items with proper image paths
 */
export async function updateGalleryWithWebP(galleryItems) {
    const updatedItems = await Promise.all(
        galleryItems.map(async (item) => {
            // Remove extension if present
            const basePath = item.src.replace(/\.(jpg|jpeg|png|webp)$/i, '');
            const actualPath = await loadImageWithFallback(basePath);
            
            return {
                ...item,
                src: actualPath,
                webpSrc: basePath + '.webp',
                fallbackSrc: basePath + '.jpg'
            };
        })
    );
    
    return updatedItems;
}

// Log WebP support on load
if (typeof window !== 'undefined') {
    console.log('🖼️ WebP Support:', supportsWebP() ? '✅ Enabled' : '❌ Using fallback');
}
