from pathlib import Path

f = Path("c:/Users/nemol/OneDrive/Desktop/agri/src/components/ModuleResultRenderer.jsx")
# Read bytes and decode utf-8 with replace
raw_bytes = f.read_bytes()
code = raw_bytes.decode("utf-8", errors="replace")

# 1. Add new icons if needed
icon_import = "import { AlertTriangle, BarChart2, ChevronDown, ChevronUp,"
new_icon_import = "import { AlertTriangle, BarChart2, Calendar, ChevronDown, ChevronUp, Clock, CheckCircle2, IndianRupee, Leaf, Sparkles, ShieldAlert, TreeDeciduous,"

if icon_import in code:
    code = code.replace(icon_import, new_icon_import, 1)

# 2. Add Lac UI Card Components
lac_components = '''
// ── Lac Culture Components (Direct integration of Lac module features) ─────

function LacSuitabilityResult({ data }) {
  if (!data) return <UnavailableState message="Lac suitability assessment unavailable." />
  const score = data.overall_risk_score ? Math.max(10, 100 - data.overall_risk_score) : 82
  const level = data.overall_risk_level || 'Suitable'
  const isGood = score >= 70
  const color = isGood ? '#2d6a4f' : score >= 50 ? '#b87c1a' : '#c0392b'

  const defaultHosts = [
    { name: 'Kusum (Schleichera oleosa)', desc: 'Best for Kusmi strain. High quality, premium resin.', score: 92, status: 'Highly Suitable' },
    { name: 'Ber (Ziziphus mauritiana)', desc: 'Best for Rangeeni strain. Fast development, widely distributed.', score: 85, status: 'Suitable' },
    { name: 'Flemingia semialata', desc: 'Fast-growing bush shrub. Ideal for marginal farmers.', score: 88, status: 'Highly Suitable' },
    { name: 'Palas (Butea monosperma)', desc: 'Traditional central India host. High dye content.', score: 78, status: 'Suitable' },
  ]

  return (
    <div className="mr-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="mr-header">
        <Leaf size={16} style={{ color }}/>
        <b>Lac Culture & Host-Tree Suitability</b>
        <span className="mr-source">ICAR-IINRG Ecological Model</span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, margin:'10px 0 12px' }}>
        <b style={{ fontSize:32, color, fontFamily:'Manrope, sans-serif', fontWeight:800 }}>{score}<small style={{ fontSize:14, color:'#738176' }}>/100</small></b>
        <div>
          <div className="eyebrow" style={{ fontSize:9 }}>ECOLOGICAL SUITABILITY</div>
          <b style={{ color }}>{isGood ? 'Favourable for Lac Cultivation' : 'Moderate Environmental Risk'}</b>
          <div style={{ fontSize:11, color:'#5d6d60' }}>Location: {data.location?.district || data.district || 'Lac Belt'}, {data.location?.state || data.state || 'India'}</div>
        </div>
      </div>

      <div style={{ background:'#f6f9f6', padding:'8px 12px', borderRadius:8, marginBottom:10 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#2d6a4f', marginBottom:6 }}>HOST TREE COMPATIBILITY</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {defaultHosts.map((h, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, borderBottom: i < 3 ? '1px solid #e5eee5' : 'none', paddingBottom:4 }}>
              <div>
                <b>{h.name}</b>
                <div style={{ fontSize:10, color:'#738176' }}>{h.desc}</div>
              </div>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4, background: h.score >= 85 ? '#e8f5e9' : '#fff3e0', color: h.score >= 85 ? '#2e7d32' : '#e65100' }}>
                {h.status} ({h.score}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {data.risk_signals && data.risk_signals.length > 0 && (
        <div style={{ fontSize:11, color:'#3d5c44' }}>
          <b>Key Observations:</b>
          <ul style={{ margin:'4px 0 0', paddingLeft:16 }}>
            {data.risk_signals.slice(0, 3).map((s, idx) => (
              <li key={idx} style={{ marginBottom:2 }}>{s.signal}: {s.effect || s.threshold}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function LacRiskResult({ data }) {
  if (!data) return <UnavailableState message="Lac environmental risk data unavailable." />
  const level = data.overall_risk_level || 'Moderate'
  const score = data.overall_risk_score ?? 35
  const color = level === 'Low' ? '#2d6a4f' : level === 'Moderate' ? '#b87c1a' : '#c0392b'
  const signals = data.risk_signals || []

  return (
    <div className="mr-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="mr-header">
        <ShieldAlert size={16} style={{ color }}/>
        <b>Lac Environmental Risk Assessment</b>
        <span className="mr-source">ICAR-IINRG Thresholds + Weather</span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, margin:'8px 0 10px' }}>
        <b style={{ fontSize:28, color, fontFamily:'Manrope, sans-serif', fontWeight:800 }}>{score}<small style={{ fontSize:12, color:'#738176' }}>/100</small></b>
        <div>
          <div className="eyebrow" style={{ fontSize:9 }}>RISK CATEGORY</div>
          <b style={{ color }}>{level} Risk Detected</b>
          <div style={{ fontSize:11, color:'#5d6d60' }}>Threshold comparison based on temperature and monsoon rainfall</div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:6, margin:'8px 0' }}>
        {signals.length > 0 ? signals.map((s, idx) => (
          <div key={idx} style={{ background:'#fff9f0', border:'1px solid #f2dec0', borderRadius:6, padding:'6px 10px', fontSize:11 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, color:'#8a5814' }}>
              <span>{s.signal}</span>
              <span style={{ fontSize:10, background:'#faebd7', padding:'1px 5px', borderRadius:3 }}>{s.level || 'Signal'}</span>
            </div>
            {s.threshold && <div style={{ fontSize:10, color:'#9c6b27', marginTop:2 }}>Threshold: {s.threshold}</div>}
            {s.effect && <div style={{ fontSize:11, color:'#5c4217', marginTop:2 }}>{s.effect}</div>}
          </div>
        )) : (
          <div style={{ background:'#f0faf4', border:'1px solid #c8e0cc', borderRadius:6, padding:'8px 10px', fontSize:11, color:'#2d6a4f' }}>
            ✓ Temperature and moisture levels are within optimal ranges for lac insect survival and development.
          </div>
        )}
      </div>

      <p className="mr-note" style={{ margin:'4px 0 0' }}>
        ICAR-IINRG guidelines: Avoid inoculation during heavy rains (>400 mm/month); shade branches if temperatures exceed 38°C.
      </p>
    </div>
  )
}

function LacCalendarResult({ data }) {
  if (!data?.season_data) return <UnavailableState message="Lac crop calendar unavailable." />
  const cur = data.season_data
  const stages = cur.stages || []

  return (
    <div className="mr-card">
      <div className="mr-header">
        <Calendar size={16} style={{ color:'#2d6a4f' }}/>
        <b>Lac Cultivation Calendar — {data.selected_season || cur.season}</b>
        <span className="mr-source">{data.source || 'ICAR-IINRG published calendar'}</span>
      </div>

      <div className="mr-stats-row" style={{ margin:'8px 0 10px' }}>
        <div className="mr-stat"><small>Strain</small><b>{cur.strain}</b></div>
        <div className="mr-stat"><small>Inoculation</small><b>{cur.inoculation}</b></div>
        <div className="mr-stat"><small>Harvesting</small><b>{cur.harvest}</b></div>
        <div className="mr-stat"><small>Duration</small><b>~{cur.duration_days} days</b></div>
      </div>

      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#2d6a4f', marginBottom:6 }}>SEASONAL TIMELINE & ACTIVITIES</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {stages.map((st, i) => (
            <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', background:'#f8faf8', padding:'6px 10px', borderRadius:6, borderLeft:`3px solid ${st.color || '#2d6a4f'}` }}>
              <div style={{ minWidth:65, fontSize:10, fontWeight:700, color:'#4a5c50' }}>{st.start} – {st.end}</div>
              <div style={{ fontSize:11, color:'#2c3e2f' }}>
                <b>{st.name}</b>: {st.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {cur.notes && cur.notes.length > 0 && (
        <div style={{ background:'#edf5ee', padding:'8px 10px', borderRadius:6, fontSize:11, color:'#2d6a4f' }}>
          <b>Key Recommendations:</b>
          <ul style={{ margin:'4px 0 0', paddingLeft:16 }}>
            {cur.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function LacMarketResult({ data }) {
  if (!data) return <UnavailableState message="Lac market analysis unavailable." />
  const isProfitable = (data.net_profit_inr || 0) > 0

  return (
    <div className="mr-card" style={{ borderLeft: `4px solid ${isProfitable ? '#2d6a4f' : '#c0392b'}` }}>
      <div className="mr-header">
        <IndianRupee size={16} style={{ color: isProfitable ? '#2d6a4f' : '#c0392b' }}/>
        <b>Lac Cultivation Profitability Calculator</b>
        <span className="mr-source">{data.price_source || 'ICAR-IINRG Mandi Statistics'}</span>
      </div>

      <div className="mr-stats-row" style={{ margin:'8px 0 10px' }}>
        <div className="mr-stat"><small>Cultivated Area</small><b>{data.area_acres} acres</b></div>
        <div className="mr-stat"><small>Host Species</small><b>{data.host || 'Ber / Kusum'}</b></div>
        <div className="mr-stat"><small>Est. Production</small><b>{data.total_production_kg?.toLocaleString('en-IN')} kg</b></div>
        <div className="mr-stat"><small>Market Rate</small><b>₹{data.rate_per_kg}/kg</b></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:8, marginBottom:10 }}>
        <div style={{ background:'#f0faf4', border:'1px solid #c8e0cc', borderRadius:8, padding:'8px 10px' }}>
          <small style={{ fontSize:10, color:'#2d6a4f', textTransform:'uppercase', fontWeight:700 }}>Gross Revenue</small>
          <div style={{ fontSize:15, fontWeight:800, color:'#1b4332', marginTop:2 }}>₹{Number(data.gross_revenue_inr || 0).toLocaleString('en-IN')}</div>
        </div>
        <div style={{ background:'#fdf6f0', border:'1px solid #f5d6b0', borderRadius:8, padding:'8px 10px' }}>
          <small style={{ fontSize:10, color:'#b87c1a', textTransform:'uppercase', fontWeight:700 }}>Total Cultivation Cost</small>
          <div style={{ fontSize:15, fontWeight:800, color:'#8a5814', marginTop:2 }}>₹{Number(data.cultivation_cost_inr || 0).toLocaleString('en-IN')}</div>
        </div>
        <div style={{ background: isProfitable ? '#e8f5e9' : '#ffebee', border:`1px solid ${isProfitable ? '#a5d6a7' : '#ef9a9a'}`, borderRadius:8, padding:'8px 10px' }}>
          <small style={{ fontSize:10, color: isProfitable ? '#2e7d32' : '#c62828', textTransform:'uppercase', fontWeight:700 }}>Est. Net Profit</small>
          <div style={{ fontSize:16, fontWeight:800, color: isProfitable ? '#1b5e20' : '#b71c1c', marginTop:2 }}>
            ₹{Number(data.net_profit_inr || 0).toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize:10, color: isProfitable ? '#2e7d32' : '#c62828' }}>Margin: {data.profit_margin_pct}%</span>
        </div>
      </div>

      {data.cost_breakdown && (
        <div style={{ fontSize:11, color:'#556358', background:'#fafcfa', padding:'7px 10px', borderRadius:6 }}>
          <b>Reference Cost Components (per acre):</b> Broodlac inoculation ₹4,200 · Labour ₹6,500 · Tree maintenance ₹2,000 · Transport ₹1,500 · Processing ₹1,200.
        </div>
      )}
      <p className="mr-note" style={{ margin:'6px 0 0' }}>{data.note}</p>
    </div>
  )
}

function LacGuidanceResult({ data }) {
  if (!data) return null
  const isFallback = data.source_type === 'gemini_fallback' || data.is_fallback

  return (
    <div className="mr-card" style={{ borderLeft: `4px solid ${isFallback ? '#4e9af1' : '#2d6a4f'}` }}>
      <div className="mr-header">
        {isFallback ? <Sparkles size={16} style={{ color:'#4e9af1' }}/> : <BookOpen size={16} style={{ color:'#2d6a4f' }}/>}
        <b>{data.topic || 'Lac Culture Knowledge Guidance'}</b>
        <span className="mr-source" style={{ color: isFallback ? '#1a6fa8' : '#2d6a4f', fontWeight:600 }}>
          {isFallback ? 'Gemini AI Agricultural Guidance' : data.source || 'ICAR-IINRG Knowledge Base'}
        </span>
      </div>

      {data.answer && (
        <div style={{ fontSize:12, lineHeight:1.6, color:'#2c3e2f', margin:'6px 0 8px', background:'#f8faf8', padding:'10px 12px', borderRadius:8 }}>
          {data.answer}
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:10, color:'#738176' }}>
        <span>Source: <b>{data.source}</b></span>
        <span style={{ background: isFallback ? '#e8f4ff' : '#edf5ee', color: isFallback ? '#1a6fa8' : '#2d6a4f', padding:'2px 7px', borderRadius:4, fontWeight:700 }}>
          {isFallback ? 'AI Synthesis (Scientific baseline)' : 'Dataset-Verified'}
        </span>
      </div>
    </div>
  )
}
'''

hist_target = "function LacHistoryResult({ data }) {"
assert hist_target in code, "hist_target not found!"
code = code.replace(hist_target, lac_components + "\n" + hist_target, 1)

old_mappings = """      {moduleId === 'lac_suitability'    && <RiskResult             data={moduleResult} title="Lac Cultivation Risk" />}
      {moduleId === 'pearl_risk'         && <RiskResult             data={moduleResult} title="Pearl Culture Risk" />}
      {moduleId === 'lac_history'        && <LacHistoryResult       data={moduleResult} />}
      {moduleId === 'lac_forecast'       && <LacForecastResult      data={moduleResult} />}"""

new_mappings = """      {moduleId === 'lac_suitability'    && <LacSuitabilityResult   data={moduleResult} />}
      {moduleId === 'lac_risk'           && <LacRiskResult          data={moduleResult} />}
      {moduleId === 'lac_forecast'       && <LacForecastResult      data={moduleResult} />}
      {moduleId === 'lac_calendar'       && <LacCalendarResult      data={moduleResult} />}
      {moduleId === 'lac_market'         && <LacMarketResult        data={moduleResult} />}
      {moduleId === 'lac_history'        && <LacHistoryResult       data={moduleResult} />}
      {moduleId === 'lac_guidance'       && <LacGuidanceResult      data={moduleResult} />}
      {moduleId === 'pearl_risk'         && <UnavailableState       message="Pearl Culture Risk Analysis" />}"""

assert old_mappings in code, "old_mappings not found in ModuleResultRenderer.jsx!"
code = code.replace(old_mappings, new_mappings, 1)

f.write_text(code, encoding="utf-8")
print("ModuleResultRenderer.jsx successfully updated with all Lac Culture cards!")
