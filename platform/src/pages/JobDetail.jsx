import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function JobDetail() {
  const { id }       = useParams()
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const [job, setJob]           = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  // Review form state
  const [reviewBookingId, setReviewBookingId] = useState(null)
  const [rating, setRating]     = useState(5)
  const [comment, setComment]   = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewError, setReviewError]   = useState('')
  const [reviewDone, setReviewDone]     = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.jobs.get(id),
      api.bookings.list()
    ])
      .then(([j, all]) => {
        setJob(j)
        setBookings(all.filter(b => b.job_id === id))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const markComplete = async (bookingId) => {
    try {
      await api.bookings.complete(bookingId)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const submitReview = async (e) => {
    e.preventDefault()
    setReviewSaving(true); setReviewError('')
    try {
      const booking = bookings.find(b => b.id === reviewBookingId)
      await api.reviews.submit({
        booking_id:  reviewBookingId,
        operator_id: booking.operator_id,
        rating,
        comment
      })
      setReviewDone(true)
      setReviewBookingId(null)
    } catch (err) {
      setReviewError(err.message)
    } finally {
      setReviewSaving(false)
    }
  }

  if (loading) return <div className="text-muted" style={{ padding: '2rem' }}>Loading…</div>
  if (error)   return <div className="alert alert-error">{error}</div>
  if (!job)    return null

  const completedBookings = bookings.filter(b => b.status === 'completed')
  const activeBooking     = bookings.find(b => b.status === 'confirmed')

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/app/dashboard" className="btn btn-ghost btn-sm" style={{ marginBottom: '0.75rem' }}>
          ← Back to dashboard
        </Link>
        <div className="flex-between">
          <div>
            <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>{job.title}</h1>
            <span className={`badge badge-${job.status}`} style={{ marginTop: 2 }}>
              {job.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          <div className="card mb-2">
            <div className="section-title">Job Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: 13.5 }}>
              <div><span className="text-muted">Service</span><br /><strong style={{ textTransform: 'capitalize' }}>{job.service_type?.replace('_', ' ')}</strong></div>
              <div><span className="text-muted">Date</span><br /><strong>{job.preferred_date ? new Date(job.preferred_date).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '—'}</strong></div>
              <div><span className="text-muted">Budget</span><br /><strong>{job.budget_cents ? `$${(job.budget_cents / 100).toFixed(0)}` : 'Open'}</strong></div>
              <div><span className="text-muted">Location</span><br /><strong>{job.location_address || '—'}</strong></div>
            </div>
            {job.description && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <span className="text-muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Description</span>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{job.description}</p>
              </div>
            )}
          </div>

          {/* Bookings on this job */}
          {bookings.length > 0 && (
            <div className="card mb-2">
              <div className="section-title">Bookings ({bookings.length})</div>
              {bookings.map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{b.operator_name || 'Operator'}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      ${(b.total_cents / 100).toFixed(0)} total · ${(b.operator_payout_cents / 100).toFixed(0)} payout
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`badge badge-${b.status}`}>{b.status.replace('_', ' ')}</span>
                    {b.status === 'confirmed' && user?.role === 'client' && (
                      <button className="btn btn-sm btn-primary" onClick={() => markComplete(b.id)}>
                        Mark Complete
                      </button>
                    )}
                    {b.status === 'completed' && !reviewDone && (
                      <button className="btn btn-sm btn-ghost"
                        onClick={() => setReviewBookingId(reviewBookingId === b.id ? null : b.id)}>
                        {reviewBookingId === b.id ? 'Cancel' : 'Leave Review'}
                      </button>
                    )}
                    {reviewDone && b.status === 'completed' && (
                      <span className="text-muted" style={{ fontSize: 12 }}>Review submitted ✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Review form */}
          {reviewBookingId && (
            <div className="card">
              <div className="section-title">Leave a Review</div>
              {reviewError && <div className="alert alert-error mb-2">{reviewError}</div>}
              <form onSubmit={submitReview}>
                <div className="form-group">
                  <label>Rating</label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 22, color: n <= rating ? 'var(--amber, #f59e0b)' : 'var(--border)',
                          padding: '0 2px'
                        }}
                        onClick={() => setRating(n)}>
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Comment <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                  <textarea value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="How was the experience?" rows={3} />
                </div>
                <button className="btn btn-primary" disabled={reviewSaving}>
                  {reviewSaving ? 'Submitting…' : 'Submit Review'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <div className="section-title">Actions</div>
            {job.status === 'open' && user?.role === 'client' && (
              <Link to="/app/operators" className="btn btn-primary" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'center' }}>
                Find an Operator
              </Link>
            )}
            {!activeBooking && completedBookings.length === 0 && job.status === 'open' && (
              <p className="text-muted" style={{ fontSize: 12.5 }}>
                Browse operators and book one for this job.
              </p>
            )}
            {activeBooking && (
              <div className="alert alert-info" style={{ fontSize: 12.5 }}>
                Booking confirmed with <strong>{activeBooking.operator_name}</strong>. Mark complete when finished.
              </div>
            )}
            {job.status === 'completed' && (
              <div className="alert alert-info" style={{ fontSize: 12.5 }}>
                This job is complete.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
