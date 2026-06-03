const STORAGE_KEY = 'skyview:conversion-metrics:v1';
const SESSION_KEY = 'skyview:landing-view-recorded:v1';
const SESSION_START_KEY = 'skyview:session-start:v1';
const DASHBOARD_ID = 'skyview-conversion-dashboard';
const MAX_EVENTS = 50;
const TRACKED_EVENTS = ['landing_view', 'gallery_engagement', 'booking_cta_click', 'contact_submit', 'service_interest'];
const FUNNEL_STEPS = ['landing_view', 'gallery_engagement', 'booking_cta_click', 'contact_submit'];
const TRACKED_EVENT_LABELS = {
    landing_view: 'Landing views',
    gallery_engagement: 'Work sample opens',
    booking_cta_click: 'Booking clicks',
    contact_submit: 'Contact sends',
    service_interest: 'Service interest'
};
const ALLOWED_METADATA_KEYS = new Set(['source', 'location', 'target', 'referrer', 'campaign', 'variant']);

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

export function getFunnelDropOff(metrics = getConversionMetrics()) {
    const totals = metrics.totals;
    const topOfFunnel = totals[FUNNEL_STEPS[0]] || 0;

    return FUNNEL_STEPS.map((step, index) => {
        const count = totals[step] || 0;
        const prevCount = index === 0 ? topOfFunnel : (totals[FUNNEL_STEPS[index - 1]] || 0);
        const conversionRate = topOfFunnel > 0 ? Math.round((count / topOfFunnel) * 100) : 0;
        const stepRate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
        return {
            step,
            label: TRACKED_EVENT_LABELS[step] || step,
            count,
            conversionRate,
            stepRate,
            dropOff: 100 - stepRate
        };
    });
}

export function exportMetricsCSV(metrics = getConversionMetrics()) {
    const rows = [
        ['event', 'timestamp', 'page', 'source', 'location', 'target', 'referrer', 'campaign', 'variant'],
        ...metrics.events.map(evt => [
            evt.name,
            evt.timestamp,
            evt.page || '',
            evt.source || '',
            evt.location || '',
            evt.target || '',
            evt.referrer || '',
            evt.campaign || '',
            evt.variant || ''
        ])
    ];

    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    if (typeof document !== 'undefined') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `skyview-funnel-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    return csv;
}

export function exportMetricsJSON(metrics = getConversionMetrics()) {
    const payload = {
        exportedAt: new Date().toISOString(),
        totals: metrics.totals,
        funnelDropOff: getFunnelDropOff(metrics),
        events: metrics.events
    };

    const json = JSON.stringify(payload, null, 2);

    if (typeof document !== 'undefined') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `skyview-funnel-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    return json;
}

function renderFunnelDropOff(metrics) {
    const steps = getFunnelDropOff(metrics);
    if (steps[0].count === 0) return '';

    return `
        <div class="conversion-dashboard__funnel">
            <div class="conversion-dashboard__funnel-label">Funnel drop-off</div>
            ${steps.map((s, i) => `
                <div class="conversion-dashboard__funnel-step">
                    <span class="conversion-dashboard__funnel-name">${s.label}</span>
                    <span class="conversion-dashboard__funnel-bar" style="width:${s.conversionRate}%" title="${s.conversionRate}% of sessions"></span>
                    <span class="conversion-dashboard__funnel-pct">${i === 0 ? '100%' : s.stepRate + '%'}</span>
                </div>
            `).join('')}
        </div>
    `;
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
            <div class="conversion-dashboard__actions">
                <button type="button" class="conversion-dashboard__export" data-export-csv title="Export CSV">CSV</button>
                <button type="button" class="conversion-dashboard__export" data-export-json title="Export JSON">JSON</button>
                <button type="button" class="conversion-dashboard__reset" data-reset-conversions>Reset</button>
            </div>
        </div>
        <div class="conversion-dashboard__grid">
            ${TRACKED_EVENTS.map((eventName) => `
                <div class="conversion-dashboard__metric">
                    <span class="conversion-dashboard__label">${TRACKED_EVENT_LABELS[eventName] || eventName}</span>
                    <strong class="conversion-dashboard__value" data-event-name="${eventName}">${metrics.totals[eventName] || 0}</strong>
                </div>
            `).join('')}
        </div>
        ${renderFunnelDropOff(metrics)}
        <div class="conversion-dashboard__footer">
            <span class="conversion-dashboard__status ${metrics.updatedAt ? 'is-live' : ''}">Updated</span>
            <span class="conversion-dashboard__timestamp">${formatUpdatedAt(metrics.updatedAt)}</span>
        </div>
    `;

    if (dashboard.dataset.bound !== 'true') {
        dashboard.addEventListener('click', (event) => {
            if (event.target.closest('[data-reset-conversions]')) {
                resetConversionMetrics();
            } else if (event.target.closest('[data-export-csv]')) {
                exportMetricsCSV();
            } else if (event.target.closest('[data-export-json]')) {
                exportMetricsJSON();
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
    sessionStorageRef?.removeItem(SESSION_START_KEY);
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

function captureReferrer() {
    try {
        const ref = document.referrer;
        if (!ref) return '';
        const host = new URL(ref).hostname.replace(/^www\./, '');
        return host.slice(0, 80);
    } catch {
        return '';
    }
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
        sessionStorageRef?.setItem(SESSION_START_KEY, new Date().toISOString());

        const referrer = captureReferrer();
        const campaign = (() => {
            try {
                return new URLSearchParams(window.location?.search || '').get('utm_campaign') || '';
            } catch {
                return '';
            }
        })();

        trackConversionEvent('landing_view', {
            source: 'page_load',
            ...(referrer ? { referrer } : {}),
            ...(campaign ? { campaign } : {})
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
