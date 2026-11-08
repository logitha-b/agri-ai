import { useLanguage } from '../context/LanguageContext'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { ArrowRight, CheckCircle2, MapPin, RefreshCw, Search, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { Card, PageHeader } from '../components'
import SatelliteViewer from '../components/health/SatelliteViewer'
import NDVILayer from '../components/health/NDVILayer'
import FloodLayer from '../components/health/FloodLayer'
import SoilLayer from '../components/health/SoilLayer'
import WaterLayer from '../components/health/WaterLayer'
import CropReport from '../components/health/CropReport'
import { localizeLocationName } from '../services/contentLocalization'
import { initialFarmer } from '../data/mockData'

const API = (import.meta.env.VITE_CROP_HEALTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const FALLBACK_API = import.meta.env.DEV ? 'http://127.0.0.1:8003' : ''

async function apiFetch(path, opts = {}, lang = 'en') {
  const sep = path.includes('?') ? '&' : '?'
  const urlPath = `${path}${path.includes('language=') ? '' : `${sep}language=${lang}`}`
  const headers = {
    'Content-Type': 'application/json',
    'X-Platform-Language': lang,
    'Accept-Language': lang,
    ...(opts.headers || {})
  }
  let res
  try {
    res = await fetch(`${API}${urlPath}`, { headers, ...opts })
    if (!res.ok && res.status === 404 && !API) {
      res = await fetch(`${FALLBACK_API}${urlPath}`, { headers, ...opts })
    }
  } catch {
    res = await fetch(`${FALLBACK_API}${urlPath}`, { headers, ...opts })
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Health API returned ${res.status}`)
  return data
}

const CROPS = ['Paddy', 'Groundnut', 'Maize', 'Tomato', 'Millet', 'Wheat', 'Soybean', 'Cotton', 'Sugarcane', 'Sunflower']
const IRRIGATION_METHODS = ['Borewell', 'Canal', 'Drip irrigation', 'Sprinkler', 'Rain-fed', 'Tank / pond', 'River lift']

function cropAge(sowingDate, t) {
  if (!sowingDate) return null
  const days = Math.floor((Date.now() - new Date(sowingDate)) / 86400000)
  if (days < 0) return null
  if (days < 14) return `${days} ${t ? t('days', 'days') : 'days'}`
  if (days < 60) return `${Math.round(days / 7)} ${t ? t('weeks', 'weeks') : 'weeks'}`
  return `${Math.round(days / 30)} ${t ? t('months', 'months') : 'months'} (${days} ${t ? t('days', 'days') : 'days'})`
}

export default function CropHealth() {
  const { t, language, languageInfo } = useLanguage()

  // ── Form state ────────────────────────────────────────────────────────────
  const [address, setAddress]         = useState('')
  const [village, setVillage]         = useState(initialFarmer?.village || '')
  const [district, setDistrict]       = useState(initialFarmer?.district || 'Thiruvallur')
  const [state, setState]             = useState(initialFarmer?.state || 'Tamil Nadu')
  const [pincode, setPincode]         = useState('')
  const [crop, setCrop]               = useState('Paddy')
  const [variety, setVariety]         = useState('')
  const [sowingDate, setSowingDate]   = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 45)
    return d.toISOString().slice(0, 10)
  })
  const [irrigation, setIrrigation]   = useState('')
  const [fieldArea, setFieldArea]     = useState('')

  // ── Geo / map state ───────────────────────────────────────────────────────
  const [geocoding, setGeocoding]     = useState(false)
  const [geoError, setGeoError]       = useState('')
  const [location, setLocation]       = useState(null)    // {lat,lng,display_name}
  const [confirmed, setConfirmed]     = useState(false)
  const [pinLat, setPinLat]           = useState('')
  const [pinLng, setPinLng]           = useState('')

  // ── Analysis state ────────────────────────────────────────────────────────
  const [activeLayer, setActiveLayer] = useState('satellite')
  const [analysisStep, setAnalysisStep] = useState('form') // form | confirming | analysing | done
  const [layers, setLayers]           = useState({})       // {satellite, ndvi, flood, soil, water}
  const [report, setReport]           = useState(null)
  const [loadingLayers, setLoadingLayers] = useState({})
  const [layerErrors, setLayerErrors] = useState({})

  // ── Build full address from fields ───────────────────────────────────────
  const fullAddress = [village, district, state, pincode].filter(Boolean).join(', ')

  const displayAddress = useMemo(() => {
    if (!location?.display_name) return ''
    if (!language || language === 'en') return location.display_name
    return location.display_name
      .split(',')
      .map(part => localizeLocationName(part.trim(), language))
      .filter(Boolean)
      .join(', ')
  }, [location?.display_name, language])

  // ── Geocode ───────────────────────────────────────────────────────────────
  const geocode = useCallback(async () => {
    const query = address.trim() || fullAddress.trim()
    if (!query) { setGeoError('Enter an address or village/district/state.'); return }
    setGeocoding(true); setGeoError(''); setConfirmed(false); setLocation(null)
    try {
      const result = await apiFetch('/api/health/geocode', {
        method: 'POST',
        body: JSON.stringify({ address: query }),
      })
      const addr = result.address || {}
      const st = result.state || addr.state || ''
      const dt = result.district || addr.state_district || addr.district || addr.county || ''
      const vil = result.village || addr.village || addr.town || addr.suburb || addr.hamlet || addr.city_district || ''
      const pin = result.pincode || addr.postcode || ''
      setLocation(result)
      setPinLat(result.lat.toFixed(6))
      setPinLng(result.lng.toFixed(6))
      setVillage(vil)
      setDistrict(dt)
      setState(st)
      setPincode(pin)
      setAddress(result.display_name || query)
      setAnalysisStep('confirming')
    } catch (err) {
      setGeoError(err.message || 'Location search failed. Try entering coordinates or a different address.')
    } finally {
      setGeocoding(false)
    }
  }, [address, fullAddress])

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const r = await apiFetch('/api/health/reverse', {
        method: 'POST', body: JSON.stringify({ lat, lng }),
      })
      if (r.found) {
        setLocation(prev => ({ ...prev, display_name: r.display_name, lat, lng }))
        const addr = r.address || {}
        const st = r.state || addr.state || ''
        const dt = r.district || addr.state_district || addr.district || addr.county || ''
        const vil = r.village || addr.village || addr.town || addr.suburb || addr.hamlet || addr.city_district || ''
        const pin = r.pincode || addr.postcode || ''
        if (st) setState(st)
        if (dt) setDistrict(dt)
        if (vil) setVillage(vil)
        if (pin) setPincode(pin)
      }
    } catch { /* silent */ }
  }, [])

  const applyManualPin = () => {
    const lat = parseFloat(pinLat), lng = parseFloat(pinLng)
    if (!isFinite(lat) || !isFinite(lng)) { setGeoError('Enter valid latitude and longitude.'); return }
    if (lat < 6 || lat > 38 || lng < 68 || lng > 98) { setGeoError('Coordinates appear to be outside India.'); return }
    setLocation(prev => ({ ...prev, lat, lng }))
    reverseGeocode(lat, lng)
    setGeoError('')
  }

  const confirmField = () => { setConfirmed(true); setAnalysisStep('analysing') }

  const fetchLayer = async (key, url) => {
    setLoadingLayers(p => ({ ...p, [key]: true }))
    setLayerErrors(p => ({ ...p, [key]: null }))
    try {
      const data = await apiFetch(url, {}, language)
      setLayers(p => ({ ...p, [key]: data }))
    } catch (err) {
      setLayerErrors(p => ({ ...p, [key]: err.message }))
    } finally {
      setLoadingLayers(p => ({ ...p, [key]: false }))
    }
  }

  const runAllLayers = (lat, lng) => {
    fetchLayer('satellite', `/api/health/satellite?lat=${lat}&lng=${lng}&days_back=30&language=${language}`)
    fetchLayer('ndvi',      `/api/health/ndvi?lat=${lat}&lng=${lng}&days_back=30&language=${language}`)
    fetchLayer('flood',     `/api/health/flood?lat=${lat}&lng=${lng}&days_back=14&language=${language}`)
    fetchLayer('soil',      `/api/health/soil?lat=${lat}&lng=${lng}&language=${language}`)
    fetchLayer('water',     `/api/health/weather?lat=${lat}&lng=${lng}&days=30&language=${language}`)
  }

  const runReport = async (lat, lng, overrides = {}) => {
    const actualCrop = overrides.crop || crop || 'Paddy'
    const actualVariety = overrides.variety !== undefined ? overrides.variety : (variety || null)
    const actualArea = overrides.fieldArea !== undefined ? parseFloat(overrides.fieldArea) : (fieldArea ? parseFloat(fieldArea) : null)
    const actualSowing = overrides.sowingDate || sowingDate || new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10)
    setReport(null)
    try {
      const r = await apiFetch('/api/health/report', {
        method: 'POST',
        body: JSON.stringify({
          crop: actualCrop,
          variety: actualVariety,
          sowing_date: actualSowing,
          lat, lng,
          field_area_ha: actualArea,
          language,
          weather: layers.water || null,
          soil: layers.soil || null,
        }),
      }, language)
      setReport(r)
      setAnalysisStep('done')
    } catch (err) {
      setReport({ error: err.message })
    }
  }

  // ── Run full analysis when confirmed ────────────────────────────────────
  useEffect(() => {
    if (!confirmed || !location) return
    const { lat, lng } = location
    runAllLayers(lat, lng)
    runReport(lat, lng)
  }, [confirmed]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-run layers and report on language change ────────────────────────
  useEffect(() => {
    if (confirmed && location) {
      runAllLayers(location.lat, location.lng)
      if (report && !report.error) {
        runReport(location.lat, location.lng)
      }
    }
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sample data loader & auto-analyzer ──────────────────────────────────
  const loadSampleAndAnalyze = () => {
    const sVillage = 'Ponneri'
    const sDistrict = 'Thiruvallur'
    const sState = 'Tamil Nadu'
    const sPin = '601204'
    const sCrop = 'Paddy'
    const sVariety = 'BPT 5204 (Samba Mahsuri)'
    const sIrr = 'Borewell'
    const sArea = '2.5'
    const sSow = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10)
    setAddress('Ponneri, Thiruvallur, Tamil Nadu 601204')
    setVillage(sVillage)
    setDistrict(sDistrict)
    setState(sState)
    setPincode(sPin)
    setCrop(sCrop)
    setVariety(sVariety)
    setSowingDate(sSow)
    setIrrigation(sIrr)
    setFieldArea(sArea)
    const sampleLoc = { lat: 13.3364, lng: 80.1932, display_name: 'Ponneri, Thiruvallur, Tamil Nadu, India' }
    setLocation(sampleLoc)
    setPinLat('13.3364')
    setPinLng('80.1932')
    setConfirmed(true)
    setGeoError('')
    setAnalysisStep('analysing')
    runAllLayers(13.3364, 80.1932)
    runReport(13.3364, 80.1932, {
      crop: sCrop,
      variety: sVariety,
      sowingDate: sSow,
      irrigation: sIrr,
      fieldArea: sArea,
      district: sDistrict,
      state: sState
    })
  }

  const refresh = () => {
    if (!location) return
    setLayers({}); setLayerErrors({}); setReport(null)
    setAnalysisStep('analysing')
    runAllLayers(location.lat, location.lng)
    runReport(location.lat, location.lng)
  }

  const age = cropAge(sowingDate, t)
  const layerTabs = [
    { key: 'satellite', label: `🛰️ ${t('Satellite', 'Satellite')}` },
    { key: 'ndvi',      label: `🌿 ${t('NDVI', 'NDVI')}` },
    { key: 'flood',     label: `🌊 ${t('Flood Risk', 'Flood Risk')}` },
    { key: 'soil',      label: `🌱 ${t('Soil', 'Soil')}` },
    { key: 'water',     label: `💧 ${t('Water', 'Water')}` },
  ]
  const anyLayerLoading = Object.values(loadingLayers).some(Boolean)

  return (
    <div className="page ch2-page">
      {/* ── Header ── */}
      <PageHeader
        eyebrow={t("INTELLIGENCE ENGINE · SATELLITE")}
        title={t("AI Crop Health Monitoring")}
        description={t("Enter your field location to retrieve live satellite imagery, NDVI, flood risk, soil conditions, and a personalised crop assessment.")}
      >
        {analysisStep === 'done' && (
          <button className="button secondary ch2-refresh" onClick={refresh} disabled={anyLayerLoading}>
            <RefreshCw size={15} className={anyLayerLoading ? 'ch2-spin' : ''} />
            {anyLayerLoading ? t('Refreshing…', 'Refreshing…') : t('Refresh data', 'Refresh data')}
          </button>
        )}
      </PageHeader>

      {/* ── STEP 1: Field input form ── */}
      <Card
        title={t("01 · Field identification")}
        subtitle={t("Enter your field address and crop details. We will locate the field on the map for your confirmation.")}
      >
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
              <span>✨ {t('Want to test with sample farm data?', 'Want to test with sample farm data?')}</span>
            </div>
            <div style={{ fontSize: 12, color: '#4b7355', marginTop: 2 }}>
              {t('Ponneri, Thiruvallur · Paddy 2.5 acres · Sown 45 days ago (auto-loads satellite, NDVI, soil & flood layers)', 'Ponneri, Thiruvallur · Paddy 2.5 acres · Sown 45 days ago (auto-loads satellite, NDVI, soil & flood layers)')}
            </div>
          </div>
          <button
            type="button"
            onClick={loadSampleAndAnalyze}
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
            title="Auto-fill sample data and run full satellite health analysis"
          >
            <Sparkles size={16} />
            {t('✨ Load Sample Data & Run Health Analysis', '✨ Load Sample Data & Run Health Analysis')}
          </button>
        </div>

        <div className="ch2-form-grid">
          {/* Address line */}
          <div className="ch2-form-full">
            <label className="field">
              <span>{t("Full address or search")}</span>
              <div className="ch2-search-row">
                <input
                  type="text"
                  placeholder="e.g. Thiruvallur, Tamil Nadu 602001"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && geocode()}
                />
                <button className="button primary" onClick={geocode} disabled={geocoding}>
                  <Search size={15} />{geocoding ? t('Searching…') : t('Find on map')}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={loadSampleAndAnalyze}
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
                  title="Auto-fill sample data and analyze"
                >
                  <Sparkles size={15}/> {t('✨ Load Sample', '✨ Load Sample')}
                </button>
              </div>
            </label>
          </div>

          {/* Structured fields */}
          <label className="field">
            <span>{t("Village / Town")}</span>
            <input type="text" placeholder="Village or town name" value={village} onChange={e => setVillage(e.target.value)} />
          </label>
          <label className="field">
            <span>{t("District")}</span>
            <input type="text" placeholder="District" value={district} onChange={e => setDistrict(e.target.value)} />
          </label>
          <label className="field">
            <span>{t("State")}</span>
            <input type="text" placeholder="State" value={state} onChange={e => setState(e.target.value)} />
          </label>
          <label className="field">
            <span>{t("Postal code")}</span>
            <input type="text" placeholder="PIN code" value={pincode} onChange={e => setPincode(e.target.value)} />
          </label>

          {/* Divider */}
          <div className="ch2-form-divider"><span>{t("CROP DETAILS")}</span></div>

          <label className="field">
            <span>{t("Crop")}</span>
            <select value={crop} onChange={e => setCrop(e.target.value)}>
              {CROPS.map(c => <option key={c} value={c}>{t(c, c)}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{t("Variety (optional)")}</span>
            <input type="text" placeholder={t("e.g. ADT 45, CO 51", "e.g. ADT 45, CO 51")} value={variety} onChange={e => setVariety(e.target.value)} />
          </label>
          <label className="field">
            <span>{t("Sowing date")}</span>
            <input type="date" value={sowingDate} onChange={e => setSowingDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
            {age && <small className="ch2-age-chip">🌱 {age} {t('since sowing', 'since sowing')}</small>}
          </label>
          <label className="field">
            <span>{t("Field area (hectares)")}</span>
            <input type="number" min="0.01" step="0.01" placeholder="e.g. 1.5" value={fieldArea} onChange={e => setFieldArea(e.target.value)} />
          </label>

          {/* Divider */}
          <div className="ch2-form-divider"><span>{t("OPTIONAL")}</span></div>

          <label className="field">
            <span>{t("Irrigation method")}</span>
            <select value={irrigation} onChange={e => setIrrigation(e.target.value)}>
              <option value="">{t("Select (optional)")}</option>
              {IRRIGATION_METHODS.map(m => <option key={m} value={m}>{t(m, m)}</option>)}
            </select>
          </label>

          {/* Geocode errors */}
          {geoError && (
            <div className="ch2-form-full">
              <div className="ch2-error-box"><TriangleAlert size={16} />{geoError}</div>
            </div>
          )}
        </div>
      </Card>

      {/* ── STEP 2: Map confirmation ── */}
      {location && (
        <Card
          title={t("02 · Confirm your field location")}
          subtitle={t("Verify the pin is on your field. Adjust the coordinates if needed, then confirm.")}
        >
          <div className="ch2-map-block">
            {/* Embedded OpenStreetMap via iframe — no API key needed */}
            <div className="ch2-map-frame">
              <iframe
                title="Field location"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.02},${location.lat - 0.02},${location.lng + 0.02},${location.lat + 0.02}&layer=mapnik&marker=${location.lat},${location.lng}`}
                allowFullScreen
              />
              <div className="ch2-map-caption">
                <MapPin size={14} />
                <span>{location.display_name}</span>
              </div>
            </div>

            <div className="ch2-map-controls">
              <div className="ch2-map-coords">
                <span className="ch2-eyebrow">{t("DETECTED COORDINATES")}</span>
                <div className="ch2-coord-row">
                  <label className="field">
                    <span>{t("Latitude")}</span>
                    <input type="number" step="0.000001" value={pinLat} onChange={e => setPinLat(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>{t("Longitude")}</span>
                    <input type="number" step="0.000001" value={pinLng} onChange={e => setPinLng(e.target.value)} />
                  </label>
                </div>
                <button className="button secondary ch2-apply-btn" onClick={applyManualPin}>
                  <MapPin size={14} /> {t("Update pin location")}
                </button>
              </div>

              <div className="ch2-confirm-box">
                <div className="ch2-confirm-info">
                  <span className="ch2-eyebrow">{t("FIELD SUMMARY", "FIELD SUMMARY")}</span>
                  <p><strong>{t(crop, crop)}</strong>{variety ? ` · ${t(variety, variety)}` : ''}</p>
                  {sowingDate && <p>{t('Sown:', 'Sown:')} {sowingDate}{age ? ` · ${age}` : ''}</p>}
                  {fieldArea && <p>{t('Area:', 'Area:')} {fieldArea} {t('ha', 'ha')}</p>}
                  {!sowingDate && <p className="ch2-warn-note">⚠ {t('Add a sowing date for growth stage and harvest estimates.', 'Add a sowing date for growth stage and harvest estimates.')}</p>}
                </div>
                <button
                  className="button primary ch2-confirm-btn"
                  onClick={confirmField}
                  disabled={confirmed}
                >
                  <CheckCircle2 size={16} />
                  {confirmed ? t('Field confirmed — analysing…', 'Field confirmed — analysing…') : t('Confirm field & start analysis', 'Confirm field & start analysis')}
                  {!confirmed && <ArrowRight size={15} />}
                </button>
                <p className="ch2-confirm-note">
                  <ShieldCheck size={13} /> {t("Analysis uses the pin coordinates above. The map is provided by OpenStreetMap contributors.", "Analysis uses the pin coordinates above. The map is provided by OpenStreetMap contributors.")}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── STEP 3–7: Analysis results ── */}
      {confirmed && (
        <>
          {/* Satellite layer tabs */}
          <Card
            title={t("03 · Satellite field analysis")}
            subtitle={`${t("Field:", "Field:")} ${displayAddress || location?.display_name || `${location?.lat?.toFixed(4)}, ${location?.lng?.toFixed(4)}`}`}
          >
            <div className="ch2-layer-tabs">
              {layerTabs.map(t => (
                <button
                  key={t.key}
                  className={`ch2-tab ${activeLayer === t.key ? 'on' : ''}`}
                  onClick={() => setActiveLayer(t.key)}
                >
                  {t.label}
                  {loadingLayers[t.key] && <span className="ch2-tab-spinner" />}
                </button>
              ))}
            </div>

            <div className="ch2-layer-panel">
              {activeLayer === 'satellite' && (
                <SatelliteViewer
                  data={layers.satellite}
                  loading={loadingLayers.satellite}
                  error={layerErrors.satellite}
                  lat={location?.lat}
                  lng={location?.lng}
                />
              )}
              {activeLayer === 'ndvi' && (
                <NDVILayer
                  data={layers.ndvi}
                  loading={loadingLayers.ndvi}
                  error={layerErrors.ndvi}
                />
              )}
              {activeLayer === 'flood' && (
                <FloodLayer
                  data={layers.flood}
                  loading={loadingLayers.flood}
                  error={layerErrors.flood}
                />
              )}
              {activeLayer === 'soil' && (
                <SoilLayer
                  data={layers.soil}
                  loading={loadingLayers.soil}
                  error={layerErrors.soil}
                  crop={crop}
                  userState={state}
                  userDistrict={district}
                  userVillage={village}
                />
              )}
              {activeLayer === 'water' && (
                <WaterLayer
                  data={layers.water}
                  loading={loadingLayers.water}
                  error={layerErrors.water}
                />
              )}
            </div>
          </Card>

          {/* AI Crop Report */}
          <CropReport
            report={report}
            crop={crop}
            sowingDate={sowingDate}
          />
        </>
      )}

      {/* Data attribution footer */}
      <div className="ch2-attribution">
        <ShieldCheck size={14} />
        <span>
          {t("Satellite imagery: Contains modified Copernicus Sentinel data (ESA). Map tiles: © OpenStreetMap contributors. Soil data: SoilGrids v2.0 — ISRIC World Soil Information · Soil Nutrient Analysis: India Data Portal — Soil Health Card scheme (2024-25). Weather: NASA POWER — NASA Langley Research Center. Agronomic guidance: ICAR / TNAU published guidelines.", "Satellite imagery: Contains modified Copernicus Sentinel data (ESA). Map tiles: © OpenStreetMap contributors. Soil data: SoilGrids v2.0 — ISRIC World Soil Information · Soil Nutrient Analysis: India Data Portal — Soil Health Card scheme (2024-25). Weather: NASA POWER — NASA Langley Research Center. Agronomic guidance: ICAR / TNAU published guidelines.")}
        </span>
      </div>
    </div>
  )
}
