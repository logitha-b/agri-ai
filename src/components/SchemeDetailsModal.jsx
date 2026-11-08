import { useLanguage } from '../context/LanguageContext'
import { useEffect } from 'react'
import { ExternalLink, FileText, Landmark, ShieldCheck, X } from 'lucide-react'
import { Button } from '../components'

export function SchemeDetailsModal({ scheme, loading, error, onRetry, onClose, portalUnavailable }) {
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

  if (!scheme && !loading && !error) return null
  const lists = scheme ? [
    [t('Eligibility criteria', 'Eligibility criteria'), scheme.eligibility_criteria, ShieldCheck],
    [t('Benefits', 'Benefits'), [scheme.benefits], Landmark],
    [t('Required documents', 'Required documents'), scheme.required_documents, FileText],
    [t('Application process', 'Application process'), scheme.application_steps, FileText],
  ] : []

  return <div className="scheme-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="scheme-details-modal" role="dialog" aria-modal="true" aria-labelledby="scheme-modal-title">
      <header className="scheme-modal-header">
        <span className="scheme-modal-icon"><Landmark size={21}/></span>
        <div>
          <small>{scheme ? `${t(scheme.category, scheme.category)} · ${scheme.short_name}` : t('GOVERNMENT SCHEME DETAILS')}</small>
          <h2 id="scheme-modal-title">{scheme ? t(scheme.name, scheme.name) : (loading ? t('Loading scheme details') : t('Unable to load scheme details'))}</h2>
        </div>
        <button className="icon-button" aria-label="Close scheme details" onClick={onClose}><X size={20}/></button>
      </header>
      <div className="scheme-modal-content">
        {loading && <div className="scheme-modal-state" role="status"><span className="scheme-spinner"/><p>{t('Retrieving details from the scheme catalogue…', 'Retrieving details from the scheme catalogue…')}</p></div>}
        {error && <div className="scheme-error" role="alert"><p>{error}</p><Button kind="secondary" onClick={onRetry}>{t('Retry', 'Retry')}</Button></div>}
        {scheme && <>
          <section className="scheme-details-overview">
            <h3>{t('Overview', 'Overview')}</h3>
            <p>{t(scheme.description, scheme.description)}</p>
          </section>
          <div className="scheme-details-grid">
            {lists.map(([title, items, Icon]) => <section className="scheme-details-section" key={title}>
              <h3><Icon size={17}/>{title}</h3>
              <ul>{(items || []).map(item => <li key={item}>{t(item, item)}</li>)}</ul>
            </section>)}
          </div>
          <section className="scheme-details-notes">
            <h3>{t('Important notes', 'Important notes')}</h3>
            <p>{t(scheme.note, scheme.note || 'Eligibility and application requirements must be verified through the official government source.')}</p>
            <div>
              <span><b>{t('Government department', 'Government department')}</b>{t(scheme.department, scheme.department || 'Check official portal')}</span>
              <span><b>{t('Application deadline', 'Application deadline')}</b>{t(scheme.deadline, scheme.deadline || 'Check official portal')}</span>
              <span><b>{t('Official source', 'Official source')}</b>{t(scheme.source, scheme.source || 'Check official portal')}</span>
            </div>
          </section>
        </>}
      </div>
      <footer className="scheme-details-footer">
        {portalUnavailable && <span className="portal-unavailable" role="status">{t('Official portal unavailable in prototype.', 'Official portal unavailable in prototype.')}</span>}
        {scheme?.official_link && <a className="button primary" href={scheme.official_link} target="_blank" rel="noopener noreferrer">{t('Official Portal', 'Official Portal')} <ExternalLink size={15}/></a>}
        <button className="button secondary" onClick={onClose}>{t('Close details', 'Close details')}</button>
      </footer>
    </section>
  </div>
}
