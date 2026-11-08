with open('../src/components/ModuleResultRenderer.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Replace lines 199-215 (0-indexed 198-214)
new_block = '''\
      {/* 04 — IMD Rainfall chart */}
      {rainfallData && rainfallData.available && (
        <div className="mr-card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'10px 14px 4px', borderBottom:'1px solid #edf1ed' }}>
            <b style={{ fontSize:12, color:'#4a5c50' }}>IMD District Rainfall</b>
          </div>
          <div style={{ padding:'4px 14px 10px' }}>
            <RainfallChart data={rainfallData} />
          </div>
        </div>
      )}

      {/* 05 — River Gauge: Gemini AI estimate (replaces CWC missing input) */}
      {data.river_gauge_gemini?.available && (
        <div className="mr-card" style={{ padding:0, overflow:'hidden', borderLeft:'3px solid #1a6fa8' }}>
          <div style={{ padding:'10px 14px 6px', borderBottom:'1px solid #edf1ed',
                        display:'flex', alignItems:'center', gap:6 }}>
            <Cloud size={13} style={{ color:'#1a6fa8' }}/>
            <b style={{ fontSize:12, color:'#1a3a4c' }}>River Conditions — AI Assessment</b>
            <span style={{ fontSize:10, color:'#8a968c', marginLeft:'auto', background:'#e8f4ff',
                           padding:'2px 6px', borderRadius:4 }}>Gemini AI</span>
          </div>
          <div style={{ padding:'8px 14px 10px' }}>
            <p style={{ fontSize:12, color:'#2c3e2f', lineHeight:1.6, margin:0 }}>
              {data.river_gauge_gemini.estimate}
            </p>
            <p className="mr-note" style={{ marginTop:6 }}>{data.river_gauge_gemini.note}</p>
          </div>
        </div>
      )}

      {/* 06 — Needs user input: ask farmer for field-specific data */}
      {(data.needs_user_input || []).length > 0 && (
        <div className="mr-card" style={{ padding:0, overflow:'hidden',
                                          borderLeft:'3px solid #d97706', background:'#fffbf0' }}>
          <div style={{ padding:'10px 14px 6px', borderBottom:'1px solid #f5e8c8' }}>
            <b style={{ fontSize:12, color:'#92580a' }}>Your Input Needed</b>
          </div>
          <div style={{ padding:'8px 14px 10px' }}>
            {(data.needs_user_input || []).map((item, i) => (
              <div key={i} style={{ marginBottom: i < (data.needs_user_input.length - 1) ? 10 : 0 }}>
                <p style={{ fontSize:12, fontWeight:600, color:'#92580a', margin:'0 0 2px' }}>
                  {item.label}
                </p>
                <p style={{ fontSize:12, color:'#6b5223', margin:0, lineHeight:1.5 }}>
                  {item.question}
                </p>
              </div>
            ))}
            <p className="mr-note" style={{ marginTop:8, color:'#a07030' }}>
              Type your answer in the chat — the AI will use it to refine the flood risk analysis.
            </p>
          </div>
        </div>
      )}

      {/* 07 — Flood Risk Assessment (only truly unresolved missing inputs remain) */}
      <FloodRiskCard data={floodData} />
    </div>
  )
}

'''

lines[198:215] = [new_block]
with open('../src/components/ModuleResultRenderer.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Done — FloodRiskResult updated with river gauge + user input panels')
