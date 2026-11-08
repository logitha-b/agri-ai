import { useLanguage } from '../../context/LanguageContext'
/**
 * PearlSuitability — Site assessment for freshwater and marine pearl culture.
 * Preserves the existing PearlPage calculator and adds location-based climate scoring.
 * Uses NASA POWER via /api/pearl/climate-suitability (requires backend).
 * Falls back to embedded ICAR-CIFE / CMFRI thresholds when offline.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, Loader, MapPin, Sparkles, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, Notice, Progress, RiskBadge } from '../../components'
import { pearlData } from '../../data/mockData'

const API   = (import.meta.env.VITE_CROP_HEALTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8003' : '')).replace(/\/$/, '')
const money = v => `₹${Number(v||0).toLocaleString('en-IN')}`
const axis  = { fontSize: 11, fill: '#738176' }
const tt    = { border: '1px solid #e0e8e0', borderRadius: 8, fontSize: 12 }

// ICAR-CIFE freshwater pearl mussel parameters (Lamellidens marginalis / Parreysia spp.)
// CMFRI / MPEDA marine pearl oyster parameters (Pinctada fucata)
const SPECIES_INFO = {
  freshwater: {
    species: ['Lamellidens marginalis (common freshwater mussel)',
              'Parreysia corrugata', 'Cristaria plicata'],
    optimal: { temp:'22–32°C', pH:'7.0–8.5', DO:'>5 mg/L', turbidity:'<50 NTU',
               hardness:'75–300 mg/L CaCO₃', alkalinity:'50–200 mg/L' },
    culture_duration: '12–24 months',
    source: 'ICAR-CIFE Freshwater Pearl Culture Manual',
    indian_states: ['Andhra Pradesh','Telangana','West Bengal','Odisha','Assam','Bihar',
                    'Uttar Pradesh','Chhattisgarh','Jharkhand','Karnataka'],
  },
  marine: {
    species: ['Pinctada fucata (Akoya pearl oyster)',
              'Pinctada margaritifera (black-lip oyster)'],
    optimal: { temp:'25–31°C', salinity:'28–35 ppt', DO:'>5 mg/L', pH:'7.8–8.3',
               depth:'3–15 m', current:'0.1–0.5 m/s' },
    culture_duration: '18–36 months',
    source: 'CMFRI / MPEDA Marine Pearl Culture Guidelines',
    indian_states: ['Tamil Nadu','Andhra Pradesh','Kerala','Karnataka','Maharashtra',
                    'Goa','Gujarat','Lakshadweep','Andaman & Nicobar'],
  },
}

// Embedded offline climate profiles per Indian state for freshwater culture
const FRESHWATER_STATE_SUITABILITY = {
  'Andhra Pradesh': 80, 'Telangana': 78, 'West Bengal': 75, 'Odisha': 74,
  'Assam': 70, 'Bihar': 68, 'Uttar Pradesh': 65, 'Chhattisgarh': 72,
  'Jharkhand': 70, 'Karnataka': 74, 'Tamil Nadu': 71, 'Maharashtra': 68,
  'Madhya Pradesh': 64, 'Kerala': 72, 'Gujarat': 60,
}

export default function PearlSuitability({ lat, lng, cultureType, derivedState, onStateChange, sampleSeed }) {
  const { t } = useLanguage()
  // Existing calculator state (preserved from PearlPage)
  const [investment,    setInvestment]    = useState(pearlData.investment)
  const [pondArea,      setPondArea]      = useState(pearlData.pondArea)
  const [waterQuality,  setWaterQuality]  = useState('Good')
  const [pondAvailable, setPondAvailable] = useState('Yes · existing pond')
  const [assessed,      setAssessed]      = useState(false)

  // New location + climate state
  const [locationText,  setLocationText]  = useState('')
  const [geocoding,     setGeocoding]     = useState(false)
  const [geoError,      setGeoError]      = useState('')
  const [resolvedLabel, setResolvedLabel] = useState('')
  const [climateResult, setClimateResult] = useState(null)
  const [climLoading,   setClimLoading]   = useState(false)

  const waterFactor   = waterQuality === 'Good' ? 1 : waterQuality === 'Needs testing' ? 0.8 : 0.65
  const scale         = Number(pondArea || 0) / pearlData.pondArea
  const capitalFactor = Math.max(0.35, Math.min(1, Number(investment || 0) / pearlData.cost))
  const mussels       = Math.round(pearlData.mussels * scale * waterFactor * capitalFactor)
  const revenue       = Math.round(pearlData.revenue * scale * waterFactor * capitalFactor)
  const cost          = Math.round(pearlData.cost    * scale * capitalFactor)
  const net           = revenue - cost
  const suitability   = pondAvailable.startsWith('No') ? 'PLANNING REQUIRED'
                      : waterQuality === 'Good' ? 'GOOD' : 'NEEDS WATER TESTING'

  const chart = pearlData.cycles.map(item => ({
    cycle:   item.cycle,
    revenue: Math.round(item.revenue * scale * waterFactor * capitalFactor),
    cost:    Math.round(item.cost    * scale * capitalFactor),
  }))


  const loadSamplePearl = () => {
    if (cultureType === 'marine') {
      setLocationText('Thoothukudi, Tamil Nadu')
      setResolvedLabel('Thoothukudi (Tuticorin), Tamil Nadu, India')
      setPondArea(1.0)
      setInvestment(250000)
      setWaterQuality('Good')
      setPondAvailable('Yes · existing pond')
      onStateChange({ lat: 8.7642, lng: 78.1348, state: 'Tamil Nadu', district: 'Thoothukudi' })
      setAssessed(true)
      fetchClimate(8.7642, 78.1348)
    } else {
      setLocationText('Nellore, Andhra Pradesh')
      setResolvedLabel('Nellore, Andhra Pradesh, India')
      setPondArea(0.8)
      setInvestment(150000)
      setWaterQuality('Good')
      setPondAvailable('Yes · existing pond')
      onStateChange({ lat: 14.4426, lng: 79.9865, state: 'Andhra Pradesh', district: 'Nellore' })
      setAssessed(true)
      fetchClimate(14.4426, 79.9865)
    }
  }

  useEffect(() => {
    if (sampleSeed) {
      loadSamplePearl()
    }
  }, [sampleSeed, cultureType])

  const geocodeLocation = async () => {
    if (!locationText.trim()) { setGeoError('Enter a location first.'); return }
    setGeocoding(true); setGeoError('')
    try {
      const res  = await fetch(`${API}/api/health/geocode`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: locationText + ', India' }),
      })
      const data = await res.json()
      if (data.found) {
        onStateChange({ lat: data.lat, lng: data.lng, state: data.state || '', district: data.district || '' })
        setResolvedLabel(data.display_name || locationText); setGeoError('')
        fetchClimate(data.lat, data.lng)
      } else setGeoError('Location not found. Try district, state, India.')
    } catch {
      // Offline fallback — guess state from text
      const guesses = [
        ['andhra','Andhra Pradesh'],['telangana','Telangana'],['west bengal','West Bengal'],
        ['odisha','Odisha'],['assam','Assam'],['bihar','Bihar'],['karnataka','Karnataka'],
        ['kerala','Kerala'],['tamil','Tamil Nadu'],['maharashtra','Maharashtra'],
        ['gujarat','Gujarat'],['goa','Goa'],
      ]
      const match = guesses.find(([k]) => locationText.toLowerCase().includes(k))
      if (match) { onStateChange({ lat: null, lng: null, state: match[1], district: '' }); setResolvedLabel(locationText) }
      else setGeoError('Backend offline — type state name for offline scoring.')
    } finally { setGeocoding(false) }
  }

  const fetchClimate = async (la, lo) => {
    if (!la || !lo) return
    setClimLoading(true)
    try {
      const res  = await fetch(`${API}/api/pearl/climate-suitability?lat=${la}&lng=${lo}&culture_type=${cultureType}`,
        { signal: AbortSignal.timeout(8000) })
      const data = await res.json()
      if (res.ok && data.available) setClimateResult(data)
    } catch { /* offline */ }
    finally { setClimLoading(false) }
  }

  // Offline state-level score
  const offlineScore = derivedState && cultureType === 'freshwater'
    ? FRESHWATER_STATE_SUITABILITY[derivedState] || null
    : null

  const info = SPECIES_INFO[cultureType]

  return (
    <div className="page">
      <Notice>
        {t("Suitability scores are based on temperature and rainfall indicators only. pH, dissolved oxygen, turbidity, and hardness must be measured on-site. A high climate score does not guarantee pond suitability.", "Suitability scores are based on temperature and rainfall indicators only. pH, dissolved oxygen, turbidity, and hardness must be measured on-site. A high climate score does not guarantee pond suitability.")}
        {" "}{t("Source:", "Source:")} {info.source}
      </Notice>

      {/* Location input */}
      <Card title={t("Site location", "Site location")} subtitle={t("Enter location for climate-based suitability scoring.", "Enter location for climate-based suitability scoring.")}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text" value={locationText} style={{ flex: 1, height: 35, padding: '0 9px', border: '1px solid #dfe6df', borderRadius: 6, fontSize: 11 }}
            onChange={e => setLocationText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && geocodeLocation()}
            placeholder={t("e.g. Kolleru Lake, Andhra Pradesh or Kochi, Kerala", "e.g. Kolleru Lake, Andhra Pradesh or Kochi, Kerala")}
          />
          <button className="button secondary" onClick={geocodeLocation} disabled={geocoding} style={{ whiteSpace: 'nowrap' }}>
            {geocoding ? <Loader size={13} className="spin"/> : <><MapPin size={13}/> {t("Locate", "Locate")}</>}
          </button>
        </div>
        {geoError && <p className="pearl-error"><AlertTriangle size={12}/> {t(geoError, geoError)}</p>}
        {resolvedLabel && !geoError && (
          <p style={{ fontSize: 10, color: '#3d7a52', margin: '5px 0 0' }}>
            <MapPin size={11}/> {resolvedLabel}{derivedState ? ` · ${derivedState}` : ''}
          </p>
        )}
        {/* Climate result */}
        {climLoading && <p style={{ fontSize: 11, color: '#68766c', marginTop: 8 }}><Loader size={12} className="spin"/> {t("Fetching climate data…", "Fetching climate data…")}</p>}
        {climateResult && (
          <div className="pearl-climate-result">
            <div className="pearl-climate-score">
              <b style={{ color: climateResult.overall_score >= 70 ? '#2d6a4f' : climateResult.overall_score >= 45 ? '#b87c1a' : '#c0392b' }}>
                {climateResult.overall_score}
              </b>
              <small>/100</small>
            </div>
            <div>
              <span className="eyebrow">{t("CLIMATE SUITABILITY", "CLIMATE SUITABILITY")} — {t(climateResult.overall_label?.toUpperCase(), climateResult.overall_label?.toUpperCase())}</span>
              <p style={{ fontSize: 11, margin: '4px 0 0', color: '#3d5c44' }}>
                {t("Temp", "Temp")} {climateResult.temperature.mean_c}°C {t("mean", "mean")} · ~{climateResult.rainfall.est_annual_mm} {t("mm/year", "mm/year")}
              </p>
              <p style={{ fontSize: 10, color: '#7a897d', marginTop: 3 }}>{t(climateResult.important_note, climateResult.important_note)}</p>
            </div>
          </div>
        )}
        {!climateResult && offlineScore && (
          <div className="pearl-climate-result">
            <div className="pearl-climate-score">
              <b style={{ color: offlineScore >= 70 ? '#2d6a4f' : '#b87c1a' }}>{offlineScore}</b>
              <small>/100</small>
            </div>
            <div>
              <span className="eyebrow">{t("OFFLINE CLIMATE ESTIMATE", "OFFLINE CLIMATE ESTIMATE")} — {derivedState}</span>
              <p style={{ fontSize: 10, color: '#7a897d', marginTop: 3 }}>
                {t("Based on representative regional climate. Start backend for live NASA POWER data.", "Based on representative regional climate. Start backend for live NASA POWER data.")}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Existing calculator — preserved */}
      <div className="engine-two">
        <form className="card input-card" onSubmit={e => { e.preventDefault(); setAssessed(true) }}>
          <header className="card-header">
            <div><h2>{t("Pond and investment profile", "Pond and investment profile")}</h2>
              <p>{cultureType === 'freshwater' ? t('Freshwater pearl mussel culture assessment.', 'Freshwater pearl mussel culture assessment.') : t('Marine pearl oyster culture assessment.', 'Marine pearl oyster culture assessment.')}</p>
            </div>
          </header>
          <div className="input-grid columns-2">
            <label className="field"><span>{t("POND / FARM AVAILABLE", "POND / FARM AVAILABLE")}</span>
              <select value={pondAvailable} onChange={e => setPondAvailable(e.target.value)}>
                {['Yes · existing pond','Yes · existing farm area','No · planned pond','No · scouting stage'].map(o => <option key={o} value={o}>{t(o, o)}</option>)}
              </select>
            </label>
            <label className="field"><span>{cultureType === 'freshwater' ? t('POND AREA (acres)', 'POND AREA (acres)') : t('CULTURE AREA (acres)', 'CULTURE AREA (acres)')}</span>
              <input type="number" min=".1" step=".1" value={pondArea} onChange={e => setPondArea(e.target.value)}/>
            </label>
            <label className="field"><span>{t("WATER QUALITY STATUS", "WATER QUALITY STATUS")}</span>
              <select value={waterQuality} onChange={e => setWaterQuality(e.target.value)}>
                {['Good','Needs testing','Seasonal variation','Poor — remediation needed'].map(o => <option key={o} value={o}>{t(o, o)}</option>)}
              </select>
            </label>
            <label className="field"><span>{t("INVESTMENT CAPACITY (₹)", "INVESTMENT CAPACITY (₹)")}</span>
              <input type="number" min="0" value={investment} onChange={e => setInvestment(e.target.value)}/>
            </label>
          </div>
          <button type="submit" className="button" style={{ marginTop: 12 }}>
            <ArrowRight size={14}/> {assessed ? t('Refresh assessment', 'Refresh assessment') : t('Assess suitability', 'Assess suitability')}
          </button>
        </form>

        <div className="pearl-result">
          <span className={suitability === 'GOOD' ? 'good-text' : 'negative-text'}>
            {t("SUITABILITY", "SUITABILITY")} · {t(suitability, suitability)} {assessed ? `· ${t('UPDATED', 'UPDATED')}` : ''}
          </span>
          <h2>{suitability === 'GOOD' ? t('Promising conditions', 'Promising conditions') : t('Review conditions', 'Review conditions')}</h2>
          <p>{t("Water quality must be professionally tested before stocking. These are reference estimates.", "Water quality must be professionally tested before stocking. These are reference estimates.")}</p>
          <div className="result-stats">
            <div><small>{cultureType === 'freshwater' ? t('Pond area', 'Pond area') : t('Farm area', 'Farm area')}</small><b>{Number(pondArea||0).toFixed(1)} {t('acre', 'acre')}</b></div>
            <div><small>{t('Estimated', 'Estimated')} {cultureType === 'freshwater' ? t('mussels', 'mussels') : t('oysters', 'oysters')}</small><b>{mussels.toLocaleString()}</b></div>
            <div><small>{t('Investment capacity', 'Investment capacity')}</small><b>{money(investment)}</b></div>
          </div>
          <div className="money-list">
            {[[t('Estimated revenue', 'Estimated revenue'), money(revenue)], [t('Estimated cost', 'Estimated cost'), money(cost)], [t('Indicative net', 'Indicative net'), money(net)]]
              .map(([a, b], i) => <div key={a}><span>{a}</span><b className={i === 2 ? 'good-text' : ''}>{b}</b></div>)}
          </div>
        </div>
      </div>

      {/* Bar chart (preserved) */}
      <Card title="Illustrative profitability by cycle" subtitle="Reference estimates — not guaranteed returns">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chart} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#edf1ed" vertical={false}/>
            <XAxis dataKey="cycle" tick={axis} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v => `₹${v/1000}k`} tick={axis} axisLine={false} tickLine={false}/>
            <Tooltip formatter={v => money(v)} contentStyle={tt}/>
            <Bar dataKey="revenue" name="Revenue" fill="#4e8a5d" radius={[5,5,0,0]} maxBarSize={40}/>
            <Bar dataKey="cost"    name="Cost"    fill="#d2a05b" radius={[5,5,0,0]} maxBarSize={40}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Species and parameters */}
      <div className="engine-two">
        <Card title="Suitable species" subtitle={`${cultureType === 'freshwater' ? 'Freshwater mussel' : 'Marine pearl oyster'} species for India`}>
          <ul className="pearl-list">
            {info.species.map(s => <li key={s}><CheckCircle2 size={12}/> {s}</li>)}
          </ul>
          <p style={{ fontSize: 10, color: '#7a897d', marginTop: 8 }}>Source: {info.source}</p>
        </Card>
        <Card title="Optimal water parameters" subtitle="Published thresholds — field measurement required">
          <div className="pearl-param-grid">
            {Object.entries(info.optimal).map(([k, v]) => (
              <div key={k} className="pearl-param-row">
                <span>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: '#7a897d', marginTop: 8 }}>
            Culture duration: {info.culture_duration} · Source: {info.source}
          </p>
        </Card>
      </div>

      {/* Suitable states */}
      <Card title={`Primary ${cultureType} pearl culture states in India`} subtitle="Based on suitable environmental conditions and established industry">
        <div className="pearl-states-grid">
          {info.indian_states.map(s => (
            <div key={s} className={`pearl-state-chip ${s === derivedState ? 'current' : ''}`}>
              {s}{s === derivedState ? ' ★' : ''}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 10, color: '#8a968c', marginTop: 8 }}>
          These states have established {cultureType} pearl culture activity. Suitability within each state varies by water body.
        </p>
      </Card>
    </div>
  )
}
