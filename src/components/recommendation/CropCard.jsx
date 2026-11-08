import { useLanguage } from '../../context/LanguageContext'
import { useState } from 'react'
import { ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'
import { DimensionBars, FinalScoreBadge } from './ScoreBar'
import { getLocalizedCropExplanation } from '../../utils/cropExplanationLocalizer'

const money = v => v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`
const fmt   = (v, unit) => v == null ? '—' : `${v} ${unit}`

const KIND_BADGE = {
  measured:    { cls: 'rc-kind-measured',  label: 'REAL DATA' },
  calculated:  { cls: 'rc-kind-calc',      label: 'CALCULATED' },
  estimated:   { cls: 'rc-kind-est',       label: 'ESTIMATED' },
  sample:      { cls: 'rc-kind-sample',    label: 'SAMPLE' },
  unavailable: { cls: 'rc-kind-na',        label: 'UNAVAILABLE' },
}
function KBadge({ kind, t }) {
  const { cls, label } = KIND_BADGE[kind] || KIND_BADGE.unavailable
  return <span className={`rc-kind-badge ${cls}`}>{t ? t(label, label) : label}</span>
}

function Row({ label, value, note, kind, t }) {
  return (
    <div className="rc-detail-row">
      <span>{label}</span>
      <div>
        <b>{value ?? '—'}</b>
        {note && <small>{t ? t(note, note) : note}</small>}
        {kind && <KBadge kind={kind} t={t} />}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rc-section">
      <div className="rc-section-title">{title}</div>
      {children}
    </div>
  )
}

export default function CropCard({ result, rank }) {
  const { t, language } = useLanguage()
  const [expanded, setExpanded] = useState(rank === 1)

  const soil   = result.soil    || {}
  const weather= result.weather || {}
  const water  = result.water   || {}
  const flood  = result.flood   || {}
  const yld    = result.yield   || {}
  const mkt    = result.market  || {}
  const econ   = result.economics || {}

  const floodColors = {
    ELEVATED_RISK: { border: '#fecaca', bg: '#fff5f5', text: '#991b1b' },
    OBSERVED_FLOODING: { border: '#fca5a5', bg: '#fee2e2', text: '#7f1d1d' },
    NO_ELEVATED_RISK: { border: '#bbf7d0', bg: '#f0fdf4', text: '#166534' },
    INSUFFICIENT_DATA: { border: '#e2e8f0', bg: '#f8fafc', text: '#64748b' },
  }
  const floodStyle = floodColors[flood.flood_risk_level] || floodColors.INSUFFICIENT_DATA
  const localizedExp = getLocalizedCropExplanation(result, language) || t(result.explanation, result.explanation)

  return (
    <div className={`rc-crop-card ${rank === 1 ? 'rc-card-top' : ''}`}>
      {/* ── Card header ── */}
      <div className="rc-card-head">
        <div className="rc-card-title">
          <span className="rc-crop-icon">
            {result.crop === 'Paddy' ? '🌾' : result.crop === 'Groundnut' ? '🥜' :
             result.crop === 'Maize' ? '🌽' : result.crop === 'Tomato' ? '🍅' : '🌿'}
          </span>
          <div>
            <b>{t(result.crop, result.crop)}</b>
            <small>{t(result.season, result.season)} {t('season', 'season')}</small>
          </div>
        </div>
        <FinalScoreBadge score={result.final_score} rank={rank} />
        <button className="rc-expand-btn" onClick={() => setExpanded(v => !v)} aria-label="Toggle details">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* ── Dimension score bars (always visible) ── */}
      <DimensionBars scores={result.scores} />

      {/* ── Explanation summary ── */}
      <div className="rc-explanation">
        <span className="rc-eyebrow">{t('WHY THIS RECOMMENDATION', 'WHY THIS RECOMMENDATION')}</span>
        <p>{localizedExp}</p>
      </div>

      {/* ── Expandable details ── */}
      {expanded && (
        <div className="rc-details">

          {/* Agronomic */}
          <Section title={`🌱 ${t('Agronomic Assessment', 'Agronomic Assessment')}`}>
            <Row label={t('Soil suitability', 'Soil suitability')}
                 value={`${Math.round((soil.score || 0) * 100)}/100`}
                 note={soil.form_soil_type ? `${t(soil.form_soil_type, soil.form_soil_type)} — ${t(soil.note, soil.note)}` : undefined}
                 kind={soil.data_kind}
                 t={t} />
            {(soil.flags || []).map((f, i) => (
              <div key={i} className="rc-flag rc-flag-warn">⚠ {t(f, f)}</div>
            ))}
            {(soil.nutrient_notes || []).map((n, i) => (
              <div key={i} className="rc-flag rc-flag-info">ℹ {t(n, n)}</div>
            ))}
            <Row label={t('Weather suitability', 'Weather suitability')}
                 value={`${Math.round((weather.score || 0) * 100)}/100`}
                 note={`${weather.total_rain_30d_mm != null ? weather.total_rain_30d_mm + ' mm / 30 days' : ''} ${weather.avg_temp_c != null ? '· avg ' + weather.avg_temp_c + '°C' : ''}`}
                 kind={weather.data_kind}
                 t={t} />
            {(weather.flags || []).map((f, i) => (
              <div key={i} className="rc-flag rc-flag-warn">⚠ {t(f, f)}</div>
            ))}
            <Row label={t('Water / Irrigation', 'Water / Irrigation')}
                 value={`${Math.round((water.score || 0) * 100)}/100`}
                 note={`${t(water.irrigation || '', water.irrigation || '')} · ${t(water.water_avail || '', water.water_avail || '')}`}
                 kind={water.data_kind}
                 t={t} />
          </Section>

          {/* Flood */}
          <Section title={`🌊 ${t('Flood & Water Risk', 'Flood & Water Risk')}`}>
            <div className="rc-flood-pill" style={{ background: floodStyle.bg, borderColor: floodStyle.border, color: floodStyle.text }}>
              {t(flood.flood_risk_level?.replace(/_/g, ' ') || 'INSUFFICIENT DATA', flood.flood_risk_level?.replace(/_/g, ' ') || 'INSUFFICIENT DATA')}
            </div>
            <Row label={t('Waterlogging sensitivity', 'Waterlogging sensitivity')}
                 value={flood.waterlogging_sensitivity != null ? `${flood.waterlogging_sensitivity * 10}/10` : '—'}
                 kind={flood.data_kind}
                 t={t} />
            {flood.note && <p className="rc-note">{t(flood.note, flood.note)}</p>}
          </Section>

          {/* Yield */}
          <Section title={`📊 ${t('Historical Yield', 'Historical Yield')}`}>
            {yld.available ? (
              <>
                <Row label={t('Mean yield', 'Mean yield')}    value={fmt(yld.mean_yield_t_ha,   't/ha')} kind="measured" t={t} />
                <Row label={t('Median yield', 'Median yield')}  value={fmt(yld.median_yield_t_ha, 't/ha')} t={t} />
                <Row label={t('Range', 'Range')}         value={`${yld.min_yield_t_ha}–${yld.max_yield_t_ha} t/ha`} t={t} />
                <Row label={t('Variability', 'Variability')}   value={yld.cv_pct != null ? `${yld.cv_pct}% CV` : '—'} note={t('Higher CV = more variable year-to-year', 'Higher CV = more variable year-to-year')} t={t} />
                <Row label={t('Source', 'Source')}        value={t(yld.geographic_level, yld.geographic_level)} note={`${yld.n_observations} observations · ${yld.years}`} t={t} />
                {yld.note && <p className="rc-note">{t(yld.note, yld.note)}</p>}
              </>
            ) : (
              <div className="rc-unavail">{t(yld.reason || 'Historical yield data unavailable.', yld.reason || 'Historical yield data unavailable.')}</div>
            )}
          </Section>

          {/* Market */}
          <Section title={`💰 ${t('Market Prices (AGMARKNET)', 'Market Prices (AGMARKNET)')}`}>
            {mkt.available ? (
              <>
                <Row label={t('Modal price', 'Modal price')}   value={`₹${mkt.modal_price_rs_per_quintal}/quintal`} kind="measured" t={t} />
                <Row label={t('Price range', 'Price range')}   value={`₹${mkt.min_price_rs_per_quintal}–₹${mkt.max_price_rs_per_quintal}/quintal`} t={t} />
                <Row label={t('Per kg', 'Per kg')}        value={`₹${mkt.price_rs_per_kg}/kg`} t={t} />
                <Row label={t('Markets', 'Markets')}       value={`${mkt.markets_sampled} ${t('markets', 'markets')}`} note={mkt.date_range} t={t} />
                {mkt.note && <p className="rc-note">{t(mkt.note, mkt.note)}</p>}
              </>
            ) : (
              <div className="rc-unavail">{t('No AGMARKNET price data for this crop.')}</div>
            )}
          </Section>

          {/* Economics */}
          <Section title={`📈 ${t('Economic Estimate', 'Economic Estimate')}`}>
            {econ.available ? (
              <>
                <Row label={t('Farm area', 'Farm area')}         value={`${econ.area_acres} ${t('acres', 'acres')} (${econ.area_ha} ha)`} t={t} />
                <Row label={t('Estimated yield', 'Estimated yield')}   value={`${econ.total_yield_t} t total`} note={`@ ${econ.yield_t_ha} t/ha`} kind={econ.yield_data_kind} t={t} />
                <Row label={t('Est. revenue', 'Est. revenue')}      value={money(econ.estimated_revenue_inr)} kind={econ.price_data_kind} t={t} />
                <Row label={t('Est. cost', 'Est. cost')}         value={money(econ.estimated_cost_inr)} note={t(econ.cost_source, econ.cost_source)} kind="estimated" t={t} />
                <Row label={t('Est. net return', 'Est. net return')}   value={money(econ.estimated_net_return_inr)} t={t} />
                <Row label={t('Net / acre', 'Net / acre')}        value={money(econ.net_return_per_acre_inr)} t={t} />
                <div className={`rc-budget-pill ${econ.budget_ok ? 'rc-budget-ok' : 'rc-budget-warn'}`}>
                  {econ.budget_ok
                    ? `✅ ${t('Within budget')} — ${t('uses')} ${econ.budget_utilisation_pct}% of ₹${Number(econ.budget_available_inr).toLocaleString('en-IN')}`
                    : `⚠ ${t('Exceeds budget')} — ${t('needs')} ₹${Number(econ.budget_required_inr).toLocaleString('en-IN')}, ${t('have')} ₹${Number(econ.budget_available_inr).toLocaleString('en-IN')}`}
                </div>
                {econ.disclaimer && <p className="rc-note">{t(econ.disclaimer, econ.disclaimer)}</p>}
                {econ.assumptions && (
                  <details className="rc-assumptions">
                    <summary>{t('Assumptions', 'Assumptions')}</summary>
                    <p>{t(econ.assumptions, econ.assumptions)}</p>
                  </details>
                )}
              </>
            ) : (
              <div className="rc-unavail">{t(econ.reason || 'Economic estimate unavailable.', econ.reason || 'Economic estimate unavailable.')}</div>
            )}
          </Section>

          {/* Disclaimer */}
          <div className="rc-card-disclaimer">
            <ShieldCheck size={13} />
            <span>
              {t('Scores are rules-based estimates using documented agronomic thresholds. Not a validated forecasting model. Confirm all decisions with your local agricultural extension officer or Krishi Vigyan Kendra.', 'Scores are rules-based estimates using documented agronomic thresholds. Not a validated forecasting model. Confirm all decisions with your local agricultural extension officer or Krishi Vigyan Kendra.')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
