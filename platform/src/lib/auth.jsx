import { createContext, useContext, useState, useEffect } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If the OAuth callback redirected here with ?oauth=1, flush any stale
    // skyview_token from localStorage so it can't mask the new HttpOnly session
    // cookie on subsequent requests.
    const params = new URLSearchParams(window.location.search)
    if (params.get('oauth') === '1') {
      localStorage.removeItem('skyview_token')
      window.history.replaceState({}, '', window.location.pathname)
    }
    // Legacy migration: remove any leftover skyview_token from the old
    // email/password flow (we now use HttpOnly cookies for all auth).
    if (localStorage.getItem('skyview_token')) {
      localStorage.removeItem('skyview_token')
    }
    // Call /me — the HttpOnly session cookie is sent automatically for
    // same-origin requests; no JS token read required.
    api.auth.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { user } = await api.auth.login({ email, password })
    setUser(user)
    return user
  }

  const register = async (data) => {
    const { user } = await api.auth.register(data)
    setUser(user)
    return user
  }

  const logout = async () => {
    try {
      await api.auth.logout()
    } finally {
      setUser(null)
    }
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
