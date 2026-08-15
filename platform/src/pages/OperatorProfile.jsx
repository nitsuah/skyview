import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function OperatorProfile() {
  const { id }        = useParams()
  const { user }      = useAuth()
  const [op, setOp]   = useState(null)
  const [reviews, setReviews]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  // Booking modal state
  const [showBook, setShowBook]     = useState(false)
  const [jobs, setJobs]             = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [selectedJob, setSelectedJob] = useState('')
  const [totalDollars, setTotalDollars] = useState('')
  const [bookError, setBookError]   = useState('')
  const [bookSaving, setBookSaving] = useState(false)
  const [bookDone, setBookDone]     = useState(false)

  useEffect(() => {
    Promise.all([
      api.operators.get(id),
      api.reviews.list(id)
    ])
      .then(([o, r]) => { setOp(o); setReviews(r) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const openBookModal = async () => {
    setShowBook(true); setBookError(''); setBookDone(false)
    if (jobs.length === 0) {
      setJobsLoading(true)
      try {
        const all = await api.jobs.list()
        setJobs(all.filter(j => j.status === 'open'))
      } catch (e) {
        setBookError(e.message)
      } finally {
        setJobsLoading(false)
      }
    }
  }

  const submitBooking = async (e) => {
    e.preventDefault()
    if (!selectedJob)   { setBookError('Select a job'); return }
    if (!totalDollars || parseFloat(totalDollars) <= 0) { setBookError('Enter a valid total amount'); return }
    setBookSaving(true); setBookError('')
    try {
      await api.bookings.create({
        job_id:      selectedJob,
        operator_id: id,
        total_cents: Math.round(parseFloat(totalDollars) * 100)
      })
      setBookDone(true)
    } catch (err) {
      setBookError(err.message)
    } finally {
      setBookSaving(false)
    }
  }

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
            <button className="btn btn-primary" onClick={openBookModal}>
              Book This Operator
            </button>
          )}
        </div>
      </div>

      {/* Booking modal */}
      {showBook && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }} onClick={e => { if (e.target === e.currentTarget) setShowBook(false) }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', margin: '0 1rem' }}>
            {bookDone ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎉</div>
                <h2 style={{ marginBottom: '0.5rem' }}>Booking request sent!</h2>
                <p className="text-muted" style={{ fontSize: 13.5, marginBottom: '1.5rem' }}>
                  <strong>{op.name}</strong> will confirm or decline. You'll see the status in <Link to="/app/bookings">My Bookings</Link>.
                </p>
                <button className="btn btn-ghost" onClick={() => setShowBook(false)}>Close</button>
              </div>
            ) : (
              <>
                <div className="flex-between mb-2">
                  <h2 style={{ fontSize: 17 }}>Book {op.name}</h2>
                  <button onClick={() => setShowBook(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>✕</button>
                </div>

                {bookError && <div className="alert alert-error mb-2">{bookError}</div>}

                <form onSubmit={submitBooking}>
                  <div className="form-group">
                    <label>Select one of your open jobs</label>
                    {jobsLoading ? (
                      <p className="text-muted" style={{ fontSize: 13 }}>Loading your jobs…</p>
                    ) : jobs.length === 0 ? (
                      <div className="alert alert-info" style={{ fontSize: 13 }}>
                        You have no open jobs. <Link to="/app/jobs/new">Post a job</Link> first.
                      </div>
                    ) : (
                      <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} required>
                        <option value="">— Choose a job —</option>
                        {jobs.map(j => (
                          <option key={j.id} value={j.id}>{j.title}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Agreed total (USD)</label>
                    <div className="currency-wrap">
                      <span className="currency-prefix">$</span>
                      <input type="number" className="currency-input"
                        value={totalDollars} min={1} step={0.01}
                        placeholder={op.base_rate_cents ? (op.base_rate_cents / 100).toFixed(0) : 'e.g. 350'}
                        onChange={e => setTotalDollars(e.target.value)}
                        required />
                    </div>
                    {op.base_rate_cents > 0 && (
                      <small className="text-muted">This operator's base rate is ${(op.base_rate_cents / 100).toFixed(0)}</small>
                    )}
                  </div>
                  <div className="alert alert-info mb-2" style={{ fontSize: 12 }}>
                    SkyView charges a 15% platform fee. The operator receives 85% of the total.
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-primary" disabled={bookSaving || jobs.length === 0}>
                      {bookSaving ? 'Sending…' : 'Send Booking Request'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowBook(false)}>Cancel</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

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
