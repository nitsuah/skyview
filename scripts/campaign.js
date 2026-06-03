const UTM_SESSION_KEY = 'skyview:utm:v1';

const REFERRER_SOURCE_MAP = {
    'google.com': 'google',
    'bing.com': 'bing',
    'instagram.com': 'instagram',
    'facebook.com': 'facebook',
    'linkedin.com': 'linkedin',
    'twitter.com': 'twitter',
    'x.com': 'twitter',
    'youtube.com': 'youtube',
    'pinterest.com': 'pinterest'
};

const HERO_SUBLINE_VARIANTS = {
    instagram: 'Cinematic aerial content your followers will love.',
    facebook: 'Stunning drone visuals for your business.',
    google: 'Professional drone services for any occasion.',
    linkedin: 'Elevate your real estate and commercial listings.',
    youtube: 'Cinematic video production from the sky.',
    default: 'Cinematic aerial photography and videography.'
};

function parseUtmParams() {
    try {
        const params = new URLSearchParams(window.location?.search || '');
        const utm = {
            source: params.get('utm_source') || '',
            medium: params.get('utm_medium') || '',
            campaign: params.get('utm_campaign') || '',
            content: params.get('utm_content') || '',
            term: params.get('utm_term') || ''
        };
        return Object.fromEntries(Object.entries(utm).filter(([, v]) => v));
    } catch {
        return {};
    }
}

function detectReferrerSource() {
    try {
        const ref = document.referrer;
        if (!ref) return '';
        const host = new URL(ref).hostname.replace(/^www\./, '');
        for (const [domain, source] of Object.entries(REFERRER_SOURCE_MAP)) {
            if (host === domain || host.endsWith(`.${domain}`)) return source;
        }
        return host;
    } catch {
        return '';
    }
}

function persistUtmSession(data) {
    try {
        sessionStorage.setItem(UTM_SESSION_KEY, JSON.stringify(data));
    } catch {
        // Storage unavailable
    }
}

function getUtmSession() {
    try {
        const raw = sessionStorage.getItem(UTM_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function applyHeroSublineVariant(source) {
    const message = HERO_SUBLINE_VARIANTS[source] || HERO_SUBLINE_VARIANTS.default;
    const subline = document.querySelector('.hero-subline, [data-campaign-subline]');
    if (subline) {
        subline.textContent = message;
        subline.dataset.campaignSource = source || 'organic';
    }
}

export function getCampaignData() {
    const existing = getUtmSession();
    if (existing) return existing;

    const utm = parseUtmParams();
    const referrerSource = detectReferrerSource();
    const effectiveSource = utm.source || referrerSource || 'organic';

    const data = { ...utm, referrerSource, effectiveSource };
    persistUtmSession(data);
    return data;
}

export function initCampaignTracking() {
    const data = getCampaignData();

    const personalizationConfig = window.SKYVIEW_CONFIG?.campaign;
    if (personalizationConfig?.personalize !== false && data.effectiveSource) {
        applyHeroSublineVariant(data.effectiveSource);
    }

    window.__SKYVIEW_CAMPAIGN__ = data;

    if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('skyview:campaign-detected', { detail: data }));
    }

    return data;
}
