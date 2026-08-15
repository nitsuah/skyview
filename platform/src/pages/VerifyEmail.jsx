import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const verified = params.get('verified') === '1'
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [sending, setSending] = useState(false)
  const [resendError, setResendError] = useState('')

  const resend = async (e) => {
    e.preventDefault()
    if (!email) return
    setSending(true); setResendError('')
    try {
      await api.auth.resendVerification(email)
      setSent(true)
    } catch (err) {
      setResendError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="card" style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        {verified ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h1 style={{ fontSize: 22, marginBottom: '0.5rem' }}>Email verified!</h1>
            <p className="text-muted" style={{ fontSize: 13.5, marginBottom: '1.5rem' }}>
              Your account is confirmed. Sign in to get started.
            </p>
            <Link to="/app/login" className="btn btn-primary">Sign in</Link>
          </>
        ) : (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
            <h1 style={{ fontSize: 22, marginBottom: '0.5rem' }}>Check your email</h1>
            <p className="text-muted" style={{ fontSize: 13.5, marginBottom: '1.5rem' }}>
              We sent a verification link to your email address. Click it to activate your account. Check your spam folder if you don't see it.
            </p>

            {sent ? (
              <p className="text-muted" style={{ fontSize: 13 }}>
                ✓ Resent. Check your inbox (and spam).
              </p>
            ) : (
              <form onSubmit={resend} style={{ textAlign: 'left' }}>
                <p className="text-muted" style={{ fontSize: 12.5, marginBottom: '0.75rem', textAlign: 'center' }}>
                  Didn't get it? Enter your email to resend.
                </p>
                {resendError && <div className="alert alert-error mb-2" style={{ fontSize: 12.5 }}>{resendError}</div>}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="email" required placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    style={{ flex: 1 }} />
                  <button className="btn btn-ghost" disabled={sending}>
                    {sending ? '…' : 'Resend'}
                  </button>
                </div>
              </form>
            )}

            <p className="text-muted" style={{ fontSize: 12.5, marginTop: '1rem' }}>
              <Link to="/app/login">← Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
