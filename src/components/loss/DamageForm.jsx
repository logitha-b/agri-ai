import { useLanguage } from '../../context/LanguageContext'
/**
 * DamageForm — Step 1 of the crop loss workflow.
 * Collects farm location, crop info, incident details, and insurance details.
 */
import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, Camera, Loader, MapPin, Search, Sparkles } from 'lucide-react'
import { Button, Card, Field } from '../../components'

const API = (import.meta.env.VITE_CROP_HEALTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8003' : 'https://agri-ai-jnpi.onrender.com')).replace(/\/$/, '')

const CROPS = ['Paddy', 'Groundnut', 'Maize', 'Tomato', 'Millet', 'Wheat', 'Cotton', 'Sugarcane', 'Soybean', 'Sunflower', 'Other']
const SEASONS = ['Kharif', 'Rabi', 'Summer']
const INCIDENT_TYPES = [
  { key: 'flood',          label: 'Flood / Waterlogging' },
  { key: 'drought',        label: 'Drought / Moisture Stress' },
  { key: 'heavy_rainfall', label: 'Heavy Rainfall / Storm Damage' },
  { key: 'storm',          label: 'Cyclone / Storm / High Winds' },
  { key: 'heat_stress',    label: 'Heat Stress / Scorching' },
  { key: 'pest',           label: 'Pest Attack' },
  { key: 'disease',        label: 'Crop Disease' },
  { key: 'other',          label: 'Other / Unknown' },
]
const SEVERITY = ['low', 'medium', 'high', 'total']

export default function DamageForm({ onSubmit, initialValues = {}, onLoadSample }) {
  const { t } = useLanguage()
  // Location
  const [address, setAddress]     = useState(initialValues.address || '')
  const [state, setState]         = useState(initialValues.state || '')
  const [district, setDistrict]   = useState(initialValues.district || '')
  const [lat, setLat]             = useState(initialValues.lat || '')
  const [lng, setLng]             = useState(initialValues.lng || '')
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError]   = useState('')

  // Crop
  const [crop, setCrop]               = useState(initialValues.crop || 'Paddy')
  const [variety, setVariety]         = useState(initialValues.variety || '')
  const [season, setSeason]           = useState(initialValues.season || 'Kharif')
  const [sowingDate, setSowingDate]   = useState(initialValues.sowing_date || '')
  const [totalArea, setTotalArea]     = useState(initialValues.total_area_acres || '')
  const [affectedArea, setAffectedArea] = useState(initialValues.affected_area_acres || '')

  // Incident
  const [incidentDate, setIncidentDate]     = useState(initialValues.incident_date || '')
  const [incidentType, setIncidentType]     = useState(initialValues.incident_type || 'flood')
  const [severity, setSeverity]             = useState(initialValues.damage_severity || 'medium')
  const [description, setDescription]       = useState(initialValues.damage_description || '')
  const [hasPhotos, setHasPhotos]           = useState(initialValues.has_photos || false)

  // Farmer & insurance
  const [farmerName, setFarmerName]         = useState(initialValues.farmer_name || '')
  const [insuranceScheme, setInsuranceScheme] = useState(initialValues.insurance_scheme || '')
  const [policyRef, setPolicyRef]           = useState(initialValues.policy_ref || '')

  const [error, setError] = useState('')
  const totalAreaRef    = useRef(null)
  const affectedAreaRef = useRef(null)

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    ref.current?.focus()
  }

  const geocode = useCallback(async () => {
    const q = [address, district, state, 'India'].filter(Boolean).join(', ')
    if (!q.trim()) { setGeoError('Enter at least a district and state.'); return }
    setGeoLoading(true); setGeoError('')
    try {
      const res = await fetch(`${API}/api/health/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: q }),
      })
      const data = await res.json()
      if (data.found) {
        setLat(data.lat.toFixed(5))
        setLng(data.lng.toFixed(5))
        if (!state && data.state) setState(data.state)
        if (!district && data.district) setDistrict(data.district)
      } else {
        setGeoError('Location not found. Check spelling or add more details.')
      }
    } catch {
      setGeoError('Geocoding service unavailable. Enter coordinates manually.')
    } finally {
      setGeoLoading(false)
    }
  }, [address, district, state])

  const handleLoadSample = (autoSubmit = true) => {
    const today = new Date().toISOString().slice(0, 10)
    const sow = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10)
    const inc = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
    const sample = {
      address: 'Ponneri, Thiruvallur, Tamil Nadu',
      state: 'Tamil Nadu',
      district: 'Thiruvallur',
      lat: 13.3364,
      lng: 80.1932,
      crop: 'Paddy',
      variety: 'BPT 5204 (Samba Mahsuri)',
      season: 'Kharif',
      sowing_date: sow,
      total_area_acres: 2.5,
      affected_area_acres: 1.5,
      incident_date: inc,
      incident_type: 'flood',
      damage_severity: 'high',
      damage_description: 'Severe waterlogging for 48 hours following localized heavy monsoon downpour during active tillering stage. Submerged lower field parcels.',
      has_photos: true,
      farmer_name: 'R. Kumar',
      insurance_scheme: 'PMFBY',
      policy_ref: 'PMFBY-TN-2026-449102',
    }
    setAddress(sample.address)
    setState(sample.state)
    setDistrict(sample.district)
    setLat('13.3364')
    setLng('80.1932')
    setCrop(sample.crop)
    setVariety(sample.variety)
    setSeason(sample.season)
    setSowingDate(sample.sowing_date)
    setTotalArea(String(sample.total_area_acres))
    setAffectedArea(String(sample.affected_area_acres))
    setIncidentDate(sample.incident_date)
    setIncidentType(sample.incident_type)
    setSeverity(sample.damage_severity)
    setDescription(sample.damage_description)
    setHasPhotos(true)
    setFarmerName(sample.farmer_name)
    setInsuranceScheme(sample.insurance_scheme)
    setPolicyRef(sample.policy_ref)
    setError('')
    if (autoSubmit && onSubmit) {
      onSubmit(sample)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!totalArea || isNaN(totalArea) || +totalArea <= 0) {
      setError('Total cultivated area is required — enter the number of acres you cultivate.')
      scrollTo(totalAreaRef)
      return
    }
    if (!affectedArea || isNaN(affectedArea) || +affectedArea <= 0) {
      setError('Affected area is required — enter how many acres were damaged.')
      scrollTo(affectedAreaRef)
      return
    }
    if (+affectedArea > +totalArea) {
      setError('Affected area cannot exceed total cultivated area.')
      scrollTo(affectedAreaRef)
      return
    }

    onSubmit({
      crop, variety, season,
      sowing_date:           sowingDate || null,
      total_area_acres:      parseFloat(totalArea),
      affected_area_acres:   parseFloat(affectedArea),
      incident_date:         incidentDate || null,
      incident_type:         incidentType,
      damage_severity:       severity,
      damage_description:    description || null,
      has_photos:            hasPhotos,
      lat:                   lat ? parseFloat(lat) : null,
      lng:                   lng ? parseFloat(lng) : null,
      state:                 state || null,
      district:              district || null,
      farmer_name:           farmerName || null,
      insurance_scheme:      insuranceScheme || null,
      policy_ref:            policyRef || null,
      address,
    })
  }

  return (
    <form className="page" onSubmit={handleSubmit} noValidate>
      {/* Sample data banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #e8f5e9 100%)',
        border: '1px solid #bbf7d0',
        borderRadius: 10,
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ fontSize: 13, color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✨ {t('Want to test with sample damage report?', 'Want to test with sample damage report?')}</span>
          </div>
          <div style={{ fontSize: 12, color: '#4b7355', marginTop: 2 }}>
            {t('Ponneri, Thiruvallur · Paddy (BPT 5204) · 1.5 of 2.5 acres flooded · Auto-loads weather, yield & PMFBY', 'Ponneri, Thiruvallur · Paddy (BPT 5204) · 1.5 of 2.5 acres flooded · Auto-loads weather, yield & PMFBY')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleLoadSample(false)}
            className="button secondary"
            style={{ fontSize: 12, padding: '7px 12px' }}
            title={t('Fill form fields only without submitting', 'Fill form fields only without submitting')}
          >
            {t('Fill form only', 'Fill form only')}
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
              transition: 'all 0.2s ease',
            }}
            title={t('Auto-fill sample data and run loss assessment immediately', 'Auto-fill sample data and run loss assessment immediately')}
          >
            <Sparkles size={15} />
            {t('✨ Load Sample Data & Assess', '✨ Load Sample Data & Assess')}
          </button>
        </div>
      </div>

      {/* LOCATION */}
      <Card
        title={t("Farm Location", "Farm Location")}
        subtitle={t("Enter your farm address to fetch weather, flood, and satellite data automatically.", "Enter your farm address to fetch weather, flood, and satellite data automatically.")}
        action={
          <button
            type="button"
            className="button secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              padding: '4px 10px',
              color: '#059669',
              borderColor: '#a7f3d0',
              background: '#ecfdf5',
              fontWeight: 600,
            }}
            onClick={() => handleLoadSample(true)}
            title={t('Load sample data', 'Load sample data')}
          >
            <Sparkles size={13} />
            {t('Load sample data', 'Load sample data')}
          </button>
        }
      >
        <div className="input-grid columns-2">
          <Field label={t("VILLAGE / LOCALITY", "VILLAGE / LOCALITY")}>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder={t("Village name or locality", "Village name or locality")} />
          </Field>
          <Field label={t("DISTRICT", "DISTRICT")}>
            <input value={district} onChange={e => setDistrict(e.target.value)} placeholder={t("District", "District")} required />
          </Field>
          <Field label={t("STATE", "STATE")}>
            <input value={state} onChange={e => setState(e.target.value)} placeholder={t("State", "State")} required />
          </Field>
          <Field label={t("GPS COORDINATES (auto-filled or manual)", "GPS COORDINATES (auto-filled or manual)")}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={lat} onChange={e => setLat(e.target.value)} placeholder={t("Latitude", "Latitude")} style={{ flex: 1 }} />
              <input value={lng} onChange={e => setLng(e.target.value)} placeholder={t("Longitude", "Longitude")} style={{ flex: 1 }} />
            </div>
          </Field>
        </div>
        <button type="button" className="button secondary" style={{ marginTop: 12 }} onClick={geocode} disabled={geoLoading}>
          {geoLoading ? <Loader size={14} className="spin" /> : <Search size={14} />}
          {geoLoading ? t('Locating…', 'Locating…') : t('Auto-locate from address', 'Auto-locate from address')}
          <MapPin size={14} />
        </button>
        {geoError && <p className="loss-field-error">{t(geoError, geoError)}</p>}
        {lat && lng && (
          <div className="loss-location-confirm">
            <MapPin size={13} /> {t("Located at", "Located at")} {parseFloat(lat).toFixed(4)}°N, {parseFloat(lng).toFixed(4)}°E
          </div>
        )}
      </Card>

      {/* CROP DETAILS */}
      <Card title={t("Crop Details", "Crop Details")} subtitle={t("Information about your crop and cultivation area.", "Information about your crop and cultivation area.")}>
        <div className="input-grid columns-2">
          <Field label={t("CROP", "CROP")}>
            <select value={crop} onChange={e => setCrop(e.target.value)}>
              {CROPS.map(c => <option key={c} value={c}>{t(c, c)}</option>)}
            </select>
          </Field>
          <Field label={t("VARIETY (optional)", "VARIETY (optional)")}>
            <input value={variety} onChange={e => setVariety(e.target.value)} placeholder={t("e.g. ADT 45, CO 51", "e.g. ADT 45, CO 51")} />
          </Field>
          <Field label={t("SEASON", "SEASON")}>
            <select value={season} onChange={e => setSeason(e.target.value)}>
              {SEASONS.map(s => <option key={s} value={s}>{t(s, s)}</option>)}
            </select>
          </Field>
          <Field label={t("SOWING DATE", "SOWING DATE")}>
            <input type="date" value={sowingDate} onChange={e => setSowingDate(e.target.value)} />
          </Field>
          <Field label={t("TOTAL CULTIVATED AREA (acres) *", "TOTAL CULTIVATED AREA (acres) *")}>
            <input
              ref={totalAreaRef}
              type="number" min="0.1" step="0.1"
              value={totalArea} onChange={e => { setTotalArea(e.target.value); setError('') }}
              placeholder="e.g. 2.5"
              style={!totalArea && error ? { borderColor: '#c0392b' } : {}}
            />
            {!totalArea && error && <span style={{ fontSize: 10, color: '#c0392b', marginTop: 3, display: 'block' }}>Required</span>}
          </Field>
          <Field label="AFFECTED AREA (acres) *">
            <input
              ref={affectedAreaRef}
              type="number" min="0.1" step="0.1"
              value={affectedArea} onChange={e => { setAffectedArea(e.target.value); setError('') }}
              placeholder="e.g. 1.5"
              style={!affectedArea && error ? { borderColor: '#c0392b' } : {}}
            />
            {!affectedArea && error && <span style={{ fontSize: 10, color: '#c0392b', marginTop: 3, display: 'block' }}>Required</span>}
          </Field>
        </div>
      </Card>

      {/* INCIDENT DETAILS */}
      <Card title="Damage Incident" subtitle="Describe the damage event. Detailed information improves the assessment quality.">
        <div className="input-grid columns-2">
          <Field label="INCIDENT DATE">
            <input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} />
          </Field>
          <Field label="DAMAGE TYPE">
            <select value={incidentType} onChange={e => setIncidentType(e.target.value)}>
              {INCIDENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="ESTIMATED DAMAGE SEVERITY">
            <select value={severity} onChange={e => setSeverity(e.target.value)}>
              {SEVERITY.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)} — {s === 'low' ? '< 25%' : s === 'medium' ? '25–50%' : s === 'high' ? '50–75%' : '>75% (total loss)'}</option>)}
            </select>
          </Field>
          <div />
          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span>DAMAGE DESCRIPTION</span>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the damage in detail: what happened, when you noticed it, visible effects on the crop…"
              style={{ width: '100%', padding: '7px 9px', border: '1px solid #dfe6df', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', resize: 'vertical' }}
            />
          </label>
        </div>
        <label className="loss-photo-row" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={hasPhotos} onChange={e => setHasPhotos(e.target.checked)} />
          <Camera size={14} />
          <span>I have photographs of the damage (date-stamped or geo-tagged preferred)</span>
        </label>
        <div className="inline-feedback" style={{ marginTop: 12 }}>
          <AlertTriangle size={15} />
          <span>
            Photographs are essential evidence for insurance claims. Take photos from multiple
            angles showing the affected field, damaged crop, and surrounding context.
            PMFBY typically requires timely damage reporting — act as soon as possible.
          </span>
        </div>
      </Card>

      {/* INSURANCE DETAILS */}
      <Card title="Insurance Details" subtitle="Provide insurance information if available. This section is optional — you can still generate an assessment without it.">
        <div className="input-grid columns-2">
          <Field label="FARMER NAME">
            <input value={farmerName} onChange={e => setFarmerName(e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="INSURANCE SCHEME (if enrolled)">
            <select value={insuranceScheme} onChange={e => setInsuranceScheme(e.target.value)}>
              <option value="">Not enrolled / Unknown</option>
              <option value="PMFBY">PMFBY — Pradhan Mantri Fasal Bima Yojana</option>
              <option value="RWBCIS">RWBCIS — Restructured Weather Based Crop Insurance</option>
              <option value="State scheme">State-specific insurance scheme</option>
              <option value="Private">Private crop insurance</option>
            </select>
          </Field>
          <Field label="POLICY / APPLICATION REFERENCE (optional)">
            <input value={policyRef} onChange={e => setPolicyRef(e.target.value)} placeholder="Policy number or application ID" />
          </Field>
        </div>
      </Card>

      {error && (
        <div className="loss-form-error">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit">
          Run Assessment <ArrowRight size={16} />
        </Button>
      </div>
    </form>
  )
}
