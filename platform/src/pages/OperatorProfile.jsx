import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function OperatorProfile() {
  const { id }          = useParams()
  const { user }        = useAuth()
  const [op, setOp]     = useState(null)
  const [reviews, setReviews]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    Promise.all([
      api.operators.get(id),
      api.reviews.list(id)
    ])
      .then(([o, r]) => { setOp(o); setReviews(r) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-muted" style={{ padding: '2rem' }}>Loading…</div>
  if (error)   return <div className="alert alert-error">{error}</div>
  if (!op)     return null

  const avgRating = op.avg_rating > 0 ? Number(op.avg_rating).toFixed(1) : null

  return (
    <>
      <div className="mb-3">
        <Link to="/app/operators" className="btn btn-ghost btn-sm" style={{ marginBottom: '0.75rem' }}>
          ← Back to operators
        </Link>
        <div className="flex-between">
          <div>
            <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>{op.name}</h1>
            {avgRating ? (
              <span style={{ color: 'var(--amber, #f59e0b)', fontSize: 14 }}>
                {'★'.repeat(Math.round(Number(op.avg_rating)))} {avgRating}
                <span className="text-muted" style={{ fontWeight: 400 }}>
                  {' '}· {op.review_count} {Number(op.review_count) === 1 ? 'review' : 'reviews'}
                </span>
              </span>
            ) : (
              <span className="text-muted" style={{ fontSize: 13 }}>No reviews yet</span>
            )}
          </div>
          {user?.role === 'client' && (
            <Link to="/app/jobs/new" className="btn btn-primary">Request This Operator</Link>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Main column */}
        <div>
          {op.bio && (
            <div className="card mb-2">
              <div className="section-title">About</div>
              <p style={{ fontSize: 14, lineHeight: 1.65, margin: 0 }}>{op.bio}</p>
            </div>
          )}

          <div className="card">
            <div className="section-title">
              Reviews{reviews.length > 0 ? ` (${reviews.length})` : ''}
            </div>
            {reviews.length === 0 && (
              <p className="text-muted" style={{ fontSize: 13.5, margin: 0 }}>No reviews yet.</p>
            )}
            {reviews.map((r, i) => (
              <div key={r.id} style={{
                paddingBottom: '1.25rem', marginBottom: '1.25rem',
                borderBottom: i < reviews.length - 1 ? '1px solid var(--border)' : 'none'
              }}>
                <div className="flex-between mb-1">
                  <strong style={{ fontSize: 13.5 }}>{r.reviewer_name}</strong>
                  <span style={{ color: 'var(--amber, #f59e0b)', fontSize: 14 }}>
                    {'★'.repeat(r.rating)}
                  </span>
                </div>
                {r.comment && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 0.25rem' }}>
                    {r.comment}
                  </p>
                )}
                <div className="text-muted" style={{ fontSize: 11.5 }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="card mb-2">
            <div className="section-title">Services</div>
            {op.service_types?.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {op.service_types.map(t => (
                  <span key={t} className="badge" style={{ textTransform: 'capitalize' }}>
                    {t.replace('_', ' ')}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>—</p>
            )}
          </div>

          <div className="card mb-2">
            <div className="section-title">Rates</div>
            {op.base_rate_cents ? (
              <div style={{ fontSize: 14 }}>
                From <strong>${(op.base_rate_cents / 100).toFixed(0)}</strong>
              </div>
            ) : (
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>Contact for quote</p>
            )}
            {op.hourly_rate_cents > 0 && (
              <div className="text-muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                ${(op.hourly_rate_cents / 100).toFixed(0)}/hr
              </div>
            )}
          </div>

          {op.equipment && (
            <div className="card mb-2">
              <div className="section-title">Equipment</div>
              <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>{op.equipment}</p>
            </div>
          )}

          <div className="card">
            <div className="section-title">Coverage</div>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: op.booking_url ? '0.75rem' : 0 }}>
              Up to {op.coverage_radius_mi || 50} mile radius
            </p>
            {op.booking_url && (
              <a href={op.booking_url} target="_blank" rel="noreferrer"
                className="btn btn-ghost btn-sm" style={{ display: 'inline-block' }}>
                External booking →
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
