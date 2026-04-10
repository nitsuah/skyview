const STORAGE_KEY = 'skyview:conversion-metrics:v1';
const SESSION_KEY = 'skyview:landing-view-recorded:v1';
const DASHBOARD_ID = 'skyview-conversion-dashboard';
const MAX_EVENTS = 25;
const TRACKED_EVENTS = ['landing_view', 'gallery_engagement', 'booking_cta_click', 'contact_submit'];
const TRACKED_EVENT_LABELS = {
    landing_view: 'Landing views',
    gallery_engagement: 'Work sample opens',
    booking_cta_click: 'Booking clicks',
    contact_submit: 'Contact sends'
};
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

function formatUpdatedAt(updatedAt) {
    if (!updatedAt) {
        return 'Waiting for activity';
    }

    const parsed = new Date(updatedAt);
    if (Number.isNaN(parsed.getTime())) {
        return 'Waiting for activity';
    }

    return parsed.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function shouldShowDashboard() {
    if (typeof window === 'undefined') {
        return false;
    }

    const params = new URLSearchParams(window.location?.search || '');
    const isLocalPreview = ['localhost', '127.0.0.1'].includes(window.location?.hostname);
    const featureEnabled = window.SKYVIEW_CONFIG?.features?.analyticsDebugPanel === true;

    return isLocalPreview || featureEnabled || params.get('metrics') === '1';
}

function renderConversionDashboard(metrics = getConversionMetrics()) {
    if (!shouldShowDashboard() || typeof document === 'undefined' || !document.body) {
        return null;
    }

    let dashboard = document.getElementById(DASHBOARD_ID);
    if (!dashboard) {
        dashboard = document.createElement('aside');
        dashboard.id = DASHBOARD_ID;
        dashboard.className = 'conversion-dashboard';
        dashboard.setAttribute('aria-label', 'Local conversion dashboard');
        document.body.appendChild(dashboard);
    }

    dashboard.innerHTML = `
        <div class="conversion-dashboard__eyebrow">LOCAL FUNNEL</div>
        <div class="conversion-dashboard__header">
            <div>
                <h3>Conversion signals</h3>
                <p>Private preview snapshot</p>
            </div>
            <button type="button" class="conversion-dashboard__reset" data-reset-conversions>Reset</button>
        </div>
        <div class="conversion-dashboard__grid">
            ${TRACKED_EVENTS.map((eventName) => `
                <div class="conversion-dashboard__metric">
                    <span class="conversion-dashboard__label">${TRACKED_EVENT_LABELS[eventName] || eventName}</span>
                    <strong class="conversion-dashboard__value" data-event-name="${eventName}">${metrics.totals[eventName] || 0}</strong>
                </div>
            `).join('')}
        </div>
        <div class="conversion-dashboard__footer">
            <span class="conversion-dashboard__status ${metrics.updatedAt ? 'is-live' : ''}">Updated</span>
            <span class="conversion-dashboard__timestamp">${formatUpdatedAt(metrics.updatedAt)}</span>
        </div>
    `;

    if (dashboard.dataset.bound !== 'true') {
        dashboard.addEventListener('click', (event) => {
            const resetButton = event.target.closest('[data-reset-conversions]');
            if (resetButton) {
                resetConversionMetrics();
            }
        });
        dashboard.dataset.bound = 'true';
    }

    return dashboard;
}

function persistMetrics(metrics) {
    const storage = getStorage('local');
    if (!storage) {
        return metrics;
    }

    storage.setItem(STORAGE_KEY, JSON.stringify(metrics));
    window.__SKYVIEW_CONVERSION_METRICS__ = metrics;

    if (typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('skyview:conversion-metrics-updated', {
            detail: metrics
        }));
    }

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

    const emptyMetrics = persistMetrics(createDefaultMetrics());
    renderConversionDashboard(emptyMetrics);
    return emptyMetrics;
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
    renderConversionDashboard(metrics);

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

    const metrics = getConversionMetrics();

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('📈 Conversion baseline metrics', metrics.totals);
    }

    renderConversionDashboard(metrics);
    return metrics;
}
