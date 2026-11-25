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

describe('OperatorOnboarding labels and ids', () => {
  for (const { label, id } of pairs) {
    it(`has htmlFor="${id}" on label "${label}"`, () => {
      const re = new RegExp(`htmlFor=["']${id}["']`);
      expect(re.test(source)).toBe(true);
    });

    it(`has id="${id}" on control after label "${label}"`, () => {
      const re = new RegExp(`id=["']${id}["']`);
      expect(re.test(source)).toBe(true);
    });
  }
});
