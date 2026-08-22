import { createContext, useContext, useState, useEffect } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If the OAuth callback redirected here with ?oauth=1, flush any stale bearer
    // token so it can't mask the new HttpOnly session cookie.
    const params = new URLSearchParams(window.location.search)
    if (params.get('oauth') === '1') {
      localStorage.removeItem('skyview_token')
      window.history.replaceState({}, '', window.location.pathname)
    }
    // Always call /me — covers both localStorage tokens (email/password) and
    // HttpOnly session cookies (Google OAuth). The cookie is sent automatically
    // for same-origin requests; no JS token read required.
    api.auth.me()
      .then(setUser)
      .catch(() => localStorage.removeItem('skyview_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { user, token } = await api.auth.login({ email, password })
    localStorage.setItem('skyview_token', token)
    setUser(user)
    return user
  }

  const register = async (data) => {
    const { user, token } = await api.auth.register(data)
    localStorage.setItem('skyview_token', token)
    setUser(user)
    return user
  }

  const logout = async () => {
    // Clear local state first so the UI reflects logout immediately
    localStorage.removeItem('skyview_token')
    setUser(null)
    // Clear the HttpOnly session cookie server-side; propagate failures to callers
    await api.auth.logout()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
