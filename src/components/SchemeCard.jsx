import { useLanguage } from '../context/LanguageContext'
import { BadgeCheck, ExternalLink, FileCheck2, Landmark, ShieldCheck } from 'lucide-react'
import { Button } from '../components'

function categoryTone(category = '') {
  return category.toLowerCase().includes('insurance') ? 'insurance'
    : category.toLowerCase().includes('irrigation') ? 'water'
      : category.toLowerCase().includes('machinery') ? 'equipment'
        : category.toLowerCase().includes('horticulture') ? 'horticulture'
          : category.toLowerCase().includes('fish') || category.toLowerCase().includes('aqua') ? 'fisheries'
            : category.toLowerCase().includes('income') || category.toLowerCase().includes('support') ? 'support'
              : 'default'
}

export function SchemeCard({ scheme, onViewDetails, onExplain, onPortalUnavailable }) {
  const { t } = useLanguage()
  const metadata = scheme.scheme_details || scheme
  const isPrediction = Number.isInteger(scheme.relevance_class_id)
  const score = isPrediction ? Math.round(scheme.ml_confidence * 100) : null
  const portalLink = scheme.official_link ?? metadata.official_link
  const matches = scheme.matched_conditions || []
  const eligible = scheme.eligibility_status === 'potentially_eligible'
  const notEligible = scheme.eligibility_status === 'not_eligible'
  const relevanceTone = !isPrediction || score < 40 ? 'low' : score < 70 ? 'medium' : 'high'

  return <article className="scheme-result-card">
    <header className="scheme-card-heading">
      <span className={`scheme-category-pill tone-${categoryTone(scheme.category || metadata.category)}`}>
        {t(scheme.category || metadata.category, scheme.category || metadata.category)}
      </span>
      <h3>{t(scheme.scheme_name || scheme.name, scheme.scheme_name || scheme.name)}</h3>
      <span className="scheme-id">{scheme.short_name || metadata.short_name}</span>
    </header>

    <div className="scheme-relevance">
      <div className="scheme-relevance-heading">
        <span>{t('ML Relevance')}</span>
        {isPrediction
          ? <b className={`relevance-label ${relevanceTone}`}>{t(scheme.relevance_class, scheme.relevance_class)}</b>
          : <b className="relevance-label unscored">{t('Not analyzed', 'Not analyzed')}</b>}
      </div>
      <div className="scheme-score-row">
        <div className="scheme-score-track" role="progressbar" aria-label="ML relevance score" aria-valuemin="0" aria-valuemax="100" aria-valuenow={score ?? 0}>
          <i className={relevanceTone} style={{ width: `${score ?? 0}%` }}/>
        </div>
        <b className={`scheme-score ${relevanceTone}`}>{isPrediction ? `${score}/100` : '—'}</b>
      </div>
      <small>{isPrediction ? t('ML relevance confidence · not approval probability') : t('Analyze your profile to see model relevance.')}</small>
    </div>

    <div className={`scheme-eligibility-line ${notEligible ? 'failed' : eligible ? 'potential' : 'unverified'}`}>
      <ShieldCheck size={17}/>
      <span>
        <b>{t('Eligibility')}</b>
        <small>{t(notEligible ? 'Not eligible under prototype checks' : eligible ? 'Potentially eligible' : 'Requires eligibility verification')}</small>
      </span>
      {isPrediction && <span className="scheme-eligibility-note">{t(eligible ? 'Verify official rules' : notEligible ? 'Review failed checks' : 'Verify locally')}</span>}
    </div>
    {scheme.eligibility?.failed_conditions?.length > 0 && (
      <ul className="scheme-failures">
        {scheme.eligibility.failed_conditions.map(reason => <li key={reason}>{t(reason, reason)}</li>)}
      </ul>
    )}

    <div className="scheme-card-body">
      <p className="scheme-result-description">{t(scheme.description || metadata.description, scheme.description || metadata.description)}</p>
      <section className="scheme-match-list">
        <h4>{t('Why this matches')}</h4>
        {matches.length
          ? <ul>{matches.slice(0, 3).map(item => <li key={item}><BadgeCheck size={15}/>{t(item, item)}</li>)}</ul>
          : <p>{isPrediction ? t('No specific profile match factors were returned.') : t('Run a profile analysis to see scheme relevance for your farm.')}</p>}
        {matches.length > 3 && <small>+{matches.length - 3} {t('more factors · see explanation', 'more factors · see explanation')}</small>}
      </section>
      <section className="scheme-result-benefit">
        <h4>{t('Benefit')}</h4>
        <p>{t(scheme.benefits || metadata.benefits || 'Refer to the official scheme source for current benefits.', scheme.benefits || metadata.benefits)}</p>
      </section>
    </div>

    <div className="scheme-result-meta">
      <span><b>{t('Deadline')}</b>{t(scheme.deadline || metadata.deadline || 'Check official source', scheme.deadline || metadata.deadline)}</span>
      <span><b>{t('Department')}</b>{t(scheme.department || metadata.department || 'Government department', scheme.department || metadata.department)}</span>
    </div>

    <footer className="scheme-card-actions">
      <div>
        <Button kind="secondary" onClick={() => onExplain(scheme)}><Landmark size={15}/>{t('Why this scheme?')}</Button>
        <Button onClick={() => onViewDetails(scheme.scheme_id || scheme.id)}><FileCheck2 size={15}/>{t('View Details')}</Button>
      </div>
      {portalLink
        ? <a className="scheme-portal-link" href={portalLink} target="_blank" rel="noopener noreferrer">{t('Official Portal')} <ExternalLink size={14}/></a>
        : <button type="button" className="scheme-portal-link" onClick={onPortalUnavailable}>{t('Official portal unavailable')} <ExternalLink size={14}/></button>}
    </footer>
  </article>
}
