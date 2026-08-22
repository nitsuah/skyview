import { createContext, useContext, useState, useEffect } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    localStorage.removeItem('skyview_token')
    setUser(null)
    // Ask server to clear the HttpOnly session cookie (Google OAuth sessions)
    try { await api.auth.logout() } catch {}
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
