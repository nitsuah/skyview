/**
 * Skyview Website Configuration
 * 
 * Feature Flags - Control which sections are visible on the site
 * Set to `true` to enable, `false` to disable
 */

window.SKYVIEW_CONFIG = {
    brand: {
        // Change this single place to rename or relink the business across the site UI + metadata
        name: 'SkyView Dynamics',
        website: 'https://skyviewdynamics.com/'
    },

    features: {
        // Testimonials section - Enable when you have real client reviews
        testimonials: false,
        
        // Contact form - enabled for launch inquiries and conversion baseline tracking
        contactForm: true,
        
        // Calendly booking widget - Enable when Calendly account is configured
        calendly: true,
        
        // Client portal - Enable when ready to offer client file delivery
        clientPortal: false,
        
        // Admin CMS - Enable when Netlify Identity is configured
        adminCMS: true,
        
        // 3D Preview - Enable when 3D viewer is implemented
        preview3D: false,
        
        // Analytics - Enable when analytics provider is set up
        analytics: false,

        // Local conversion dashboard - enable for a persistent preview metrics panel outside localhost if desired
        analyticsDebugPanel: false
    },
    
    // Contact information
    contact: {
        email: 'contact@skyviewdynamics.com',
        phone: '+1 (555) 123-4567',
        phoneE164: '+15551234567',
        // Social media - Update with real URLs when ready
        social: {
            twitter: 'https://twitter.com',
            instagram: 'https://instagram.com',
            youtube: 'https://youtube.com'
        }
    },
    
    // Calendly configuration
    calendly: {
        url: 'https://calendly.com/skyviewdynamics/consultation',
        // Customization
        primaryColor: '00d4ff',
        backgroundColor: '0b1120',
        textColor: 'f5fbff',
        hideGdprBanner: true
    },
    
    // Analytics configuration
    analytics: {
        // Choose provider: 'plausible', 'netlify', 'goatcounter', 'none'
        provider: 'plausible',
        // Used when external analytics are enabled; local conversion baseline tracking runs regardless.
        domain: 'skyviewdynamics.com'
    },

    // A/B experiment configuration — set enabled: true to activate
    experiments: {
        enabled: false,
        heroHeadline: {
            id: 'hero-headline-q3-v1',
            variants: {
                control: 'CINEMATIC DRONE SERVICES',
                treatment: 'CAPTURE THE EXTRAORDINARY'
            }
        },
        heroCta: {
            id: 'hero-cta-q3-v1',
            variants: {
                control: 'BOOK A CONSULTATION',
                treatment: 'SEE WHAT WE CAN DO'
            }
        }
    },

    // Campaign personalization — UTM + referrer-based hero messaging
    campaign: {
        // Set to false to disable referrer-based hero subline personalization
        personalize: true
    }
};

function setMetaContent(selector, value) {
    const element = document.querySelector(selector);
    if (element && value) {
        element.setAttribute('content', value);
    }
}

function setLinkHref(selector, value) {
    const element = document.querySelector(selector);
    if (element && value) {
        element.setAttribute('href', value);
    }
}

function replaceBrandText(value, companyName) {
    if (typeof value !== 'string') {
        return value;
    }

    return value
        .replace(/SkyView Dynamics/gi, companyName)
        .replace(/Skyview Dynamics/gi, companyName);
}

function updateStructuredData(companyName) {
    const brand = window.SKYVIEW_CONFIG.brand || {};
    const contact = window.SKYVIEW_CONFIG.contact || {};
    const socialLinks = Object.values(contact.social || {}).filter(Boolean);

    const updateNames = (value) => {
        if (Array.isArray(value)) {
            value.forEach(updateNames);
            return;
        }

        if (!value || typeof value !== 'object') {
            return;
        }

        Object.entries(value).forEach(([key, nestedValue]) => {
            if (key === 'name' && typeof nestedValue === 'string' && /skyview dynamics/i.test(nestedValue)) {
                value[key] = nestedValue.replace(/SkyView Dynamics/gi, companyName).replace(/Skyview Dynamics/gi, companyName);
                return;
            }

            updateNames(nestedValue);
        });
    };

    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        try {
            const parsed = JSON.parse(script.textContent);
            updateNames(parsed);

            if (parsed && typeof parsed === 'object') {
                if (brand.website && parsed.url) {
                    parsed.url = brand.website;
                }
                if (contact.email && parsed.email) {
                    parsed.email = contact.email;
                }
                if ((contact.phoneE164 || contact.phone) && parsed.telephone) {
                    parsed.telephone = contact.phoneE164 || contact.phone;
                }
                if (socialLinks.length && Array.isArray(parsed.sameAs)) {
                    parsed.sameAs = socialLinks;
                }
                if (parsed.publisher && typeof parsed.publisher === 'object' && socialLinks.length) {
                    parsed.publisher.sameAs = socialLinks;
                }
            }

            script.textContent = JSON.stringify(parsed, null, 4);
        } catch {
            // Ignore malformed JSON-LD blocks.
        }
    });
}

function applySiteIdentity() {
    const brand = window.SKYVIEW_CONFIG.brand || {};
    const companyName = brand.name || 'SkyView Dynamics';
    const website = brand.website || window.location.href;
    const defaultPageTitle = `${companyName} | Cinematic Drone Services for Events & Imaging`;
    const defaultSocialTitle = `${companyName} | Professional Cinematic Drone Services`;

    document.querySelectorAll('.logo-text, [data-company-name]').forEach((element) => {
        element.textContent = companyName;
    });

    document.querySelectorAll('[data-company-legal="copyright"]').forEach((element) => {
        element.innerHTML = `&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.`;
    });

    document.querySelectorAll('[data-company-legal="name"]').forEach((element) => {
        element.textContent = companyName;
    });

    const currentTitle = document.title || defaultPageTitle;
    document.title = /skyview dynamics/i.test(currentTitle)
        ? replaceBrandText(currentTitle, companyName)
        : defaultPageTitle;

    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
        setMetaContent('meta[name="description"]', replaceBrandText(descriptionMeta.getAttribute('content') || '', companyName));
    }

    setMetaContent('meta[name="author"]', companyName);

    const ogTitleMeta = document.querySelector('meta[property="og:title"]');
    const ogTitleValue = ogTitleMeta?.getAttribute('content') || '';
    setMetaContent(
        'meta[property="og:title"]',
        /skyview dynamics/i.test(ogTitleValue) ? replaceBrandText(ogTitleValue, companyName) : defaultSocialTitle
    );

    setMetaContent('meta[property="og:site_name"]', companyName);
    setMetaContent('meta[property="og:url"]', website);
    setMetaContent('meta[name="twitter:url"]', website);
    setLinkHref('link[rel="canonical"]', website);

    const twitterTitleMeta = document.querySelector('meta[name="twitter:title"]');
    const twitterTitleValue = twitterTitleMeta?.getAttribute('content') || '';
    setMetaContent(
        'meta[name="twitter:title"]',
        /skyview dynamics/i.test(twitterTitleValue) ? replaceBrandText(twitterTitleValue, companyName) : defaultSocialTitle
    );

    updateStructuredData(companyName);
}

function applyContactIdentity() {
    const contact = window.SKYVIEW_CONFIG.contact || {};

    document.querySelectorAll('[data-contact-email]').forEach((element) => {
        element.textContent = contact.email || '';
    });

    document.querySelectorAll('[data-contact-phone]').forEach((element) => {
        element.textContent = contact.phone || '';
    });

    Object.entries(contact.social || {}).forEach(([network, url]) => {
        document.querySelectorAll(`[data-social-link="${network}"]`).forEach((element) => {
            if (url) {
                element.setAttribute('href', url);
            }
        });
    });
}

/**
 * Apply feature flags on page load
 * This function hides sections based on the configuration above
 */
document.addEventListener('DOMContentLoaded', function() {
    applySiteIdentity();
    applyContactIdentity();

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
            const calendlyConfig = window.SKYVIEW_CONFIG.calendly;
            const url = `${calendlyConfig.url}?hide_gdpr_banner=${calendlyConfig.hideGdprBanner ? '1' : '0'}&primary_color=${calendlyConfig.primaryColor}&background_color=${calendlyConfig.backgroundColor}&text_color=${calendlyConfig.textColor}`;
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
