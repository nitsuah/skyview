import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

const VERIFY_STATUS = {
  pending:      { label: 'Profile incomplete',     class: 'badge-pending' },
  under_review: { label: 'Under review',           class: 'badge-under_review' },
  verified:     { label: 'Verified',               class: 'badge-verified' },
  suspended:    { label: 'Suspended',              class: 'badge-suspended' }
}

export default function OperatorDashboard() {
  const { user } = useAuth()
  const [jobs, setJobs]         = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)

  const profile = user?.profile || {}
  const vstatus = profile.verification_status || 'pending'

  useEffect(() => {
    Promise.all([
      api.jobs.list().catch(() => []),
      api.bookings.list().catch(() => [])
    ]).then(([j, b]) => {
      setJobs(j)
      setBookings(b)
    }).finally(() => setLoading(false))
  }, [])

  const earnings = bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (b.operator_payout_cents || 0), 0)

  return (
    <>
      <div className="flex-between mb-3">
        <div>
          <h1 className="page-title">Operator Dashboard</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>Welcome back, {user?.name}</p>
        </div>
        <Link to="/app/operator/onboarding" className="btn btn-ghost btn-sm">Edit Profile</Link>
      </div>

      {/* Verification banner */}
      {vstatus !== 'verified' && (
        <div className="verify-banner">
          <div className="verify-banner-icon">
            {vstatus === 'suspended' ? '🚫' : vstatus === 'under_review' ? '⏳' : '⚠️'}
          </div>
          <div className="verify-banner-body">
            <h3>{VERIFY_STATUS[vstatus]?.label}</h3>
            <p>
              {vstatus === 'pending'      && 'Complete your profile and upload your FAA Part 107 certificate to start receiving jobs.'}
              {vstatus === 'under_review' && 'Your certificate is being reviewed. You\'ll receive an email within 24 hours.'}
              {vstatus === 'suspended'    && 'Your listing has been suspended. This is usually due to an expired FAA certificate. Upload a renewal to reactivate.'}
            </p>
            {(vstatus === 'pending' || vstatus === 'suspended') && (
              <Link to="/app/operator/onboarding" className="link" style={{ fontSize: 13, marginTop: '0.5rem', display: 'inline-block' }}>
                {vstatus === 'pending' ? 'Complete Setup →' : 'Upload renewal →'}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{jobs.length}</div>
          <div className="stat-label">Jobs in your area</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{bookings.filter(b => ['pending','confirmed','in_progress'].includes(b.status)).length}</div>
          <div className="stat-label">Active Bookings</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${(earnings / 100).toFixed(0)}</div>
          <div className="stat-label">Total Earned</div>
        </div>
      </div>

      {/* Available jobs */}
      <div className="section-title">Available Jobs Near You</div>
      {loading && <div className="text-muted">Loading…</div>}
      {!loading && jobs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          {vstatus !== 'verified'
            ? <p className="text-muted">Verify your account to see jobs in your area.</p>
            : <p className="text-muted">No open jobs in your service area right now. Check back soon — you'll be emailed when new ones arrive.</p>
          }
        </div>
      )}
      {!loading && jobs.length > 0 && (
        <div className="card" style={{ padding: 0, marginBottom: '2rem' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Service</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Budget</th>
                  <th>Distance</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id}>
                    <td style={{ fontWeight: 500 }}>{job.title}</td>
                    <td style={{ textTransform: 'capitalize' }}>{job.service_type?.replace('_',' ')}</td>
                    <td className="text-muted">{job.location_address || '—'}</td>
                    <td className="text-muted">{job.preferred_date ? new Date(job.preferred_date).toLocaleDateString() : '—'}</td>
                    <td className="text-muted">{job.budget_cents ? `$${(job.budget_cents/100).toFixed(0)}` : '—'}</td>
                    <td className="text-muted">{job.distance_miles ? `${Math.round(job.distance_miles)} mi` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent bookings */}
      {bookings.length > 0 && (
        <>
          <div className="section-title">Recent Bookings</div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Job</th><th>Client</th><th>Date</th><th>Payout</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 10).map(b => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 500 }}>{b.title}</td>
                      <td className="text-muted">{b.client_name}</td>
                      <td className="text-muted">{b.scheduled_at ? new Date(b.scheduled_at).toLocaleDateString() : '—'}</td>
                      <td className="text-accent" style={{ fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums' }}>
                        {b.operator_payout_cents ? `$${(b.operator_payout_cents/100).toFixed(0)}` : '—'}
                      </td>
                      <td><span className={`badge badge-${b.status}`}>{b.status.replace('_',' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}
