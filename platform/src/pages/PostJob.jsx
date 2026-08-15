import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'

const SERVICES = [
  { value: 'real_estate',    label: 'Real Estate',   icon: '🏡' },
  { value: 'cinematography', label: 'Cinema / Film', icon: '🎬' },
  { value: 'mapping',        label: 'Mapping / Survey', icon: '🗺️' },
  { value: 'events',         label: 'Events',        icon: '🎉' },
  { value: 'inspection',     label: 'Inspection',    icon: '🔍' }
]

const TIMES = ['morning', 'afternoon', 'evening', 'flexible']

export default function PostJob() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '', service_type: '', description: '',
    location_address: '', preferred_date: '', preferred_time: 'flexible',
    budget_cents: ''
  })
  const [error, setError]       = useState('')
  const [geoWarning, setGeoWarning] = useState('')
  const [busy, setBusy]         = useState(false)
  const [geocoding, setGeocoding] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const geocodeAddress = async (address) => {
    if (!address) return {}
    setGeocoding(true)
    setGeoWarning('')
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
      const data = await res.json()
      if (data[0]) return { location_lat: parseFloat(data[0].lat), location_lng: parseFloat(data[0].lon) }
      setGeoWarning('Address not found — operators in your area may not see this job in geo-matched searches.')
    } catch {
      setGeoWarning('Could not look up address coordinates — operators may not see this job in geo-matched searches.')
    } finally {
      setGeocoding(false)
    }
    return {}
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.service_type) { setError('Please select a service type'); return }
    setBusy(true); setError('')
    try {
      const geo = await geocodeAddress(form.location_address)
      if (form.location_address && !geo.location_lat) {
        setError('Location could not be geocoded — please try a more specific address (e.g. "Austin, TX") or clear the location field.')
        return
      }
      await api.jobs.create({
        ...form,
        ...geo,
        budget_cents: form.budget_cents ? Math.round(parseFloat(form.budget_cents) * 100) : null
      })
      navigate('/app/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="mb-3">
        <h1 className="page-title">Post a Job</h1>
        <p className="page-sub">Fill in the details and we'll match you with verified operators in your area.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
        <div className="card mb-2">
          <div className="section-title">Service type</div>
          <div className="service-grid">
            {SERVICES.map(s => (
              <label key={s.value}
                className={`service-option${form.service_type === s.value ? ' selected' : ''}`}
                onClick={() => set('service_type', s.value)}>
                <input type="radio" name="service_type" value={s.value} />
                <span className="service-icon">{s.icon}</span>
                <span className="service-label">{s.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="card mb-2">
          <div className="section-title">Job details</div>
          <div className="form-group">
            <label>Job title</label>
            <input type="text" value={form.title} placeholder="e.g. Real estate listing shoot — 3BR home"
              required onChange={e => set('title', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Description <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
            <textarea value={form.description} placeholder="Any specific requirements, shot list, access notes…"
              onChange={e => set('description', e.target.value)} />
          </div>
        </div>

        <div className="card mb-2">
          <div className="section-title">Location & timing</div>
          <div className="form-group">
            <label>Location</label>
            <input type="text" value={form.location_address}
              placeholder="Street address or area (e.g. Downtown Austin, TX)"
              onChange={e => set('location_address', e.target.value)} />
            {geocoding && <small className="text-muted">Looking up coordinates…</small>}
            {geoWarning && !geocoding && <small className="text-muted" style={{ color: 'var(--amber, #b45309)' }}>{geoWarning}</small>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Preferred date</label>
              <input type="date" value={form.preferred_date}
                min={new Date().toLocaleDateString('en-CA')}
                onChange={e => set('preferred_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Time of day</label>
              <select value={form.preferred_time} onChange={e => set('preferred_time', e.target.value)}>
                {TIMES.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="section-title">Budget</div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Approximate budget <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
            <div className="currency-wrap">
              <span className="currency-prefix">$</span>
              <input type="number" className="currency-input" value={form.budget_cents}
                placeholder="e.g. 400" min={0} step={10}
                onChange={e => set('budget_cents', e.target.value)} />
            </div>
            <small className="text-muted mt-1">Operators will reach out with quotes. No payment is taken now.</small>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={busy || geocoding}>
            {busy ? 'Posting…' : 'Post Job'}
          </button>
          <Link to="/app/dashboard" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  )
}
