import { useLanguage } from '../../context/LanguageContext'
/**
 * WaterQuality — Full water-quality monitoring dashboard for pearl culture.
 *
 * Sections:
 *   A. Current overview cards — latest value per parameter with status + timestamp
 *   B. Trend charts — time-range selector, threshold reference lines
 *   C. Data entry — enriched form with method/source fields + CSV upload
 *   D. Alerts — violations with severity, measured value, threshold, next step
 *
 * Data stored in localStorage. No fabricated sensor readings.
 * Thresholds: ICAR-CIFE (freshwater) / CMFRI (marine) published guidelines.
 */
import { useEffect, useRef, useState, useMemo } from 'react'
import {
  AlertTriangle, CheckCircle2, Download, Pencil, Plus, Trash2,
  Upload, XCircle, Activity, Droplets, Thermometer,
} from 'lucide-react'
import {
  CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, Notice } from '../../components'

// ── Constants ─────────────────────────────────────────────────────────────────

const axis = { fontSize: 11, fill: '#738176' }
const tt   = { border: '1px solid #e0e8e0', borderRadius: 8, fontSize: 12 }

const THRESHOLDS = {
  freshwater: {
    temperature:       { min: 22,  max: 32,  unit: '°C',          name: 'Temperature',       icon: Thermometer, color: '#e76f51' },
    pH:                { min: 7.0, max: 8.5,  unit: '',            name: 'pH',                icon: Activity,    color: '#4e9af1' },
    dissolved_oxygen:  { min: 5,   max: 12,  unit: 'mg/L',         name: 'Dissolved Oxygen',  icon: Droplets,    color: '#2d6a4f' },
    turbidity:         { min: 0,   max: 50,  unit: 'NTU',          name: 'Turbidity',         icon: Activity,    color: '#f4a261' },
    hardness:          { min: 75,  max: 300, unit: 'mg/L CaCO\u2083', name: 'Hardness',        icon: Activity,    color: '#8b7355' },
    alkalinity:        { min: 50,  max: 200, unit: 'mg/L',         name: 'Alkalinity',        icon: Activity,    color: '#6c63ac' },
  },
  marine: {
    temperature:       { min: 25,  max: 31,  unit: '°C',    name: 'Temperature',      icon: Thermometer, color: '#e76f51' },
    pH:                { min: 7.8, max: 8.3,  unit: '',      name: 'pH',               icon: Activity,    color: '#4e9af1' },
    dissolved_oxygen:  { min: 5,   max: 12,  unit: 'mg/L',  name: 'Dissolved Oxygen', icon: Droplets,    color: '#2d6a4f' },
    salinity:          { min: 28,  max: 35,  unit: 'ppt',   name: 'Salinity',         icon: Activity,    color: '#1a5c8a' },
    turbidity:         { min: 0,   max: 30,  unit: 'NTU',   name: 'Turbidity',        icon: Activity,    color: '#f4a261' },
  },
}

// Alert severity rules and recommended actions
const ALERT_ACTIONS = {
  temperature_low:        { sev:'Moderate', action:'Water temperature is below the optimal range. Reduce shading if applicable, or wait for seasonal warming. Monitor mussel/oyster feeding activity.' },
  temperature_high:       { sev:'High',     action:'Water temperature exceeds the optimal threshold. Increase water flow or aeration. Move cages to deeper, cooler water if possible. Monitor for stress signs.' },
  pH_low:                 { sev:'High',     action:'Low pH increases carbonate solubility and can dissolve mussel shells. Check for organic matter decomposition or acid rain input. Consider water exchange.' },
  pH_high:                { sev:'Moderate', action:'High pH can cause ammonia toxicity. Check for algal bloom. Increase water circulation.' },
  dissolved_oxygen_low:   { sev:'High',     action:'Dissolved oxygen is critically low. Immediately increase aeration or water exchange. Check for excess organic load or algal die-off. Retest within 2 hours.' },
  dissolved_oxygen_high:  { sev:'Low',      action:'Supersaturation of oxygen (usually from algal bloom). Monitor for gas-bubble disease. Reduce algal growth if persistent.' },
  turbidity_high:         { sev:'Moderate', action:'High turbidity reduces light penetration and food availability. Identify sediment or runoff source. Avoid stocking or implantation during high turbidity events.' },
  salinity_low:           { sev:'High',     action:'Low salinity from freshwater influx (rain, river). Move oysters to deeper water or sheltered site. Monitor closely — sudden salinity drop causes high mortality in Pinctada fucata.' },
  salinity_high:          { sev:'Moderate', action:'Salinity above optimal range. Check evaporation in summer. Ensure water exchange. Monitor feeding activity.' },
  hardness_low:           { sev:'Moderate', action:'Low water hardness may limit shell mineralisation. Consider liming the pond (consult an aquaculture expert for dosage). Retest after 48 hours.' },
  alkalinity_low:         { sev:'Moderate', action:'Low alkalinity reduces buffering capacity, increasing pH fluctuation risk. Consider adding agricultural lime. Consult a fisheries expert before treatment.' },
}

const SEV_COLOR = { High: '#c0392b', Moderate: '#b87c1a', Low: '#3d8050' }
const STATUS_COLOR = { ok: '#3d8050', low: '#b87c1a', high: '#c0392b' }

const STORAGE_KEY = 'pearl_water_quality'
function loadObs()  { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } }
function saveObs(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function checkThreshold(param, value, cultureType) {
  const t = THRESHOLDS[cultureType]?.[param]
  if (!t || value === '' || value === null || value === undefined || isNaN(value)) return null
  const v = parseFloat(value)
  if (v < t.min) return { status: 'low',  label: `Below minimum (${t.min} ${t.unit})` }
  if (v > t.max) return { status: 'high', label: `Above maximum (${t.max} ${t.unit})` }
  return { status: 'ok', label: `Within range (${t.min}\u2013${t.max} ${t.unit})` }
}

function getAlertKey(param, status) {
  return status === 'ok' ? null : `${param}_${status}`
}

// Filter observations by date range
function filterByRange(obs, range) {
  if (!range || range === 'all') return obs
  const now  = new Date()
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : null
  if (!days) return obs
  const cutoff = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10)
  return obs.filter(o => o.date >= cutoff)
}

const EMPTY_OBS = {
  date: new Date().toISOString().slice(0, 10),
  time: new Date().toTimeString().slice(0, 5),
  location: '', culture_type: 'freshwater', species: '',
  temperature: '', pH: '', dissolved_oxygen: '', turbidity: '',
  salinity: '', hardness: '', alkalinity: '',
  method: 'Field kit', source: 'Self-measurement', notes: '',
}

// ── Section A helper: Overview card ──────────────────────────────────────────

function ParamCard({ param, thresh, latest, allObs, cultureType }) {
  const val = latest?.[param]
  const chk = checkThreshold(param, val, cultureType)
  const prev = allObs.slice(1).find(o => o[param] !== '' && o[param] !== undefined)
  const trend = (val && prev?.[param])
    ? parseFloat(val) > parseFloat(prev[param]) ? '+' : parseFloat(val) < parseFloat(prev[param]) ? '\u2212' : '='
    : null
  const statusColor = chk ? STATUS_COLOR[chk.status] : '#8a968c'
  const Icon = thresh.icon || Activity

  return (
    <div className="wq-param-card" style={{ borderTop: `3px solid ${statusColor}` }}>
      <div className="wq-param-header">
        <span className="wq-param-icon" style={{ background: statusColor + '18', color: statusColor }}>
          <Icon size={15}/>
        </span>
        <div>
          <small className="wq-param-label">{thresh.name.toUpperCase()}</small>
          {chk && (
            <span className="wq-status-badge" style={{ background: statusColor + '18', color: statusColor }}>
              {chk.status === 'ok' ? 'Normal' : chk.status === 'high' ? 'Too high' : 'Too low'}
            </span>
          )}
        </div>
      </div>
      {val !== '' && val !== undefined ? (
        <div className="wq-param-value">
          <b style={{ color: statusColor }}>{val}</b>
          <span>{thresh.unit}</span>
          {trend && <span className="wq-trend">{trend}</span>}
        </div>
      ) : (
        <div className="wq-param-value wq-no-data">No data</div>
      )}
      <div className="wq-param-footer">
        <small>Optimal: {thresh.min}\u2013{thresh.max} {thresh.unit}</small>
        {latest?.date && <small>{latest.date}{latest.time ? ' ' + latest.time : ''}</small>}
      </div>
      {chk && chk.status !== 'ok' && (
        <div className="wq-param-alert" style={{ color: statusColor }}>
          <AlertTriangle size={11}/> {chk.label}
        </div>
      )}
    </div>
  )
}

// ── Section C: Data entry form ────────────────────────────────────────────────

function ObsForm({ initial, cultureType, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_OBS, culture_type: cultureType, ...initial })
  const [err,  setErr]  = useState('')
  const fileRef         = useRef(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const thresh = THRESHOLDS[form.culture_type] || {}

  const submit = e => {
    e.preventDefault(); setErr('')
    if (!form.date)     { setErr('Date is required.'); return }
    if (!form.location) { setErr('Water body / farm name is required.'); return }
    const anyValue = Object.keys(thresh).some(k => form[k] !== '' && form[k] !== undefined)
    if (!anyValue) { setErr('Enter at least one measurement.'); return }
    onSave({ ...form, id: form.id || `obs_${Date.now()}` })
  }

  // CSV upload
  const handleCSV = e => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const lines  = ev.target.result.split('\n').filter(l => l.trim())
        const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g,'_'))
        const rows   = lines.slice(1).map(line => {
          const vals = line.split(',')
          const row  = {}
          header.forEach((h, i) => { row[h] = vals[i]?.trim() || '' })
          return { ...EMPTY_OBS, culture_type: form.culture_type, ...row,
                   id: `obs_csv_${Date.now()}_${Math.random().toString(36).slice(2,6)}` }
        }).filter(r => r.date && r.location)
        if (rows.length > 0) { rows.forEach(r => onSave(r)); setErr(`Imported ${rows.length} record${rows.length>1?'s':''}.`) }
        else setErr('No valid rows found. Check CSV has date and location columns.')
      } catch { setErr('CSV parse error — check file format.') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="input-grid columns-2">
        {/* Identity */}
        <label className="field"><span>DATE *</span>
          <input type="date" value={form.date} onChange={e=>set('date',e.target.value)}/></label>
        <label className="field"><span>TIME</span>
          <input type="time" value={form.time||''} onChange={e=>set('time',e.target.value)}/></label>
        <label className="field"><span>WATER BODY / FARM NAME *</span>
          <input value={form.location} onChange={e=>set('location',e.target.value)} placeholder="e.g. Pond A, Kolleru Lake"/></label>
        <label className="field"><span>CULTURE TYPE</span>
          <select value={form.culture_type} onChange={e=>set('culture_type',e.target.value)}>
            <option value="freshwater">Freshwater</option>
            <option value="marine">Marine</option>
          </select>
        </label>
        <label className="field"><span>SPECIES (optional)</span>
          <input value={form.species||''} onChange={e=>set('species',e.target.value)} placeholder="e.g. Lamellidens marginalis"/></label>
        <label className="field"><span>MEASUREMENT METHOD</span>
          <select value={form.method||'Field kit'} onChange={e=>set('method',e.target.value)}>
            {['Field kit','Laboratory analysis','Portable meter','Colorimetric','Visual estimate','Other'].map(m=><option key={m}>{m}</option>)}
          </select>
        </label>
        <label className="field"><span>DATA SOURCE</span>
          <select value={form.source||'Self-measurement'} onChange={e=>set('source',e.target.value)}>
            {['Self-measurement','Fisheries department','Research institution','Laboratory','Other'].map(s=><option key={s}>{s}</option>)}
          </select>
        </label>
        <div/>
        {/* Measurements */}
        {Object.entries(thresh).map(([k, t]) => (
          <label key={k} className="field">
            <span>{t.name.toUpperCase()} {t.unit ? `(${t.unit})` : ''}</span>
            <input type="number" step="0.01" value={form[k]||''} onChange={e=>set(k,e.target.value)}
              placeholder={`Optimal ${t.min}\u2013${t.max}`}
              style={ checkThreshold(k, form[k], form.culture_type)?.status === 'high' ? {borderColor:'#c0392b'} :
                      checkThreshold(k, form[k], form.culture_type)?.status === 'low'  ? {borderColor:'#b87c1a'} : {}}/>
          </label>
        ))}
        {/* Notes */}
        <label className="field" style={{gridColumn:'1/-1'}}>
          <span>NOTES</span>
          <textarea rows={2} value={form.notes||''} onChange={e=>set('notes',e.target.value)}
            style={{width:'100%',padding:'6px 9px',border:'1px solid #dfe6df',borderRadius:6,fontSize:11,fontFamily:'inherit',resize:'vertical'}}
            placeholder="Weather conditions, observations, equipment notes..."/>
        </label>
      </div>
      {err && <p className="pearl-error" style={{color: err.startsWith('Imported') ? '#3d8050' : '#c0392b'}}>
        {err.startsWith('Imported') ? <CheckCircle2 size={12}/> : <AlertTriangle size={12}/>} {err}
      </p>}
      <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap',alignItems:'center'}}>
        <button type="submit" className="button"><CheckCircle2 size={14}/> Save observation</button>
        <button type="button" className="button secondary" onClick={onCancel}><XCircle size={14}/> Cancel</button>
        <label className="button secondary" style={{cursor:'pointer',marginLeft:'auto'}}>
          <Upload size={13}/> Upload CSV
          <input type="file" accept=".csv,.txt" ref={fileRef} style={{display:'none'}} onChange={handleCSV}/>
        </label>
      </div>
      <p style={{fontSize:9,color:'#8a968c',marginTop:6}}>
        CSV format: date, location, culture_type, temperature, pH, dissolved_oxygen, turbidity, salinity, hardness, alkalinity
      </p>
    </form>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

// ── Sample water-quality observations ────────────────────────────────────────

function buildSampleWQ() {
  const today = new Date()
  const ago   = (d, hr='08:00') => {
    const x = new Date(today); x.setDate(x.getDate() - d)
    return { date: x.toISOString().slice(0,10), time: hr }
  }

  // Freshwater observations — Kolleru Lake, Andhra Pradesh
  // Realistic values with one deliberate low-DO alert to demonstrate the alert panel
  const fw = [
    { ...ago(0,'09:15'),  id:'wqs_01', location:'Kolleru Pond A', culture_type:'freshwater', species:'Lamellidens marginalis',
      temperature:'28.4', pH:'7.6', dissolved_oxygen:'6.8', turbidity:'32', hardness:'185', alkalinity:'112',
      method:'Portable meter', source:'Self-measurement', notes:'Post-rain check — normal conditions.' },
    { ...ago(7,'08:30'),  id:'wqs_02', location:'Kolleru Pond A', culture_type:'freshwater', species:'Lamellidens marginalis',
      temperature:'29.1', pH:'7.4', dissolved_oxygen:'3.9', turbidity:'58', hardness:'182', alkalinity:'108',
      method:'Portable meter', source:'Self-measurement', notes:'Heavy rain night before — turbidity and DO affected. Increased aeration.' },
    { ...ago(14,'09:00'), id:'wqs_03', location:'Kolleru Pond A', culture_type:'freshwater', species:'Lamellidens marginalis',
      temperature:'27.8', pH:'7.7', dissolved_oxygen:'7.2', turbidity:'28', hardness:'188', alkalinity:'115',
      method:'Portable meter', source:'Self-measurement', notes:'Routine monthly measurement.' },
    { ...ago(21,'08:45'), id:'wqs_04', location:'Kolleru Pond A', culture_type:'freshwater', species:'Lamellidens marginalis',
      temperature:'26.5', pH:'7.8', dissolved_oxygen:'7.5', turbidity:'22', hardness:'190', alkalinity:'118',
      method:'Field kit', source:'Self-measurement', notes:'Good conditions.' },
    { ...ago(28,'09:00'), id:'wqs_05', location:'Kolleru Pond A', culture_type:'freshwater', species:'Lamellidens marginalis',
      temperature:'25.9', pH:'7.9', dissolved_oxygen:'8.1', turbidity:'18', hardness:'192', alkalinity:'120',
      method:'Field kit', source:'Self-measurement', notes:'Best readings this month.' },
    // Pond B observations
    { ...ago(3,'07:30'),  id:'wqs_06', location:'Kolleru Pond B', culture_type:'freshwater', species:'Lamellidens marginalis',
      temperature:'28.2', pH:'7.8', dissolved_oxygen:'7.1', turbidity:'30', hardness:'180', alkalinity:'110',
      method:'Field kit', source:'Self-measurement', notes:'Routine check.' },
    { ...ago(10,'08:00'), id:'wqs_07', location:'Kolleru Pond B', culture_type:'freshwater', species:'Lamellidens marginalis',
      temperature:'27.5', pH:'7.6', dissolved_oxygen:'6.9', turbidity:'25', hardness:'178', alkalinity:'108',
      method:'Field kit', source:'Self-measurement', notes:'' },
  ]

  // Marine observations — Chilika Lagoon, Odisha (Pinctada fucata)
  const ma = [
    { ...ago(0,'07:00'),  id:'wqs_08', location:'Chilika Lagoon Site 1', culture_type:'marine', species:'Pinctada fucata',
      temperature:'28.6', pH:'8.1', dissolved_oxygen:'6.9', turbidity:'12', salinity:'30',
      method:'Portable meter', source:'Self-measurement', notes:'Post-monsoon season. Salinity recovering.' },
    { ...ago(7,'07:15'),  id:'wqs_09', location:'Chilika Lagoon Site 1', culture_type:'marine', species:'Pinctada fucata',
      temperature:'29.2', pH:'8.0', dissolved_oxygen:'6.5', turbidity:'18', salinity:'28',
      method:'Portable meter', source:'Self-measurement', notes:'Salinity slightly low after recent rainfall. Monitor closely.' },
    { ...ago(14,'07:00'), id:'wqs_10', location:'Chilika Lagoon Site 1', culture_type:'marine', species:'Pinctada fucata',
      temperature:'28.8', pH:'8.2', dissolved_oxygen:'7.1', turbidity:'10', salinity:'31',
      method:'Portable meter', source:'Self-measurement', notes:'Good conditions. Long-lines inspected.' },
    { ...ago(21,'08:00'), id:'wqs_11', location:'Chilika Lagoon Site 1', culture_type:'marine', species:'Pinctada fucata',
      temperature:'28.0', pH:'8.1', dissolved_oxygen:'7.4', turbidity:'9',  salinity:'32',
      method:'Field kit',     source:'Fisheries department', notes:'Joint monitoring with district fisheries office.' },
    { ...ago(28,'07:30'), id:'wqs_12', location:'Chilika Lagoon Site 1', culture_type:'marine', species:'Pinctada fucata',
      temperature:'27.5', pH:'8.2', dissolved_oxygen:'7.8', turbidity:'8',  salinity:'33',
      method:'Field kit',     source:'Self-measurement', notes:'Optimal conditions — all parameters within range.' },
  ]

  return [...fw, ...ma]
}

function loadSampleWQ()  {
  const data = buildSampleWQ()
  localStorage.setItem('pearl_water_quality', JSON.stringify(data))
  return data
}

function clearWQData() {
  localStorage.removeItem('pearl_water_quality')
}

export default function WaterQuality({ cultureType = 'freshwater', sampleSeed }) {
  const { t } = useLanguage()
  const [obs,        setObs]        = useState(() => loadObs())
  const [showForm,   setShowForm]   = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [filterType, setFilterType] = useState(cultureType)
  const [chartParam, setChartParam] = useState('temperature')
  const [dateRange,  setDateRange]  = useState('30d')
  const [locationFilter, setLocFilter] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const persist = d => { saveObs(d); setObs(d) }

  const handleLoadSample = () => {
    const data = loadSampleWQ()
    setObs(data)
    setFilterType(cultureType || 'freshwater')
    setConfirmClear(false)
  }

  useEffect(() => {
    if (sampleSeed) {
      handleLoadSample()
    }
  }, [sampleSeed, cultureType])

  const handleClear = () => {
    clearWQData(); setObs([]); setConfirmClear(false)
  }

  const handleSave = data => {
    const idx = obs.findIndex(o => o.id === data.id)
    persist(idx >= 0 ? obs.map(o => o.id === data.id ? data : o) : [...obs, data])
    setShowForm(false); setEditing(null)
  }
  const handleDelete = id => persist(obs.filter(o => o.id !== id))

  // Filtered obs (type + location)
  const byType = obs.filter(o => o.culture_type === filterType)
  const locations = [...new Set(byType.map(o => o.location).filter(Boolean))].sort()
  const filtered  = byType
    .filter(o => !locationFilter || o.location === locationFilter)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time||'').localeCompare(a.time||''))

  const inRange = filterByRange(filtered, dateRange)
  const thresh  = THRESHOLDS[filterType] || {}

  // Section A: latest value per parameter
  const latest = filtered[0] || null

  // Section B: chart data — all params for selected range
  const chartData = useMemo(() => {
    const pts = filterByRange(filtered, dateRange).slice(0, 60).reverse()
    return pts.map(o => {
      const row = { date: o.date.slice(5) + (o.time ? ' '+o.time.slice(0,5) : '') }
      Object.keys(thresh).forEach(k => { row[k] = o[k] ? parseFloat(o[k]) : null })
      return row
    })
  }, [filtered, dateRange, filterType])

  // Section D: alerts from latest observation
  const alerts = useMemo(() => {
    if (!latest) return []
    const out = []
    Object.keys(thresh).forEach(param => {
      const chk = checkThreshold(param, latest[param], filterType)
      if (!chk || chk.status === 'ok') return
      const key = getAlertKey(param, chk.status)
      const info = key ? ALERT_ACTIONS[key] : null
      out.push({
        param, status: chk.status, value: latest[param],
        unit: thresh[param].unit, name: thresh[param].name,
        threshold: chk.label,
        sev: info?.sev || 'Moderate',
        action: info?.action || 'Recheck the measurement and consult an aquaculture expert.',
        timestamp: latest.date + (latest.time ? ' ' + latest.time : ''),
        location: latest.location,
      })
    })
    return out.sort((a, b) => {
      const order = { High:0, Moderate:1, Low:2 }
      return (order[a.sev]||2) - (order[b.sev]||2)
    })
  }, [latest, filterType, thresh])

  // CSV export
  const exportCSV = () => {
    const cols = ['date','time','location','culture_type','species','temperature','pH','dissolved_oxygen',
                  'turbidity','salinity','hardness','alkalinity','method','source','notes']
    const rows = filtered.map(o => cols.map(c => o[c]||'').join(','))
    const blob = new Blob([cols.join(',')+'\n'+rows.join('\n')], { type:'text/csv' })
    const a    = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `pearl-water-quality-${filterType}-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <div className="page">
      <Notice>
        Enter actual field measurements only. Thresholds from ICAR-CIFE (freshwater) and CMFRI (marine).
        These are reference ranges — all management decisions should involve a qualified aquaculture expert.
      </Notice>

      {/* ── Controls bar ───────────────────────────────────────────────────── */}
      <div className="wq-controls">
        <select value={filterType} onChange={e=>{setFilterType(e.target.value);setLocFilter('')}} className="cf-filter-select">
          <option value="freshwater">Freshwater</option>
          <option value="marine">Marine</option>
        </select>
        <select value={locationFilter} onChange={e=>setLocFilter(e.target.value)} className="cf-filter-select">
          <option value="">All locations</option>
          {locations.map(l=><option key={l}>{l}</option>)}
        </select>
        <button className="button" onClick={()=>{setShowForm(v=>!v);setEditing(null)}}>
          <Plus size={14}/> {showForm?'Cancel':'Add observation'}
        </button>
        {filtered.length > 0 && (
          <button className="button secondary" onClick={exportCSV}>
            <Download size={13}/> Export CSV
          </button>
        )}
        {alerts.length > 0 && (
          <span className="wq-alert-badge">
            <AlertTriangle size={12}/> {alerts.length} alert{alerts.length>1?'s':''}
          </span>
        )}
        {/* Sample data controls */}
        <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
          <button className="button secondary" style={{fontSize:10}} onClick={handleLoadSample}>
            ↓ Sample data
          </button>
          {obs.length > 0 && (
            confirmClear ? (
              <>
                <button className="button" style={{fontSize:10,background:'#c0392b',borderColor:'#c0392b'}} onClick={handleClear}>Confirm clear</button>
                <button className="button secondary" style={{fontSize:10}} onClick={()=>setConfirmClear(false)}>Cancel</button>
              </>
            ) : (
              <button className="button secondary" style={{fontSize:10}} onClick={()=>setConfirmClear(true)}>Clear all</button>
            )
          )}
        </div>
      </div>

      {/* Sample data info card — shown when empty */}
      {obs.length === 0 && (
        <div className="pcc-sample-card">
          <div className="pcc-sample-info">
            <Droplets size={18}/>
            <div>
              <b>Load sample water-quality data</b>
              <p>12 observations across 3 sites — Kolleru Pond A &amp; B (freshwater, Andhra Pradesh) and Chilika Lagoon (marine, Odisha). Includes one low dissolved-oxygen alert to demonstrate the alert panel.</p>
            </div>
          </div>
          <button className="button" onClick={handleLoadSample}>↓ Load sample data</button>
        </div>
      )}

      {/* ── Section C: Data entry ───────────────────────────────────────────── */}
      {(showForm && !editing) && (
        <Card title="New water-quality observation" subtitle="Enter actual field measurements — no estimated values">
          <ObsForm cultureType={filterType} initial={{ ...EMPTY_OBS, culture_type:filterType }}
            onSave={handleSave} onCancel={()=>setShowForm(false)}/>
        </Card>
      )}

      {/* ── Section A: Overview cards ───────────────────────────────────────── */}
      {latest ? (
        <div>
          <div className="wq-overview-header">
            <b>Current Water Quality Overview</b>
            <small>Latest: {latest.location} · {latest.date}{latest.time ? ' '+latest.time : ''} · {latest.source||'Field measurement'}</small>
          </div>
          <div className="wq-param-grid">
            {Object.entries(thresh).map(([k, t]) => (
              <ParamCard key={k} param={k} thresh={t} latest={latest}
                allObs={filtered} cultureType={filterType}/>
            ))}
          </div>
        </div>
      ) : (
        <div className="pearl-empty" style={{border:'1px dashed #d0dcd0',borderRadius:10,padding:28}}>
          <Activity size={28} style={{color:'#b5c2b7',margin:'0 auto 8px',display:'block'}}/>
          <p>No observations yet. Add your first water-quality measurement to see the overview.</p>
        </div>
      )}

      {/* ── Section D: Alerts ───────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <Card title="Water Quality Alerts" subtitle={`${alerts.length} parameter${alerts.length>1?'s':''} outside optimal range — latest observation`}>
          <div className="wq-alerts">
            {alerts.map((a, i) => (
              <div key={i} className="wq-alert-card" style={{borderLeftColor: SEV_COLOR[a.sev]}}>
                <div className="wq-alert-header">
                  <AlertTriangle size={14} style={{color:SEV_COLOR[a.sev],flexShrink:0}}/>
                  <div>
                    <b>{a.name} is {a.status === 'high' ? 'too high' : 'too low'}</b>
                    <span className="wq-alert-sev" style={{color:SEV_COLOR[a.sev],borderColor:SEV_COLOR[a.sev]}}>
                      {a.sev}
                    </span>
                  </div>
                </div>
                <div className="wq-alert-body">
                  <div className="wq-alert-row">
                    <span>Measured value</span>
                    <b style={{color:SEV_COLOR[a.sev]}}>{a.value} {a.unit}</b>
                  </div>
                  <div className="wq-alert-row">
                    <span>Threshold</span><b>{a.threshold}</b>
                  </div>
                  <div className="wq-alert-row">
                    <span>Observation time</span><b>{a.timestamp}</b>
                  </div>
                  <div className="wq-alert-row">
                    <span>Location</span><b>{a.location}</b>
                  </div>
                </div>
                <div className="wq-alert-action">
                  <CheckCircle2 size={12} style={{color:'#2d6a4f',flexShrink:0,marginTop:1}}/>
                  <span>{a.action}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Section B: Trend charts ─────────────────────────────────────────── */}
      {filtered.length > 1 && (
        <Card
          title="Water Quality Trend Charts"
          subtitle={`${thresh[chartParam]?.name} over time with threshold lines`}
          action={
            <div style={{display:'flex',gap:6}}>
              <select value={dateRange} onChange={e=>setDateRange(e.target.value)} className="cf-filter-select">
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 3 months</option>
                <option value="all">All time</option>
              </select>
              <select value={chartParam} onChange={e=>setChartParam(e.target.value)} className="cf-filter-select">
                {Object.entries(thresh).map(([k,t])=><option key={k} value={k}>{t.name}</option>)}
              </select>
            </div>
          }
        >
          {chartData.filter(d => d[chartParam] !== null).length < 2 ? (
            <p style={{fontSize:11,color:'#8a968c',padding:'20px 0',textAlign:'center'}}>
              Not enough data points in the selected range. Add more observations or select a wider date range.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{top:10,right:12,left:0,bottom:0}}>
                  <CartesianGrid stroke="#edf1ed" vertical={false}/>
                  <XAxis dataKey="date" tick={{fontSize:10,fill:'#738176'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={axis} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={tt} formatter={(v,n)=>[v,n]}/>
                  {thresh[chartParam] && (
                    <>
                      <ReferenceLine y={thresh[chartParam].min} stroke="#b87c1a" strokeDasharray="4 3"
                        label={{value:'Min',fontSize:9,fill:'#b87c1a',position:'insideTopLeft'}}/>
                      <ReferenceLine y={thresh[chartParam].max} stroke="#c0392b" strokeDasharray="4 3"
                        label={{value:'Max',fontSize:9,fill:'#c0392b',position:'insideTopLeft'}}/>
                    </>
                  )}
                  <Line type="monotone" dataKey={chartParam} name={thresh[chartParam]?.name}
                    stroke={thresh[chartParam]?.color || '#2d6a4f'} strokeWidth={2.2}
                    dot={{r:3}} connectNulls/>
                </LineChart>
              </ResponsiveContainer>
              <div className="wq-chart-legend">
                <span style={{color:'#b87c1a'}}>&#9135;&#9135; Min ({thresh[chartParam]?.min} {thresh[chartParam]?.unit})</span>
                <span style={{color:'#c0392b'}}>&#9135;&#9135; Max ({thresh[chartParam]?.max} {thresh[chartParam]?.unit})</span>
                <span style={{fontSize:10,color:'#8a968c'}}>{chartData.filter(d=>d[chartParam]!==null).length} data points</span>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ── Observations table ──────────────────────────────────────────────── */}
      <Card
        title="All Observations"
        subtitle={`${filtered.length} record${filtered.length!==1?'s':''} · ${filterType}${locationFilter?' · '+locationFilter:''}`}
      >
        {filtered.length === 0 ? (
          <div className="pearl-empty"><p>No observations yet for this filter selection.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date / Time</th>
                  <th>Location</th>
                  {Object.entries(thresh).slice(0,4).map(([k,t])=><th key={k}>{t.name}</th>)}
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => editing?.id === o.id ? (
                  <tr key={o.id}><td colSpan={8} style={{padding:'10px 0'}}>
                    <ObsForm cultureType={filterType} initial={editing}
                      onSave={handleSave} onCancel={()=>setEditing(null)}/>
                  </td></tr>
                ) : (
                  <tr key={o.id}>
                    <td><b>{o.date}</b>{o.time&&<small style={{display:'block',color:'#8a968c'}}>{o.time}</small>}</td>
                    <td>
                      <b>{o.location}</b>
                      {o.species&&<small style={{display:'block',color:'#8a968c'}}>{o.species}</small>}
                    </td>
                    {Object.entries(thresh).slice(0,4).map(([k,t])=>{
                      const chk = checkThreshold(k, o[k], filterType)
                      const color = chk ? STATUS_COLOR[chk.status] : '#8a968c'
                      return (
                        <td key={k}>
                          {o[k] ? (
                            <span style={{display:'flex',alignItems:'center',gap:4,color}}>
                              {chk?.status==='ok' ? <CheckCircle2 size={11} style={{color:'#3d8050'}}/> :
                               chk          ? <AlertTriangle size={11}/> : null}
                              {o[k]} {t.unit}
                            </span>
                          ) : <span style={{color:'#c4d0c4'}}>—</span>}
                        </td>
                      )
                    })}
                    <td><small style={{color:'#8a968c'}}>{o.source||'—'}</small></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="icon-button" onClick={()=>setEditing(o)}><Pencil size={12}/></button>
                        <button className="icon-button" onClick={()=>handleDelete(o.id)}><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Threshold reference ─────────────────────────────────────────────── */}
      <Card title="Threshold Reference"
        subtitle={filterType==='freshwater'?'ICAR-CIFE Lamellidens spp.':'CMFRI Pinctada fucata'}>
        <div className="pearl-thresh-ref">
          {Object.entries(thresh).map(([k,t])=>(
            <div key={k} className="pearl-thresh-ref-row">
              <b>{t.name}</b>
              <span>{t.min}\u2013{t.max} {t.unit}</span>
            </div>
          ))}
        </div>
        <p style={{fontSize:10,color:'#8a968c',marginTop:8}}>
          Source: {filterType==='freshwater'?'ICAR-CIFE Freshwater Pearl Culture Manual':'CMFRI / MPEDA Marine Pearl Culture Guidelines'}
        </p>
      </Card>
    </div>
  )
}
