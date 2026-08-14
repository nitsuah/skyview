import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function AuthGuard({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Navigate to="/app/login" replace />

  if (role && user.role !== role && user.role !== 'admin') {
    const fallback = user.role === 'operator' ? '/app/operator/dashboard' : '/app/dashboard'
    return <Navigate to={fallback} replace />
  }

  return children
}
