import { useLanguage } from '../../context/LanguageContext'
/**
 * SurvivalTracker — Mussel/oyster survival and mortality monitoring.
 * Records actual farm counts — no inferred mortality from weather or satellite.
 * Stores in localStorage.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, Notice } from '../../components'

const STORAGE_KEY = 'pearl_survival_records'
function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } }
function save(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const axis = { fontSize:11, fill:'#738176' }
const tt   = { border:'1px solid #e0e8e0', borderRadius:8, fontSize:12 }

const STAGES_FW = ['Stocking','Post-implantation','Recovery','Grow-out month 1-3',
                   'Grow-out month 4-6','Grow-out month 7+','Pre-harvest','Harvest']
const STAGES_MA = ['Spat','Nursery (2-5 cm)','Post-implantation','Grow-out (3-6 m)',
                   'Grow-out (6-12 m)','Grow-out (12-18 m)','Pre-harvest','Harvest']

function RecordForm({ cycles, onSave, onCancel, initial }) {
  const [form, setForm] = useState(initial || {
    date: new Date().toISOString().slice(0,10),
    cycle_name:'', culture_type:'freshwater', stage:'Grow-out month 1-3',
    count_alive:'', count_dead:'', count_rejected:'', notes:'',
  })
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const stages = form.culture_type === 'freshwater' ? STAGES_FW : STAGES_MA

  const submit = e => {
    e.preventDefault(); setErr('')
    if (!form.date) { setErr('Date is required.'); return }
    if (!form.count_alive && form.count_alive !== 0) { setErr('Live count is required.'); return }
    const alive    = Number(form.count_alive)
    const dead     = Number(form.count_dead || 0)
    const rejected = Number(form.count_rejected || 0)
    const total    = alive + dead + rejected
    const survival_rate = total > 0 ? ((alive / total) * 100).toFixed(1) : null
    onSave({ ...form, id: form.id || `srv_${Date.now()}`, survival_rate, total_observed: total })
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="input-grid columns-2">
        <label className="field"><span>DATE *</span>
          <input type="date" value={form.date} onChange={e=>set('date',e.target.value)}/></label>
        <label className="field"><span>FARM / CYCLE</span>
          <input value={form.cycle_name} onChange={e=>set('cycle_name',e.target.value)} placeholder="e.g. Pond A Cycle 1 or pick from dropdown"/>
        </label>
        <label className="field"><span>CULTURE TYPE</span>
          <select value={form.culture_type} onChange={e=>{set('culture_type',e.target.value);set('stage','Stocking')}}>
            <option value="freshwater">Freshwater</option>
            <option value="marine">Marine</option>
          </select>
        </label>
        <label className="field"><span>CULTURE STAGE</span>
          <select value={form.stage} onChange={e=>set('stage',e.target.value)}>
            {stages.map(s=><option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="field"><span>LIVE COUNT *</span>
          <input type="number" min="0" value={form.count_alive} onChange={e=>set('count_alive',e.target.value)} placeholder="Counted alive"/></label>
        <label className="field"><span>DEAD COUNT</span>
          <input type="number" min="0" value={form.count_dead||''} onChange={e=>set('count_dead',e.target.value)} placeholder="Observed dead"/></label>
        <label className="field"><span>REJECTED (pearl lost)</span>
          <input type="number" min="0" value={form.count_rejected||''} onChange={e=>set('count_rejected',e.target.value)} placeholder="Nucleus rejected"/></label>
        <label className="field"><span>NOTES</span>
          <input value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Observations, water conditions"/></label>
      </div>
      {err && <p className="pearl-error"><AlertTriangle size={12}/> {err}</p>}
      <div style={{display:'flex',gap:8,marginTop:10}}>
        <button type="submit" className="button"><CheckCircle2 size={14}/> Save record</button>
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function buildSampleSurvivalRecords(cultureType) {
  const today = new Date()
  const ago = d => {
    const x = new Date(today)
    x.setDate(x.getDate() - d)
    return x.toISOString().slice(0, 10)
  }
  if (cultureType === 'marine') {
    return [
      {
        id: 'srv_m01',
        date: ago(0),
        cycle_name: 'Chilika Lagoon — Marine Akoya',
        culture_type: 'marine',
        stage: 'Grow-out (12-18 m)',
        count_alive: 980,
        count_dead: 25,
        count_rejected: 15,
        survival_rate: '96.1',
        total_observed: 1020,
        notes: 'Pre-harvest inspection on long-line cages. Good nacre deposition on Pinctada fucata.',
      },
      {
        id: 'srv_m02',
        date: ago(90),
        cycle_name: 'Chilika Lagoon — Marine Akoya',
        culture_type: 'marine',
        stage: 'Grow-out (6-12 m)',
        count_alive: 1020,
        count_dead: 40,
        count_rejected: 20,
        survival_rate: '94.4',
        total_observed: 1080,
        notes: 'Mid-cycle net cleaning and biofouling removal.',
      },
      {
        id: 'srv_m03',
        date: ago(240),
        cycle_name: 'Chilika Lagoon — Marine Akoya',
        culture_type: 'marine',
        stage: 'Post-implantation',
        count_alive: 1080,
        count_dead: 70,
        count_rejected: 50,
        survival_rate: '90.0',
        total_observed: 1200,
        notes: 'Recovery period after nucleus surgery under CMFRI protocol.',
      },
      {
        id: 'srv_m04',
        date: ago(360),
        cycle_name: 'Chilika Lagoon — Marine Akoya',
        culture_type: 'marine',
        stage: 'Spat',
        count_alive: 1200,
        count_dead: 0,
        count_rejected: 0,
        survival_rate: '100.0',
        total_observed: 1200,
        notes: 'Initial stocking of healthy hatchery-reared spat.',
      },
    ]
  }
  return [
    {
      id: 'srv_s01',
      date: ago(0),
      cycle_name: 'Kolleru Pond A — Cycle 1',
      culture_type: 'freshwater',
      stage: 'Grow-out month 4-6',
      count_alive: 2120,
      count_dead: 50,
      count_rejected: 50,
      survival_rate: '95.5',
      total_observed: 2220,
      notes: 'Routine health check in net cages. Mussels active, nacre secretion steady.',
    },
    {
      id: 'srv_s02',
      date: ago(60),
      cycle_name: 'Kolleru Pond A — Cycle 1',
      culture_type: 'freshwater',
      stage: 'Grow-out month 1-3',
      count_alive: 2220,
      count_dead: 60,
      count_rejected: 30,
      survival_rate: '96.1',
      total_observed: 2310,
      notes: 'Initial grow-out sampling across 10 random cages.',
    },
    {
      id: 'srv_s03',
      date: ago(150),
      cycle_name: 'Kolleru Pond A — Cycle 1',
      culture_type: 'freshwater',
      stage: 'Post-implantation',
      count_alive: 2310,
      count_dead: 110,
      count_rejected: 80,
      survival_rate: '92.4',
      total_observed: 2500,
      notes: 'Recovery stage following nucleus surgery. Moderate rejection rate within normal ICAR-CIFE range.',
    },
    {
      id: 'srv_s04',
      date: ago(180),
      cycle_name: 'Kolleru Pond A — Cycle 1',
      culture_type: 'freshwater',
      stage: 'Stocking',
      count_alive: 2500,
      count_dead: 0,
      count_rejected: 0,
      survival_rate: '100.0',
      total_observed: 2500,
      notes: 'Stocked conditioned Lamellidens marginalis from Godavari river basin.',
    },
  ]
}

export default function SurvivalTracker({ cultureType = 'freshwater', sampleSeed }) {
  const { t } = useLanguage()
  const [records,   setRecords]   = useState(() => load())
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [filterCycle,setFilterCycle] = useState('')

  useEffect(() => {
    if (sampleSeed) {
      const sample = buildSampleSurvivalRecords(cultureType)
      persist(sample)
      setFilterCycle(cultureType === 'marine' ? 'Chilika Lagoon — Marine Akoya' : 'Kolleru Pond A — Cycle 1')
    }
  }, [sampleSeed, cultureType])

  useEffect(() => {
    if (sampleSeed) {
      const sample = buildSampleSurvivalRecords(cultureType)
      persist(sample)
      setFilterCycle(cultureType === 'marine' ? 'Chilika Lagoon — Marine Akoya' : 'Kolleru Pond A — Cycle 1')
    }
  }, [sampleSeed, cultureType])

  const persist = d => { save(d); setRecords(d) }
  const handleSave = data => {
    const idx = records.findIndex(r => r.id === data.id)
    persist(idx >= 0 ? records.map(r => r.id === data.id ? data : r) : [...records, data])
    setShowForm(false); setEditing(null)
  }
  const handleDelete = id => persist(records.filter(r => r.id !== id))

  const cycles   = [...new Set(records.map(r => r.cycle_name).filter(Boolean))]
  const filtered = records
    .filter(r => !filterCycle || r.cycle_name === filterCycle)
    .sort((a, b) => b.date.localeCompare(a.date))

  // Chart data
  const chartData = filtered.slice(0, 20).reverse().map(r => ({
    date:  r.date.slice(5),
    survival: r.survival_rate ? parseFloat(r.survival_rate) : null,
  })).filter(d => d.survival !== null)

  // Latest survival rate
  const latest = filtered.find(r => r.survival_rate !== null)

  return (
    <div className="page">
      <Notice>
        Record actual live counts from field observations. Survival rates are calculated
        from entered counts only. Do not infer mortality from weather or satellite data alone.
        Use consistent observation methods to ensure comparable readings across time.
      </Notice>

      <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <select value={filterCycle} onChange={e=>setFilterCycle(e.target.value)} className="cf-filter-select">
          <option value="">All cycles</option>
          {cycles.map(c=><option key={c}>{c}</option>)}
        </select>
        <button className="button" onClick={()=>{setShowForm(v=>!v);setEditing(null)}}>
          <Plus size={14}/> {showForm?'Cancel':'Add observation'}
        </button>
        {latest && (
          <span style={{fontSize:11, color: parseFloat(latest.survival_rate)>=70?'#3d8050':'#c0392b', fontWeight:700}}>
            Latest survival: {latest.survival_rate}% ({latest.date})
          </span>
        )}
      </div>

      {showForm && !editing && (
        <Card title="New survival observation">
          <RecordForm cycles={cycles} onSave={handleSave} onCancel={()=>setShowForm(false)}/>
        </Card>
      )}

      {chartData.length > 1 && (
        <Card title="Survival rate trend" subtitle="Observed survival % over time">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{top:8,right:10,left:0,bottom:0}}>
              <CartesianGrid stroke="#edf1ed" vertical={false}/>
              <XAxis dataKey="date" tick={axis} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={axis} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v=>[`${v}%`,'Survival rate']} contentStyle={tt}/>
              <Line type="monotone" dataKey="survival" stroke="#2d6a4f" strokeWidth={2} dot={{r:3}} connectNulls/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card title="Survival records" subtitle={`${filtered.length} observation${filtered.length!==1?'s':''}`}>
        {filtered.length === 0 ? (
          <div className="pearl-empty"><p>No survival records yet. Add the first farm observation above.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Cycle</th><th>Stage</th><th>Alive</th><th>Dead</th><th>Survival%</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => editing?.id === r.id ? (
                  <tr key={r.id}><td colSpan={7} style={{padding:'10px 0'}}>
                    <RecordForm cycles={cycles} initial={editing} onSave={handleSave} onCancel={()=>setEditing(null)}/>
                  </td></tr>
                ) : (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td><b>{r.cycle_name||'—'}</b></td>
                    <td><small>{r.stage}</small></td>
                    <td style={{color:'#3d8050',fontWeight:700}}>{Number(r.count_alive).toLocaleString('en-IN')}</td>
                    <td style={{color:'#c0392b'}}>{r.count_dead||'—'}</td>
                    <td>
                      {r.survival_rate !== null ? (
                        <b style={{color:parseFloat(r.survival_rate)>=70?'#3d8050':'#c0392b'}}>
                          {r.survival_rate}%
                        </b>
                      ) : '—'}
                    </td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="icon-button" onClick={()=>setEditing(r)}><Pencil size={12}/></button>
                        <button className="icon-button" onClick={()=>handleDelete(r.id)}><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Calculation method" subtitle="For transparency and reproducibility">
        <div style={{fontSize:11,color:'#3d5c44',lineHeight:1.6}}>
          <p><b>Survival rate</b> = (Live count ÷ (Live + Dead + Rejected)) × 100</p>
          <p><b>Mortality rate</b> = 100 − Survival rate</p>
          <p style={{color:'#7a897d',marginTop:6}}>
            Only enter counts from the same cohort observed at the same time.
            Do not compare cohorts from different stocking batches or dates without adjusting for initial count.
          </p>
        </div>
      </Card>
    </div>
  )
}
