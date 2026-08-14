import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const NAV = {
  client:   [{ to: '/app/dashboard', label: 'Dashboard' }, { to: '/app/jobs/new', label: 'Post a Job' }],
  operator: [{ to: '/app/operator/dashboard', label: 'Dashboard' }, { to: '/app/operator/onboarding', label: 'My Profile' }],
  admin:    [{ to: '/app/admin', label: 'Admin' }]
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const links = NAV[user?.role] || []

  const handleLogout = () => {
    logout()
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
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </nav>

        <button onClick={handleLogout} className="logout-btn">Sign out</button>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  )
}
