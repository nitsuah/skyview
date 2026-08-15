import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

const STATUS_COLOR = {
  pending:     'badge-open',
  confirmed:   'badge-booked',
  in_progress: 'badge-booked',
  completed:   'badge-completed',
  cancelled:   'badge-cancelled',
  disputed:    'badge-cancelled'
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    api.bookings.list()
      .then(setBookings)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const complete = async (id) => {
    try {
      await api.bookings.complete(id)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'completed' } : b))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <h1 className="page-title">My Bookings</h1>
      <p className="page-sub">All bookings associated with your jobs.</p>

      {loading && <div className="text-muted">Loading…</div>}
      {error   && <div className="alert alert-error">{error}</div>}

      {!loading && bookings.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📦</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No bookings yet</h3>
          <p className="text-muted mb-2" style={{ fontSize: 13.5 }}>
            Post a job, then book a verified operator.
          </p>
          <Link to="/app/operators" className="btn btn-primary">Find Operators</Link>
        </div>
      )}

      {!loading && bookings.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Operator</th>
                  <th>Total</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 500 }}>
                      <Link to={`/app/jobs/${b.job_id}`} style={{ color: 'var(--accent)' }}>
                        {b.job_title || 'View job'}
                      </Link>
                    </td>
                    <td>{b.operator_name || '—'}</td>
                    <td className="text-muted">{b.total_cents ? `$${(b.total_cents / 100).toFixed(0)}` : '—'}</td>
                    <td className="text-muted">
                      {b.scheduled_at ? new Date(b.scheduled_at).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_COLOR[b.status] || ''}`}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {b.status === 'confirmed' && (
                        <button className="btn btn-sm btn-primary" onClick={() => complete(b.id)}>
                          Mark Complete
                        </button>
                      )}
                      {b.status === 'completed' && (
                        <Link to={`/app/jobs/${b.job_id}`} className="btn btn-sm btn-ghost">
                          Leave Review
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
