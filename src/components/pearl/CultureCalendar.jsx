import { useLanguage } from '../../context/LanguageContext'
/**
 * CultureCalendar — Complete Pearl Culture Farm Planner
 *
 * Views:
 *   Dashboard   — KPI cards, overdue/today alerts, upcoming reminders
 *   Cycles      — create/edit culture cycles + Gantt stage timeline
 *   Tasks       — full task management (create, edit, complete, delete)
 *   Calendar    — monthly calendar with task dots
 *   Harvest     — harvest planner with estimated windows
 *
 * Storage: localStorage (backward-compatible with existing pearl_farm_cycles key)
 * Sources: ICAR-CIFE (freshwater) / CMFRI (marine) published guidelines
 */
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, BarChart3, Calendar, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Download, Fish, Pencil, Plus, RefreshCw, Trash2, XCircle,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, Notice, Progress } from '../../components'

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEYS = {
  cycles:  'pearl_farm_cycles',
  tasks:   'pearl_farm_tasks',
  harvest: 'pearl_harvest_records',
}
const load = k  => { try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] } }
const save = (k,d) => { try { localStorage.setItem(k, JSON.stringify(d)) } catch {} }

// ── Sample data (R. Kumar — Andhra Pradesh pearl farm) ────────────────────────

function buildSampleData() {
  const today   = new Date()
  const ago     = (d) => { const x = new Date(today); x.setDate(x.getDate() - d); return x.toISOString().slice(0,10) }
  const fwd     = (d) => { const x = new Date(today); x.setDate(x.getDate() + d); return x.toISOString().slice(0,10) }
  const agoM    = (m) => { const x = new Date(today); x.setMonth(x.getMonth() - m); return x.toISOString().slice(0,10) }
  const fwdM    = (m) => { const x = new Date(today); x.setMonth(x.getMonth() + m); return x.toISOString().slice(0,10) }

  const cycle1 = {
    id: 'cyc_sample_001', name: 'Kolleru Pond A — Cycle 1',
    culture_type: 'freshwater', method: 'Nucleus implantation',
    species: 'Lamellidens marginalis', location: 'Kolleru Lake', state: 'Andhra Pradesh',
    district: 'West Godavari', stocking_date: agoM(8),
    implant_date: agoM(7), stocking_count: '2500',
    harvest_est: fwdM(10), duration_months: 18,
    responsible: 'R. Kumar', notes: 'First nucleus culture trial. Survival rate tracking ongoing.',
  }

  const cycle2 = {
    id: 'cyc_sample_002', name: 'Kolleru Pond B — Without Implant',
    culture_type: 'freshwater', method: 'Without implantation',
    species: 'Lamellidens marginalis', location: 'Kolleru Lake', state: 'Andhra Pradesh',
    district: 'West Godavari', stocking_date: agoM(5),
    implant_date: '', stocking_count: '1800',
    harvest_est: fwdM(7), duration_months: 12,
    responsible: 'S. Reddy', notes: 'Experimental non-implanted batch for comparison.',
  }

  const cycle3 = {
    id: 'cyc_sample_003', name: 'Chilika Lagoon — Marine Akoya',
    culture_type: 'marine', method: 'Long-line culture',
    species: 'Pinctada fucata', location: 'Chilika Lagoon', state: 'Odisha',
    district: 'Puri', stocking_date: agoM(14),
    implant_date: agoM(10), stocking_count: '1200',
    harvest_est: fwdM(10), duration_months: 24,
    responsible: 'D. Das', notes: 'Marine culture pilot under CMFRI guidance.',
  }

  const now = new Date().toISOString()

  const tasks = [
    // Cycle 1 tasks
    { id:'tsk_s01', cycle_id:'cyc_sample_001', cycle_name:'Kolleru Pond A — Cycle 1',
      stage:'Grow-out culture', title:'Monthly water quality test',
      description:'Test temperature, pH, DO, and turbidity in all net cages.',
      due_date: ago(2), priority:'High', status:'Completed',
      assigned_to:'R. Kumar', notes:'DO was 6.2 mg/L, pH 7.4 — within range.', completed_at: ago(2)+'T09:30:00.000Z', created_at:now },
    { id:'tsk_s02', cycle_id:'cyc_sample_001', cycle_name:'Kolleru Pond A — Cycle 1',
      stage:'Grow-out culture', title:'Bi-monthly survival count',
      description:'Count live mussels across all cages to estimate mortality.',
      due_date: ago(5), priority:'High', status:'Completed',
      assigned_to:'R. Kumar', notes:'Counted 2,310 alive — survival rate 92.4%.', completed_at: ago(5)+'T10:00:00.000Z', created_at:now },
    { id:'tsk_s03', cycle_id:'cyc_sample_001', cycle_name:'Kolleru Pond A — Cycle 1',
      stage:'Grow-out culture', title:'Net and cage cleaning',
      description:'Remove fouling from nylon nets; inspect for damage.',
      due_date: ago(1), priority:'Medium', status:'Pending',
      assigned_to:'S. Reddy', notes:'', created_at:now },
    { id:'tsk_s04', cycle_id:'cyc_sample_001', cycle_name:'Kolleru Pond A — Cycle 1',
      stage:'Grow-out culture', title:'Monthly water quality test',
      description:'Routine monthly measurement — temperature, pH, DO, turbidity.',
      due_date: fwd(5), priority:'High', status:'Pending',
      assigned_to:'R. Kumar', notes:'', created_at:now },
    { id:'tsk_s05', cycle_id:'cyc_sample_001', cycle_name:'Kolleru Pond A — Cycle 1',
      stage:'Grow-out culture', title:'Environmental risk review',
      description:'Check weather forecast and seasonal risk signals.',
      due_date: fwd(10), priority:'Medium', status:'Pending',
      assigned_to:'R. Kumar', notes:'', created_at:now },
    { id:'tsk_s06', cycle_id:'cyc_sample_001', cycle_name:'Kolleru Pond A — Cycle 1',
      stage:'Grow-out culture', title:'Pearl sampling — size check',
      description:'Open 10 mussels to assess nacre thickness and pearl diameter.',
      due_date: fwd(30), priority:'High', status:'Pending',
      assigned_to:'R. Kumar', notes:'', created_at:now },
    // Overdue task
    { id:'tsk_s07', cycle_id:'cyc_sample_001', cycle_name:'Kolleru Pond A — Cycle 1',
      stage:'Grow-out culture', title:'Dissolved oxygen emergency recheck',
      description:'Recheck DO after heavy rain last week — possible oxygen depletion.',
      due_date: ago(3), priority:'High', status:'Pending',
      assigned_to:'R. Kumar', notes:'Triggered by rain event on '+ago(5), created_at:now },
    // Cycle 2 tasks
    { id:'tsk_s08', cycle_id:'cyc_sample_002', cycle_name:'Kolleru Pond B — Without Implant',
      stage:'Growth monitoring', title:'Monthly water quality test',
      description:'Standard monthly measurements for Pond B.',
      due_date: ago(1), priority:'Medium', status:'Completed',
      assigned_to:'S. Reddy', notes:'pH 7.8, Temp 28°C, DO 7.1 — all normal.', completed_at: ago(1)+'T08:00:00.000Z', created_at:now },
    { id:'tsk_s09', cycle_id:'cyc_sample_002', cycle_name:'Kolleru Pond B — Without Implant',
      stage:'Growth monitoring', title:'Monthly size measurement',
      description:'Measure shell length of 20 random mussels.',
      due_date: fwd(6), priority:'Medium', status:'Pending',
      assigned_to:'S. Reddy', notes:'', created_at:now },
    // Cycle 3 tasks
    { id:'tsk_s10', cycle_id:'cyc_sample_003', cycle_name:'Chilika Lagoon — Marine Akoya',
      stage:'Grow-out on long-line', title:'Bi-monthly water quality test',
      description:'Marine water: temperature, salinity, pH, DO check.',
      due_date: ago(4), priority:'High', status:'Completed',
      assigned_to:'D. Das', notes:'Salinity 31 ppt, Temp 28°C, DO 6.8 — optimal.', completed_at: ago(4)+'T07:30:00.000Z', created_at:now },
    { id:'tsk_s11', cycle_id:'cyc_sample_003', cycle_name:'Chilika Lagoon — Marine Akoya',
      stage:'Grow-out on long-line', title:'Fouling removal from long-lines',
      description:'Monthly cleaning of long-line structures and cages.',
      due_date: fwd(3), priority:'Medium', status:'In Progress',
      assigned_to:'D. Das', notes:'Partially done — 3 of 6 lines cleaned.', created_at:now },
    { id:'tsk_s12', cycle_id:'cyc_sample_003', cycle_name:'Chilika Lagoon — Marine Akoya',
      stage:'Grow-out on long-line', title:'Storm preparedness check',
      description:'Check mooring, anchors, and cage security before monsoon season.',
      due_date: fwd(14), priority:'High', status:'Pending',
      assigned_to:'D. Das', notes:'', created_at:now },
  ]

  const harvestRecords = []  // No actual harvest yet — cycles still active

  return { cycles:[cycle1, cycle2, cycle3], tasks, harvestRecords }
}

function loadSampleCalendar() {
  const { cycles, tasks, harvestRecords } = buildSampleData()
  localStorage.setItem(KEYS.cycles,  JSON.stringify(cycles))
  localStorage.setItem(KEYS.tasks,   JSON.stringify(tasks))
  localStorage.setItem(KEYS.harvest, JSON.stringify(harvestRecords))
}

function clearCalendarData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}

// ── Published cultivation data (ICAR-CIFE / CMFRI) ───────────────────────────
const CYCLE_GUIDES = {
  freshwater: {
    'Nucleus implantation': {
      duration_months: 18,
      stages: [
        { key:'collection', name:'Collection & conditioning', months:1, color:'#2d6a4f', desc:'Collect wild mussels; condition 2–4 weeks in nursery ponds. Select healthy, active specimens.', tasks:['Collect mussels from approved source','Inspect for parasites and disease','Set up conditioning tanks','Record initial mussel count'] },
        { key:'implant',    name:'Nucleus implantation',      months:1, color:'#3d8050', desc:'Surgical implantation by trained technician. Requires sterile conditions and appropriate anaesthetic.', tasks:['Book certified implantation technician','Prepare implantation workspace','Record nucleus size and count','Post-implantation DO check'] },
        { key:'recovery',   name:'Post-implantation recovery', months:1, color:'#52b788', desc:'Keep in recovery cages; monitor rejection rate. Remove rejected or dead mussels daily.', tasks:['Daily rejection count','Water quality check','Remove dead/rejected mussels','Record survival rate at day 7, 14, 30'] },
        { key:'culture',    name:'Grow-out culture',           months:12, color:'#74c69d', desc:'Suspend in nylon nets at 0.5–1.5 m depth. Monthly checks. Maintain DO >5 mg/L.', tasks:['Monthly water quality test','Bi-monthly survival count','Net/cage cleaning (monthly)','Environmental risk check'] },
        { key:'preharvest', name:'Pre-harvest monitoring',     months:2, color:'#f4a261', desc:'Increase inspection frequency. Sample pearls to assess size, luster, and nacre thickness.', tasks:['Pearl sampling (every 2 weeks)','Market price check','Prepare harvest equipment','Arrange grading technician'] },
        { key:'harvest',    name:'Harvest & processing',       months:1, color:'#e76f51', desc:'Remove pearls; clean and grade. Record yield, grades, and losses.', tasks:['Harvest all mussels','Clean and grade pearls','Record yield by grade','Update financial records'] },
      ],
    },
    'Without implantation': {
      duration_months: 12,
      stages: [
        { key:'stocking',   name:'Mussel stocking',    months:1,  color:'#2d6a4f', desc:'Stock juveniles at 2–3 per m². Record count.', tasks:['Stock juvenile mussels','Record initial count','Set up monitoring schedule'] },
        { key:'growth',     name:'Growth monitoring',  months:9,  color:'#74c69d', desc:'Monthly water quality and growth checks.', tasks:['Monthly water quality test','Monthly size measurement','Net cleaning','Survival count'] },
        { key:'prep',       name:'Harvest preparation',months:1,  color:'#f4a261', desc:'Assess size, maturity, and market readiness.', tasks:['Assess mussel size','Check market prices','Prepare harvest equipment'] },
        { key:'harvest',    name:'Harvest',            months:1,  color:'#e76f51', desc:'Selective harvest. Record quantity and quality.', tasks:['Harvest mussels','Record yield','Update financial records'] },
      ],
    },
  },
  marine: {
    'Long-line culture': {
      duration_months: 24,
      stages: [
        { key:'spat',       name:'Spat collection',     months:2,  color:'#1a5c6e', desc:'Collect Pinctada fucata spat on collectors during settlement season.', tasks:['Deploy spat collectors','Check settlement weekly','Record spat density','Water quality check'] },
        { key:'nursery',    name:'Nursery rearing',     months:4,  color:'#2d7a8e', desc:'Rear spat to 2–3 cm in nursery cages. Monthly size checks.', tasks:['Monthly size measurement','Water quality test','Clean cages monthly','Record survival'] },
        { key:'implant',    name:'Nucleus implantation',months:1,  color:'#3d9aae', desc:'Surgical nucleus insertion by certified technician.', tasks:['Book certified implanter','Prepare nucleus beads','Record implantation rate','Post-op DO check'] },
        { key:'culture',    name:'Grow-out on long-line',months:15, color:'#4eb8d4', desc:'Suspend on long-lines at 5–10 m depth. Bi-monthly inspections.', tasks:['Bi-monthly water quality test','Monthly survival count','Fouling removal (monthly)','Storm preparedness check'] },
        { key:'preharvest', name:'Pre-harvest inspection',months:1, color:'#f4a261', desc:'Sample pearls; assess luster, size, and nacre thickness.', tasks:['Pearl sampling','Luster assessment','Market contact','Prepare grading equipment'] },
        { key:'harvest',    name:'Harvest',              months:1, color:'#e76f51', desc:'Harvest; sort by size, shape, luster, color.', tasks:['Full harvest','Grade and sort pearls','Record yield by grade','Update financial records'] },
      ],
    },
  },
}

const PRIORITY_COLOR = { High:'#c0392b', Medium:'#b87c1a', Low:'#3d8050' }
const STATUS_COLOR   = { Completed:'#3d8050', 'In Progress':'#4e9af1', Pending:'#8a968c', Overdue:'#c0392b', Cancelled:'#b5c2b7' }
const RECURRING_INTERVALS = ['Daily','Every 2 days','Weekly','Every 2 weeks','Monthly','Every 2 months','Quarterly']

function addMonths(dateStr, n) {
  if (!dateStr) return ''
  const d = new Date(dateStr); d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}
function addDays(dateStr, n) {
  if (!dateStr) return ''
  const d = new Date(dateStr); d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function monthsBetween(a, b) {
  const s = new Date(a), e = new Date(b)
  return Math.max(0, (e.getFullYear()-s.getFullYear())*12 + e.getMonth()-s.getMonth())
}
const today = () => new Date().toISOString().slice(0, 10)
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' }) : '—'

// Compute task status including overdue auto-detection
function resolveStatus(task) {
  if (task.status === 'Completed' || task.status === 'Cancelled') return task.status
  if (task.due_date && task.due_date < today() && task.status !== 'Completed') return 'Overdue'
  return task.status || 'Pending'
}

// ── VIEW: Dashboard ───────────────────────────────────────────────────────────
function DashboardView({ cycles, tasks }) {
  const todayStr  = today()
  const allTasks  = tasks.map(t => ({ ...t, _status: resolveStatus(t) }))
  const active    = cycles.filter(c => !c.completed)
  const overdue   = allTasks.filter(t => t._status === 'Overdue')
  const dueToday  = allTasks.filter(t => t.due_date === todayStr && t._status !== 'Completed' && t._status !== 'Cancelled')
  const upcoming  = allTasks.filter(t => t.due_date > todayStr && t.due_date <= addDays(todayStr, 7) && t._status !== 'Completed')
  const completed = allTasks.filter(t => t._status === 'Completed')
  const pct       = allTasks.length > 0 ? Math.round(completed.length / allTasks.length * 100) : 0

  // Next harvest windows
  const harvests = cycles
    .filter(c => c.harvest_est)
    .sort((a, b) => a.harvest_est.localeCompare(b.harvest_est))
    .slice(0, 3)

  // Monthly task completion chart (last 4 months)
  const monthChart = []
  for (let i = 3; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const mo = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const label = d.toLocaleDateString('en-IN', { month:'short' })
    const done  = allTasks.filter(t => t.completed_at?.startsWith(mo)).length
    const total = allTasks.filter(t => t.due_date?.startsWith(mo)).length
    monthChart.push({ label, done, total })
  }

  if (cycles.length === 0 && tasks.length === 0) {
    return (
      <div className="page">
        <div className="pcc-empty-hero">
          <Fish size={40}/>
          <h2>Welcome to the Pearl Culture Farm Planner</h2>
          <p>Create your first culture cycle to start tracking farm activities, stages, and harvest windows.</p>
          <p style={{ fontSize:11, color:'#7a897d' }}>
            Switch to the <b>Cycles</b> tab to add a freshwater or marine pearl culture cycle.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* KPI strip */}
      <div className="stats-grid four">
        <article className="stat-card">
          <div className="stat-label">Active cycles<span className="stat-glyph"><Fish size={15}/></span></div>
          <strong className="stat-value">{active.length}</strong>
          <div className="stat-foot"><span>{cycles.length} total cycles</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Due today<span className="stat-glyph amber"><Clock size={15}/></span></div>
          <strong className="stat-value">{dueToday.length}</strong>
          <div className="stat-foot"><span>{upcoming.length} due this week</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Overdue<span className="stat-glyph amber"><AlertTriangle size={15}/></span></div>
          <strong className="stat-value" style={{ color: overdue.length > 0 ? '#c0392b' : undefined }}>{overdue.length}</strong>
          <div className="stat-foot"><span>{completed.length} completed total</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Completion<span className="stat-glyph"><CheckCircle2 size={15}/></span></div>
          <strong className="stat-value">{pct}%</strong>
          <div className="stat-foot"><span>{allTasks.length} total tasks</span></div>
        </article>
      </div>

      {/* Overdue alerts */}
      {overdue.length > 0 && (
        <Card title={`${overdue.length} Overdue Task${overdue.length > 1 ? 's' : ''}`}
          subtitle="These tasks passed their due date without being completed">
          <div className="pcc-task-list">
            {overdue.slice(0, 5).map(t => (
              <div key={t.id} className="pcc-task-row pcc-overdue">
                <AlertTriangle size={13} style={{ color:'#c0392b', flexShrink:0 }}/>
                <div className="pcc-task-info">
                  <b>{t.title}</b>
                  <small>{t.cycle_name} · Due {fmtDate(t.due_date)}</small>
                </div>
                <span className="pcc-priority-chip" style={{ borderColor:PRIORITY_COLOR[t.priority], color:PRIORITY_COLOR[t.priority] }}>{t.priority}</span>
              </div>
            ))}
            {overdue.length > 5 && <p style={{ fontSize:10, color:'#c0392b', margin:'5px 0 0' }}>+{overdue.length-5} more overdue tasks</p>}
          </div>
        </Card>
      )}

      {/* Due today */}
      {dueToday.length > 0 && (
        <Card title="Due Today" subtitle={todayStr}>
          <div className="pcc-task-list">
            {dueToday.map(t => (
              <div key={t.id} className="pcc-task-row">
                <Clock size={13} style={{ color:'#b87c1a', flexShrink:0 }}/>
                <div className="pcc-task-info">
                  <b>{t.title}</b>
                  <small>{t.cycle_name}{t.stage ? ' · ' + t.stage : ''}</small>
                </div>
                <span className="pcc-status-chip" style={{ background:STATUS_COLOR[t._status]+'18', color:STATUS_COLOR[t._status] }}>{t._status}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="engine-two">
        {/* Harvest windows */}
        <Card title="Upcoming Harvest Windows" subtitle="Estimated dates — confirm with field assessment">
          {harvests.length === 0 ? (
            <p className="pearl-empty" style={{ fontSize:11 }}>No harvest windows scheduled yet.</p>
          ) : harvests.map(c => {
            const daysLeft = Math.round((new Date(c.harvest_est) - new Date()) / 86400000)
            return (
              <div key={c.id} className="pcc-harvest-row">
                <div>
                  <b>{c.name}</b>
                  <small>{c.species} · {c.method}</small>
                </div>
                <div style={{ textAlign:'right' }}>
                  <b style={{ color: daysLeft < 30 ? '#3d8050' : '#68766c' }}>{fmtDate(c.harvest_est)}</b>
                  <small>{daysLeft > 0 ? `${daysLeft} days` : 'Harvest due!'}</small>
                </div>
              </div>
            )
          })}
        </Card>

        {/* Monthly chart */}
        <Card title="Monthly Task Completion" subtitle="Last 4 months">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthChart} margin={{ top:8, right:8, left:0, bottom:0 }}>
              <CartesianGrid stroke="#edf1ed" vertical={false}/>
              <XAxis dataKey="label" tick={{ fontSize:10, fill:'#738176' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:'#738176' }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ border:'1px solid #e0e8e0', borderRadius:8, fontSize:11 }}/>
              <Bar dataKey="total" name="Scheduled" fill="#e0ece0" radius={[4,4,0,0]} maxBarSize={28}/>
              <Bar dataKey="done"  name="Completed" fill="#2d6a4f" radius={[4,4,0,0]} maxBarSize={28}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Per-cycle progress */}
      <Card title="Cycle Progress" subtitle="Completion by culture cycle">
        {active.slice(0, 6).map(c => {
          const cycleTasks = allTasks.filter(t => t.cycle_id === c.id)
          const donePct    = cycleTasks.length > 0 ? Math.round(cycleTasks.filter(t=>t._status==='Completed').length / cycleTasks.length * 100) : 0
          const monthsDone = monthsBetween(c.stocking_date, today())
          const stagePct   = Math.min(100, Math.round(monthsDone / (c.duration_months || 18) * 100))
          return (
            <div key={c.id} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                <b>{c.name}</b>
                <span style={{ color:'#68766c' }}>{cycleTasks.length} tasks · {donePct}% done</span>
              </div>
              <Progress label="" value={stagePct} color="green"/>
            </div>
          )
        })}
        {active.length === 0 && <p style={{ fontSize:11, color:'#8a968c' }}>No active cycles.</p>}
      </Card>
    </div>
  )
}

// ── VIEW: Cycles (create/edit + Gantt) ────────────────────────────────────────
function CyclesView({ cycles, setCycles, tasks, setTasks }) {
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [expanded,  setExpanded]  = useState(null)
  const [filterType,setFilterType]= useState('all')
  const [confirmDel,setConfirmDel]= useState(null)

  const persist = d => { save(KEYS.cycles, d); setCycles(d) }

  const handleSave = data => {
    const idx = cycles.findIndex(c => c.id === data.id)
    const updated = idx >= 0 ? cycles.map(c => c.id === data.id ? data : c) : [...cycles, data]
    persist(updated)
    // Auto-generate stage tasks if new cycle
    if (idx < 0) autoGenerateTasks(data, tasks, setTasks)
    setShowForm(false); setEditing(null)
  }

  const handleDelete = id => {
    persist(cycles.filter(c => c.id !== id))
    // Remove associated tasks
    const remaining = tasks.filter(t => t.cycle_id !== id)
    save(KEYS.tasks, remaining); setTasks(remaining)
    setConfirmDel(null)
  }

  const filtered = cycles
    .filter(c => filterType === 'all' || c.culture_type === filterType)
    .sort((a, b) => b.stocking_date.localeCompare(a.stocking_date))

  const exportCSV = () => {
    const rows = filtered.map(c =>
      [c.name,c.culture_type,c.method,c.species,c.location,c.state||'',c.stocking_date,
       c.implant_date||'',c.stocking_count||'',c.harvest_est,c.duration_months,c.responsible||'',c.notes||''].join(',')
    )
    const csv = ['name,culture_type,method,species,location,state,stocking_date,implant_date,stocking_count,harvest_est,duration_months,responsible,notes',...rows].join('\n')
    const a   = Object.assign(document.createElement('a'), { href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})), download:'pearl-cycles.csv' })
    a.click()
  }

  return (
    <div className="page">
      <Notice>
        Harvest windows are calculated from ICAR-CIFE (freshwater) and CMFRI (marine) published
        cultivation durations. Actual timing depends on water conditions and management.
        Clearly labelled as estimates — confirm with field pearl assessment.
      </Notice>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="cf-filter-select">
          <option value="all">All types</option>
          <option value="freshwater">Freshwater</option>
          <option value="marine">Marine</option>
        </select>
        <button className="button" onClick={()=>{setShowForm(v=>!v);setEditing(null)}}>
          <Plus size={14}/> {showForm ? 'Cancel' : 'Add cycle'}
        </button>
        {filtered.length > 0 && (
          <button className="button secondary" onClick={exportCSV}><Download size={13}/> Export CSV</button>
        )}
      </div>

      {showForm && !editing && (
        <Card title="New culture cycle">
          <CycleForm onSave={handleSave} onCancel={()=>setShowForm(false)}/>
        </Card>
      )}

      {filtered.length === 0 && !showForm ? (
        <div className="pearl-empty" style={{ border:'1px dashed #d0dcd0', borderRadius:10, padding:28 }}>
          <Fish size={28} style={{ color:'#b5c2b7', margin:'0 auto 8px', display:'block' }}/>
          <p>No culture cycles yet. Add your first cycle to start the farm planner.</p>
        </div>
      ) : (
        filtered.map(c => {
          if (editing?.id === c.id) return (
            <Card key={c.id} title="Edit cycle">
              <CycleForm initial={editing} onSave={handleSave} onCancel={()=>setEditing(null)}/>
            </Card>
          )
          return (
            <GanttCycleCard key={c.id} cycle={c}
              tasks={tasks.filter(t=>t.cycle_id===c.id)}
              expanded={expanded===c.id}
              onToggle={()=>setExpanded(expanded===c.id?null:c.id)}
              onEdit={()=>setEditing(c)}
              onDelete={()=>setConfirmDel(c.id)}/>
          )
        })
      )}

      {confirmDel && (
        <div className="pcc-confirm-overlay">
          <div className="pcc-confirm-box">
            <b>Delete this cycle?</b>
            <p>All associated tasks will also be deleted. This cannot be undone.</p>
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button className="button" style={{ background:'#c0392b', borderColor:'#c0392b' }}
                onClick={()=>handleDelete(confirmDel)}>Delete</button>
              <button className="button secondary" onClick={()=>setConfirmDel(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <Card title="Published cultivation durations" subtitle="Source: ICAR-CIFE / CMFRI">
        {Object.entries(CYCLE_GUIDES).map(([ct, methods]) => (
          <div key={ct} style={{ marginBottom:10 }}>
            <b style={{ fontSize:11, textTransform:'capitalize', color:'#1a3a4c' }}>{ct}</b>
            {Object.entries(methods).map(([m, g]) => (
              <div key={m} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #edf0ed', fontSize:11, color:'#3d5c44' }}>
                <span>{m}</span><b>~{g.duration_months} months</b>
              </div>
            ))}
          </div>
        ))}
      </Card>
    </div>
  )
}

// ── Cycle form ────────────────────────────────────────────────────────────────
function CycleForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name:'', culture_type:'freshwater', method:'Nucleus implantation',
    species:'Lamellidens marginalis', location:'', state:'', district:'',
    stocking_date:'', implant_date:'', stocking_count:'',
    responsible:'', notes:'',
  })
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const methods = Object.keys(CYCLE_GUIDES[form.culture_type] || {})
  const guide   = CYCLE_GUIDES[form.culture_type]?.[form.method]
  const needsImplant = form.method?.toLowerCase().includes('implant') || form.method?.toLowerCase().includes('grafting')

  const submit = e => {
    e.preventDefault(); setErr('')
    if (!form.name)          { setErr('Cycle name is required.'); return }
    if (!form.stocking_date) { setErr('Stocking date is required.'); return }
    if (needsImplant && form.implant_date && form.implant_date < form.stocking_date)
      { setErr('Implantation date cannot be before stocking date.'); return }
    const dur = guide?.duration_months || 18
    onSave({ ...form, id: form.id || `cyc_${Date.now()}`, duration_months: dur,
      harvest_est: addMonths(form.stocking_date, dur) })
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="input-grid columns-2">
        <label className="field"><span>CYCLE NAME *</span>
          <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Pond A — Cycle 1 2026"/></label>
        <label className="field"><span>CULTURE TYPE</span>
          <select value={form.culture_type} onChange={e=>{set('culture_type',e.target.value);set('method',Object.keys(CYCLE_GUIDES[e.target.value]||{})[0]||'')}}>
            <option value="freshwater">Freshwater</option>
            <option value="marine">Marine</option>
          </select>
        </label>
        <label className="field"><span>METHOD</span>
          <select value={form.method} onChange={e=>set('method',e.target.value)}>
            {methods.map(m=><option key={m}>{m}</option>)}
          </select>
        </label>
        <label className="field"><span>SPECIES</span>
          <input value={form.species} onChange={e=>set('species',e.target.value)} placeholder="e.g. Lamellidens marginalis"/></label>
        <label className="field"><span>FARM / WATER BODY</span>
          <input value={form.location} onChange={e=>set('location',e.target.value)} placeholder="e.g. Kolleru Lake"/></label>
        <label className="field"><span>STATE</span>
          <input value={form.state||''} onChange={e=>set('state',e.target.value)} placeholder="e.g. Andhra Pradesh"/></label>
        <label className="field"><span>STOCKING DATE *</span>
          <input type="date" value={form.stocking_date} onChange={e=>set('stocking_date',e.target.value)}/></label>
        {needsImplant && (
          <label className="field"><span>IMPLANTATION DATE (optional)</span>
            <input type="date" value={form.implant_date||''} onChange={e=>set('implant_date',e.target.value)}/></label>
        )}
        <label className="field"><span>STOCKING COUNT</span>
          <input type="number" min="1" value={form.stocking_count||''} onChange={e=>set('stocking_count',e.target.value)} placeholder="Number of mussels/oysters"/></label>
        <label className="field"><span>RESPONSIBLE PERSON</span>
          <input value={form.responsible||''} onChange={e=>set('responsible',e.target.value)} placeholder="Farm manager name"/></label>
        <label className="field" style={{ gridColumn:'1/-1' }}><span>NOTES</span>
          <input value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Any additional notes"/></label>
      </div>
      {guide && form.stocking_date && (
        <p className="lac-form-note">
          Estimated harvest: {addMonths(form.stocking_date, guide.duration_months)} (~{guide.duration_months} months · {form.method})
          <span style={{ color:'#8a968c', marginLeft:6 }}>— estimate only, confirm with field assessment</span>
        </p>
      )}
      {err && <p className="pearl-error"><AlertTriangle size={12}/> {err}</p>}
      <div style={{ display:'flex', gap:8, marginTop:10 }}>
        <button type="submit" className="button"><CheckCircle2 size={14}/> Save cycle</button>
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ── Gantt cycle card ──────────────────────────────────────────────────────────
function GanttCycleCard({ cycle, tasks, expanded, onToggle, onEdit, onDelete }) {
  const todayStr   = today()
  const guide      = CYCLE_GUIDES[cycle.culture_type]?.[cycle.method]
  const monthsDone = monthsBetween(cycle.stocking_date, todayStr)
  const pct        = Math.min(100, Math.round(monthsDone / (cycle.duration_months || 18) * 100))
  const overdue    = cycle.harvest_est && cycle.harvest_est < todayStr
  const daysToHarv = Math.round((new Date(cycle.harvest_est) - new Date()) / 86400000)

  // Current stage
  let acc = 0
  const currentStage = guide?.stages.find(s => {
    const start = acc; acc += s.months
    return monthsDone >= start && monthsDone < acc
  })

  const taskStats = {
    done:    tasks.filter(t => resolveStatus(t) === 'Completed').length,
    overdue: tasks.filter(t => resolveStatus(t) === 'Overdue').length,
    total:   tasks.length,
  }

  return (
    <div className="pcc-cycle-card">
      <div className="pcc-cycle-header" onClick={onToggle} style={{ cursor:'pointer' }}>
        <div>
          <b>{cycle.name}</b>
          <small> · {cycle.method} · {cycle.species}</small>
          {cycle.location && <small style={{ display:'block', color:'#8a968c' }}>{cycle.location}{cycle.state ? ', '+cycle.state : ''}</small>}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {taskStats.overdue > 0 && <span className="pcc-badge-warn">{taskStats.overdue} overdue</span>}
          <span style={{ fontSize:10, color:'#68766c' }}>{taskStats.done}/{taskStats.total} tasks</span>
          <button className="icon-button" onClick={e=>{e.stopPropagation();onEdit()}}><Pencil size={12}/></button>
          <button className="icon-button" onClick={e=>{e.stopPropagation();onDelete()}}><Trash2 size={12}/></button>
        </div>
      </div>

      {/* Dates strip */}
      <div className="pearl-cycle-dates">
        <div><Calendar size={12}/> Stocked: {cycle.stocking_date}</div>
        {cycle.implant_date && <div><Calendar size={12}/> Implanted: {cycle.implant_date}</div>}
        <div><Clock size={12}/> Est. harvest: {fmtDate(cycle.harvest_est)}
          {overdue ? <span style={{ color:'#c0392b', marginLeft:5 }}>⚠ Overdue</span>
                   : daysToHarv > 0 && daysToHarv < 60 ? <span style={{ color:'#3d8050', marginLeft:5 }}>({daysToHarv}d)</span> : null}
        </div>
        {cycle.responsible && <div>Responsible: {cycle.responsible}</div>}
      </div>

      {/* Progress */}
      <div style={{ margin:'8px 0 4px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#68766c', marginBottom:3 }}>
          <span>{currentStage ? 'Stage: '+currentStage.name : 'Progress'}</span>
          <span>{pct}% · Month {monthsDone} of {cycle.duration_months}</span>
        </div>
        <div className="progress-track">
          <i style={{ width:`${pct}%`, background: overdue ? '#c0392b' : '#2d6a4f' }}/>
        </div>
      </div>

      {/* Gantt stage bar */}
      {guide && (
        <div className="pcc-gantt-bar">
          {guide.stages.map((s, i) => (
            <div key={i} title={`${s.name} (${s.months}mo)`}
              style={{ flex:s.months, height:14, background:s.color,
                opacity: s === currentStage ? 1 : 0.5,
                borderRadius: i===0?'4px 0 0 4px':i===guide.stages.length-1?'0 4px 4px 0':'0',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
              {s.months >= 3 && <span style={{ fontSize:8, color:'#fff', fontWeight:700, letterSpacing:'.02em' }}>
                {s.name.split(' ')[0]}
              </span>}
            </div>
          ))}
        </div>
      )}

      {/* Expanded: stage detail + tasks */}
      {expanded && guide && (
        <div className="pcc-stage-detail">
          {guide.stages.map((s, i) => {
            let stageAcc = 0
            for (let j = 0; j < i; j++) stageAcc += guide.stages[j].months
            const stageStart = addMonths(cycle.stocking_date, stageAcc)
            const stageEnd   = addMonths(cycle.stocking_date, stageAcc + s.months)
            const isActive   = s === currentStage
            const isPast     = stageEnd < todayStr
            return (
              <div key={s.key} className={`pcc-stage-row ${isActive?'active':''} ${isPast?'past':''}`}>
                <div className="pcc-stage-dot" style={{ background:s.color }}/>
                <div>
                  <b>{String(i+1).padStart(2,'0')} · {s.name}</b>
                  {isActive && <span className="pcc-badge-active">CURRENT</span>}
                  {isPast    && <span className="pcc-badge-past">DONE</span>}
                  <small style={{ display:'block', color:'#68766c' }}>{fmtDate(stageStart)} – {fmtDate(stageEnd)}</small>
                  <p style={{ fontSize:11, color:'#3d5c44', margin:'3px 0 0' }}>{s.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Auto-generate tasks from cycle ───────────────────────────────────────────
function autoGenerateTasks(cycle, tasks, setTasks) {
  const guide = CYCLE_GUIDES[cycle.culture_type]?.[cycle.method]
  if (!guide) return
  const newTasks = []
  let acc = 0
  guide.stages.forEach(stage => {
    const stageStart = addMonths(cycle.stocking_date, acc)
    stage.tasks?.forEach((t, i) => {
      const dueDate = addDays(stageStart, i * 7) // spread tasks weekly within stage
      newTasks.push({
        id:          `tsk_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        cycle_id:    cycle.id,
        cycle_name:  cycle.name,
        stage:       stage.name,
        title:       t,
        description: '',
        due_date:    dueDate,
        priority:    stage.name.includes('implant') || stage.name.includes('Harvest') ? 'High' : 'Medium',
        status:      'Pending',
        assigned_to: cycle.responsible || '',
        notes:       '',
        created_at:  new Date().toISOString(),
      })
    })
    acc += stage.months
  })
  const updated = [...tasks, ...newTasks]
  save(KEYS.tasks, updated); setTasks(updated)
}

// ── VIEW: Tasks ───────────────────────────────────────────────────────────────
function TasksView({ tasks, setTasks, cycles }) {
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [filterCyc, setFilterCyc] = useState('')
  const [filterSta, setFilterSta] = useState('')
  const [filterPri, setFilterPri] = useState('')
  const [search,    setSearch]    = useState('')
  const [confirmDel,setConfirmDel]= useState(null)

  const persist = d => { save(KEYS.tasks, d); setTasks(d) }

  const handleSave = data => {
    const idx = tasks.findIndex(t => t.id === data.id)
    persist(idx >= 0 ? tasks.map(t => t.id === data.id ? data : t) : [...tasks, data])
    setShowForm(false); setEditing(null)
  }
  const handleDelete = id => { persist(tasks.filter(t => t.id !== id)); setConfirmDel(null) }
  const markDone = id => {
    persist(tasks.map(t => t.id === id
      ? { ...t, status:'Completed', completed_at: new Date().toISOString() }
      : t))
  }

  const allTasks  = tasks.map(t => ({ ...t, _status: resolveStatus(t) }))
  const cycleNames = [...new Set(tasks.map(t => t.cycle_name).filter(Boolean))].sort()
  const stageNames = [...new Set(tasks.map(t => t.stage).filter(Boolean))].sort()

  const filtered = allTasks
    .filter(t => !filterCyc || t.cycle_name === filterCyc)
    .filter(t => !filterSta || t.stage === filterSta)
    .filter(t => !filterPri || t.priority === filterPri)
    .filter(t => !search    || [t.title,t.description,t.notes,t.assigned_to].join(' ').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a._status==='Overdue' && b._status!=='Overdue') return -1
      if (b._status==='Overdue' && a._status!=='Overdue') return 1
      return (a.due_date||'').localeCompare(b.due_date||'')
    })

  const exportCSV = () => {
    const rows = filtered.map(t =>
      [t.title,t.cycle_name,t.stage,t.due_date,t.priority,t._status,t.assigned_to||'',t.notes||'',t.completed_at||''].join(',')
    )
    const a = Object.assign(document.createElement('a'),{
      href:URL.createObjectURL(new Blob([['title,cycle,stage,due_date,priority,status,assigned_to,notes,completed_at',...rows].join('\n')],{type:'text/csv'})),
      download:'pearl-tasks.csv' })
    a.click()
  }

  return (
    <div className="page">
      {/* Filters */}
      <div className="pcc-filters">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks…" className="cf-filter-select"/>
        <select value={filterCyc} onChange={e=>setFilterCyc(e.target.value)} className="cf-filter-select">
          <option value="">All cycles</option>
          {cycleNames.map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={filterSta} onChange={e=>setFilterSta(e.target.value)} className="cf-filter-select">
          <option value="">All stages</option>
          {stageNames.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={filterPri} onChange={e=>setFilterPri(e.target.value)} className="cf-filter-select">
          <option value="">All priorities</option>
          {['High','Medium','Low'].map(p=><option key={p}>{p}</option>)}
        </select>
        <button className="button" onClick={()=>{setShowForm(v=>!v);setEditing(null)}}>
          <Plus size={14}/> {showForm?'Cancel':'Add task'}
        </button>
        {filtered.length > 0 && <button className="button secondary" onClick={exportCSV}><Download size={13}/> CSV</button>}
      </div>

      {showForm && !editing && (
        <Card title="New task">
          <TaskForm cycles={cycles} onSave={handleSave} onCancel={()=>setShowForm(false)}/>
        </Card>
      )}

      <Card title="Tasks" subtitle={`${filtered.length} of ${tasks.length} tasks`}>
        {filtered.length === 0 ? (
          <div className="pearl-empty"><p>No tasks match the current filters.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Task</th><th>Cycle</th><th>Stage</th><th>Due</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(t => editing?.id === t.id ? (
                  <tr key={t.id}><td colSpan={8} style={{ padding:'10px 0' }}>
                    <TaskForm cycles={cycles} initial={editing} onSave={handleSave} onCancel={()=>setEditing(null)}/>
                  </td></tr>
                ) : (
                  <tr key={t.id} style={{ background: t._status==='Overdue' ? '#fff8f8' : undefined }}>
                    <td>
                      <b style={{ fontSize:11 }}>{t.title}</b>
                      {t.description && <small style={{ display:'block', color:'#8a968c' }}>{t.description.slice(0,50)}</small>}
                    </td>
                    <td><small>{t.cycle_name}</small></td>
                    <td><small>{t.stage}</small></td>
                    <td style={{ color: t._status==='Overdue'?'#c0392b':undefined }}><b style={{ fontSize:11 }}>{fmtDate(t.due_date)}</b></td>
                    <td><span className="pcc-priority-chip" style={{ borderColor:PRIORITY_COLOR[t.priority],color:PRIORITY_COLOR[t.priority] }}>{t.priority}</span></td>
                    <td><span className="pcc-status-chip" style={{ background:STATUS_COLOR[t._status]+'22',color:STATUS_COLOR[t._status] }}>{t._status}</span></td>
                    <td><small>{t.assigned_to||'—'}</small></td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        {t._status !== 'Completed' && (
                          <button className="icon-button" title="Mark complete" onClick={()=>markDone(t.id)}>
                            <CheckCircle2 size={12} style={{ color:'#3d8050' }}/>
                          </button>
                        )}
                        <button className="icon-button" onClick={()=>setEditing(t)}><Pencil size={12}/></button>
                        <button className="icon-button" onClick={()=>setConfirmDel(t.id)}><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {confirmDel && (
        <div className="pcc-confirm-overlay">
          <div className="pcc-confirm-box">
            <b>Delete this task?</b>
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button className="button" style={{ background:'#c0392b', borderColor:'#c0392b' }} onClick={()=>handleDelete(confirmDel)}>Delete</button>
              <button className="button secondary" onClick={()=>setConfirmDel(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Task form ─────────────────────────────────────────────────────────────────
function TaskForm({ cycles, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    cycle_id:'', cycle_name:'', stage:'', title:'', description:'',
    due_date: addDays(today(), 7), priority:'Medium', status:'Pending',
    assigned_to:'', notes:'',
  })
  const [err, setErr] = useState('')
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const selCycle = cycles.find(c=>c.id===form.cycle_id)
  const guide    = selCycle ? CYCLE_GUIDES[selCycle.culture_type]?.[selCycle.method] : null
  const stageNames = guide?.stages.map(s=>s.name) || []

  const submit = e => {
    e.preventDefault(); setErr('')
    if (!form.title)    { setErr('Task title is required.'); return }
    if (!form.due_date) { setErr('Due date is required.'); return }
    onSave({ ...form, id: form.id || `tsk_${Date.now()}`, created_at: form.created_at || new Date().toISOString() })
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="input-grid columns-2">
        <label className="field"><span>TASK TITLE *</span>
          <input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Monthly water quality test"/></label>
        <label className="field"><span>CULTURE CYCLE</span>
          <select value={form.cycle_id} onChange={e=>{
            const c=cycles.find(x=>x.id===e.target.value)
            set('cycle_id',e.target.value); set('cycle_name',c?.name||'')
          }}>
            <option value="">— Not linked —</option>
            {cycles.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="field"><span>STAGE</span>
          <select value={form.stage} onChange={e=>set('stage',e.target.value)}>
            <option value="">— Select stage —</option>
            {stageNames.map(s=><option key={s}>{s}</option>)}
            <option value="General">General (not stage-specific)</option>
          </select>
        </label>
        <label className="field"><span>PRIORITY</span>
          <select value={form.priority} onChange={e=>set('priority',e.target.value)}>
            <option>High</option><option>Medium</option><option>Low</option>
          </select>
        </label>
        <label className="field"><span>DUE DATE *</span>
          <input type="date" value={form.due_date} onChange={e=>set('due_date',e.target.value)}/></label>
        <label className="field"><span>STATUS</span>
          <select value={form.status} onChange={e=>set('status',e.target.value)}>
            <option>Pending</option><option>In Progress</option><option>Completed</option><option>Cancelled</option>
          </select>
        </label>
        <label className="field"><span>ASSIGNED TO</span>
          <input value={form.assigned_to||''} onChange={e=>set('assigned_to',e.target.value)} placeholder="Person responsible"/></label>
        <label className="field"><span>DESCRIPTION</span>
          <input value={form.description||''} onChange={e=>set('description',e.target.value)} placeholder="Optional description"/></label>
        <label className="field" style={{ gridColumn:'1/-1' }}><span>NOTES</span>
          <input value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Inspection results, observations..."/></label>
      </div>
      {err && <p className="pearl-error"><AlertTriangle size={12}/> {err}</p>}
      <div style={{ display:'flex', gap:8, marginTop:10 }}>
        <button type="submit" className="button"><CheckCircle2 size={14}/> Save task</button>
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ── VIEW: Calendar ────────────────────────────────────────────────────────────
function CalendarView({ tasks }) {
  const now       = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const allTasks = tasks.map(t => ({ ...t, _status: resolveStatus(t) }))

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const monthName   = new Date(year, month, 1).toLocaleDateString('en-IN', { month:'long', year:'numeric' })

  const dayTasks = {}
  allTasks.forEach(t => {
    if (!t.due_date) return
    const d = new Date(t.due_date)
    if (d.getFullYear()===year && d.getMonth()===month) {
      const day = d.getDate()
      if (!dayTasks[day]) dayTasks[day] = []
      dayTasks[day].push(t)
    }
  })

  const todayD = now.getDate()
  const cells  = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  return (
    <div className="page">
      <Card title="Calendar View" subtitle="Tasks shown on their due date"
        action={
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <button className="icon-button" onClick={()=>{ let m=month-1; let y=year; if(m<0){m=11;y--;} setMonth(m);setYear(y) }}><ChevronLeft size={16}/></button>
            <b style={{ fontSize:12, minWidth:120, textAlign:'center' }}>{monthName}</b>
            <button className="icon-button" onClick={()=>{ let m=month+1; let y=year; if(m>11){m=0;y++;} setMonth(m);setYear(y) }}><ChevronRight size={16}/></button>
            <button className="icon-button" title="Today" onClick={()=>{setYear(now.getFullYear());setMonth(now.getMonth())}}><RefreshCw size={13}/></button>
          </div>
        }>
        <div className="pcc-cal-header">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d}>{d}</div>)}
        </div>
        <div className="pcc-cal-grid">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="pcc-cal-cell pcc-empty-cell"/>
            const isToday    = d===todayD && month===now.getMonth() && year===now.getFullYear()
            const dayTaskArr = dayTasks[d] || []
            return (
              <div key={i} className={`pcc-cal-cell ${isToday?'pcc-today':''}`}>
                <span className="pcc-cal-day">{d}</span>
                <div className="pcc-cal-dots">
                  {dayTaskArr.slice(0,3).map((t,j) => (
                    <span key={j} className="pcc-cal-dot" title={t.title}
                      style={{ background: t._status==='Overdue'?'#c0392b' : t._status==='Completed'?'#3d8050' : t.priority==='High'?'#e76f51' : '#4e9af1' }}/>
                  ))}
                  {dayTaskArr.length > 3 && <span style={{ fontSize:8, color:'#8a968c' }}>+{dayTaskArr.length-3}</span>}
                </div>
                {dayTaskArr.slice(0,2).map((t,j)=>(
                  <div key={j} className="pcc-cal-task-label" title={t.title}
                    style={{ borderLeft:`2px solid ${t._status==='Overdue'?'#c0392b':PRIORITY_COLOR[t.priority]}` }}>
                    {t.title.slice(0,16)}{t.title.length>16?'…':''}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        <div className="pcc-cal-legend">
          <span><i style={{ background:'#c0392b' }}/> Overdue</span>
          <span><i style={{ background:'#3d8050' }}/> Completed</span>
          <span><i style={{ background:'#e76f51' }}/> High priority</span>
          <span><i style={{ background:'#4e9af1' }}/> Other</span>
        </div>
      </Card>
    </div>
  )
}

// ── VIEW: Harvest Planner ─────────────────────────────────────────────────────
function HarvestView({ cycles, setCycles }) {
  const [harvestRecs, setHarvestRecs] = useState(() => load(KEYS.harvest))
  const [editing, setEditing] = useState(null)

  const saveHarvest = rec => {
    const list = harvestRecs.findIndex(h=>h.id===rec.id) >= 0
      ? harvestRecs.map(h=>h.id===rec.id?rec:h)
      : [...harvestRecs, { ...rec, id:`hv_${Date.now()}` }]
    save(KEYS.harvest, list); setHarvestRecs(list); setEditing(null)
  }

  const todayStr = today()

  return (
    <div className="page">
      <Notice>
        Harvest windows are estimates based on ICAR-CIFE (freshwater, 12–24 months) and
        CMFRI (marine, 18–36 months) published durations. Actual harvest readiness must
        be confirmed by pearl sampling and expert assessment. Never harvest based on
        estimated dates alone.
      </Notice>

      {cycles.length === 0 ? (
        <div className="pearl-empty"><p>No culture cycles yet. Add cycles in the Cycles tab to see harvest windows.</p></div>
      ) : (
        cycles.filter(c=>c.harvest_est).sort((a,b)=>a.harvest_est.localeCompare(b.harvest_est)).map(c => {
          const daysLeft = Math.round((new Date(c.harvest_est)-new Date())/86400000)
          const harvest  = harvestRecs.find(h=>h.cycle_id===c.id)
          const isOverdue= c.harvest_est < todayStr && !harvest
          return (
            <Card key={c.id}
              title={c.name}
              subtitle={`${c.species} · ${c.method} · ${c.culture_type}`}
              action={<span style={{ fontSize:10, color: isOverdue?'#c0392b': daysLeft<30?'#3d8050':'#68766c', fontWeight:700 }}>
                {harvest ? 'Harvested ' + fmtDate(harvest.actual_date) : isOverdue ? 'Past estimated window' : daysLeft > 0 ? `${daysLeft} days to harvest` : 'Harvest now'}
              </span>}
            >
              <div className="pcc-harvest-detail">
                <div><small>Stocked</small><b>{fmtDate(c.stocking_date)}</b></div>
                {c.implant_date && <div><small>Implanted</small><b>{fmtDate(c.implant_date)}</b></div>}
                <div><small>Estimated harvest</small><b style={{ color: isOverdue?'#c0392b':'#1a3a4c' }}>{fmtDate(c.harvest_est)}</b></div>
                <div><small>Duration</small><b>~{c.duration_months} months</b></div>
                <div><small>Location</small><b>{c.location || '—'}</b></div>
                <div><small>Stocking count</small><b>{c.stocking_count ? Number(c.stocking_count).toLocaleString('en-IN') : '—'}</b></div>
              </div>
              <p style={{ fontSize:10, color:'#8a968c', margin:'8px 0' }}>
                Estimated window source: {c.culture_type==='freshwater'?'ICAR-CIFE Freshwater Pearl Culture Manual':'CMFRI Pearl Oyster Culture Guidelines'} — confirm with pearl sampling.
              </p>
              {harvest ? (
                <div style={{ background:'#edf5ee', borderRadius:8, padding:'10px 12px', fontSize:11 }}>
                  <b style={{ color:'#2d6a4f' }}>Harvest recorded</b>
                  <div className="pcc-harvest-detail" style={{ marginTop:6 }}>
                    <div><small>Actual date</small><b>{fmtDate(harvest.actual_date)}</b></div>
                    <div><small>Quantity harvested</small><b>{harvest.qty_harvested || '—'}</b></div>
                    <div><small>Saleable pearls</small><b>{harvest.qty_saleable || '—'}</b></div>
                    <div><small>Survival rate</small><b>{harvest.survival_rate ? harvest.survival_rate+'%' : '—'}</b></div>
                    <div><small>Quality grade</small><b>{harvest.quality_grade || '—'}</b></div>
                    <div><small>Notes</small><b>{harvest.notes || '—'}</b></div>
                  </div>
                </div>
              ) : (
                <button className="button secondary" style={{ marginTop:8 }} onClick={()=>setEditing(c)}>
                  <Plus size={13}/> Record actual harvest
                </button>
              )}
            </Card>
          )
        })
      )}

      {editing && (
        <div className="pcc-confirm-overlay">
          <div className="pcc-confirm-box" style={{ maxWidth:480 }}>
            <b>Record harvest — {editing.name}</b>
            <HarvestForm cycle={editing} onSave={saveHarvest} onCancel={()=>setEditing(null)}/>
          </div>
        </div>
      )}
    </div>
  )
}

function HarvestForm({ cycle, onSave, onCancel }) {
  const [form, setForm] = useState({ cycle_id:cycle.id, actual_date:today(), qty_harvested:'', qty_saleable:'', survival_rate:'', quality_grade:'Grade A', notes:'' })
  const [err, setErr] = useState('')
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const submit = e => {
    e.preventDefault(); setErr('')
    if (!form.actual_date) { setErr('Harvest date is required.'); return }
    onSave(form)
  }
  return (
    <form onSubmit={submit} noValidate style={{ marginTop:12 }}>
      <div className="input-grid columns-2">
        <label className="field"><span>ACTUAL HARVEST DATE *</span>
          <input type="date" value={form.actual_date} onChange={e=>set('actual_date',e.target.value)}/></label>
        <label className="field"><span>TOTAL HARVESTED</span>
          <input type="number" value={form.qty_harvested||''} onChange={e=>set('qty_harvested',e.target.value)} placeholder="Total mussels/oysters"/></label>
        <label className="field"><span>SALEABLE PEARLS</span>
          <input type="number" value={form.qty_saleable||''} onChange={e=>set('qty_saleable',e.target.value)} placeholder="Marketable pearls"/></label>
        <label className="field"><span>SURVIVAL RATE (%)</span>
          <input type="number" min="0" max="100" value={form.survival_rate||''} onChange={e=>set('survival_rate',e.target.value)} placeholder="0–100"/></label>
        <label className="field"><span>QUALITY GRADE</span>
          <select value={form.quality_grade} onChange={e=>set('quality_grade',e.target.value)}>
            {['Grade A','Grade B','Grade C','Mixed','Not graded'].map(g=><option key={g}>{g}</option>)}
          </select>
        </label>
        <label className="field"><span>NOTES</span>
          <input value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Pearl quality observations..."/></label>
      </div>
      {err && <p className="pearl-error"><AlertTriangle size={12}/> {err}</p>}
      <div style={{ display:'flex', gap:8, marginTop:10 }}>
        <button type="submit" className="button"><CheckCircle2 size={14}/> Save harvest</button>
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const VIEWS = [
  { id:'dashboard', label:'Dashboard'    },
  { id:'cycles',    label:'Cycles'       },
  { id:'tasks',     label:'Tasks'        },
  { id:'calendar',  label:'Calendar'     },
  { id:'harvest',   label:'Harvest'      },
]

export default function CultureCalendar({ sampleSeed }) {
  const { t } = useLanguage()
  const [view,   setView]   = useState('dashboard')
  const [cycles, setCycles] = useState(() => load(KEYS.cycles))
  const [tasks,  setTasks]  = useState(() => load(KEYS.tasks))
  const [sampleConfirmClear, setSampleConfirmClear] = useState(false)

  const handleLoadSample = () => {
    loadSampleCalendar()
    setCycles(load(KEYS.cycles))
    setTasks(load(KEYS.tasks))
    setView('dashboard')
    setSampleConfirmClear(false)
  }

  const handleClearAll = () => {
    clearCalendarData()
    setCycles([]); setTasks([])
    setSampleConfirmClear(false)
  }

  return (
    <div className="page">
      {/* Sub-nav */}
      <div className="pcc-subnav">
        {VIEWS.map(v => (
          <button key={v.id} className={`pcc-subnav-btn ${view===v.id?'active':''}`}
            onClick={()=>setView(v.id)}>
            {v.label}
            {v.id === 'tasks' && tasks.filter(t=>resolveStatus(t)==='Overdue').length > 0 && (
              <span className="pcc-subnav-badge">{tasks.filter(t=>resolveStatus(t)==='Overdue').length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Sample data card — always visible when no real data exists OR inline dismissable */}
      {cycles.length === 0 && tasks.length === 0 && (
        <div className="pcc-sample-card">
          <div className="pcc-sample-info">
            <Fish size={18}/>
            <div>
              <b>Load sample farm data</b>
              <p>3 culture cycles (Andhra Pradesh freshwater + Odisha marine), 12 tasks across all stages, overdue alerts, and upcoming harvest windows.</p>
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button className="button" onClick={handleLoadSample}>
              ↓ Load sample data
            </button>
          </div>
        </div>
      )}

      {/* Compact sample button when data exists */}
      {(cycles.length > 0 || tasks.length > 0) && (
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,alignItems:'center'}}>
          <button className="button secondary" style={{fontSize:10}} onClick={handleLoadSample}>
            ↓ Reload sample
          </button>
          {sampleConfirmClear ? (
            <>
              <button className="button" style={{fontSize:10,background:'#c0392b',borderColor:'#c0392b'}} onClick={handleClearAll}>
                Confirm clear
              </button>
              <button className="button secondary" style={{fontSize:10}} onClick={()=>setSampleConfirmClear(false)}>Cancel</button>
            </>
          ) : (
            <button className="button secondary" style={{fontSize:10}} onClick={()=>setSampleConfirmClear(true)}>
              Clear all data
            </button>
          )}
        </div>
      )}

      {view === 'dashboard' && <DashboardView cycles={cycles} tasks={tasks}/>}
      {view === 'cycles'    && <CyclesView    cycles={cycles} setCycles={setCycles} tasks={tasks} setTasks={setTasks}/>}
      {view === 'tasks'     && <TasksView     tasks={tasks} setTasks={setTasks} cycles={cycles}/>}
      {view === 'calendar'  && <CalendarView  tasks={tasks}/>}
      {view === 'harvest'   && <HarvestView   cycles={cycles} setCycles={setCycles}/>}
    </div>
  )
}
