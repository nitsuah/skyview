// Gallery Lightbox Module
export function initGalleryLightbox() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');

    if (!lightbox) return;

    const lightboxImage = lightbox.querySelector('.lightbox-image');
    const lightboxVideo = lightbox.querySelector('.lightbox-video');
    const lightboxClose = lightbox.querySelector('.lightbox-close');
    const lightboxPrev = lightbox.querySelector('.lightbox-prev');
    const lightboxNext = lightbox.querySelector('.lightbox-next');
    const lightboxCounter = lightbox.querySelector('.lightbox-counter');

    let currentIndex = 0;
    const mediaItems = Array.from(galleryItems).map(item => {
        const img = item.querySelector('img');
        const video = item.querySelector('video');
        
        if (video) {
            return {
                src: video.src,
                alt: video.alt || video.title,
                type: 'video'
            };
        } else if (img) {
            return {
                src: img.src,
                alt: img.alt,
                type: 'image'
            };
        }
        return null;
    }).filter(item => item !== null);

    // Open lightbox
    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            currentIndex = index;
            openLightbox();
        });
    });

    // Close lightbox
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    // Navigation
    lightboxPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        showPrevImage();
    });

    lightboxNext.addEventListener('click', (e) => {
        e.stopPropagation();
        showNextImage();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;

        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPrevImage();
        if (e.key === 'ArrowRight') showNextImage();
    });

    function openLightbox() {
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateLightboxImage();
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function showPrevImage() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        updateLightboxImage();
    }

    function showNextImage() {
        currentIndex = (currentIndex + 1) % images.length;
        updateLightboxImage();
    }

    function updateLightboxImage() {
        const media = mediaItems[currentIndex];
        
        if (media.type === 'video') {
            // Show video, hide image
            lightboxVideo.style.display = 'block';
            lightboxImage.style.display = 'none';
            lightboxVideo.src = media.src;
            lightboxVideo.load();
            lightboxVideo.play().catch(() => {});
        } else {
            // Show image, hide video
            lightboxImage.style.display = 'block';
            lightboxVideo.style.display = 'none';
            lightboxVideo.pause();
            lightboxVideo.src = '';
            lightboxImage.src = media.src;
            lightboxImage.alt = media.alt;
        }
        
        lightboxCounter.textContent = `${currentIndex + 1} / ${mediaItems.length}`;
    }
}
