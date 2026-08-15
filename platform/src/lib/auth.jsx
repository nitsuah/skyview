import { createContext, useContext, useState, useEffect } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('skyview_token')
    if (!token) { setLoading(false); return }

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

  const logout = () => {
    localStorage.removeItem('skyview_token')
    setUser(null)
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
