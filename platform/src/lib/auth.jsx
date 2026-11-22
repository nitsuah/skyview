import { createContext, useContext, useState, useEffect } from 'react'
import { api } from './api'
import { startSession, signOut } from './session'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sessions live in the HttpOnly cookie only; the browser never stores a token.
    startSession({
      getStorage: () => window.localStorage,
      location: window.location,
      history: window.history,
      me: api.auth.me,
      setUser,
      setLoading,
    })
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

  const logout = () => signOut({ logout: api.auth.logout, setUser })

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
