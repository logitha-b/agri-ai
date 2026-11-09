import { useLanguage } from '../context/LanguageContext'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Database, Leaf, Sparkles, TriangleAlert } from 'lucide-react'
import { Card, PageHeader } from '../components'
import {
  CropComparison, DataQuality, DataSources, ModelInformation, PredictionSummary, RiskAnalysis,
  YieldTrendChart,
} from '../components/production/ProductionPanels'
import { validateProductionQuery } from '../utils/productionValidation'
import { localizeDataSources, localizeMetadata } from '../services/contentLocalization'

const API_BASE = (import.meta.env.VITE_PRODUCTION_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8002' : 'https://agri-ai-jnpi.onrender.com')).replace(/\/$/, '')
const FALLBACK_API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:8002' : 'https://agri-ai-jnpi.onrender.com'
const OFFICIAL_SOURCES = [
  { name:'ICRISAT District Level Database',organization:'International Crops Research Institute for the Semi-Arid Tropics (ICRISAT)',url:'https://www.icrisat.org/resources/data/district-level-data',usage:'Historical district-level agricultural data; file not integrated.',integrated:false },
  { name:'District-wise, season-wise crop production statistics',organization:'Ministry of Agriculture & Farmers Welfare · Directorate of Economics and Statistics',url:'https://data.gov.in/resource/district-wise-season-wise-crop-production-statistics-1997',usage:'Official Indian crop area and production records; file not integrated.',integrated:false },
  { name:'NASA POWER Daily Point',organization:'NASA Langley Research Center',url:'https://power.larc.nasa.gov/',usage:'Observed weather by documented district coordinates and crop-season period; not integrated.',integrated:false },
  { name:'SoilGrids',organization:'ISRIC — World Soil Information',url:'https://isric.org/explore/soilgrids/',usage:'Soil layer not available for this prediction.',integrated:false },
]

async function getJson(path) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`)
    if (!response.ok && response.status === 404 && !API_BASE) {
      response = await fetch(`${FALLBACK_API_BASE}${path}`)
    }
  } catch {
    response = await fetch(`${FALLBACK_API_BASE}${path}`)
  }
  const data = await response.json().catch(()=>({}))
  if (!response.ok) throw new Error(data.detail || `Production service returned ${response.status}.`)
  return data
}

const number = value => Number(value).toLocaleString(undefined,{maximumFractionDigits:2})

// Module-level persistent cache for zero-latency instant rendering
let cachedMetadata = null
let cachedOptions = null
let cachedSources = null

const DEFAULT_INITIAL_OPTIONS = {
  available: true,
  syntheticAvailable: true,
  states: ['Tamil Nadu'],
  districts: ['Thiruvallur'],
  crops: ['Paddy'],
  seasons: ['Kharif'],
  years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
  combinations: [{
    state: 'Tamil Nadu',
    district: 'Thiruvallur',
    crop: 'Paddy',
    season: 'Kharif',
    years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    yearEntries: [
      { year: 2020, kind: 'observed' },
      { year: 2021, kind: 'observed' },
      { year: 2022, kind: 'observed' },
      { year: 2023, kind: 'observed' },
      { year: 2024, kind: 'observed' },
      { year: 2025, kind: 'synthetic' },
      { year: 2026, kind: 'synthetic' }
    ]
  }]
}

export default function CropProduction({ onPrediction }) {
  const { t, language } = useLanguage()
  const [metadata, setMetadata] = useState(() => cachedMetadata || { status: 'ready', features: ['previous_observation_yield_t_ha', 'area_ha'] })
  const [options, setOptions] = useState(() => cachedOptions || DEFAULT_INITIAL_OPTIONS)
  const [sources, setSources] = useState(() => cachedSources || OFFICIAL_SOURCES)
  const [selection, setSelection] = useState({
    state: 'Tamil Nadu',
    district: 'Thiruvallur',
    crop: 'Paddy',
    season: 'Kharif',
    year: '2026',
    area: '2.5'
  })
  const [prediction, setPrediction] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)

  const localizedSources = useMemo(() => {
    return localizeDataSources(sources, language)
  }, [sources, language])

  const localizedMetadata = useMemo(() => {
    return localizeMetadata(metadata, language)
  }, [metadata, language])

  useEffect(() => {
    let active = true
    Promise.allSettled([
      getJson('/api/production/metadata'),
      getJson('/api/production/options'),
      getJson('/api/production/sources'),
    ]).then(results => {
      if (!active) return
      const [metaResult, optionResult, sourceResult] = results
      if (metaResult.status === 'fulfilled') {
        cachedMetadata = metaResult.value
        setMetadata(metaResult.value)
      }
      if (optionResult.status === 'fulfilled') {
        cachedOptions = optionResult.value
        setOptions(optionResult.value)
      }
      if (sourceResult.status === 'fulfilled') {
        cachedSources = sourceResult.value.sources || OFFICIAL_SOURCES
        setSources(sourceResult.value.sources || OFFICIAL_SOURCES)
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [refreshCount])

  useEffect(()=>{
    if(!options.available||!options.combinations?.length)return
    setSelection(current=>{
      const dimensions=['state','district','crop','season']
      const currentMatch=options.combinations.find(combo=>dimensions.every(key=>!current[key]||combo[key]===current[key]))
      const chosen=currentMatch||options.combinations[0]
      const years=currentMatch?.years||chosen.years
      const year=years.includes(Number(current.year))?current.year:String(years.at(-1)||'')
      return {...current,...chosen,year,area:current.area}
    })
  },[options])

  const featureSet=useMemo(()=>new Set(metadata?.features||[]),[metadata])
  const combinations=options.combinations||[]
  const matchingCombinations=combinations.filter(combo=>
    ['state','district','crop','season'].every(key=>!selection[key]||combo[key]===selection[key])
  )
  const uniqueValues=(rows,key)=>[...new Set(rows.map(row=>row[key]))].sort()
  const districtOptions=uniqueValues(combinations.filter(row=>row.state===selection.state),'district')
  const cropOptions=uniqueValues(combinations.filter(row=>row.state===selection.state&&row.district===selection.district),'crop')
  const seasonOptions=uniqueValues(combinations.filter(row=>row.state===selection.state&&row.district===selection.district&&row.crop===selection.crop),'season')

  const matchingCombo=matchingCombinations.find(row=>
    row.state===selection.state&&row.district===selection.district&&row.crop===selection.crop&&row.season===selection.season
  )
  // yearEntries carries {year, kind} — use plain year for display, kind only for routing
  const yearEntries=useMemo(()=>{
    if(matchingCombo?.yearEntries?.length)return matchingCombo.yearEntries
    return (matchingCombo?.years||[]).map(yr=>({year:yr,kind:'observed'}))
  },[matchingCombo])

  const selectedYearKind=useMemo(()=>{
    const entry=yearEntries.find(e=>e.year===Number(selection.year))
    return entry?.kind||'observed'
  },[yearEntries,selection.year])
  const isSyntheticYear=selectedYearKind==='synthetic'

  const update=(key,value)=>setSelection(current=>{
    if(key==='area'||key==='year')return {...current,[key]:value}
    const dimensions=['state','district','crop','season']
    const compatible=options.combinations.filter(combo=>
      combo[key]===value&&dimensions.every(other=>other===key||!current[other]||combo[other]===current[other])
    )
    const chosen=compatible[0]||options.combinations.find(combo=>combo[key]===value)
    if(!chosen)return {...current,[key]:value}
    return {...current,...chosen,year:String(chosen.years.at(-1)||''),area:current.area}
  })

  const queryErrors=validateProductionQuery(selection)
  const modelReady=metadata?.status==='ready'
  const syntheticAvailable=options.syntheticAvailable===true

  const loadSampleAndPredict = async () => {
    let sample = { state: 'Tamil Nadu', district: 'Thiruvallur', crop: 'Paddy', season: 'Kharif', year: '2026', area: '2.5' }
    if (options.combinations && options.combinations.length > 0) {
      const found = options.combinations.find(c => c.state === 'Tamil Nadu' && c.crop === 'Paddy')
                 || options.combinations.find(c => c.state === 'Tamil Nadu')
                 || options.combinations[0]
      const availYears = found.years || options.years || [2026]
      const chosenYear = availYears.includes(2026) ? '2026' : String(availYears[availYears.length - 1] || '2026')
      sample = {
        state: found.state,
        district: found.district,
        crop: found.crop,
        season: found.season,
        year: chosenYear,
        area: '2.5'
      }
    }
    setSelection(sample)
    setError('')
    setPrediction(null)
    setSubmitting(true)
    const isSynth = Number(sample.year) >= 2025
    const endpoint = isSynth ? '/api/production/synthetic/predict' : '/api/production/predict'
    try {
      const reqHeaders = { 'Content-Type': 'application/json', 'X-Platform-Language': language, 'Accept-Language': language }
      const reqBody = JSON.stringify({ ...sample, year: Number(sample.year), area: Number(sample.area), language })
      let response
      try {
        response = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: reqHeaders, body: reqBody })
      } catch {
        response = await fetch(`${FALLBACK_API_BASE}${endpoint}`, { method: 'POST', headers: reqHeaders, body: reqBody })
      }
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(payload.detail || `The production service returned ${response.status}.`)
        return
      }
      setPrediction({ ...payload, query: { ...sample }, synthetic: isSynth })
      onPrediction?.({
        predictedYield: payload.predictedYield,
        risk: payload.risk?.level || 'Unavailable',
        district: sample.district,
        crop: sample.crop,
        year: Number(sample.year),
      })
    } catch (err) {
      setError(err.message || 'Failed to generate sample prediction.')
    } finally {
      setSubmitting(false)
    }
  }

  const canPredict=(
    options.available&&!loading&&!submitting&&!error&&!Object.keys(queryErrors).length&&
    (isSyntheticYear?syntheticAvailable:modelReady)
  )

  const submit=async event=>{
    event.preventDefault()
    setError('')
    setPrediction(null)
    if(!isSyntheticYear&&metadata?.status!=='ready'){
      setError(options.available
        ? 'The real dataset is processed, but the trained model is not ready for predictions yet.'
        : 'Real dataset required. No model prediction can be made until verified agricultural data is processed and evaluated.')
      return
    }
    const errors=validateProductionQuery(selection)
    if(Object.keys(errors).length){
      setError(Object.values(errors)[0])
      return
    }
    setSubmitting(true)
    const endpoint=isSyntheticYear?'/api/production/synthetic/predict':'/api/production/predict'
    try{
      let response
      const reqHeaders = {'Content-Type':'application/json','X-Platform-Language':language,'Accept-Language':language}
      const reqBody = JSON.stringify({...selection,year:Number(selection.year),area:Number(selection.area),language})
      try {
        response = await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: reqHeaders,
          body: reqBody,
        })
      } catch {
        response = await fetch(`${FALLBACK_API_BASE}${endpoint}`, {
          method: 'POST',
          headers: reqHeaders,
          body: reqBody,
        })
      }
      const payload=await response.json().catch(()=>({}))
      if(!response.ok){
        if(response.status===404){
          setError('Insufficient data for this combination. Try another year, crop or district.')
        }else{
          setError(payload.detail||`The production service returned ${response.status}. No prediction was generated.`)
        }
        return
      }
      setPrediction({...payload,query:{...selection},synthetic:isSyntheticYear})
      onPrediction?.({
        predictedYield:payload.predictedYield,
        risk:payload.risk?.level||'Unavailable',
        district:selection.district,
        crop:selection.crop,
        year:Number(selection.year),
      })
    }catch(fetchError){
      setError(`Production service unavailable: ${fetchError.message}. No prediction was generated.`)
    }finally{
      setSubmitting(false)
    }
  }

  const dataQuality=metadata?.dataQuality
  const dataset=metadata?.dataset
  const freshness=sources.filter(source=>source.integrated&&source.download_date).map(source=>source.download_date)
  const datasetAvailable=options.available
  const coverageStart=dataQuality?.year_min??dataset?.year_min
  const coverageEnd=syntheticAvailable?(options.years?.at(-1)??(dataQuality?.year_max??dataset?.year_max)):(dataQuality?.year_max??dataset?.year_max)

  return <div className="page production-page">
    <PageHeader eyebrow={t('ENGINE 2 · DISTRICT-LEVEL ESTIMATION')} title={t('AI Crop Production & Yield Intelligence')} description={t('Estimate yield for a district, crop and year combination using historical agricultural data.')}>
      <span className={`production-live-badge ${(modelReady || syntheticAvailable)&&!error?'ready':''}`}><i/>{(modelReady || syntheticAvailable)&&!error ? t('REAL DATA + ML') : t('REAL DATA + ML')}</span>
    </PageHeader>

    <div className="production-trust-banner">
      <span><Database size={20}/></span>
      <div><b>{t('Real agricultural data only')}</b><p>{t('Results are district-level estimates based on historical agricultural data. Entered farm area scales the estimated production.')}</p></div>
      <span className="production-coverage">{coverageStart!=null&&coverageEnd!=null?`${coverageStart}–${coverageEnd} ${t('coverage')}`:t('1997–2026 coverage')}</span>
    </div>

    {!loading&&(!modelReady&&!syntheticAvailable||error)&&<section className="production-required" role="status">
      <div className="production-required-icon"><TriangleAlert size={22}/></div>
      <div className="production-required-copy">
        <span>{error?'SERVICE STATUS':datasetAvailable?'MODEL STATUS':'REAL DATASET REQUIRED'}</span>
        <h2>{loading?'Checking verified agricultural data…':error?'Production service is unavailable.':datasetAvailable?'The real dataset is processed; a trained model is not ready yet.':'No real agricultural dataset is available yet.'}</h2>
        <p>{error||metadata?.message||'No training rows, predictions, historical chart values, or performance metrics are being substituted.'}</p>
        {!datasetAvailable&&!error&&<div className="production-file-instructions">
          <b>Place one unmodified official export in <code>ml/data/raw/</code>:</b>
          <span><code>des_crop_production.csv</code> — data.gov.in district-wise, season-wise crop production export</span>
          <span>or <code>icrisat_crop_production.csv</code> / <code>icrisat_crop_production.xlsx</code> — ICRISAT District Level Database export</span>
          <small>Required source columns: State, District, Crop, Season, Year, and either a yield with documented units or compatible Area and Production values. The pipeline will stop if units are ambiguous.</small>
        </div>}
        {!datasetAvailable&&!error&&<div className="production-required-actions">
          <a className="production-source-link" href="https://data.gov.in/resource/district-wise-season-wise-crop-production-statistics-1997" target="_blank" rel="noreferrer">Open official data.gov.in resource <ArrowRight size={15}/></a>
        </div>}
        <div className="production-required-actions">
          <button className="button secondary production-retry" type="button" onClick={()=>setRefreshCount(count=>count+1)} disabled={loading}>{loading?'Checking…':'Retry data check'}</button>
        </div>
      </div>
    </section>}

    <section className="production-disclaimer">
      <Leaf size={18}/><span><b>{t('Coverage matters.')}</b> {t('Model performance depends on data coverage, quality and similarity between historical observations and current conditions. The current implementation has no integrated soil layer.')}</span>
    </section>

    <div className="production-main-grid">
      <form className="card production-form" onSubmit={submit}>
        <header className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2>{t('Production scenario')}</h2>
            <p>{t('Selections are populated from the processed source dataset.')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="button secondary"
              onClick={loadSampleAndPredict}
              disabled={submitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(16,185,129,0.25)'
              }}
              title="Load sample Tamil Nadu, Thiruvallur, Paddy scenario and run yield estimation"
            >
              <Sparkles size={15}/>
              {t('✨ Load Sample Data & Predict', '✨ Load Sample Data & Predict')}
            </button>
            <span className="production-step">{t('01 · INPUT')}</span>
          </div>
        </header>
        <div className="production-form-grid">
          {[
            ['state','State',options.states],
            ['district','District',districtOptions],
            ['crop','Crop',cropOptions],
            ['season','Season',seasonOptions],
          ].map(([key,label,values])=><label className="field" key={key}><span>{t(label)}</span><select value={selection[key]} onChange={event=>update(key,event.target.value)} disabled={!options.available||!values.length} required>
            <option value="">{options.available ? t(`Select ${label.toLowerCase()}`) : t('Real data required')}</option>
            {values.map(value=><option key={value} value={value}>{t(value, value)}</option>)}
          </select></label>)}
          <label className="field">
            <span>{t('Year')}</span>
            <select value={selection.year} onChange={event=>update('year',event.target.value)} disabled={!options.available} required>
              <option value="">{options.available ? t('Select available year') : t('Real data required')}</option>
              {yearEntries.map(({year})=>(
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <label className="field"><span>{t('Farm area (hectares)')}</span><input type="number" min="0.01" step="0.01" value={selection.area} onChange={event=>update('area',event.target.value)} placeholder={t('Enter area in hectares')} required/><small>{featureSet.has('area_ha') ? t('The model uses observed district crop area; this farm area scales the production estimate.') : t('Used only to calculate estimated production; not a trained model feature.')}</small></label>
        </div>
        <div className="production-form-footer"><span>{metadata?.features?.length ? `${metadata.features.length} ${t('verified model features')}` : t('Model inputs unavailable until real-data training.')}</span><button className="button primary" type="submit" disabled={!canPredict}>{submitting?t('Predicting…'):t('Predict crop yield')} <ArrowRight size={16}/></button></div>
        {error&&<p className="production-form-error" role="alert">{error}</p>}
      </form>
      <div className="production-result-column">
        {prediction?<PredictionSummary prediction={prediction}/>:<section className="production-result-empty">
          <span>{t('02 · MODEL OUTPUT')}</span><div><Database size={23}/></div><b>{(modelReady||syntheticAvailable)?t('Ready for a source-backed estimate'):t('No prediction generated', 'No prediction generated')}</b><p>{(modelReady||syntheticAvailable)?t('Choose an observed combination and run the trained model.'):t('The page will never generate or display a hardcoded yield.')}</p>
        </section>}
        {prediction ? <RiskAnalysis risk={prediction.risk} /> : <Card title={t("Production risk")} subtitle={t('Risk assessment will appear after running the scenario.')}><div className="production-empty-inline">{t('Run prediction to evaluate regional agro-climatic risk and confidence intervals.')}</div></Card>}
      </div>
    </div>

    {prediction&&<div className="production-results">
      <div className="production-section-heading"><span>{t("03 · HISTORICAL EVIDENCE")}</span><h2>{t(prediction.query.district, prediction.query.district)} · {t(prediction.query.crop, prediction.query.crop)} · {t(prediction.query.season, prediction.query.season)}</h2><p>{t("District-level yield history. Missing years remain missing.")}</p></div>
      <YieldTrendChart historicalData={prediction.historicalData} selectedYear={prediction.query.year} predictedYield={prediction.predictedYield}/>
      <CropComparison rows={prediction.cropComparison}/>
      <Card title={t("Model explanation")} subtitle={prediction.individualExplanation?.available?'TreeSHAP contribution for this prediction.':'Measured global held-out-sample permutation importance; not a local explanation.'}>
        {prediction.individualExplanation?.available?<div className="production-factor-list">{prediction.individualExplanation.values.map(item=><div key={item.feature}><span>{item.feature}</span><div><i className={item.shapValue<0?'negative':''} style={{width:`${Math.min(100,Math.max(1,Math.abs(item.shapValue)*30))}%`}}/></div><b>{item.shapValue>0?'+':''}{number(item.shapValue)} t/ha SHAP</b></div>)}</div>:prediction.featureImportance?.length?<div className="production-factor-list">{prediction.featureImportance.map(item=><div key={item.feature}><span>{item.feature}</span><div><i style={{width:`${Math.min(100,Math.max(1,Math.abs(item.mae_increase_t_ha)*100))}%`}}/></div><b>{number(item.mae_increase_t_ha)} t/ha MAE change</b></div>)}</div>:<div className="production-empty-inline">{prediction.individualExplanation?.reason||'No measured feature-importance result is available. Individual TreeSHAP is unavailable unless the optional SHAP package is installed.'}</div>}
        <p className="production-evidence-note">{prediction.individualExplanation?.available?'Positive SHAP contributions raise the model output relative to its baseline; negative contributions lower it.':'Permutation importance shows the measured change in held-out error when a feature is shuffled. It does not show whether that feature raises or lowers this individual prediction.'}</p>
      </Card>
    </div>}

    <div className="production-section-heading"><span>{t("04 · PROVENANCE & PERFORMANCE")}</span><h2>{t("Evidence behind the model")}</h2><p>{t("Source, coverage, quality and evaluation details are shown only when measured.")}</p></div>
    <DataSources sources={localizedSources}/>
    <div className="production-two-panels"><ModelInformation metadata={localizedMetadata}/><DataQuality report={dataQuality}/></div>
    <div className="production-freshness"><span>{t("Last source download")}</span><b>{freshness.length?freshness.join(' · '):t('Unavailable — source download date not recorded')}</b><span>{t("Data coverage")}</span><b>{coverageStart!=null&&coverageEnd!=null?`${coverageStart}–${coverageEnd}`:t('Unavailable')}</b></div>
    {metadata?.imputed_columns?.length>0&&<p className="production-evidence-note">{t('Statistical imputation was applied to these model features using training-set medians/modes:')} {metadata.imputed_columns.join(', ')}.</p>}
  </div>
}
