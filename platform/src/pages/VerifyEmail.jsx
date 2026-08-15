import { useSearchParams, Link } from 'react-router-dom'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const verified = params.get('verified') === '1'

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
              We sent a verification link to your email address. Click it to activate your account.
            </p>
            <p className="text-muted" style={{ fontSize: 12.5 }}>
              Didn't get it? Check your spam folder, or{' '}
              <Link to="/app/login">sign in</Link> — you can re-request the link from there.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
