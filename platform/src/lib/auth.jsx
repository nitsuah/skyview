import { createContext, useContext, useState, useEffect } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sessions live in the HttpOnly cookie only. Drop the token older builds
    // kept in localStorage, and the ?oauth=1 marker from the Google redirect.
    localStorage.removeItem('skyview_token')
    if (new URLSearchParams(window.location.search).get('oauth') === '1') {
      window.history.replaceState({}, '', window.location.pathname)
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
