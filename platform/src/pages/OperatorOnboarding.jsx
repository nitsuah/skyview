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

const DAYS = [
  { value: 0, label: 'Sun' }, { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
]

export default function OperatorOnboarding() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const fileRef   = useRef()

  const [step, setStep]     = useState(1)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState({
    bio: '', equipment: '', service_types: [],
    coverage_lat: '', coverage_lng: '', coverage_radius_mi: 50,
    base_rate_cents: '', hourly_rate_cents: '', booking_url: '',
    faa_cert_number: '', faa_cert_expires_at: ''
  })
  const [certFile, setCertFile]   = useState(null)
  const [error, setError]         = useState('')
  const [cityError, setCityError] = useState('')
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [done, setDone]           = useState(false)

  // Weekly availability: one entry per enabled day, { day_of_week, start_time, end_time }.
  const [weeklyEnabled, setWeeklyEnabled] = useState({})   // { [day_of_week]: { start_time, end_time } }
  const [blockedDates, setBlockedDates]   = useState([])   // [{ date, reason }]
  const [newBlockedDate, setNewBlockedDate]     = useState('')
  const [newBlockedReason, setNewBlockedReason] = useState('')
  const [savingAvailability, setSavingAvailability] = useState(false)
  const [availabilityStatus, setAvailabilityStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [extraWindows, setExtraWindows] = useState([])     // additional same-day windows the form can't edit

  // Hydrate form from stored profile so edits don't overwrite existing data with blanks
  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    api.operators.get(user.id)
      .then(data => {
        setProfile({
          bio:                 data.bio ?? '',
          equipment:           data.equipment ?? '',
          service_types:       data.service_types ?? [],
          coverage_lat:        data.coverage_lat ?? '',
          coverage_lng:        data.coverage_lng ?? '',
          coverage_radius_mi:  data.coverage_radius_mi ?? 50,
          base_rate_cents:     data.base_rate_cents != null ? String(data.base_rate_cents / 100) : '',
          hourly_rate_cents:   data.hourly_rate_cents != null ? String(data.hourly_rate_cents / 100) : '',
          booking_url:         data.booking_url ?? '',
          faa_cert_number:     data.faa_cert_number ?? '',
          faa_cert_expires_at: data.faa_cert_expires_at
            ? String(data.faa_cert_expires_at).slice(0, 10)
            : ''
        })
      })
      .catch(() => {}) // No profile row yet — first-time onboarding, keep empty defaults
      .finally(() => setLoading(false))

    loadAvailability()
  }, [user?.id])

  // Saving availability REPLACES the stored calendar, so the form must never be
  // saveable until the stored calendar has actually loaded — otherwise a slow or
  // failed request would let empty defaults overwrite a real schedule.
  const loadAvailability = () => {
    setAvailabilityStatus('loading')
    api.operators.getAvailability(user.id)
      .then(({ weekly, blocked }) => {
        // The form edits one window per day; any additional same-day windows are
        // kept aside and re-sent on save so they aren't silently deleted.
        const byDay = {}
        const extras = []
        for (const w of weekly) {
          const win = { start_time: w.start_time.slice(0, 5), end_time: w.end_time.slice(0, 5) }
          if (byDay[w.day_of_week]) extras.push({ day_of_week: w.day_of_week, ...win })
          else byDay[w.day_of_week] = win
        }
        setWeeklyEnabled(byDay)
        setExtraWindows(extras)
        setBlockedDates(blocked.map(b => ({ date: String(b.blocked_date).slice(0, 10), reason: b.reason ?? '' })))
        setAvailabilityStatus('ready')
      })
      .catch(() => setAvailabilityStatus('error'))
  }

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
    if (!address) {
      set('coverage_lat', '')
      set('coverage_lng', '')
      return
    }
    setCityError('')
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
      const d = await r.json()
      if (d[0]) {
        set('coverage_lat', parseFloat(d[0].lat))
        set('coverage_lng', parseFloat(d[0].lon))
      } else {
        set('coverage_lat', '')
        set('coverage_lng', '')
        setCityError('City not found — you can continue but geo-matching may not work until corrected.')
      }
    } catch {
      set('coverage_lat', '')
      set('coverage_lng', '')
      setCityError('Could not look up coordinates — you can continue but geo-matching may not work until corrected.')
    }
  }

  const saveProfile = async () => {
    setSaving(true); setError('')
    try {
      await api.operators.updateProfile(user.id, {
        ...profile,
        base_rate_cents:    profile.base_rate_cents   !== '' && profile.base_rate_cents   != null ? Math.round(parseFloat(profile.base_rate_cents)   * 100) : null,
        hourly_rate_cents:  profile.hourly_rate_cents !== '' && profile.hourly_rate_cents != null ? Math.round(parseFloat(profile.hourly_rate_cents) * 100) : null,
        coverage_lat:       profile.coverage_lat      !== '' && profile.coverage_lat      != null ? parseFloat(profile.coverage_lat)  : null,
        coverage_lng:       profile.coverage_lng      !== '' && profile.coverage_lng      != null ? parseFloat(profile.coverage_lng)  : null,
        coverage_radius_mi: parseInt(profile.coverage_radius_mi) || 50
      })
      setStep(s => s + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day) => {
    setWeeklyEnabled(w => {
      const next = { ...w }
      if (next[day]) delete next[day]
      else next[day] = { start_time: '09:00', end_time: '17:00' }
      return next
    })
  }

  const setDayTime = (day, field, value) => {
    setWeeklyEnabled(w => ({ ...w, [day]: { ...w[day], [field]: value } }))
  }

  const addBlockedDate = () => {
    if (!newBlockedDate) return
    if (blockedDates.some(b => b.date === newBlockedDate)) { setNewBlockedDate(''); return }
    setBlockedDates(b => [...b, { date: newBlockedDate, reason: newBlockedReason }].sort((a, b) => a.date.localeCompare(b.date)))
    setNewBlockedDate(''); setNewBlockedReason('')
  }

  const removeBlockedDate = (date) => setBlockedDates(b => b.filter(x => x.date !== date))

  const saveAvailability = async () => {
    setSavingAvailability(true); setError('')
    try {
      const weekly = [
        ...Object.entries(weeklyEnabled).map(([day, t]) => ({
          day_of_week: Number(day), start_time: t.start_time, end_time: t.end_time
        })),
        ...extraWindows.filter(w => weeklyEnabled[w.day_of_week]),
      ]
      if (weekly.some(w => w.end_time <= w.start_time)) {
        setError('End time must be after start time for every enabled day')
        return
      }
      await api.operators.updateAvailability(user.id, { weekly, blocked: blockedDates })
      setStep(s => s + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingAvailability(false)
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

  if (loading) return <div className="text-muted" style={{ padding: '2rem' }}>Loading…</div>

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
      <p className="page-sub">Step {step} of 4 — {step === 1 ? 'Profile' : step === 2 ? 'Rates' : step === 3 ? 'Availability' : 'Certification'}</p>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {[1,2,3,4].map(s => (
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
                  className={`service-option${profile.service_types.includes(s.value) ? ' selected' : ''}`}>
                  <input type="checkbox" value={s.value}
                    checked={profile.service_types.includes(s.value)}
                    onChange={() => toggleService(s.value)} />
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
            {cityError
              ? <small style={{ color: 'var(--amber, #b45309)' }}>{cityError}</small>
              : <small className="text-muted">Used to match you with nearby jobs.</small>
            }
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
            <label>Your booking / calendar link <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
            <input type="url" value={profile.booking_url}
              placeholder="https://cal.com/yourname or your Calendly link"
              onChange={e => set('booking_url', e.target.value)} />
            <small className="text-muted">Clients booking through SkyView are matched against the availability you set next — this link is just a backup for clients who ask for it directly.</small>
          </div>
          <div className="divider" />
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
              {saving ? 'Saving…' : 'Next: Availability →'}
            </button>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="section-title" style={{ marginBottom: '1.25rem' }}>Availability</div>
          <p className="text-muted mb-2" style={{ fontSize: 13.5 }}>
            Set the hours you're generally available. Clients booking you are checked against this automatically — no day set means no restriction (you'll be asked to confirm or decline every request instead).
          </p>
          {availabilityStatus === 'error' && (
            <div className="alert alert-error mb-2">
              Couldn't load your saved availability, so saving is disabled to avoid overwriting it.{' '}
              <button type="button" className="btn btn-ghost btn-sm" onClick={loadAvailability}>Retry</button>
            </div>
          )}
          {availabilityStatus === 'loading' && <p className="text-muted" style={{ fontSize: 13 }}>Loading your saved availability…</p>}
          {extraWindows.some(w => weeklyEnabled[w.day_of_week]) && (
            <p className="text-muted mb-2" style={{ fontSize: 12.5 }}>
              You have additional saved time windows on some days; they're kept as-is when you save.
            </p>
          )}
          <div className="form-group">
            {DAYS.map(d => {
              const enabled = weeklyEnabled[d.value]
              return (
                <div key={d.value} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: 70 }}>
                    <input type="checkbox" checked={!!enabled} onChange={() => toggleDay(d.value)} />
                    {d.label}
                  </label>
                  {enabled && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="time" value={enabled.start_time} onChange={e => setDayTime(d.value, 'start_time', e.target.value)} />
                      <span className="text-muted">to</span>
                      <input type="time" value={enabled.end_time} onChange={e => setDayTime(d.value, 'end_time', e.target.value)} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="divider" />
          <div className="form-group">
            <label>Blocked dates <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input type="date" value={newBlockedDate} onChange={e => setNewBlockedDate(e.target.value)} />
              <input type="text" placeholder="Reason (optional)" value={newBlockedReason}
                onChange={e => setNewBlockedReason(e.target.value)} style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={addBlockedDate}>Add</button>
            </div>
            {blockedDates.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {blockedDates.map(b => (
                  <div key={b.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span>{new Date(`${b.date}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC' })}{b.reason ? ` — ${b.reason}` : ''}</span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeBlockedDate(b.date)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="divider" />
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={saveAvailability}
              disabled={savingAvailability || availabilityStatus !== 'ready'}>
              {savingAvailability ? 'Saving…' : 'Next: Certification →'}
            </button>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
          </div>
        </div>
      )}

      {step === 4 && (
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
            <div className="drop-zone"
              role="button" tabIndex={0}
              onClick={() => fileRef.current.click()}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current.click() } }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setCertFile(e.dataTransfer.files[0]) }}>
              {certFile
                ? <><div style={{ fontSize: '1.5rem' }}>📄</div><p style={{ color: 'var(--text)' }}>{certFile.name}</p></>
                : <><div style={{ fontSize: '1.5rem' }}>⬆️</div><p>Click to upload or drag and drop</p><p style={{ fontSize: 12 }}>PDF, JPEG, PNG — max 5MB</p></>
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
            <button className="btn btn-ghost" onClick={() => setStep(3)}>← Back</button>
          </div>
        </div>
      )}
    </>
  )
}
