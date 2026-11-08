import { useLanguage } from '../context/LanguageContext'
/**
 * PearlCulture — /pearl route.
 * Multi-module Pearl Culture Intelligence platform.
 *
 * Tabs:
 *   1  Suitability      — site climate + pond calculator (preserves PearlPage)
 *   2  Water Quality    — manual entry, threshold comparison, trend charts
 *   3  Environmental Risk — ICAR-CIFE / CMFRI thresholds + live weather
 *   4  Culture Calendar — cycle planner, stage tracker (localStorage)
 *   5  Market & Profit  — profitability calculator, MPEDA price reference
 *   6  Survival Tracker — live count records, mortality calculation
 *   7  AI Assistant     — rule-based KB (ICAR-CIFE / CMFRI / MPEDA)
 *   8  Production Guide — data-readiness assessment + cultivation reference
 *
 * Freshwater and marine are kept scientifically separate throughout.
 * All data stored in browser localStorage — no external database required.
 */
import { useState } from 'react'
import {
  Activity, BarChart2, Calendar, CheckCircle2, Droplets, Fish,
  IndianRupee, MapPin, ShieldAlert, Sparkles, TrendingUp,
} from 'lucide-react'
import { Card, Notice } from '../components'
import PearlSuitability from '../components/pearl/PearlSuitability'
import WaterQuality     from '../components/pearl/WaterQuality'
import PearlRisk        from '../components/pearl/PearlRisk'
import CultureCalendar  from '../components/pearl/CultureCalendar'
import PearlMarket      from '../components/pearl/PearlMarket'
import SurvivalTracker  from '../components/pearl/SurvivalTracker'

const TABS = [
  { id:'suitability', label:'Suitability',      icon:MapPin      },
  { id:'water',       label:'Water Quality',    icon:Droplets    },
  { id:'risk',        label:'Env. Risk',        icon:ShieldAlert },
  { id:'calendar',    label:'Culture Calendar', icon:Calendar    },
  { id:'market',      label:'Market & Profit',  icon:IndianRupee },
  { id:'survival',    label:'Survival',         icon:Activity    },
  { id:'guide',       label:'Production Guide', icon:BarChart2   },
]

// ── Production Guide tab — data readiness + cultivation reference ─────────────

function ProductionGuide({ cultureType }) {
  const { t } = useLanguage()
  return (
    <div className="page">
      <Notice>
        {t(
          "Production forecasting requires verified farm records including stocking counts, water quality, survival rates, and actual harvest data. No pearl culture harvest dataset currently exists in this project. The guide below explains what data is needed.",
          "Production forecasting requires verified farm records including stocking counts, water quality, survival rates, and actual harvest data. No pearl culture harvest dataset currently exists in this project. The guide below explains what data is needed."
        )}
      </Notice>

      <Card title={t("Production Forecasting — Data Readiness Assessment", "Production Forecasting — Data Readiness Assessment")}
        subtitle={t("What is needed before a predictive model can be built", "What is needed before a predictive model can be built")}>
        <div className="pearl-guide-table">
          {[
            { item: t('Farm harvest records', 'Farm harvest records'), status: 'needed', note: t('Stocking date, stocking count, harvest count, pearl grade distribution per cycle.', 'Stocking date, stocking count, harvest count, pearl grade distribution per cycle.') },
            { item: t('Water quality time series', 'Water quality time series'), status: 'needed', note: t('At least weekly DO, temperature, pH, turbidity readings matched to farm and date.', 'At least weekly DO, temperature, pH, turbidity readings matched to farm and date.') },
            { item: t('Survival observations', 'Survival observations'), status: 'partial', note: t('SurvivalTracker tab supports manual entry — needs at least 3 culture cycles.', 'SurvivalTracker tab supports manual entry — needs at least 3 culture cycles.') },
            { item: t('Nucleus implantation records', 'Nucleus implantation records'), status: 'needed', note: t('Implantation date, technique, nucleus size, implanter ID.', 'Implantation date, technique, nucleus size, implanter ID.') },
            { item: t('ERA5 / NASA POWER climate', 'ERA5 / NASA POWER climate'), status: 'available', note: t('Temperature and rainfall available via existing backend.', 'Temperature and rainfall available via existing backend.') },
            { item: t('Trained ML model', 'Trained ML model'), status: 'not built', note: t('Requires minimum 30–50 complete farm-cycles with water quality + harvest data.', 'Requires minimum 30–50 complete farm-cycles with water quality + harvest data.') },
          ].map(({ item, status, note }) => {
            const color = status === 'available' ? '#3d8050' : status === 'partial' ? '#b87c1a' : '#8a968c'
            const badge = status === 'available' ? t('✓ Available', '✓ Available') : status === 'partial' ? t('~ Partial', '~ Partial') : t('✗ Not yet available', '✗ Not yet available')
            return (
              <div key={item} className="pearl-guide-row">
                <div><b>{item}</b><p>{note}</p></div>
                <span style={{ color, fontWeight:700, fontSize:10, whiteSpace:'nowrap' }}>{badge}</span>
              </div>
            )
          })}
        </div>
        <p style={{ fontSize:10, color:'#8a968c', marginTop:10 }}>
          {t(
            "When sufficient data exists, the model architecture would use: survival rate, water temperature, DO, pH, turbidity, nucleus size, culture duration → harvest count and pearl grade distribution. Validation must be done on held-out cycles to prevent data leakage.",
            "When sufficient data exists, the model architecture would use: survival rate, water temperature, DO, pH, turbidity, nucleus size, culture duration → harvest count and pearl grade distribution. Validation must be done on held-out cycles to prevent data leakage."
          )}
        </p>
      </Card>

      <Card title={t("Pearl Computer Vision Grading — Implementation Status", "Pearl Computer Vision Grading — Implementation Status")}
        subtitle={t("Automated image grading requires a trained classifier", "Automated image grading requires a trained classifier")}>
        <div className="pearl-guide-table">
          {[
            { item: t('Labelled image dataset', 'Labelled image dataset'), status: 'not built', note: t('Need ≥500 images per grade with controlled lighting, background, and scale.', 'Need ≥500 images per grade with controlled lighting, background, and scale.') },
            { item: t('Trained CNN model', 'Trained CNN model'), status: 'not built', note: t('Requires labelled dataset. ResNet or EfficientNet architectures are suitable.', 'Requires labelled dataset. ResNet or EfficientNet architectures are suitable.') },
            { item: t('Upload interface', 'Upload interface'), status: 'partial', note: t('Can be implemented; backend endpoint /api/pearl/grade-image is a future task.', 'Can be implemented; backend endpoint /api/pearl/grade-image is a future task.') },
            { item: t('Expert review workflow', 'Expert review workflow'), status: 'partial', note: t('SurvivalTracker notes field can record manual grades for future training data.', 'SurvivalTracker notes field can record manual grades for future training data.') },
          ].map(({ item, status, note }) => {
            const color = status === 'available' ? '#3d8050' : status === 'partial' ? '#b87c1a' : '#8a968c'
            const badge = status === 'available' ? t('✓ Available', '✓ Available') : status === 'partial' ? t('~ Partial', '~ Partial') : t('✗ Not yet available', '✗ Not yet available')
            return (
              <div key={item} className="pearl-guide-row">
                <div><b>{item}</b><p>{note}</p></div>
                <span style={{ color, fontWeight:700, fontSize:10, whiteSpace:'nowrap' }}>{badge}</span>
              </div>
            )
          })}
        </div>
      </Card>

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

      <Card title={t("Key contacts and resources", "Key contacts and resources")}>
        <div className="pearl-guide-table">
          {[
            { item:'ICAR-CIFE', note: t('Central Institute of Freshwater Aquaculture, Bhubaneswar — freshwater pearl training.', 'Central Institute of Freshwater Aquaculture, Bhubaneswar — freshwater pearl training.'), url:'icar.org.in/icar-cife' },
            { item:'CMFRI', note: t('Central Marine Fisheries Research Institute, Kochi — marine pearl oyster research.', 'Central Marine Fisheries Research Institute, Kochi — marine pearl oyster research.'), url:'cmfri.org.in' },
            { item:'MPEDA', note: t('Marine Products Export Development Authority — market support and certification.', 'Marine Products Export Development Authority — market support and certification.'), url:'mpeda.gov.in' },
            { item:'NFDB', note: t('National Fisheries Development Board — scheme funding for aquaculture.', 'National Fisheries Development Board — scheme funding for aquaculture.'), url:'nfdb.gov.in' },
          ].map(({ item, note, url }) => (
            <div key={item} className="pearl-guide-row">
              <div><b>{item}</b><p>{note}</p><small style={{ color:'#4e9af1' }}>{url}</small></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PearlCulture() {
  const { t } = useLanguage()
  const [tab,          setTab]          = useState('suitability')
  const [cultureType,  setCultureType]  = useState('freshwater')
  const [sampleSeed,   setSampleSeed]   = useState(0)
  const [sampleLoaded, setSampleLoaded] = useState(false)

  // Shared location state lifted here
  const [lat,      setLat]      = useState(null)
  const [lng,      setLng]      = useState(null)
  const [state,    setState]    = useState('')
  const [district, setDistrict] = useState('')

  const handleStateChange = ({ lat:la, lng:lo, state:st, district:di }) => {
    if (la !== undefined) setLat(la)
    if (lo !== undefined) setLng(lo)
    if (st) setState(st)
    if (di) setDistrict(di)
  }

  const loadGlobalSample = () => {
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

  const derived = state

  return (
    <div className="page">
      {/* Banner with single master Load Sample Data button */}
      <div className="novelty-banner">
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
            title={t("Load sample data across all Pearl Culture modules", "Load sample data across all Pearl Culture modules")}
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

      {/* Culture type toggle */}
      <div className="pearl-type-toggle">
        <button
          className={`pearl-type-btn ${cultureType === 'freshwater' ? 'active' : ''}`}
          onClick={() => setCultureType('freshwater')}
        >
          <Droplets size={14}/> {t('Freshwater Pearl Culture', 'Freshwater Pearl Culture')}
        </button>
        <button
          className={`pearl-type-btn ${cultureType === 'marine' ? 'active' : ''}`}
          onClick={() => setCultureType('marine')}
        >
          <Fish size={14}/> {t('Marine Pearl Culture', 'Marine Pearl Culture')}
        </button>
      </div>

      {/* Tab bar — reuses lac-tab-bar CSS */}
      <div className="lac-tab-bar">
        {TABS.map(tabItem => {
          const Icon = tabItem.icon
          return (
            <button key={tabItem.id}
              className={`lac-tab ${tab === tabItem.id ? 'active' : ''}`}
              onClick={() => setTab(tabItem.id)}
              aria-current={tab === tabItem.id ? 'page' : undefined}>
              <Icon size={14}/>
              <span className="lac-tab-label">{t(tabItem.label, tabItem.label)}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content with sampleSeed wired to all modules */}
      {tab === 'suitability' && (
        <PearlSuitability
          lat={lat}
          lng={lng}
          cultureType={cultureType}
          derivedState={derived}
          onStateChange={handleStateChange}
          sampleSeed={sampleSeed}
        />
      )}
      {tab === 'water' && (
        <WaterQuality
          cultureType={cultureType}
          sampleSeed={sampleSeed}
        />
      )}
      {tab === 'risk' && (
        <PearlRisk
          lat={lat}
          lng={lng}
          cultureType={cultureType}
          derivedState={derived}
          district={district}
          sampleSeed={sampleSeed}
        />
      )}
      {tab === 'calendar' && (
        <CultureCalendar
          sampleSeed={sampleSeed}
        />
      )}
      {tab === 'market' && (
        <PearlMarket
          cultureType={cultureType}
          sampleSeed={sampleSeed}
        />
      )}
      {tab === 'survival' && (
        <SurvivalTracker
          cultureType={cultureType}
          sampleSeed={sampleSeed}
        />
      )}
      {tab === 'guide' && (
        <ProductionGuide
          cultureType={cultureType}
        />
      )}
    </div>
  )
}
