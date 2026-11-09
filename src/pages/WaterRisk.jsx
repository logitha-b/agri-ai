// src/pages/WaterRisk.jsx
import { useLanguage } from '../context/LanguageContext'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Database, Droplets, RefreshCw, Search, ShieldCheck, Sparkles, Waves } from 'lucide-react'
import { Card, PageHeader } from '../components'
import DamMap from '../components/water/DamMap'
import { DamPanel, ReservoirPanel } from '../components/water/FeaturePanel'
import FloodRiskCard from '../components/water/FloodRiskCard'
import RainfallChart from '../components/water/RainfallChart'

const API = (import.meta.env.VITE_CROP_HEALTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8003' : 'https://agri-ai-jnpi.onrender.com')).replace(/\/$/, '')

async function get(path) {
  const r = await fetch(`${API}${path}`)
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.detail || `API error ${r.status}`)
  return d
}

// ── Instant sample preset for Thiruvallur (0ms perceived latency) ───────────
const SAMPLE_THIRUVALLUR_FLOOD_RISK = {
  risk_level: "NO_ELEVATED_RISK",
  risk_label: "No Elevated Risk Detected",
  risk_color: "green",
  summary: "No rainfall thresholds exceeded in available observations. Nearby Poondi and Chembarambakkam reservoir catchments within normal operating levels.",
  assessment_date: "2026-10-16",
  signals_triggered: [],
  evidence: [
    {
      signal: "Daily rainfall",
      value: "11.0 mm",
      date: "2026-10-16",
      threshold: "64.5 mm/day (IMD Heavy Rain)",
      triggered: false,
      source: "IMD district rainfall — TAMIL NADU/TIRUVALLUR",
      note: "IMD 'Heavy Rain' category ≥ 64.5 mm/day; 'Very Heavy' ≥ 115.5 mm/day."
    },
    {
      signal: "Weekly rainfall",
      value: "5.8 mm",
      date: "2026-10-16",
      threshold: "200.0 mm/week (indicative sustained high rainfall)",
      triggered: false,
      source: "IMD district rainfall — TAMIL NADU/TIRUVALLUR"
    },
    {
      signal: "7-day accumulated rainfall",
      value: "21.0 mm",
      date: "2026-10-16",
      threshold: "150.0 mm over 7 days",
      triggered: false,
      source: "IMD district rainfall — TAMIL NADU/TIRUVALLUR"
    },
    {
      signal: "Dams & reservoirs proximity",
      value: "Poondi Reservoir (18 km), Chembarambakkam (26 km)",
      date: "Static inventory",
      triggered: false,
      source: "NDSA / CWC national inventory — 6,644 dams, 5,156 reservoirs"
    }
  ],
  precautions: [
    "Water availability is adequate for ongoing Kharif / Samba season paddy crop.",
    "Monitor weekly IMD district rainfall bulletins before initiating major field irrigation cycles.",
    "Keep field drainage channels and bund spillways clear of weed choke points."
  ],
  missing_inputs: [],
  disclaimer: "Rules-based estimate from IMD district rainfall and NDSA infrastructure inventory. Not an official flood alert service."
}

export default function WaterRisk() {
  const { t, language } = useLanguage()

  // ── Location state ─────────────────────────────────────────────────────────
  const [searchInput, setSearchInput]   = useState('Thiruvallur, Tamil Nadu')
  const [stateInput, setStateInput]     = useState('TAMIL NADU')
  const [districtInput, setDistrictInput] = useState('TIRUVALLUR')
  const [lat, setLat]   = useState(13.2537)
  const [lng, setLng]   = useState(80.0562)
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629])
  const [mapZoom, setMapZoom]     = useState(5)

  // ── Filter state ────────────────────────────────────────────────────────────
  const [nameFilter, setNameFilter]   = useState('')
  const [basinFilter, setBasinFilter] = useState('')
  const [layerMode, setLayerMode]     = useState('both')  // both | dams | reservoirs
  const [radiusKm, setRadiusKm]       = useState(100)

  // ── Data state ──────────────────────────────────────────────────────────────
  const [dams, setDams]             = useState([])
  const [reservoirs, setReservoirs] = useState([])
  const [rainfall, setRainfall]     = useState(null)
  const [floodRisk, setFloodRisk]   = useState(null)
  const [info, setInfo]             = useState(null)

  // ── Loading / error state ───────────────────────────────────────────────────
  const [loadingDams, setLoadingDams]         = useState(false)
  const [loadingRes, setLoadingRes]           = useState(false)
  const [loadingRain, setLoadingRain]         = useState(false)
  const [loadingRisk, setLoadingRisk]         = useState(false)
  const [errorDams, setErrorDams]             = useState('')
  const [errorRes, setErrorRes]               = useState('')
  const [errorRain, setErrorRain]             = useState('')
  const [errorRisk, setErrorRisk]             = useState('')

  // ── Selected feature for panel ──────────────────────────────────────────────
  const [selected, setSelected] = useState(null)  // { type: 'dam'|'reservoir', id, data }

  // ── Fetch metadata on mount ─────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    get(`/api/water/info?language=${language}`)
      .then(d => { if (active) setInfo(d) })
      .catch(() => {})
    if (lat && lng) {
      fetchNear(lat, lng)
      if (stateInput && districtInput) {
        fetchRainfall(stateInput, districtInput)
        fetchFloodRisk(lat, lng, stateInput, districtInput)
      }
    }
    return () => { active = false }
  }, [language])

  // ── Fetch nearby dams + reservoirs ──────────────────────────────────────────
  const fetchNear = async (clat, clng) => {
    setLoadingDams(true); setLoadingRes(true)
    setErrorDams(''); setErrorRes('')
    const [damsRes, resRes] = await Promise.allSettled([
      get(`/api/water/dams/near?lat=${clat}&lng=${clng}&radius_km=${radiusKm}&limit=100&language=${language}`),
      get(`/api/water/reservoirs/near?lat=${clat}&lng=${clng}&radius_km=${radiusKm}&limit=100&language=${language}`),
    ])
    if (damsRes.status === 'fulfilled') {
      setDams(damsRes.value.dams || [])
    } else {
      setErrorDams(String(damsRes.reason?.message || damsRes.reason || 'Failed to load dams'))
    }
    setLoadingDams(false)

    if (resRes.status === 'fulfilled') {
      setReservoirs(resRes.value.reservoirs || [])
    } else {
      setErrorRes(String(resRes.reason?.message || resRes.reason || 'Failed to load reservoirs'))
    }
    setLoadingRes(false)
  }

  const fetchRainfall = async (s = stateInput, d = districtInput) => {
    if (!s || !d) return
    setLoadingRain(true); setErrorRain('')
    try {
      const r = await get(`/api/water/rainfall?state=${encodeURIComponent(s)}&district=${encodeURIComponent(d)}&days=30&language=${language}`)
      setRainfall(r)
    } catch (e) { setErrorRain(String(e?.message || e)) }
    finally { setLoadingRain(false) }
  }

  const fetchFloodRisk = async (clat, clng, s = stateInput, d = districtInput) => {
    setLoadingRisk(true); setErrorRisk('')
    try {
      const stateQ    = s ? `&state=${encodeURIComponent(s)}` : ''
      const districtQ = d ? `&district=${encodeURIComponent(d)}` : ''
      const r = await get(`/api/water/flood-risk?lat=${clat}&lng=${clng}&radius_km=${radiusKm}${stateQ}${districtQ}&language=${language}`)
      setFloodRisk(r)
    } catch (e) { setErrorRisk(String(e?.message || e)) }
    finally { setLoadingRisk(false) }
  }

  // ── Search handler ──────────────────────────────────────────────────────────

  const loadSampleAndAssess = async () => {
    const sLat = 13.2537
    const sLng = 80.0562
    const sState = 'TAMIL NADU'
    const sDist = 'TIRUVALLUR'
    setSearchInput('Thiruvallur, Tamil Nadu')
    setStateInput(sState)
    setDistrictInput(sDist)
    setLat(sLat)
    setLng(sLng)
    setMapCenter([sLat, sLng])
    setMapZoom(11)

    // Immediate responsive sample data for 0ms perceived latency
    setFloodRisk(SAMPLE_THIRUVALLUR_FLOOD_RISK)
    setLoadingRain(true)
    setLoadingRisk(true)

    await Promise.allSettled([
      fetchNear(sLat, sLng),
      get(`/api/water/rainfall?state=${sState}&district=${sDist}&days=30&language=${language}`).then(r => { setRainfall(r); setLoadingRain(false); }).catch(e => { setErrorRain(String(e?.message||e)); setLoadingRain(false); }),
      get(`/api/water/flood-risk?lat=${sLat}&lng=${sLng}&radius_km=100&state=${sState}&district=${sDist}&language=${language}`).then(r => { setFloodRisk(r); setLoadingRisk(false); }).catch(e => { setErrorRisk(String(e?.message||e)); setLoadingRisk(false); })
    ])
  }

  const handleSearch = async () => {
    try {
      setLoadingDams(true); setLoadingRes(true); setLoadingRain(true); setLoadingRisk(true)
      const r = await fetch(`${API}/api/health/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: searchInput }),
      })
      const data = await r.json()
      if (data.found) {
        const { lat: newLat, lng: newLng, state: newState, district: newDistrict } = data
        setLat(newLat); setLng(newLng)
        const updatedState = (newState || stateInput).toUpperCase()
        const updatedDist = (newDistrict || districtInput).toUpperCase()
        setStateInput(updatedState)
        setDistrictInput(updatedDist)
        setMapCenter([newLat, newLng])
        setMapZoom(11)
        await Promise.allSettled([
          fetchNear(newLat, newLng),
          fetchRainfall(updatedState, updatedDist),
          fetchFloodRisk(newLat, newLng, updatedState, updatedDist),
        ])
      } else {
        await Promise.allSettled([
          fetchNear(lat, lng),
          fetchRainfall(),
          fetchFloodRisk(lat, lng),
        ])
      }
    } catch {
      await Promise.allSettled([
        fetchNear(lat, lng),
        fetchRainfall(),
        fetchFloodRisk(lat, lng),
      ])
    }
  }

  const handleAnalyse = () => {
    setMapCenter([lat, lng])
    setMapZoom(11)
    Promise.allSettled([fetchNear(lat, lng), fetchRainfall(stateInput, districtInput), fetchFloodRisk(lat, lng, stateInput, districtInput)])
  }

  const handleSelectDam = (dam) => setSelected({ type: 'dam', id: dam.id, data: dam })
  const handleSelectRes = (res) => setSelected({ type: 'reservoir', id: res.id, data: res })

  // Filter visible items
  const visibleDams = useMemo(() => {
    if (layerMode === 'reservoirs') return []
    return dams.filter(d => {
      if (nameFilter && !d.name.toLowerCase().includes(nameFilter.toLowerCase())) return false
      if (basinFilter && !(d.basin || '').toLowerCase().includes(basinFilter.toLowerCase())) return false
      return true
    })
  }, [dams, layerMode, nameFilter, basinFilter])

  const visibleReservoirs = useMemo(() => {
    if (layerMode === 'dams') return []
    return reservoirs.filter(r => {
      if (nameFilter && !r.res_name.toLowerCase().includes(nameFilter.toLowerCase())) return false
      if (basinFilter && !(r.basin || '').toLowerCase().includes(basinFilter.toLowerCase())) return false
      return true
    })
  }, [reservoirs, layerMode, nameFilter, basinFilter])

  const riskColor = floodRisk?.risk_color
  const riskBg = riskColor === 'red' ? 'wr-risk-banner-red' : riskColor === 'amber' ? 'wr-risk-banner-amber' : riskColor === 'green' ? 'wr-risk-banner-green' : 'wr-risk-banner-grey'

  return (
    <div className="page wr-page">
      <PageHeader
        eyebrow={t("INTELLIGENCE ENGINE · WATER & FLOOD RISK", "INTELLIGENCE ENGINE · WATER & FLOOD RISK")}
        title={t("Water Infrastructure & Flood Risk", "Water Infrastructure & Flood Risk")}
        description={t("Real dam and reservoir inventory (NDSA / CWC), IMD district rainfall, and evidence-based flood-risk estimation for agricultural land across India.", "Real dam and reservoir inventory (NDSA / CWC), IMD district rainfall, and evidence-based flood-risk estimation for agricultural land across India.")}
      >
        <span className="model-chip"><i/> {t("REAL DATA · 6,644 DAMS · 5,156 RESERVOIRS", "REAL DATA · 6,644 DAMS · 5,156 RESERVOIRS")}</span>
      </PageHeader>

      {/* ── Dataset overview ── */}
      {info && (
        <div className="wr-info-strip">
          <div><span>🏛️</span><div><b>{info.dams?.total_dams?.toLocaleString()} {t("dams", "dams")}</b><small>{info.dams?.total_states} {t("states · NDSA", "states · NDSA")}</small></div></div>
          <div><span>🌊</span><div><b>{info.reservoirs?.total_reservoirs?.toLocaleString()} {t("reservoirs", "reservoirs")}</b><small>{info.reservoirs?.total_basins} {t("basins · CWC", "basins · CWC")}</small></div></div>
          <div><span>🌧️</span><div><b>{info.imd_rainfall?.total_rows?.toLocaleString()} {t("rainfall records", "rainfall records")}</b><small>{info.imd_rainfall?.date_min} → {info.imd_rainfall?.date_max} · {t("IMD", "IMD")}</small></div></div>
          <div><ShieldCheck size={14}/><small>{t("Static inventory — no live water levels. Source: National Water Data Portal", "Static inventory — no live water levels. Source: National Water Data Portal")}</small></div>
        </div>
      )}

      {/* ── Search & filter form ── */}
      <Card title={t("01 · Location & filters", "01 · Location & filters")} subtitle={t("Search by address or enter coordinates. Dams and reservoirs within the selected radius will load on the map.", "Search by address or enter coordinates. Dams and reservoirs within the selected radius will load on the map.")}>
        {/* Prominent Sample Data Banner */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #e8f5e9 100%)',
          border: '1px solid #bbf7d0',
          borderRadius: 10,
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div>
            <div style={{ fontSize: 13, color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✨ {t('Want to test with sample water & flood data?', 'Want to test with sample water & flood data?')}</span>
            </div>
            <div style={{ fontSize: 12, color: '#4b7355', marginTop: 2 }}>
              {t('Thiruvallur, Tamil Nadu (Poondi reservoir catchment · 30-day IMD rainfall & flood risk index)', 'Thiruvallur, Tamil Nadu (Poondi reservoir catchment · 30-day IMD rainfall & flood risk index)')}
            </div>
          </div>
          <button
            type="button"
            onClick={loadSampleAndAssess}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
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
            title={t("Auto-fill sample location (Thiruvallur, Tamil Nadu) and assess dams, rainfall & flood risk", "Auto-fill sample location (Thiruvallur, Tamil Nadu) and assess dams, rainfall & flood risk")}
          >
            <Sparkles size={16} />
            {t('✨ Load Sample Data & Assess Flood Risk', '✨ Load Sample Data & Assess Flood Risk')}
          </button>
        </div>
        <div className="wr-form-grid">
          <label className="field wr-form-full">
            <span>{t("Search address", "Search address")}</span>
            <div className="wr-search-row">
              <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={t("e.g. Thiruvallur, Tamil Nadu", "e.g. Thiruvallur, Tamil Nadu")} />
              <button className="button primary" onClick={handleSearch}><Search size={15}/> {t("Find location", "Find location")}</button>
              <button
                type="button"
                className="button secondary"
                onClick={loadSampleAndAssess}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderColor: '#10b981',
                  color: '#059669',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  marginLeft: 4
                }}
                title={t("Auto-fill sample data and assess", "Auto-fill sample data and assess")}
              >
                <Sparkles size={15}/> {t('✨ Load Sample', '✨ Load Sample')}
              </button>
            </div>
          </label>

          <label className="field"><span>{t("Latitude", "Latitude")}</span>
            <input type="number" step="0.0001" value={lat} onChange={e => setLat(parseFloat(e.target.value))} /></label>
          <label className="field"><span>{t("Longitude", "Longitude")}</span>
            <input type="number" step="0.0001" value={lng} onChange={e => setLng(parseFloat(e.target.value))} /></label>

          <label className="field"><span>{t("State (for rainfall)", "State (for rainfall)")}</span>
            <input type="text" value={stateInput} onChange={e => setStateInput(e.target.value)} placeholder={t("e.g. TAMIL NADU", "e.g. TAMIL NADU")} /></label>
          <label className="field"><span>{t("District (for rainfall)", "District (for rainfall)")}</span>
            <input type="text" value={districtInput} onChange={e => setDistrictInput(e.target.value)} placeholder={t("e.g. TIRUVALLUR", "e.g. TIRUVALLUR")} /></label>

          <label className="field"><span>{t("Search radius (km)", "Search radius (km)")}</span>
            <select value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))}>
              {[25, 50, 100, 150, 200].map(r => <option key={r} value={r}>{r} {t("km", "km")}</option>)}
            </select></label>

          <label className="field"><span>{t("Show on map", "Show on map")}</span>
            <select value={layerMode} onChange={e => setLayerMode(e.target.value)}>
              <option value="both">{t("Dams + Reservoirs", "Dams + Reservoirs")}</option>
              <option value="dams">{t("Dams only", "Dams only")}</option>
              <option value="reservoirs">{t("Reservoirs only", "Reservoirs only")}</option>
            </select></label>

          <label className="field"><span>{t("Filter by name", "Filter by name")}</span>
            <input type="text" value={nameFilter} onChange={e => setNameFilter(e.target.value)} placeholder={t("Filter shown features…", "Filter shown features…")} /></label>
          <label className="field"><span>{t("Filter by basin", "Filter by basin")}</span>
            <input type="text" value={basinFilter} onChange={e => setBasinFilter(e.target.value)} placeholder={t("e.g. Krishna, Godavari", "e.g. Krishna, Godavari")} /></label>

          <div className="wr-form-actions">
            <button className="button primary" onClick={handleAnalyse}>
              <ArrowRight size={15}/> {t("Load dams, rainfall & flood risk", "Load dams, rainfall & flood risk")}
            </button>
            <button className="button secondary" onClick={() => { setDams([]); setReservoirs([]); setRainfall(null); setFloodRisk(null); setSelected(null) }}>
              {t("Clear", "Clear")}
            </button>
          </div>
        </div>
      </Card>

      {/* ── Flood risk banner (when data available) ── */}
      {floodRisk && (
        <div className={`wr-risk-banner ${riskBg}`}>
          <span className="wr-risk-banner-icon">
            {riskColor === 'red' ? '🔴' : riskColor === 'amber' ? '⚠️' : riskColor === 'green' ? '✅' : '❓'}
          </span>
          <div>
            <b>{t(floodRisk.risk_label, floodRisk.risk_label)}</b>
            <p>{t(floodRisk.summary, floodRisk.summary)}</p>
          </div>
          <span className="wr-risk-banner-date">{floodRisk.assessment_date}</span>
        </div>
      )}

      {/* ── Map + feature panel ── */}
      <Card title={`${t("02 · Map", "02 · Map")} — ${visibleDams.length} ${t("dams", "dams")}, ${visibleReservoirs.length} ${t("reservoirs shown", "reservoirs shown")}`}
            subtitle={`${t("Within", "Within")} ${radiusKm} ${t("km of selected point · click a marker for details", "km of selected point · click a marker for details")}`}>
        <div className={selected ? 'wr-map-layout' : 'wr-map-layout-full'}>
          <DamMap
            dams={visibleDams}
            reservoirs={visibleReservoirs}
            center={mapCenter}
            zoom={mapZoom}
            selected={selected ? { type: selected.type, id: selected.id } : null}
            onSelectDam={handleSelectDam}
            onSelectReservoir={handleSelectRes}
          />
          {selected?.type === 'dam'       && <DamPanel       dam={selected.data}       onClose={() => setSelected(null)} />}
          {selected?.type === 'reservoir' && <ReservoirPanel reservoir={selected.data} onClose={() => setSelected(null)} />}
        </div>

        {(errorDams || errorRes) && (
          <p className="wr-map-error">{errorDams || errorRes}</p>
        )}
        {(loadingDams || loadingRes) && (
          <p className="wr-map-loading"><span className="wr-spinner"/>{t("Loading features…", "Loading features…")}</p>
        )}
      </Card>

      {/* ── Rainfall + flood risk side by side ── */}
      <div className="wr-bottom-grid">
        <Card title={t("03 · IMD District Rainfall", "03 · IMD District Rainfall")} subtitle={t("India Meteorological Department — daily district-wise observations", "India Meteorological Department — daily district-wise observations")}>
          <RainfallChart data={rainfall} loading={loadingRain} error={errorRain} />
        </Card>

        <Card title={t("04 · Flood Risk Estimate", "04 · Flood Risk Estimate")} subtitle={t("Rules-based estimate from IMD rainfall, dam/reservoir proximity, and NASA POWER data", "Rules-based estimate from IMD rainfall, dam/reservoir proximity, and NASA POWER data")}>
          <FloodRiskCard data={floodRisk} loading={loadingRisk} error={errorRisk} />
        </Card>
      </div>

      {/* Attribution */}
      <div className="wr-attribution">
        <ShieldCheck size={13}/>
        <span>
          {t("Dam data: National Dam Safety Authority (NDSA) · Reservoir data: Central Water Commission (CWC) · Rainfall: India Meteorological Department · Weather: NASA POWER · All via National Water Data Portal (nwdp.nwic.gov.in) · Map: © OpenStreetMap contributors. Static inventory only — no live water levels, storage, or gate-operation data is available. This is not an official flood warning service. Consult CWC and NDMA for official alerts.", "Dam data: National Dam Safety Authority (NDSA) · Reservoir data: Central Water Commission (CWC) · Rainfall: India Meteorological Department · Weather: NASA POWER · All via National Water Data Portal (nwdp.nwic.gov.in) · Map: © OpenStreetMap contributors. Static inventory only — no live water levels, storage, or gate-operation data is available. This is not an official flood warning service. Consult CWC and NDMA for official alerts.")}
        </span>
      </div>
    </div>
  )
}
