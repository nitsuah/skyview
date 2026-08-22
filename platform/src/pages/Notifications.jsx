import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function Notifications() {
  const [data, setData]         = useState({ notifications: [], unread_count: 0 })
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy]         = useState({})

  useEffect(() => {
    api.notifications.list()
      .then(setData)
      .catch(e => setLoadError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const markRead = async (id) => {
    if (busy[id]) return
    setBusy(b => ({ ...b, [id]: true }))
    try {
      await api.notifications.markRead(id)
      setData(prev => ({
        ...prev,
        unread_count: Math.max(0, prev.unread_count - 1),
        notifications: prev.notifications.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      }))
    } catch { /* ignore */ }
    finally { setBusy(b => ({ ...b, [id]: false })) }
  }

  const markAllRead = async () => {
    try {
      await api.notifications.markAllRead()
      setData(prev => ({
        ...prev,
        unread_count: 0,
        notifications: prev.notifications.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      }))
    } catch { /* ignore */ }
  }

  const notifications = data.notifications ?? []
  const unreadCount   = data.unread_count ?? 0

  return (
    <>
      <div className="flex-between mb-3">
        <div>
          <h1 className="page-title">Notifications</h1>
          {unreadCount > 0 && (
            <p className="page-sub" style={{ marginBottom: 0 }}>{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {loadError && <div className="alert alert-error">{loadError}</div>}
      {loading   && <div className="text-muted">Loading…</div>}

      {!loading && notifications.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
          <p className="text-muted">No notifications yet.</p>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          {notifications.map((n, i) => (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              padding: '1rem 1.25rem',
              borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none',
              background: n.read_at ? 'transparent' : 'color-mix(in srgb, var(--accent) 5%, transparent)'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: n.read_at ? 400 : 600 }}>{n.message}</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.read_at && (
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={!!busy[n.id]}
                  onClick={() => markRead(n.id)}
                  style={{ flexShrink: 0, fontSize: 12 }}>
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
