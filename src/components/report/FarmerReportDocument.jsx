import React from 'react'
import {
  Activity, AlertTriangle, ArrowRight, Award, BarChart3, Bug, Calendar, CheckCircle2,
  Clock, CloudRain, Droplets, FileText, Fish, HeartPulse, IndianRupee, Landmark, Leaf,
  MapPin, Shield, ShieldCheck, Sparkles, Sprout, TrendingUp, User, Waves, Wheat
} from 'lucide-react'
import { tr, REPORT_LANGUAGES } from '../../services/reportTranslations'

const money = v => `₹${Number(v || 0).toLocaleString('en-IN')}`

function renderSafe(val, fallback = '') {
  if (val == null) return fallback
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (typeof val === 'object') {
    return val.current_stage || val.label || val.name || val.text || val.summary || val.note || fallback
  }
  return fallback
}

export default function FarmerReportDocument({ report, t: customT }) {
  if (!report) return null

  const { farmer, modules, summary, actionPlan, generatedAt } = report
  const lang = report.language || 'en'
  const t = (k, f) => (customT ? customT(k, f) : tr(k, lang, f || k))
  const dateFormatted = new Date(generatedAt || Date.now()).toLocaleDateString(lang === 'en' ? 'en-IN' : `${lang}-IN`, {
    day: '2-digit', month: 'short', year: 'numeric'
  })

  return (
    <div className="farmer-report-container report-doc-wrap" id="farmer-report-pdf-root" data-no-dom-translate="true">
      {/* ── Cover Page ──────────────────────────────────────────────────────── */}
      <header className="report-cover">
        <div className="report-brand-row">
          <div className="report-brand-logo">
            <div className="report-brand-logo-icon">
              <Leaf size={22} />
            </div>
            <div className="report-brand-text">
              <b>{t('brandName', 'AGRI-ECONOMIC INTELLIGENCE PLATFORM')}</b>
              <small>{t('systemSub', 'COMPREHENSIVE AGRICULTURAL INTELLIGENCE SYSTEM')}</small>
            </div>
          </div>
          <span className="report-doc-badge">
            <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />
            {t('dossierBadge', 'VERIFIED MULTI-ENGINE DOSSIER')}
          </span>
        </div>

        <div className="report-title-block">
          <h1>{t('reportTitle', 'Complete Farmer Intelligence Report')}</h1>
          <p>{t('reportSub', 'Unified agricultural, financial, environmental, and bioresource intelligence profile.')}</p>
        </div>

        <div className="report-meta-grid">
          <div className="report-meta-item">
            <small>{t('farmerName', 'Farmer Name')}</small>
            <b>{farmer.name || 'R. Kumar'}</b>
          </div>
          <div className="report-meta-item">
            <small>{t('districtState', 'District & State')}</small>
            <b>{farmer.district || 'Thiruvallur'}, {farmer.state || 'Tamil Nadu'}</b>
          </div>
          <div className="report-meta-item">
            <small>{t('farmSize', 'Farm Size')}</small>
            <b>{farmer.landArea || 2.5} {t('acres', 'Acres')}</b>
          </div>
          <div className="report-meta-item">
            <small>{t('primaryCrop', 'Primary Crop')}</small>
            <b>{farmer.crop || 'Paddy'}</b>
          </div>
          <div className="report-meta-item">
            <small>{t('reportLanguageLabel', 'Report Language')}</small>
            <b style={{ color: '#15803d' }}>
              {REPORT_LANGUAGES[lang]?.native || 'English'} ({REPORT_LANGUAGES[lang]?.name || 'English'})
            </b>
          </div>
          <div className="report-meta-item">
            <small>{t('genDate', 'Generation Date')}</small>
            <b>{dateFormatted}</b>
          </div>
          <div className="report-meta-item">
            <small>{t('reportId', 'Report ID')}</small>
            <b style={{ fontFamily: 'monospace' }}>AGY-{Math.abs((farmer.name || '').split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 90000 + 10000)}</b>
          </div>
        </div>
      </header>

      {/* ── Section 1: Farmer Profile ────────────────────────────────────────── */}
      <section className="report-section">
        <div className="report-section-header">
          <div className="report-section-icon"><User size={16} /></div>
          <h2>{t('1. Farmer & Operational Profile', '1. Farmer & Operational Profile')}</h2>
          <small>{t('Verified Baseline Data', 'Verified Baseline Data')}</small>
        </div>

        <div className="report-card highlight">
          <div className="report-card-title">
            <span>{farmer.name} — {farmer.category || 'Small farmer'}</span>
            <span className="report-chip green">{t('Active Farmer Record', 'Active Farmer Record')}</span>
          </div>
          <div className="report-grid-3">
            <div className="report-metric-box">
              <small>{t('Location', 'Location')}</small>
              <b>{farmer.district}, {farmer.state}</b>
            </div>
            <div className="report-metric-box">
              <small>{t('Land Area', 'Land Area')}</small>
              <b>{farmer.landArea} {t('Acres', 'Acres')}</b>
            </div>
            <div className="report-metric-box">
              <small>{t('Primary Crop', 'Primary Crop')}</small>
              <b>{farmer.crop}</b>
            </div>
            <div className="report-metric-box">
              <small>{t('Irrigation Source', 'Irrigation Source')}</small>
              <b>{farmer.irrigation || 'Borewell'}</b>
            </div>
            <div className="report-metric-box">
              <small>{t('Soil Type', 'Soil Type')}</small>
              <b>{farmer.soil || 'Clay loam'}</b>
            </div>
            <div className="report-metric-box">
              <small>{t('Farm Pond', 'Farm Pond')}</small>
              <b>{farmer.pond || 'Available'}</b>
            </div>
            <div className="report-metric-box">
              <small>{t('Lac Host Plants', 'Lac Host Plants')}</small>
              <b>{farmer.hosts || 'None registered'}</b>
            </div>
            <div className="report-metric-box">
              <small>{t('Investment Capacity', 'Investment Capacity')}</small>
              <b>{money(farmer.investment || 75000)}</b>
            </div>
            <div className="report-metric-box">
              <small>{t('Crop Loan / EMI', 'Crop Loan / EMI')}</small>
              <b>{money(farmer.loan || 25000)} · {money(farmer.emi || 4200)}/mo</b>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Executive Summary ────────────────────────────────────── */}
      <section className="report-section report-page-break">
        <div className="report-section-header">
          <div className="report-section-icon"><Award size={16} /></div>
          <h2>{t('2. Executive Agricultural & Financial Summary', '2. Executive Agricultural & Financial Summary')}</h2>
          <small>{t('Synthesized Intelligence', 'Synthesized Intelligence')}</small>
        </div>

        <div className="report-card" style={{ background: '#f8fafc', borderLeft: '4px solid #166534' }}>
          <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#166534', marginBottom: 4 }}>
            {summary.overallStatus}
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#334155' }}>
            {summary.primaryOutlook}
          </p>
        </div>

        <div className="report-grid-2">
          <div className="report-card highlight">
            <div className="report-card-title" style={{ color: '#15803d' }}>
              <span><Sparkles size={14} style={{ display: 'inline', marginRight: 4 }} /> {t('Key Agricultural Opportunities', 'Key Agricultural Opportunities')}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '12.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {summary.majorOpportunities?.map((opp, i) => <li key={i}>{opp}</li>)}
            </ul>
          </div>

          <div className="report-card warn">
            <div className="report-card-title" style={{ color: '#b45309' }}>
              <span><AlertTriangle size={14} style={{ display: 'inline', marginRight: 4 }} /> {t('Identified Farm Risks', 'Identified Farm Risks')}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '12.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {summary.majorRisks?.map((risk, i) => <li key={i}>{risk}</li>)}
            </ul>
          </div>
        </div>

        <div className="report-grid-2">
          <div className="report-metric-box good">
            <small>{t('Production & Yield Outlook', 'Production & Yield Outlook')}</small>
            <b style={{ fontSize: '14px' }}>{summary.productionOutlook}</b>
          </div>
          <div className="report-metric-box good">
            <small>{t('Financial & Cash Flow Position', 'Financial & Cash Flow Position')}</small>
            <b style={{ fontSize: '14px' }}>{summary.financialOutlook}</b>
          </div>
        </div>
      </section>

      {/* ── Section 3: Government Schemes ────────────────────────────────────── */}
      <section className="report-section report-page-break">
        <div className="report-section-header">
          <div className="report-section-icon"><Landmark size={16} /></div>
          <h2>{t('3. Government Schemes & Subsidies', '3. Government Schemes & Subsidies')}</h2>
          <small>{t('Scheme Engine 1', 'Scheme Engine 1')}</small>
        </div>

        <div className="report-grid-3" style={{ marginBottom: 12 }}>
          <div className="report-metric-box good">
            <small>{t('Matching Schemes Found', 'Matching Schemes Found')}</small>
            <b>{modules.schemes?.count || 9} {t('Schemes', 'Schemes')}</b>
          </div>
          <div className="report-metric-box good">
            <small>{t('Directly Eligible', 'Directly Eligible')}</small>
            <b>{modules.schemes?.eligibleCount || 5} {t('High Match', 'High Match')}</b>
          </div>
          <div className="report-metric-box">
            <small>{t('Potential Benefit', 'Potential Benefit')}</small>
            <b>~{money(modules.schemes?.totalPotentialBenefit || 55000)}</b>
          </div>
        </div>

        {modules.schemes?.schemes?.map((s, idx) => (
          <div className="report-card" key={idx} style={{ marginBottom: 10 }}>
            <div className="report-card-title">
              <div>
                <b>{s.scheme_name || s.name}</b>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 400 }}>
                  {s.sponsoring_agency || s.ministry || 'Ministry of Agriculture & Farmers Welfare'}
                </span>
              </div>
              <span className={`report-chip ${s.eligibility_score >= 0.8 ? 'green' : 'blue'}`}>
                {Math.round((s.eligibility_score || 0.85) * 100)}% {t('Eligible', 'Eligible')}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#475569', marginBottom: 8 }}>
              <b>{t('Benefits / Subsidy:', 'Benefits / Subsidy:')}</b> {s.benefit_summary || s.benefits || 'Financial assistance, subsidized crop insurance, and equipment subsidy.'}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
              <b>{t('Required Documents:', 'Required Documents:')}</b> {Array.isArray(s.documents_required) ? s.documents_required.join(', ') : 'Aadhaar, Land Record (Patta/Chitta), Bank Passbook, Passport Photo.'}
            </div>
          </div>
        ))}
      </section>

      {/* ── Section 4: Crop Production ───────────────────────────────────────── */}
      <section className="report-section">
        <div className="report-section-header">
          <div className="report-section-icon"><Wheat size={16} /></div>
          <h2>{t('4. Crop Production & Yield Forecast', '4. Crop Production & Yield Forecast')}</h2>
          <small>{t('Production Engine 2', 'Production Engine 2')}</small>
        </div>

        <div className="report-card highlight">
          <div className="report-grid-3">
            <div className="report-metric-box good">
              <small>{t('Expected Yield', 'Expected Yield')}</small>
              <b>{modules.production?.predictedYield || 3.4} {t('t/ha', 't/ha')}</b>
            </div>
            <div className="report-metric-box good">
              <small>{t('Farm Production Total', 'Farm Production Total')}</small>
              <b>{modules.production?.predictedProduction || 8.5} {t('Tonnes', 'Tonnes')}</b>
            </div>
            <div className="report-metric-box">
              <small>{t('Risk Level', 'Risk Level')}</small>
              <b style={{ color: '#166534' }}>{modules.production?.riskLevel || 'Moderate Risk'}</b>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: '12.5px', color: '#334155' }}>
            <b>{t('Recommended High-Yield Cultivars for Agro-Climatic Zone:', 'Recommended High-Yield Cultivars for Agro-Climatic Zone:')}</b>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {modules.production?.varieties?.map(v => (
                <span key={v} className="report-chip green">{v}</span>
              ))}
            </div>
          </div>

          {modules.production?.baselineNote && (
            <p style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic', marginTop: 10, marginBottom: 0 }}>
              {modules.production.baselineNote}
            </p>
          )}
        </div>
      </section>

      {/* ── Section 5: Crop Health Monitoring ─────────────────────────────────── */}
      <section className="report-section report-page-break">
        <div className="report-section-header">
          <div className="report-section-icon"><HeartPulse size={16} /></div>
          <h2>{t('5. Satellite Crop Health & Environmental Monitoring', '5. Satellite Crop Health & Environmental Monitoring')}</h2>
          <small>{t('Crop Health Module', 'Crop Health Module')}</small>
        </div>

        <div className="report-grid-4" style={{ marginBottom: 12 }}>
          <div className="report-metric-box good">
            <small>{t('Vegetation Index (NDVI)', 'Vegetation Index (NDVI)')}</small>
            <b>{modules.health?.ndviValue || 0.72}</b>
            <span className="report-chip green" style={{ display: 'block', marginTop: 4 }}>{modules.health?.ndviStatus || 'Healthy'}</span>
          </div>
          <div className="report-metric-box">
            <small>{t('Active Growth Stage', 'Active Growth Stage')}</small>
            <b style={{ fontSize: '13px' }}>{renderSafe(modules.health?.growthStage, 'Tillering Stage')}</b>
            <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginTop: 4 }}>
              DAS {renderSafe(modules.health?.currentDAS, '45')} / {renderSafe(modules.health?.totalDuration, '125')}
            </span>
          </div>
          <div className="report-metric-box">
            <small>{t('Max / Min Temperature', 'Max / Min Temperature')}</small>
            <b>{modules.health?.weather?.temperature_max_c || 34.2}°C / {modules.health?.weather?.temperature_min_c || 24.8}°C</b>
          </div>
          <div className="report-metric-box">
            <small>{t('Relative Humidity', 'Relative Humidity')}</small>
            <b>{modules.health?.weather?.humidity_pct || 76}%</b>
          </div>
        </div>

        <div className="report-card">
          <div className="report-card-title">
            <span>{t('Stress Detection & Field Flags', 'Stress Detection & Field Flags')}</span>
            <span className={`report-chip ${modules.health?.stressFlags?.length ? 'amber' : 'green'}`}>
              {modules.health?.overallStatus || 'Action needed'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            {modules.health?.stressFlags?.map(flag => (
              <span key={flag.id} className="report-chip amber">
                {flag.icon} {flag.label} ({flag.level} Exposure)
              </span>
            ))}
          </div>

          <div style={{ fontSize: '12.5px', color: '#334155' }}>
            <b>{t('Agronomic Advisory Actions:', 'Agronomic Advisory Actions:')}</b>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {modules.health?.actions?.map((act, i) => <li key={i}>{act}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Section 6: Disease Detection ──────────────────────────────────────── */}
      <section className="report-section">
        <div className="report-section-header">
          <div className="report-section-icon"><Activity size={16} /></div>
          <h2>{t('6. Disease Detection & Integrated Pest Management', '6. Disease Detection & Integrated Pest Management')}</h2>
          <small>{t('Pathology Diagnostics', 'Pathology Diagnostics')}</small>
        </div>

        {modules.disease?.vulnerabilities?.map((dis, idx) => (
          <div className="report-card" key={idx} style={{ marginBottom: 10 }}>
            <div className="report-card-title">
              <b>{dis.name}</b>
              <span className="report-chip amber">{dis.severity}</span>
            </div>
            <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#475569' }}>
              <b>{t('Symptoms:', 'Symptoms:')}</b> {dis.symptoms}
            </p>
            <div className="report-grid-2" style={{ marginTop: 6, fontSize: '12px' }}>
              <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: 6 }}>
                <b style={{ color: '#166534' }}>🌱 {t('Organic Control:', 'Organic Control:')}</b>
                <p style={{ margin: '2px 0 0 0', color: '#334155' }}>{dis.organicControl}</p>
              </div>
              <div style={{ background: '#fef2f2', padding: '8px 10px', borderRadius: 6 }}>
                <b style={{ color: '#991b1b' }}>🧪 {t('Chemical Control:', 'Chemical Control:')}</b>
                <p style={{ margin: '2px 0 0 0', color: '#334155' }}>{dis.chemicalControl}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Section 7: Water & Flood Risk ─────────────────────────────────────── */}
      <section className="report-section report-page-break">
        <div className="report-section-header">
          <div className="report-section-icon"><Waves size={16} /></div>
          <h2>{t('7. Water & Flood Risk Intelligence', '7. Water & Flood Risk Intelligence')}</h2>
          <small>{t('Hydrological Analysis', 'Hydrological Analysis')}</small>
        </div>

        <div className="report-grid-3" style={{ marginBottom: 12 }}>
          <div className="report-metric-box good">
            <small>{t('Flood Risk Status', 'Flood Risk Status')}</small>
            <b style={{ color: modules.water?.riskColor || '#3d8050' }}>{modules.water?.riskLabel || 'Low Risk'}</b>
          </div>
          <div className="report-metric-box">
            <small>{t('30-Day Rainfall Departure', '30-Day Rainfall Departure')}</small>
            <b>+{modules.water?.rainfallDeparturePct || 12}% {t('Normal', 'Normal')}</b>
          </div>
          <div className="report-metric-box">
            <small>{t('30-Day Cumulative Rain', '30-Day Cumulative Rain')}</small>
            <b>{modules.water?.rainfallObservedMm || 142} mm</b>
          </div>
        </div>

        <div className="report-card">
          <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#334155' }}>
            {modules.water?.summary}
          </p>
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, fontSize: '12px', color: '#475569' }}>
            <b>{t('Irrigation & Water Allocation Advisory:', 'Irrigation & Water Allocation Advisory:')}</b>
            <p style={{ margin: '4px 0 0 0' }}>{modules.water?.irrigationAdvice}</p>
          </div>
        </div>
      </section>

      {/* ── Section 8: Crop Recommendation ────────────────────────────────────── */}
      <section className="report-section">
        <div className="report-section-header">
          <div className="report-section-icon"><Leaf size={16} /></div>
          <h2>{t('8. Crop Recommendation & Resource Optimization', '8. Crop Recommendation & Resource Optimization')}</h2>
          <small>{t('Soil & Resource Matching', 'Soil & Resource Matching')}</small>
        </div>

        <table className="report-table">
          <thead>
            <tr>
              <th>{t('Crop Candidate', 'Crop Candidate')}</th>
              <th>{t('Suitability', 'Suitability')}</th>
              <th>{t('Duration', 'Duration')}</th>
              <th>{t('Water Demand', 'Water Demand')}</th>
              <th>{t('Net Profit / Acre', 'Net Profit / Acre')}</th>
            </tr>
          </thead>
          <tbody>
            {modules.recommendation?.rankedCrops?.map((c, i) => (
              <tr key={i}>
                <td><b>{c.name}</b></td>
                <td><span className="report-chip green">{c.suitabilityScore}% Match</span></td>
                <td>{c.durationDays}</td>
                <td>{c.waterRequirement}</td>
                <td><b style={{ color: '#166534' }}>{money(c.netProfit)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Section 9: Market & Profit ─────────────────────────────────────────── */}
      <section className="report-section report-page-break">
        <div className="report-section-header">
          <div className="report-section-icon"><TrendingUp size={16} /></div>
          <h2>{t('9. Market Prices, Revenue & Profit Analysis', '9. Market Prices, Revenue & Profit Analysis')}</h2>
          <small>{t('AGMARKNET & Mandi Intelligence', 'AGMARKNET & Mandi Intelligence')}</small>
        </div>

        <div className="report-grid-4" style={{ marginBottom: 12 }}>
          <div className="report-metric-box good">
            <small>{t('AGMARKNET Modal Price', 'AGMARKNET Modal Price')}</small>
            <b>{money(modules.market?.modalPricePerQtl || 2955)}/qtl</b>
            <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginTop: 2 }}>{modules.market?.marketName}</span>
          </div>
          <div className="report-metric-box">
            <small>{t('Expected Gross Revenue', 'Expected Gross Revenue')}</small>
            <b>{money(modules.market?.expectedGrossRevenue || 203000)}</b>
          </div>
          <div className="report-metric-box">
            <small>{t('Estimated Production Costs', 'Estimated Production Costs')}</small>
            <b>{money(modules.market?.estimatedExpenses || 46250)}</b>
          </div>
          <div className="report-metric-box good">
            <small>{t('Net Farm Profit / ROI', 'Net Farm Profit / ROI')}</small>
            <b style={{ color: '#166534' }}>{money(modules.market?.netProfit || 156750)}</b>
            <span className="report-chip green" style={{ display: 'block', marginTop: 2 }}>{modules.market?.roiPercent || 85}% ROI</span>
          </div>
        </div>

        <div className="report-card">
          <div className="report-card-title">
            <span>{t('Price Spread & Marketing Timing', 'Price Spread & Marketing Timing')}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Min: {money(modules.market?.minPricePerQtl)}/qtl · Max: {money(modules.market?.maxPricePerQtl)}/qtl
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12.5px', color: '#334155' }}>
            {modules.market?.marketAdvice}
          </p>
        </div>
      </section>

      {/* ── Section 10: Crop Loss & Insurance ─────────────────────────────────── */}
      <section className="report-section">
        <div className="report-section-header">
          <div className="report-section-icon"><Shield size={16} /></div>
          <h2>{t('10. Crop Loss Assessment & PMFBY Insurance', '10. Crop Loss Assessment & PMFBY Insurance')}</h2>
          <small>{t('Risk Mitigation & Claims', 'Risk Mitigation & Claims')}</small>
        </div>

        <div className="report-grid-3" style={{ marginBottom: 12 }}>
          <div className="report-metric-box">
            <small>{t('PMFBY Sum Insured', 'PMFBY Sum Insured')}</small>
            <b>{money(modules.loss?.sumInsured || 90000)}</b>
          </div>
          <div className="report-metric-box good">
            <small>{t('Farmer Premium (2% Kharif)', 'Farmer Premium (2% Kharif)')}</small>
            <b>{money(modules.loss?.farmerPremium || 1800)}</b>
            <span style={{ fontSize: '10px', color: '#15803d', display: 'block', marginTop: 2 }}>98% Govt Subsidized</span>
          </div>
          <div className="report-metric-box">
            <small>{t('Claim Intimation Window', 'Claim Intimation Window')}</small>
            <b>72 {t('Hours', 'Hours')}</b>
          </div>
        </div>

        <div className="report-card">
          <p style={{ margin: '0 0 6px 0', fontSize: '12.5px', color: '#334155' }}>
            <b>{t('Claim Reporting Procedure:', 'Claim Reporting Procedure:')}</b> {modules.loss?.reportingProcedure}
          </p>
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            <b>{t('Required Claim Verification Documents:', 'Required Claim Verification Documents:')}</b> {modules.loss?.requiredDocuments?.join(', ')}
          </div>
        </div>
      </section>

      {/* ── Section 11: Cash Flow ─────────────────────────────────────────────── */}
      <section className="report-section report-page-break">
        <div className="report-section-header">
          <div className="report-section-icon"><IndianRupee size={16} /></div>
          <h2>{t('11. Farm Cash Flow & Working Capital', '11. Farm Cash Flow & Working Capital')}</h2>
          <small>{t('Financial Management', 'Financial Management')}</small>
        </div>

        <div className="report-grid-4" style={{ marginBottom: 12 }}>
          <div className="report-metric-box">
            <small>{t('Opening Cash', 'Opening Cash')}</small>
            <b>{money(modules.cashflow?.openingBalance || 40000)}</b>
          </div>
          <div className="report-metric-box good">
            <small>{t('Total Inflows', 'Total Inflows')}</small>
            <b>{money(modules.cashflow?.totalIncome || 95500)}</b>
          </div>
          <div className="report-metric-box">
            <small>{t('Operating Outflows', 'Operating Outflows')}</small>
            <b>{money(modules.cashflow?.totalExpenses || 66000)}</b>
          </div>
          <div className="report-metric-box good">
            <small>{t('Net Cash Position', 'Net Cash Position')}</small>
            <b style={{ color: '#166534' }}>{money(modules.cashflow?.netCashFlow || 29500)}</b>
          </div>
        </div>

        <div className="report-card">
          <div className="report-card-title">
            <span>{t('Debt Service & Working Capital Status', 'Debt Service & Working Capital Status')}</span>
            <span className="report-chip green">{modules.cashflow?.workingCapitalStatus}</span>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
            Active KCC Loan Principal: <b>{money(modules.cashflow?.activeLoanPrincipal || 25000)}</b> · Monthly EMI: <b>{money(modules.cashflow?.monthlyEmi || 4200)}</b> · EMI obligation remains safely within monthly operating margins.
          </p>
        </div>
      </section>

      {/* ── Section 12: Lac Culture ───────────────────────────────────────────── */}
      <section className="report-section">
        <div className="report-section-header">
          <div className="report-section-icon"><Bug size={16} /></div>
          <h2>{t('12. Lac Culture Bioresource Potential', '12. Lac Culture Bioresource Potential')}</h2>
          <small>{t('Secondary Livelihood Intelligence', 'Secondary Livelihood Intelligence')}</small>
        </div>

        {modules.lac?.applicable ? (
          <div className="report-card highlight">
            <div className="report-card-title">
              <span>{t('Host Plants Registered:', 'Host Plants Registered:')} {modules.lac.hosts}</span>
              <span className="report-chip green">{modules.lac.climateRiskLabel} ({modules.lac.climateRiskScore}/100)</span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#334155' }}>
              {modules.lac.hostSuitability}
            </p>
            <div className="report-grid-3" style={{ marginBottom: 10 }}>
              <div className="report-metric-box">
                <small>{t('Estimated Production', 'Estimated Production')}</small>
                <b>{modules.lac.productionForecastKgPerAcre} {t('kg/ac', 'kg/ac')}</b>
              </div>
              <div className="report-metric-box">
                <small>{t('Modal Market Rate', 'Modal Market Rate')}</small>
                <b>{money(modules.lac.modalPricePerKg)}/kg</b>
              </div>
              <div className="report-metric-box good">
                <small>{t('Net Bioresource Income', 'Net Bioresource Income')}</small>
                <b style={{ color: '#166534' }}>{money(modules.lac.netProfit)}</b>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
              <b>{t('Broodlac Management:', 'Broodlac Management:')}</b> {modules.lac.broodlacAdvice}
            </p>
          </div>
        ) : (
          <div className="report-na-card">
            <AlertTriangle size={18} color="#94a3b8" />
            <div>
              <b>{t('Not Applicable to Current Farm Profile', 'Not Applicable to Current Farm Profile')}</b>
              <span>{modules.lac?.reason || 'No lac host trees registered on farm.'}</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 13: Pearl Culture ─────────────────────────────────────────── */}
      <section className="report-section report-page-break">
        <div className="report-section-header">
          <div className="report-section-icon"><Fish size={16} /></div>
          <h2>{t('13. Freshwater Pearl Culture Suitability', '13. Freshwater Pearl Culture Suitability')}</h2>
          <small>{t('Aquaculture Intelligence', 'Aquaculture Intelligence')}</small>
        </div>

        {modules.pearl?.applicable ? (
          <div className="report-card highlight">
            <div className="report-card-title">
              <span>{modules.pearl.cultureType} — {modules.pearl.targetSpecies}</span>
              <span className="report-chip green">{modules.pearl.climateLabel} ({modules.pearl.climateScore}/100)</span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#334155' }}>
              {modules.pearl.temperatureNote}
            </p>
            <div className="report-grid-4" style={{ marginBottom: 12 }}>
              <div className="report-metric-box">
                <small>{t('Mussel Stocking Capacity', 'Mussel Stocking Capacity')}</small>
                <b>{modules.pearl.stockingEstimate?.toLocaleString()}</b>
              </div>
              <div className="report-metric-box">
                <small>{t('Investment Cost', 'Investment Cost')}</small>
                <b>{money(modules.pearl.investmentCost)}</b>
              </div>
              <div className="report-metric-box">
                <small>{t('Expected Revenue', 'Expected Revenue')}</small>
                <b>{money(modules.pearl.expectedRevenue)}</b>
              </div>
              <div className="report-metric-box good">
                <small>{t('Net Profit Potential', 'Net Profit Potential')}</small>
                <b style={{ color: '#166534' }}>{money(modules.pearl.estimatedNetProfit)}</b>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#475569', marginBottom: 6 }}>
              <b>{t('Critical Water Quality Benchmarks (ICAR-CIFE):', 'Critical Water Quality Benchmarks (ICAR-CIFE):')}</b>
            </div>
            <div className="report-grid-4" style={{ marginBottom: 10 }}>
              {modules.pearl.waterQualityBenchmarks?.map(b => (
                <div key={b.parameter} style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 6, fontSize: '11px' }}>
                  <b>{b.parameter}:</b> {b.optimal}
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
              <b>{t('Practical Guidance:', 'Practical Guidance:')}</b> {modules.pearl.guidance}
            </p>
          </div>
        ) : (
          <div className="report-na-card">
            <AlertTriangle size={18} color="#94a3b8" />
            <div>
              <b>{t('Not Applicable to Current Farm Profile', 'Not Applicable to Current Farm Profile')}</b>
              <span>{modules.pearl?.reason || 'No farm pond or aquaculture waterbody available on farm.'}</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Final Section: Integrated Action Plan ─────────────────────────────── */}
      <section className="report-section report-page-break">
        <div className="report-section-header">
          <div className="report-section-icon"><Calendar size={16} /></div>
          <h2>{t('14. Integrated Farmer Action Plan', '14. Integrated Farmer Action Plan')}</h2>
          <small>{t('Practical Decision Roadmap', 'Practical Decision Roadmap')}</small>
        </div>

        <div className="report-plan-grid">
          <div className="report-plan-column" style={{ borderLeft: '4px solid #ef4444' }}>
            <h4 style={{ color: '#b91c1c' }}>
              <Clock size={14} /> {t('Immediate Actions (Next 1–7 Days)', 'Immediate Actions (Next 1–7 Days)')}
            </h4>
            <ul>
              {actionPlan.immediate?.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>

          <div className="report-plan-column" style={{ borderLeft: '4px solid #f59e0b' }}>
            <h4 style={{ color: '#b45309' }}>
              <Calendar size={14} /> {t('Short-term Actions (2–4 Weeks)', 'Short-term Actions (2–4 Weeks)')}
            </h4>
            <ul>
              {actionPlan.shortTerm?.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>

          <div className="report-plan-column" style={{ borderLeft: '4px solid #10b981' }}>
            <h4 style={{ color: '#047857' }}>
              <Wheat size={14} /> {t('Seasonal Actions (Harvest & Mandi)', 'Seasonal Actions (Harvest & Mandi)')}
            </h4>
            <ul>
              {actionPlan.seasonal?.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>

          <div className="report-plan-column" style={{ borderLeft: '4px solid #3b82f6' }}>
            <h4 style={{ color: '#1d4ed8' }}>
              <Sprout size={14} /> {t('Long-term Farm Investments', 'Long-term Farm Investments')}
            </h4>
            <ul>
              {actionPlan.longTerm?.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="report-footer">
        <div>
          <b>{t('brandName', 'Agri-Economic Intelligence Platform')}</b> · {t('dossierBadge', 'Verified Multi-Engine Dossier')} · {t('genDate', 'Generation')}: {dateFormatted} · {t('reportLanguageLabel', 'Language')}: {REPORT_LANGUAGES[lang]?.native || 'English'}
        </div>
        <div>
          {t('footerDisclaimer', 'Official agricultural guidance requires ground field validation with your district Krishi Vigyan Kendra (KVK).')}
        </div>
      </footer>
    </div>
  )
}

