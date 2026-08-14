import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

const SERVICES = [
  { value: 'real_estate',    label: 'Real Estate',    icon: '🏡' },
  { value: 'cinematography', label: 'Cinema / Film',  icon: '🎬' },
  { value: 'mapping',        label: 'Mapping',        icon: '🗺️' },
  { value: 'events',         label: 'Events',         icon: '🎉' },
  { value: 'inspection',     label: 'Inspection',     icon: '🔍' }
]

export default function OperatorOnboarding() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const fileRef   = useRef()

  const [step, setStep]     = useState(1)
  const [profile, setProfile] = useState({
    bio: '', equipment: '', service_types: [],
    coverage_lat: '', coverage_lng: '', coverage_radius_mi: 50,
    base_rate_cents: '', hourly_rate_cents: '', booking_url: '',
    faa_cert_number: '', faa_cert_expires_at: ''
  })
  const [certFile, setCertFile]   = useState(null)
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [done, setDone]           = useState(false)

  const set = (k, v) => setProfile(p => ({ ...p, [k]: v }))

  const toggleService = (val) => {
    setProfile(p => ({
      ...p,
      service_types: p.service_types.includes(val)
        ? p.service_types.filter(s => s !== val)
        : [...p.service_types, val]
    }))
  }

  const geocodeCity = async (address) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
      const d = await r.json()
      if (d[0]) { set('coverage_lat', parseFloat(d[0].lat)); set('coverage_lng', parseFloat(d[0].lon)) }
    } catch {}
  }

  const saveProfile = async () => {
    setSaving(true); setError('')
    try {
      await api.operators.updateProfile(user.id, {
        ...profile,
        base_rate_cents:   profile.base_rate_cents   ? Math.round(parseFloat(profile.base_rate_cents)   * 100) : null,
        hourly_rate_cents: profile.hourly_rate_cents ? Math.round(parseFloat(profile.hourly_rate_cents) * 100) : null,
        coverage_lat:      profile.coverage_lat      ? parseFloat(profile.coverage_lat)  : null,
        coverage_lng:      profile.coverage_lng      ? parseFloat(profile.coverage_lng)  : null,
        coverage_radius_mi: parseInt(profile.coverage_radius_mi) || 50
      })
      setStep(s => s + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const uploadCert = async () => {
    if (!certFile) { setError('Please select your FAA certificate file'); return }
    if (!profile.faa_cert_number) { setError('FAA certificate number is required'); return }
    if (!profile.faa_cert_expires_at) { setError('FAA certificate expiry date is required'); return }
    setUploading(true); setError('')
    try {
      // Save cert number + expiry first so the DB row is consistent before the blob is stored
      await api.operators.updateProfile(user.id, {
        faa_cert_number: profile.faa_cert_number,
        faa_cert_expires_at: profile.faa_cert_expires_at
      })
      await api.uploads.cert(certFile)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (done) {
    return (
      <div style={{ maxWidth: 520, margin: '4rem auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h1 style={{ marginBottom: '0.5rem' }}>Application submitted!</h1>
        <p className="text-muted mb-3">Your FAA certificate is under review. We'll email you within 24 hours once verified. In the meantime, complete your profile.</p>
        <button className="btn btn-primary" onClick={() => navigate('/app/operator/dashboard')}>
          Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    <>
      <h1 className="page-title">Operator Setup</h1>
      <p className="page-sub">Step {step} of 3 — {step === 1 ? 'Profile' : step === 2 ? 'Rates' : 'Certification'}</p>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {[1,2,3].map(s => (
          <div key={s} style={{
            height: 3, flex: 1, borderRadius: 2,
            background: s <= step ? 'var(--accent)' : 'var(--border)'
          }} />
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {step === 1 && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="section-title" style={{ marginBottom: '1.25rem' }}>Services & coverage</div>
          <div className="form-group">
            <label>Service types you offer</label>
            <div className="service-grid">
              {SERVICES.map(s => (
                <label key={s.value}
                  className={`service-option${profile.service_types.includes(s.value) ? ' selected' : ''}`}
                  onClick={() => toggleService(s.value)}>
                  <input type="checkbox" value={s.value} />
                  <span className="service-icon">{s.icon}</span>
                  <span className="service-label">{s.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Your city / base location</label>
            <input type="text" placeholder="e.g. Austin, TX"
              onBlur={e => geocodeCity(e.target.value)} />
            <small className="text-muted">Used to match you with nearby jobs.</small>
          </div>
          <div className="form-group">
            <label>Service radius (miles)</label>
            <select value={profile.coverage_radius_mi} onChange={e => set('coverage_radius_mi', e.target.value)}>
              {[15,25,50,75,100,150].map(r => <option key={r} value={r}>{r} miles</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Bio <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
            <textarea value={profile.bio} placeholder="Tell clients about your experience and specialty…"
              onChange={e => set('bio', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Equipment <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
            <input type="text" value={profile.equipment}
              placeholder="e.g. DJI Mavic 3 Pro, DJI Air 3, DJI OM 6"
              onChange={e => set('equipment', e.target.value)} />
          </div>
          <div className="divider" />
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={saveProfile} disabled={saving || profile.service_types.length === 0}>
              {saving ? 'Saving…' : 'Next: Rates →'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="section-title" style={{ marginBottom: '1.25rem' }}>Rates & booking</div>
          <div className="form-row">
            <div className="form-group">
              <label>Base / flat rate</label>
              <div className="currency-wrap">
                <span className="currency-prefix">$</span>
                <input type="number" className="currency-input" value={profile.base_rate_cents}
                  placeholder="e.g. 350" min={0} step={10}
                  onChange={e => set('base_rate_cents', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Hourly rate</label>
              <div className="currency-wrap">
                <span className="currency-prefix">$</span>
                <input type="number" className="currency-input" value={profile.hourly_rate_cents}
                  placeholder="e.g. 150" min={0} step={10}
                  onChange={e => set('hourly_rate_cents', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="alert alert-info mb-2" style={{ fontSize: 12.5 }}>
            Platform takes 15% on each booking. You receive 85% of each job's total. No monthly fee.
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Your booking / calendar link <span className="text-muted" style={{ fontWeight: 400 }}>(optional, Phase 1)</span></label>
            <input type="url" value={profile.booking_url}
              placeholder="https://cal.com/yourname or your Calendly link"
              onChange={e => set('booking_url', e.target.value)} />
            <small className="text-muted">Clients can use this to see your availability directly. Native scheduling coming in Phase 2.</small>
          </div>
          <div className="divider" />
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
              {saving ? 'Saving…' : 'Next: Certification →'}
            </button>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="section-title" style={{ marginBottom: '1.25rem' }}>FAA Part 107 certification</div>
          <p className="text-muted mb-2" style={{ fontSize: 13.5 }}>
            All SkyView operators must hold a valid FAA Part 107 Remote Pilot Certificate. We verify within 24 hours.
          </p>
          <div className="form-row mb-2">
            <div className="form-group">
              <label>Certificate number</label>
              <input type="text" value={profile.faa_cert_number}
                placeholder="e.g. 4307263"
                onChange={e => set('faa_cert_number', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Expiry date</label>
              <input type="date" value={profile.faa_cert_expires_at}
                onChange={e => set('faa_cert_expires_at', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Certificate document (PDF or image)</label>
            <div className="drop-zone" onClick={() => fileRef.current.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setCertFile(e.dataTransfer.files[0]) }}>
              {certFile
                ? <><div style={{ fontSize: '1.5rem' }}>📄</div><p style={{ color: 'var(--text)' }}>{certFile.name}</p></>
                : <><div style={{ fontSize: '1.5rem' }}>⬆️</div><p>Click to upload or drag and drop</p><p style={{ fontSize: 12 }}>PDF, JPEG, PNG — max 10MB</p></>
              }
            </div>
            <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }}
              onChange={e => setCertFile(e.target.files[0])} />
          </div>

          <div className="divider" />
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={uploadCert} disabled={uploading || !certFile}>
              {uploading ? 'Uploading…' : 'Submit for Verification'}
            </button>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
          </div>
        </div>
      )}
    </>
  )
}
