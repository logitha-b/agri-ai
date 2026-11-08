// src/components/water/FloodRiskCard.jsx
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

function EvidenceRow({ item }) {
  const { t } = useLanguage()

  let sig = t(item.signal, item.signal)
  if (sig === item.signal && item.signal) {
    if (item.signal.includes('dam(s) within 50 km')) {
      const n = item.signal.split(' ')[0]
      sig = `${n} ${t('dam(s) within 50 km', 'dam(s) within 50 km')}`
    } else if (item.signal.includes('reservoir(s) within 50 km')) {
      const n = item.signal.split(' ')[0]
      sig = `${n} ${t('reservoir(s) within 50 km', 'reservoir(s) within 50 km')}`
    }
  }

  let val = t(item.value, item.value)
  if (val === item.value && item.value && item.value.startsWith('Closest:')) {
    val = item.value.replace('Closest:', t('Closest:', 'Closest:')).replace('km', t('km', 'km'))
  }

  let thresh = item.threshold ? t(item.threshold, item.threshold) : ''
  if (thresh === item.threshold && item.threshold) {
    if (item.threshold.includes('No specific threshold applied')) {
      thresh = t('No specific threshold applied', 'No specific threshold applied')
    }
  }

  return (
    <div className={`wr-evidence-row ${item.triggered ? 'wr-ev-triggered' : ''}`}>
      <div className="wr-ev-head">
        <b>{sig}</b>
        {item.triggered && <span className="wr-ev-flag">⚠ {t("Threshold exceeded", "Threshold exceeded")}</span>}
      </div>
      <div className="wr-ev-value">{val}</div>
      {thresh && <div className="wr-ev-threshold">{t("Threshold:", "Threshold:")} {thresh}</div>}
      <div className="wr-ev-source">{t(item.source, item.source)}{item.date && item.date !== 'Static inventory' ? ` · ${item.date}` : ''}</div>
      {item.note && <div className="wr-ev-note">{t(item.note, item.note)}</div>}
    </div>
  )
}

export default function FloodRiskCard({ data, loading, error }) {
  const { t } = useLanguage()

  const LEVEL_CONFIG = {
    ELEVATED_RISK:       { icon: <TriangleAlert size={22}/>, cls: 'wr-risk-elevated', label: t('Elevated Risk', 'Elevated Risk') },
    OBSERVED_FLOODING:   { icon: <AlertTriangle size={22}/>, cls: 'wr-risk-flooding', label: t('Observed Flooding', 'Observed Flooding') },
    NO_ELEVATED_RISK:    { icon: <CheckCircle2 size={22}/>,  cls: 'wr-risk-none',     label: t('No Elevated Risk Detected', 'No Elevated Risk Detected') },
    INSUFFICIENT_DATA:   { icon: <HelpCircle size={22}/>,   cls: 'wr-risk-unknown',  label: t('Insufficient Data', 'Insufficient Data') },
  }

  if (loading) return (
    <div className="wr-risk-card wr-risk-loading">
      <span className="wr-spinner"/>
      <p>{t("Calculating flood risk from IMD rainfall, dam/reservoir proximity, and NASA POWER data…", "Calculating flood risk from IMD rainfall, dam/reservoir proximity, and NASA POWER data…")}</p>
    </div>
  )

  if (error) return (
    <div className="wr-risk-card wr-risk-error">
      <AlertTriangle size={20}/>
      <p>{t(error, error)}</p>
    </div>
  )

  if (!data) return (
    <div className="wr-risk-card wr-risk-empty">
      <HelpCircle size={24}/>
      <p>{t("Select a location and enter state/district to calculate flood risk.", "Select a location and enter state/district to calculate flood risk.")}</p>
    </div>
  )

  const cfg = LEVEL_CONFIG[data.risk_level] || LEVEL_CONFIG.INSUFFICIENT_DATA

  return (
    <div className={`wr-risk-card ${cfg.cls}`}>
      {/* Header */}
      <div className="wr-risk-head">
        <span className="wr-risk-icon">{cfg.icon}</span>
        <div>
          <span className="wr-risk-eyebrow">{t("FLOOD RISK ESTIMATE", "FLOOD RISK ESTIMATE")} · {data.assessment_date}</span>
          <h3>{t(cfg.label, cfg.label)}</h3>
          <p>{t(data.summary, data.summary)}</p>
        </div>
      </div>

      {/* Evidence */}
      <div className="wr-risk-section">
        <span className="wr-risk-section-label">{t("EVIDENCE", "EVIDENCE")} ({data.evidence?.length || 0} {t("signals", "signals")})</span>
        <div className="wr-evidence-list">
          {(data.evidence || []).map((item, i) => <EvidenceRow key={i} item={item} />)}
        </div>
      </div>

      {/* Missing inputs */}
      {data.missing_inputs?.length > 0 && (
        <div className="wr-risk-section wr-missing-section">
          <span className="wr-risk-section-label">{t("MISSING INPUTS", "MISSING INPUTS")} ({data.missing_inputs.length})</span>
          <ul className="wr-missing-list">
            {data.missing_inputs.map((m, i) => <li key={i}>{t(m, m)}</li>)}
          </ul>
        </div>
      )}

      {/* Precautions */}
      <div className="wr-risk-section">
        <span className="wr-risk-section-label">{t("RECOMMENDED ACTIONS", "RECOMMENDED ACTIONS")}</span>
        <ul className="wr-precaution-list">
          {(data.precautions || []).map((p, i) => <li key={i}>{t(p, p)}</li>)}
        </ul>
      </div>

      {/* Official sources */}
      <div className="wr-risk-sources">
        {(data.official_sources || []).map(s => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{t(s.name, s.name)} ↗</a>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="wr-risk-disclaimer">
        <ShieldCheck size={13}/>
        <span>{t(data.disclaimer, data.disclaimer)}</span>
      </div>
    </div>
  )
}
