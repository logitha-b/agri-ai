import { useLanguage } from '../context/LanguageContext'
/**
 * CropLossInsurance — /loss-insurance route.
 *
 * 6-step workflow:
 *   1  Damage Report Form
 *   2  AI Assessment (production loss)
 *   3  Financial Loss (AGMARKNET prices)
 *   4  Insurance Assistant (PMFBY + checklist)
 *   5  Recovery Advisor
 *   6  Claim Tracker + Report Export
 *
 * All data flows through POST /api/loss/assess on port 8003.
 * Storage: browser state only + HTML download.
 */

import { useRef, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ClipboardList,
  Download, FileText, IndianRupee, Loader, RefreshCw, Shield, Sprout, Sparkles
} from 'lucide-react'
import { Button, Notice, PageHeader } from '../components'
import DamageForm        from '../components/loss/DamageForm'
import LossAssessment    from '../components/loss/LossAssessment'
import FinancialLoss     from '../components/loss/FinancialLoss'
import InsuranceAssistant from '../components/loss/InsuranceAssistant'
import RecoveryAdvisor   from '../components/loss/RecoveryAdvisor'
import ClaimTracker      from '../components/loss/ClaimTracker'

const API = (import.meta.env.VITE_CROP_HEALTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const STEPS = [
  { id: 0, label: 'Report Damage',  icon: FileText },
  { id: 1, label: 'AI Assessment',  icon: ClipboardList },
  { id: 2, label: 'Financial Loss', icon: IndianRupee },
  { id: 3, label: 'Insurance',      icon: Shield },
  { id: 4, label: 'Recovery',       icon: Sprout },
  { id: 5, label: 'Track & Export', icon: Download },
]

// ── Report HTML export ────────────────────────────────────────────────────────

export function buildReportHtml(assessment, claims) {
  if (!assessment) return ''
  const { incident, growth_stage, reference_yield, weather_evidence,
          flood_evidence, production_loss, financial_loss, insurance,
          document_checklist, recovery_recommendations, generated_date, disclaimer } = assessment

  const fin  = financial_loss
  const rs   = v => v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—'
  const na   = v => v ?? '—'
  const claimsHtml = claims?.length
    ? claims.map(c => `<tr><td>${c.scheme||'—'}</td><td>${c.ref||'—'}</td><td>${c.submitted_date||'—'}</td><td>${c.status||'—'}</td><td>${c.notes||'—'}</td></tr>`).join('')
    : '<tr><td colspan="5">No claims recorded.</td></tr>'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Crop Loss Assessment Report — ${incident?.crop} ${generated_date}</title>
<style>
  body{font-family:Georgia,serif;max-width:860px;margin:40px auto;padding:0 24px;color:#2a2a2a;line-height:1.6}
  h1{font-size:28px;margin:0 0 6px;color:#1a4430}
  h2{font-size:16px;color:#1a4430;border-bottom:2px solid #1a4430;padding-bottom:4px;margin:28px 0 10px}
  h3{font-size:13px;color:#3a6b4f;margin:16px 0 6px}
  .cover{background:linear-gradient(135deg,#1a4430,#285a3e);color:white;padding:32px;border-radius:8px;margin-bottom:32px}
  .cover h1{color:white;font-size:30px}
  .cover .disc{font-size:11px;color:#d0e4d0;margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,.2)}
  table{width:100%;border-collapse:collapse;font-size:12px;margin:10px 0}
  th{background:#f0f5ef;text-align:left;padding:8px;border:1px solid #d4e2d4;font-size:11px;color:#3a6b4f;letter-spacing:.03em}
  td{padding:8px;border:1px solid #e0e8e0;vertical-align:top}
  tr.loss{background:#fff4f0}
  tr.total{background:#f0f5ef;font-weight:bold}
  .badge{display:inline-block;padding:2px 7px;border-radius:12px;font-size:10px;font-weight:bold}
  .badge-est{background:#fff3cd;color:#856404}
  .badge-meas{background:#d1ecf1;color:#0c5460}
  .warn{background:#fff3cd;border:1px solid #ffc107;padding:10px 14px;border-radius:6px;font-size:12px;margin:10px 0}
  .ok{background:#d4edda;border:1px solid #28a745;padding:10px 14px;border-radius:6px;font-size:12px;margin:10px 0}
  ul,ol{font-size:12px;padding-left:18px;margin:6px 0}
  li{margin-bottom:4px}
  .evidence{font-size:11px;color:#3a6b4f;margin:4px 0;padding:4px 8px;background:#f0f5ef;border-radius:4px}
  a{color:#1a4430}
</style>
</head>
<body>
<div class="cover">
  <div style="font-size:11px;letter-spacing:.12em;color:#d0e4d0">AI-ASSISTED CROP LOSS ASSESSMENT</div>
  <h1>${incident?.crop} — Crop Loss Report</h1>
  <p style="color:#d0e4d0;font-size:13px">${incident?.incident_type?.replace('_',' ')} · ${incident?.season} ${incident?.incident_date||''} · ${incident?.location?.district||''}, ${incident?.location?.state||''}</p>
  <div class="disc">${disclaimer}</div>
</div>

<h2>1. Incident Details</h2>
<table>
  <tr><th>Crop</th><td>${na(incident?.crop)}</td><th>Variety</th><td>${na(incident?.variety)}</td></tr>
  <tr><th>Season</th><td>${na(incident?.season)}</td><th>Sowing Date</th><td>${na(incident?.sowing_date)}</td></tr>
  <tr><th>Incident Date</th><td>${na(incident?.incident_date)}</td><th>Incident Type</th><td>${na(incident?.incident_type?.replace('_',' '))}</td></tr>
  <tr><th>Damage Severity</th><td>${na(incident?.damage_severity)}</td><th>State / District</th><td>${na(incident?.location?.state)} / ${na(incident?.location?.district)}</td></tr>
  <tr><th colspan="2">Description</th><td colspan="2">${na(incident?.description)}</td></tr>
</table>

<h2>2. Growth Stage</h2>
${growth_stage?.available
  ? `<p><b>${growth_stage.stage_name}</b> — Day ${growth_stage.days_after_sowing} of ${growth_stage.total_crop_days} (${growth_stage.progress_pct}% through cycle)</p><p style="font-size:11px">Source: ${growth_stage.source}</p>`
  : `<p class="warn">${growth_stage?.note||'Growth stage unavailable.'}</p>`}

<h2>3. Weather Evidence <span class="badge badge-meas">MEASURED DATA</span></h2>
${weather_evidence?.evidence_lines?.map(l => `<div class="evidence">${l}</div>`).join('') || '<p>Weather data unavailable.</p>'}
<p style="font-size:11px">${weather_evidence?.note||''}</p>

<h2>4. Flood Risk</h2>
${flood_evidence?.available
  ? `<p>Risk level: <b>${flood_evidence.flood_risk_level}</b> (score ${flood_evidence.flood_risk_score}/100)</p>
     ${flood_evidence.risk_factors?.map(f => `<div class="evidence">${f}</div>`).join('')||''}
     <p style="font-size:11px">${flood_evidence.note||''}</p>`
  : `<p>Flood risk data unavailable.</p>`}

<h2>5. Production Loss Estimate <span class="badge badge-est">ESTIMATED</span></h2>
${production_loss?.available ? `
<table>
  <tr><th>Total cultivated area</th><td>${production_loss.total_area_acres} acres (${production_loss.total_area_ha} ha)</td></tr>
  <tr><th>Affected area</th><td>${production_loss.affected_area_acres} acres (${production_loss.affected_area_ha} ha) — ${production_loss.affected_area_pct}%</td></tr>
  <tr><th>Reference yield</th><td>${production_loss.reference_yield_t_ha} t/ha</td></tr>
  <tr><th>Expected production</th><td>${production_loss.expected_production_t} tonnes</td></tr>
  <tr class="loss"><th>Estimated production loss</th><td><b>${production_loss.estimated_loss_t} tonnes (${production_loss.loss_pct_of_total}%)</b></td></tr>
  <tr><th>Estimated remaining</th><td>${production_loss.estimated_remaining_t} tonnes</td></tr>
  <tr><th>Damage % (affected area)</th><td>${production_loss.adjusted_damage_pct_on_affected}%</td></tr>
</table>
<p style="font-size:11px">${production_loss.note}</p>
` : `<p class="warn">${production_loss?.reason||'Production loss estimate unavailable.'}</p>`}

<h2>6. Financial Loss Estimate <span class="badge badge-est">ESTIMATED</span></h2>
${fin?.available ? `
<table>
  ${fin.expected_crop_value_rs!=null?`<tr><th>Expected crop value (pre-damage)</th><td>${rs(fin.expected_crop_value_rs)}</td></tr>`:''}
  ${fin.estimated_lost_value_rs!=null?`<tr class="loss"><th>Estimated value of lost production</th><td><b>${rs(fin.estimated_lost_value_rs)}</b></td></tr>`:''}
  ${fin.cultivation_cost_total_rs!=null?`<tr><th>Cultivation cost (total field)</th><td>${rs(fin.cultivation_cost_total_rs)}</td></tr>`:''}
  <tr><th>Estimated recovery costs</th><td>${rs(fin.estimated_recovery_cost_rs)}</td></tr>
  ${fin.total_economic_impact_rs!=null?`<tr class="total"><th>Total estimated economic impact</th><td>${rs(fin.total_economic_impact_rs)}</td></tr>`:''}
</table>
<p style="font-size:11px">Market price: ₹${fin.market_price?.modal_rs_per_quintal}/quintal — ${fin.market_price?.markets_sampled} markets sampled — ${fin.market_price?.date_range}</p>
<p style="font-size:11px">${fin.note}</p>
` : `<p class="warn">${fin?.reason||'Financial loss data unavailable.'}</p>`}

<h2>7. Insurance Information</h2>
<p>${insurance?.important_notice}</p>
<h3>PMFBY Indicative Premium Note</h3>
<p style="font-size:12px">${insurance?.pmfby_premium_note||''}</p>
<h3>Official Links</h3>
<ul>${insurance?.official_links?.map(l => `<li><a href="${l.url}">${l.name}</a></li>`).join('')||''}</ul>

<h2>8. Document Checklist</h2>
<table>
  <tr><th>Document</th><th>Required</th><th>Status</th><th>Note</th></tr>
  ${document_checklist?.checklist?.map(d => `<tr><td>${d.name}</td><td>${d.required?'Yes':'No'}</td><td>${d.present?'✓ Present':'✗ Missing'}</td><td style="font-size:10px">${d.note}</td></tr>`).join('')||''}
</table>
<h3>Reporting Deadlines</h3>
${document_checklist?.deadlines?.map(dl => `<div class="warn"><b>${dl.rule}</b><br>${dl.requirement}${dl.note?'<br><i>'+dl.note+'</i>':''}</div>`).join('')||'<p>Enter incident date to calculate deadlines.</p>'}

<h2>9. Recovery Recommendations</h2>
<ol>
  ${recovery_recommendations?.map(r => `<li><b>${r.action}</b> <em>(${r.urgency})</em><br>${r.reason}<br><small>Source: ${r.source}</small></li>`).join('')||'<li>No recommendations available.</li>'}
</ol>

<h2>10. Claim Tracking Log</h2>
<table>
  <tr><th>Scheme</th><th>Reference</th><th>Submitted</th><th>Status</th><th>Notes</th></tr>
  ${claimsHtml}
</table>
<p class="warn">Claim status is farmer-entered only — not verified by any insurer or government authority.</p>

<hr style="margin:32px 0;border:1px solid #d4e2d4">
<p style="font-size:10px;color:#6c786e">Generated: ${generated_date} · Agri-Economic Intelligence Platform · AI-assisted estimate only · Source: ICRISAT, NASA POWER, IMD, AGMARKNET, PMFBY official portal</p>
</body></html>`
}

// ── Step progress bar ─────────────────────────────────────────────────────────

function StepBar({ currentStep, onStep, assessmentDone }) {
  const { t } = useLanguage()
  return (
    <div className="loss-step-bar">
      {STEPS.map(s => {
        const done    = s.id < currentStep || (s.id === 0 && assessmentDone)
        const active  = s.id === currentStep
        const allowed = s.id === 0 || assessmentDone
        const Icon    = s.icon
        return (
          <button
            key={s.id}
            className={`loss-step ${active ? 'active' : ''} ${done ? 'done' : ''} ${!allowed ? 'locked' : ''}`}
            onClick={() => allowed && onStep(s.id)}
            disabled={!allowed}
            aria-current={active ? 'step' : undefined}
          >
            <span className="loss-step-dot">
              {done ? <CheckCircle2 size={14} /> : <Icon size={14} />}
            </span>
            <span className="loss-step-label">{t(s.label, s.label)}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CropLossInsurance() {
  const { t, language } = useLanguage()
  const [step, setStep]           = useState(0)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [formData, setFormData]   = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [claims, setClaims]       = useState([])
  const reportRef = useRef(null)

  const runAssessment = async (data) => {
    setFormData(data)
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/loss/assess?language=${language}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Platform-Language': language, 'Accept-Language': language },
        body:    JSON.stringify({ ...data, language }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || `API error ${res.status}`)
      setAssessment(json)
      setStep(1)
    } catch (err) {
      setError(err.message || 'Assessment failed. Check that the backend server is running on port 8003.')
    } finally {
      setLoading(false)
    }
  }

  const loadSampleDamage = () => {
    const sow = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10)
    const inc = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
    const sample = {
      address: 'Ponneri, Thiruvallur, Tamil Nadu',
      state: 'Tamil Nadu',
      district: 'Thiruvallur',
      lat: 13.3364,
      lng: 80.1932,
      crop: 'Paddy',
      variety: 'BPT 5204 (Samba Mahsuri)',
      season: 'Kharif',
      sowing_date: sow,
      total_area_acres: 2.5,
      affected_area_acres: 1.5,
      incident_date: inc,
      incident_type: 'flood',
      damage_severity: 'high',
      damage_description: 'Severe waterlogging for 48 hours following localized heavy monsoon downpour during active tillering stage. Submerged lower field parcels.',
      has_photos: true,
      farmer_name: 'R. Kumar',
      insurance_scheme: 'PMFBY',
      policy_ref: 'PMFBY-TN-2026-449102',
    }
    runAssessment(sample)
  }

  const downloadReport = () => {
    const html = buildReportHtml(assessment, claims)
    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `crop-loss-report-${assessment?.incident?.crop?.toLowerCase()}-${assessment?.generated_date}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page loss-page">
      <PageHeader
        eyebrow={t("CROP LOSS & INSURANCE", "CROP LOSS & INSURANCE")}
        title={t("Crop Loss Assessment", "Crop Loss Assessment")}
        description={t("Report crop damage, assess production loss, understand PMFBY insurance options, and track your claim.")}
      >
        <button
          className="button"
          type="button"
          onClick={loadSampleDamage}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
            border: 'none',
            fontWeight: 600,
          }}
          title={t("Auto-fill sample data and run loss assessment", "Auto-fill sample data and run loss assessment")}
        >
          <Sparkles size={14} />
          {t('Load sample data', 'Load sample data')}
        </button>
        {assessment && (
          <button className="button secondary" onClick={downloadReport} title="Download HTML report">
            <Download size={15}/> {t("Download report", "Download report")}
          </button>
        )}
        {assessment && (
          <button className="button secondary" onClick={() => { setStep(0); setAssessment(null); setFormData(null); setError('') }}>
            <RefreshCw size={14}/> {t("New assessment", "New assessment")}
          </button>
        )}
      </PageHeader>

      {/* Step bar */}
      <StepBar currentStep={step} onStep={setStep} assessmentDone={!!assessment} />

      {/* Loading overlay */}
      {loading && (
        <div className="loss-loading">
          <Loader size={28} className="spin" />
          <div>
            <b>{t("Running assessment…", "Running assessment…")}</b>
            <p>{t("Fetching weather, rainfall, flood risk, yield, and market data in parallel.")}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="loss-api-error">
          <AlertTriangle size={16} />
          <div>
            <b>{t("Assessment failed", "Assessment failed")}</b>
            <p>{error}</p>
          </div>
          <button className="button secondary" onClick={() => formData && runAssessment(formData)}>
            {t("Retry", "Retry")} <ArrowRight size={14}/>
          </button>
        </div>
      )}

      {/* Step content */}
      {!loading && (
        <>
          {step === 0 && (
            <DamageForm onSubmit={runAssessment} initialValues={formData || {}} />
          )}

          {step === 1 && assessment && (
            <LossAssessment assessment={assessment} />
          )}

          {step === 2 && assessment && (
            <FinancialLoss assessment={assessment} />
          )}

          {step === 3 && assessment && (
            <InsuranceAssistant assessment={assessment} />
          )}

          {step === 4 && assessment && (
            <RecoveryAdvisor assessment={assessment} />
          )}

          {step === 5 && assessment && (
            <div className="page">
              <ClaimTracker claims={claims} onClaimsChange={setClaims} />
              <div className="card">
                <div className="card-header">
                  <div>
                    <h2>{t("Download Full Report", "Download Full Report")}</h2>
                    <p>{t("HTML report with all findings, evidence, financial estimates, insurance information, and claim log.", "HTML report with all findings, evidence, financial estimates, insurance information, and claim log.")}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                  <button className="button" onClick={downloadReport}>
                    <Download size={15}/> {t("Download HTML Report", "Download HTML Report")}
                  </button>
                </div>
                <div className="inline-feedback" style={{ marginTop: 14 }}>
                  <AlertTriangle size={14} />
                  <span>
                    {t(
                      "This report is an AI-assisted estimate only. It is NOT an official damage certificate, approved insurance claim, or legal document. All estimates must be verified by qualified personnel for insurance purposes.",
                      "This report is an AI-assisted estimate only. It is NOT an official damage certificate, approved insurance claim, or legal document. All estimates must be verified by qualified personnel for insurance purposes."
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bottom navigation */}
      {!loading && assessment && step > 0 && (
        <div className="loss-nav-row">
          <button className="button secondary" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft size={15}/> {t("Previous", "Previous")}
          </button>
          {step < STEPS.length - 1 && (
            <button className="button" onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}>
              {t("Next", "Next")} <ArrowRight size={15}/>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

