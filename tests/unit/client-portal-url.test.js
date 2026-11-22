import { describe, it, expect, vi, beforeEach } from 'vitest';

// The email-link flow must not leave the access code in the address bar/history.
const html = `
  <div id="loginView"><div id="warningMessage"></div><div id="errorMessage"></div>
  <form id="loginForm"><input id="accessCode"><div id="attemptCounter"></div>
  <button id="submitBtn" type="submit"></button></form></div><div id="loadingView"></div>`;

const loadPortalScript = async (search, hash = '') => {
  document.body.innerHTML = html;
  window.history.replaceState({}, '', `/pages/client-portal.html${search}${hash}`);
  vi.resetModules();
  await import('../../scripts/client-portal.js');
};

beforeEach(() => {
  globalThis.fetch = vi.fn(() => new Promise(() => {})); // never settles; only the URL matters
});

describe('client portal ?code= handling', () => {
  const future = Math.floor(Date.now() / 1000) + 3600;

  it('removes the code from the URL and waits for a click before submitting it', async () => {
    const spy = vi.spyOn(window.history, 'replaceState');
    await loadPortalScript(`?code=Y2xpZW50.${future}.abcdef`);
    expect(window.location.search).toBe('');
    expect(window.location.href).not.toContain('abcdef');
    expect(spy).toHaveBeenCalled();
    expect(document.getElementById('accessCode').value).toBe(`Y2xpZW50.${future}.abcdef`);
    // Not spent on page load; only an explicit submit sends it.
    expect(globalThis.fetch).not.toHaveBeenCalled();
    document.getElementById('loginForm').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body).code).toBe(`Y2xpZW50.${future}.abcdef`);
  });

  it('keeps unrelated query parameters and the hash', async () => {
    await loadPortalScript(`?utm_source=mail&code=Y2xpZW50.${future}.abcdef`, '#top');
    expect(window.location.search).toBe('?utm_source=mail');
    expect(window.location.hash).toBe('#top');
  });

  it('also strips an expired code', async () => {
    await loadPortalScript('?code=Y2xpZW50.1.abcdef');
    expect(window.location.search).toBe('');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('leaves the URL alone when there is no code', async () => {
    await loadPortalScript('?utm_source=mail');
    expect(window.location.search).toBe('?utm_source=mail');
  });
});
