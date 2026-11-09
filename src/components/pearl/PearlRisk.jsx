import { useLanguage } from '../../context/LanguageContext'
/**
 * PearlRisk — Environmental risk assessment for pearl culture.
 * Freshwater: ICAR-CIFE Lamellidens spp. thresholds.
 * Marine: CMFRI / MPEDA Pinctada fucata thresholds.
 * Works offline with ERA5 historical climate; live weather when backend running.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader, ShieldAlert } from 'lucide-react'
import { Card, Notice } from '../../components'

const API = (import.meta.env.VITE_CROP_HEALTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8003' : 'https://agri-ai-jnpi.onrender.com')).replace(/\/$/, '')

const LEVEL_COLOR = {
  Low: '#3d8050', Moderate: '#b87c1a', High: '#c0392b', 'Insufficient Data': '#8a968c',
}

// Published thresholds per culture type (ICAR-CIFE / CMFRI)
const THRESHOLDS_INFO = {
  freshwater: [
    { cond: 'Temp > 38°C',          level: 'High',     effect: 'Mussel mortality; metabolic stress above 38°C.' },
    { cond: 'Temp 33–38°C',         level: 'Moderate', effect: 'Reduced feeding and growth above optimal 32°C.' },
    { cond: 'Temp < 12°C',          level: 'Moderate', effect: 'Metabolic shutdown; risk of shell damage in juveniles.' },
    { cond: 'Rainfall > 400 mm/mo', level: 'High',     effect: 'Flood risk; turbidity spike; oxygen depletion.' },
    { cond: 'Rainfall < 30 mm/mo',  level: 'Moderate', effect: 'Pond level drop; waste concentration.' },
    { cond: '22–32°C, 50–250 mm',   level: 'Low',      effect: 'Favourable conditions for pearl mussel growth.' },
  ],
  marine: [
    { cond: 'Temp > 36°C',          level: 'High',     effect: 'Oyster mortality above 36°C.' },
    { cond: 'Temp < 18°C',          level: 'Moderate', effect: 'Reduced filtering activity; growth slowdown.' },
    { cond: 'Rainfall > 800 mm/mo', level: 'High',     effect: 'Storm risk; salinity crash from freshwater influx.' },
    { cond: '25–31°C, 28–35 ppt',   level: 'Low',      effect: 'Optimal range for Pinctada fucata culture.' },
  ],
}

// ERA5 state climate profiles for offline assessment (pre-computed)
const ERA5_OFFLINE = {
  'Andhra Pradesh':  { mon_rain: 560,  tmax: 41.8, tmean: 29.5 },
  'Telangana':       { mon_rain: 580,  tmax: 42.0, tmean: 30.1 },
  'West Bengal':     { mon_rain: 1150, tmax: 37.4, tmean: 28.8 },
  'Odisha':          { mon_rain: 1090, tmax: 39.2, tmean: 29.2 },
  'Assam':           { mon_rain: 1420, tmax: 33.5, tmean: 26.8 },
  'Bihar':           { mon_rain: 620,  tmax: 41.2, tmean: 29.8 },
  'Uttar Pradesh':   { mon_rain: 620,  tmax: 42.5, tmean: 30.1 },
  'Chhattisgarh':    { mon_rain: 1050, tmax: 40.1, tmean: 29.4 },
  'Jharkhand':       { mon_rain: 1180, tmax: 38.2, tmean: 28.5 },
  'Karnataka':       { mon_rain: 780,  tmax: 38.5, tmean: 28.2 },
  'Tamil Nadu':      { mon_rain: 490,  tmax: 40.2, tmean: 29.8 },
  'Kerala':          { mon_rain: 1680, tmax: 34.5, tmean: 27.4 },
  'Maharashtra':     { mon_rain: 680,  tmax: 42.0, tmean: 30.2 },
  'Gujarat':         { mon_rain: 490,  tmax: 43.1, tmean: 31.0 },
  'Goa':             { mon_rain: 2100, tmax: 33.8, tmean: 28.0 },
}

function computeOfflineRisk(state, cultureType) {
  const cl = ERA5_OFFLINE[state]
  if (!cl) return null
  const risks = []
  let score = 0
  const rain30 = cl.mon_rain / 4

  const maxRain    = cultureType === 'freshwater' ? 400  : 800
  const heatHigh   = cultureType === 'freshwater' ? 38   : 36
  const heatMod    = cultureType === 'freshwater' ? 33   : 31
  const coldMod    = cultureType === 'freshwater' ? 12   : 18
  const src        = cultureType === 'freshwater' ? 'ICAR-CIFE' : 'CMFRI / MPEDA'

  if (cl.tmax > heatHigh) {
    risks.push({ id:'heat_high', level:'High', signal:`Extreme heat: max ~${cl.tmax}°C`, effect:`Mortality risk above ${heatHigh}°C (${src}).`, source:src })
    score += 40
  } else if (cl.tmax > heatMod) {
    risks.push({ id:'heat_mod', level:'Moderate', signal:`Heat stress: max ~${cl.tmax}°C`, effect:'Reduced growth above optimal range.', source:src })
    score += 18
  }
  if (cl.tmean < coldMod) {
    risks.push({ id:'cold', level:'Moderate', signal:`Cold risk: mean ~${cl.tmean}°C`, effect:'Metabolic slowdown below optimal range.', source:src })
    score += 20
  }
  if (rain30 > maxRain) {
    risks.push({ id:'rain_high', level:'High', signal:`Excess rainfall: ~${Math.round(rain30)} mm/month`, effect:'Flood risk, turbidity, oxygen depletion.', source:'ERA5 historical' })
    score += 30
  } else if (rain30 < 30 && cultureType === 'freshwater') {
    risks.push({ id:'rain_low', level:'Moderate', signal:`Low rainfall: ~${Math.round(rain30)} mm/month`, effect:'Pond level drop; waste concentration risk.', source:'ERA5 historical' })
    score += 20
  }
  if (!risks.length) {
    risks.push({ id:'ok', level:'Low', signal:`Climate broadly suitable: mean ${cl.tmean}°C, ~${Math.round(rain30)} mm/month`, effect:'Conditions within typical range.', source:'ERA5 historical' })
  }
  score = Math.min(100, score)
  return {
    state, cultureType, overall_risk_level: score < 25 ? 'Low' : score < 55 ? 'Moderate' : 'High',
    overall_risk_score: score, risk_signals: risks,
    climate_source: `ERA5 historical average for ${state} (offline)`,
    disclaimer: 'Based on ERA5 historical climate averages. Field water-quality measurements required for accurate risk assessment.',
  }
}

function RiskCard({ signal }) {
  const color = LEVEL_COLOR[signal.level] || '#8a968c'
  const Icon  = signal.level === 'Low' ? CheckCircle2 : AlertTriangle
  return (
    <div className="lac-risk-card" style={{ borderLeftColor: color }}>
      <div className="lac-risk-header">
        <Icon size={14} style={{ color, flexShrink: 0 }}/>
        <b>{signal.signal}</b>
        <span className="lac-risk-chip" style={{ color, borderColor: color }}>{signal.level}</span>
      </div>
      <p className="lac-risk-effect">{signal.effect}</p>
      <span className="lac-risk-source">Source: {signal.source}</span>
    </div>
  )
}

export default function PearlRisk({ lat, lng, cultureType = 'freshwater', derivedState, district, sampleSeed }) {
  const { t } = useLanguage()
  const [stateInput, setStateInput] = useState(derivedState || 'Andhra Pradesh')
  const [distInput,  setDistInput]  = useState(district || '')
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(false)

  const pearLStates = Object.keys(ERA5_OFFLINE)

  const assess = async (overrideState, overrideDist) => {
    const st = overrideState || stateInput
    const dt = overrideDist !== undefined ? overrideDist : distInput
    setLoading(true); setResult(null)
    // Offline first
    const offline = computeOfflineRisk(st, cultureType)
    // Try live backend
    const coords = st === 'Tamil Nadu' ? [8.7642, 78.1348] : [14.4426, 79.9865]
    const useLat = lat || coords[0]
    const useLng = lng || coords[1]
    if (useLat && useLng) {
      try {
        const params = new URLSearchParams({ lat: useLat, lng: useLng, culture_type: cultureType,
          ...(st && { state: st }), ...(dt && { district: dt }) })
        const res  = await fetch(`${API}/api/pearl/env-risk?${params}`, { signal: AbortSignal.timeout(8000) })
        const data = await res.json()
        if (res.ok) { setResult({ ...data, climate_source: 'NASA POWER live 30-day' }); setLoading(false); return }
      } catch { /* offline */ }
    }
    setResult(offline)
    setLoading(false)
  }

  useEffect(() => {
    if (sampleSeed) {
      const st = cultureType === 'marine' ? 'Tamil Nadu' : 'Andhra Pradesh'
      const dt = cultureType === 'marine' ? 'Thoothukudi' : 'Nellore'
      setStateInput(st)
      setDistInput(dt)
      assess(st, dt)
    }
  }, [sampleSeed, cultureType])

  const overallColor = result ? LEVEL_COLOR[result.overall_risk_level] : '#8a968c'
  const info = THRESHOLDS_INFO[cultureType] || []

  return (
    <div className="page">
      <Notice>
        Risk signals are calculated from published ICAR-CIFE (freshwater) and CMFRI (marine)
        thresholds applied to climate data. They do not confirm mortality, disease, or contamination.
        Field measurements of DO, pH, and turbidity are required for site-specific decisions.
      </Notice>

      <Card title="Risk assessment inputs">
        <div className="input-grid columns-2">
          <label className="field">
            <span>STATE</span>
            <select value={stateInput} onChange={e => { setStateInput(e.target.value); setResult(null) }}>
              {pearLStates.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="field">
            <span>DISTRICT (optional)</span>
            <input value={distInput} onChange={e => setDistInput(e.target.value)} placeholder="e.g. Krishna, West Godavari"/>
          </label>
        </div>
        {!lat && (
          <p style={{ fontSize: 10, color: '#7a897d', marginTop: 6 }}>
            Tip: locate site on Suitability tab for live NASA POWER weather. ERA5 historical climate used now.
          </p>
        )}
        <button className="button" style={{ marginTop: 12 }} onClick={assess} disabled={loading}>
          {loading ? <><Loader size={14} className="spin"/> Assessing…</> : <><ShieldAlert size={14}/> Assess risk</>}
        </button>
      </Card>

      {result && (
        <>
          <div className="lac-risk-summary" style={{ borderColor: overallColor }}>
            <div className="lac-risk-score" style={{ color: overallColor }}>
              <b>{result.overall_risk_score}</b><small>/100</small>
            </div>
            <div>
              <span className="eyebrow">OVERALL ENVIRONMENTAL RISK — {cultureType.toUpperCase()}</span>
              <h3 style={{ color: overallColor, margin: '4px 0' }}>{result.overall_risk_level} Risk</h3>
              <p style={{ fontSize: 10, color: '#7a897d', marginTop: 4 }}>
                {result.climate_source}
              </p>
              <p style={{ fontSize: 10, color: '#7a897d', marginTop: 3 }}>{result.disclaimer}</p>
            </div>
          </div>

          <Card title="Risk signals" subtitle={`${result.risk_signals.length} signals detected`}>
            <div className="lac-risk-signals">
              {result.risk_signals.map((s, i) => <RiskCard key={i} signal={s}/>)}
            </div>
          </Card>
        </>
      )}

      <Card title="Published risk thresholds" subtitle={`${cultureType === 'freshwater' ? 'ICAR-CIFE Lamellidens spp.' : 'CMFRI Pinctada fucata'}`}>
        <div className="lac-thresh-table">
          {info.map(({ cond, level, effect }) => (
            <div key={cond} className="lac-thresh-row">
              <span style={{ color: LEVEL_COLOR[level] }}>{level}</span>
              <b>{cond}</b>
              <small>{effect}</small>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
