import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const pairs = [
  { file: 'platform/src/pages/Login.jsx', label: 'Email', id: 'login-email' },
  { file: 'platform/src/pages/Login.jsx', label: 'Password', id: 'login-password' },
  { file: 'platform/src/pages/ForgotPassword.jsx', label: 'Email address', id: 'forgot-email' },
  { file: 'platform/src/pages/ResetPassword.jsx', label: 'New password', id: 'reset-password' },
  { file: 'platform/src/pages/ResetPassword.jsx', label: 'Confirm password', id: 'reset-password-confirm' },
  { file: 'platform/src/pages/Register.jsx', label: 'Full name', id: 'register-name' },
  { file: 'platform/src/pages/Register.jsx', label: 'Email', id: 'register-email' },
  { file: 'platform/src/pages/Register.jsx', label: 'Password', id: 'register-password' },
];

describe('platform auth form labels', () => {
  for (const { file, label, id } of pairs) {
    it(`has htmlFor="${id}" and id="${id}" in ${file}`, () => {
      const src = readFileSync(resolve(file), 'utf8');
      expect(src).toContain(`htmlFor="${id}"`);
      expect(src).toContain(`id="${id}"`);
    });
  }
});
