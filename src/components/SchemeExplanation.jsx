import { useEffect } from 'react'
import { BrainCircuit, X } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export function SchemeExplanation({ scheme, onClose }) {
  const { t } = useLanguage()
  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape') onClose() }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  if (!scheme) return null
  const factors = scheme.explanation || []
  const isPrediction = Number.isInteger(scheme.relevance_class_id)
  const score = isPrediction ? Math.round(scheme.ml_confidence * 100) : null

  return <div className="scheme-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="scheme-explanation-modal" role="dialog" aria-modal="true" aria-labelledby="scheme-explanation-title">
      <header className="scheme-modal-header">
        <span className="scheme-modal-icon"><BrainCircuit size={21}/></span>
        <div>
          <small>{isPrediction ? `${t('MODEL EXPLANATION', 'MODEL EXPLANATION')} · ${scheme.short_name}` : `${t('SCHEME INFORMATION', 'SCHEME INFORMATION')} · ${scheme.short_name}`}</small>
          <h2 id="scheme-explanation-title">{isPrediction ? t('Why is this scheme recommended?', 'Why is this scheme recommended?') : t('Scheme relevance is not analyzed', 'Scheme relevance is not analyzed')}</h2>
          <p>{t(scheme.scheme_name, scheme.scheme_name)}</p>
        </div>
        <button className="icon-button" aria-label="Close explanation" onClick={onClose}><X size={20}/></button>
      </header>
      <div className="scheme-explanation-content">
        {isPrediction
          ? <div className="scheme-explanation-score">
              <span><b>{score}/100</b><small>{t('ML relevance confidence', 'ML relevance confidence')}</small></span>
              <p>{t(scheme.relevance_class, scheme.relevance_class)}</p>
            </div>
          : <div className="scheme-explain-disclaimer">
              <BrainCircuit size={17}/>
              <p>{t('Run an analysis of your farmer profile to see this scheme’s ML relevance score and profile-specific explanation. Browsing the catalogue does not make a recommendation or determine eligibility.')}</p>
            </div>}
        {isPrediction && <h3>{t('ML recommendation explanation', 'ML recommendation explanation')}</h3>}
        {isPrediction && factors.length
          ? <div className="scheme-explanation-factors">{factors.map(item => <div className="explain-factor" key={item.field}>
            <div><span>{t(item.factor, item.factor)}</span><b>{item.relative_importance}%</b></div>
            <div className="explain-track"><i style={{ width: `${Math.max(0, Math.min(100, item.relative_importance))}%` }}/></div>
            <small>{t('Model sensitivity', 'Model sensitivity')}: {(item.delta_probability * 100).toFixed(1)} {t('percentage points', 'percentage points')} · {t(item.direction, item.direction)} {t('relevance', 'relevance')}</small>
          </div>)}</div>
          : isPrediction && <p>{t('No feature contribution data was returned for this scheme.', 'No feature contribution data was returned for this scheme.')}</p>}
        {isPrediction && <div className="scheme-explain-disclaimer">
          <BrainCircuit size={17}/>
          <p>{t('ML relevance indicates how strongly the model associates this farmer profile with the scheme. It is not an official eligibility decision or approval probability.')}</p>
        </div>}
      </div>
      <footer><button className="button secondary" onClick={onClose}>{t('Close explanation', 'Close explanation')}</button></footer>
    </section>
  </div>
}
