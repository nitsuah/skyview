const BASE = '/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('skyview_token')
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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
    register:           (data)          => request('/auth/register',           { method: 'POST', body: JSON.stringify(data) }),
    login:              (data)          => request('/auth/login',              { method: 'POST', body: JSON.stringify(data) }),
    logout:             ()              => request('/auth/logout',             { method: 'POST' }),
    me:                 ()              => request('/auth/me'),
    forgotPassword:     (email)         => request('/auth/forgot-password',    { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword:      (token, password) => request('/auth/reset-password',   { method: 'POST', body: JSON.stringify({ token, password }) }),
    resendVerification: (email)         => request('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) })
  },
  jobs: {
    list:   ()          => request('/jobs'),
    get:    (id)        => request(`/jobs/${id}`),
    create: (data)      => request('/jobs',       { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data)  => request(`/jobs/${id}`, { method: 'PUT',  body: JSON.stringify(data) })
  },
  operators: {
    list:            (params = {}) => request(`/operators?${new URLSearchParams(params)}`),
    get:             (id)          => request(`/operators/${id}`),
    updateProfile:   (id, data)    => request(`/operators/${id}`,         { method: 'PUT',  body: JSON.stringify(data) }),
    verify:          (id, action)  => request(`/operators/${id}/verify`,  { method: 'POST', body: JSON.stringify({ action }) }),
    connect:         (id)          => request(`/operators/${id}/connect`,  { method: 'POST' }),
    getConnectStatus:(id)          => request(`/operators/${id}/connect`)
  },
  bookings: {
    list:     ()      => request('/bookings'),
    create:   (data)  => request('/bookings',                { method: 'POST', body: JSON.stringify(data) }),
    confirm:  (id)    => request(`/bookings/${id}/confirm`,  { method: 'POST' }),
    decline:  (id)    => request(`/bookings/${id}/decline`,  { method: 'POST' }),
    complete: (id)    => request(`/bookings/${id}/complete`, { method: 'POST' })
  },
  admin: {
    dashboard:        () => request('/admin/dashboard'),
    pendingOperators: () => request('/admin/pending-operators'),
    allJobs:  (params = {}) => request(`/admin/jobs?${new URLSearchParams(params)}`),
    allUsers: (params = {}) => request(`/admin/users?${new URLSearchParams(params)}`)
  },
  reviews: {
    list:   (operatorId) => request(`/reviews?operator_id=${operatorId}`),
    submit: (data)       => request('/reviews', { method: 'POST', body: JSON.stringify(data) })
  },
  notifications: {
    list:       ()    => request('/notifications'),
    markRead:   (id)  => request(`/notifications/${id}`,       { method: 'POST' }),
    markAllRead: ()   => request('/notifications/read-all',    { method: 'POST' })
  },
  uploads: {
    cert: (file) => {
      const form = new FormData()
      form.append('cert', file)
      return request('/uploads/cert', { method: 'POST', body: form })
    },
    deliverable: (file, bookingId) => {
      const form = new FormData()
      form.append('file', file)
      return request(`/uploads/deliverable?booking_id=${encodeURIComponent(bookingId)}`, { method: 'POST', body: form })
    }
  }
}
