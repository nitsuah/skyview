const BASE = '/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('skyview_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  auth: {
    register:     (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login:        (data) => request('/auth/login',    { method: 'POST', body: JSON.stringify(data) }),
    me:           ()     => request('/auth/me')
  },
  jobs: {
    list:   ()          => request('/jobs'),
    get:    (id)        => request(`/jobs/${id}`),
    create: (data)      => request('/jobs',      { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data)  => request(`/jobs/${id}`, { method: 'PUT',  body: JSON.stringify(data) })
  },
  operators: {
    list:          (params = {}) => request(`/operators?${new URLSearchParams(params)}`),
    get:           (id)          => request(`/operators/${id}`),
    updateProfile: (id, data)    => request(`/operators/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    verify:        (id, action)  => request(`/operators/${id}/verify`, { method: 'POST', body: JSON.stringify({ action }) })
  },
  bookings: {
    list:     ()      => request('/bookings'),
    create:   (data)  => request('/bookings',             { method: 'POST', body: JSON.stringify(data) }),
    complete: (id)    => request(`/bookings/${id}/complete`, { method: 'POST' })
  },
  admin: {
    dashboard:        () => request('/admin/dashboard'),
    pendingOperators: () => request('/admin/pending-operators'),
    allJobs:          () => request('/admin/jobs'),
    allUsers:         () => request('/admin/users')
  },
  uploads: {
    cert: (file) => {
      const form = new FormData()
      form.append('cert', file)
      const token = localStorage.getItem('skyview_token')
      return fetch(`${BASE}/uploads/cert`, {
        method:  'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body:    form
      }).then(async r => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error) }
        return r.json()
      })
    },
    deliverable: (file, bookingId) => {
      const form = new FormData()
      form.append('file', file)
      const token = localStorage.getItem('skyview_token')
      return fetch(`${BASE}/uploads/deliverable?booking_id=${bookingId}`, {
        method:  'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body:    form
      }).then(async r => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error) }
        return r.json()
      })
    }
  }
}
