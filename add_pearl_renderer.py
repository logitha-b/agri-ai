import re
from pathlib import Path

path = Path("src/components/ModuleResultRenderer.jsx")
text = path.read_text(encoding="utf-8")

# 1. Update lucide-react imports
old_import = "import { AlertTriangle, BarChart2, BookOpen, Calendar, ChevronDown, ChevronUp, Clock, CheckCircle2, IndianRupee, Leaf, Sparkles, ShieldAlert, TreeDeciduous,"
new_import = "import { Activity, AlertTriangle, BarChart2, BookOpen, Calendar, ChevronDown, ChevronUp, Clock, CheckCircle2, Droplets, IndianRupee, Info, Layers, Leaf, Sparkles, ShieldAlert, Thermometer, TreeDeciduous,"

if old_import in text:
    text = text.replace(old_import, new_import)
    print("Updated lucide-react imports")
else:
    print("WARNING: old_import not matched")

# 2. Pearl Components code
pearl_components = '''
// ── Pearl Environmental Risk Result ───────────────────────────────────────────
function PearlRiskResult({ data }) {
  if (!data?.overall_risk_level && !data?.risk_signals) {
    return <UnavailableState message="Pearl environmental risk assessment unavailable." />
  }

  const riskLevel = data.overall_risk_level || 'Low'
  const riskScore = data.overall_risk_score ?? 0
  const color = riskLevel === 'Low' ? '#2d6a4f' : riskLevel === 'Moderate' ? '#b87c1a' : '#c0392b'
  const bg = riskLevel === 'Low' ? '#f0faf4' : riskLevel === 'Moderate' ? '#fdf8ec' : '#fdf2f2'
  const signals = data.risk_signals || []
  const cType = data.culture_type || 'freshwater'

  return (
    <div className="mr-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="mr-header">
        <ShieldAlert size={16} style={{ color }} />
        <b>Pearl Environmental Risk — {cType === 'marine' ? 'Marine Oyster' : 'Freshwater Mussel'}</b>
        <span className="mr-source">{cType === 'marine' ? 'CMFRI / MPEDA Thresholds' : 'ICAR-CIFE Thresholds'}</span>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:bg, padding:'10px 14px', borderRadius:8, margin:'8px 0 12px' }}>
        <div>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.05em', color:'#666' }}>MORTALITY & WEATHER RISK</div>
          <b style={{ fontSize:18, color }}>{riskLevel} Risk</b>
          <div style={{ fontSize:11, color:'#777', marginTop:2 }}>
            {cType === 'marine' ? 'Pinctada fucata (Indian Akoya)' : 'Lamellidens marginalis / corrianus'}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <b style={{ fontSize:28, color, fontFamily:'Manrope, sans-serif' }}>{riskScore}</b>
          <div style={{ fontSize:10, color:'#888' }}>/ 100 Risk Index</div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
        {signals.length > 0 ? signals.map((s, idx) => (
          <div key={idx} style={{ background:'#fff', border:'1px solid #e0e8e0', borderRadius:6, padding:'8px 10px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, fontWeight:600, color: s.level === 'High' ? '#c0392b' : s.level === 'Moderate' ? '#b87c1a' : '#2d6a4f' }}>
                {s.signal}
              </span>
              <span style={{ fontSize:10, background:'#faebd7', padding:'1px 5px', borderRadius:3 }}>{s.level || 'Signal'}</span>
            </div>
            {s.threshold && <div style={{ fontSize:10, color:'#9c6b27', marginTop:2 }}>Safe Threshold: {s.threshold}</div>}
            {s.effect && <div style={{ fontSize:11, color:'#5c4217', marginTop:2 }}>{s.effect}</div>}
          </div>
        )) : (
          <div style={{ background:'#f0faf4', border:'1px solid #c8e0cc', borderRadius:6, padding:'8px 10px', fontSize:11, color:'#2d6a4f' }}>
            ✓ Water temperature and weather parameters are within optimal ranges for mussel survival and nacre formation.
          </div>
        )}
      </div>

      <p className="mr-note" style={{ margin:'4px 0 0' }}>
        ICAR-CIFE / CMFRI Advisory: Water temperature &gt;38°C (freshwater) or &gt;36°C (marine) causes mortality. Test dissolved oxygen weekly during summer.
      </p>
    </div>
  )
}

// ── Pearl Water Quality Monitoring Result ──────────────────────────────────────
function PearlWaterResult({ data }) {
  if (!data?.parameters) return <UnavailableState message="Water quality parameters unavailable." />
  const params = data.parameters || []
  const cType = data.culture_type || 'freshwater'
  const hasMeasured = data.has_measurements

  return (
    <div className="mr-card" style={{ borderLeft: '4px solid #2d6a4f' }}>
      <div className="mr-header">
        <Droplets size={16} style={{ color:'#2d6a4f' }} />
        <b>Water Quality Standards — {cType === 'marine' ? 'Marine Pearl Oyster' : 'Freshwater Pearl Pond'}</b>
        <span className="mr-source">{data.source || 'ICAR-CIFE / CMFRI'}</span>
      </div>

      <div style={{ margin:'8px 0 10px', fontSize:12, color:'#4a5568' }}>
        {hasMeasured ? (
          <span style={{ color: data.all_parameters_healthy ? '#2d6a4f' : '#b87c1a', fontWeight:600 }}>
            {data.all_parameters_healthy ? '✓ All tested parameters are within optimal biological ranges.' : '⚠ Some measured parameters require corrective adjustment.'}
          </span>
        ) : (
          <span>Verified reference baseline parameters for healthy pearl culture:</span>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:8, marginBottom:10 }}>
        {params.map((p, idx) => {
          const isWarning = p.status === 'low' || p.status === 'high'
          const chipColor = isWarning ? (p.severity === 'High' ? '#c0392b' : '#b87c1a') : '#2d6a4f'
          const chipBg = isWarning ? (p.severity === 'High' ? '#fdf2f2' : '#fdf8ec') : '#f0faf4'
          return (
            <div key={idx} style={{ background:chipBg, border:`1px solid ${isWarning ? '#f0c0b0' : '#d2e7d6'}`, borderRadius:8, padding:'8px 10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <span style={{ fontSize:11, fontWeight:600, color:'#2d3748' }}>{p.name}</span>
                <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:3, background:chipColor, color:'#fff' }}>
                  {p.status ? p.status.toUpperCase() : 'OPTIMAL'}
                </span>
              </div>
              <div style={{ marginTop:4 }}>
                {p.measured_value !== null && p.measured_value !== undefined ? (
                  <div style={{ fontSize:16, fontWeight:700, color:chipColor }}>
                    {p.measured_value} <span style={{ fontSize:11, fontWeight:400 }}>{p.unit}</span>
                  </div>
                ) : (
                  <div style={{ fontSize:13, fontWeight:600, color:'#2d6a4f' }}>
                    {p.optimal_range}
                  </div>
                )}
                <div style={{ fontSize:10, color:'#718096', marginTop:2 }}>
                  Standard: {p.optimal_range}
                </div>
              </div>
              {p.action && (
                <div style={{ fontSize:10, color:'#9c4221', marginTop:4, borderTop:'1px dashed #e2c0b0', paddingTop:4 }}>
                  <b>Action:</b> {p.action}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="mr-note" style={{ margin:'4px 0 0' }}>
        {data.guidance || 'Maintain dissolved oxygen &gt;5.0 mg/L and pH between 7.0–8.5. Liming with agricultural CaCO3 buffers acidic pond water.'}
      </p>
    </div>
  )
}

// ── Pearl Culture Calendar Result ─────────────────────────────────────────────
function PearlCalendarResult({ data }) {
  if (!data?.stages) return <UnavailableState message="Pearl cultivation calendar unavailable." />
  const stages = data.stages || []
  const cType = data.culture_type || 'freshwater'

  return (
    <div className="mr-card" style={{ borderLeft: '4px solid #1a5c6e' }}>
      <div className="mr-header">
        <Calendar size={16} style={{ color:'#1a5c6e' }} />
        <b>Pearl Cultivation Calendar — {data.method || 'Standard Cycle'}</b>
        <span className="mr-source">{data.source || 'ICAR-CIFE / CMFRI'}</span>
      </div>

      <div style={{ display:'flex', gap:12, alignItems:'center', background:'#f0f7f9', padding:'8px 12px', borderRadius:8, margin:'8px 0 12px' }}>
        <div>
          <span style={{ fontSize:10, textTransform:'uppercase', color:'#557' }}>SPECIES</span>
          <div style={{ fontSize:12, fontWeight:700, color:'#1a5c6e' }}>{data.species}</div>
        </div>
        <div style={{ borderLeft:'1px solid #c5dbe0', paddingLeft:12 }}>
          <span style={{ fontSize:10, textTransform:'uppercase', color:'#557' }}>CYCLE DURATION</span>
          <div style={{ fontSize:12, fontWeight:700, color:'#1a5c6e' }}>{data.duration_months} Months</div>
        </div>
        <div style={{ borderLeft:'1px solid #c5dbe0', paddingLeft:12 }}>
          <span style={{ fontSize:10, textTransform:'uppercase', color:'#557' }}>CULTURE METHOD</span>
          <div style={{ fontSize:12, fontWeight:700, color:'#1a5c6e' }}>{data.method}</div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
        {stages.map((st, i) => (
          <div key={i} style={{ background:'#fff', border:'1px solid #dce8ec', borderRadius:6, padding:'8px 10px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:18, height:18, borderRadius:'50%', background: st.color || '#1a5c6e', color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {i + 1}
                </span>
                <b style={{ fontSize:12, color:'#2c3e50' }}>{st.name}</b>
              </div>
              <span style={{ fontSize:10, background:'#e8f4f8', color:'#1a5c6e', padding:'1px 7px', borderRadius:10, fontWeight:600 }}>
                {st.months} {st.months === 1 ? 'Month' : 'Months'}
              </span>
            </div>
            {st.desc && <div style={{ fontSize:11, color:'#556', marginTop:4, marginLeft:24 }}>{st.desc}</div>}
            {st.tasks && st.tasks.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6, marginLeft:24 }}>
                {st.tasks.slice(0, 3).map((t, tidx) => (
                  <span key={tidx} style={{ fontSize:10, background:'#f8f9fa', border:'1px solid #e2e8f0', padding:'1px 6px', borderRadius:3, color:'#4a5568' }}>
                    ✓ {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mr-note" style={{ margin:'4px 0 0' }}>
        ICAR-CIFE Timeline: Surgical nucleus implantation requires 18–24 months for 0.3–0.5 mm nacre thickness. Non-nucleated keshi pearls take ~12 months.
      </p>
    </div>
  )
}

// ── Pearl Culture Market & Profitability Result ───────────────────────────────
function PearlMarketResult({ data }) {
  if (!data?.gross_revenue_inr && !data?.cost_breakdown) {
    return <UnavailableState message="Pearl profitability data unavailable." />
  }

  const cType = data.culture_type || 'freshwater'
  const grades = data.grades || {}
  const costs = data.cost_breakdown || {}

  return (
    <div className="mr-card" style={{ borderLeft: '4px solid #2d6a4f' }}>
      <div className="mr-header">
        <IndianRupee size={16} style={{ color:'#2d6a4f' }} />
        <b>Pearl Economics & Profitability — {cType === 'marine' ? 'Marine Akoya' : 'Freshwater Pond'}</b>
        <span className="mr-source">{data.source || 'MPEDA / ICAR-CIFE Data'}</span>
      </div>

      <div className="mr-stats-row" style={{ marginTop:8, marginBottom:12 }}>
        <div className="mr-stat">
          <small>Total Investment</small>
          <b style={{ color:'#c0392b' }}>{money(data.cultivation_cost_inr)}</b>
        </div>
        <div className="mr-stat">
          <small>Est. Gross Revenue</small>
          <b style={{ color:'#2d6a4f' }}>{money(data.gross_revenue_inr)}</b>
        </div>
        <div className="mr-stat">
          <small>Net Profit</small>
          <b style={{ color: data.net_profit_inr >= 0 ? '#2d6a4f' : '#c0392b' }}>
            {money(data.net_profit_inr)}
          </b>
        </div>
        <div className="mr-stat">
          <small>Profit Margin</small>
          <b style={{ color:'#1a5c6e' }}>{data.profit_margin_pct}%</b>
        </div>
      </div>

      {Object.keys(grades).length > 0 && (
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#4a5568', marginBottom:6 }}>
            ESTIMATED PEARL GRADE BREAKDOWN ({data.harvestable_pearls?.toLocaleString('en-IN')} Harvestable Pearls)
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', fontSize:11, borderCollapse:'collapse', background:'#fff', border:'1px solid #e2e8f0', borderRadius:6 }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0', color:'#475569' }}>
                  <th style={{ textAlign:'left', padding:'6px 8px' }}>Grade</th>
                  <th style={{ textAlign:'center', padding:'6px 8px' }}>Share</th>
                  <th style={{ textAlign:'center', padding:'6px 8px' }}>Quantity</th>
                  <th style={{ textAlign:'right', padding:'6px 8px' }}>Ref Rate</th>
                  <th style={{ textAlign:'right', padding:'6px 8px' }}>Est. Revenue</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grades).map(([gName, gVal], gIdx) => (
                  <tr key={gIdx} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'5px 8px', fontWeight:600 }}>{gName}</td>
                    <td style={{ textAlign:'center', padding:'5px 8px', color:'#64748b' }}>{gVal.pct}%</td>
                    <td style={{ textAlign:'center', padding:'5px 8px' }}>{gVal.count?.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign:'right', padding:'5px 8px' }}>{money(gVal.rate_inr)}</td>
                    <td style={{ textAlign:'right', padding:'5px 8px', fontWeight:700, color:'#2d6a4f' }}>{money(gVal.revenue_inr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {Object.keys(costs).length > 0 && (
        <div style={{ background:'#f8fafc', borderRadius:6, padding:'8px 10px', marginBottom:8 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:'#64748b', marginBottom:4 }}>
            Cost Breakdown (Pond Area: {data.pond_area_acres} ac, Stock: {data.stocking_mussels?.toLocaleString('en-IN')} mussels)
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:4, fontSize:10 }}>
            {Object.entries(costs).map(([ck, cv], cidx) => (
              <div key={cidx} style={{ display:'flex', justifyContent:'space-between', color:'#475569' }}>
                <span>{ck.replace(/_/g, ' ')}:</span>
                <b>{money(cv)}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mr-note" style={{ margin:'4px 0 0' }}>
        {data.note || 'Reference estimates based on ICAR-CIFE / MPEDA published farm budgets. Local auction and jeweller procurement prices vary by pearl luster and roundness.'}
      </p>
    </div>
  )
}

// ── Pearl Culture Guidance / Knowledge Base Result ────────────────────────────
function PearlGuidanceResult({ data }) {
  if (!data?.answer && !data?.topic) {
    return <UnavailableState message="Pearl cultivation guidance unavailable." />
  }

  const isFallback = data.source_type === 'gemini_fallback' || data.is_fallback

  return (
    <div className="mr-card" style={{ borderLeft: `4px solid ${isFallback ? '#f4a261' : '#1a5c6e'}` }}>
      <div className="mr-header">
        <BookOpen size={16} style={{ color: isFallback ? '#f4a261' : '#1a5c6e' }} />
        <b>{data.topic || 'Pearl Culture Expert Guidance'}</b>
        <span className="mr-source">{data.source || 'ICAR-CIFE / CMFRI Guidelines'}</span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:6, margin:'6px 0 10px' }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 4,
          background: isFallback ? '#fef3c7' : '#e0f2fe',
          color: isFallback ? '#92400e' : '#0369a1'
        }}>
          {isFallback ? 'AI Synthesized Guidance (ICAR Scientific Baseline)' : 'ICAR-CIFE / CMFRI Dataset Verified'}
        </span>
      </div>

      {data.answer && (
        <div style={{ fontSize:12, lineHeight:1.6, color:'#2c3e50', background:'#f8fafc', padding:'10px 12px', borderRadius:6, marginBottom:8 }}>
          {data.answer}
        </div>
      )}

      <p className="mr-note" style={{ margin:'4px 0 0' }}>
        {data.note || 'Scientific guidance from ICAR-Central Institute of Freshwater Aquaculture (CIFA, Bhubaneswar) and CMFRI (Kochi).'}
      </p>
    </div>
  )
}
'''

# Insert components right after PearlSuitabilityResult
suit_marker = "function PearlSuitabilityResult({ data }) {"
idx_suit = text.find(suit_marker)
if idx_suit != -1:
    end_suit = text.find("}\n\n//", idx_suit)
    if end_suit != -1:
        end_suit += 2  # after '}\n'
        text = text[:end_suit] + "\n" + pearl_components + "\n" + text[end_suit:]
        print("Inserted Pearl components after PearlSuitabilityResult")
    else:
        print("WARNING: end_suit not found")
else:
    print("WARNING: suit_marker not found")

# 3. Update switch block
old_switch = """      {moduleId === 'pearl_suitability'  && <PearlSuitabilityResult data={moduleResult} />}
      {moduleId === 'pearl_risk'         && <UnavailableState       message="Pearl environmental risk assessment unavailable." />}"""

new_switch = """      {moduleId === 'pearl_suitability'   && <PearlSuitabilityResult data={moduleResult} />}
      {moduleId === 'pearl_risk'          && <PearlRiskResult        data={moduleResult} />}
      {moduleId === 'pearl_water_quality' && <PearlWaterResult       data={moduleResult} />}
      {moduleId === 'pearl_calendar'      && <PearlCalendarResult    data={moduleResult} />}
      {moduleId === 'pearl_market'        && <PearlMarketResult      data={moduleResult} />}
      {moduleId === 'pearl_guidance'      && <PearlGuidanceResult    data={moduleResult} />}"""

if old_switch in text:
    text = text.replace(old_switch, new_switch)
    print("Updated switch block in ModuleResultRenderer.jsx")
else:
    print("WARNING: old_switch not found")

path.write_text(text, encoding="utf-8")
print("Done updating ModuleResultRenderer.jsx!")

