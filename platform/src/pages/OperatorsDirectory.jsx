import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

const SERVICES = [
  { value: '',              label: 'All Services' },
  { value: 'real_estate',   label: 'Real Estate' },
  { value: 'cinematography',label: 'Cinema / Film' },
  { value: 'mapping',       label: 'Mapping / Survey' },
  { value: 'events',        label: 'Events' },
  { value: 'inspection',    label: 'Inspection' }
]

export default function OperatorsDirectory() {
  const [operators, setOperators] = useState([])
  const [loading, setLoading]     = useState(true)
  const [service, setService]     = useState('')
  const [error, setError]         = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api.operators.list(service ? { service } : {})
      .then(setOperators)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [service])

  return (
    <>
      <div className="mb-3">
        <h1 className="page-title">Find Operators</h1>
        <p className="page-sub">Browse FAA-certified drone operators verified by SkyView.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {SERVICES.map(s => (
          <button key={s.value}
            className={`btn btn-sm ${service === s.value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setService(s.value)}>
            {s.label}
          </button>
        ))}
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {loading && <div className="text-muted">Loading…</div>}

      {!loading && operators.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🚁</div>
          <p className="text-muted">
            No verified operators found{service ? ' for this service type' : ''}.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {operators.map(op => (
          <div key={op.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="flex-between mb-1">
              <strong style={{ fontSize: 15 }}>{op.name}</strong>
              {op.avg_rating > 0 && (
                <span style={{ fontSize: 13, color: 'var(--amber, #f59e0b)', whiteSpace: 'nowrap' }}>
                  {'★'.repeat(Math.round(Number(op.avg_rating)))} {Number(op.avg_rating).toFixed(1)}
                  <span className="text-muted" style={{ fontWeight: 400 }}> ({op.review_count})</span>
                </span>
              )}
            </div>

            {op.bio && (
              <p style={{
                fontSize: 13, color: 'var(--text-muted)', marginBottom: '0.75rem',
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
              }}>
                {op.bio}
              </p>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.75rem' }}>
              {op.service_types?.map(t => (
                <span key={t} className="badge" style={{ textTransform: 'capitalize', fontSize: 11 }}>
                  {t.replace('_', ' ')}
                </span>
              ))}
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-muted" style={{ fontSize: 12.5 }}>
                {op.base_rate_cents ? `From $${(op.base_rate_cents / 100).toFixed(0)}` : 'Rate on request'}
              </span>
              <Link to={`/app/operators/${op.id}`} className="btn btn-sm btn-ghost">
                View profile →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
