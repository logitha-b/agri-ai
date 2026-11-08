import { useLanguage } from '../../context/LanguageContext'
/**
 * InsuranceAssistant — Step 4: Insurance scheme information & document checklist.
 * Shows PMFBY details, deadlines, required documents, and official links.
 * Never claims eligibility or guaranteed compensation.
 */
import { AlertTriangle, Calendar, CheckCircle2, ExternalLink, FileText, ShieldCheck, XCircle } from 'lucide-react'
import { Card, Notice } from '../../components'

function DocRow({ doc }) {
  const missing = doc.required && !doc.present
  return (
    <div className={`loss-doc-row ${missing ? 'loss-doc-missing' : ''}`}>
      <span className="loss-doc-icon">
        {doc.present
          ? <CheckCircle2 size={14} className="loss-ev-yes" />
          : doc.required
            ? <XCircle size={14} className="loss-doc-req" />
            : <FileText size={14} className="loss-ev-neutral" />}
      </span>
      <div className="loss-doc-content">
        <b>{doc.name}</b>
        <small>{doc.note}</small>
      </div>
      {missing && <span className="loss-doc-badge">Required</span>}
    </div>
  )
}

function DeadlineRow({ dl }) {
  return (
    <div className={`loss-deadline-row ${dl.urgent ? 'loss-deadline-urgent' : ''}`}>
      <Calendar size={14} />
      <div>
        <b>{dl.rule}</b>
        <p>{dl.requirement}</p>
        {dl.days_since_incident != null && (
          <small>{dl.days_since_incident} day{dl.days_since_incident !== 1 ? 's' : ''} since incident</small>
        )}
        {dl.status && <span className={`loss-status-chip ${dl.urgent ? 'urgent' : ''}`}>{dl.status}</span>}
        <small className="loss-source" style={{ display: 'block', marginTop: 4 }}>Source: {dl.source}</small>
        {dl.note && <small className="loss-note" style={{ display: 'block' }}>{dl.note}</small>}
      </div>
    </div>
  )
}

export default function InsuranceAssistant({ assessment }) {
  const { t } = useLanguage()
  if (!assessment) return null
  const { insurance, document_checklist } = assessment
  const schemes = insurance?.schemes || []
  const pmfby   = schemes.find(s => s.id === 'pmfby')
  const checklist = document_checklist

  return (
    <div className="page">
      <Notice>
        Insurance eligibility, coverage terms, and compensation are determined solely by the
        insurer and the relevant state government authority. This application provides general
        information about published scheme guidelines only — it cannot confirm your enrollment,
        eligibility, or claim outcome.
      </Notice>

      {/* PMFBY overview */}
      {pmfby && (
        <Card title="PMFBY — Pradhan Mantri Fasal Bima Yojana" subtitle="India's flagship crop insurance scheme. Source: pmfby.gov.in">
          <div className="featured-scheme" style={{ background: 'none', position: 'static', border: '1px solid #e2ebe2', borderRadius: 8, padding: '14px 16px' }}>
            <div className="feature-top">
              <div>
                <div className="eyebrow">CROP INSURANCE</div>
                <p style={{ fontSize: 12, margin: '6px 0 0' }}>{pmfby.description}</p>
              </div>
              <span className="featured-icon"><ShieldCheck size={20}/></span>
            </div>

            <div className="scheme-facts">
              <div>
                <small>DEPARTMENT</small>
                <b>{pmfby.department}</b>
              </div>
              <div>
                <small>DEADLINE</small>
                <b>{pmfby.deadline}</b>
              </div>
              <div>
                <small>COVERED CROPS</small>
                <b>{pmfby.crops?.join(', ')}</b>
              </div>
              <div>
                <small>CATEGORY</small>
                <b>{pmfby.category}</b>
              </div>
            </div>

            <div className="feature-benefit">
              <span>Benefits</span>
              <b>{pmfby.benefits}</b>
            </div>

            {pmfby.eligibility_criteria?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <small className="document-title">ELIGIBILITY CONDITIONS</small>
                <ul className="loss-scheme-list">
                  {pmfby.eligibility_criteria.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}

            {pmfby.required_documents?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <small className="document-title">KEY DOCUMENTS</small>
                <ul className="loss-scheme-list">
                  {pmfby.required_documents.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}

            {pmfby.application_steps?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <small className="document-title">CLAIM STEPS</small>
                <ol className="loss-scheme-list">
                  {pmfby.application_steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            )}

            {pmfby.note && (
              <div className="inline-feedback" style={{ marginTop: 12 }}>
                <AlertTriangle size={14} /><span>{pmfby.note}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Premium note */}
      {insurance?.pmfby_premium_note && (
        <Card title="Indicative Premium Information">
          <div className="loss-premium-note">
            <ShieldCheck size={15} />
            <span>{insurance.pmfby_premium_note}</span>
          </div>
        </Card>
      )}

      {/* Official links */}
      <Card title={t("Official Resources")} subtitle="Always verify current scheme rules on official government portals.">
        <div className="loss-links-grid">
          {insurance?.official_links?.map(link => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="loss-official-link">
              <ShieldCheck size={14} />
              <span>{link.name}</span>
              <ExternalLink size={12} />
            </a>
          ))}
        </div>
        <p className="loss-note" style={{ marginTop: 12 }}>{insurance?.important_notice}</p>
      </Card>

      {/* Document checklist */}
      {checklist && (
        <Card
          title={t("Document Checklist")}
          subtitle={`${checklist.missing_count} required document${checklist.missing_count !== 1 ? 's' : ''} may be missing`}
          action={checklist.missing_count > 0 ? <span className="loss-missing-badge">{checklist.missing_count} missing</span> : <CheckCircle2 size={18} className="loss-ev-yes" />}
        >
          <div className="loss-docs">
            {checklist.checklist?.map(doc => <DocRow key={doc.id} doc={doc} />)}
          </div>
          {checklist.note && (
            <div className="inline-feedback" style={{ marginTop: 12 }}>
              <AlertTriangle size={14} /><span>{checklist.note}</span>
            </div>
          )}
        </Card>
      )}

      {/* Deadlines */}
      {checklist?.deadlines?.length > 0 && (
        <Card title="Reporting Deadlines" subtitle="Act quickly — insurance claims require timely incident reporting.">
          <div className="loss-deadlines">
            {checklist.deadlines.map((dl, i) => <DeadlineRow key={i} dl={dl} />)}
          </div>
        </Card>
      )}
    </div>
  )
}
