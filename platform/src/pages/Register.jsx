import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const ROLES = [
  {
    value: 'client',
    icon: '📋',
    title: 'I need drone services',
    desc: 'Post jobs, browse verified operators, and book shoots.'
  },
  {
    value: 'operator',
    icon: '🚁',
    title: 'I\'m a licensed operator',
    desc: 'List your services, get matched with clients, and earn.'
  }
]

export default function Register() {
  const { register, logout } = useAuth()
  const navigate = useNavigate()
  const initialRole = new URLSearchParams(window.location.search).get('role') === 'operator' ? 'operator' : 'client'
  const [form, setForm]     = useState({ name: '', email: '', password: '', role: initialRole })
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [verifyEmail, setVerifyEmail] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setBusy(true); setError('')
    try {
      await register(form)
      // Clear the session immediately — account isn't active until email is verified
      await logout()
      setVerifyEmail(form.email)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (verifyEmail) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 480, textAlign: 'center' }}>
          <a href="/" className="auth-logo">
            <span className="brand-mark">⬡</span>
            <span className="brand-name">SkyView</span>
          </a>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📬</div>
          <h1 style={{ marginBottom: '0.5rem' }}>Check your inbox</h1>
          <p className="text-muted" style={{ fontSize: 14, marginBottom: '1.5rem' }}>
            We sent a verification link to <strong>{verifyEmail}</strong>.<br />
            Click it to activate your account.
          </p>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Didn't get it? Check spam, or{' '}
            <Link to="/app/login" className="link">sign in</Link> to resend.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <a href="/" className="auth-logo">
          <span className="brand-mark">⬡</span>
          <span className="brand-name">SkyView</span>
        </a>

        <h1 style={{ marginBottom: '0.25rem' }}>Create account</h1>
        <p className="text-muted mb-3" style={{ fontSize: 13.5 }}>
          Already have one? <Link to="/app/login" className="link">Sign in</Link>
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="role-grid mb-2">
            {ROLES.map(r => (
              <label key={r.value} className={`role-option${form.role === r.value ? ' selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, role: r.value }))}>
                <input type="radio" name="role" value={r.value} />
                <div className="role-icon">{r.icon}</div>
                <div className="role-title">{r.title}</div>
                <div className="role-desc">{r.desc}</div>
              </label>
            ))}
          </div>

          <div className="form-group">
            <label>Full name</label>
            <input type="text" value={form.name} placeholder="Your name" required
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} placeholder="you@example.com" required
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} placeholder="8+ characters" required minLength={8}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="oauth-divider"><span>or</span></div>

        <a href={`/api/auth/google?role=${form.role}`} className="btn btn-google btn-full">
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>
      </div>
    </div>
  )
}
