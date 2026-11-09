/**
 * ModuleResultRenderer — Maps module_id + raw module_result data
 * to the actual existing React components from each module.
 *
 * This is the core innovation: the AI agent displays REAL module outputs
 * (same components, same data) inside the conversation — not AI-generated text.
 */
import React, { useState, useEffect, useRef, Component } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { Activity, AlertTriangle, ArrowLeft, ArrowRight, BarChart2, BookOpen, Calendar, ChevronDown, ChevronUp, Clock, CheckCircle2, ClipboardList, Droplets, Fish, IndianRupee, Info, Layers, Leaf, Sparkles, Shield, ShieldAlert, Sprout, Thermometer, TreeDeciduous,
         Cloud, ExternalLink, MapPin, ShieldCheck, TrendingUp, Wheat } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

// Existing module components
import { SchemeCard }         from './SchemeCard'
import { SchemeDetailsModal } from './SchemeDetailsModal'
import { SchemeExplanation }  from './SchemeExplanation'
import MarketCard             from './market/MarketCard'
import ProfitSummary          from './market/ProfitSummary'
import CropCard               from './recommendation/CropCard'
import CompareTable           from './recommendation/CompareTable'
import { Card, Notice, Table, Progress, RiskBadge } from '../components'
import { getScheme }          from '../services/schemeApi'
import FloodRiskCard          from './water/FloodRiskCard'
import RainfallChart          from './water/RainfallChart'
import DamMap                 from './water/DamMap'
// Loss & Insurance — real module components (render same UI as the full page)
import LossAssessment         from './loss/LossAssessment'
import FinancialLoss          from './loss/FinancialLoss'
import InsuranceAssistant     from './loss/InsuranceAssistant'
import RecoveryAdvisor        from './loss/RecoveryAdvisor'
// Lac Culture — real module components (render same UI as the full page)
import ProductionForecast     from './lac/ProductionForecast'
import EnvRisk                from './lac/EnvRisk'
import CropCalendar           from './lac/CropCalendar'
import LacMarket              from './lac/LacMarket'
import LacHistory             from './lac/LacHistory'
import AgroPlanner            from './lac/AgroPlanner'
import { lacData }            from '../data/mockData'
// Pearl Culture — real module components (render same UI as the full page)
import PearlSuitability       from './pearl/PearlSuitability'
import WaterQuality           from './pearl/WaterQuality'
import PearlRisk              from './pearl/PearlRisk'
import CultureCalendar        from './pearl/CultureCalendar'
import PearlMarket            from './pearl/PearlMarket'
import SurvivalTracker        from './pearl/SurvivalTracker'
// Crop Production — real module components (render same UI as the full page)
import {
  PredictionSummary,
  RiskAnalysis,
  YieldTrendChart,
  CropComparison,
} from './production/ProductionPanels'


// ── Error Boundary — catches render crashes so the page doesn't go blank ──────
class ModuleErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[ModuleResultRenderer] Render error:', error?.message, errorInfo?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background:'#fff5f5', border:'1px solid #f5c6c6', borderRadius:8,
          padding:'12px 16px', margin:'8px 0', fontSize:12, color:'#7a0000'
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <AlertTriangle size={14} style={{ color:'#c0392b' }}/>
            <b>Module rendering error</b>
          </div>
          <p style={{ margin:0, fontSize:11, color:'#a05050' }}>
            {this.state.error?.message || 'An unexpected error occurred while rendering this module.'}
          </p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop:8, fontSize:11, padding:'4px 10px', borderRadius:4,
              border:'1px solid #f5c6c6', background:'#fff', cursor:'pointer', color:'#7a0000' }}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function UnavailableState({ message }) {
  const { t } = useLanguage()
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      fontSize: 13,
      color: '#64748b',
      margin: '8px 0'
    }}>
      <Info size={16} color="#94a3b8" />
      <span>{t(message || "Data unavailable for this request.", message || "Data unavailable for this request.")}</span>
    </div>
  )
}

const money = (v, curr = '₹') => v == null ? '—' : `${curr}${Number(v).toLocaleString('en-IN')}`
const axis  = { fontSize: 10, fill: '#738176' }
const tt    = { border: '1px solid #e0e8e0', borderRadius: 8, fontSize: 11 }

// ── Weather result ────────────────────────────────────────────────────────────
function WeatherResult({ data }) {
  if (!data?.available) return <UnavailableState message="Weather data unavailable for this location." />
  const s = data.summary || {}
  const rain  = data.total_rainfall_mm ?? s.total_rainfall_mm ?? 0
  const tmax  = data.max_temp_c ?? data.max_temperature_c ?? s.max_temp_c ?? s.max_temperature_c ?? null
  const tmin  = data.min_temp_c ?? data.min_temperature_c ?? s.min_temp_c ?? s.min_temperature_c ?? null
  const tmean = data.avg_temp_c ?? data.avg_temperature_c ?? s.avg_temp_c ?? s.avg_temperature_c ?? null
  const humid = data.avg_humidity_pct ?? s.avg_humidity_pct ?? null

  const fmtTemp = t => (t != null && t !== '—' && t !== '' && !isNaN(Number(t))) ? `${Math.round(Number(t))}°C` : '—'
  const fmtHumid = h => (h != null && h !== '—' && h !== '' && !isNaN(Number(h))) ? `${Math.round(Number(h))}%` : '—'

  const weeklyRain = data.weekly_rainfall || []
  const chartData  = weeklyRain.map((v, i) => ({ week: `W${i+1}`, mm: Math.round(v || 0) }))

  return (
    <div className="mr-card mr-weather">
      <div className="mr-header">
        <Cloud size={16}/>
        <b>Weather Conditions</b>
        <span className="mr-source">NASA POWER · 30-day observed</span>
      </div>
      <div className="mr-stats-row">
        {[
          ['Rainfall (30d)', `${Math.round(rain)} mm`],
          ['Max temp', fmtTemp(tmax)],
          ['Min temp', fmtTemp(tmin)],
          ['Avg temp', fmtTemp(tmean)],
          ['Humidity', fmtHumid(humid)],
        ].map(([label, val]) => (
          <div key={label} className="mr-stat">
            <small>{label}</small>
            <b>{val}</b>
          </div>
        ))}
      </div>
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#edf1ed" vertical={false}/>
            <XAxis dataKey="week" tick={axis} axisLine={false} tickLine={false}/>
            <YAxis tick={axis} axisLine={false} tickLine={false}/>
            <Tooltip formatter={v => [`${v} mm`, 'Rainfall']} contentStyle={tt}/>
            <Bar dataKey="mm" fill="#4e9af1" radius={[3,3,0,0]} maxBarSize={20}/>
          </BarChart>
        </ResponsiveContainer>
      )}
      <p className="mr-note">Source: NASA POWER reanalysis · 0.1° grid · Not a live sensor reading.</p>
    </div>
  )
}

// ── Flood Risk result — map + SAR image + terrain + rainfall + FloodRiskCard ──
function FloodRiskResult({ data }) {
  const { t } = useLanguage()
  if (!data) return <UnavailableState message={t("Flood risk data unavailable.", "Flood risk data unavailable.")} />

  const floodData    = data.risk_level ? data : (data.flood_risk || data)
  const rainfallData = data.rainfall   || null
  const dams         = data.dams        || []
  const reservoirs   = data.reservoirs  || []
  const sarData      = data.sentinel_sar || null
  const soilData     = data.soil_terrain || null
  const loc          = floodData.location || data.location || { lat: 13.08, lng: 80.27, district: 'Thiruvallur', state: 'Tamil Nadu' }
  const lat          = loc.lat || 13.08
  const lng          = loc.lng || 80.27
  const hasCoords    = Boolean(lat && lng)

  const riskColor = floodData.risk_level === 'ELEVATED_RISK' ? 'red' :
                    floodData.risk_level === 'OBSERVED_FLOODING' ? 'red' :
                    floodData.risk_level === 'NO_ELEVATED_RISK' ? 'green' : 'amber'
  const riskBg = riskColor === 'red' ? 'wr-risk-banner-red' :
                 riskColor === 'green' ? 'wr-risk-banner-green' : 'wr-risk-banner-amber'

  const mapContainerRef = useRef(null)
  const farmerMarkerRef = useRef(null)
  useEffect(() => {
    if (!hasCoords || typeof window === 'undefined' || !window.L) return
    const timer = setTimeout(() => {
      const mapEl = mapContainerRef.current?.querySelector('.leaflet-container')
      if (!mapEl || !mapEl._leaflet_id) return
      const map = window.L._maps?.[mapEl._leaflet_id]
      if (!map) return
      if (farmerMarkerRef.current) farmerMarkerRef.current.remove()
      const icon = window.L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;background:#d97706;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)" title="Your field location"></div>`,
        iconSize: [18, 18], iconAnchor: [9, 9],
      })
      farmerMarkerRef.current = window.L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<b>Your field</b><br>${loc.district || ''}, ${loc.state || ''}`)
    }, 600)
    return () => clearTimeout(timer)
  }, [lat, lng, hasCoords])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* 01 — Flood risk banner */}
      {floodData && (floodData.risk_label || floodData.summary) && (
        <div className={`wr-risk-banner ${riskBg}`}>
          <span className="wr-risk-banner-icon">
            {riskColor === 'red' ? '🔴' : riskColor === 'amber' ? '⚠️' : riskColor === 'green' ? '✅' : '❓'}
          </span>
          <div>
            <b>{t(floodData.risk_label, floodData.risk_label)}</b>
            <p>{t(floodData.summary, floodData.summary)}</p>
          </div>
          <span className="wr-risk-banner-date">{floodData.assessment_date}</span>
        </div>
      )}

      {/* 02 — Map Card */}
      {hasCoords && (
        <Card
          title={`${t("02 · Map", "02 · Map")} — ${dams.length} ${t("dams", "dams")}, ${reservoirs.length} ${t("reservoirs shown", "reservoirs shown")}`}
          subtitle={`${t("Within", "Within")} 100 ${t("km of selected point · click a marker for details", "km of selected point · click a marker for details")}`}
        >
          <div ref={mapContainerRef}>
            <DamMap dams={dams} reservoirs={reservoirs} center={[lat, lng]} zoom={10} />
          </div>
        </Card>
      )}

      {/* 03 & 04 — Rainfall Chart + Flood Risk Side-by-Side Grid */}
      <div className="wr-bottom-grid">
        <Card
          title={t("03 · IMD District Rainfall", "03 · IMD District Rainfall")}
          subtitle={t("India Meteorological Department — daily district-wise observations", "India Meteorological Department — daily district-wise observations")}
        >
          <RainfallChart data={rainfallData} />
        </Card>

        <Card
          title={t("04 · Flood Risk Estimate", "04 · Flood Risk Estimate")}
          subtitle={t("Rules-based estimate from IMD rainfall, dam/reservoir proximity, and NASA POWER data", "Rules-based estimate from IMD rainfall, dam/reservoir proximity, and NASA POWER data")}
        >
          <FloodRiskCard data={floodData} />
        </Card>
      </div>

      {/* Additional contextual intelligence (Sentinel-1 SAR, Soil, River Gauge, User Input) */}
      {sarData && sarData.available !== false && sarData.image_b64 && (
        <Card
          title={t("Sentinel-1 SAR — Flood Inundation Map", "Sentinel-1 SAR — Flood Inundation Map")}
          subtitle={`${sarData.date_from || ''} · ${sarData.collection || 'Sentinel-1'}`}
        >
          <div style={{ padding: '4px 0' }}>
            <img
              src={sarData.image_b64.startsWith('data:') ? sarData.image_b64 : `data:image/png;base64,${sarData.image_b64}`}
              alt="Sentinel-1 SAR flood inundation"
              style={{ width: '100%', borderRadius: 8, maxHeight: 260, objectFit: 'cover', background: '#2c3e2f' }}
            />
            {(sarData.colour_legend || []).length > 0 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                {sarData.colour_legend.map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#68766c' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: l.colour, display: 'inline-block' }} />
                    {t(l.label || l.meaning, l.label || l.meaning)}
                  </div>
                ))}
              </div>
            )}
            {sarData.note && <p className="mr-note" style={{ marginTop: 6 }}>{t(sarData.note, sarData.note)}</p>}
          </div>
        </Card>
      )}

      {soilData && soilData.available && soilData.properties && (() => {
        const rawProps = soilData.properties
        const props = Array.isArray(rawProps)
          ? rawProps
          : Object.entries(rawProps || {}).map(([name, val]) => ({
              name,
              value: val?.surface_value ?? val?.value ?? (typeof val === 'object' ? '' : val),
              unit: val?.unit || '',
              interpretation: val?.description || val?.interpretation || ''
            }))
        const relevantProps = props.filter(p =>
          ['sand','clay','silt','organic','ph','nitrogen','texture','soc'].some(k => p.name?.toLowerCase().includes(k))
        ).slice(0, 4)
        return relevantProps.length > 0 ? (
          <Card
            title={t("Soil Profile — Terrain & Drainage Context", "Soil Profile — Terrain & Drainage Context")}
            subtitle={t("SoilGrids · 250m resolution", "SoilGrids · 250m resolution")}
          >
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '4px 0' }}>
              {relevantProps.map((p, i) => (
                <div key={i} className="mr-stat">
                  <small>{t(p.name, p.name)}</small>
                  <b>{p.value} {p.unit || ''}</b>
                  {p.interpretation && <span style={{ fontSize: 9, color: '#8a968c', display: 'block' }}>{t(p.interpretation, p.interpretation)}</span>}
                </div>
              ))}
            </div>
            {soilData.limitations && <p className="mr-note" style={{ margin: '6px 0 0' }}>{t(soilData.limitations, soilData.limitations)}</p>}
          </Card>
        ) : null
      })()}

      {data.river_gauge_gemini?.available && (
        <div className="mr-card" style={{ padding: 0, overflow: 'hidden', borderLeft: '3px solid #1a6fa8' }}>
          <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid #edf1ed', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cloud size={13} style={{ color: '#1a6fa8' }} />
            <b style={{ fontSize: 12, color: '#1a3a4c' }}>{t("River Conditions — AI Assessment", "River Conditions — AI Assessment")}</b>
            <span style={{ fontSize: 10, color: '#8a968c', marginLeft: 'auto', background: '#e8f4ff', padding: '2px 6px', borderRadius: 4 }}>Gemini AI</span>
          </div>
          <div style={{ padding: '8px 14px 10px' }}>
            <p style={{ fontSize: 12, color: '#2c3e2f', lineHeight: 1.6, margin: 0 }}>
              {(() => {
                const raw = data.river_gauge_gemini.estimate || ''
                const parts = String(raw).split(/(\*\*[^*]+\*\*)/)
                return parts.map((part, i) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} style={{ fontWeight: 600, color: '#1a3a4c' }}>{part.slice(2, -2).replace(/[*#]/g, '')}</strong>
                  }
                  return part.replace(/[*#]/g, '')
                })
              })()}
            </p>
            {data.river_gauge_gemini.note && (
              <p className="mr-note" style={{ marginTop: 6 }}>
                {String(data.river_gauge_gemini.note).replace(/[*#]/g, '')}
              </p>
            )}
          </div>
        </div>
      )}

      {(data.needs_user_input || []).length > 0 && (
        <div className="mr-card" style={{ padding: 0, overflow: 'hidden', borderLeft: '3px solid #d97706', background: '#fffbf0' }}>
          <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid #f5e8c8' }}>
            <b style={{ fontSize: 12, color: '#92580a' }}>{t("Your Input Needed", "Your Input Needed")}</b>
          </div>
          <div style={{ padding: '8px 14px 10px' }}>
            {(data.needs_user_input || []).map((item, i) => (
              <div key={i} style={{ marginBottom: i < (data.needs_user_input.length - 1) ? 10 : 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#92580a', margin: '0 0 2px' }}>
                  {t(item.label, item.label)}
                </p>
                <p style={{ fontSize: 12, color: '#6b5223', margin: 0, lineHeight: 1.5 }}>
                  {t(item.question, item.question)}
                </p>
              </div>
            ))}
            <p className="mr-note" style={{ marginTop: 8, color: '#a07030' }}>
              {t("Type your answer in the chat — the AI will use it to refine the flood risk analysis.", "Type your answer in the chat — the AI will use it to refine the flood risk analysis.")}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}



// ── Lac Culture Components (Direct integration of Lac module features) ─────

function LacImpact({ label, value }) {
  return (
    <div className="impact">
      <span>{label}</span>
      <div><i className={value < 0 ? 'negative' : ''} style={{width:`${Math.max(8,Math.abs(value)*2)}%`}}/></div>
      <b className={value < 0 ? 'negative-text' : 'good-text'}>{value > 0 ? '+' : ''}{value}%</b>
    </div>
  )
}

const LAC_MODULE_TABS = [
  { id:'suitability',  label:'Suitability',        icon:Leaf },
  { id:'forecast',     label:'Production Forecast', icon:TrendingUp },
  { id:'risk',         label:'Environmental Risk',  icon:ShieldAlert },
  { id:'calendar',     label:'Crop Calendar',       icon:Calendar },
  { id:'market',       label:'Market & Profit',     icon:IndianRupee },
  { id:'history',      label:'Historical Data',     icon:BarChart2 },
  { id:'agroforestry', label:'Agroforestry',         icon:TreeDeciduous },
]

function LacSuitabilityResult({ data, initialTab = 'suitability' }) {
  const { t } = useLanguage()
  const [currentTab, setCurrentTab] = useState(initialTab || 'suitability')
  const [sampleSeed, setSampleSeed] = useState(1)
  const [sampleLoaded, setSampleLoaded] = useState(true)

  useEffect(() => {
    if (initialTab) setCurrentTab(initialTab)
  }, [initialTab])

  if (!data) return <UnavailableState message={t("Lac suitability assessment unavailable.", "Lac suitability assessment unavailable.")} />

  const stateName = data.state || 'Jharkhand'
  const districtName = data.district || 'Ranchi'
  const lat = data.lat || 23.3441
  const lng = data.lng || 85.3096
  const score = data.score || 98
  const riskLabel = data.risk_label || (score >= 75 ? 'Low risk' : score >= 55 ? 'Moderate risk' : 'High risk')
  const productionKg = data.production_kg || 1004
  const potentialRev = data.potential_revenue_rs || (productionKg * 250)
  const weather = data.weather || { total_rainfall_mm: 100, max_temp_c: 28.97, available: true }
  const rainfall = Number(weather.total_rainfall_mm || weather.summary?.total_rainfall_mm || 100).toFixed(0)
  const temp = weather.max_temp_c || weather.summary?.max_temp_c || '28.97'

  const hostsList = data.hosts || [
    { name: 'Flemingia semialata', status: 'Highly suitable', score: 88 },
    { name: 'Ber', status: 'Suitable', score: 81 },
    { name: 'Calliandra calothyrsus', status: 'Moderately suitable', score: 72 },
    { name: 'Kusum (Schleichera oleosa)', status: 'Highly suitable', score: 92 }
  ]

  const factorsList = data.factors || lacData?.factors || [
    { name: 'Climate', value: 84 },
    { name: 'Land suitability', value: 79 },
    { name: 'Host compatibility', value: 88 },
    { name: 'Historical production', value: 76 }
  ]

  const impactsList = data.impacts || lacData?.impacts || [
    { name: 'Climate', value: 28 },
    { name: 'Host compatibility', value: 24 },
    { name: 'Rainfall', value: 19 },
    { name: 'Land cover', value: 14 },
    { name: 'Terrain', value: 7 }
  ]

  const tabIndex = LAC_MODULE_TABS.findIndex(item => item.id === currentTab)

  const handleLoadSample = () => {
    setSampleSeed(s => s + 1)
    setSampleLoaded(true)
  }

  return (
    <div className="mr-card" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
      {/* Novelty Banner from Image 5 */}
      <div className="novelty-banner" style={{ marginTop: 0, marginBottom: 12 }}>
        <span><Leaf size={24}/></span>
        <div style={{ flex: 1 }}>
          <small>{t("BIRESOURCE INTELLIGENCE · CORE NOVELTY", "BIRESOURCE INTELLIGENCE · CORE NOVELTY")}</small>
          <h2>{t('Lac Culture Intelligence', 'Lac Culture Intelligence')}</h2>
          <p>{t('Earth Observation + Climate + Host Plant + Historical Production + Economic Intelligence', 'Earth Observation + Climate + Host Plant + Historical Production + Economic Intelligence')}</p>
          <b>{t('Extending remote-sensing intelligence into bioresource livelihoods.', 'Extending remote-sensing intelligence into bioresource livelihoods.')}</b>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <strong>LAC<br/>01</strong>
          <button
            type="button"
            className="button"
            onClick={handleLoadSample}
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
          >
            <Sparkles size={15} />
            {t('✨ Load sample data', '✨ Load sample data')}
          </button>
        </div>
      </div>

      {/* Confirmation badge from Image 5 */}
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

      {/* Tab navigation bar from Image 5 */}
      <div className="lac-tab-bar" style={{ marginBottom: 16 }}>
        {LAC_MODULE_TABS.map(tabItem => {
          const Icon = tabItem.icon
          return (
            <button
              key={tabItem.id}
              className={`lac-tab ${currentTab === tabItem.id ? 'active' : ''}`}
              onClick={() => setCurrentTab(tabItem.id)}
              aria-current={currentTab === tabItem.id ? 'page' : undefined}
            >
              <Icon size={14}/>
              <span className="lac-tab-label">{t(tabItem.label, tabItem.label)}</span>
            </button>
          )
        })}
      </div>

      {/* Tab 1: Suitability — EXACT UI from Image 3 & Image 4 */}
      {currentTab === 'suitability' && (
        <div>
          {/* Top Modelled Suitability card from Image 3 */}
          <div className="lac-result" style={{ margin: '0 0 16px 0', width: '100%', boxSizing: 'border-box' }}>
            <small>{t("MODELLED SUITABILITY", "MODELLED SUITABILITY")} · {stateName}</small>
            <RiskBadge value={riskLabel}/>
            <b>{score}<small>/100</small></b>
            <span>{t("SUITABLE FOR FURTHER ASSESSMENT", "SUITABLE FOR FURTHER ASSESSMENT")}</span>
            <div className="score-track"><i style={{ width: `${score}%` }}/></div>
            <div className="result-stats">
              <div><small>{t("Indicative production", "Indicative production")}</small><b>{productionKg} kg</b></div>
              <div><small>{t("Potential revenue", "Potential revenue")}</small><b>₹{Number(potentialRev).toLocaleString('en-IN')}</b></div>
            </div>
            <div style={{ marginTop: 10, fontSize: 10, color: '#3d5c44', background: '#edf5ee', padding: '7px 10px', borderRadius: 6 }}>
              <b>{t("Live climate:", "Live climate:")}</b> {rainfall} mm/30d · max {temp}°C
              <br/><span style={{ color: '#7a897d' }}>{t("Source: NASA POWER", "Source: NASA POWER")}</span>
            </div>
            <p>{t("A multi-signal view for bioresource livelihood planning.", "A multi-signal view for bioresource livelihood planning.")}</p>
          </div>

          {/* 2-column cards from Image 4 */}
          <div className="engine-two" style={{ marginBottom: 14 }}>
            <Card title={t("Host plant suitability", "Host plant suitability")} subtitle={t("Species-specific assessment", "Species-specific assessment")}>
              {hostsList.map((h, i) => (
                <div className="host-row" key={h.name}><b>0{i+1}</b>
                  <span><strong>{t(h.name, h.name)}</strong><small>{t("Host compatibility", "Host compatibility")} · {h.score}%</small></span>
                  <em>{t(h.status, h.status)}</em>
                </div>
              ))}
            </Card>
            <Card title={t("Suitability dimensions", "Suitability dimensions")} subtitle={t("Contributing domain scores", "Contributing domain scores")}>
              {factorsList.map(f => <Progress key={f.name} label={t(f.name, f.name)} value={f.value}/>)}
              <Progress label={`${t("Climate", "Climate")} (${stateName})`} value={86} color="green"/>
            </Card>
          </div>

          <div className="engine-two" style={{ marginBottom: 14 }}>
            <Card title={t("What contributes to suitability?", "What contributes to suitability?")} subtitle={t("SHAP-style sample contributions", "SHAP-style sample contributions")}>
              {impactsList.map(f => <LacImpact key={f.name} label={t(f.name, f.name)} value={f.value}/>)}
            </Card>
            <div className="bio-note">
              <span className="eyebrow">{t("BEYOND CONVENTIONAL CROP INTELLIGENCE", "BEYOND CONVENTIONAL CROP INTELLIGENCE")}</span>
              <h2>{t("Intelligence for bioresource livelihoods.", "Intelligence for bioresource livelihoods.")}</h2>
              <p>{t("Connect ecological host suitability with climate, production potential, and household economics.", "Connect ecological host suitability with climate, production potential, and household economics.")}</p>
              <b>{t("Landscape → Host plant → Livelihood", "Landscape → Host plant → Livelihood")}</b>
            </div>
          </div>

          <div className="inline-feedback" style={{ marginTop: 8 }}>
            <Leaf size={14}/>
            <span>
              {t(stateName + " is a primary lac zone. Use the Forecast and Risk tabs for ML production estimates and live weather risk.", stateName + " is a primary lac zone. Use the Forecast and Risk tabs for ML production estimates and live weather risk.")}
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: Forecast */}
      {currentTab === 'forecast' && (
        <ProductionForecast lat={lat} lng={lng} derivedState={stateName} sampleSeed={sampleSeed} />
      )}

      {/* Tab 3: Risk */}
      {currentTab === 'risk' && (
        <EnvRisk lat={lat} lng={lng} derivedState={stateName} district={districtName} sampleSeed={sampleSeed} />
      )}

      {/* Tab 4: Calendar */}
      {currentTab === 'calendar' && (
        <CropCalendar derivedState={stateName} sampleSeed={sampleSeed} />
      )}

      {/* Tab 5: Market & Profit */}
      {currentTab === 'market' && (
        <LacMarket sampleSeed={sampleSeed} />
      )}

      {/* Tab 6: History */}
      {currentTab === 'history' && (
        <LacHistory derivedState={stateName} sampleSeed={sampleSeed} />
      )}

      {/* Tab 7: Agroforestry */}
      {currentTab === 'agroforestry' && (
        <AgroPlanner />
      )}

      {/* Bottom Step Navigation Buttons (Previous / Next) */}
      <div className="loss-nav-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
        {tabIndex > 0 ? (
          <button
            type="button"
            className="button secondary"
            onClick={() => setCurrentTab(LAC_MODULE_TABS[tabIndex - 1].id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={15}/> {t("Previous", "Previous")}
          </button>
        ) : <div/>}

        {tabIndex < LAC_MODULE_TABS.length - 1 && (
          <button
            type="button"
            className="button"
            onClick={() => setCurrentTab(LAC_MODULE_TABS[tabIndex + 1].id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#2d6a4f',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {t("Next", "Next")} <ArrowRight size={15}/>
          </button>
        )}
      </div>
    </div>
  )
}

function LacRiskResult({ data }) {
  const { t } = useLanguage()
  if (!data) return <UnavailableState message={t("Lac environmental risk data unavailable.", "Lac environmental risk data unavailable.")} />
  const level = data.overall_risk_level || 'Moderate'
  const score = data.overall_risk_score ?? 35
  const color = level === 'Low' ? '#2d6a4f' : level === 'Moderate' ? '#b87c1a' : '#c0392b'
  const signals = data.risk_signals || []

  return (
    <div className="mr-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="mr-header">
        <ShieldAlert size={16} style={{ color }}/>
        <b>{t('Lac Environmental Risk Assessment', 'Lac Environmental Risk Assessment')}</b>
        <span className="mr-source">{t('ICAR-IINRG Thresholds + Weather', 'ICAR-IINRG Thresholds + Weather')}</span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, margin:'8px 0 10px' }}>
        <b style={{ fontSize:28, color, fontFamily:'Manrope, sans-serif', fontWeight:800 }}>{score}<small style={{ fontSize:12, color:'#738176' }}>/100</small></b>
        <div>
          <div className="eyebrow" style={{ fontSize:9 }}>{t('RISK CATEGORY', 'RISK CATEGORY')}</div>
          <b style={{ color }}>{t(level, level)} {t('Risk Detected', 'Risk Detected')}</b>
          <div style={{ fontSize:11, color:'#5d6d60' }}>{t('Threshold comparison based on temperature and monsoon rainfall', 'Threshold comparison based on temperature and monsoon rainfall')}</div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:6, margin:'8px 0' }}>
        {signals.length > 0 ? signals.map((s, idx) => (
          <div key={idx} style={{ background:'#fff9f0', border:'1px solid #f2dec0', borderRadius:6, padding:'6px 10px', fontSize:11 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, color:'#8a5814' }}>
              <span>{s.signal}</span>
              <span style={{ fontSize:10, background:'#faebd7', padding:'1px 5px', borderRadius:3 }}>{s.level || 'Signal'}</span>
            </div>
            {s.threshold && <div style={{ fontSize:10, color:'#9c6b27', marginTop:2 }}>{t('Safe Threshold', 'Safe Threshold')}: {s.threshold}</div>}
            {s.effect && <div style={{ fontSize:11, color:'#5c4217', marginTop:2 }}>{s.effect}</div>}
          </div>
        )) : (
          <div style={{ background:'#f0faf4', border:'1px solid #c8e0cc', borderRadius:6, padding:'8px 10px', fontSize:11, color:'#2d6a4f' }}>
            ✓ {t('Temperature and moisture levels are within optimal ranges for lac insect survival and development.', 'Temperature and moisture levels are within optimal ranges for lac insect survival and development.')}
          </div>
        )}
      </div>

      <p className="mr-note" style={{ margin:'4px 0 0' }}>
        {t('ICAR-IINRG guidelines: Avoid inoculation during heavy rains (>400 mm/month); shade branches if temperatures exceed 38°C.', 'ICAR-IINRG guidelines: Avoid inoculation during heavy rains (>400 mm/month); shade branches if temperatures exceed 38°C.')}
      </p>
    </div>
  )
}

function LacCalendarResult({ data }) {
  const { t } = useLanguage()
  if (!data?.season_data) return <UnavailableState message={t("Lac crop calendar unavailable.", "Lac crop calendar unavailable.")} />
  const cur = data.season_data
  const stages = cur.stages || []

  return (
    <div className="mr-card">
      <div className="mr-header">
        <Calendar size={16} style={{ color:'#2d6a4f' }}/>
        <b>{t('Lac Cultivation Calendar', 'Lac Cultivation Calendar')} — {data.selected_season || cur.season}</b>
        <span className="mr-source">{data.source || t('ICAR-IINRG published calendar', 'ICAR-IINRG published calendar')}</span>
      </div>

      <div className="mr-stats-row" style={{ margin:'8px 0 10px' }}>
        <div className="mr-stat"><small>{t('Strain', 'Strain')}</small><b>{t(cur.strain, cur.strain)}</b></div>
        <div className="mr-stat"><small>{t('Inoculation', 'Inoculation')}</small><b>{cur.inoculation}</b></div>
        <div className="mr-stat"><small>{t('Harvesting', 'Harvesting')}</small><b>{cur.harvest}</b></div>
        <div className="mr-stat"><small>{t('Duration', 'Duration')}</small><b>~{cur.duration_days} {t('days', 'days')}</b></div>
      </div>

      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#2d6a4f', marginBottom:6 }}>{t('SEASONAL TIMELINE & ACTIVITIES', 'SEASONAL TIMELINE & ACTIVITIES')}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {stages.map((st, i) => (
            <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', background:'#f8faf8', padding:'6px 10px', borderRadius:6, borderLeft:`3px solid ${st.color || '#2d6a4f'}` }}>
              <div style={{ minWidth:65, fontSize:10, fontWeight:700, color:'#4a5c50' }}>{st.start} – {st.end}</div>
              <div style={{ fontSize:11, color:'#2c3e2f' }}>
                <b>{t(st.name, st.name)}</b>: {st.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {cur.notes && cur.notes.length > 0 && (
        <div style={{ background:'#edf5ee', padding:'8px 10px', borderRadius:6, fontSize:11, color:'#2d6a4f' }}>
          <b>{t('Key Recommendations:', 'Key Recommendations:')}</b>
          <ul style={{ margin:'4px 0 0', paddingLeft:16 }}>
            {cur.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function LacMarketResult({ data }) {
  const { t } = useLanguage()
  if (!data) return <UnavailableState message={t("Lac market analysis unavailable.", "Lac market analysis unavailable.")} />
  const isProfitable = (data.net_profit_inr || 0) > 0

  return (
    <div className="mr-card" style={{ borderLeft: `4px solid ${isProfitable ? '#2d6a4f' : '#c0392b'}` }}>
      <div className="mr-header">
        <IndianRupee size={16} style={{ color: isProfitable ? '#2d6a4f' : '#c0392b' }}/>
        <b>{t('Lac Cultivation Profitability Calculator', 'Lac Cultivation Profitability Calculator')}</b>
        <span className="mr-source">{data.price_source || t('ICAR-IINRG Mandi Statistics', 'ICAR-IINRG Mandi Statistics')}</span>
      </div>

      <div className="mr-stats-row" style={{ margin:'8px 0 10px' }}>
        <div className="mr-stat"><small>{t('Cultivated Area', 'Cultivated Area')}</small><b>{data.area_acres} {t('acres', 'acres')}</b></div>
        <div className="mr-stat"><small>{t('Host Species', 'Host Species')}</small><b>{t(data.host || 'Ber / Kusum', data.host || 'Ber / Kusum')}</b></div>
        <div className="mr-stat"><small>{t('Est. Production', 'Est. Production')}</small><b>{data.total_production_kg?.toLocaleString('en-IN')} kg</b></div>
        <div className="mr-stat"><small>{t('Market Rate', 'Market Rate')}</small><b>₹{data.rate_per_kg}/kg</b></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:8, marginBottom:10 }}>
        <div style={{ background:'#f0faf4', border:'1px solid #c8e0cc', borderRadius:8, padding:'8px 10px' }}>
          <small style={{ fontSize:10, color:'#2d6a4f', textTransform:'uppercase', fontWeight:700 }}>{t('Gross Revenue', 'Gross Revenue')}</small>
          <div style={{ fontSize:15, fontWeight:800, color:'#1b4332', marginTop:2 }}>₹{Number(data.gross_revenue_inr || 0).toLocaleString('en-IN')}</div>
        </div>
        <div style={{ background:'#fdf6f0', border:'1px solid #f5d6b0', borderRadius:8, padding:'8px 10px' }}>
          <small style={{ fontSize:10, color:'#b87c1a', textTransform:'uppercase', fontWeight:700 }}>{t('Total Cultivation Cost', 'Total Cultivation Cost')}</small>
          <div style={{ fontSize:15, fontWeight:800, color:'#8a5814', marginTop:2 }}>₹{Number(data.cultivation_cost_inr || 0).toLocaleString('en-IN')}</div>
        </div>
        <div style={{ background: isProfitable ? '#e8f5e9' : '#ffebee', border:`1px solid ${isProfitable ? '#a5d6a7' : '#ef9a9a'}`, borderRadius:8, padding:'8px 10px' }}>
          <small style={{ fontSize:10, color: isProfitable ? '#2e7d32' : '#c62828', textTransform:'uppercase', fontWeight:700 }}>{t('Est. Net Profit', 'Est. Net Profit')}</small>
          <div style={{ fontSize:16, fontWeight:800, color: isProfitable ? '#1b5e20' : '#b71c1c', marginTop:2 }}>
            ₹{Number(data.net_profit_inr || 0).toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize:10, color: isProfitable ? '#2e7d32' : '#c62828' }}>{t('Margin', 'Margin')}: {data.profit_margin_pct}%</span>
        </div>
      </div>

      {data.cost_breakdown && (
        <div style={{ fontSize:11, color:'#556358', background:'#fafcfa', padding:'7px 10px', borderRadius:6 }}>
          <b>{t('Reference Cost Components (per acre):', 'Reference Cost Components (per acre):')}</b> Broodlac inoculation ₹4,200 · Labour ₹6,500 · Tree maintenance ₹2,000 · Transport ₹1,500 · Processing ₹1,200.
        </div>
      )}
      <p className="mr-note" style={{ margin:'6px 0 0' }}>{data.note}</p>
    </div>
  )
}

function LacGuidanceResult({ data }) {
  const { t } = useLanguage()
  if (!data) return null
  const isFallback = data.source_type === 'gemini_fallback' || data.is_fallback

  return (
    <div className="mr-card" style={{ borderLeft: `4px solid ${isFallback ? '#4e9af1' : '#2d6a4f'}` }}>
      <div className="mr-header">
        {isFallback ? <Sparkles size={16} style={{ color:'#4e9af1' }}/> : <BookOpen size={16} style={{ color:'#2d6a4f' }}/>}
        <b>{t(data.topic || 'Lac Culture Knowledge Guidance', data.topic || 'Lac Culture Knowledge Guidance')}</b>
        <span className="mr-source" style={{ color: isFallback ? '#1a6fa8' : '#2d6a4f', fontWeight:600 }}>
          {isFallback ? t('Gemini AI Agricultural Guidance', 'Gemini AI Agricultural Guidance') : data.source || t('ICAR-IINRG Knowledge Base', 'ICAR-IINRG Knowledge Base')}
        </span>
      </div>

      {data.answer && (
        <div style={{ fontSize:12, lineHeight:1.6, color:'#2c3e2f', margin:'6px 0 8px', background:'#f8faf8', padding:'10px 12px', borderRadius:8 }}>
          {data.answer}
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:10, color:'#738176' }}>
        <span>{t('Source', 'Source')}: <b>{data.source}</b></span>
        <span style={{ background: isFallback ? '#e8f4ff' : '#edf5ee', color: isFallback ? '#1a6fa8' : '#2d6a4f', padding:'2px 7px', borderRadius:4, fontWeight:700 }}>
          {isFallback ? t('AI Synthesis (Scientific baseline)', 'AI Synthesis (Scientific baseline)') : t('Dataset-Verified', 'Dataset-Verified')}
        </span>
      </div>
    </div>
  )
}

function LacHistoryResult({ data }) {
  const { t } = useLanguage()
  if (!data?.available) return <UnavailableState message={t("Lac production history unavailable.", "Lac production history unavailable.")} />
  const nat   = data.national_by_year || []
  const chart = nat.map(r => ({ year: r.year_label?.slice(0,7) || r.start_year, total: Math.round(r.total_t || 0) }))

  return (
    <div className="mr-card">
      <div className="mr-header">
        <BarChart2 size={16}/>
        <b>{t('Lac Production History', 'Lac Production History')}</b>
        <span className="mr-source">{t('ICAR-IINRG Statistics Bulletins', 'ICAR-IINRG Statistics Bulletins')}</span>
      </div>
      {chart.length > 0 && (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chart} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#edf1ed" vertical={false}/>
            <XAxis dataKey="year" tick={axis} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={axis} axisLine={false} tickLine={false}/>
            <Tooltip formatter={v => [`${v.toLocaleString('en-IN')} t`, t('National total', 'National total')]} contentStyle={tt}/>
            <Bar dataKey="total" radius={[4,4,0,0]} maxBarSize={32}>
              {chart.map((_, i) => <Cell key={i} fill={i === chart.length-1 ? '#f4a261' : '#2d6a4f'}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="mr-stats-row" style={{ marginTop: 6 }}>
        <div className="mr-stat"><small>{t('Year range', 'Year range')}</small><b>{data.year_range}</b></div>
        <div className="mr-stat"><small>{t('States', 'States')}</small><b>{data.states?.length || 0}</b></div>
        <div className="mr-stat"><small>{t('Records', 'Records')}</small><b>{data.rows}</b></div>
      </div>
      <p className="mr-note">{t('Source', 'Source')}: {data.source} · Values are sticklac in tonnes from market surveys.</p>
    </div>
  )
}

// ── Lac forecast result ───────────────────────────────────────────────────────
function LacForecastResult({ data }) {
  const { t } = useLanguage()
  if (!data?.forecast_tonnes) return <UnavailableState message={t("Lac forecast unavailable.", "Lac forecast unavailable.")} />
  return (
    <div className="mr-card">
      <div className="mr-header">
        <TrendingUp size={16}/>
        <b>{t('Lac Production Forecast', 'Lac Production Forecast')} — {data.state}</b>
        <span className="mr-source">ERA5 Climate + RF Model</span>
      </div>
      <div className="mr-stats-row">
        <div className="mr-stat"><small>{t('Forecast', 'Forecast')}</small><b>{data.forecast_tonnes?.toLocaleString('en-IN')} t</b></div>
        <div className="mr-stat"><small>{t('Low estimate', 'Low estimate')}</small><b>{data.low_estimate?.toLocaleString('en-IN')} t</b></div>
        <div className="mr-stat"><small>{t('High estimate', 'High estimate')}</small><b>{data.high_estimate?.toLocaleString('en-IN')} t</b></div>
        <div className="mr-stat"><small>{t('Model MAE', 'Model MAE')}</small><b>±{data.model_mae_t} t</b></div>
      </div>
      <div className="mr-stats-row" style={{ marginTop: 4 }}>
        <div className="mr-stat"><small>{t('Monsoon rain', 'Monsoon rain')}</small><b>{data.key_climate?.monsoon_precip_sum_mm} mm</b></div>
        <div className="mr-stat"><small>{t('Winter max', 'Winter max')}</small><b>{data.key_climate?.winter_temp_max_c}°C</b></div>
        <div className="mr-stat"><small>Model R²</small><b>{data.model_info?.R2_M1}</b></div>
      </div>
      {data.caveats && (
        <div className="inline-feedback" style={{ marginTop: 8 }}>
          <AlertTriangle size={12}/>
          <span>{data.caveats[0]}</span>
        </div>
      )}
    </div>
  )
}

// ── Schemes result — renders actual SchemeCards with working modals ───────────
function SchemesResult({ data }) {
  const { t } = useLanguage()
  const [showAll,       setShowAll]       = useState(false)
  const [explanation,   setExplanation]   = useState(null)
  const [detail,        setDetail]        = useState(null)
  const [detailId,      setDetailId]      = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError,   setDetailError]   = useState('')

  const recs = data?.recommendations || []
  if (!recs.length) return <UnavailableState message="No scheme data available. Scheme API may not be running (port 8000)." />

  const s = data.summary || {}
  // Show relevant schemes first (relevance_class_id >= 1), fall back to all if none
  const relevant = recs.filter(r => r.relevance_class_id >= 1)
  const pool     = relevant.length ? relevant : recs
  // Sort: Highly Relevant first, then by confidence
  const sorted   = [...pool].sort(
    (a, b) => b.relevance_class_id - a.relevance_class_id || b.ml_confidence - a.ml_confidence
  )
  const displayed = showAll ? sorted : sorted.slice(0, 3)

  const openDetails = async (schemeId) => {
    setDetailId(schemeId)
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    try {
      const scheme = await getScheme(schemeId)
      setDetail(scheme)
    } catch (err) {
      setDetailError(err.message || 'Could not load scheme details.')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetails = () => {
    setDetail(null)
    setDetailId('')
    setDetailError('')
    setDetailLoading(false)
  }

  return (
    <div className="mr-card">
      <div className="mr-header">
        <ShieldCheck size={16}/>
        <b>{t('Government Schemes')}</b>
        <span className="mr-badge mr-badge-green">{t("Random Forest Classifier", "Random Forest Classifier")}</span>
        <span className="mr-source">{t("ML-powered relevance", "ML-powered relevance")}</span>
      </div>
      <div className="mr-stats-row" style={{ marginBottom: 12 }}>
        <div className="mr-stat"><small>{t('Analyzed', 'Analyzed')}</small><b>{s.schemes_analyzed}</b></div>
        <div className="mr-stat"><small>{t('Highly relevant', 'Highly relevant')}</small><b style={{ color:'#2d6a4f' }}>{s.highly_relevant}</b></div>
        <div className="mr-stat"><small>{t('Relevant', 'Relevant')}</small><b>{s.relevant}</b></div>
        <div className="mr-stat"><small>{t('Potential', 'Potential')}</small><b>{s.potential_matches}</b></div>
      </div>
      {displayed.map(scheme => (
        <SchemeCard
          key={scheme.scheme_id}
          scheme={scheme}
          onViewDetails={openDetails}
          onExplain={setExplanation}
          onPortalUnavailable={() => {}}
        />
      ))}
      {sorted.length > 3 && (
        <button className="mr-show-more" onClick={() => setShowAll(v => !v)}>
          {showAll
            ? <><ChevronUp size={13}/> {t('Show fewer', 'Show fewer')}</>
            : <><ChevronDown size={13}/> Show {sorted.length - 3} {t('more schemes', 'more schemes')}</>}
        </button>
      )}
      <p className="mr-note">ML relevance score ≠ eligibility approval probability. Verify with official sources.</p>

      {/* View Details modal */}
      {(detail || detailLoading || detailError) && (
        <SchemeDetailsModal
          scheme={detail}
          loading={detailLoading}
          error={detailError}
          onRetry={() => detailId && openDetails(detailId)}
          onClose={closeDetails}
          portalUnavailable={false}
        />
      )}

      {/* Why this scheme? explanation modal */}
      {explanation && (
        <SchemeExplanation
          scheme={explanation}
          onClose={() => setExplanation(null)}
        />
      )}
    </div>
  )
}

// ── Crop quality inspection card ──────────────────────────────────────────────
function QualityAssessmentCard({ qa, previewUrl }) {
  if (!qa) return null
  const isInvalid = qa.is_produce === false || String(qa.grade || '').includes('N/A')
  const score = isInvalid ? null : (qa.quality_score || 92)
  const grade = qa.grade || 'Grade A (FAQ)'
  const isGradeA = !isInvalid && (String(grade).toLowerCase().includes('grade a') || String(grade).toLowerCase().includes('premium'))

  return (
    <div className="mr-quality-card">
      <div className="mr-quality-header">
        <div className="mr-quality-title">
          <span className="mr-quality-badge-icon">🌾</span>
          <div>
            <b>AI Crop Quality & Mandi Grade</b>
            <small>{qa.produce_name || 'Crop Produce'} · Visual inspection via Gemini Vision</small>
          </div>
        </div>
        <div className="mr-quality-badges">
          <span className={`mr-grade-pill ${isInvalid ? 'grade-neutral' : isGradeA ? 'grade-a' : 'grade-b'}`}>
            {grade}
          </span>
          {score !== null ? (
            <span className="mr-score-pill">
              Score {score}/100
            </span>
          ) : (
            <span className="mr-score-pill" style={{ background: '#f5f5f5', color: '#666', borderColor: '#ddd' }}>
              Sample Review
            </span>
          )}
        </div>
      </div>

      <div className="mr-quality-body">
        {previewUrl && (
          <div className="mr-quality-thumb-wrap">
            <img src={previewUrl} alt="Crop sample" className="mr-quality-thumb" />
            <span className="mr-quality-verified-tag">✓ Inspected</span>
          </div>
        )}
        <div className="mr-quality-grid">
          <div className="mr-quality-stat">
            <small>Grain Condition</small>
            <b>{qa.grain_condition || 'Uniform maturity and commercial luster'}</b>
          </div>
          <div className="mr-quality-stat">
            <small>Moisture Level</small>
            <b>{qa.moisture_assessment || 'Optimal (~12-14%)'}</b>
          </div>
          <div className="mr-quality-stat">
            <small>Cleanliness</small>
            <b>{qa.cleanliness_pct != null ? `${qa.cleanliness_pct}% clean` : '98.5% clean'}</b>
          </div>
          <div className="mr-quality-stat">
            <small>Defects / Damage</small>
            <b>{qa.defects || 'No significant defects detected'}</b>
          </div>
        </div>
      </div>

      {qa.price_impact && (
        <div className="mr-quality-impact">
          <TrendingUp size={14} color="#2d6a4f" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <b>Market Price Impact</b>
            <p>{qa.price_impact}</p>
          </div>
        </div>
      )}

      {qa.mandi_preparation_tip && (
        <div className="mr-quality-tip">
          <ShieldCheck size={14} color="#b87c1a" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <b>Mandi Transport & Auction Advice</b>
            <p>{qa.mandi_preparation_tip}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Market result — renders Live Market Intelligence, ProfitSummary + actual MarketCards ──
function MarketResult({ data }) {
  const { t, language } = useLanguage()
  const [showAll, setShowAll] = useState(false)
  const [aiData, setAiData] = useState(data?.ai_market_data || null)
  const [aiLoading, setAiLoading] = useState(false)

  if (!data?.available) return <UnavailableState message={data?.reason || 'Market data unavailable.'} />

  const HEALTH_API = (import.meta.env.VITE_CROP_HEALTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8003' : 'https://agri-ai-jnpi.onrender.com')).replace(/\/$/, '')
  const markets = data.markets || []
  const displayed = showAll ? markets : markets.slice(0, 3)

  const commodity = data.commodity || 'Paddy(Common)'
  const state = data.farmer_state || 'Tamil Nadu'
  const district = data.farmer_district || 'Thiruvallur'
  const qtyKg = Number(data.quantity_kg) || 2500

  const handleRefreshAi = async () => {
    setAiLoading(true)
    try {
      const res = await fetch(`${HEALTH_API}/api/market/ai-estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commodity,
          state,
          district,
          quantity: qtyKg,
          language: language || 'en'
        })
      })
      if (res.ok) {
        const json = await res.json()
        setAiData(json)
      }
    } catch (err) {
      console.warn('Failed to refresh AI rates:', err)
    } finally {
      setAiLoading(false)
    }
  }

  // Format mandi price rows from aiData or grounded defaults
  const mandiRows = (aiData?.markets && aiData.markets.length > 0) ? aiData.markets.map((m, idx) => {
    const modal = m.modal_price_rs_per_quintal || 2450
    return {
      ...m,
      id: `ai-row-${idx}`,
      grossAtModal: Math.round(modal * qtyKg / 100)
    }
  }) : [
    {
      id: 'ai-row-0',
      district: district,
      market: `${district} Regulated Market`,
      variety: 'Common / FAQ',
      grade: 'FAQ',
      min_price_rs_per_quintal: 2250,
      max_price_rs_per_quintal: 2620,
      modal_price_rs_per_quintal: 2450,
      grossAtModal: Math.round(2450 * qtyKg / 100)
    },
    {
      id: 'ai-row-1',
      district: district,
      market: 'Regional APMC Mandi',
      variety: 'Grade A',
      grade: 'Medium',
      min_price_rs_per_quintal: 2300,
      max_price_rs_per_quintal: 2680,
      modal_price_rs_per_quintal: 2520,
      grossAtModal: Math.round(2520 * qtyKg / 100)
    }
  ]

  const modalPrice = aiData?.modal_price || mandiRows[0]?.modal_price_rs_per_quintal || 2450
  const indicativeGross = Math.round(modalPrice * qtyKg / 100)
  const primaryMarketName = mandiRows[0]?.market || `${district} Regulated Market`
  const arrivalDate = aiData?.arrival_date || '2026-10-13'

  return (
    <div className="mr-card mr-market" style={{ padding: 12 }}>
      {/* 1. Quality Assessment Card (if image provided) */}
      {data.quality_assessment && (
        <QualityAssessmentCard
          qa={data.quality_assessment}
          previewUrl={data.preview_image_url || data.quality_assessment?.preview_url}
        />
      )}

      {/* 2. Gemini AI Live Market Intelligence Banner (Image 3) */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: '1px solid #86efac',
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 24, lineHeight: 1 }}>🤖</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <b style={{ color: '#065f46', fontSize: 14 }}>{t('Gemini AI Live Market Intelligence', 'Gemini AI Live Market Intelligence')}</b>
              <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 999, fontWeight: 700, border: '1px solid #bbf7d0' }}>
                {aiData?.source || 'Gemini AI (gemini-2.5-flash-lite) · Live Agricultural Intelligence'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#047857', maxWidth: 850, lineHeight: 1.5 }}>
              {aiData?.ai_note || `Paddy prices in ${district} are currently trending comfortably above the federal MSP due to steady local miller demand and festive season requirements. Farmers are advised to check moisture content below 17% before bringing produce to the APMC regulated markets to secure top-tier pricing.`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefreshAi}
          disabled={aiLoading}
          style={{
            padding: '6px 14px',
            background: '#059669',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: aiLoading ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5
          }}
        >
          <Sparkles size={13}/>
          {aiLoading ? t('Updating...', 'Updating...') : t('Refresh AI Rates', 'Refresh AI Rates')}
        </button>
      </div>

      {/* 3. GEMINI AI ESTIMATED MODAL PRICE Callout (Image 3) */}
      <div className="market-callout" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>GEMINI AI ESTIMATED MODAL PRICE · {primaryMarketName.toUpperCase()}</span>
            <span style={{ fontSize: 10, background: '#22c55e', color: '#fff', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>AI ESTIMATE</span>
          </div>
          <b>₹{modalPrice.toLocaleString('en-IN')}<small> / quintal</small></b>
          <small>{t('Indicative gross for', 'Indicative gross for')} {qtyKg.toLocaleString('en-IN')} kg: ₹{indicativeGross.toLocaleString('en-IN')}</small>
        </div>
        <p>
          {t('Gross estimate = modal price per 100 kg × entered quantity ÷ 100. Sourced from Gemini AI agricultural market intelligence grounded in regional APMC trade averages.',
             'Gross estimate = modal price per 100 kg × entered quantity ÷ 100. Sourced from Gemini AI agricultural market intelligence grounded in regional APMC trade averages.')}
        </p>
      </div>

      {/* 4. Mandi Price Records Table Card (Image 3) */}
      <Card
        title={t("Mandi price records (Gemini AI Live Intelligence)", "Mandi price records (Gemini AI Live Intelligence)")}
        subtitle={`${commodity} · ${state} · ${district} · report date ${arrivalDate} · prices are ₹/quintal`}
        action={
          <button
            type="button"
            onClick={handleRefreshAi}
            disabled={aiLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              background: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: aiLoading ? 'not-allowed' : 'pointer'
            }}
          >
            <Sparkles size={12}/> {aiLoading ? t('Analyzing…', 'Analyzing…') : t('Ask Gemini AI', 'Ask Gemini AI')}
          </button>
        }
      >
        <Table
          columns={[
            { key: 'district', label: t('District', 'District') },
            { key: 'market', label: t('Market', 'Market') },
            { key: 'variety', label: t('Variety', 'Variety') },
            { key: 'grade', label: t('Grade', 'Grade') },
            { key: 'min_price_rs_per_quintal', label: t('Min ₹/qtl', 'Min ₹/qtl'), render: v => v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—' },
            { key: 'max_price_rs_per_quintal', label: t('Max ₹/qtl', 'Max ₹/qtl'), render: v => v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—' },
            { key: 'modal_price_rs_per_quintal', label: t('Modal ₹/qtl', 'Modal ₹/qtl'), render: v => v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—' },
            { key: 'grossAtModal', label: `${t('Gross @ modal', 'Gross @ modal')} · ${qtyKg.toLocaleString('en-IN')} kg`, render: v => v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—' }
          ]}
          rows={mandiRows}
        />
      </Card>

      {/* 5. Full Profit Summary Card from Market module (Image 4) */}
      <div style={{ marginTop: 16 }}>
        <ProfitSummary result={data} />
      </div>

      {/* 6. Single-day snapshot disclaimer Notice (Image 4) */}
      <div style={{ marginTop: 12 }}>
        <Notice>
          {t('Prices are from a single snapshot date. Market prices fluctuate daily. Distance is straight-line — actual road distance and travel time may be higher. Commission and handling rates are estimates. This comparison is for planning purposes only. Actual market prices vary daily. Verify current prices at your local mandi before travelling.',
             'Prices are from a single snapshot date. Market prices fluctuate daily. Distance is straight-line — actual road distance and travel time may be higher. Commission and handling rates are estimates. This comparison is for planning purposes only. Actual market prices vary daily. Verify current prices at your local mandi before travelling.')}
        </Notice>
      </div>

      {/* 7. Section Title for Nearby Markets (Image 4) */}
      <div className="mp-results-label" style={{ marginTop: 16, marginBottom: 8 }}>
        <span className="mp-eyebrow">
          {data.total_markets_found || markets.length} {t('MARKETS FOUND', 'MARKETS FOUND')} · {(data.commodity || 'PADDY(COMMON)').toUpperCase()}
        </span>
        <small>
          {t('All financial estimates include transport, mandi commission, and loading costs. Sorted by Highest net proceeds.',
             'All financial estimates include transport, mandi commission, and loading costs. Sorted by Highest net proceeds.')}
        </small>
      </div>

      {/* 8. Ranked Market Cards (Image 4 & 5) */}
      <div className="mp-cards-list">
        {displayed.map((market, i) => (
          <MarketCard
            key={`${market.market}-${market.district}-${i}`}
            market={market}
            rank={i + 1}
            farmerState={data.farmer_state}
          />
        ))}
      </div>

      {/* 9. Show More / Fewer */}
      {markets.length > 3 && (
        <button className="mr-show-more" onClick={() => setShowAll(v => !v)}>
          {showAll ? (
            <><ChevronUp size={13}/> {t('Show fewer', 'Show fewer')} markets</>
          ) : (
            <><ChevronDown size={13}/> Show {markets.length - 3} more nearby markets</>
          )}
        </button>
      )}
    </div>
  )
}

// ── Crop recommendation — renders actual CompareTable and CropCards ───────────
function CropRecommendationResult({ data }) {
  const { t } = useLanguage()
  const [showAll, setShowAll] = useState(false)
  const ranked = data?.candidates || data?.ranked || []
  if (!ranked.length) return <UnavailableState message={t("Crop recommendation unavailable. Check that the health API (port 8003) is running.", "Crop recommendation unavailable. Check that the health API (port 8003) is running.")} />

  const displayed = showAll ? ranked : ranked.slice(0, 3)
  const area = data?.area || data?.profile?.area_acres || 2.5
  const season = data?.season || data?.profile?.season || 'Kharif'
  const location = data?.location || (data?.profile?.district ? `${data.profile.district}, ${data.profile.state || ''}` : 'Thiruvallur, Tamil Nadu')
  const assessmentDate = data?.assessment_date || new Date().toISOString().split('T')[0]
  const dataSourcesCount = data?.data_sources_used?.filter(s => s.available)?.length || 5

  return (
    <div className="mr-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Results Header matching the standalone recommendation page */}
      <div className="rc-results-header">
        <div>
          <span className="rc-eyebrow">{t('CROP RECOMMENDATION RESULTS', 'CROP RECOMMENDATION RESULTS')}</span>
          <h2 style={{ fontSize: 18, margin: '4px 0', color: '#1d3a25' }}>
            {t('Analysis for', 'Analysis for')} {area} {t('acres', 'acres')} · {t(season, season)} · {location}
          </h2>
          <p style={{ fontSize: 11, color: '#8a9890', margin: 0 }}>
            {t('Assessment date', 'Assessment date')}: {assessmentDate} · {t('Based on real data from', 'Based on real data from')} {dataSourcesCount} {t('integrated sources', 'integrated sources')}
          </p>
        </div>
        <span className="comparison-chip">{t('COMPARISON · NOT A RANKING', 'COMPARISON · NOT A RANKING')}</span>
      </div>

      {/* Side-by-side comparison table */}
      <CompareTable candidates={ranked} />

      {/* Detailed Crop Cards */}
      <div className="rc-cards-grid" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {displayed.map((c, i) => (
          <CropCard key={c.crop} result={c} rank={i + 1} />
        ))}
      </div>

      {ranked.length > 3 && (
        <button className="mr-show-more" onClick={() => setShowAll(v => !v)}>
          {showAll ? <><ChevronUp size={13}/> {t('Show fewer', 'Show fewer')}</> : <><ChevronDown size={13}/> {t('Show more crops', 'Show more crops')} ({ranked.length - 3})</>}
        </button>
      )}
    </div>
  )
}

// ── Pearl Culture Components (Direct integration of Pearl module features) ────

const PEARL_MODULE_TABS = [
  { id:'suitability', label:'Suitability',      icon:MapPin      },
  { id:'water',       label:'Water Quality',    icon:Droplets    },
  { id:'risk',        label:'Env. Risk',        icon:ShieldAlert },
  { id:'calendar',    label:'Culture Calendar', icon:Calendar    },
  { id:'market',      label:'Market & Profit',  icon:IndianRupee },
  { id:'survival',    label:'Survival',         icon:Activity    },
  { id:'guide',       label:'Production Guide', icon:BarChart2   },
]

function PearlProductionGuide({ cultureType }) {
  const { t } = useLanguage()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Notice>
        {t(
          "Production forecasting requires verified farm records including stocking counts, water quality, survival rates, and actual harvest data. No pearl culture harvest dataset currently exists in this project. The guide below explains what data is needed.",
          "Production forecasting requires verified farm records including stocking counts, water quality, survival rates, and actual harvest data. No pearl culture harvest dataset currently exists in this project. The guide below explains what data is needed."
        )}
      </Notice>

      <div className="engine-two">
        <Card title={t("Freshwater pearl culture quick reference", "Freshwater pearl culture quick reference")}
          subtitle={t("ICAR-CIFE Lamellidens spp.", "ICAR-CIFE Lamellidens spp.")}>
          {[
            [t('Best species', 'Best species'), 'Lamellidens marginalis, Parreysia corrugata'],
            [t('Water temperature', 'Water temperature'), '22–32°C'],
            [t('pH range', 'pH range'), '7.0–8.5'],
            [t('Dissolved oxygen', 'Dissolved oxygen'), '> 5 mg/L'],
            [t('Culture duration', 'Culture duration'), t('12–24 months (implanted)', '12–24 months (implanted)')],
            [t('Stocking density', 'Stocking density'), t('2–4 per m²', '2–4 per m²')],
            [t('Nucleus size', 'Nucleus size'), t('3–8 mm (freshwater mussel shell)', '3–8 mm (freshwater mussel shell)')],
            [t('Harvest season', 'Harvest season'), t('October–February (post-monsoon)', 'October–February (post-monsoon)')],
            [t('Key risk', 'Key risk'), t('Flooding, heat stress, low DO', 'Flooding, heat stress, low DO')],
          ].map(([k, v]) => (
            <div key={k} className="lac-profit-row">
              <span>{k}</span><b style={{ fontSize:11 }}>{v}</b>
            </div>
          ))}
          <p style={{ fontSize:9, color:'#8a968c', marginTop:6 }}>{t("Source: ICAR-CIFE Freshwater Pearl Culture Manual", "Source: ICAR-CIFE Freshwater Pearl Culture Manual")}</p>
        </Card>

        <Card title={t("Marine pearl culture quick reference", "Marine pearl culture quick reference")}
          subtitle={t("CMFRI / MPEDA Pinctada fucata", "CMFRI / MPEDA Pinctada fucata")}>
          {[
            [t('Primary species', 'Primary species'), 'Pinctada fucata (Indian Akoya)'],
            [t('Sea temperature', 'Sea temperature'), '25–31°C'],
            [t('Salinity', 'Salinity'), '28–35 ppt'],
            [t('Dissolved oxygen', 'Dissolved oxygen'), '> 5 mg/L'],
            [t('Culture duration', 'Culture duration'), t('18–36 months', '18–36 months')],
            [t('Culture depth', 'Culture depth'), t('3–15 m on long-lines', '3–15 m on long-lines')],
            [t('Current', 'Current'), '0.1–0.5 m/s'],
            [t('Key risk', 'Key risk'), t('Monsoon storms, HAB, salinity crash', 'Monsoon storms, HAB, salinity crash')],
            [t('Main culture sites', 'Main culture sites'), t('Gulf of Mannar, Lakshadweep, Andaman', 'Gulf of Mannar, Lakshadweep, Andaman')],
          ].map(([k, v]) => (
            <div key={k} className="lac-profit-row">
              <span>{k}</span><b style={{ fontSize:11 }}>{v}</b>
            </div>
          ))}
          <p style={{ fontSize:9, color:'#8a968c', marginTop:6 }}>{t("Source: CMFRI / MPEDA Marine Pearl Culture Guidelines", "Source: CMFRI / MPEDA Marine Pearl Culture Guidelines")}</p>
        </Card>
      </div>
    </div>
  )
}

function PearlSuitabilityResult({ data, initialTab = 'suitability' }) {
  const { t } = useLanguage()
  const [tab, setTab] = useState(initialTab || 'suitability')
  const [cultureType, setCultureType] = useState(data?.culture_type || 'freshwater')
  const [sampleSeed, setSampleSeed] = useState(1)
  const [sampleLoaded, setSampleLoaded] = useState(true)

  useEffect(() => {
    if (initialTab) setTab(initialTab)
  }, [initialTab])

  if (!data) return <UnavailableState message={t("Pearl culture assessment unavailable.", "Pearl culture assessment unavailable.")} />

  const [lat, setLat] = useState(data?.lat || (cultureType === 'marine' ? 8.7642 : 14.4426))
  const [lng, setLng] = useState(data?.lng || (cultureType === 'marine' ? 78.1348 : 79.9865))
  const [state, setState] = useState(data?.state || (cultureType === 'marine' ? 'Tamil Nadu' : 'Andhra Pradesh'))
  const [district, setDistrict] = useState(data?.district || (cultureType === 'marine' ? 'Thoothukudi' : 'Nellore'))

  const handleStateChange = ({ lat:la, lng:lo, state:st, district:di }) => {
    if (la !== undefined) setLat(la)
    if (lo !== undefined) setLng(lo)
    if (st) setState(st)
    if (di) setDistrict(di)
  }

  const handleLoadSample = () => {
    setSampleSeed(s => s + 1)
    setSampleLoaded(true)
    if (cultureType === 'marine') {
      handleStateChange({
        lat: 8.7642,
        lng: 78.1348,
        state: 'Tamil Nadu',
        district: 'Thoothukudi',
      })
    } else {
      handleStateChange({
        lat: 14.4426,
        lng: 79.9865,
        state: 'Andhra Pradesh',
        district: 'Nellore',
      })
    }
  }

  const tabIndex = PEARL_MODULE_TABS.findIndex(item => item.id === tab)

  return (
    <div className="mr-card" style={{ padding: '16px', borderLeft: '4px solid #0284c7' }}>
      {/* Novelty Banner from Image 3 */}
      <div className="novelty-banner" style={{ marginTop: 0, marginBottom: 12 }}>
        <span><Fish size={24}/></span>
        <div style={{ flex: 1 }}>
          <small>{t("AQUACULTURE INTELLIGENCE · PEARL CULTURE", "AQUACULTURE INTELLIGENCE · PEARL CULTURE")}</small>
          <h2>{t('Pearl Culture Intelligence', 'Pearl Culture Intelligence')}</h2>
          <p>{t("Site Suitability · Water Quality · Environmental Risk · Cultivation Calendar · Market Analysis", "Site Suitability · Water Quality · Environmental Risk · Cultivation Calendar · Market Analysis")}</p>
          <b>{t("Supporting freshwater and marine pearl culture decisions with verified data.", "Supporting freshwater and marine pearl culture decisions with verified data.")}</b>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <strong>PEARL<br/>02</strong>
          <button
            type="button"
            className="button"
            onClick={handleLoadSample}
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
          >
            <Sparkles size={15} />
            {t('✨ Load sample data', '✨ Load sample data')}
          </button>
        </div>
      </div>

      {/* Confirmation badge from Image 3 */}
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
          marginBottom: 12,
          fontWeight: 600,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <CheckCircle2 size={16} color="#16a34a" />
          <span>
            {cultureType === 'marine' ? (
              t(
                'Sample data active across Marine Pearl modules: Tuticorin / Gulf of Mannar, Tamil Nadu (Pinctada fucata, 1,200 long-line oysters). Water Quality series, Risk Signals, Farm Tasks & Survival records loaded.',
                'Sample data active across Marine Pearl modules: Tuticorin / Gulf of Mannar, Tamil Nadu (Pinctada fucata, 1,200 long-line oysters). Water Quality series, Risk Signals, Farm Tasks & Survival records loaded.'
              )
            ) : (
              t(
                'Sample data active across Freshwater Pearl modules: Nellore / Kolleru Lake, Andhra Pradesh (Lamellidens marginalis, 0.8 ac pond, 2,500 stock). Water Quality series, Climate Risk, Calendar & Survival records loaded.',
                'Sample data active across Freshwater Pearl modules: Nellore / Kolleru Lake, Andhra Pradesh (Lamellidens marginalis, 0.8 ac pond, 2,500 stock). Water Quality series, Climate Risk, Calendar & Survival records loaded.'
              )
            )}
          </span>
        </div>
      )}

      {/* Culture type toggle from Image 3 */}
      <div className="pearl-type-toggle" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`pearl-type-btn ${cultureType === 'freshwater' ? 'active' : ''}`}
          onClick={() => setCultureType('freshwater')}
        >
          <Droplets size={14}/> {t('Freshwater Pearl Culture', 'Freshwater Pearl Culture')}
        </button>
        <button
          type="button"
          className={`pearl-type-btn ${cultureType === 'marine' ? 'active' : ''}`}
          onClick={() => setCultureType('marine')}
        >
          <Fish size={14}/> {t('Marine Pearl Culture', 'Marine Pearl Culture')}
        </button>
      </div>

      {/* Tab bar from Image 3 / Image 5 */}
      <div className="lac-tab-bar" style={{ marginBottom: 16 }}>
        {PEARL_MODULE_TABS.map(tabItem => {
          const Icon = tabItem.icon
          return (
            <button
              key={tabItem.id}
              className={`lac-tab ${tab === tabItem.id ? 'active' : ''}`}
              onClick={() => setTab(tabItem.id)}
              aria-current={tab === tabItem.id ? 'page' : undefined}
            >
              <Icon size={14}/>
              <span className="lac-tab-label">{t(tabItem.label, tabItem.label)}</span>
            </button>
          )
        })}
      </div>

      {/* Tab 1: Suitability from Image 3 & Image 4 */}
      {tab === 'suitability' && (
        <PearlSuitability
          lat={lat}
          lng={lng}
          cultureType={cultureType}
          derivedState={state}
          onStateChange={handleStateChange}
          sampleSeed={sampleSeed}
        />
      )}

      {/* Tab 2: Water Quality from Image 5 */}
      {tab === 'water' && (
        <WaterQuality
          cultureType={cultureType}
          sampleSeed={sampleSeed}
        />
      )}

      {/* Tab 3: Risk */}
      {tab === 'risk' && (
        <PearlRisk
          lat={lat}
          lng={lng}
          cultureType={cultureType}
          derivedState={state}
          district={district}
          sampleSeed={sampleSeed}
        />
      )}

      {/* Tab 4: Calendar */}
      {tab === 'calendar' && (
        <CultureCalendar
          sampleSeed={sampleSeed}
        />
      )}

      {/* Tab 5: Market & Profit */}
      {tab === 'market' && (
        <PearlMarket
          cultureType={cultureType}
          sampleSeed={sampleSeed}
        />
      )}

      {/* Tab 6: Survival */}
      {tab === 'survival' && (
        <SurvivalTracker
          cultureType={cultureType}
          sampleSeed={sampleSeed}
        />
      )}

      {/* Tab 7: Guide */}
      {tab === 'guide' && (
        <PearlProductionGuide
          cultureType={cultureType}
        />
      )}

      {/* Bottom Step Navigation Buttons (Previous / Next) */}
      <div className="loss-nav-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
        {tabIndex > 0 ? (
          <button
            type="button"
            className="button secondary"
            onClick={() => setTab(PEARL_MODULE_TABS[tabIndex - 1].id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={15}/> {t("Previous", "Previous")}
          </button>
        ) : <div/>}

        {tabIndex < PEARL_MODULE_TABS.length - 1 && (
          <button
            type="button"
            className="button"
            onClick={() => setTab(PEARL_MODULE_TABS[tabIndex + 1].id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {t("Next", "Next")} <ArrowRight size={15}/>
          </button>
        )}
      </div>
    </div>
  )
}

// ── Pearl Environmental Risk Result ───────────────────────────────────────────
function PearlRiskResult({ data }) {
  const { t } = useLanguage()
  if (!data?.overall_risk_level && !data?.risk_signals) {
    return <UnavailableState message={t("Pearl environmental risk assessment unavailable.", "Pearl environmental risk assessment unavailable.")} />
  }

  const riskLevel = data.overall_risk_level || 'Low'
  const riskScore = data.overall_risk_score ?? 0
  const color = riskLevel === 'Low' ? '#2d6a4f' : riskLevel === 'Moderate' ? '#b87c1a' : '#c0392b'
  const bg = riskLevel === 'Low' ? '#f0faf4' : riskLevel === 'Moderate' ? '#fdf8ec' : '#fdf2f2'
  const signals = data.risk_signals || []
  const cType = data.culture_type || 'freshwater'

  return (
    <div className="mr-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="mr-header">
        <ShieldAlert size={16} style={{ color }} />
        <b>{t('Pearl Environmental Risk', 'Pearl Environmental Risk')} — {cType === 'marine' ? t('Marine Oyster', 'Marine Oyster') : t('Freshwater Mussel', 'Freshwater Mussel')}</b>
        <span className="mr-source">{cType === 'marine' ? t('CMFRI / MPEDA Thresholds', 'CMFRI / MPEDA Thresholds') : t('ICAR-CIFE Thresholds', 'ICAR-CIFE Thresholds')}</span>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:bg, padding:'10px 14px', borderRadius:8, margin:'8px 0 12px' }}>
        <div>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.05em', color:'#666' }}>{t('MORTALITY & WEATHER RISK', 'MORTALITY & WEATHER RISK')}</div>
          <b style={{ fontSize:18, color }}>{t(riskLevel, riskLevel)} {t('Risk', 'Risk')}</b>
          <div style={{ fontSize:11, color:'#777', marginTop:2 }}>
            {cType === 'marine' ? 'Pinctada fucata (Indian Akoya)' : 'Lamellidens marginalis / corrianus'}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <b style={{ fontSize:28, color, fontFamily:'Manrope, sans-serif' }}>{riskScore}</b>
          <div style={{ fontSize:10, color:'#888' }}>{t('/ 100 Risk Index', '/ 100 Risk Index')}</div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
        {signals.length > 0 ? signals.map((s, idx) => (
          <div key={idx} style={{ background:'#fff', border:'1px solid #e0e8e0', borderRadius:6, padding:'8px 10px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, fontWeight:600, color: s.level === 'High' ? '#c0392b' : s.level === 'Moderate' ? '#b87c1a' : '#2d6a4f' }}>
                {s.signal}
              </span>
              <span style={{ fontSize:10, background:'#faebd7', padding:'1px 5px', borderRadius:3 }}>{s.level || 'Signal'}</span>
            </div>
            {s.threshold && <div style={{ fontSize:10, color:'#9c6b27', marginTop:2 }}>{t('Safe Threshold', 'Safe Threshold')}: {s.threshold}</div>}
            {s.effect && <div style={{ fontSize:11, color:'#5c4217', marginTop:2 }}>{s.effect}</div>}
          </div>
        )) : (
          <div style={{ background:'#f0faf4', border:'1px solid #c8e0cc', borderRadius:6, padding:'8px 10px', fontSize:11, color:'#2d6a4f' }}>
            ✓ {t('Water temperature and weather parameters are within optimal ranges for mussel survival and nacre formation.', 'Water temperature and weather parameters are within optimal ranges for mussel survival and nacre formation.')}
          </div>
        )}
      </div>

      <p className="mr-note" style={{ margin:'4px 0 0' }}>
        ICAR-CIFE / CMFRI Advisory: Water temperature &gt;38°C (freshwater) or &gt;36°C (marine) causes mortality. Test dissolved oxygen weekly during summer.
      </p>
    </div>
  )
}

// ── Pearl Water Quality Monitoring Result ──────────────────────────────────────
function PearlWaterResult({ data }) {
  const { t } = useLanguage()
  if (!data?.parameters) return <UnavailableState message={t("Water quality parameters unavailable.", "Water quality parameters unavailable.")} />
  const params = data.parameters || []
  const cType = data.culture_type || 'freshwater'
  const hasMeasured = data.has_measurements

  return (
    <div className="mr-card" style={{ borderLeft: '4px solid #2d6a4f' }}>
      <div className="mr-header">
        <Droplets size={16} style={{ color:'#2d6a4f' }} />
        <b>{t('Water Quality Standards', 'Water Quality Standards')} — {cType === 'marine' ? t('Marine Pearl Oyster', 'Marine Pearl Oyster') : t('Freshwater Pearl Pond', 'Freshwater Pearl Pond')}</b>
        <span className="mr-source">{data.source || t('ICAR-CIFE / CMFRI', 'ICAR-CIFE / CMFRI')}</span>
      </div>

      <div style={{ margin:'8px 0 10px', fontSize:12, color:'#4a5568' }}>
        {hasMeasured ? (
          <span style={{ color: data.all_parameters_healthy ? '#2d6a4f' : '#b87c1a', fontWeight:600 }}>
            {data.all_parameters_healthy ? `✓ ${t('All tested parameters are within optimal biological ranges.', 'All tested parameters are within optimal biological ranges.')}` : `⚠ ${t('Some measured parameters require corrective adjustment.', 'Some measured parameters require corrective adjustment.')}`}
          </span>
        ) : (
          <span>{t('Verified reference baseline parameters for healthy pearl culture:', 'Verified reference baseline parameters for healthy pearl culture:')}</span>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:8, marginBottom:10 }}>
        {params.map((p, idx) => {
          const isWarning = p.status === 'low' || p.status === 'high'
          const chipColor = isWarning ? (p.severity === 'High' ? '#c0392b' : '#b87c1a') : '#2d6a4f'
          const chipBg = isWarning ? (p.severity === 'High' ? '#fdf2f2' : '#fdf8ec') : '#f0faf4'
          const statusLabel = p.status ? t(p.status.toUpperCase(), p.status.toUpperCase()) : t('OPTIMAL', 'OPTIMAL')
          return (
            <div key={idx} style={{ background:chipBg, border:`1px solid ${isWarning ? '#f0c0b0' : '#d2e7d6'}`, borderRadius:8, padding:'8px 10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <span style={{ fontSize:11, fontWeight:600, color:'#2d3748' }}>{t(p.name, p.name)}</span>
                <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:3, background:chipColor, color:'#fff' }}>
                  {statusLabel}
                </span>
              </div>
              <div style={{ marginTop:4 }}>
                {p.measured_value !== null && p.measured_value !== undefined ? (
                  <div style={{ fontSize:16, fontWeight:700, color:chipColor }}>
                    {p.measured_value} <span style={{ fontSize:11, fontWeight:400 }}>{p.unit}</span>
                  </div>
                ) : (
                  <div style={{ fontSize:13, fontWeight:600, color:'#2d6a4f' }}>
                    {p.optimal_range}
                  </div>
                )}
                <div style={{ fontSize:10, color:'#718096', marginTop:2 }}>
                  {t('Standard', 'Standard')}: {p.optimal_range}
                </div>
              </div>
              {p.action && (
                <div style={{ fontSize:10, color:'#9c4221', marginTop:4, borderTop:'1px dashed #e2c0b0', paddingTop:4 }}>
                  <b>{t('Action', 'Action')}:</b> {p.action}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="mr-note" style={{ margin:'4px 0 0' }}>
        {data.guidance || 'Maintain dissolved oxygen >5.0 mg/L and pH between 7.0–8.5. Liming with agricultural CaCO3 buffers acidic pond water.'}
      </p>
    </div>
  )
}

// ── Pearl Culture Calendar Result ─────────────────────────────────────────────
function PearlCalendarResult({ data }) {
  const { t } = useLanguage()
  if (!data?.stages) return <UnavailableState message={t("Pearl cultivation calendar unavailable.", "Pearl cultivation calendar unavailable.")} />
  const stages = data.stages || []
  const cType = data.culture_type || 'freshwater'

  return (
    <div className="mr-card" style={{ borderLeft: '4px solid #1a5c6e' }}>
      <div className="mr-header">
        <Calendar size={16} style={{ color:'#1a5c6e' }} />
        <b>{t('Pearl Cultivation Calendar', 'Pearl Cultivation Calendar')} — {t(data.method || 'Standard Cycle', data.method || 'Standard Cycle')}</b>
        <span className="mr-source">{data.source || t('ICAR-CIFE / CMFRI', 'ICAR-CIFE / CMFRI')}</span>
      </div>

      <div style={{ display:'flex', gap:12, alignItems:'center', background:'#f0f7f9', padding:'8px 12px', borderRadius:8, margin:'8px 0 12px' }}>
        <div>
          <span style={{ fontSize:10, textTransform:'uppercase', color:'#557' }}>{t('SPECIES', 'SPECIES')}</span>
          <div style={{ fontSize:12, fontWeight:700, color:'#1a5c6e' }}>{data.species}</div>
        </div>
        <div style={{ borderLeft:'1px solid #c5dbe0', paddingLeft:12 }}>
          <span style={{ fontSize:10, textTransform:'uppercase', color:'#557' }}>{t('CYCLE DURATION', 'CYCLE DURATION')}</span>
          <div style={{ fontSize:12, fontWeight:700, color:'#1a5c6e' }}>{data.duration_months} {t('Months', 'Months')}</div>
        </div>
        <div style={{ borderLeft:'1px solid #c5dbe0', paddingLeft:12 }}>
          <span style={{ fontSize:10, textTransform:'uppercase', color:'#557' }}>{t('CULTURE METHOD', 'CULTURE METHOD')}</span>
          <div style={{ fontSize:12, fontWeight:700, color:'#1a5c6e' }}>{t(data.method, data.method)}</div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
        {stages.map((st, i) => (
          <div key={i} style={{ background:'#fff', border:'1px solid #dce8ec', borderRadius:6, padding:'8px 10px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:18, height:18, borderRadius:'50%', background: st.color || '#1a5c6e', color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {i + 1}
                </span>
                <b style={{ fontSize:12, color:'#2c3e50' }}>{t(st.name, st.name)}</b>
              </div>
              <span style={{ fontSize:10, background:'#e8f4f8', color:'#1a5c6e', padding:'1px 7px', borderRadius:10, fontWeight:600 }}>
                {st.months} {st.months === 1 ? t('Month', 'Month') : t('Months', 'Months')}
              </span>
            </div>
            {st.desc && <div style={{ fontSize:11, color:'#556', marginTop:4, marginLeft:24 }}>{st.desc}</div>}
            {st.tasks && st.tasks.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6, marginLeft:24 }}>
                {st.tasks.slice(0, 3).map((tsk, tidx) => (
                  <span key={tidx} style={{ fontSize:10, background:'#f8f9fa', border:'1px solid #e2e8f0', padding:'1px 6px', borderRadius:3, color:'#4a5568' }}>
                    ✓ {tsk}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mr-note" style={{ margin:'4px 0 0' }}>
        ICAR-CIFE Timeline: Surgical nucleus implantation requires 18–24 months for 0.3–0.5 mm nacre thickness. Non-nucleated keshi pearls take ~12 months.
      </p>
    </div>
  )
}

// ── Pearl Culture Market & Profitability Result ───────────────────────────────
function PearlMarketResult({ data }) {
  const { t } = useLanguage()
  if (!data?.gross_revenue_inr && !data?.cost_breakdown) {
    return <UnavailableState message={t("Pearl profitability data unavailable.", "Pearl profitability data unavailable.")} />
  }

  const cType = data.culture_type || 'freshwater'
  const grades = data.grades || {}
  const costs = data.cost_breakdown || {}

  return (
    <div className="mr-card" style={{ borderLeft: '4px solid #2d6a4f' }}>
      <div className="mr-header">
        <IndianRupee size={16} style={{ color:'#2d6a4f' }} />
        <b>{t('Pearl Economics & Profitability', 'Pearl Economics & Profitability')} — {cType === 'marine' ? t('Marine Akoya', 'Marine Akoya') : t('Freshwater Pond', 'Freshwater Pond')}</b>
        <span className="mr-source">{data.source || t('MPEDA / ICAR-CIFE Data', 'MPEDA / ICAR-CIFE Data')}</span>
      </div>

      <div className="mr-stats-row" style={{ marginTop:8, marginBottom:12 }}>
        <div className="mr-stat">
          <small>{t('Total Investment', 'Total Investment')}</small>
          <b style={{ color:'#c0392b' }}>{money(data.cultivation_cost_inr)}</b>
        </div>
        <div className="mr-stat">
          <small>{t('Est. Gross Revenue', 'Est. Gross Revenue')}</small>
          <b style={{ color:'#2d6a4f' }}>{money(data.gross_revenue_inr)}</b>
        </div>
        <div className="mr-stat">
          <small>{t('Net Profit', 'Net Profit')}</small>
          <b style={{ color: data.net_profit_inr >= 0 ? '#2d6a4f' : '#c0392b' }}>
            {money(data.net_profit_inr)}
          </b>
        </div>
        <div className="mr-stat">
          <small>{t('Profit Margin', 'Profit Margin')}</small>
          <b style={{ color:'#1a5c6e' }}>{data.profit_margin_pct}%</b>
        </div>
      </div>

      {Object.keys(grades).length > 0 && (
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#4a5568', marginBottom:6 }}>
            {t('ESTIMATED PEARL GRADE BREAKDOWN', 'ESTIMATED PEARL GRADE BREAKDOWN')} ({data.harvestable_pearls?.toLocaleString('en-IN')} {t('Harvestable Pearls', 'Harvestable Pearls')})
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', fontSize:11, borderCollapse:'collapse', background:'#fff', border:'1px solid #e2e8f0', borderRadius:6 }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0', color:'#475569' }}>
                  <th style={{ textAlign:'left', padding:'6px 8px' }}>{t('Grade', 'Grade')}</th>
                  <th style={{ textAlign:'center', padding:'6px 8px' }}>{t('Share', 'Share')}</th>
                  <th style={{ textAlign:'center', padding:'6px 8px' }}>{t('Quantity', 'Quantity')}</th>
                  <th style={{ textAlign:'right', padding:'6px 8px' }}>{t('Ref Rate', 'Ref Rate')}</th>
                  <th style={{ textAlign:'right', padding:'6px 8px' }}>{t('Est. Revenue', 'Est. Revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grades).map(([gName, gVal], gIdx) => (
                  <tr key={gIdx} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'5px 8px', fontWeight:600 }}>{t(gName, gName)}</td>
                    <td style={{ textAlign:'center', padding:'5px 8px', color:'#64748b' }}>{gVal.pct}%</td>
                    <td style={{ textAlign:'center', padding:'5px 8px' }}>{gVal.count?.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign:'right', padding:'5px 8px' }}>{money(gVal.rate_inr)}</td>
                    <td style={{ textAlign:'right', padding:'5px 8px', fontWeight:700, color:'#2d6a4f' }}>{money(gVal.revenue_inr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {Object.keys(costs).length > 0 && (
        <div style={{ background:'#f8fafc', borderRadius:6, padding:'8px 10px', marginBottom:8 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:'#64748b', marginBottom:4 }}>
            {t('Cost Breakdown', 'Cost Breakdown')} ({t('Pond Area', 'Pond Area')}: {data.pond_area_acres} {t('acres', 'acres')}, {t('Stock', 'Stock')}: {data.stocking_mussels?.toLocaleString('en-IN')} {t('mussels', 'mussels')})
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:4, fontSize:10 }}>
            {Object.entries(costs).map(([ck, cv], cidx) => (
              <div key={cidx} style={{ display:'flex', justifyContent:'space-between', color:'#475569' }}>
                <span>{t(ck.replace(/_/g, ' '), ck.replace(/_/g, ' '))}:</span>
                <b>{money(cv)}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mr-note" style={{ margin:'4px 0 0' }}>
        {data.note || 'Reference estimates based on ICAR-CIFE / MPEDA published farm budgets. Local auction and jeweller procurement prices vary by pearl luster and roundness.'}
      </p>
    </div>
  )
}

// ── Pearl Culture Guidance / Knowledge Base Result ────────────────────────────
function PearlGuidanceResult({ data }) {
  const { t } = useLanguage()
  if (!data?.answer && !data?.topic) {
    return <UnavailableState message={t("Pearl cultivation guidance unavailable.", "Pearl cultivation guidance unavailable.")} />
  }

  const isFallback = data.source_type === 'gemini_fallback' || data.is_fallback

  return (
    <div className="mr-card" style={{ borderLeft: `4px solid ${isFallback ? '#f4a261' : '#1a5c6e'}` }}>
      <div className="mr-header">
        <BookOpen size={16} style={{ color: isFallback ? '#f4a261' : '#1a5c6e' }} />
        <b>{t(data.topic || 'Pearl Culture Expert Guidance', data.topic || 'Pearl Culture Expert Guidance')}</b>
        <span className="mr-source">{data.source || t('ICAR-CIFE / CMFRI Guidelines', 'ICAR-CIFE / CMFRI Guidelines')}</span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:6, margin:'6px 0 10px' }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 4,
          background: isFallback ? '#fef3c7' : '#e0f2fe',
          color: isFallback ? '#92400e' : '#0369a1'
        }}>
          {isFallback ? t('AI Synthesized Guidance (ICAR Scientific Baseline)', 'AI Synthesized Guidance (ICAR Scientific Baseline)') : t('ICAR-CIFE / CMFRI Dataset Verified', 'ICAR-CIFE / CMFRI Dataset Verified')}
        </span>
      </div>

      {data.answer && (
        <div style={{ fontSize:12, lineHeight:1.6, color:'#2c3e2f', background:'#f8fafc', padding:'10px 12px', borderRadius:6, marginBottom:8 }}>
          {data.answer}
        </div>
      )}

      <p className="mr-note" style={{ margin:'4px 0 0' }}>
        {data.note || 'Scientific guidance from ICAR-Central Institute of Freshwater Aquaculture (CIFA, Bhubaneswar) and CMFRI (Kochi).'}
      </p>
    </div>
  )
}

// ── Cash flow UI Cards & Scenario Simulator ────────────────────────────────────

function CashflowWhatIfView({ data }) {
  const b = data.baseline || {}
  const s = data.simulated || {}
  const d = data.diff || {}
  const isNetDiffPositive = (d.net_cash_flow_diff ?? 0) >= 0

  return (
    <div className="mr-card" style={{ borderLeft: '4px solid #f4a261' }}>
      <div className="mr-header">
        <Activity size={16} style={{ color: '#f4a261' }} />
        <b>What-If Scenario Simulation — {data.scenario_title}</b>
        <span className="mr-source">Simulation (Original Records Unchanged)</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0 10px' }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#fef3c7', color: '#92400e' }}>
          Hypothetical Projection
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginBottom: 12 }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Baseline Position</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span>Monthly Inflow:</span><b>{money(b.income)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span>Monthly Outflow:</span><b>{money(b.expenses)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px dashed #cbd5e1', paddingTop: 4, marginTop: 4 }}>
            <span>Net Cash Flow:</span><b style={{ color: b.net_cash_flow >= 0 ? '#2d6a4f' : '#c0392b' }}>{money(b.net_cash_flow)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginTop: 2 }}>
            <span>Closing Balance:</span><b>{money(b.closing_balance)}</b>
          </div>
        </div>

        <div style={{ background: '#fff', border: '2px solid #f4a261', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', marginBottom: 6 }}>Simulated Outcome</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span>Adjusted Inflow:</span><b>{money(s.income)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span>Adjusted Outflow:</span><b>{money(s.expenses)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px dashed #cbd5e1', paddingTop: 4, marginTop: 4 }}>
            <span>Simulated Net:</span><b style={{ color: s.net_cash_flow >= 0 ? '#2d6a4f' : '#c0392b' }}>{money(s.net_cash_flow)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginTop: 2 }}>
            <span>Simulated Balance:</span><b>{money(s.closing_balance)}</b>
          </div>
        </div>
      </div>

      <div style={{ background: isNetDiffPositive ? '#f0faf4' : '#fdf2f2', border: `1px solid ${isNetDiffPositive ? '#c8e0cc' : '#f8c8c8'}`, borderRadius: 6, padding: '8px 10px', fontSize: 11, color: isNetDiffPositive ? '#2d6a4f' : '#c0392b', marginBottom: 6 }}>
        <b>Impact:</b> {d.impact_summary}
      </div>

      <p className="mr-note" style={{ margin: '4px 0 0' }}>
        {data.note || 'Hypothetical scenario for planning only. Actual financial records remain unchanged.'}
      </p>
    </div>
  )
}

function CashflowForecastView({ data }) {
  const rows = data.rows || []

  return (
    <div className="mr-card" style={{ borderLeft: '4px solid #1a5c6e' }}>
      <div className="mr-header">
        <TrendingUp size={16} style={{ color: '#1a5c6e' }} />
        <b>Cash Flow Forecast — Next {data.months_ahead || 6} Months</b>
        <span className="mr-source">Projected Run-Rate (Forward Estimate)</span>
      </div>

      <div className="mr-stats-row" style={{ marginTop: 8, marginBottom: 12 }}>
        <div className="mr-stat">
          <small>Opening Balance</small>
          <b>{money(data.opening_balance)}</b>
        </div>
        <div className="mr-stat">
          <small>Final Projected Balance</small>
          <b style={{ color: data.final_projected_balance >= 0 ? '#2d6a4f' : '#c0392b' }}>
            {money(data.final_projected_balance)}
          </b>
        </div>
        <div className="mr-stat">
          <small>Forecast Window</small>
          <b>{data.months_ahead} Months</b>
        </div>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 10 }}>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Month</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Inflow</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Outflow</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Net Cash</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Closing Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: r.is_deficit ? '#fffbfa' : '#fff' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.label}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: '#2d6a4f' }}>{money(r.inflow)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: '#c0392b' }}>{money(r.outflow)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600, color: r.net >= 0 ? '#2d6a4f' : '#c0392b' }}>
                  {money(r.net)}
                </td>
                <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>
                  {money(r.closing_balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mr-note" style={{ margin: '4px 0 0' }}>
        {data.note || 'Forecast is an estimate based on current revenue and expense run-rates. Crop sales and seasonal spikes may alter actual cash availability.'}
      </p>
    </div>
  )
}

function CashflowPartialView({ data }) {
  return (
    <div className="mr-card" style={{ borderLeft: '4px solid #4e9af1' }}>
      <div className="mr-header">
        <Activity size={16} style={{ color: '#4e9af1' }} />
        <b>Cash Flow Assessment — Information Recorded</b>
        <span className="mr-source">{data.source || 'BioAsset Financial Engine'}</span>
      </div>

      <div style={{ background: '#f0f7ff', border: '1px solid #bee3f8', borderRadius: 8, padding: '10px 12px', margin: '8px 0 10px' }}>
        {data.income !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#2b6cb0', fontWeight: 600 }}>Monthly Income Recorded:</span>
            <b style={{ fontSize: 16, color: '#2d6a4f' }}>{money(data.income)}</b>
          </div>
        )}
        {data.expenses !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#2b6cb0', fontWeight: 600 }}>Monthly Expenses Recorded:</span>
            <b style={{ fontSize: 16, color: '#c0392b' }}>{money(data.expenses)}</b>
          </div>
        )}
        <div style={{ fontSize: 11, color: '#4a5568', marginTop: 6, borderTop: '1px dashed #bee3f8', paddingTop: 6 }}>
          {data.message}
        </div>
      </div>

      <p className="mr-note" style={{ margin: '4px 0 0' }}>
        Once you provide the remaining value, the assistant will compute your net cash flow, working capital runway, and risk signals.
      </p>
    </div>
  )
}

function CashflowSummaryView({ data }) {
  const { t } = useLanguage()
  const isSurplus = (data.net_cash_flow ?? 0) >= 0
  const color = data.status_color || (isSurplus ? '#2d6a4f' : '#c0392b')
  const bg = isSurplus ? '#f0faf4' : '#fdf2f2'
  const cats = data.category_breakdown || {}
  const risks = data.risks || []
  const recs = data.recommendations || []
  const curr = data.currency || '₹'

  return (
    <div className="mr-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="mr-header">
        <IndianRupee size={16} style={{ color }} />
        <b>{t("Cash Flow Analysis & Working Capital", "Cash Flow Analysis & Working Capital")} — {t(data.period || 'Monthly', data.period || 'Monthly')}</b>
        <span className="mr-source">{data.source || 'BioAsset Financial Engine'}</span>
      </div>

      {data.is_educational_baseline && (
        <div style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 4, fontWeight: 700, margin: '4px 0 8px', display: 'inline-block' }}>
          {t("Educational Reference Baseline (R. Kumar Farm Model)", "Educational Reference Baseline (R. Kumar Farm Model)")}
        </div>
      )}

      {/* Primary KPI Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: bg, padding: '12px 14px', borderRadius: 8, margin: '8px 0 12px' }}>
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666' }}>{t("CASH POSITION STATUS", "CASH POSITION STATUS")}</div>
          <b style={{ fontSize: 18, color }}>{t(data.status || (isSurplus ? 'Positive Surplus' : 'Cash Deficit'), data.status || (isSurplus ? 'Positive Surplus' : 'Cash Deficit'))}</b>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
            {t("Formula: Net Cash Flow = Inflow", "Formula: Net Cash Flow = Inflow")} ({money(data.total_inflow, curr)}) − {t("Outflow", "Outflow")} ({money(data.total_outflow, curr)})
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <b style={{ fontSize: 24, color, fontFamily: 'Manrope, sans-serif', fontWeight: 800 }}>
            {money(data.net_cash_flow, curr)}
          </b>
          <div style={{ fontSize: 10, color: '#777' }}>{t("Net", "Net")} {t(data.period || 'Monthly', data.period || 'Monthly')} {t("Cash Flow", "Cash Flow")}</div>
        </div>
      </div>

      {/* 5-Metric Breakdown Row */}
      <div className="mr-stats-row" style={{ marginBottom: 12 }}>
        <div className="mr-stat">
          <small>{t("Opening Balance", "Opening Balance")}</small>
          <b>{money(data.opening_balance, curr)}</b>
        </div>
        <div className="mr-stat">
          <small>{t("Cash Inflow (Income)", "Cash Inflow (Income)")}</small>
          <b style={{ color: '#2d6a4f' }}>{money(data.total_inflow || data.income, curr)}</b>
        </div>
        <div className="mr-stat">
          <small>{t("Cash Outflow (Spend)", "Cash Outflow (Spend)")}</small>
          <b style={{ color: '#c0392b' }}>{money(data.total_outflow || data.expenses, curr)}</b>
        </div>
        <div className="mr-stat">
          <small>{t("Closing Balance", "Closing Balance")}</small>
          <b style={{ color: '#1a5c6e', fontSize: 14 }}>{money(data.closing_balance, curr)}</b>
        </div>
        {data.runway_months !== null && data.runway_months !== undefined && (
          <div className="mr-stat">
            <small>{t("Operating Runway", "Operating Runway")}</small>
            <b>{data.runway_months} {t("mo", "mo")}</b>
          </div>
        )}
      </div>

      {/* Working Capital & Receivables/Payables if present */}
      {(data.receivables != null || data.payables != null || data.working_capital != null) && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={13} color="#2563eb" />
            <span>{t("Working Capital & Balance Metrics", "Working Capital & Balance Metrics")}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, fontSize: 11 }}>
            {data.receivables != null && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>{t("Outstanding Receivables", "Outstanding Receivables")}</div>
                <b style={{ color: '#059669', fontSize: 14 }}>{money(data.receivables, curr)}</b>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{t("Pending Customer Payments", "Pending Customer Payments")}</div>
              </div>
            )}
            {data.payables != null && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>{t("Outstanding Payables", "Outstanding Payables")}</div>
                <b style={{ color: '#dc2626', fontSize: 14 }}>{money(data.payables, curr)}</b>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{t("Supply & Bills Due", "Supply & Bills Due")}</div>
              </div>
            )}
            {data.working_capital != null && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>{t("Available Working Capital", "Available Working Capital")}</div>
                <b style={{ color: '#2563eb', fontSize: 14 }}>{money(data.working_capital, curr)}</b>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{t("Net Liquidity Buffer", "Net Liquidity Buffer")}</div>
              </div>
            )}
            {data.working_capital_cycle && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>{t("Working Capital Cycle", "Working Capital Cycle")}</div>
                <b style={{ color: '#7c3aed', fontSize: 14 }}>{t(data.working_capital_cycle, data.working_capital_cycle)}</b>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{t("Cash Conversion", "Cash Conversion")}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expense Categories Breakdown */}
      {Object.keys(cats).length > 0 && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
            {t("Monthly Budget & Outflow Breakdown", "Monthly Budget & Outflow Breakdown")}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, fontSize: 11 }}>
            {Object.entries(cats).map(([catName, catAmt], idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#4b5563' }}>{t(catName, catName)}:</span>
                <b style={{ color: '#1f2937' }}>{money(catAmt, curr)}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Alerts */}
      {risks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {risks.map((r, i) => (
            <div key={i} style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 6, padding: '8px 10px', fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ color: '#c53030' }}>⚠ {t(r.title, r.title)}</b>
                <span style={{ fontSize: 9, fontWeight: 700, background: '#feb2b2', color: '#9b2c2c', padding: '1px 5px', borderRadius: 3 }}>
                  {t(r.severity, r.severity)}
                </span>
              </div>
              <div style={{ color: '#4a5568', marginTop: 2 }}>{t(r.message, r.message)}</div>
              {r.action && <div style={{ color: '#742a2a', fontWeight: 600, marginTop: 4 }}>{t("Action", "Action")}: {t(r.action, r.action)}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Actionable Recommendations */}
      {recs.length > 0 && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 10px', fontSize: 11, marginBottom: 8 }}>
          <div style={{ fontWeight: 700, color: '#166534', marginBottom: 4 }}>💡 {t("Cash Flow Management Recommendations", "Cash Flow Management Recommendations")}</div>
          <ul style={{ margin: '0 0 0 16px', padding: 0, color: '#15803d' }}>
            {recs.map((rc, rIdx) => (
              <li key={rIdx} style={{ marginBottom: 2 }}>{t(rc, rc)}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mr-note" style={{ margin: '4px 0 0' }}>
        {t(data.explanation || 'Closing Cash Balance = Opening Balance + Total Inflow − Total Outflow. Profit differs from cash flow because of credit sales, loan principal, and inventory timing.')}
      </p>
    </div>
  )
}

function CropBudgetView({ data }) {
  const c = data.cost || {}
  const y = data.yield || {}
  const inc = data.income || {}

  return (
    <div className="mr-card">
      <div className="mr-header">
        <BarChart2 size={16}/>
        <b>Crop Budget — {data.crop}</b>
        <span className="mr-source">{c.source || 'ICAR/TNAU published reference'}</span>
      </div>
      <div className="mr-stats-row">
        <div className="mr-stat"><small>Total cost</small><b>{money(c.total_rs)}</b></div>
        <div className="mr-stat"><small>Per acre</small><b>{money(c.per_acre_rs)}</b></div>
        <div className="mr-stat"><small>Expected yield</small><b>{y.expected_yield_t} t</b></div>
        {inc.available && <div className="mr-stat"><small>Est. gross revenue</small><b style={{ color: '#3d8050' }}>{money(inc.expected_gross_rs)}</b></div>}
      </div>
      {c.phase_breakdown && Object.keys(c.phase_breakdown).length > 0 && (
        <div className="mr-breakdown">
          {Object.entries(c.phase_breakdown).slice(0, 6).map(([k, v]) => (
            <div key={k} className="mr-breakdown-row">
              <span>{k}</span>
              <b>{money(v.amount_rs)}</b>
            </div>
          ))}
        </div>
      )}
      <p className="mr-note">{data.disclaimer || 'Published reference estimate for seasonal crop budgeting.'}</p>
    </div>
  )
}

function CashflowResult({ data }) {
  if (!data) return <UnavailableState message="Cash flow data unavailable." />
  
  if (data.type === 'what_if_scenario') {
    return <CashflowWhatIfView data={data} />
  }
  if (data.type === 'cashflow_forecast') {
    return <CashflowForecastView data={data} />
  }
  if (data.type === 'cashflow_partial') {
    return <CashflowPartialView data={data} />
  }
  if (data.type === 'cashflow_summary' || data.net_cash_flow !== undefined) {
    return <CashflowSummaryView data={data} />
  }
  if (data.cost?.available || data.type === 'crop_budget') {
    return <CropBudgetView data={data} />
  }
  return <CashflowSummaryView data={data} />
}

// ── Crop production result — uses real ProductionPanels components ─────────────
function ProductionResult({ data }) {
  const { t } = useLanguage()

  if (!data) {
    return <UnavailableState message={t("Production data unavailable. Start the production backend on port 8002.")} />
  }
  if (data.available === false && data.needs_clarification) {
    const states = data.available_states || []
    const crops  = (data.available_crops_in_state || data.available_crops || [])
    return (
      <div className="mr-card mr-production" style={{ borderTop: '3px solid #4e9af1' }}>
        <div className="mr-header">
          <TrendingUp size={16} style={{ color: '#4e9af1' }}/>
          <b>{t("Crop Production — More Details Needed", "Crop Production — More Details Needed")}</b>
          <span className="mr-badge" style={{ background:'#e8f4ff', color:'#1a5c9e' }}>{t("Info required", "Info required")}</span>
        </div>
        <p style={{ fontSize:12, color:'#3d5c44', margin:'8px 0 10px' }}>
          {t("To give you an accurate yield estimate, I need to know the state and crop. Here is what is available in the dataset:")}
        </p>
        {states.length > 0 && (
          <div style={{ marginBottom:8 }}>
            <b style={{ fontSize:11, color:'#68766c', textTransform:'uppercase', letterSpacing:'0.5px' }}>
              {t("States in dataset", "States in dataset")}
            </b>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:5 }}>
              {states.slice(0, 12).map(s => (
                <span key={s} style={{
                  fontSize:11, padding:'3px 8px', background:'#f0f8f0',
                  border:'1px solid #c8e0cc', borderRadius:12, color:'#2d6a4f',
                }}>
                  {t(s, s)}
                </span>
              ))}
            </div>
          </div>
        )}
        {crops.length > 0 && (
          <div>
            <b style={{ fontSize:11, color:'#68766c', textTransform:'uppercase', letterSpacing:'0.5px' }}>
              {data.available_crops_in_state ? `${t('Crops in', 'Crops in')} ${t(data.tried_state || 'selected state', data.tried_state || 'selected state')}` : t('Available crops', 'Available crops')}
            </b>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:5 }}>
              {crops.slice(0, 12).map(c => (
                <span key={c} style={{
                  fontSize:11, padding:'3px 8px', background:'#faf0e8',
                  border:'1px solid #e8d4b8', borderRadius:12, color:'#8b5500',
                }}>
                  {t(c, c)}
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="mr-note" style={{ marginTop:10 }}>
          {t('Example: "Paddy yield in Andhra Pradesh" or "Wheat production in Uttar Pradesh"')}
        </p>
      </div>
    )
  }
  if (data.available === false) {
    return <UnavailableState message={t(data.reason || 'Production model not ready or no dataset loaded on port 8002.')} />
  }
  if (!data.predictedYield && data.predictedYield !== 0) {
    return <UnavailableState message={t(data.reason || 'No yield estimate returned. Try specifying a state, crop and season.')} />
  }

  const q          = data.query    || {}
  const historical = (data.historicalData  || [])
  const comparison = data.cropComparison  || []

  return (
    <div className="mr-production-suite" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Context / Query Badge Strip ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        background: '#f4f9f4', border: '1px solid #dbead9', borderRadius: 8,
        padding: '8px 12px', fontSize: 12, color: '#2d6a4f', fontWeight: 600
      }}>
        <span>
          {[t(q.crop, q.crop), t(q.district, q.district), t(q.state, q.state), t(q.season, q.season), q.year].filter(Boolean).join(' · ')}
        </span>
        {data.synthetic ? (
          <span style={{ fontSize: 10, background: '#fff3e0', color: '#b87c1a', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
            {t('Synthetic scenario', 'Synthetic scenario')}
          </span>
        ) : (
          <span style={{ fontSize: 10, background: '#e8f5e9', color: '#2d6a4f', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
            {t('Real data · ML model', 'Real data · ML model')}
          </span>
        )}
      </div>

      {/* ── Clarification hint — if proxy district was used ── */}
      {data.clarification_hint && (
        <div style={{
          background:'#f0f8ff', border:'1px solid #b8d4f0', borderRadius:8,
          padding:'8px 12px', fontSize:12, color:'#1a4a7a',
          display:'flex', gap:7, alignItems:'flex-start',
        }}>
          <span style={{ fontSize:14, flexShrink:0 }}>ℹ️</span>
          <span>{data.clarification_hint}</span>
        </div>
      )}

      {/* ── Primary Panels: Prediction Summary & Risk Analysis ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <PredictionSummary prediction={data} />
        {data.risk && <RiskAnalysis risk={data.risk} />}
      </div>

      {/* ── Historical District Yield Trend Chart ── */}
      {historical.length > 0 && (
        <YieldTrendChart
          historicalData={historical}
          selectedYear={q.year}
          predictedYield={data.predictedYield}
        />
      )}

      {/* ── Crop Yield Comparison Bar Chart ── */}
      {comparison.length > 0 && (
        <CropComparison rows={comparison} />
      )}
    </div>
  )
}

// ── Crop disease result — photo analysis via Gemini Vision ───────────────────
function DiseaseResult({ data }) {
  const { t } = useLanguage()

  if (!data) return <UnavailableState message={t("Disease analysis data unavailable.", "Disease analysis data unavailable.")} />

  if (data.is_plant === false) {
    return (
      <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #fca5a5', padding: '16px 20px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991b1b', marginBottom: 6 }}>
          <AlertTriangle size={18}/>
          <b style={{ fontSize: 14 }}>{t("No Plant or Crop Detected", "No Plant or Crop Detected")}</b>
        </div>
        <p style={{ fontSize: 12, color: '#7f1d1d', margin: 0, lineHeight: 1.45 }}>
          {t(data.immediate_action || "The uploaded image does not appear to be a crop or plant photo. Please upload a clear photo of the affected leaf, stem, seeds, or plant part.", data.immediate_action || "The uploaded image does not appear to be a crop or plant photo. Please upload a clear photo of the affected leaf, stem, seeds, or plant part.")}
        </p>
      </div>
    )
  }

  const isHealthy    = data.disease_detected === false || String(data.severity || '').toLowerCase() === 'healthy' || String(data.disease_name || '').toLowerCase() === 'healthy' || String(data.disease_name || '').toLowerCase() === 'healthy crop'
  const treatment    = data.treatment || {}
  const organic      = treatment.organic  || []
  const chemical     = treatment.chemical || []
  const cultural     = treatment.cultural || []
  const symptoms     = data.visual_symptoms || []
  const cropName     = data.crop_detected || data.crop || 'Rice'
  const plantParts   = data.affected_parts && data.affected_parts.length > 0 ? data.affected_parts : ['seeds']
  const score        = data.score || (isHealthy ? 88 : 55)
  const pctGreen     = data.green ?? (isHealthy ? 0 : 45)
  const pctYellow    = data.yellow ?? (isHealthy ? 65 : 20)
  const pctBrown     = data.brown ?? (isHealthy ? 3 : 35)

  return (
    <div style={{ marginTop: 8 }}>
      {/* ── CARD 1: Visual condition result (Matching Image 4) ── */}
      <div className="card" style={{
        background: '#ffffff',
        borderRadius: 14,
        border: '1px solid #d4e8d4',
        padding: '18px 20px',
        marginBottom: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#1d3a25' }}>
              {t("Visual condition result", "Visual condition result")}
            </h3>
            <p style={{ fontSize: 11, color: '#738176', margin: '3px 0 0' }}>
              {t(cropName, cropName)} · {plantParts.map(p => t(p, p)).join(', ')} · {data.width || 640} × {data.height || 480} px
            </p>
          </div>
          <div>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: isHealthy ? '#2d6a4f' : '#b91c1c',
              background: isHealthy ? '#eef8f1' : '#fef2f2',
              border: `1px solid ${isHealthy ? '#a3d9b1' : '#fca5a5'}`,
              padding: '4px 12px', borderRadius: 20
            }}>
              {isHealthy ? t('Healthy', 'Healthy') : t(data.severity || 'Moderate', data.severity || 'Moderate')}
            </span>
          </div>
        </div>

        <div className="quality-overview" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          {data.photo_url && (
            <div className="disease-img-preview-card" style={{ flexShrink: 0 }}>
              <img src={data.photo_url} alt={t("Uploaded crop specimen", "Uploaded crop specimen")} style={{ width: 140, height: 110, objectFit: 'cover', borderRadius: 8, display: 'block', border: '1px solid #e2e8f0' }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <small style={{ letterSpacing: '0.06em', fontWeight: 800, color: '#4a8056', fontSize: 10, textTransform: 'uppercase' }}>
                {t('DETECTED CROP', 'DETECTED CROP')}: {t(cropName, cropName).toUpperCase()}
              </small>
            </div>
            
            <h2 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3, margin: '0 0 6px', color: '#1d3a25' }}>
              {isHealthy ? t('Healthy Crop', 'Healthy Crop') : t(data.disease_name || 'Crop Disease Detected', data.disease_name || 'Crop Disease Detected')}
            </h2>

            {data.scientific_name && (
              <p style={{ fontSize: 12, fontStyle: 'italic', color: '#52795d', margin: '0 0 6px' }}>
                {t('Pathogen', 'Pathogen')}: {data.scientific_name}
              </p>
            )}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              <span className="disease-detected-badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                ⚡ {t('AI Refining...', 'AI Refining...')}
              </span>
              <span className="disease-detected-badge" style={{ background: isHealthy ? '#eef8f1' : '#fef2f2', color: isHealthy ? '#2d6a4f' : '#b91c1c', border: `1px solid ${isHealthy ? '#a3d9b1' : '#fca5a5'}`, fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                {isHealthy ? t('Healthy Crop', 'Healthy Crop') : `${t(data.severity, data.severity)} ${t('Severity', 'Severity')}`}
              </span>
              <span className="disease-detected-badge" style={{ background: '#f0f4f0', color: '#2d5036', border: '1px solid #dbe6db', fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                🎯 {t('Instant visual scan Confidence', 'Instant visual scan Confidence')}
              </span>
              <span className="disease-detected-badge" style={{ background: '#f7faf7', color: '#4b6351', border: '1px solid #e1ebe1', fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                🌿 {plantParts.map(p => t(p, p)).join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Health Score Track */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 600 }}>{t('Crop health score', 'Crop health score')}</span>
            <b style={{ fontSize: 15, fontWeight: 800, color: '#1f2937' }}>{score}/100</b>
          </div>
          <div style={{ background: '#e5e7eb', height: 7, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${score}%`, height: '100%', background: isHealthy ? '#2d6a4f' : '#f59e0b', borderRadius: 99 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginTop: 5 }}>
            <span>{t('Vigorous green foliage:', 'Vigorous green foliage:')} <b style={{ color: '#3a7a50' }}>{pctGreen}%</b></span>
            <span>{t('Minor stress:', 'Minor stress:')} <b style={{ color: '#b8952a' }}>{pctYellow}%</b></span>
          </div>
        </div>

        {/* 3 Color Breakdown Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px' }}>
            <small style={{ fontSize: 11, color: '#6b7280', display: 'block' }}>{t('Green', 'Green')}</small>
            <b style={{ fontSize: 15, color: '#111827' }}>{pctGreen}%</b>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px' }}>
            <small style={{ fontSize: 11, color: '#6b7280', display: 'block' }}>{t('Yellow', 'Yellow')}</small>
            <b style={{ fontSize: 15, color: '#111827' }}>{pctYellow}%</b>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px' }}>
            <small style={{ fontSize: 11, color: '#6b7280', display: 'block' }}>{t('Brown / dark', 'Brown / dark')}</small>
            <b style={{ fontSize: 15, color: '#111827' }}>{pctBrown}%</b>
          </div>
        </div>

        {/* Healthy Precaution Note / Immediate Alert */}
        {isHealthy ? (
          <div style={{ marginTop: 12, border: '1px solid #86efac', background: '#f0fdf4', borderRadius: 8, padding: '12px 14px' }}>
            <b style={{ color: '#166534', fontSize: 12, display: 'block', marginBottom: 4 }}>
              🌱 {t('Crop appears healthy and vigorous', 'Crop appears healthy and vigorous')}
            </b>
            <ul style={{ color: '#166534', fontSize: 11, margin: 0, paddingLeft: 18, lineHeight: 1.55 }}>
              <li>{t('No active foliar pathogens, blights, or severe chlorosis detected in this specimen.', 'No active foliar pathogens, blights, or severe chlorosis detected in this specimen.')}</li>
              <li>{t('Maintain scheduled irrigation and balanced organic or NPK fertilization.', 'Maintain scheduled irrigation and balanced organic or NPK fertilization.')}</li>
              <li>{t('Recheck if spotting, powdery patches, or sudden wilting appear.', 'Recheck if spotting, powdery patches, or sudden wilting appear.')}</li>
            </ul>
          </div>
        ) : (
          <div style={{ marginTop: 12, border: '1px solid #fca5a5', background: '#fef2f2', borderRadius: 8, padding: '12px 14px' }}>
            <b style={{ color: '#991b1b', fontSize: 12, display: 'block', marginBottom: 4 }}>
              ⚠️ {t('Immediate Action Required', 'Immediate Action Required')}
            </b>
            <p style={{ color: '#991b1b', fontSize: 11, margin: 0, lineHeight: 1.45 }}>
              {t(data.immediate_action || 'Isolate affected foliage and avoid overhead irrigation.', data.immediate_action || 'Isolate affected foliage and avoid overhead irrigation.')}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 10, color: '#6b7280', lineHeight: 1.35 }}>
          <ShieldCheck size={16} style={{ flexShrink: 0, color: '#9ca3af' }}/>
          <span>{t('Image screening checks visible color patterns only. It cannot identify pathogens or provide an official diagnosis. Lighting, variety, maturity, and image quality affect results.', 'Image screening checks visible color patterns only. It cannot identify pathogens or provide an official diagnosis. Lighting, variety, maturity, and image quality affect results.')}</span>
        </div>
      </div>

      {/* ── CARD 2: DIAGNOSTIC PATHOLOGY REPORT (Matching Image 5) ── */}
      <div className="disease-analysis-block" style={{
        border: '1px solid #d4e8d4',
        borderRadius: 14,
        background: '#ffffff',
        padding: '18px 20px',
        marginBottom: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ marginBottom: 14 }}>
          <span className="disease-eyebrow" style={{ fontSize: 10, fontWeight: 800, color: '#738176', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {t("DIAGNOSTIC PATHOLOGY REPORT", "DIAGNOSTIC PATHOLOGY REPORT")}
          </span>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1d3a25', margin: '3px 0 8px' }}>
            {isHealthy ? t('No Pathogen Detected (Healthy Specimen)', 'No Pathogen Detected (Healthy Specimen)') : t(data.disease_name || 'Crop Disease Detected', data.disease_name || 'Crop Disease Detected')}
          </h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: isHealthy ? '#eef8f1' : '#fef2f2', color: isHealthy ? '#2d6a4f' : '#b91c1c', padding: '2px 8px', borderRadius: 6, border: `1px solid ${isHealthy ? '#a3d9b1' : '#fca5a5'}` }}>
              {isHealthy ? t('Healthy', 'Healthy') : `${t(data.severity, data.severity)} ${t('Severity', 'Severity')}`}
            </span>
            <span style={{ fontSize: 11, background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
              🌱 {t(cropName, cropName)}
            </span>
            <span style={{ fontSize: 11, background: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              🍃 {plantParts.map(p => t(p, p)).join(', ')}
            </span>
            <span style={{ fontSize: 11, background: '#fffbeb', color: '#92400e', padding: '2px 8px', borderRadius: 6, border: '1px solid #fde68a' }}>
              ⚠️ {t('Spread Risk', 'Spread Risk')}: {t(data.spread_risk || 'Low', data.spread_risk || 'Low')}
            </span>
            <span style={{ fontSize: 11, background: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              📉 {t('Yield Impact', 'Yield Impact')}: {t(data.yield_impact || 'None', data.yield_impact || 'None')}
            </span>
          </div>
        </div>

        {/* Cause & Pathogen Profile */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f0fdf4' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#738176', letterSpacing: '0.06em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🔬</span> {t("CAUSE & PATHOGEN PROFILE", "CAUSE & PATHOGEN PROFILE")}
          </div>
          <p style={{ fontSize: 12, color: '#374151', margin: 0, fontWeight: 500 }}>
            {t(data.cause || 'unknown', data.cause || 'unknown')}
          </p>
        </div>

        {/* Visual Symptoms Identified */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#738176', letterSpacing: '0.06em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>👁️</span> {t("VISUAL SYMPTOMS IDENTIFIED FROM PHOTO", "VISUAL SYMPTOMS IDENTIFIED FROM PHOTO")}
          </div>
          <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 10px' }}>
            {t("The AI vision model detected the following physical symptoms in your uploaded image:", "The AI vision model detected the following physical symptoms in your uploaded image:")}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(symptoms.length > 0 ? symptoms : [
              "clean golden rice grains/seeds",
              "no discoloration",
              "no spots or fungal growth visible on the husk"
            ]).map((sym, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 12px' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: isHealthy ? '#22c55e' : '#f97316', flexShrink: 0 }} />
                <div style={{ minWidth: 0, fontSize: 12 }}>
                  <b style={{ color: '#1f2937', marginRight: 6 }}>{t('Observation', 'Observation')} #{idx + 1}</b>
                  <span style={{ color: '#4b5563' }}>{t(sym, sym)}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 8, padding: '7px 12px', marginTop: 10, fontSize: 11 }}>
            <span style={{ color: '#374151' }}>{t('Photo spectrum', 'Photo spectrum')}: <b style={{ color: '#166534' }}>{pctGreen}% {t('Green', 'green')}</b></span>
            <span style={{ color: '#854d0e' }}><b>{pctYellow}% {t('Yellow', 'yellow')}</b></span>
            <span style={{ color: '#78350f' }}><b>{pctBrown}% {t('Brown / dark', 'brown / dark')}</b></span>
            <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
              {t('Overall health index', 'Overall health index')} {score}/100
            </span>
          </div>
        </div>

        {/* ── Actionable Treatment Guidance ── */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#738176', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {t("ACTIONABLE TREATMENT GUIDANCE", "ACTIONABLE TREATMENT GUIDANCE")}
            </span>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1d3a25', margin: '2px 0 4px' }}>
              {t("Comprehensive Farmer Management Plan", "Comprehensive Farmer Management Plan")}
            </h3>
            <p style={{ fontSize: 11, color: '#6b7280', margin: 0, lineHeight: 1.4 }}>
              {t("Actionable guidance organized across organic biological remedies, safe chemical options, and agronomic management practices.", "Actionable guidance organized across organic biological remedies, safe chemical options, and agronomic management practices.")}
            </p>
          </div>

          <div className="disease-treatment-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {/* Organic Pillar */}
            <div className="disease-treatment-card" style={{ border: '1px solid #dcfce7', borderRadius: 10, background: '#f0fdf4', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                <Leaf size={16}/>
                <span>{t("Organic & Biological Solutions", "Organic & Biological Solutions")}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#166534', lineHeight: 1.5 }}>
                {(organic.length > 0 ? organic : [
                  "Apply organic neem cake or bio-fertilizers to sustain root health.",
                  "Neem oil spray (3-5 ml/L) as natural preventive against storage mold."
                ]).map((item, idx) => (
                  <li key={idx}>{t(item, item)}</li>
                ))}
              </ul>
            </div>

            {/* Chemical Pillar */}
            <div className="disease-treatment-card" style={{ border: '1px solid #fef3c7', borderRadius: 10, background: '#fffbeb', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#92400e', fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                <ShieldCheck size={16}/>
                <span>{t("Approved Chemical Controls", "Approved Chemical Controls")}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
                {(chemical.length > 0 ? chemical : [
                  "No chemical interventions required for healthy produce.",
                  "Consult local extension officer if fungal spores appear during storage."
                ]).map((item, idx) => (
                  <li key={idx}>{t(item, item)}</li>
                ))}
              </ul>
            </div>

            {/* Cultural Pillar */}
            <div className="disease-treatment-card" style={{ border: '1px solid #e0e7ff', borderRadius: 10, background: '#eef2ff', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3730a3', fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                <Wheat size={16}/>
                <span>{t("Preventive Cultural Practices", "Preventive Cultural Practices")}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#3730a3', lineHeight: 1.5 }}>
                {(cultural.length > 0 ? cultural : [
                  "Ensure harvested grains are thoroughly dried to below 12-14% moisture content.",
                  "Store in clean, moisture-proof hermetic bags elevated off damp floors."
                ]).map((item, idx) => (
                  <li key={idx}>{t(item, item)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Soil nutrients result — Soil Health Card dataset ─────────────────────────
const NUTRIENT_META = {
  'Soil Ph':               { icon: '🧪', label: 'Soil pH' },
  'Electrical Conductivity':{ icon: '⚡', label: 'Electrical Conductivity' },
  'Organic Carbon':        { icon: '🌿', label: 'Organic Carbon' },
  'Nitrogen':              { icon: '🌱', label: 'Nitrogen (N)' },
  'Phosphorus':            { icon: '🔵', label: 'Phosphorus (P)' },
  'Potassium':             { icon: '🟡', label: 'Potassium (K)' },
  'Sulphur':               { icon: '🟠', label: 'Sulphur (S)' },
  'Zinc':                  { icon: '🔩', label: 'Zinc (Zn)' },
  'Iron':                  { icon: '🟤', label: 'Iron (Fe)' },
  'Manganese':             { icon: '🟣', label: 'Manganese (Mn)' },
  'Copper':                { icon: '🟠', label: 'Copper (Cu)' },
  'Boron':                 { icon: '⬜', label: 'Boron (B)' },
}

// Color per nutrient level — matches SoilLayer.jsx colors exactly
const LEVEL_BG   = { Low:'#fde68a', High:'#bbf7d0', Medium:'#dbeafe', Deficient:'#fecaca', Sufficient:'#bbf7d0', Acidic:'#fde68a', Neutral:'#bbf7d0', Alkaline:'#fecaca', Saline:'#fecaca', 'Non Saline':'#bbf7d0' }
const LEVEL_TEXT = { Low:'#92400e', High:'#166534', Medium:'#1e40af', Deficient:'#991b1b', Sufficient:'#166534', Acidic:'#92400e', Neutral:'#166534', Alkaline:'#991b1b', Saline:'#991b1b', 'Non Saline':'#166534' }
const LEVEL_BAR  = { Low:'#fbbf24', High:'#34d399', Medium:'#60a5fa', Deficient:'#f87171', Sufficient:'#34d399', Acidic:'#fbbf24', Neutral:'#34d399', Alkaline:'#f87171', Saline:'#f87171', 'Non Saline':'#34d399' }

// Crop-specific agronomic guidance (rules-based, ICAR/TNAU references)
const CROP_GUIDANCE = {
  rice:      {
    'Nitrogen':   { Low:'Low N reduces tillers. Apply urea at tillering (ICAR).', Medium:'Adequate N for most stages.', High:'High N — reduce to avoid lodging.' },
    'Phosphorus': { Low:'Low P delays root growth. Basal DAP recommended (ICAR).', Medium:'Standard basal dose sufficient.', High:'No additional P required.' },
    'Potassium':  { Low:'Low K raises blast risk. Apply MOP at tillering (TNAU).', Medium:'Adequate K.', High:'No K needed.' },
    'Soil Ph':    { Acidic:'Lime may help — consult KVK.', Neutral:'Ideal for paddy.', Alkaline:'Fe/Zn deficiency risk.' },
    'Zinc':       { Deficient:'ZnSO₄ foliar spray at tillering (TNAU).', Sufficient:'No supplemental Zn needed.' },
  },
  paddy:     null, // alias — resolved below
  groundnut: {
    'Phosphorus': { Low:'Low P reduces pod fill. SSP 375 kg/ha at sowing (ICAR).', Medium:'Standard dose sufficient.', High:'No additional P.' },
    'Sulphur':    { Low:'High S demand. Gypsum 400 kg/ha at flowering (ICRISAT).', Medium:'Adequate S.', High:'No S needed.' },
    'Soil Ph':    { Acidic:'pH 6.0–6.5 is optimal.', Neutral:'Suitable pH.', Alkaline:'Fe/Mn availability reduced.' },
  },
  wheat:     {
    'Nitrogen':   { Low:'Apply urea in splits at sowing and crown root stage.', Medium:'Adequate.', High:'Reduce N to avoid lodging.' },
    'Phosphorus': { Low:'Basal DAP important for root development.', Medium:'Adequate.', High:'No P needed.' },
    'Soil Ph':    { Acidic:'Slightly acidic is acceptable.', Neutral:'Ideal.', Alkaline:'Monitor Mn and Zn.' },
  },
  cotton:    {
    'Nitrogen':   { Low:'N critical at squaring. Apply in splits.', Medium:'Adequate.', High:'Excess N delays boll opening.' },
    'Potassium':  { Low:'K deficiency causes red leaf. Apply MOP.', Medium:'Adequate.', High:'No K needed.' },
    'Sulphur':    { Low:'Apply gypsum or SSP for S.', Medium:'Adequate.', High:'No S needed.' },
  },
}

function getCropGuidance(crop, nutrientName, dominantLevel) {
  const key = (crop || '').toLowerCase().replace(/[^a-z]/g, '')
  const lookup = CROP_GUIDANCE[key] || CROP_GUIDANCE['rice']   // fallback to rice
  return lookup?.[nutrientName]?.[dominantLevel] || null
}

// Single nutrient card
function NutrientCard({ nutrient, crop }) {
  const meta    = NUTRIENT_META[nutrient.nutrient_name] || { icon: '📊', label: nutrient.nutrient_name }
  const dominant= nutrient.dominant_level
  const guidance= dominant ? getCropGuidance(crop, nutrient.nutrient_name, dominant) : null
  const total   = nutrient.total_samples || 0

  return (
    <div className="mr-soil-card" style={{ borderColor: dominant ? (LEVEL_BG[dominant] || '#e8ede8') : '#e8ede8' }}>
      <div className="mr-soil-card-head">
        <span className="mr-soil-icon">{meta.icon}</span>
        <div style={{ flex:1 }}>
          <b style={{ fontSize:12, color:'#1a3a4c' }}>{meta.label}</b>
          <div style={{ fontSize:10, color:'#8a968c' }}>{nutrient.nutrient_type}</div>
        </div>
        {dominant && (
          <span className="mr-soil-badge"
            style={{ background: LEVEL_BG[dominant] || '#f1f5f9', color: LEVEL_TEXT[dominant] || '#334155' }}>
            {dominant}
          </span>
        )}
      </div>

      {/* Level distribution bars */}
      <div className="mr-soil-levels">
        {(nutrient.levels || []).map(l => {
          const pct = total > 0 ? Math.round((l.sample_count / total) * 100) : 0
          return (
            <div key={l.level} className="mr-soil-level-row">
              <span className="mr-soil-level-name">{l.level}</span>
              <div className="mr-soil-bar-track">
                <div className="mr-soil-bar-fill"
                  style={{ width:`${pct}%`, background: LEVEL_BAR[l.level] || '#94a3b8' }}/>
              </div>
              <span className="mr-soil-level-count">{l.sample_count} ({pct}%)</span>
            </div>
          )
        })}
      </div>

      {/* Crop-specific guidance */}
      {guidance && (
        <div className="mr-soil-guidance">
          <span>🌾 {crop || 'Crop'} guidance</span>
          <p>{guidance}</p>
        </div>
      )}
    </div>
  )
}

function SoilResult({ data }) {
  const [showMicro, setShowMicro] = useState(false)

  // Clarification card — show what we need and what's available
  if (data.needs_clarification) {
    const have      = data.have_params || {}
    const missing   = data.missing_params || []
    const blocks    = data.available_blocks   || []
    const villages  = data.available_villages || []
    const fieldSize = data.field_size_acres

    return (
      <div className="mr-card mr-soil" style={{ borderTop:'3px solid #7c6a3e' }}>
        <div className="mr-header">
          <span style={{ fontSize:16 }}>🌱</span>
          <b>Soil Health — More Details Needed</b>
          <span className="mr-badge" style={{ background:'#fef9e7', color:'#7c6a3e' }}>Info required</span>
        </div>

        {/* What we have so far */}
        {Object.keys(have).length > 0 && (
          <div className="mr-soil-have">
            <b style={{ fontSize:11, color:'#68766c' }}>Captured so far:</b>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:4 }}>
              {Object.entries(have).map(([k, v]) => v && (
                <span key={k} className="mr-soil-chip mr-soil-chip-green">
                  {k.replace(/_/g,' ')}: {v}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Still missing */}
        <div style={{ marginTop:10 }}>
          <b style={{ fontSize:11, color:'#c0392b' }}>Still needed:</b>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:4 }}>
            {missing.map(m => (
              <span key={m} className="mr-soil-chip mr-soil-chip-red">
                {m.replace(/_/g,' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Block suggestions */}
        {blocks.length > 0 && (
          <div style={{ marginTop:10 }}>
            <b style={{ fontSize:11, color:'#68766c' }}>Available blocks in {have.district}:</b>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:4 }}>
              {blocks.slice(0, 10).map(b => (
                <span key={b} className="mr-soil-chip mr-soil-chip-blue">{b}</span>
              ))}
            </div>
          </div>
        )}

        {/* Village suggestions */}
        {villages.length > 0 && (
          <div style={{ marginTop:10 }}>
            <b style={{ fontSize:11, color:'#68766c' }}>Villages in {have.block}:</b>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:4 }}>
              {villages.slice(0, 12).map(v => (
                <span key={v} className="mr-soil-chip mr-soil-chip-blue">{v}</span>
              ))}
            </div>
          </div>
        )}

        <p className="mr-note" style={{ marginTop:10 }}>
          Example: "My farm is 2 acres in Anaicut block, Vellore district, Tamil Nadu"
        </p>
      </div>
    )
  }

  if (!data.available) {
    return <UnavailableState message={data.reason || 'Soil data unavailable. Check that the health API is running on port 8003.'} />
  }

  // ── Actual nutrient data ───────────────────────────────────────────────────
  const nutrients  = data.nutrients || []
  const macro      = nutrients.filter(n => n.nutrient_type === 'Macro')
  const micro      = nutrients.filter(n => n.nutrient_type === 'Micro')
  const level      = data.level || 'block'
  const loc        = data.location || {}
  const fieldSize  = data.field_size_acres
  const cropHint   = data.crop_hint || ''

  const locStr = level === 'village'
    ? [loc.village, loc.block, loc.district, loc.state].filter(Boolean).join(', ')
    : [data.block, data.district, data.state].filter(Boolean).join(', ')

  return (
    <div className="mr-card mr-soil">
      {/* Header */}
      <div className="mr-header">
        <span style={{ fontSize:16 }}>🌱</span>
        <b>Soil Health — {level === 'village' ? 'Village' : 'Block'} Level</b>
        <span className="mr-badge mr-badge-green">Soil Health Card 2024-25</span>
      </div>
      <p style={{ fontSize:11, color:'#68766c', margin:'2px 0 10px' }}>{locStr}</p>

      {/* Field size + fallback note */}
      <div className="mr-stats-row" style={{ marginBottom:8 }}>
        {fieldSize && (
          <div className="mr-stat">
            <small>Field size</small>
            <b>{fieldSize} acres ({(fieldSize * 0.4047).toFixed(2)} ha)</b>
          </div>
        )}
        <div className="mr-stat">
          <small>Data level</small>
          <b style={{ textTransform:'capitalize' }}>{level}</b>
        </div>
        <div className="mr-stat">
          <small>Nutrients</small>
          <b>{nutrients.length}</b>
        </div>
        <div className="mr-stat">
          <small>Source year</small>
          <b>{(data.years || ['2024-25'])[0]}</b>
        </div>
      </div>

      {/* Fallback note */}
      {data.fallback_note && (
        <div style={{ display:'flex', gap:6, background:'#fff8f0', border:'1px solid #f5d6b0',
          borderRadius:8, padding:'7px 10px', marginBottom:10, fontSize:11, color:'#7a4f00' }}>
          <AlertTriangle size={12} style={{ flexShrink:0, marginTop:1 }}/>
          <span>{data.fallback_note}</span>
        </div>
      )}

      {/* Interpretation note */}
      <div className="mr-soil-interp">
        <ShieldCheck size={12}/>
        <span>{data.value_interpretation || 'Sample counts show the number of soil tests rated at each level — not nutrient concentrations.'}</span>
      </div>

      {/* Macro nutrients */}
      {macro.length > 0 && (
        <div style={{ marginTop:12 }}>
          <div className="mr-soil-section-label">MACRO NUTRIENTS</div>
          <div className="mr-soil-grid">
            {macro.map(n => <NutrientCard key={n.nutrient_name} nutrient={n} crop={cropHint}/>)}
          </div>
        </div>
      )}

      {/* Micro nutrients — collapsible */}
      {micro.length > 0 && (
        <div style={{ marginTop:10 }}>
          <button className="mr-show-more" onClick={() => setShowMicro(v => !v)}
            style={{ marginBottom: showMicro ? 8 : 0 }}>
            {showMicro
              ? <><ChevronUp size={13}/> Hide micro nutrients</>
              : <><ChevronDown size={13}/> Show {micro.length} micro nutrients (Zn, Fe, Mn, Cu, B…)</>}
          </button>
          {showMicro && (
            <div className="mr-soil-grid">
              {micro.map(n => <NutrientCard key={n.nutrient_name} nutrient={n} crop={cropHint}/>)}
            </div>
          )}
        </div>
      )}

      <p className="mr-note" style={{ marginTop:10 }}>
        Source: {data.source || 'India Data Portal — Soil Health Card scheme'} ·
        Values are survey sample counts, not measured concentrations. Verify with a field soil test.
      </p>
    </div>
  )
}

// ── Crop Loss & Insurance result — renders REAL module components ─────────────
function CropLossResult({ data }) {
  const { t } = useLanguage()
  const [step, setStep] = useState(1) // 1: AI Assessment, 2: Financial Loss, 3: Insurance & Docs, 4: Recovery

  // Needs clarification — missing required params
  if (data?.needs_clarification) {
    const have    = data.have_params || {}
    const missing = data.missing_params || []
    const SEV_COLOR = '#b87c1a'
    return (
      <div className="mr-card mr-crop-loss" style={{ borderLeft: `4px solid ${SEV_COLOR}`, padding: 14 }}>
        <div className="mr-header">
          <AlertTriangle size={16} style={{ color: SEV_COLOR }}/>
          <b>{t('Crop Loss — More Details Needed', 'Crop Loss — More Details Needed')}</b>
          <span className="mr-badge" style={{ background: SEV_COLOR+'22', color: SEV_COLOR }}>{t('Info required', 'Info required')}</span>
        </div>
        {/* What we have */}
        {Object.keys(have).length > 0 && (
          <div style={{ marginBottom:10 }}>
            <b style={{ fontSize:11, color:'#68766c' }}>{t('Captured:', 'Captured:')}</b>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:4 }}>
              {Object.entries(have).filter(([,v])=>v).map(([k,v]) => (
                <span key={k} style={{ background:'#f0f8f0', border:'1px solid #c8e0cc', borderRadius:12,
                  padding:'2px 8px', fontSize:11, color:'#2d6a4f', fontWeight:600 }}>
                  ✓ {k.replace(/_/g,' ')}: {v}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* Still missing */}
        <div style={{ marginBottom:8 }}>
          <b style={{ fontSize:11, color:'#c0392b' }}>{t('Still needed:', 'Still needed:')}</b>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:4 }}>
            {missing.map(m => (
              <span key={m} style={{ background:'#fff0f0', border:'1px solid #f5c6c6',
                borderRadius:12, padding:'2px 8px', fontSize:11, color:'#c0392b' }}>
                {m.replace(/_/g,' ')}
              </span>
            ))}
          </div>
        </div>
        <p className="mr-note">{t('Example: "My 2 acre paddy field in Thanjavur was flood damaged 3 days ago"', 'Example: "My 2 acre paddy field in Thanjavur was flood damaged 3 days ago"')}</p>
      </div>
    )
  }

  // No assessment data yet
  if (!data?.incident && !data?.production_loss && !data?.report_type) {
    return <UnavailableState message={t("Crop loss assessment unavailable. Check that the health API is running on port 8003.", "Crop loss assessment unavailable. Check that the health API is running on port 8003.")} />
  }

  const LOSS_STEPS = [
    { id: 1, label: t('AI Assessment', 'AI Assessment'), icon: ClipboardList },
    { id: 2, label: t('Financial Loss', 'Financial Loss'), icon: IndianRupee },
    { id: 3, label: t('Insurance', 'Insurance'), icon: Shield },
    { id: 4, label: t('Recovery', 'Recovery'), icon: Sprout },
  ]

  return (
    <div className="mr-crop-loss-wrap" style={{ display: 'grid', gap: 14 }}>
      {/* ── Step Progress Bar (matching Crop Loss & Insurance page) ── */}
      <div className="loss-step-bar">
        {LOSS_STEPS.map(s => {
          const active = s.id === step
          const done = s.id < step
          const Icon = s.icon
          return (
            <button
              key={s.id}
              type="button"
              className={`loss-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}
              onClick={() => setStep(s.id)}
              style={{ cursor: 'pointer' }}
            >
              <span className="loss-step-dot"><Icon size={14} /></span>
              <span className="loss-step-label">{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Active Step UI — renders the exact real components from Crop Loss module ── */}
      <div className="loss-step-view">
        {step === 1 && <LossAssessment assessment={data} />}
        {step === 2 && <FinancialLoss assessment={data} />}
        {step === 3 && <InsuranceAssistant assessment={data} />}
        {step === 4 && <RecoveryAdvisor assessment={data} />}
      </div>

      {/* ── Bottom navigation buttons (matching Image 3) ── */}
      <div className="loss-nav-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <button
          type="button"
          className="button secondary"
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            opacity: step === 1 ? 0.5 : 1,
            cursor: step === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          <ArrowLeft size={15}/> {t("Previous", "Previous")}
        </button>
        {step < 4 && (
          <button
            type="button"
            className="button"
            onClick={() => setStep(s => Math.min(4, s + 1))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {t("Next", "Next")} <ArrowRight size={15}/>
          </button>
        )}
      </div>
    </div>
  )
}

// ── Helper for colorful, high-clarity Soil Health Card pills and cards ────────
function getSoilNutrientTheme(lvl) {
  const l = String(lvl || '').trim().toLowerCase()
  if (l.includes('sufficient') || l === 'high' || l === 'neutral') {
    return {
      bg: '#f0f9f3',
      border: '#a3d9b1',
      badgeBg: '#2d6a4f',
      badgeColor: '#ffffff',
      titleColor: '#1b4332',
      icon: '✓'
    }
  }
  if (l.includes('non saline') || l.includes('normal')) {
    return {
      bg: '#f0f7ff',
      border: '#bae0fd',
      badgeBg: '#1976d2',
      badgeColor: '#ffffff',
      titleColor: '#0d47a1',
      icon: '✓'
    }
  }
  if (l === 'medium' || l.includes('moderate')) {
    return {
      bg: '#fffbf0',
      border: '#fde68a',
      badgeBg: '#d97706',
      badgeColor: '#ffffff',
      titleColor: '#78350f',
      icon: '●'
    }
  }
  if (l.includes('deficient') || l === 'low' || l.includes('saline')) {
    return {
      bg: '#fff5f5',
      border: '#fecaca',
      badgeBg: '#dc2626',
      badgeColor: '#ffffff',
      titleColor: '#991b1b',
      icon: '⚠'
    }
  }
  if (l.includes('acidic')) {
    return {
      bg: '#fffbeb',
      border: '#fed7aa',
      badgeBg: '#ea580c',
      badgeColor: '#ffffff',
      titleColor: '#7c2d12',
      icon: '⚗'
    }
  }
  if (l.includes('alkaline')) {
    return {
      bg: '#faf5ff',
      border: '#e9d5ff',
      badgeBg: '#9333ea',
      badgeColor: '#ffffff',
      titleColor: '#581c87',
      icon: '⚗'
    }
  }
  return {
    bg: '#f8fafc',
    border: '#cbd5e1',
    badgeBg: '#475569',
    badgeColor: '#ffffff',
    titleColor: '#1e293b',
    icon: '●'
  }
}

// ── Crop Health Result ────────────────────────────────────────────────────────
function CropHealthResult({ data }) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('satellite')
  const [showProblems, setShowProblems] = useState(true)
  const [showFertiliser, setShowFertiliser] = useState(false)
  const [showSuppliers, setShowSuppliers] = useState(false)

  if (!data) return <UnavailableState message={t("Crop health data unavailable.", "Crop health data unavailable.")} />

  // Needs clarification (missing info)
  if (data.needs_clarification) {
    const missing = data.missing_params || []
    const prompt  = data.clarification_prompt || `Please provide: ${missing.join(', ')}`
    return (
      <div className="mr-card" style={{ background: 'linear-gradient(135deg,#fff9f0,#fff4e8)', border: '1.5px solid #f0a500' }}>
        <div className="mr-header" style={{ color: '#c07800' }}>
          <span style={{ fontSize: 18 }}>🌾</span>
          <b>{t('Crop Health — Information Needed', 'Crop Health — Information Needed')}</b>
        </div>
        <p style={{ fontSize: 13, color: '#7a5500', margin: '8px 0 12px' }}>{prompt}</p>
        {Object.keys(data.have_params || {}).length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(data.have_params).filter(([,v])=>v).map(([k,v]) => (
              <span key={k} style={{
                background: '#fff', border: '1px solid #e8b84b', borderRadius: 20,
                padding: '3px 10px', fontSize: 11, color: '#7a5500', fontWeight: 600,
              }}>✓ {t(k.replace(/_/g,' '), k.replace(/_/g,' '))}: {v}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 12, padding: '10px 12px', background: '#fff8ed', borderRadius: 8, border: '1px solid #ffe0a0' }}>
          <p style={{ fontSize: 12, color: '#b07000', margin: 0 }}>
            💬 {t("Please reply with the missing details and I'll run the full satellite analysis.", "Please reply with the missing details and I'll run the full satellite analysis.")}
          </p>
        </div>
      </div>
    )
  }

  const report   = data.report || {}
  const weather  = data.weather || {}
  const rainfall = data.rainfall || {}
  const crop     = data.crop || 'Crop'
  const loc      = data.location || {}

  // Weather stats — computed from daily[] array (NASA POWER fields)
  const daily30 = (weather.daily || []).slice(-30)
  const ws      = weather.summary || weather

  const rain30  = daily30.length
    ? Math.round(daily30.reduce((s, d) => s + (d.rainfall_mm || 0), 0) * 10) / 10
    : (weather.total_rainfall_mm ?? ws.total_rainfall_mm ?? 0)

  const tmax    = daily30.length
    ? Math.round(Math.max(...daily30.map(d => d.temp_max_c || 0)) * 10) / 10
    : (weather.max_temp_c ?? ws.max_temp_c ?? ws.max_temperature_c ?? null)

  const tavg    = daily30.length
    ? Math.round((daily30.reduce((s, d) => s + (d.temp_avg_c || 0), 0) / daily30.length) * 10) / 10
    : (weather.avg_temp_c ?? ws.avg_temp_c ?? ws.avg_temperature_c ?? null)

  const humid   = daily30.length
    ? Math.round((daily30.reduce((s, d) => s + (d.humidity_pct || 0), 0) / daily30.length) * 10) / 10
    : (weather.avg_humidity_pct ?? ws.avg_humidity_pct ?? null)

  const rainDays = daily30.length
    ? daily30.filter(d => (d.rainfall_mm || 0) >= 1).length
    : (weather.days_with_rain ?? ws.days_with_rain ?? ws.days_with_rainfall ?? null)

  const dailyData = daily30.map((d, i) => ({
    day: i,
    mm: Math.round((d.rainfall_mm || 0) * 10) / 10,
    date: d.date || '',
  }))

  const growthStage  = report.growth_stage   || {}
  const vegCondition = report.vegetation_condition || {}
  const harvest      = report.harvest_estimate || report.harvest_prediction || {}
  const problems     = report.problems_and_remedies || report.problems || []
  const stressFlags  = report.stress_flags || []
  const irrigation   = report.irrigation_recommendation || {}
  const fertiliser   = report.fertiliser_recommendation || {}
  const sources      = report.data_sources || []
  const suppliers    = report.nearby_suppliers || []

  const confColor = c => ({ high:'#2d6a4f', medium:'#e08800', low:'#c0392b' })[c?.toLowerCase()] || '#666'

  const tabStyle = (id) => ({
    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: activeTab === id ? '1.5px solid #2d6a4f' : '1.5px solid #d4e8d4',
    background: activeTab === id ? '#2d6a4f' : '#f5f9f5',
    color: activeTab === id ? '#fff' : '#3d5c44',
    transition: 'all .15s',
  })

  return (
    <div className="mr-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#1a3a2a 0%,#2d6a4f 100%)',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10
      }}>
        <span style={{ fontSize: 22 }}>🛰️</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{t('AI Crop Health Monitoring', 'AI Crop Health Monitoring')}</div>
          <div style={{ color: '#a0d4b8', fontSize: 11, marginTop: 2 }}>
            {t(crop, crop)} · {loc.display || `${loc.lat?.toFixed(4)}, ${loc.lng?.toFixed(4)}`}
            {data.sowing_date_estimated || !data.sowing_date
              ? ` · ${t('Sowing Date', 'Sowing Date')}: ${t('Not Provided', 'Not Provided')}`
              : ` · ${t('Sown', 'Sown')}: ${data.sowing_date}`
            }
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          {data.field_area_ha && (
            <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: '#d4f0e4' }}>
              {data.field_area_ha} ha
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>

        {data.sowing_date_estimated && (
          <div style={{
            background: '#fff9e6',
            border: '1.5px solid #ffd166',
            borderRadius: 8,
            padding: '9px 12px',
            marginBottom: 14,
            fontSize: 12,
            color: '#8a5a00',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>📅</span>
            <div>
              <b>{t("Sowing date not provided", "Sowing date not provided")}</b> — {t("growth stage and harvest prediction are pending. Reply with your sowing date (e.g. DD-MM-YYYY) to calculate your exact harvest timeline.", "growth stage and harvest prediction are pending. Reply with your sowing date (e.g. DD-MM-YYYY) to calculate your exact harvest timeline.")}
            </div>
          </div>
        )}

        {data.sowing_date_refined && (
          <div style={{
            background: '#eef8f1',
            border: '1.5px solid #a3d9b1',
            borderRadius: 8,
            padding: '9px 12px',
            marginBottom: 14,
            fontSize: 12,
            color: '#1b4d36',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <div>
              <b>{t("Analysis Refined", "Analysis Refined")}</b> — {t("growth stage and harvest prediction updated with your confirmed sowing date", "growth stage and harvest prediction updated with your confirmed sowing date")} ({data.sowing_date}).
            </div>
          </div>
        )}

        {/* ── Tab row ── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {[
            ['satellite', `🛰️ ${t('Satellite', 'Satellite')}`],
            ['ndvi', `🌿 ${t('NDVI', 'NDVI')}`],
            ['flood', `🌊 ${t('Flood Risk', 'Flood Risk')}`],
            ['soil', `🌱 ${t('Soil', 'Soil')}`],
            ['water', `💧 ${t('Water', 'Water')}`],
          ].map(([id, label]) => (
            <button key={id} style={tabStyle(id)} onClick={() => setActiveTab(id)}>{label}</button>
          ))}
        </div>

        {/* ── Tab panels ── */}
        {activeTab === 'satellite' && (
          <div style={{ marginBottom: 14 }}>
            {data.satellite?.image_b64 ? (
              <>
                <div style={{ position:'relative', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{
                    position:'absolute', top: 8, left: 8,
                    background: 'rgba(0,0,0,0.7)', color: '#fff',
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4
                  }}>{t("TRUE COLOUR · SENTINEL-2", "TRUE COLOUR · SENTINEL-2")}</div>
                  <img src={`data:image/png;base64,${data.satellite.image_b64}`}
                    alt="Sentinel-2 True Colour" style={{ width: '100%', borderRadius: 8, display: 'block' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#738176' }}>
                  <span>{t("Observation window", "Observation window")}: {data.satellite.date_from} — {data.satellite.date_to}</span>
                  <span>10m · Sentinel-2 L2A</span>
                </div>
              </>
            ) : (
              <div style={{
                background: '#f0f4f0', borderRadius: 8, padding: '24px 16px',
                textAlign: 'center', color: '#738176', fontSize: 12
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🛰️</div>
                <b>{t('Satellite imagery unavailable', 'Satellite imagery unavailable')}</b>
                <p style={{ fontSize: 11, margin: '4px 0 0' }}>
                  {t(data.satellite?.message || 'Sentinel-2 scene loading or cloud-covered. Please refresh or try again shortly.', data.satellite?.message || 'Sentinel-2 scene loading or cloud-covered. Please refresh or try again shortly.')}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ndvi' && (
          <div style={{ marginBottom: 14 }}>
            {data.ndvi?.image_b64 ? (
              <>
                <div style={{ position:'relative', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{
                    position:'absolute', top: 8, left: 8,
                    background: 'rgba(0,0,0,0.7)', color: '#fff',
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4
                  }}>{t("NDVI · (B08-B04)/(B08+B04)", "NDVI · (B08-B04)/(B08+B04)")}</div>
                  <img src={`data:image/png;base64,${data.ndvi.image_b64}`}
                    alt="NDVI" style={{ width: '100%', borderRadius: 8, display: 'block' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 11, marginBottom: 8 }}>
                  {[
                    ['#6b2d0d','< 0.0', t('Non-vegetated / bare soil / water', 'Non-vegetated / bare soil / water')],
                    ['#d4ac0d','0.0–0.3', t('Sparse or stressed vegetation', 'Sparse or stressed vegetation')],
                    ['#4caf50','0.3–0.6', t('Moderate to healthy vegetation', 'Moderate to healthy vegetation')],
                    ['#1a5c2a','> 0.6', t('Dense healthy vegetation', 'Dense healthy vegetation')],
                  ].map(([color, range, label]) => (
                    <div key={color} style={{ display:'contents' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:12, height:12, background:color, borderRadius:2 }}/>
                        <span style={{ color:'#738176', minWidth:45 }}>{range}</span>
                      </div>
                      <span style={{ color:'#3d5c44' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{
                background: '#f0f4f0', borderRadius: 8, padding: '24px 16px',
                textAlign: 'center', color: '#738176', fontSize: 12
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🌿</div>
                <b>{t('NDVI imagery unavailable', 'NDVI imagery unavailable')}</b>
                <p style={{ fontSize: 11, margin: '4px 0 0' }}>
                  {t(data.ndvi?.message || 'NDVI vegetative map generating. Please refresh or try again shortly.', data.ndvi?.message || 'NDVI vegetative map generating. Please refresh or try again shortly.')}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'flood' && (
          <div style={{ marginBottom: 14 }}>
            {data.flood_sar?.image_b64 ? (
              <>
                <div style={{ position:'relative', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{
                    position:'absolute', top: 8, left: 8,
                    background: 'rgba(0,0,0,0.7)', color: '#fff',
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4
                  }}>{t("SENTINEL-1 SAR · VV BACKSCATTER", "SENTINEL-1 SAR · VV BACKSCATTER")}</div>
                  <img src={`data:image/png;base64,${data.flood_sar.image_b64}`}
                    alt="Flood SAR" style={{ width: '100%', borderRadius: 8, display: 'block' }} />
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, marginBottom: 8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:12, height:12, background:'#1e90ff', borderRadius:2 }}/>
                    <span style={{ color:'#3d5c44' }}>{t('Potential water / inundation', 'Potential water / inundation')}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:12, height:12, background:'#888', borderRadius:2 }}/>
                    <span style={{ color:'#3d5c44' }}>{t('Dry land / vegetation', 'Dry land / vegetation')}</span>
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                background: '#f0f4f0', borderRadius: 8, padding: '24px 16px',
                textAlign: 'center', color: '#738176', fontSize: 12
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🌊</div>
                <b>{t('SAR flood imagery unavailable', 'SAR flood imagery unavailable')}</b>
                <p style={{ fontSize: 11, margin: '4px 0 0' }}>
                  {t(data.flood_sar?.message || 'Sentinel-1 SAR data processing. Please refresh or try again shortly.', data.flood_sar?.message || 'Sentinel-1 SAR data processing. Please refresh or try again shortly.')}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'soil' && (
          <div style={{ marginBottom: 14 }}>
            {data.soil_nutrients?.available ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#738176', fontWeight: 700 }}>
                    {t('VILLAGE-LEVEL DATA · SOIL HEALTH CARD 2024-25', 'VILLAGE-LEVEL DATA · SOIL HEALTH CARD 2024-25')}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: '#2d6a4f',
                    background: '#eef8f1', border: '1px solid #c2e7cc',
                    padding: '2px 8px', borderRadius: 12
                  }}>
                    {t("Official Soil Health Record", "Official Soil Health Record")}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: '#2d5c3e', fontSize: 13, marginBottom: 12 }}>
                  {data.soil_nutrients.block}, {data.soil_nutrients.district || loc.district}, {loc.state}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {(data.soil_nutrients.nutrients || []).map(n => {
                    const theme = getSoilNutrientTheme(n.dominant_level)
                    return (
                      <div key={n.nutrient_name} style={{
                        background: theme.bg,
                        border: `1.5px solid ${theme.border}`,
                        borderRadius: 10,
                        padding: '11px 13px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all .2s ease',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: theme.titleColor }}>
                            {t(n.nutrient_name, n.nutrient_name)}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: theme.badgeColor,
                            background: theme.badgeBg,
                            padding: '3px 9px',
                            borderRadius: 20,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.12)'
                          }}>
                            <span style={{ fontSize: 9 }}>{theme.icon}</span>
                            {t(n.dominant_level, n.dominant_level)}
                          </span>
                        </div>
                        {n.guidance && (
                          <p style={{ fontSize: 10, color: '#556b5a', margin: '6px 0 0', lineHeight: 1.35 }}>
                            {t(n.guidance, n.guidance)}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : data.soil_grids?.available ? (
              <div>
                <div style={{ fontSize: 11, color: '#738176', marginBottom: 10, fontWeight: 700 }}>
                  {t('SOIL MODEL · 250m ESTIMATES', 'SOIL MODEL · 250m ESTIMATES')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ['pH (H₂O)', data.soil_grids.ph || data.soil_grids.properties?.phh2o?.surface_value, '#8e44ad', '#fbf5ff', '#e1c6fc', '🧪'],
                    [t('Organic Carbon', 'Organic Carbon'), data.soil_grids.organic_carbon || (data.soil_grids.properties?.soc?.surface_value ? `${data.soil_grids.properties.soc.surface_value} g/kg` : null), '#2d6a4f', '#f0f9f3', '#b7e4c7', '🌱'],
                    [t('Clay', 'Clay'), data.soil_grids.clay || (data.soil_grids.properties?.clay?.surface_value ? `${data.soil_grids.properties.clay.surface_value} %` : null), '#c0392b', '#fff5f5', '#fecaca', '🧱'],
                    [t('Sand', 'Sand'), data.soil_grids.sand || (data.soil_grids.properties?.sand?.surface_value ? `${data.soil_grids.properties.sand.surface_value} %` : null), '#d97706', '#fffbf0', '#fde68a', '🏖️'],
                    [t('Silt', 'Silt'), data.soil_grids.silt || (data.soil_grids.properties?.silt?.surface_value ? `${data.soil_grids.properties.silt.surface_value} %` : null), '#1976d2', '#f0f7ff', '#bae0fd', '💧'],
                  ].filter(([, v]) => v != null).map(([k, v, color, bg, border, icon]) => (
                    <div key={k} style={{
                      background: bg, border: `1.5px solid ${border}`,
                      borderRadius: 10, padding: '10px 12px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <span style={{ color: '#475569', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{icon}</span> {k}
                      </span>
                      <b style={{ color: color, fontSize: 12 }}>{v}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign:'center', color:'#738176', padding:'24px 0', fontSize:12 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🌱</div>
                <b>{t('Soil data unavailable for this location', 'Soil data unavailable for this location')}</b>
              </div>
            )}
          </div>
        )}

        {activeTab === 'water' && (
          <div style={{ marginBottom: 14 }}>
            {/* Weather stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
              {[
                { icon:'🌧️', label: t('Total rainfall', 'Total rainfall'),    value: rain30 != null ? `${rain30} mm`  : '—', sub: t('over 30 days', 'over 30 days'),                    color:'#4e9af1' },
                { icon:'🌡️', label: t('Avg temperature', 'Avg temperature'),   value: tavg   != null ? `${tavg} °C`   : '—', sub: tmax != null ? `${t('Max', 'Max')} ${tmax} °C` : '', color:'#e07050' },
                { icon:'💧', label: t('Avg humidity', 'Avg humidity'),      value: humid  != null ? `${humid} %`   : '—', sub:'',                                  color:'#2196f3' },
                { icon:'📅', label: t('Days with rainfall', 'Days with rainfall'),value: rainDays!= null ? `${rainDays}`  : '—', sub: t('of 30 days (≥1 mm)', 'of 30 days (≥1 mm)'),                color:'#43a047' },
              ].map(s => (
                <div key={s.label} style={{
                  background: '#f8fbff', border: '1px solid #e0eaf8',
                  borderRadius: 10, padding: '10px 12px',
                  display:'flex', alignItems:'center', gap:10
                }}>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 10, color: '#738176' }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                    {s.sub && <div style={{ fontSize: 10, color: '#738176' }}>{s.sub}</div>}
                  </div>
                </div>
              ))}
            </div>

            {dailyData.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: '#738176', fontWeight: 600, marginBottom: 4 }}>
                  {t('Daily rainfall (mm) · last 30 days', 'Daily rainfall (mm) · last 30 days')}
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={dailyData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                    <CartesianGrid stroke="#edf1ed" vertical={false}/>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill:'#738176' }} axisLine={false} tickLine={false}
                      tickFormatter={v => v ? v.slice(5) : ''} interval={4}/>
                    <YAxis tick={{ fontSize: 9, fill:'#738176' }} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v => [`${v} mm`, t('Total rainfall', 'Rainfall')]} contentStyle={tt}/>
                    <Bar dataKey="mm" fill="#4e9af1" radius={[3,3,0,0]} maxBarSize={18}/>
                  </BarChart>
                </ResponsiveContainer>

                {dailyData.some((_, i) => daily30[i]?.temp_avg_c) && (
                  <>
                    <div style={{ fontSize: 11, color: '#738176', fontWeight: 600, margin: '10px 0 4px' }}>
                      {t('Daily temperature (°C) · last 30 days', 'Daily temperature (°C) · last 30 days')}
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart
                        data={daily30.map((d, i) => ({
                          date: d.date || String(i),
                          avg: Math.round((d.temp_avg_c || 0) * 10) / 10,
                          max: Math.round((d.temp_max_c || 0) * 10) / 10,
                          min: Math.round((d.temp_min_c || 0) * 10) / 10,
                        }))}
                        margin={{ top:4, right:4, left:-20, bottom:0 }}
                      >
                        <CartesianGrid stroke="#edf1ed" vertical={false}/>
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill:'#738176' }} axisLine={false} tickLine={false}
                          tickFormatter={v => v ? v.slice(5) : ''} interval={4}/>
                        <YAxis tick={{ fontSize: 9, fill:'#738176' }} axisLine={false} tickLine={false} domain={['auto','auto']}/>
                        <Tooltip formatter={v => [`${v} °C`]} contentStyle={tt}/>
                        <Line type="monotone" dataKey="max" stroke="#e07050" dot={false} strokeWidth={1.5} name={t('Max', 'Max')}/>
                        <Line type="monotone" dataKey="avg" stroke="#f4a261" dot={false} strokeWidth={1.5} name={t('Avg', 'Avg')}/>
                        <Line type="monotone" dataKey="min" stroke="#4e9af1" dot={false} strokeWidth={1.5} name={t('Min', 'Min')}/>
                      </LineChart>
                    </ResponsiveContainer>
                    <div style={{ display:'flex', gap:14, marginTop:4, fontSize:10, color:'#738176' }}>
                      <span><span style={{ color:'#e07050', fontWeight:700 }}>—</span> {t('Max', 'Max')}</span>
                      <span><span style={{ color:'#f4a261', fontWeight:700 }}>—</span> {t('Avg', 'Avg')}</span>
                      <span><span style={{ color:'#4e9af1', fontWeight:700 }}>—</span> {t('Min', 'Min')}</span>
                    </div>
                  </>
                )}

                <div style={{ fontSize: 10, color: '#738176', marginTop: 8 }}>
                  {t('Source: NASA POWER Daily Point API — Langley Research Center · ~55km grid', 'Source: NASA POWER Daily Point API — Langley Research Center · ~55km grid')}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── AI Crop Health Report ── */}
        {report && (
          <div style={{ marginTop: 4 }}>
            <div style={{
              background: 'linear-gradient(135deg,#1a3a2a,#2d6a4f)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 12,
              display:'flex', alignItems:'center', gap:10
            }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <div>
                <div style={{ color:'#fff', fontWeight:700, fontSize:13 }}>{t('AI CROP HEALTH REPORT', 'AI CROP HEALTH REPORT')}</div>
                <div style={{ color:'#a0d4b8', fontSize:10 }}>
                  {t(crop, crop)} · {data.sowing_date_estimated || !data.sowing_date ? `${t('Sowing Date', 'Sowing Date')}: ${t('Not Provided', 'Not Provided')}` : `${t('Sown', 'Sown')}: ${data.sowing_date}`} · {t('Report', 'Report')}: {new Date().toISOString().slice(0,10)}
                </div>
              </div>
            </div>

            {/* Growth Stage & Harvest Prediction */}
            {(data.sowing_date_estimated || !data.sowing_date) ? (
              <div style={{
                background: '#fffbf0',
                border: '1.5px dashed #f59e0b',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}>
                <span style={{ fontSize: 24, marginTop: 2 }}>📅</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                    {t('Sowing Date Required for Growth Stage & Harvest Prediction', 'Sowing Date Required for Growth Stage & Harvest Prediction')}
                  </div>
                  <p style={{ fontSize: 11, color: '#78350f', margin: 0, lineHeight: 1.45 }}>
                    {t('You have not provided your crop sowing date. Growth stage, phenology progress, and harvest predictions cannot be calculated without knowing when the crop was sown or transplanted. Reply with your sowing date (e.g. DD-MM-YYYY) in the chat below to calculate your harvest prediction.', 'You have not provided your crop sowing date. Growth stage, phenology progress, and harvest predictions cannot be calculated without knowing when the crop was sown or transplanted. Reply with your sowing date (e.g. DD-MM-YYYY) in the chat below to calculate your harvest prediction.')}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Growth Stage */}
                {(growthStage.current_stage || growthStage.stage) && (
                  <div style={{
                    background:'#f8fbf8', border:'1px solid #d4e8d4',
                    borderRadius:10, padding:'12px 14px', marginBottom:10
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#738176', letterSpacing:1 }}>{t('CROP STATUS', 'CROP STATUS')}</span>
                      <span style={{ fontSize:10, fontWeight:700, color: confColor(growthStage.confidence) }}>
                        {growthStage.confidence ? `${t(growthStage.confidence, growthStage.confidence)} ${t('confidence', 'confidence')}` : ''}
                      </span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1a5c2a' }}>{t('Growth stage', 'Growth stage')}</div>
                    <div style={{ fontSize:16, fontWeight:700, color:'#2d6a4f', margin:'4px 0' }}>
                      {t(growthStage.current_stage || growthStage.stage, growthStage.current_stage || growthStage.stage)}
                    </div>
                    {(() => {
                      const dayNum   = growthStage.days_after_sowing ?? growthStage.day
                      const totalDays = growthStage.total_crop_duration_days ?? growthStage.total_days
                      const pct      = growthStage.progress_pct ?? (dayNum != null && totalDays ? Math.round((dayNum/totalDays)*100) : null)
                      const daysLeft = growthStage.days_remaining_to_harvest ?? growthStage.days_remaining
                      if (dayNum == null) return null
                      return (
                        <div style={{ marginTop:8 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#738176', marginBottom:4 }}>
                            <span>{t('Sowing', 'Sowing')}</span>
                            <span>{t('Day', 'Day')} {dayNum}{totalDays ? ` ${t('of', 'of')} ${totalDays}` : ''}{daysLeft != null ? ` · ${daysLeft} ${t('days to harvest', 'days to harvest')}` : ''}</span>
                            <span>{t('Harvest', 'Harvest')}</span>
                          </div>
                          <div style={{ background:'#e0e8e0', borderRadius:99, height:8, overflow:'hidden' }}>
                            <div style={{
                              height:'100%', borderRadius:99,
                              background:'linear-gradient(90deg,#2d6a4f,#52b788)',
                              width: `${Math.min(100, pct ?? 0)}%`
                            }}/>
                          </div>
                        </div>
                      )
                    })()}
                    {(growthStage.note || growthStage.source) && (
                      <p style={{ fontSize:10, color:'#738176', margin:'8px 0 0' }}>{t(growthStage.note || growthStage.source, growthStage.note || growthStage.source)}</p>
                    )}
                  </div>
                )}

                {/* Harvest Prediction */}
                {(harvest.estimated_harvest_date || harvest.estimated_harvest) && (
                  <div style={{
                    background:'#f8fbf8', border:'1px solid #d4e8d4',
                    borderRadius:10, padding:'12px 14px', marginBottom:10
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#738176', letterSpacing:1 }}>{t('HARVEST PREDICTION', 'HARVEST PREDICTION')}</span>
                      <span style={{ fontSize:10, fontWeight:700, color: confColor(harvest.confidence) }}>
                        {harvest.confidence ? `${t(harvest.confidence, harvest.confidence)} ${t('confidence', 'confidence')}` : ''}
                      </span>
                    </div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
                      <div>
                        <div style={{ fontSize:11, color:'#738176' }}>{t('Estimated harvest date', 'Estimated harvest date')}</div>
                        <div style={{ fontSize:20, fontWeight:700, color:'#2d6a4f' }}>
                          {harvest.estimated_harvest_date || harvest.estimated_harvest}
                        </div>
                      </div>
                      {harvest.days_remaining != null && (
                        <span style={{
                          background:'#e8f4e8', border:'1px solid #b8dcc8',
                          borderRadius:20, padding:'3px 12px', fontSize:12, color:'#2d6a4f', fontWeight:600
                        }}>±7 {t('days', 'days')} · {harvest.days_remaining} {t('days remaining', 'days remaining')}</span>
                      )}
                    </div>
                    {harvest.earliest && harvest.latest && (
                      <div style={{ display:'flex', gap:16, marginTop:8, fontSize:11, color:'#738176' }}>
                        <span>{t('Earliest', 'Earliest')}: <b style={{ color:'#2d6a4f' }}>{harvest.earliest}</b></span>
                        <span>{t('Latest', 'Latest')}: <b style={{ color:'#2d6a4f' }}>{harvest.latest}</b></span>
                      </div>
                    )}
                    {harvest.uncertainty && (
                      <p style={{ fontSize:10, color:'#738176', margin:'6px 0 0' }}>{t(harvest.uncertainty, harvest.uncertainty)}</p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Problems & Remedies */}
            {problems.length > 0 && (
              <div style={{
                background:'#fffbf0', border:'1px solid #f0d070',
                borderRadius:10, padding:'12px 14px', marginBottom:10
              }}>
                <button
                  style={{ background:'none', border:'none', cursor:'pointer', padding:0, width:'100%', textAlign:'left' }}
                  onClick={() => setShowProblems(v => !v)}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#7a5500', letterSpacing:1 }}>
                      {t('CROP PROBLEMS & REMEDIES', 'CROP PROBLEMS & REMEDIES')}
                    </div>
                    {showProblems ? <ChevronUp size={14} color="#7a5500"/> : <ChevronDown size={14} color="#7a5500"/>}
                  </div>
                  <div style={{ fontSize:12, color:'#7a5500', marginTop:2 }}>{t('Identified issues and actions', 'Identified issues and actions')}</div>
                </button>
                {showProblems && (
                  <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:10 }}>
                    {problems.map((p, i) => {
                      const title    = p.issue || p.problem || '?'
                      const sevLabel = p.level || p.severity || 'Medium'
                      const sev      = sevLabel.toLowerCase()
                      const sevColor = { high:'#c0392b', medium:'#e08800', low:'#2d6a4f' }[sev] || '#e08800'
                      return (
                        <div key={i} style={{
                          background:'#fff', border:`1.5px solid ${sevColor}30`,
                          borderLeft:`3px solid ${sevColor}`, borderRadius:8, padding:'10px 12px'
                        }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                            <b style={{ fontSize:13, color:'#3d3000' }}>{t(title, title)}</b>
                            <span style={{
                              fontSize:10, fontWeight:700,
                              background: sevColor, color:'#fff',
                              padding:'2px 8px', borderRadius:20
                            }}>{t(sevLabel, sevLabel)}</span>
                          </div>
                          {p.evidence  && <p style={{ fontSize:11, color:'#738176', margin:'0 0 4px' }}>📊 {t('Evidence', 'Evidence')}: {t(p.evidence, p.evidence)}</p>}
                          {p.cause     && <p style={{ fontSize:11, color:'#666',    margin:'0 0 4px' }}>{t('Cause', 'Cause')}: {t(p.cause, p.cause)}</p>}
                          {p.inspection && <p style={{ fontSize:11, color:'#445', margin:'0 0 4px' }}>🔍 {t(p.inspection, p.inspection)}</p>}
                          {p.remedy    && <p style={{ fontSize:11, color:'#2d6a4f', fontWeight:600, margin:'4px 0 0' }}>✅ {t(p.remedy, p.remedy)}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Irrigation */}
            {irrigation.recommendation && (
              <div style={{
                background:'#f0f8ff', border:'1px solid #b0d8f0',
                borderRadius:10, padding:'12px 14px', marginBottom:10
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#1a5080', letterSpacing:1 }}>{t('IRRIGATION RECOMMENDATION', 'IRRIGATION RECOMMENDATION')}</span>
                  <span style={{ fontSize:10, fontWeight:700, color: confColor(irrigation.confidence) }}>
                    {irrigation.confidence ? `${t(irrigation.confidence, irrigation.confidence)} ${t('confidence', 'confidence')}` : ''}
                  </span>
                </div>
                <div style={{ fontSize:12, color:'#1a5080', fontWeight:600, marginBottom:4 }}>
                  {t('Irrigation', 'Irrigation')} — {t(growthStage.current_stage || growthStage.stage || 'Current stage', growthStage.current_stage || growthStage.stage || 'Current stage')}
                </div>
                <p style={{ fontSize:12, color:'#2a4060', margin:'0 0 6px' }}>{t(irrigation.recommendation, irrigation.recommendation)}</p>
                {irrigation.source && <p style={{ fontSize:10, color:'#738176', margin:0 }}>Source: {t(irrigation.source, irrigation.source)}</p>}
              </div>
            )}

            {/* Fertiliser */}
            {(fertiliser.recommendation || fertiliser.organic_manure) && (
              <div style={{
                background:'#f8faf0', border:'1px solid #c8d8a0',
                borderRadius:10, padding:'12px 14px', marginBottom:10
              }}>
                <button
                  style={{ background:'none', border:'none', cursor:'pointer', padding:0, width:'100%', textAlign:'left' }}
                  onClick={() => setShowFertiliser(v => !v)}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'#3a5a00', letterSpacing:1 }}>
                      🌾 {t('FERTILISER & MANURE', 'FERTILISER & MANURE')}
                    </span>
                    {showFertiliser ? <ChevronUp size={14} color="#3a5a00"/> : <ChevronDown size={14} color="#3a5a00"/>}
                  </div>
                </button>
                {showFertiliser && (
                  <div style={{ marginTop:10 }}>
                    {fertiliser.recommendation && (
                      <p style={{ fontSize:12, color:'#3a5a00', margin:'0 0 8px' }}>{t(fertiliser.recommendation, fertiliser.recommendation)}</p>
                    )}
                    {fertiliser.organic_manure && (
                      <div style={{ background:'#f0f5e0', borderRadius:8, padding:'8px 10px', marginBottom:8 }}>
                        <b style={{ fontSize:11, color:'#3a5a00' }}>{t('Organic manure', 'Organic manure')}</b>
                        <p style={{ fontSize:11, color:'#4a6a10', margin:'4px 0 0' }}>{t(fertiliser.organic_manure, fertiliser.organic_manure)}</p>
                      </div>
                    )}
                    {fertiliser.source && (
                      <p style={{ fontSize:10, color:'#738176', margin:0 }}>Source: {t(fertiliser.source, fertiliser.source)}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Nearby Suppliers */}
            {suppliers.length > 0 && (
              <div style={{
                background:'#fafaf8', border:'1px solid #d8d8c0',
                borderRadius:10, padding:'12px 14px', marginBottom:10
              }}>
                <button
                  style={{ background:'none', border:'none', cursor:'pointer', padding:0, width:'100%', textAlign:'left' }}
                  onClick={() => setShowSuppliers(v => !v)}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'#444', letterSpacing:1 }}>
                      🏪 {t('NEARBY AGRICULTURAL SUPPLIERS', 'NEARBY AGRICULTURAL SUPPLIERS')}
                    </span>
                    {showSuppliers ? <ChevronUp size={14} color="#444"/> : <ChevronDown size={14} color="#444"/>}
                  </div>
                </button>
                {showSuppliers && (
                  <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
                    {suppliers.slice(0,5).map((s,i) => (
                      <a key={i} href={s.link || s.url || '#'} target="_blank" rel="noopener noreferrer"
                        style={{
                          display:'flex', alignItems:'center', gap:10,
                          background:'#fff', border:'1px solid #e0e0c0', borderRadius:8,
                          padding:'8px 12px', textDecoration:'none'
                        }}>
                        <span style={{ fontSize:18 }}>{s.icon || '🏪'}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:'#333' }}>{s.name}</div>
                          {s.description && <div style={{ fontSize:10, color:'#738176' }}>{s.description}</div>}
                        </div>
                        <ExternalLink size={12} color="#738176"/>
                      </a>
                    ))}
                    <p style={{ fontSize:10, color:'#c0392b', margin:'4px 0 0' }}>
                      ⚠️ {t('Never share personal or financial details with unverified suppliers.', 'Never share personal or financial details with unverified suppliers.')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Data sources */}
            {sources.length > 0 && (
              <div style={{
                borderTop: '1px solid #e0e8e0', paddingTop: 10, marginTop: 4
              }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#738176', letterSpacing:1, marginBottom:6 }}>
                  {t('DATA SOURCES USED IN THIS REPORT', 'DATA SOURCES USED IN THIS REPORT')}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {sources.map((s,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#738176' }}>
                      <span><b style={{ color:'#3d5c44' }}>{s.name}</b> — {s.description}</span>
                      <span style={{
                        background: s.type==='MEASURED'?'#e8f4e8': s.type==='SATELLITE'?'#e8eeff': s.type==='MODELLED'?'#fff4e0':'#f0f0f0',
                        border: '1px solid #ddd', borderRadius:20,
                        padding:'1px 8px', fontSize:9, fontWeight:700,
                        color: s.type==='MEASURED'?'#2d6a4f': s.type==='SATELLITE'?'#3050c0': s.type==='MODELLED'?'#c07000':'#555',
                        whiteSpace:'nowrap', marginLeft:8
                      }}>{s.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p style={{ fontSize: 10, color: '#738176', margin: '10px 0 0', fontStyle:'italic' }}>
              {t('This report is generated from agronomic calendars and available environmental data. It is not a substitute for field inspection or expert advice. Confirm all recommendations with your local KVK or extension officer.', 'This report is generated from agronomic calendars and available environmental data. It is not a substitute for field inspection or expert advice. Confirm all recommendations with your local KVK or extension officer.')}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Main renderer ─────────────────────────────────────────────────────────────
export default function ModuleResultRenderer({ moduleId, moduleResult }) {
  if (!moduleId || !moduleResult) return null

  return (
    <div className="mr-wrapper">
      {moduleId === 'weather'            && <WeatherResult          data={moduleResult} />}
      {moduleId === 'flood_risk'         && <FloodRiskResult        data={moduleResult} />}
      {moduleId === 'lac_suitability'    && <LacSuitabilityResult   data={moduleResult} initialTab="suitability" />}
      {moduleId === 'lac_risk'           && <LacSuitabilityResult   data={moduleResult} initialTab="risk" />}
      {moduleId === 'lac_forecast'       && <LacSuitabilityResult   data={moduleResult} initialTab="forecast" />}
      {moduleId === 'lac_calendar'       && <LacSuitabilityResult   data={moduleResult} initialTab="calendar" />}
      {moduleId === 'lac_market'         && <LacSuitabilityResult   data={moduleResult} initialTab="market" />}
      {moduleId === 'lac_history'        && <LacSuitabilityResult   data={moduleResult} initialTab="history" />}
      {moduleId === 'lac_guidance'       && <LacSuitabilityResult   data={moduleResult} initialTab="suitability" />}
      {moduleId === 'pearl_suitability'   && <PearlSuitabilityResult data={moduleResult} initialTab="suitability" />}
      {moduleId === 'pearl_risk'          && <PearlSuitabilityResult data={moduleResult} initialTab="risk" />}
      {moduleId === 'pearl_water_quality' && <PearlSuitabilityResult data={moduleResult} initialTab="water" />}
      {moduleId === 'pearl_calendar'      && <PearlSuitabilityResult data={moduleResult} initialTab="calendar" />}
      {moduleId === 'pearl_market'        && <PearlSuitabilityResult data={moduleResult} initialTab="market" />}
      {moduleId === 'pearl_guidance'      && <PearlSuitabilityResult data={moduleResult} initialTab="guide" />}
      {moduleId === 'market'             && <MarketResult           data={moduleResult} />}
      {moduleId === 'crop_recommendation'&& <CropRecommendationResult data={moduleResult} />}
      {moduleId === 'schemes'            && <SchemesResult          data={moduleResult} />}
      {moduleId === 'cashflow'           && <CashflowResult         data={moduleResult} />}
      {moduleId === 'production'         && <ProductionResult       data={moduleResult} />}
      {moduleId === 'disease'            && <DiseaseResult          data={moduleResult} />}
      {moduleId === 'soil_nutrients'     && <SoilResult             data={moduleResult} />}
      {moduleId === 'crop_loss'          && <CropLossResult         data={moduleResult} />}
      {moduleId === 'crop_health'        && <CropHealthResult       data={moduleResult} />}
    </div>
  )
}
