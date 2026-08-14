import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { AuthGuard } from './components/AuthGuard'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ClientDashboard from './pages/ClientDashboard'
import PostJob from './pages/PostJob'
import OperatorOnboarding from './pages/OperatorOnboarding'
import OperatorDashboard from './pages/OperatorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import './styles/app.css'

function RoleRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!user)                return <Navigate to="/app/login" replace />
  if (user.role === 'operator') return <Navigate to="/app/operator/dashboard" replace />
  if (user.role === 'admin')    return <Navigate to="/app/admin" replace />
  return <Navigate to="/app/dashboard" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root redirect */}
          <Route path="/app" element={<RoleRedirect />} />
          <Route path="/app/" element={<RoleRedirect />} />

          {/* Auth */}
          <Route path="/app/login"    element={<Login />} />
          <Route path="/app/register" element={<Register />} />

          {/* Client routes */}
          <Route path="/app/dashboard" element={
            <AuthGuard role="client"><Layout><ClientDashboard /></Layout></AuthGuard>
          } />
          <Route path="/app/jobs/new" element={
            <AuthGuard role="client"><Layout><PostJob /></Layout></AuthGuard>
          } />

          {/* Operator routes */}
          <Route path="/app/operator/onboarding" element={
            <AuthGuard role="operator"><Layout><OperatorOnboarding /></Layout></AuthGuard>
          } />
          <Route path="/app/operator/dashboard" element={
            <AuthGuard role="operator"><Layout><OperatorDashboard /></Layout></AuthGuard>
          } />

          {/* Admin */}
          <Route path="/app/admin" element={
            <AuthGuard role="admin"><Layout><AdminDashboard /></Layout></AuthGuard>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
