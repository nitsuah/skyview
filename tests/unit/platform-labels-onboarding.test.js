import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const filePath = resolve('platform/src/pages/OperatorOnboarding.jsx');
const source = readFileSync(filePath, 'utf8');

const pairs = [
  { label: 'Your city / base location', id: 'op-city' },
  { label: 'Service radius (miles)', id: 'op-radius' },
  { label: 'Bio', id: 'op-bio' },
  { label: 'Equipment', id: 'op-equipment' },
  { label: 'Base / flat rate', id: 'op-base-rate' },
  { label: 'Hourly rate', id: 'op-hourly-rate' },
  { label: 'Your booking / calendar link', id: 'op-booking-url' },
  { label: 'Blocked dates', id: 'op-blocked-date' },
  { label: 'Certificate number', id: 'op-cert-number' },
  { label: 'Expiry date', id: 'op-cert-expiry' },
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('OperatorOnboarding labels and ids', () => {
  for (const { label, id } of pairs) {
    it(`label "${label}" carries htmlFor="${id}"`, () => {
      // htmlFor must sit on the <label> whose text is this label, not on any other label.
      const re = new RegExp(`<label[^>]*htmlFor=["']${id}["'][^>]*>\\s*${escape(label)}`);
      expect(re.test(source)).toBe(true);
    });

    it(`id="${id}" is unique and comes after its label`, () => {
      const idRe = `\\bid=["']${id}["']`;
      expect(source.match(new RegExp(idRe, 'g')) || []).toHaveLength(1);
      const labelAt = source.search(new RegExp(`htmlFor=["']${id}["']`));
      const idAt = source.search(new RegExp(idRe));
      expect(labelAt).toBeGreaterThanOrEqual(0);
      expect(idAt).toBeGreaterThan(labelAt);
      // No other label may sit between this label and its control.
      expect(source.slice(labelAt, idAt)).not.toMatch(/<label/);
    });
  }
});
