import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('campaign', () => {
    beforeEach(() => {
        sessionStorage.clear();
        document.body.innerHTML = `<p class="hero-subline">Default tagline</p>`;
        window.SKYVIEW_CONFIG = { campaign: { personalize: true } };
    });

    afterEach(() => {
        vi.resetModules();
        delete window.SKYVIEW_CONFIG;
        delete window.__SKYVIEW_CAMPAIGN__;
        window.history.replaceState({}, '', '/');
    });

    it('parses UTM campaign parameter from URL', async () => {
        window.history.replaceState({}, '', '/?utm_source=instagram&utm_campaign=summer2026');
        const { getCampaignData } = await import('../../scripts/campaign.js?t=' + Date.now());
        const data = getCampaignData();
        expect(data.source).toBe('instagram');
        expect(data.campaign).toBe('summer2026');
    });

    it('returns organic when no UTM params or referrer', async () => {
        const { getCampaignData } = await import('../../scripts/campaign.js?t=' + Date.now());
        const data = getCampaignData();
        expect(data.effectiveSource).toBe('organic');
    });

    it('stores campaign data in sessionStorage', async () => {
        window.history.replaceState({}, '', '/?utm_source=google');
        const { getCampaignData } = await import('../../scripts/campaign.js?t=' + Date.now());
        getCampaignData();
        const stored = JSON.parse(sessionStorage.getItem('skyview:utm:v1'));
        expect(stored).toBeTruthy();
        expect(stored.source).toBe('google');
    });

    it('personalizes hero subline based on effective source', async () => {
        window.history.replaceState({}, '', '/?utm_source=instagram');
        const { initCampaignTracking } = await import('../../scripts/campaign.js?t=' + Date.now());
        initCampaignTracking();
        const subline = document.querySelector('.hero-subline');
        expect(subline.textContent).not.toBe('Default tagline');
    });

    it('skips personalization when disabled in config', async () => {
        window.SKYVIEW_CONFIG = { campaign: { personalize: false } };
        window.history.replaceState({}, '', '/?utm_source=instagram');
        const { initCampaignTracking } = await import('../../scripts/campaign.js?t=' + Date.now());
        initCampaignTracking();
        const subline = document.querySelector('.hero-subline');
        expect(subline.textContent).toBe('Default tagline');
    });

    it('personalizes the real hero subtitle element from index.html', async () => {
        document.body.innerHTML = '<p class="hero-subtitle">Authored subtitle</p>';
        window.history.replaceState({}, '', '/?utm_source=instagram');
        const { initCampaignTracking } = await import('../../scripts/campaign.js?t=' + Date.now());
        initCampaignTracking();
        const subtitle = document.querySelector('.hero-subtitle');
        expect(subtitle.textContent).toBe('Cinematic aerial content your followers will love.');
        expect(subtitle.dataset.campaignSource).toBe('instagram');
    });

    it('keeps the authored subtitle for organic visitors', async () => {
        document.body.innerHTML = '<p class="hero-subtitle">Authored subtitle</p>';
        window.history.replaceState({}, '', '/');
        const { initCampaignTracking } = await import('../../scripts/campaign.js?t=' + Date.now());
        initCampaignTracking();
        const subtitle = document.querySelector('.hero-subtitle');
        expect(subtitle.textContent).toBe('Authored subtitle');
    });
});
