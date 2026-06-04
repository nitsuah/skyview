const VISITOR_ID_KEY = 'skyview:visitor-id:v1';
const EXPERIMENT_KEY = 'skyview:experiments:v1';

function generateVisitorId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function getVisitorId() {
    try {
        let id = localStorage.getItem(VISITOR_ID_KEY);
        if (!id) {
            id = generateVisitorId();
            localStorage.setItem(VISITOR_ID_KEY, id);
        }
        return id;
    } catch {
        return generateVisitorId();
    }
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

function assignBucket(experimentId, visitorId, numBuckets = 2) {
    return hashString(`${experimentId}:${visitorId}`) % numBuckets;
}

function getExperimentAssignments() {
    try {
        const raw = localStorage.getItem(EXPERIMENT_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveExperimentAssignments(assignments) {
    try {
        localStorage.setItem(EXPERIMENT_KEY, JSON.stringify(assignments));
    } catch {
        // Storage unavailable
    }
}

export function getVariant(experimentId, variants = ['control', 'treatment']) {
    const assignments = getExperimentAssignments();

    if (assignments[experimentId] !== undefined) {
        return variants[assignments[experimentId]] ?? variants[0];
    }

    const visitorId = getVisitorId();
    const bucket = assignBucket(experimentId, visitorId, variants.length);
    assignments[experimentId] = bucket;
    saveExperimentAssignments(assignments);

    return variants[bucket];
}

function applyHeroVariant(config) {
    const { id, variants } = config;
    if (!variants || !id) return;

    const variantKey = getVariant(id, Object.keys(variants));
    const value = variants[variantKey];
    if (!value) return;

    const heroHeadline = document.querySelector('.hero-content h1, .hero-headline, [data-experiment-hero-headline]');
    if (heroHeadline) {
        heroHeadline.textContent = value;
        heroHeadline.dataset.experimentVariant = variantKey;
        heroHeadline.dataset.experimentId = id;
    }

    return variantKey;
}

function applyCtaVariant(config) {
    const { id, variants } = config;
    if (!variants || !id) return;

    const variantKey = getVariant(id, Object.keys(variants));
    const value = variants[variantKey];
    if (!value) return;

    document.querySelectorAll('[data-experiment-cta], .hero-content .cta-text').forEach(el => {
        el.textContent = value;
        el.dataset.experimentVariant = variantKey;
        el.dataset.experimentId = id;
    });

    return variantKey;
}

export function initAbTesting() {
    const config = window.SKYVIEW_CONFIG?.experiments;
    if (!config?.enabled) return {};

    const assignments = {};

    if (config.heroHeadline) {
        const variant = applyHeroVariant(config.heroHeadline);
        if (variant) assignments[config.heroHeadline.id] = variant;
    }

    if (config.heroCta) {
        const variant = applyCtaVariant(config.heroCta);
        if (variant) assignments[config.heroCta.id] = variant;
    }

    if (Object.keys(assignments).length > 0) {
        window.dispatchEvent(new CustomEvent('skyview:experiments-applied', { detail: assignments }));
    }

    return assignments;
}
