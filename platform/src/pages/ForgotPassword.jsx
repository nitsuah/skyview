import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await api.auth.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📬</div>
          <h1 style={{ fontSize: 20, marginBottom: '0.5rem' }}>Check your email</h1>
          <p className="text-muted" style={{ fontSize: 13.5, marginBottom: '1.5rem' }}>
            If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly. Check your spam folder if you don't see it.
          </p>
          <Link to="/app/login" className="btn btn-ghost">← Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div className="sidebar-brand" style={{ marginBottom: '1.5rem', display: 'block' }}>
          <span className="brand-mark">⬡</span>
          <span className="brand-name" style={{ marginLeft: 6 }}>SkyView</span>
        </div>
        <h1 style={{ fontSize: 20, marginBottom: '0.25rem' }}>Forgot password</h1>
        <p className="text-muted" style={{ fontSize: 13.5, marginBottom: '1.5rem' }}>
          Enter your email and we'll send a reset link.
        </p>

        {error && <div className="alert alert-error mb-2">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email address</label>
            <input
              type="email"
              autoFocus
              required
              value={email}
              placeholder="you@example.com"
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="text-muted" style={{ fontSize: 13, marginTop: '1rem', textAlign: 'center' }}>
          <Link to="/app/login">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
