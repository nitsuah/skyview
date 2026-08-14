import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [form, setForm]   = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)

  const verified = new URLSearchParams(location.search).get('verified')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const user = await login(form.email, form.password)
      const dest = user.role === 'operator' ? '/app/operator/dashboard'
                 : user.role === 'admin'    ? '/app/admin'
                 : '/app/dashboard'
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <a href="/" className="auth-logo">
          <span className="brand-mark">⬡</span>
          <span className="brand-name">SkyView</span>
        </a>

        <h1 style={{ marginBottom: '0.25rem' }}>Sign in</h1>
        <p className="text-muted mb-3" style={{ fontSize: 13.5 }}>
          New here? <Link to="/app/register" className="link">Create an account</Link>
        </p>

        {verified && (
          <div className="alert alert-success mb-2">Email verified — you're good to go.</div>
        )}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} placeholder="you@example.com" required
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} placeholder="········" required
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
