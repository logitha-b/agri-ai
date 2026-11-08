import { useLanguage } from '../../context/LanguageContext'
/**
 * CropCalendar — Lac cultivation calendar for Rangeeni and Kusmi systems.
 * Seasons: Baisakhi, Katki (Rangeeni) · Jethwi, Aghani (Kusmi).
 * Based on ICAR-IINRG published cultivation guidelines.
 * Dates are approximate — actual timing varies by state and microclimate.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, Calendar, CheckCircle2, Clock } from 'lucide-react'
import { Card, Notice } from '../../components'

// ICAR-IINRG published crop calendar (approximate India-wide)
const CALENDAR = {
  'Rangeeni · Baisakhi': {
    strain: 'Rangeeni', season: 'Baisakhi', hosts: ['Ber','Flemingia semialata'],
    inoculation: 'Feb – Mar', development: 'Mar – May', harvest: 'Apr – May',
    duration_days: 70,
    stages: [
      {name:'Inoculation', start:'Feb', end:'Mar', color:'#2d6a4f',
       desc:'Attach broodlac to host-tree twigs. Choose young shoots 6–8 mm diameter.'},
      {name:'Crawlers emerge', start:'Mar', end:'Mar', color:'#3d8050',
       desc:'Tiny first-instar crawlers emerge from broodlac and settle on tender twigs.'},
      {name:'Development', start:'Mar', end:'Apr', color:'#74c69d',
       desc:'Lac insects feed, encrust, and form the sticklac layer. Avoid disturbing.'},
      {name:'Harvest', start:'Apr', end:'May', color:'#f4a261',
       desc:'Cut inoculated twigs when 75% of insects have matured. Retain some for next cycle.'},
    ],
    notes:[
      'Suitable host: Ber (Ziziphus mauritiana) and Flemingia semialata.',
      'Harvested sticklac should be processed within 3 days to avoid insect emergence.',
      'Typical yield: 3–6 kg sticklac per kg broodlac on Ber (ICAR-IINRG estimate).',
    ],
    risks:['Avoid heavy rain or frost during inoculation.','Heat > 38°C in April may reduce survival.'],
  },
  'Rangeeni · Katki': {
    strain: 'Rangeeni', season: 'Katki', hosts: ['Ber','Flemingia semialata'],
    inoculation: 'Jun – Jul', development: 'Jul – Oct', harvest: 'Oct – Nov',
    duration_days: 120,
    stages: [
      {name:'Inoculation',    start:'Jun', end:'Jul',  color:'#2d6a4f', desc:'Monsoon inoculation on freshly grown twigs.'},
      {name:'Crawlers emerge',start:'Jul', end:'Jul',  color:'#3d8050', desc:'Crawlers settle during early monsoon.'},
      {name:'Development',    start:'Aug', end:'Oct',  color:'#74c69d', desc:'Main growth during monsoon. Heavy rain is the primary risk.'},
      {name:'Harvest',        start:'Oct', end:'Nov',  color:'#f4a261', desc:'Post-monsoon harvest. Sticklac dries quickly in cooler weather.'},
    ],
    notes:[
      'Katki season coincides with the monsoon — excess rainfall is the main risk.',
      'Use shade net if rainfall > 300 mm/month during development.',
      'Typical yield: 2–4 kg sticklac per kg broodlac (lower due to monsoon losses).',
    ],
    risks:['Heavy rain (>400 mm/month) washes broodlac off twigs.','Monitor for fungal infection in humid conditions.'],
  },
  'Kusmi · Jethwi': {
    strain: 'Kusmi', season: 'Jethwi', hosts: ['Kusum (Schleichera oleosa)','Ber'],
    inoculation: 'Oct – Nov', development: 'Nov – May', harvest: 'May – Jun',
    duration_days: 200,
    stages: [
      {name:'Inoculation',    start:'Oct', end:'Nov', color:'#2d6a4f', desc:'Post-kharif harvest inoculation on Kusum twigs.'},
      {name:'Winter growth',  start:'Nov', end:'Feb', color:'#3d8050', desc:'Slow development during cool season. Cold tolerance is a key advantage of Kusmi strain.'},
      {name:'Spring flush',   start:'Mar', end:'Apr', color:'#74c69d', desc:'Accelerated growth as temperatures rise. Check for parasite infestation.'},
      {name:'Harvest',        start:'May', end:'Jun', color:'#f4a261', desc:'Harvest before rains start. Highest quality sticklac from Kusmi Jethwi.'},
    ],
    notes:[
      'Kusmi strain preferred on Kusum (Schleichera oleosa) — best quality resin.',
      'Longest duration crop — requires sustained attention over 6–7 months.',
      'Premium price commanded by Kusmi shellac in export markets.',
    ],
    risks:['Late frost below 5°C can kill broodlac on exposed twigs.','Ensure harvest before June monsoon onset.'],
  },
  'Kusmi · Aghani': {
    strain: 'Kusmi', season: 'Aghani', hosts: ['Kusum (Schleichera oleosa)'],
    inoculation: 'May – Jun', development: 'Jun – Nov', harvest: 'Nov – Dec',
    duration_days: 180,
    stages: [
      {name:'Inoculation',    start:'May', end:'Jun', color:'#2d6a4f', desc:'Pre-monsoon inoculation on Kusum. Timing is critical — before heavy rains.'},
      {name:'Monsoon growth', start:'Jun', end:'Sep', color:'#3d8050', desc:'Development during monsoon. Kusum\'s dense canopy provides partial protection.'},
      {name:'Post-monsoon',   start:'Oct', end:'Nov', color:'#74c69d', desc:'Maturation in cooler, drier weather. Optimal final development period.'},
      {name:'Harvest',        start:'Nov', end:'Dec', color:'#f4a261', desc:'Winter harvest. Aghani sticklac has high resin content.'},
    ],
    notes:[
      'Aghani is the single most important lac crop in Jharkhand and Chhattisgarh.',
      'Kusum tree availability determines scale — requires established trees.',
      'Typical yield: 5–9 kg sticklac per kg broodlac on mature Kusum.',
    ],
    risks:['Heavy monsoon (>500 mm total) risks washout during June–August.','Ensure adequate broodlac supply from Jethwi harvest.'],
  },
}

const MONTH_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function GanttBar({ stage }) {
  const s = MONTH_ORDER.indexOf(stage.start)
  const e = MONTH_ORDER.indexOf(stage.end)
  const width = ((e - s + 1) / 12 * 100).toFixed(1)
  const left  = (s / 12 * 100).toFixed(1)
  return (
    <div className="lac-gantt-row">
      <span className="lac-gantt-label">{stage.name}</span>
      <div className="lac-gantt-track">
        <div className="lac-gantt-bar" style={{left:`${left}%`, width:`${width}%`, background:stage.color}}/>
      </div>
    </div>
  )
}

export default function CropCalendar({ derivedState, sampleSeed }) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState('Kusmi · Aghani')

  useEffect(() => {
    if (sampleSeed) {
      setSelected('Kusmi · Aghani')
    }
  }, [sampleSeed])
  const cal = CALENDAR[selected]
  const today = new Date()
  const curMonth = today.toLocaleString('en-IN', {month:'short'})

  // Find current stage
  const curStage = cal.stages.find(s => {
    const si = MONTH_ORDER.indexOf(s.start)
    const ei = MONTH_ORDER.indexOf(s.end)
    const ci = MONTH_ORDER.indexOf(curMonth)
    return ci >= si && ci <= ei
  })

  return (
    <div className="page">
      <Notice>
        Cultivation dates are approximate India-wide averages from ICAR-IINRG published guidelines.
        Actual timing varies by state, elevation, microclimate, and host-tree condition.
        Consult your local KVK or ICAR-NISA for region-specific advice.
      </Notice>

      {/* Season selector */}
      <div className="lac-season-tabs">
        {Object.keys(CALENDAR).map(k => (
          <button key={k} className={`lac-season-tab ${selected===k?'active':''}`}
            onClick={() => setSelected(k)}>
            <b>{CALENDAR[k].strain}</b>
            <span>{CALENDAR[k].season}</span>
          </button>
        ))}
      </div>

      {/* Overview card */}
      <Card
        title={`${cal.strain} · ${cal.season} season`}
        subtitle={`Host plants: ${cal.hosts.join(' · ')} · Duration: ~${cal.duration_days} days`}
      >
        <div className="lac-cal-overview">
          <div><Calendar size={14}/> <b>Inoculation:</b> {cal.inoculation}</div>
          <div><Clock size={14}/> <b>Development:</b> {cal.development}</div>
          <div><CheckCircle2 size={14}/> <b>Harvest:</b> {cal.harvest}</div>
        </div>

        {curStage && (
          <div className="lac-current-stage">
            <span className="eyebrow">CURRENT STAGE ({curMonth})</span>
            <h3>{curStage.name}</h3>
            <p>{curStage.desc}</p>
          </div>
        )}

        {/* Gantt chart */}
        <div className="lac-gantt">
          <div className="lac-gantt-months">
            {MONTH_ORDER.map(m => (
              <div key={m} className={`lac-gantt-month ${m===curMonth?'current':''}`}>{m}</div>
            ))}
          </div>
          {cal.stages.map((s,i) => <GanttBar key={i} stage={s}/>)}
        </div>
      </Card>

      {/* Stage detail */}
      <div className="lac-stages-grid">
        {cal.stages.map((s,i) => (
          <Card key={i} title={`${String(i+1).padStart(2,'0')} · ${s.name}`}
            subtitle={`${s.start} – ${s.end}`}>
            <div className="lac-stage-dot" style={{background:s.color}}/>
            <p style={{fontSize:12, marginTop:8}}>{s.desc}</p>
          </Card>
        ))}
      </div>

      {/* Notes and risks */}
      <div className="engine-two">
        <Card title="Cultivation notes" subtitle="ICAR-IINRG guidance">
          <ul className="lac-notes-list">
            {cal.notes.map((n,i) => (
              <li key={i}><CheckCircle2 size={12}/> {n}</li>
            ))}
          </ul>
        </Card>
        <Card title="Key risks for this season" subtitle="Watch for these conditions">
          <ul className="lac-notes-list">
            {cal.risks.map((r,i) => (
              <li key={i} style={{color:'#8b3a1e'}}><AlertTriangle size={12}/> {r}</li>
            ))}
          </ul>
          {derivedState && (
            <p style={{fontSize:10,color:'#7a897d',marginTop:10}}>
              Using Suitability tab for your location: {derivedState}.
              Check the Environmental Risk tab for live weather conditions.
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
