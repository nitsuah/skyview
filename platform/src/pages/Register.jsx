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
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]   = useState({ name: '', email: '', password: '', role: 'client' })
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setBusy(true); setError('')
    try {
      const user = await register(form)
      navigate(user.role === 'operator' ? '/app/operator/onboarding' : '/app/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
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
      </div>
    </div>
  )
}
