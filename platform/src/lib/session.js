// Session start-up and sign-out rules for the platform app, kept free of React
// so they can be tested directly (tests/unit/session-cookie.test.js).

/**
 * Start a session: drop the token older builds kept in storage (best effort:
 * blocked storage must not stop start-up), strip the ?oauth=1 marker, then ask
 * the server who is signed in. Always ends with setLoading(false).
 */
export async function startSession({ getStorage, location, history, me, setUser, setLoading }) {
  try {
    // Even reading window.localStorage throws when storage is blocked.
    getStorage()?.removeItem('skyview_token')
  } catch {
    // Storage blocked by browser policy: nothing to clean up.
  }
  try {
    if (new URLSearchParams(location?.search || '').get('oauth') === '1') {
      history?.replaceState({}, '', location.pathname)
    }
  } catch {
    // Cosmetic only.
  }
  try {
    setUser(await me())
  } catch {
    // Not signed in (or the request failed): stay signed out.
  } finally {
    setLoading(false)
  }
}

/**
 * Sign out: clear local state only after the server has cleared the session
 * cookie. On failure the error propagates and the user stays signed in, which
 * matches the still-valid server session.
 */
export async function signOut({ logout, setUser }) {
  await logout()
  setUser(null)
}
