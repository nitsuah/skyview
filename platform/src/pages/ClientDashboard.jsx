import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

const STATUS_ORDER = ['open','matched','booked','in_progress','completed','cancelled']

export default function ClientDashboard() {
  const { user } = useAuth()
  const [jobs, setJobs]       = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    Promise.all([api.jobs.list(), api.bookings.list()])
      .then(([j, b]) => { setJobs(j); setBookings(b) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const counts = {
    open:      jobs.filter(j => j.status === 'open').length,
    active:    jobs.filter(j => ['booked','in_progress'].includes(j.status)).length,
    completed: jobs.filter(j => j.status === 'completed').length
  }

  return (
    <>
      <div className="flex-between mb-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>Welcome back, {user?.name}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/operators" className="btn btn-ghost">Browse Operators</Link>
          <Link to="/app/jobs/new" className="btn btn-primary">+ Post a Job</Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{counts.open}</div>
          <div className="stat-label">Open Jobs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{counts.active}</div>
          <div className="stat-label">Active Bookings</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{counts.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      <div className="section-title">Your Jobs</div>

      {loading && <div className="text-muted">Loading…</div>}
      {error   && <div className="alert alert-error">{error}</div>}

      {!loading && jobs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No jobs yet</h3>
          <p className="text-muted mb-2" style={{ fontSize: 13.5 }}>Post your first job to get matched with a verified drone operator.</p>
          <Link to="/app/jobs/new" className="btn btn-primary">Post a Job</Link>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...jobs].sort((a,b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)).map(job => {
                  const jobBookings = bookings.filter(b => b.job_id === job.id)
                  const confirmed   = jobBookings.find(b => b.status === 'confirmed')
                  return (
                    <tr key={job.id}>
                      <td style={{ fontWeight: 500 }}>
                        <Link to={`/app/jobs/${job.id}`} style={{ color: 'var(--accent)' }}>{job.title}</Link>
                        {confirmed && (
                          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                            Booked: {confirmed.operator_name}
                          </div>
                        )}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{job.service_type?.replace('_',' ')}</td>
                      <td className="text-muted">{job.preferred_date ? new Date(job.preferred_date).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '—'}</td>
                      <td className="text-muted">{job.budget_cents ? `$${(job.budget_cents / 100).toFixed(0)}` : '—'}</td>
                      <td><span className={`badge badge-${job.status}`}>{job.status.replace('_',' ')}</span></td>
                      <td>
                        <Link to={`/app/jobs/${job.id}`} className="btn btn-sm btn-ghost">Details</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
