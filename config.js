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
        
        // Client portal - Enable when ready to offer client file delivery
        clientPortal: false,

        // Admin CMS - Enable when Netlify Identity is configured
        adminCMS: true,

        // 3D Preview - Enable when 3D viewer is implemented
        preview3D: false,

        // Analytics - Enable when analytics provider is set up
        analytics: false

        // NOTE: scheduling lives in the marketplace platform (/app): clients post
        // a job and operators accept dates against their declared availability
        // (migration 006). The booking section in index.html links straight there.
    },
    
    // Contact information
    // PRODUCTION LAUNCH: every value below is a placeholder. This is the
    // single place to enter real business identity data — updating these
    // fields propagates to the visible contact info, meta tags, and the
    // schema.org LocalBusiness structured data via applyContactIdentity()
    // and updateStructuredData() below. See TASKS.md for the outstanding
    // "populate production identity fields" item.
    contact: {
        email: 'contact@skyviewdynamics.com',
        phone: '+1 (555) 123-4567',
        phoneE164: '+15551234567',
        // Social media - Update with real URLs when ready
        social: {
            facebook: 'https://facebook.com',
            twitter: 'https://twitter.com',
            instagram: 'https://instagram.com',
            youtube: 'https://youtube.com'
        },
        // Service-area address for the schema.org LocalBusiness listing.
        // A full street address is optional for a mobile/service-area
        // business — city + region + country is sufficient for SEO.
        address: {
            locality: 'Your City',
            region: 'State',
            country: 'US'
        },
        // Approximate service-area coordinates (decimal degrees) for the
        // schema.org GeoCoordinates block. Used for local search relevance,
        // not pinpoint navigation — an approximate service-area centroid
        // is fine.
        geo: {
            latitude: '0.0',
            longitude: '0.0'
        }
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
                control: 'FIND AN OPERATOR',
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
                if (contact.address && parsed.address && typeof parsed.address === 'object') {
                    if (contact.address.locality) parsed.address.addressLocality = contact.address.locality;
                    if (contact.address.region) parsed.address.addressRegion = contact.address.region;
                    if (contact.address.country) parsed.address.addressCountry = contact.address.country;
                    if (contact.address.street) parsed.address.streetAddress = contact.address.street;
                    if (contact.address.postalCode) parsed.address.postalCode = contact.address.postalCode;
                }
                // '0.0' is the unconfigured placeholder value and is truthy
                // as a string, so a plain truthy check would publish (0,0) —
                // a real location in the Gulf of Guinea — in the JSON-LD
                // until real coordinates are set. The static template omits
                // "geo" entirely for the same reason, so this only adds it
                // once real coordinates exist.
                if (
                    contact.geo &&
                    contact.geo.latitude && contact.geo.latitude !== '0.0' &&
                    contact.geo.longitude && contact.geo.longitude !== '0.0'
                ) {
                    parsed.geo = {
                        '@type': 'GeoCoordinates',
                        latitude: contact.geo.latitude,
                        longitude: contact.geo.longitude,
                    };
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
        // Fall back to phoneE164 if the human-readable `phone` isn't set —
        // matches updateStructuredData()'s telephone fallback below, so a
        // config with only phoneE164 filled in doesn't leave the visible
        // header/footer phone number blank.
        element.textContent = contact.phone || contact.phoneE164 || '';
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
