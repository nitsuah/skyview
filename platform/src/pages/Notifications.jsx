import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function Notifications() {
  const [data, setData]         = useState({ notifications: [], unread_count: 0 })
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
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
    setActionError('')
    try {
      await api.notifications.markRead(id)
      setData(prev => {
        const newCount = Math.max(0, prev.unread_count - 1)
        window.dispatchEvent(new CustomEvent('notifications-changed', { detail: { unread_count: newCount } }))
        return {
          ...prev,
          unread_count: newCount,
          notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n)
        }
      })
    } catch {
      setActionError('Failed to mark notification as read — please try again.')
    } finally {
      setBusy(b => ({ ...b, [id]: false }))
    }
  }

  const markAllRead = async () => {
    setActionError('')
    try {
      await api.notifications.markAllRead()
      window.dispatchEvent(new CustomEvent('notifications-changed', { detail: { unread_count: 0 } }))
      setData(prev => ({
        ...prev,
        unread_count: 0,
        notifications: prev.notifications.map(n => ({ ...n, read: true }))
      }))
    } catch {
      setActionError('Failed to mark all as read — please try again.')
    }
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

      {loadError    && <div className="alert alert-error">{loadError}</div>}
      {actionError  && <div className="alert alert-error">{actionError}</div>}
      {loading      && <div className="text-muted">Loading…</div>}

      {!loading && !loadError && notifications.length === 0 && (
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
              background: n.read ? 'transparent' : 'color-mix(in srgb, var(--accent) 5%, transparent)'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: n.read ? 400 : 600 }}>{n.message}</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.read && (
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
