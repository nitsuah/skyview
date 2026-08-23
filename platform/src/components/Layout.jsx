import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

const NAV = {
  client: [
    { to: '/app/dashboard',       label: 'Dashboard' },
    { to: '/app/jobs/new',        label: 'Post a Job' },
    { to: '/app/operators',       label: 'Find Operators' },
    { to: '/app/bookings',        label: 'My Bookings' },
    { to: '/app/notifications',   label: 'Notifications', badge: true }
  ],
  operator: [
    { to: '/app/operator/dashboard',   label: 'Dashboard' },
    { to: '/app/operator/onboarding',  label: 'My Profile' },
    { to: '/app/notifications',        label: 'Notifications', badge: true }
  ],
  admin: [
    { to: '/app/admin',           label: 'Admin' },
    { to: '/app/notifications',   label: 'Notifications', badge: true }
  ]
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user?.id) return
    api.notifications.list()
      .then(data => setUnread(data.unread_count ?? 0))
      .catch(() => {}) // Non-blocking — badge is bonus UX
  }, [user?.id])

  useEffect(() => {
    const handler = (e) => setUnread(e.detail.unread_count)
    window.addEventListener('notifications-changed', handler)
    return () => window.removeEventListener('notifications-changed', handler)
  }, [])

  const links = NAV[user?.role] || []

  const handleLogout = async () => {
    try { await logout() } catch {}
    navigate('/app/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <a href="/" className="brand-logo">
            <span className="brand-mark">⬡</span>
            <span className="brand-name">SkyView</span>
          </a>
          <div className="user-badge">
            <span className="user-name">{user?.name}</span>
            <span className={`role-chip role-${user?.role}`}>{user?.role}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map(({ to, label, badge }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {label}
              {badge && unread > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--accent)', color: '#fff',
                  borderRadius: '9px', fontSize: 10, fontWeight: 700,
                  minWidth: 17, height: 17, padding: '0 4px', marginLeft: 6
                }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <button onClick={handleLogout} className="logout-btn">Sign out</button>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  )
}
