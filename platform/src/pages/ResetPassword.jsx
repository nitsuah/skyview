import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function ResetPassword() {
  const [params]      = useSearchParams()
  const token         = params.get('token') || ''
  const navigate      = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔗</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Invalid link</h2>
          <p className="text-muted" style={{ fontSize: 13.5, marginBottom: '1.5rem' }}>
            This reset link is missing or malformed. Request a new one.
          </p>
          <Link to="/app/forgot-password" className="btn btn-primary">Request new link</Link>
        </div>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    try {
      await api.auth.resetPassword(token, password)
      navigate('/app/login?reset=1', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <span className="brand-mark">⬡</span>
          <span className="brand-name" style={{ marginLeft: 6 }}>SkyView</span>
        </div>
        <h1 style={{ fontSize: 20, marginBottom: '0.25rem' }}>Set new password</h1>
        <p className="text-muted" style={{ fontSize: 13.5, marginBottom: '1.5rem' }}>
          Choose a strong password for your account.
        </p>

        {error && <div className="alert alert-error mb-2">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>New password</label>
            <input
              type="password"
              autoFocus
              required
              minLength={8}
              value={password}
              placeholder="At least 8 characters"
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Confirm password</label>
            <input
              type="password"
              required
              value={confirm}
              placeholder="Repeat your password"
              onChange={e => setConfirm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Saving…' : 'Set password'}
          </button>
        </form>
      </div>
    </div>
  )
}
