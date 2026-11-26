import { describe, expect, it } from 'vitest';
import { findPlaceholders, loadContact } from '../../scripts/check-launch-identity.mjs';

describe('launch identity check', () => {
    it('returns empty array for a fully configured contact', () => {
        const contact = {
            email: 'real@business.com',
            phone: '+1 (202) 555-0199',
            phoneE164: '+12025550199',
            social: {
                facebook: 'https://facebook.com/realbusiness',
                twitter: 'https://twitter.com/realbusiness',
                instagram: 'https://instagram.com/realbusiness',
                youtube: 'https://youtube.com/@realbusiness',
            },
            address: {
                locality: 'Washington',
                region: 'DC',
                country: 'US',
            },
            geo: {
                latitude: '38.9072',
                longitude: '-77.0369',
            },
        };

        const result = findPlaceholders(contact);
        expect(result).toEqual([]);
    });

    it('detects phone placeholder with 555123', () => {
        const contact = {
            phone: '+1 (555) 123-4567',
            phoneE164: '+15551234567',
            social: {},
            address: { locality: 'City', region: 'ST', country: 'US' },
            geo: { latitude: '1.0', longitude: '1.0' },
        };

        const result = findPlaceholders(contact);
        expect(result).toContain('phone');
        expect(result).toContain('phoneE164');
    });

    it('detects address.locality placeholder', () => {
        const contact = {
            phone: '+1 (202) 555-0199',
            phoneE164: '+12025550199',
            social: {},
            address: { locality: 'Your City', region: 'ST', country: 'US' },
            geo: { latitude: '1.0', longitude: '1.0' },
        };

        const result = findPlaceholders(contact);
        expect(result).toContain('address.locality');
    });

    it('detects address.region placeholder', () => {
        const contact = {
            phone: '+1 (202) 555-0199',
            phoneE164: '+12025550199',
            social: {},
            address: { locality: 'City', region: 'State', country: 'US' },
            geo: { latitude: '1.0', longitude: '1.0' },
        };

        const result = findPlaceholders(contact);
        expect(result).toContain('address.region');
    });

    it('detects geo.latitude placeholder', () => {
        const contact = {
            phone: '+1 (202) 555-0199',
            phoneE164: '+12025550199',
            social: {},
            address: { locality: 'City', region: 'ST', country: 'US' },
            geo: { latitude: '0.0', longitude: '1.0' },
        };

        const result = findPlaceholders(contact);
        expect(result).toContain('geo.latitude');
    });

    it('detects geo.longitude placeholder', () => {
        const contact = {
            phone: '+1 (202) 555-0199',
            phoneE164: '+12025550199',
            social: {},
            address: { locality: 'City', region: 'ST', country: 'US' },
            geo: { latitude: '1.0', longitude: '0.0' },
        };

        const result = findPlaceholders(contact);
        expect(result).toContain('geo.longitude');
    });

    it('detects social URLs with no path', () => {
        const contact = {
            phone: '+1 (202) 555-0199',
            phoneE164: '+12025550199',
            social: {
                facebook: 'https://facebook.com',
                twitter: 'https://twitter.com',
                instagram: 'https://instagram.com/',
                youtube: 'https://youtube.com',
            },
            address: { locality: 'City', region: 'ST', country: 'US' },
            geo: { latitude: '1.0', longitude: '1.0' },
        };

        const result = findPlaceholders(contact);
        expect(result).toContain('social.facebook');
        expect(result).toContain('social.twitter');
        expect(result).toContain('social.instagram');
        expect(result).toContain('social.youtube');
    });

    it('loads contact from config.js text and detects address.locality placeholder', () => {
        const configText = `
            window.SKYVIEW_CONFIG = {
                contact: {
                    email: 'contact@example.com',
                    phone: '+1 (555) 123-4567',
                    phoneE164: '+15551234567',
                    social: {
                        facebook: 'https://facebook.com/real',
                        twitter: 'https://twitter.com/real',
                        instagram: 'https://instagram.com/real',
                        youtube: 'https://youtube.com/@real',
                    },
                    address: {
                        locality: 'Your City',
                        region: 'ST',
                        country: 'US',
                    },
                    geo: {
                        latitude: '1.0',
                        longitude: '1.0',
                    },
                },
            };
        `;

        const contact = loadContact(configText);
        const placeholders = findPlaceholders(contact);
        expect(placeholders).toContain('address.locality');
    });
});
