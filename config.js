/**
 * Skyview Website Configuration
 * 
 * Feature Flags - Control which sections are visible on the site
 * Set to `true` to enable, `false` to disable
 */

window.SKYVIEW_CONFIG = {
    features: {
        // Testimonials section - Enable when you have real client reviews
        testimonials: false,
        
        // Contact form - Enable when ready to receive inquiries
        // (Requires Netlify Forms configuration)
        contactForm: false,
        
        // Calendly booking widget - Enable when Calendly account is configured
        calendly: true,
        
        // Client portal - Enable when ready to offer client file delivery
        clientPortal: false,
        
        // Admin CMS - Enable when Netlify Identity is configured
        adminCMS: true,
        
        // 3D Preview - Enable when 3D viewer is implemented
        preview3D: false,
        
        // Analytics - Enable when analytics provider is set up
        analytics: false
    },
    
    // Contact information
    contact: {
        email: 'contact@skyviewdynamics.com',
        phone: '+1 (555) 123-4567',
        // Social media - Update with real URLs when ready
        social: {
            twitter: 'https://twitter.com',
            instagram: 'https://instagram.com',
            youtube: 'https://youtube.com'
        }
    },
    
    // Calendly configuration
    calendly: {
        // TODO: Replace with your actual Calendly URL (e.g., https://calendly.com/YOUR_USERNAME/consultation)
        url: 'https://calendly.com/YOUR_CALENDLY_USERNAME/consultation',
        // Customization
        primaryColor: '00d4ff',
        hideGdprBanner: true
    },
    
    // Analytics configuration
    analytics: {
        // Choose provider: 'plausible', 'netlify', 'goatcounter', 'none'
        provider: 'plausible',
        // TODO: Replace with your actual domain before enabling analytics
        domain: 'REPLACE_WITH_YOUR_DOMAIN.com'
    }
};

/**
 * Apply feature flags on page load
 * This function hides sections based on the configuration above
 */
document.addEventListener('DOMContentLoaded', function() {
    const config = window.SKYVIEW_CONFIG.features;
    
    // Hide testimonials section if disabled
    if (!config.testimonials) {
        const testimonialsSection = document.getElementById('testimonials');
        const testimonialsNavLink = document.querySelector('a[href="#testimonials"]');
        if (testimonialsSection) {
            testimonialsSection.style.display = 'none';
        }
        if (testimonialsNavLink) {
            testimonialsNavLink.parentElement.style.display = 'none';
        }
    }
    
    // Hide entire contact section if disabled
    if (!config.contactForm) {
        const contactSection = document.getElementById('contact');
        const contactNavLink = document.querySelector('a[href="#contact"]');
        if (contactSection) {
            contactSection.style.display = 'none';
        }
        if (contactNavLink) {
            contactNavLink.parentElement.style.display = 'none';
        }
    }
    
    // Hide Calendly section if disabled
    if (!config.calendly) {
        const bookingSection = document.getElementById('booking');
        const bookingNavLink = document.querySelector('a[href="#booking"]');
        if (bookingSection) {
            bookingSection.style.display = 'none';
        }
        if (bookingNavLink) {
            bookingNavLink.parentElement.style.display = 'none';
        }
    }
    
    // Update hero CTA button based on what's enabled
    const heroCTA = document.querySelector('.hero-content .cta-button');
    if (heroCTA) {
        if (config.calendly) {
            heroCTA.setAttribute('href', '#booking');
        } else if (config.contactForm) {
            heroCTA.setAttribute('href', '#contact');
        } else {
            // Both disabled - link to gallery instead
            heroCTA.setAttribute('href', '#gallery');
            heroCTA.querySelector('.cta-text').textContent = 'VIEW OUR WORK';
        }
    }
    
    // Update Calendly URL if configured
    if (config.calendly) {
        const calendlyWidget = document.querySelector('.calendly-inline-widget');
        if (calendlyWidget) {
            const url = `${window.SKYVIEW_CONFIG.calendly.url}?hide_gdpr_banner=${window.SKYVIEW_CONFIG.calendly.hideGdprBanner ? '1' : '0'}&primary_color=${window.SKYVIEW_CONFIG.calendly.primaryColor}`;
            calendlyWidget.setAttribute('data-url', url);
        }
    }
    
    // Hide 3D preview if disabled
    if (!config.preview3D) {
        const preview3D = document.getElementById('preview3d');
        if (preview3D) {
            preview3D.style.display = 'none';
        }
    }
    
    // Hide client portal link if disabled
    if (!config.clientPortal) {
        // Could add a link in footer when enabled
        console.log('Client portal is disabled');
    }
    
    // Load analytics if enabled
    if (config.analytics && window.SKYVIEW_CONFIG.analytics.provider !== 'none') {
        loadAnalytics();
    }
});

/**
 * Load analytics script based on configuration
 */
function loadAnalytics() {
    const analyticsConfig = window.SKYVIEW_CONFIG.analytics;
    
    if (analyticsConfig.provider === 'plausible') {
        const script = document.createElement('script');
        script.defer = true;
        script.setAttribute('data-domain', analyticsConfig.domain);
        script.src = 'https://plausible.io/js/script.js';
        document.head.appendChild(script);
        console.log('Plausible Analytics loaded');
    }
    // Add other providers as needed
}
