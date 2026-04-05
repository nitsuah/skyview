const STORAGE_KEY = 'skyview:conversion-metrics:v1';
const SESSION_KEY = 'skyview:landing-view-recorded:v1';
const MAX_EVENTS = 25;
const TRACKED_EVENTS = ['landing_view', 'booking_cta_click', 'contact_submit'];
const ALLOWED_METADATA_KEYS = new Set(['source', 'location', 'target']);

function createDefaultMetrics() {
    return {
        version: 1,
        updatedAt: null,
        totals: TRACKED_EVENTS.reduce((acc, eventName) => {
            acc[eventName] = 0;
            return acc;
        }, {}),
        events: []
    };
}

function getStorage(type) {
    try {
        return type === 'session' ? window.sessionStorage : window.localStorage;
    } catch {
        return null;
    }
}

function sanitizeMetadata(metadata = {}) {
    return Object.entries(metadata).reduce((acc, [key, value]) => {
        if (!ALLOWED_METADATA_KEYS.has(key)) {
            return acc;
        }

        if (typeof value !== 'string') {
            return acc;
        }

        const sanitizedValue = value.trim().slice(0, 80);
        if (sanitizedValue) {
            acc[key] = sanitizedValue;
        }

        return acc;
    }, {});
}

function persistMetrics(metrics) {
    const storage = getStorage('local');
    if (!storage) {
        return metrics;
    }

    storage.setItem(STORAGE_KEY, JSON.stringify(metrics));
    window.__SKYVIEW_CONVERSION_METRICS__ = metrics;
    return metrics;
}

export function getConversionMetrics() {
    const storage = getStorage('local');
    if (!storage) {
        return createDefaultMetrics();
    }

    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
        return persistMetrics(createDefaultMetrics());
    }

    try {
        const parsed = JSON.parse(raw);
        const metrics = createDefaultMetrics();
        metrics.updatedAt = parsed.updatedAt || null;
        metrics.events = Array.isArray(parsed.events) ? parsed.events.slice(0, MAX_EVENTS) : [];
        metrics.totals = {
            ...metrics.totals,
            ...(parsed.totals || {})
        };
        window.__SKYVIEW_CONVERSION_METRICS__ = metrics;
        return metrics;
    } catch {
        return persistMetrics(createDefaultMetrics());
    }
}

export function resetConversionMetrics() {
    const localStorageRef = getStorage('local');
    const sessionStorageRef = getStorage('session');

    localStorageRef?.removeItem(STORAGE_KEY);
    sessionStorageRef?.removeItem(SESSION_KEY);
    delete window.__SKYVIEW_CONVERSION_METRICS__;
}

function forwardAnalyticsEvent(eventName, metadata) {
    const provider = window.SKYVIEW_CONFIG?.analytics?.provider;
    const analyticsEnabled = Boolean(window.SKYVIEW_CONFIG?.features?.analytics);

    if (typeof window.plausible === 'function' && (provider === 'plausible' || analyticsEnabled)) {
        window.plausible(eventName, {
            props: metadata
        });
    }
}

export function trackConversionEvent(eventName, metadata = {}) {
    if (!TRACKED_EVENTS.includes(eventName)) {
        return getConversionMetrics();
    }

    const metrics = getConversionMetrics();
    const safeMetadata = sanitizeMetadata(metadata);
    const eventRecord = {
        name: eventName,
        timestamp: new Date().toISOString(),
        page: window.location?.pathname || '/',
        ...safeMetadata
    };

    metrics.totals[eventName] = (metrics.totals[eventName] || 0) + 1;
    metrics.updatedAt = eventRecord.timestamp;
    metrics.events = [eventRecord, ...metrics.events].slice(0, MAX_EVENTS);

    persistMetrics(metrics);
    forwardAnalyticsEvent(eventName, safeMetadata);

    return metrics;
}

function bindBookingLinks(root = document) {
    root.querySelectorAll('a[href="#booking"], a[href*="calendly.com"]').forEach((link) => {
        if (link.dataset.conversionTracked === 'true') {
            return;
        }

        link.dataset.conversionTracked = 'true';
        link.addEventListener('click', () => {
            trackConversionEvent('booking_cta_click', {
                source: 'booking_link',
                location: link.className || link.id || 'cta'
            });
        }, { passive: true });
    });
}

export function initConversionTracking(root = document) {
    bindBookingLinks(root);

    const sessionStorageRef = getStorage('session');
    const alreadyTracked = sessionStorageRef?.getItem(SESSION_KEY) === '1';

    if (!alreadyTracked) {
        trackConversionEvent('landing_view', {
            source: 'page_load'
        });
        sessionStorageRef?.setItem(SESSION_KEY, '1');
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('📈 Conversion baseline metrics', getConversionMetrics().totals);
    }

    return getConversionMetrics();
}
