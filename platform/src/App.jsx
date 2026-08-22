import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { AuthGuard } from './components/AuthGuard'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import ClientDashboard from './pages/ClientDashboard'
import PostJob from './pages/PostJob'
import JobDetail from './pages/JobDetail'
import MyBookings from './pages/MyBookings'
import OperatorOnboarding from './pages/OperatorOnboarding'
import OperatorDashboard from './pages/OperatorDashboard'
import OperatorsDirectory from './pages/OperatorsDirectory'
import OperatorProfile from './pages/OperatorProfile'
import AdminDashboard from './pages/AdminDashboard'
import Notifications from './pages/Notifications'
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
          <Route path="/app"  element={<RoleRedirect />} />
          <Route path="/app/" element={<RoleRedirect />} />

          {/* Auth — public */}
          <Route path="/app/login"           element={<Login />} />
          <Route path="/app/register"        element={<Register />} />
          <Route path="/app/forgot-password" element={<ForgotPassword />} />
          <Route path="/app/reset-password"  element={<ResetPassword />} />
          <Route path="/app/verify-email"    element={<VerifyEmail />} />

          {/* Client routes */}
          <Route path="/app/dashboard" element={
            <AuthGuard role="client"><Layout><ClientDashboard /></Layout></AuthGuard>
          } />
          <Route path="/app/jobs/new" element={
            <AuthGuard role="client"><Layout><PostJob /></Layout></AuthGuard>
          } />
          <Route path="/app/jobs/:id" element={
            <AuthGuard role="client"><Layout><JobDetail /></Layout></AuthGuard>
          } />
          <Route path="/app/bookings" element={
            <AuthGuard role="client"><Layout><MyBookings /></Layout></AuthGuard>
          } />
          <Route path="/app/operators" element={
            <AuthGuard role="client"><Layout><OperatorsDirectory /></Layout></AuthGuard>
          } />
          <Route path="/app/operators/:id" element={
            <AuthGuard role="client"><Layout><OperatorProfile /></Layout></AuthGuard>
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

          {/* Shared */}
          <Route path="/app/notifications" element={
            <AuthGuard><Layout><Notifications /></Layout></AuthGuard>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
