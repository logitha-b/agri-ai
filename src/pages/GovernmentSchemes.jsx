import { useLanguage } from '../context/LanguageContext'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, BadgeCheck, BrainCircuit, CheckCircle2, Landmark, RotateCcw, ShieldCheck } from 'lucide-react'
import { Button } from '../components'
import { SchemeCard } from '../components/SchemeCard'
import { SchemeDetailsModal } from '../components/SchemeDetailsModal'
import { SchemeExplanation } from '../components/SchemeExplanation'
import { SchemeFilters } from '../components/SchemeFilters'
import { SchemeForm } from '../components/SchemeForm'
import { ProfileSummary } from '../components/ProfileSummary'
import { getModelInfo, getOutcomeSample, getScheme, getSchemes, predictSchemes } from '../services/schemeApi'

const EMPTY_FILTERS = {
  search: '',
  category: 'All categories',
  relevance: 'All relevance classes',
  eligibility: 'All eligibility statuses',
  crop: 'All crops',
  activity: 'All activities',
  sort: 'best',
}

export default function GovernmentSchemesPage({ onAnalysis }) {
  const { t, language } = useLanguage()
  const [profile, setProfile] = useState(null)
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState(0)
  const [error, setError] = useState(null)
  const [modelInfo, setModelInfo] = useState(null)
  const [outcomeSample, setOutcomeSample] = useState(null)
  const [outcomeSampleError, setOutcomeSampleError] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [browse, setBrowse] = useState(false)
  const [browseLoading, setBrowseLoading] = useState(false)
  const [allSchemes, setAllSchemes] = useState([])
  const [detail, setDetail] = useState(null)
  const [detailId, setDetailId] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [portalMessage, setPortalMessage] = useState('')
  const [explanation, setExplanation] = useState(null)
  const formRef = useRef(null)
  const resultsRef = useRef(null)
  const activeProfileRef = useRef(null)

  const previousLangRef = useRef(language)
  useEffect(() => {
    if (previousLangRef.current !== language) {
      previousLangRef.current = language
      if (activeProfileRef.current) {
        analyze(activeProfileRef.current)
      }
      if (browse) {
        getSchemes().then(setAllSchemes).catch(() => {})
      }
      if (detailId) {
        getScheme(detailId).then(setDetail).catch(() => {})
      }
    }
  }, [language, browse, detailId])

  useEffect(() => {
    let active = true
    getModelInfo()
      .then(value => { if (active) setModelInfo(value) })
      .catch(requestError => { console.warn('Supplemental scheme model information is unavailable:', requestError.message) })
    getOutcomeSample()
      .then(value => { if (active) setOutcomeSample(value) })
      .catch(requestError => {
        console.warn('Illustrative outcome sample is unavailable:', requestError.message)
        if (active) setOutcomeSampleError(requestError.message)
      })
    return () => { active = false }
  }, [])

  const analyze = async nextProfile => {
    setLoading(true)
    setLoadingMessage(0)
    setError(null)
    setBrowse(false)
    setResponse(null)
    setProfile(nextProfile)
    activeProfileRef.current = nextProfile
    const timer = window.setInterval(() => setLoadingMessage(current => (current + 1) % 3), 1100)
    try {
      const prediction = await predictSchemes(nextProfile)
      setResponse(prediction)
      onAnalysis?.(prediction.summary)
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } catch (requestError) {
      setError({
        title: requestError.code === 'SERVICE_UNAVAILABLE'
          ? 'Recommendation service is currently unavailable.'
          : 'Unable to generate recommendations.',
        message: requestError.message,
      })
      onAnalysis?.(null)
    } finally {
      window.clearInterval(timer)
      setLoading(false)
    }
  }

  const browseAll = async () => {
    setError(null)
    setFilters(EMPTY_FILTERS)
    setBrowse(true)
    if (allSchemes.length) return
    setBrowseLoading(true)
    try {
      setAllSchemes(await getSchemes())
    } catch (requestError) {
      setError({
        title: requestError.code === 'SERVICE_UNAVAILABLE'
          ? 'Scheme catalogue is currently unavailable.'
          : 'Unable to load the scheme catalogue.',
        message: requestError.message,
      })
    } finally {
      setBrowseLoading(false)
    }
  }

  const openDetails = async schemeId => {
    setDetailId(schemeId)
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    setPortalMessage('')
    try {
      setDetail(await getScheme(schemeId))
    } catch (requestError) {
      setDetailError(requestError.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const recommendations = response?.recommendations || []
  const strongCount = recommendations.filter(item => item.relevance_class_id >= 2).length
  const displaySchemes = useMemo(() => {
    let rows = browse
      ? [...allSchemes]
      : recommendations.filter(item => filters.relevance === 'Not Relevant'
        ? item.relevance_class === 'Not Relevant'
        : item.relevance_class_id >= 1)
    const query = filters.search.trim().toLocaleLowerCase()
    rows = rows.filter(item => {
      const metadata = item.scheme_details || item
      const textMatches = !query || [
        item.scheme_name, item.name, item.short_name, item.category,
        item.description, item.benefits, metadata.department,
      ].some(value => String(value || '').toLocaleLowerCase().includes(query))
      const categoryMatches = filters.category === 'All categories' || item.category === filters.category
      const relevanceMatches = browse || filters.relevance === 'All relevance classes' || item.relevance_class === filters.relevance
      const eligibilityMatches = browse || filters.eligibility === 'All eligibility statuses' || item.eligibility_status === filters.eligibility
      const cropMatches = filters.crop === 'All crops' || metadata.crops?.includes(filters.crop)
      const activityMatches = filters.activity === 'All activities' || metadata.activities?.includes(filters.activity)
      return textMatches && categoryMatches && relevanceMatches && eligibilityMatches && cropMatches && activityMatches
    })
    if (browse) rows.sort((a, b) => a.name.localeCompare(b.name))
    else if (filters.sort === 'high') rows.sort((a, b) => b.ml_confidence - a.ml_confidence)
    else if (filters.sort === 'low') rows.sort((a, b) => a.ml_confidence - b.ml_confidence)
    else if (filters.sort === 'name') rows.sort((a, b) => a.scheme_name.localeCompare(b.scheme_name))
    else rows.sort((a, b) => b.relevance_class_id - a.relevance_class_id || b.ml_confidence - a.ml_confidence)
    return rows
  }, [allSchemes, browse, filters, recommendations])

  const catalogue = allSchemes.length
    ? allSchemes
    : recommendations.map(item => item.scheme_details).filter(Boolean)
  const categories = [...new Set([...recommendations.map(item => item.category), ...catalogue.map(item => item.category)])].sort()
  const crops = [...new Set(catalogue.flatMap(item => item.crops || []))].sort()
  const activities = [...new Set(catalogue.flatMap(item => item.activities || []))].sort()
  const loadingMessages = ['Analyzing your agricultural profile', 'Matching your profile with government support programs', 'Preparing explainable recommendations']
  const editProfile = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    formRef.current?.querySelector('select')?.focus({ preventScroll: true })
  }

  return <div className="page scheme-intelligence-page">
    <header className="scheme-page-header">
      <div><span className="eyebrow">{t('AGRICULTURAL GOVERNMENT SUPPORT')}</span><h1>{t('Government Scheme Intelligence')}</h1><p>{t('Find government agricultural schemes and support programs relevant to your farming profile.')}</p></div>
      <div className="scheme-government-badge"><span><Landmark size={21}/></span><div><b>{t('Government Support')}</b><small>{t('AI-powered recommendation')}</small></div></div>
    </header>

    <div className="scheme-prototype-note"><BrainCircuit size={18}/><p><b>{t('Prototype recommendation service.')}</b> {t('Recommendations estimate scheme relevance, not official eligibility. The model and the application examples below use generated data, not verified farmer records.')}</p></div>

    {outcomeSample && <section className="scheme-outcome-sample" aria-labelledby="scheme-outcome-sample-title">
      <div><span className="eyebrow">{t('ILLUSTRATIVE DATASET')}</span><h2 id="scheme-outcome-sample-title">{t('Application and payment examples')}</h2><p>{outcomeSample.record_count.toLocaleString()} {t('generated example records across')} {Object.keys(outcomeSample.schemes).length} {t('schemes')}. {t('These counts are for interface demonstration only and do not represent actual farmer outcomes.')}</p></div>
      <div className="scheme-outcome-stats">
        <div><small>{t('Example approvals')}</small><b>{(outcomeSample.application_status.Approved || 0).toLocaleString()}</b></div>
        <div><small>{t('Example rejections')}</small><b>{(outcomeSample.application_status.Rejected || 0).toLocaleString()}</b></div>
        <div><small>{t('Example pending')}</small><b>{(outcomeSample.application_status.Pending || 0).toLocaleString()}</b></div>
        <div><small>{t('Example payments marked paid')}</small><b>{(outcomeSample.payment_status.Paid || 0).toLocaleString()}</b></div>
      </div>
      <small className="scheme-outcome-provenance">{t('Every row is labeled as a generated example, not an official farmer or government record.')}</small>
    </section>}
    {outcomeSampleError && <div className="scheme-inline-note" role="status">{t('Illustrative application examples are currently unavailable: ', 'Illustrative application examples are currently unavailable: ')}{outcomeSampleError}</div>}

    <SchemeForm onAnalyze={analyze} loading={loading} formRef={formRef}/>

    {loading && <div className="scheme-loading" role="status" aria-live="polite">
      <span className="scheme-spinner"/>
      <div><b>{t(loadingMessages[loadingMessage])}</b><small>{t('Comparing your farmer profile with the scheme catalogue using the local ML service.')}</small></div>
    </div>}
    {error && <div className="scheme-error" role="alert"><AlertTriangle size={20}/><div><b>{error.title}</b><p>{error.message}</p>{browse ? <Button kind="secondary" onClick={browseAll}><RotateCcw size={15}/>{t('Retry catalogue', 'Retry catalogue')}</Button> : profile && <Button kind="secondary" onClick={() => analyze(profile)}><RotateCcw size={15}/>{t('Retry analysis', 'Retry analysis')}</Button>}</div></div>}
    {portalMessage && <div className="scheme-inline-note" role="status">{portalMessage}</div>}

    {response && <section className="scheme-results-section" ref={resultsRef}>
      <div className="scheme-section-heading"><div><span className="eyebrow">{t('PERSONALIZED FOR YOUR FARM')}</span><h2>{t('Recommended Government Schemes')}</h2><p>{t('Based on your agricultural profile and ML-powered scheme relevance analysis.')}</p></div><span className="scheme-data-chip"><CheckCircle2 size={16}/>{response.model?.name || 'Random Forest Classifier'}</span></div>
      <div className="scheme-stat-grid">
        {[
          ['Schemes analyzed', response.summary.schemes_analyzed, Landmark],
          ['Highly relevant', response.summary.highly_relevant, BadgeCheck],
          ['Relevant', response.summary.relevant, ShieldCheck],
        ].map(([label, value, Icon]) => <div className="scheme-stat" key={label}><span><Icon size={18}/></span><b>{value}</b><small>{t(label)}</small></div>)}
      </div>
      <ProfileSummary profile={profile} onEdit={editProfile}/>
      {strongCount === 0 && <div className="scheme-no-strong"><div><b>{t('No strong scheme matches were identified')}</b><p>{t('Potential matches, if any, are listed below. You can also browse the complete scheme catalogue.')}</p></div><Button kind="secondary" onClick={browseAll}>{t('Browse All Schemes')}</Button></div>}
      <div className="scheme-list-heading"><div><h3>{t(browse ? 'Government scheme catalogue' : 'Schemes for your profile')}</h3><span>{displaySchemes.length} {displaySchemes.length === 1 ? t('scheme') : t('schemes')}</span></div>{browse && <span className="scheme-catalogue-note"><ShieldCheck size={15}/> {t('Eligibility requires official verification')}</span>}</div>
      <SchemeFilters filters={filters} onChange={setFilters} onClear={() => setFilters(EMPTY_FILTERS)} categories={categories} crops={crops} activities={activities} browse={browse}/>
      {displaySchemes.length
        ? <div className="scheme-result-grid">{displaySchemes.map(item => <SchemeCard key={item.scheme_id || item.id} scheme={item} onViewDetails={openDetails} onExplain={setExplanation} onPortalUnavailable={() => setPortalMessage(t('Official portal unavailable in prototype.', 'Official portal unavailable in prototype.'))}/>)}</div>
        : <div className="scheme-empty"><span><Landmark size={24}/></span><b>{t('No matching schemes found')}</b><p>{t('We couldn’t identify a strong match for the current filters. Try changing your crop, activity or farmer category.')}</p><div><Button kind="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>{t('Clear filters')}</Button><Button onClick={browseAll}>{t('Browse All Schemes')}</Button></div></div>}
    </section>}

    {!response && !browse && !loading && !error && <div className="scheme-start-state"><span><BrainCircuit size={21}/></span><div><b>{t('Discover support programs for your farm')}</b><p>{t('Complete your profile and analyze it to see recommendations from the trained model, or browse the full government scheme catalogue.')}</p></div><Button kind="secondary" onClick={browseAll}>{t('Browse All Schemes')}</Button></div>}
    {!response && browse && browseLoading && <div className="scheme-loading" role="status" aria-live="polite"><span className="scheme-spinner"/><div><b>{t('Loading government scheme catalogue')}</b><small>{t('Retrieving scheme records from the local recommendation service.')}</small></div></div>}
    {!response && browse && allSchemes.length > 0 && <>
      <div className="scheme-list-heading"><div><h3>{t('Government scheme catalogue')}</h3><span>{displaySchemes.length} {t('schemes')}</span></div><span className="scheme-catalogue-note"><ShieldCheck size={15}/> {t('Eligibility requires official verification')}</span></div>
      <SchemeFilters filters={filters} onChange={setFilters} onClear={() => setFilters(EMPTY_FILTERS)} categories={categories} crops={crops} activities={activities} browse/>
      {displaySchemes.length
        ? <div className="scheme-result-grid">{displaySchemes.map(item => <SchemeCard key={item.id} scheme={item} onViewDetails={openDetails} onExplain={setExplanation} onPortalUnavailable={() => setPortalMessage(t('Official portal unavailable in prototype.', 'Official portal unavailable in prototype.'))}/>)}</div>
        : <div className="scheme-empty"><span><Landmark size={24}/></span><b>{t('No matching schemes found')}</b><p>{t('Try broadening your search or clearing some filters.')}</p><Button onClick={() => setFilters(EMPTY_FILTERS)}>{t('Clear filters')}</Button></div>}
    </>}

    <section className="scheme-how-it-works">
      <div className="scheme-info-heading"><span><BrainCircuit size={19}/></span><div><h2>{t('How our recommendation works')}</h2><p>{t('Scheme relevance is estimated separately from eligibility checks.')}</p></div></div>
      <div className="scheme-pipeline">{[['01', 'Farmer profile'], ['02', 'Feature processing'], ['03', 'Scheme relevance model'], ['04', 'Eligibility verification'], ['05', 'Recommendations']].map(([number, label]) => <div key={number}><small>{number}</small><b>{t(label)}</b></div>)}</div>
      <div className="scheme-model-strip"><span><b>{t('Model')}</b>{modelInfo?.model || 'Random Forest Classifier'}</span><span><b>{t('Explanation')}</b>{t('Local counterfactual sensitivity estimates · not SHAP')}</span></div>
      {modelInfo?.training_metrics && <p className="scheme-metrics-note">{t('Synthetic holdout only · accuracy', 'Synthetic holdout only · accuracy')} {(modelInfo.training_metrics.accuracy * 100).toFixed(1)}% · Macro F1 {(modelInfo.training_metrics.macro_f1 * 100).toFixed(1)}%. {t('These are not real-world farmer-outcome metrics.', 'These are not real-world farmer-outcome metrics.')}</p>}
    </section>
    <div className="scheme-government-disclaimer"><ShieldCheck size={19}/><div><b>{t('Government Scheme Information')}</b><p>{t('Scheme eligibility, benefits, deadlines and application procedures may change. Verify the latest information through the official government source before applying.')}</p></div></div>

    {(detail || detailLoading || detailError) && <SchemeDetailsModal scheme={detail} loading={detailLoading} error={detailError} onRetry={() => detailId && openDetails(detailId)} onClose={() => { setDetail(null); setDetailId(''); setDetailError('') }} portalUnavailable={portalMessage.includes('unavailable')}/>}
    {explanation && <SchemeExplanation scheme={explanation} onClose={() => setExplanation(null)}/>}
  </div>
}
