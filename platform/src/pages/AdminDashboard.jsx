import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function AdminDashboard() {
  const [stats, setStats]       = useState(null)
  const [pending, setPending]   = useState([])
  const [jobs, setJobs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [actionBusy, setActionBusy] = useState({})
  const [tab, setTab]           = useState('operators')

  const load = async () => {
    setLoading(true)
    const [s, p, j] = await Promise.all([
      api.admin.dashboard().catch(() => null),
      api.admin.pendingOperators().catch(() => []),
      api.admin.allJobs().catch(() => [])
    ])
    setStats(s); setPending(p); setJobs(j)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const verifyOp = async (id, action) => {
    setActionBusy(b => ({ ...b, [id]: action }))
    try {
      await api.operators.verify(id, action)
      setPending(p => p.filter(op => op.id !== id))
    } catch (e) {
      alert(e.message)
    } finally {
      setActionBusy(b => ({ ...b, [id]: null }))
    }
  }

  return (
    <>
      <div className="flex-between mb-3">
        <h1 className="page-title">Admin</h1>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : '↺ Refresh'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.verified_operators}</div>
            <div className="stat-label">Verified Operators</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: pending.length ? 'var(--amber)' : 'var(--accent)' }}>
              {stats.pending_verifications}
            </div>
            <div className="stat-label">Awaiting Verification</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.client_count}</div>
            <div className="stat-label">Clients</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.open_jobs}</div>
            <div className="stat-label">Open Jobs</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.completed_bookings}</div>
            <div className="stat-label">Completed Bookings</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--green)' }}>
              ${((stats.total_revenue_cents || 0) / 100).toLocaleString()}
            </div>
            <div className="stat-label">Platform Revenue</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1px' }}>
        {[
          { key: 'operators', label: `Pending Operators${pending.length ? ` (${pending.length})` : ''}` },
          { key: 'jobs',      label: `All Jobs` }
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem',
              fontSize: 13.5, fontWeight: 600,
              color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Pending operator verification queue */}
      {tab === 'operators' && (
        <>
          {!loading && pending.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <p className="text-muted">No operators waiting for verification.</p>
            </div>
          )}
          {pending.map(op => (
            <div key={op.id} className="card mb-2">
              <div className="flex-between mb-1">
                <div>
                  <strong>{op.name}</strong>
                  <span className="text-muted" style={{ marginLeft: '0.75rem', fontSize: 13 }}>{op.email}</span>
                </div>
                <span className={`badge badge-${op.verification_status}`}>{op.verification_status.replace('_',' ')}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: 13 }}>
                <div>
                  <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Cert #</div>
                  <div>{op.faa_cert_number || '—'}</div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Expires</div>
                  <div>{op.faa_cert_expires_at ? new Date(op.faa_cert_expires_at).toLocaleDateString() : '—'}</div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Services</div>
                  <div>{op.service_types?.join(', ') || '—'}</div>
                </div>
              </div>

              {op.faa_cert_blob_key && (
                <div className="alert alert-info mb-2" style={{ fontSize: 12.5 }}>
                  Certificate uploaded — verify against{' '}
                  <a href="https://amsrvs.registry.faa.gov/airmeninquiry/" target="_blank" rel="noreferrer" className="link">
                    FAA Airmen Inquiry
                  </a>{' '}
                  using cert # above before approving.
                </div>
              )}

              {op.bio && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1rem' }}>{op.bio}</p>}

              <div className="flex gap-1">
                <button className="btn btn-green btn-sm" disabled={!!actionBusy[op.id]}
                  onClick={() => verifyOp(op.id, 'approve')}>
                  {actionBusy[op.id] === 'approve' ? 'Approving…' : '✓ Approve'}
                </button>
                <button className="btn btn-ghost btn-sm" disabled={!!actionBusy[op.id]}
                  onClick={() => verifyOp(op.id, 'reject')}>
                  {actionBusy[op.id] === 'reject' ? 'Rejecting…' : 'Reject'}
                </button>
                <button className="btn btn-danger btn-sm" disabled={!!actionBusy[op.id]}
                  onClick={() => verifyOp(op.id, 'suspend')}>
                  {actionBusy[op.id] === 'suspend' ? '…' : 'Suspend'}
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* All jobs */}
      {tab === 'jobs' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Title</th><th>Service</th><th>Client</th><th>Location</th><th>Date</th><th>Budget</th><th>Status</th></tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id}>
                    <td style={{ fontWeight: 500 }}>{j.title}</td>
                    <td style={{ textTransform: 'capitalize' }}>{j.service_type?.replace('_',' ')}</td>
                    <td className="text-muted">{j.client_name}</td>
                    <td className="text-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.location_address || '—'}</td>
                    <td className="text-muted">{j.preferred_date ? new Date(j.preferred_date).toLocaleDateString() : '—'}</td>
                    <td className="text-muted">{j.budget_cents ? `$${(j.budget_cents/100).toFixed(0)}` : '—'}</td>
                    <td><span className={`badge badge-${j.status}`}>{j.status.replace('_',' ')}</span></td>
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
