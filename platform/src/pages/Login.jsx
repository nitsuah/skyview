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

  const params   = new URLSearchParams(location.search)
  const verified = params.get('verified')
  const reset    = params.get('reset')
  const oauthErr = params.get('error') === 'oauth_failed'      ? 'Google sign-in failed — please try again.'
                 : params.get('error') === 'account_disabled'   ? 'Your account has been disabled. Contact support.'
                 : null

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
        {reset && (
          <div className="alert alert-success mb-2">Password updated — sign in with your new password.</div>
        )}
        {oauthErr && (
          <div className="alert alert-error mb-2">{oauthErr}</div>
        )}
        {error && (
          <div className="alert alert-error">
            {error}
            {error.includes('verify your email') && (
              <div style={{ marginTop: '0.5rem', fontSize: 12.5 }}>
                <Link to="/app/verify-email" className="link">Resend verification email →</Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} placeholder="you@example.com" required
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label>Password</label>
              <Link to="/app/forgot-password" className="link" style={{ fontSize: 12.5 }}>Forgot password?</Link>
            </div>
            <input type="password" value={form.password} placeholder="········" required
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="oauth-divider"><span>or</span></div>

        <a href="/api/auth/google" className="btn btn-google btn-full">
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
