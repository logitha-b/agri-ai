import { useLanguage } from '../../context/LanguageContext'
/**
 * LossAssessment — Step 2: Shows the AI-powered damage assessment results.
 * Displays weather evidence, flood risk, growth stage, and production loss estimate.
 */
import { AlertTriangle, CheckCircle2, Cloud, CloudRain, Leaf, TrendingDown, TriangleAlert, Waves } from 'lucide-react'
import { Card, Notice, Progress, RiskBadge } from '../../components'

function DataBadge({ kind }) {
  const { t } = useLanguage()
  const cfg = {
    measured:    { label: t('MEASURED DATA'),    cls: 'loss-badge-measured' },
    calculated:  { label: t('CALCULATED'),        cls: 'loss-badge-calc' },
    estimated:   { label: t('ESTIMATED'),         cls: 'loss-badge-est' },
    unavailable: { label: t('DATA UNAVAILABLE'), cls: 'loss-badge-unavail' },
  }[kind] || { label: kind?.toUpperCase() || 'DATA', cls: 'loss-badge-est' }
  return <span className={`loss-data-badge ${cfg.cls}`}>{cfg.label}</span>
}

function EvidenceLine({ text, supporting }) {
  const { t } = useLanguage()
  return (
    <div className="loss-evidence-line">
      {supporting
        ? <CheckCircle2 size={13} className="loss-ev-yes" />
        : <Cloud size={13} className="loss-ev-neutral" />}
      <span>{t(text, text)}</span>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, badge }) {
  const { t } = useLanguage()
  return (
    <div className="loss-section-header">
      <span className="loss-section-icon"><Icon size={16} /></span>
      <b>{t(title, title)}</b>
      {badge}
    </div>
  )
}

export default function LossAssessment({ assessment }) {
  const { t } = useLanguage()
  if (!assessment) return null

  const { incident, growth_stage, reference_yield, weather_evidence,
          flood_evidence, production_loss } = assessment

  const hasWeather   = weather_evidence?.evidence_lines?.length > 0
  const hasFlood     = flood_evidence?.available
  const hasGrowth    = growth_stage?.available
  const hasLoss      = production_loss?.available
  const wxSupporting = weather_evidence?.supporting_weather_claim

  return (
    <div className="page">
      {/* Disclaimer */}
      <Notice>
        This is an AI-assisted assessment, NOT an official damage certificate or approved
        insurance claim. Insurance eligibility and compensation are determined solely by the
        insurer and relevant government authority. Official crop-cutting experiments are required
        for insurance claims.
      </Notice>

      {/* Summary stats */}
      {hasLoss && (
        <div className="stats-grid four">
          <article className="stat-card">
            <div className="stat-label">Expected Production<span className="stat-glyph"><Leaf size={16}/></span></div>
            <strong className="stat-value">{production_loss.expected_production_t} t</strong>
            <div className="stat-foot"><span>{production_loss.total_area_ha} ha total area</span></div>
          </article>
          <article className="stat-card">
            <div className="stat-label">Estimated Loss<span className="stat-glyph amber"><TrendingDown size={16}/></span></div>
            <strong className="stat-value">{production_loss.estimated_loss_t} t</strong>
            <div className="stat-foot"><b className="down">{production_loss.loss_pct_of_total}% of total</b></div>
          </article>
          <article className="stat-card">
            <div className="stat-label">Remaining Crop<span className="stat-glyph"><CheckCircle2 size={16}/></span></div>
            <strong className="stat-value">{production_loss.estimated_remaining_t} t</strong>
            <div className="stat-foot"><span>Estimated surviving production</span></div>
          </article>
          <article className="stat-card">
            <div className="stat-label">Affected Area<span className="stat-glyph blue"><Waves size={16}/></span></div>
            <strong className="stat-value">{production_loss.affected_area_pct}%</strong>
            <div className="stat-foot"><span>{production_loss.affected_area_acres} of {production_loss.total_area_acres} acres</span></div>
          </article>
        </div>
      )}

      {/* Growth stage */}
      <Card
        title="Growth Stage at Time of Incident"
        subtitle={hasGrowth ? `Based on sowing date and incident date. Source: ${growth_stage.source}` : 'Growth stage unavailable'}
        action={hasGrowth ? <DataBadge kind={growth_stage.data_kind} /> : null}
      >
        {hasGrowth ? (
          <div className="loss-growth-block">
            <div className="loss-growth-label">
              <b>{growth_stage.stage_name}</b>
              <span>Day {growth_stage.days_after_sowing} of {growth_stage.total_crop_days}</span>
            </div>
            <div className="progress-track" style={{ marginTop: 8 }}>
              <i style={{ width: `${growth_stage.progress_pct}%`, background: '#4a875b' }} />
            </div>
            <small className="loss-note">{growth_stage.progress_pct}% through crop cycle</small>
          </div>
        ) : (
          <p className="loss-unavail">{growth_stage?.note || 'Sowing date or incident date not provided.'}</p>
        )}
      </Card>

      {/* Reference yield */}
      <Card
        title="Reference Yield Used for Estimate"
        subtitle="Used to compute expected production before damage."
        action={<DataBadge kind={reference_yield?.data_kind} />}
      >
        {reference_yield?.available ? (
          <>
            <div className="loss-yield-row">
              <b className="loss-big-num">{reference_yield.yield_t_ha} t/ha</b>
              <span>{reference_yield.geographic_level} — {reference_yield.years || ''}</span>
            </div>
            <p className="loss-note">{reference_yield.note}</p>
            <p className="loss-source">Source: {reference_yield.source}</p>
          </>
        ) : (
          <p className="loss-unavail">{reference_yield?.note || 'Reference yield data unavailable.'}</p>
        )}
      </Card>

      {/* Weather evidence */}
      <Card
        title={t("Weather Evidence")}
        subtitle="NASA POWER 30-day climate data and IMD district rainfall."
        action={<span className={`loss-weather-indicator ${wxSupporting ? 'supporting' : 'neutral'}`}>{wxSupporting ? '⚡ Supports claim' : 'ℹ Neutral / insufficient'}</span>}
      >
        <SectionHeader icon={CloudRain} title="Observed climate signals" badge={<DataBadge kind="measured" />} />
        {hasWeather ? (
          <div className="loss-evidence-block">
            {weather_evidence.evidence_lines.map((line, i) => (
              <EvidenceLine key={i} text={line} supporting={wxSupporting && i === 0} />
            ))}
          </div>
        ) : (
          <p className="loss-unavail">Weather data could not be retrieved for this location.</p>
        )}
        <p className="loss-note" style={{ marginTop: 10 }}>{weather_evidence?.note}</p>
      </Card>

      {/* Flood risk evidence */}
      {hasFlood && (
        <Card
          title="Flood & Waterlogging Risk"
          subtitle="Based on location, nearby dams/reservoirs, and rainfall data."
          action={<DataBadge kind={flood_evidence.data_kind} />}
        >
          <div className="loss-flood-header">
            <RiskBadge value={flood_evidence.flood_risk_level} />
            <span className="loss-flood-score">Score: {flood_evidence.flood_risk_score}/100</span>
            {flood_evidence.relevant_to_claim && (
              <span className="loss-badge-relevant">Relevant to this claim type</span>
            )}
          </div>
          {flood_evidence.risk_factors?.length > 0 && (
            <div className="loss-factors">
              {flood_evidence.risk_factors.map((f, i) => (
                <div key={i} className="loss-factor-item">
                  <TriangleAlert size={12} /> {f}
                </div>
              ))}
            </div>
          )}
          <p className="loss-note" style={{ marginTop: 8 }}>{flood_evidence.note}</p>
        </Card>
      )}

      {/* Production loss detail */}
      {hasLoss && (
        <Card
          title={t("Production Loss Estimate")}
          subtitle="Estimate based on reference yield, affected area, and damage severity."
          action={<DataBadge kind="estimated" />}
        >
          <Progress label="Loss as % of expected production" value={production_loss.loss_pct_of_total} color="amber" />
          <div className="loss-table-simple" style={{ marginTop: 14 }}>
            <div className="loss-row"><span>Total cultivated area</span><b>{production_loss.total_area_acres} acres ({production_loss.total_area_ha} ha)</b></div>
            <div className="loss-row"><span>Affected area</span><b>{production_loss.affected_area_acres} acres ({production_loss.affected_area_ha} ha)</b></div>
            <div className="loss-row"><span>Reference yield</span><b>{production_loss.reference_yield_t_ha} t/ha</b></div>
            <div className="loss-row"><span>Expected production (total field)</span><b>{production_loss.expected_production_t} tonnes</b></div>
            <div className="loss-row loss-row-loss"><span>Estimated production loss</span><b>{production_loss.estimated_loss_t} tonnes</b></div>
            <div className="loss-row"><span>Estimated remaining production</span><b>{production_loss.estimated_remaining_t} tonnes</b></div>
            <div className="loss-row"><span>Damage % applied (affected area)</span><b>{production_loss.adjusted_damage_pct_on_affected}%</b></div>
          </div>
          <div className="loss-assumptions" style={{ marginTop: 12 }}>
            <b>Assumptions</b>
            <ul>
              {production_loss.assumptions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
          <div className="inline-feedback" style={{ marginTop: 12 }}>
            <AlertTriangle size={15} />
            <span>{production_loss.note}</span>
          </div>
        </Card>
      )}

      {!hasLoss && (
        <div className="inline-feedback">
          <AlertTriangle size={15} />
          <span>Production loss estimate unavailable: {production_loss?.reason || 'Insufficient data. Ensure crop name and area are provided.'}</span>
        </div>
      )}
    </div>
  )
}
