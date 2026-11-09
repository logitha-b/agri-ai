import { useLanguage } from '../context/LanguageContext'
/**
 * LacCulture — /lac route.
 * 8-tab Lac Culture Intelligence platform.
 *
 * Tabs:
 *   1  Suitability      — location + host scoring (preserved existing LacPage)
 *   2  Production Forecast — ML model (R²=0.94, ERA5 climate)
 *   3  Environmental Risk  — ICAR thresholds + live weather
 *   4  Crop Calendar    — Rangeeni/Kusmi seasons (ICAR-IINRG)
 *   5  Market & Profit  — lac prices + profitability calculator
 *   6  Historical Data  — ICAR-IINRG production data + ERA5 climate
 *   7  AI Assistant     — rule-based KB (ICAR-IINRG sources)
 *   8  Agroforestry     — scenario planner
 */
import { useEffect, useState } from 'react'
import { Activity, BarChart2, Calendar, Download, Sparkles,
  Leaf, MapPin, ArrowRight, Loader, ShieldAlert,
  TrendingUp, TreeDeciduous, IndianRupee, CheckCircle2,
} from 'lucide-react'
import { Card, Notice, PageHeader, Progress, RiskBadge } from '../components'
import { lacData } from '../data/mockData'
import ProductionForecast from '../components/lac/ProductionForecast'
import EnvRisk            from '../components/lac/EnvRisk'
import CropCalendar       from '../components/lac/CropCalendar'
import LacMarket          from '../components/lac/LacMarket'
import LacHistory         from '../components/lac/LacHistory'
import AgroPlanner        from '../components/lac/AgroPlanner'

const API = (import.meta.env.VITE_CROP_HEALTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8003' : 'https://agri-ai-jnpi.onrender.com')).replace(/\/$/, '')

function Impact({ label, value }) {
  return (
    <div className="impact">
      <span>{label}</span>
      <div><i className={value < 0 ? 'negative' : ''} style={{width:`${Math.max(8,Math.abs(value)*2)}%`}}/></div>
      <b className={value < 0 ? 'negative-text' : 'good-text'}>{value > 0 ? '+' : ''}{value}%</b>
    </div>
  )
}

const TABS = [
  { id:'suitability',  label:'Suitability',       icon:Leaf },
  { id:'forecast',     label:'Production Forecast',icon:TrendingUp },
  { id:'risk',         label:'Environmental Risk', icon:ShieldAlert },
  { id:'calendar',     label:'Crop Calendar',      icon:Calendar },
  { id:'market',       label:'Market & Profit',    icon:IndianRupee },
  { id:'history',      label:'Historical Data',    icon:BarChart2 },
  { id:'agroforestry', label:'Agroforestry',        icon:TreeDeciduous },
]

// ── Suitability tab (preserved from existing LacPage) ────────────────────────

function SuitabilityTab({ lat, lng, state, district, derivedState, onStateChange, sampleSeed }) {
  const { t } = useLanguage()
  const [locationText, setLocationText] = useState('')
  const [geocoding,    setGeocoding]    = useState(false)
  const [geoError,     setGeoError]     = useState('')
  const [resolvedLabel,setResolvedLabel]= useState('')
  const [host,         setHost]         = useState(lacData.hosts[0].name)
  const [area,         setArea]         = useState(1)
  const [season,       setSeason]       = useState('Kusmi · winter')
  const [existingHosts,setExistingHosts]= useState('Ber and Flemingia')
  const [landAvail,    setLandAvail]    = useState(2.5)
  const [assessed,     setAssessed]     = useState(false)
  const [weather,      setWeather]      = useState(null)
  const [wxLoading,    setWxLoading]    = useState(false)

  const stateGuessMap = [
    ['jharkhand','Jharkhand'],['chhattisgarh','Chhattisgarh'],
    ['madhya pradesh','Madhya Pradesh'],['odisha','Odisha'],
    ['west bengal','West Bengal'],['maharashtra','Maharashtra'],
    ['tamil nadu','Tamil Nadu'],['andhra','Andhra Pradesh'],
    ['karnataka','Karnataka'],['kerala','Kerala'],['gujarat','Gujarat'],
    ['rajasthan','Rajasthan'],['uttar pradesh','Uttar Pradesh'],
    ['bihar','Bihar'],['assam','Assam'],['punjab','Punjab'],
    ['haryana','Haryana'],['uttarakhand','Uttarakhand'],['meghalaya','Meghalaya'],
  ]

  const geocodeLocation = async () => {
    if (!locationText.trim()) { setGeoError('Enter a location first.'); return }
    setGeocoding(true); setGeoError('')
    try {
      const res  = await fetch(`${API}/api/health/geocode`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({address: locationText + ', India'}),
      })
      const data = await res.json()
      if (data.found) {
        onStateChange({lat:data.lat, lng:data.lng, state:data.state||'', district:data.district||''})
        setResolvedLabel(data.display_name || locationText); setGeoError('')
      } else setGeoError('Location not found.')
    } catch {
      const text  = locationText.toLowerCase()
      const match = stateGuessMap.find(([k]) => text.includes(k))
      if (match) { onStateChange({lat:null,lng:null,state:match[1],district:''}); setResolvedLabel(locationText); setGeoError('') }
      else setGeoError('Backend offline — results still update from inputs.')
    } finally { setGeocoding(false) }
  }

  const derived = state || (stateGuessMap.find(([k]) => locationText.toLowerCase().includes(k))?.[1] ?? '')
  const hostScore = host==='Ber'?79:host.includes('Calliandra')?72:82
  const seasonMod = season.includes('winter')?0:season.includes('rainy')?-3:-5
  const hostMod   = existingHosts==='None'?-8:existingHosts==='Ber and Flemingia'?5:0
  let climateMod  = 0
  if (weather?.available) {
    const s  = weather.summary||{}
    const r  = weather.total_rainfall_mm||s.total_rainfall_mm||0
    const mx = weather.max_temp_c||s.max_temp_c||28
    if (r>300) climateMod-=8; else if (r>100) climateMod+=3
    if (mx>40) climateMod-=5; else if (mx>=25&&mx<=35) climateMod+=4
  }
  const lacStates = ['jharkhand','chhattisgarh','madhya pradesh','odisha','west bengal','maharashtra']
  const stateMod  = lacStates.includes(derived.toLowerCase())?8:derived.toLowerCase().includes('tamil')?-4:derived?-2:0
  const score     = Math.min(98,Math.max(30,hostScore+seasonMod+hostMod+climateMod+stateMod))
  const riskLabel = score>=75?'Low risk':score>=55?'Moderate risk':'High risk'
  const production= Math.round(420*Number(area||0)*(score/82))
  const money     = v=>`₹${Number(v||0).toLocaleString('en-IN')}`

  const loadSampleLac = async () => {
    const sLoc = 'Ranchi, Jharkhand'
    setLocationText(sLoc)
    setResolvedLabel('Ranchi, Jharkhand, India')
    setHost('Ber')
    setArea(2)
    setSeason('Kusmi · winter')
    setExistingHosts('Ber and Flemingia')
    setLandAvail(2.5)
    onStateChange({ lat: 23.3441, lng: 85.3096, state: 'Jharkhand', district: 'Ranchi' })
    setAssessed(true)
    setWxLoading(true)
    try {
      const res = await fetch(`${API}/api/health/weather?lat=23.3441&lng=85.3096&days=30`)
      const data = await res.json()
      setWeather(data)
    } catch { setWeather(null) }
    finally { setWxLoading(false) }
  }

  useEffect(() => {
    if (sampleSeed) {
      loadSampleLac()
    }
  }, [sampleSeed])

  const handleSubmit = async e => {
    if (e) e.preventDefault()
    setAssessed(true)
    if (lat && lng) {
      setWxLoading(true)
      try {
        const res  = await fetch(`${API}/api/health/weather?lat=${lat}&lng=${lng}&days=30`)
        const data = await res.json()
        setWeather(data)
      } catch { setWeather(null) }
      finally { setWxLoading(false) }
    }
  }

  return (
    <div className="page">
      <div className="engine-two lac-layout">
        <form className="card input-card" onSubmit={handleSubmit}>
          <header className="card-header">
            <div><h2>{t('Bioresource suitability profile', 'Bioresource suitability profile')}</h2><p>{t('Enter any location in India.', 'Enter any location in India.')}</p></div>
          </header>
          <div className="input-grid columns-2">
            <label className="field" style={{gridColumn:'1/-1'}}>
              <span>{t("LOCATION (village / district / state)", "LOCATION (village / district / state)")}</span>
              <div style={{display:'flex',gap:6}}>
                <input type="text" value={locationText} style={{flex:1}}
                  onChange={e=>{setLocationText(e.target.value);setAssessed(false)}}
                  placeholder={t("e.g. Ranchi, Jharkhand", "e.g. Ranchi, Jharkhand")}
                  onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),geocodeLocation())}/>
                <button type="button" className="button secondary" onClick={geocodeLocation} disabled={geocoding} style={{whiteSpace:'nowrap'}}>
                  {geocoding?t('Locating…', 'Locating…'):<><MapPin size={13}/> {t('Locate', 'Locate')}</>}
                </button>
              </div>
              {geoError && <span style={{fontSize:10,color:'#c0392b',marginTop:3,display:'block'}}>{t(geoError, geoError)}</span>}
              {resolvedLabel && !geoError && <span style={{fontSize:10,color:'#3d7a52',marginTop:3,display:'block'}}><MapPin size={11}/> {resolvedLabel}{state&&` · ${district?district+', ':''}${state}`}</span>}
            </label>
            <label className="field"><span>{t("LAND AVAILABLE (acres)", "LAND AVAILABLE (acres)")}</span><input type="number" min="0.1" step="0.1" value={landAvail} onChange={e=>setLandAvail(e.target.value)}/></label>
            <label className="field"><span>{t("AREA FOR LAC (acres)", "AREA FOR LAC (acres)")}</span><input type="number" min="0.1" step="0.1" value={area} onChange={e=>setArea(e.target.value)}/></label>
            <label className="field"><span>{t("EXISTING HOST PLANTS", "EXISTING HOST PLANTS")}</span>
              <select value={existingHosts} onChange={e=>setExistingHosts(e.target.value)}>
                {['Ber and Flemingia','Flemingia semialata','Ber','Kusum','None'].map(o=><option key={o} value={o}>{t(o, o)}</option>)}
              </select>
            </label>
            <label className="field"><span>{t("HOST SPECIES", "HOST SPECIES")}</span>
              <select value={host} onChange={e=>setHost(e.target.value)}>
                {lacData.hosts.map(x=><option key={x.name} value={x.name}>{t(x.name, x.name)}</option>)}
              </select>
            </label>
            <label className="field"><span>{t("SEASON", "SEASON")}</span>
              <select value={season} onChange={e=>setSeason(e.target.value)}>
                {['Kusmi · winter','Rangeeni · rainy','Planning stage'].map(o=><option key={o} value={o}>{t(o, o)}</option>)}
              </select>
            </label>
          </div>
          <button type="submit" className="button" style={{marginTop:14}}>
            {wxLoading?t('Analyzing…', 'Analyzing…'):assessed?<><ArrowRight size={15}/> {t('Refresh', 'Refresh')}</>:<><ArrowRight size={15}/> {t('Analyze suitability', 'Analyze suitability')}</>}
          </button>
        </form>

        <div className="lac-result">
          <small>{t("MODELLED SUITABILITY", "MODELLED SUITABILITY")}{derived?' · '+derived:''}</small>
          <RiskBadge value={riskLabel}/>
          <b>{score}<small>/100</small></b>
          <span>{t("SUITABLE FOR FURTHER ASSESSMENT", "SUITABLE FOR FURTHER ASSESSMENT")}</span>
          <div className="score-track"><i style={{width:`${score}%`}}/></div>
          <div className="result-stats">
            <div><small>{t("Indicative production", "Indicative production")}</small><b>{production} kg</b></div>
            <div><small>{t("Potential revenue", "Potential revenue")}</small><b>{money(production*250)}</b></div>
          </div>
          {assessed && weather?.available && (
            <div style={{marginTop:10,fontSize:10,color:'#3d5c44',background:'#edf5ee',padding:'7px 10px',borderRadius:6}}>
              <b>{t("Live climate:", "Live climate:")}</b> {(weather.total_rainfall_mm||weather.summary?.total_rainfall_mm||0).toFixed(0)} mm/30d · max {weather.max_temp_c||weather.summary?.max_temp_c||'—'}°C
              <br/><span style={{color:'#7a897d'}}>{t("Source: NASA POWER", "Source: NASA POWER")}</span>
            </div>
          )}
          {!lat && <p style={{fontSize:10,color:'#8a968c',marginTop:8}}>{t("Click Locate for climate adjustment.", "Click Locate for climate adjustment.")}</p>}
          <p>{t("A multi-signal view for bioresource livelihood planning.", "A multi-signal view for bioresource livelihood planning.")}</p>
        </div>
      </div>

      <div className="engine-two">
        <Card title={t("Host plant suitability", "Host plant suitability")} subtitle={t("Species-specific assessment", "Species-specific assessment")}>
          {lacData.hosts.map((h,i)=>(
            <div className="host-row" key={h.name}><b>0{i+1}</b>
              <span><strong>{t(h.name, h.name)}</strong><small>{t("Host compatibility", "Host compatibility")} · {h.score}%</small></span>
              <em>{t(h.status, h.status)}</em>
            </div>
          ))}
        </Card>
        <Card title={t("Suitability dimensions", "Suitability dimensions")} subtitle={t("Contributing domain scores", "Contributing domain scores")}>
          {lacData.factors.map(f=><Progress key={f.name} label={t(f.name, f.name)} value={f.value}/>)}
          {assessed && lat && <Progress label={`${t("Climate", "Climate")} (${derived||'location'})`} value={Math.min(100,Math.max(0,65+climateMod*3))} color={climateMod>=0?'green':'amber'}/>}
        </Card>
      </div>

      <div className="engine-two">
        <Card title={t("What contributes to suitability?", "What contributes to suitability?")} subtitle={t("SHAP-style sample contributions", "SHAP-style sample contributions")}>
          {lacData.impacts.map(f=><Impact key={f.name} label={t(f.name, f.name)} value={f.value}/>)}
        </Card>
        <div className="bio-note">
          <span className="eyebrow">{t("BEYOND CONVENTIONAL CROP INTELLIGENCE", "BEYOND CONVENTIONAL CROP INTELLIGENCE")}</span>
          <h2>{t("Intelligence for bioresource livelihoods.", "Intelligence for bioresource livelihoods.")}</h2>
          <p>{t("Connect ecological host suitability with climate, production potential, and household economics.", "Connect ecological host suitability with climate, production potential, and household economics.")}</p>
          <b>{t("Landscape → Host plant → Livelihood", "Landscape → Host plant → Livelihood")}</b>
        </div>
      </div>

      <div className="inline-feedback">
        <Leaf size={14}/>
        <span>
          {derived
            ? lacStates.includes(derived.toLowerCase())
              ? `${derived} is a primary lac zone. Use the Forecast and Risk tabs for ML production estimates and live weather risk.`
              : `${derived} is outside the primary lac belt. Check the Crop Calendar and AI Assistant for guidance on starting lac cultivation.`
            : 'Enter a location to get a location-specific assessment. Use the tabs above for forecasting, risk, and market analysis.'}
        </span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LacCulture() {
  const { t } = useLanguage()
  const [tab, setTab] = useState('suitability')
  const [sampleSeed, setSampleSeed] = useState(0)
  const [sampleLoaded, setSampleLoaded] = useState(false)

  // Shared location state — set on Suitability tab, used by other tabs
  const [lat,      setLat]      = useState(null)
  const [lng,      setLng]      = useState(null)
  const [state,    setState]    = useState('')
  const [district, setDistrict] = useState('')

  const handleStateChange = ({ lat:la, lng:lo, state:st, district:di }) => {
    if (la) setLat(la); if (lo) setLng(lo)
    if (st) setState(st); if (di) setDistrict(di)
  }

  const loadGlobalSample = () => {
    setLat(23.3441)
    setLng(85.3096)
    setState('Jharkhand')
    setDistrict('Ranchi')
    setSampleSeed(s => s + 1)
    setSampleLoaded(true)
  }

  const derived = state || ''

  return (
    <div className="page">
      {/* Banner with single master Load Sample Data button */}
      <div className="novelty-banner">
        <span><Leaf size={24}/></span>
        <div style={{ flex: 1 }}>
          <small>BIRESOURCE INTELLIGENCE · CORE NOVELTY</small>
          <h2>{t('Lac Culture Intelligence', 'Lac Culture Intelligence')}</h2>
          <p>Earth Observation + Climate + Host Plant + Historical Production + Economic Intelligence</p>
          <b>Extending remote-sensing intelligence into bioresource livelihoods.</b>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <strong>LAC<br/>01</strong>
          <button
            type="button"
            className="button"
            onClick={loadGlobalSample}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              padding: '8px 16px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            title={t("Load sample data across all 7 Lac Culture modules", "Load sample data across all 7 Lac Culture modules")}
          >
            <Sparkles size={15} />
            {t('✨ Load sample data', '✨ Load sample data')}
          </button>
        </div>
      </div>

      {/* Unified sample confirmation badge */}
      {sampleLoaded && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 14px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #e8f5e9 100%)',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          fontSize: 12,
          color: '#166534',
          marginTop: -6,
          marginBottom: 12,
          fontWeight: 600,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <CheckCircle2 size={16} color="#16a34a" />
          <span>
            {t('Sample data active across all 7 Lac Culture modules: Ranchi, Jharkhand (2.5 ac land, Ber + Flemingia, Kusmi winter). ML Forecast, Climate Risk, Market Profit, Calendar & History all populated.', 'Sample data active across all 7 Lac Culture modules: Ranchi, Jharkhand (2.5 ac land, Ber + Flemingia, Kusmi winter). ML Forecast, Climate Risk, Market Profit, Calendar & History all populated.')}
          </span>
        </div>
      )}

      {/* Tab bar */}
      <div className="lac-tab-bar">
        {TABS.map(tabItem => {
          const Icon = tabItem.icon
          return (
            <button key={tabItem.id} className={`lac-tab ${tab===tabItem.id?'active':''}`}
              onClick={()=>setTab(tabItem.id)} aria-current={tab===tabItem.id?'page':undefined}>
              <Icon size={14}/>
              <span className="lac-tab-label">{t(tabItem.label, tabItem.label)}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content - sampleSeed connected to all tabs */}
      {tab==='suitability'  && <SuitabilityTab lat={lat} lng={lng} state={state} district={district} derivedState={derived} onStateChange={handleStateChange} sampleSeed={sampleSeed}/>}
      {tab==='forecast'     && <ProductionForecast lat={lat} lng={lng} derivedState={derived} sampleSeed={sampleSeed}/>}
      {tab==='risk'         && <EnvRisk lat={lat} lng={lng} derivedState={derived} district={district} sampleSeed={sampleSeed}/>}
      {tab==='calendar'     && <CropCalendar derivedState={derived} sampleSeed={sampleSeed}/>}
      {tab==='market'       && <LacMarket sampleSeed={sampleSeed}/>}
      {tab==='history'      && <LacHistory derivedState={derived} sampleSeed={sampleSeed}/>}
            {tab==='agroforestry' && <AgroPlanner derivedState={derived} sampleSeed={sampleSeed}/>}
    </div>
  )
}
