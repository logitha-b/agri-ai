import { useLanguage } from '../../context/LanguageContext'
/**
 * AgroPlanner — Lac-based agroforestry scenario planner.
 * Scenarios from ICAR-IINRG published research on agroforestry systems.
 * All income/cost figures are reference estimates — local validation required.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, Leaf, TreeDeciduous } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, Notice } from '../../components'

const money = v => `₹${Number(v||0).toLocaleString('en-IN')}`

// ICAR-IINRG agroforestry systems (published research)
const SYSTEMS = {
  'Lac + Kusum agroforestry': {
    hosts: ['Kusum (Schleichera oleosa)'],
    seasons: ['Kusmi Aghani (Oct–Dec)', 'Kusmi Jethwi (May–Jun)'],
    crops_per_year: 2,
    setup_years: 4,
    land_req: 'Minimum 0.5 acre',
    ref_yield_kg_per_acre: 500,
    lac_price_per_kg: 165,
    other_income: 'Timber and oil seeds from Kusum after 15+ years',
    setup_cost_per_acre: 18000,
    annual_cost_per_acre: 14000,
    note: 'Kusum requires 4–6 years to mature. Long-term investment — ideal for land-owning farmers.',
    suitability: ['Jharkhand','Chhattisgarh','Madhya Pradesh','Odisha'],
    source: 'ICAR-IINRG Agroforestry Models — Jharkhand, 2023',
  },
  'Lac + Flemingia intercrop': {
    hosts: ['Flemingia semialata'],
    seasons: ['Rangeeni Baisakhi (Apr–May)', 'Rangeeni Katki (Oct–Nov)'],
    crops_per_year: 2,
    setup_years: 2,
    land_req: 'Any size — even 0.1 acre',
    ref_yield_kg_per_acre: 350,
    lac_price_per_kg: 150,
    other_income: 'Green manure from Flemingia prunings (nitrogen fixation)',
    setup_cost_per_acre: 9000,
    annual_cost_per_acre: 11000,
    note: 'Best option for small and marginal farmers. Flemingia establishes quickly and can be grown on bunds and wastelands.',
    suitability: ['Jharkhand','Chhattisgarh','West Bengal','Maharashtra','Odisha'],
    source: 'ICAR-IINRG Small Farmer Lac Models',
  },
  'Lac + Ber + horticulture': {
    hosts: ['Ber (Ziziphus mauritiana)'],
    seasons: ['Rangeeni Baisakhi (Apr–May)', 'Rangeeni Katki (Oct–Nov)'],
    crops_per_year: 2,
    setup_years: 3,
    land_req: '0.5–2 acres recommended',
    ref_yield_kg_per_acre: 400,
    lac_price_per_kg: 155,
    other_income: 'Ber fruit income (₹8,000–20,000/acre after 3 years)',
    setup_cost_per_acre: 14000,
    annual_cost_per_acre: 12500,
    note: 'Dual income from lac and Ber fruit. Ber is drought-tolerant — good for rain-fed areas in Maharashtra and MP.',
    suitability: ['Maharashtra','Madhya Pradesh','Gujarat','Andhra Pradesh'],
    source: 'ICAR-IINRG Multi-commodity Agroforestry',
  },
  'Lac + Timber (Teak/Gamhar)': {
    hosts: ['Flemingia semialata','Ber (temporary)'],
    seasons: ['Rangeeni Baisakhi (Apr–May)'],
    crops_per_year: 1,
    setup_years: 2,
    land_req: '1+ acres',
    ref_yield_kg_per_acre: 280,
    lac_price_per_kg: 150,
    other_income: 'Timber income from Teak/Gamhar after 10–15 years (significant)',
    setup_cost_per_acre: 22000,
    annual_cost_per_acre: 10000,
    note: 'Lac provides annual income while timber matures. Long-term wealth creation. Suitable for social forestry programmes.',
    suitability: ['Jharkhand','Odisha','West Bengal','Chhattisgarh'],
    source: 'ICAR-IINRG Social Agroforestry Models',
  },
}

export default function AgroPlanner({ derivedState, sampleSeed }) {
  const { t } = useLanguage()
  const [selected, setSelected]  = useState(Object.keys(SYSTEMS)[0])
  const [area,     setArea]      = useState(1)
  const [years,    setYears]     = useState(5)

  useEffect(() => {
    if (sampleSeed) {
      setSelected('Lac + Kusum agroforestry')
      setArea(2)
      setYears(7)
    }
  }, [sampleSeed])

  const sys = SYSTEMS[selected]
  const yieldKg   = Math.round(sys.ref_yield_kg_per_acre * area * sys.crops_per_year)
  const annualRev = Math.round(yieldKg * sys.lac_price_per_kg)
  const annualCost= Math.round(sys.annual_cost_per_acre * area)
  const setupCost = Math.round(sys.setup_cost_per_acre * area)
  const annualNet = annualRev - annualCost
  const isInZone  = derivedState && sys.suitability.some(s => s.toLowerCase() === derivedState.toLowerCase())

  // Year-by-year cumulative chart
  const chartData = Array.from({length:years}, (_,i) => {
    const yr    = i + 1
    const isSetup = yr <= sys.setup_years
    const revYr   = isSetup ? 0 : annualRev
    const costYr  = isSetup ? setupCost / sys.setup_years : annualCost
    const cumRev  = Array.from({length:yr}).reduce((sum, _, j) => {
      return sum + (j < sys.setup_years ? 0 : annualRev)
    }, 0)
    const cumCost = setupCost + annualCost * Math.max(0, yr - sys.setup_years)
    return {
      year: `Y${yr}`,
      'Annual revenue': Math.round(revYr),
      'Annual cost':    Math.round(costYr),
      'Cumulative profit': Math.round(cumRev - cumCost),
    }
  })

  return (
    <div className="page">
      <Notice>
        Agroforestry scenarios are from ICAR-IINRG published research. All income and cost figures
        are reference estimates only — actual results depend on local conditions, tree age, market
        access, and management practices. Consult your KVK or ICAR-NISA before investing.
      </Notice>

      {/* System selector */}
      <div className="lac-agro-grid">
        {Object.entries(SYSTEMS).map(([name, s]) => {
          const inZone = derivedState && s.suitability.some(st => st.toLowerCase() === derivedState.toLowerCase())
          return (
            <button key={name}
              className={`lac-agro-card ${selected===name?'selected':''}`}
              onClick={()=>setSelected(name)}>
              <Leaf size={16}/>
              <b>{name}</b>
              <small>{s.hosts.join(' · ')}</small>
              {inZone && <span className="lac-agro-zone">Suitable for {derivedState}</span>}
            </button>
          )
        })}
      </div>

      {/* System detail */}
      <Card
        title={selected}
        subtitle={`Source: ${sys.source}`}
      >
        <div className="lac-agro-details">
          <div><small>HOST PLANTS</small><b>{sys.hosts.join(', ')}</b></div>
          <div><small>SEASONS</small><b>{sys.seasons.join(' · ')}</b></div>
          <div><small>CROPS/YEAR</small><b>{sys.crops_per_year}</b></div>
          <div><small>SETUP PERIOD</small><b>{sys.setup_years} years to first full harvest</b></div>
          <div><small>LAND REQUIRED</small><b>{sys.land_req}</b></div>
          <div><small>OTHER INCOME</small><b>{sys.other_income}</b></div>
        </div>
        <p className="lac-agro-note">{sys.note}</p>
        {isInZone && (
          <div className="inline-feedback" style={{marginTop:8,background:'#edf5ee',borderColor:'#d4e8d4'}}>
            <CheckCircle2 size={14} style={{color:'#3d8050'}}/>
            <span>{derivedState} is listed as a suitable state for this system.</span>
          </div>
        )}
        {derivedState && !isInZone && (
          <div className="inline-feedback" style={{marginTop:8,background:'#fff8f0',borderColor:'#f5d6b0'}}>
            <AlertTriangle size={14}/>
            <span>{derivedState} is not in the primary suitability zone for this system. Local validation required.</span>
          </div>
        )}
      </Card>

      {/* Calculator */}
      <div className="engine-two">
        <Card title="Scenario calculator">
          <div className="input-grid columns-2">
            <label className="field">
              <span>AREA (acres)</span>
              <input type="number" min="0.1" step="0.1" value={area} onChange={e=>setArea(e.target.value)}/>
            </label>
            <label className="field">
              <span>PLANNING HORIZON (years)</span>
              <input type="number" min="1" max="15" value={years} onChange={e=>setYears(Math.min(15,Math.max(1,+e.target.value)))}/>
            </label>
          </div>
          <div className="lac-profit-grid" style={{marginTop:12}}>
            <div className="lac-profit-row"><span>Annual lac production</span><b>{yieldKg.toLocaleString('en-IN')} kg</b></div>
            <div className="lac-profit-row lac-profit-rev"><span>Annual gross revenue</span><b>{money(annualRev)}</b></div>
            <div className="lac-profit-row"><span>Annual cost</span><b>{money(annualCost)}</b></div>
            <div className="lac-profit-row"><span>Setup cost (one-time)</span><b>{money(setupCost)}</b></div>
            <div className={`lac-profit-row lac-profit-net ${annualNet>=0?'positive':'negative'}`}>
              <span>Annual net (post-setup)</span>
              <b style={{color:annualNet>=0?'#3d8050':'#c0392b'}}>{money(annualNet)}</b>
            </div>
          </div>
        </Card>

        <Card title="Suitability zones" subtitle="Primary producing states for this system">
          <div className="lac-zone-list">
            {sys.suitability.map(s => (
              <div key={s} className={`lac-zone-item ${derivedState?.toLowerCase()===s.toLowerCase()?'current':''}`}>
                <TreeDeciduous size={13}/>
                <span>{s}</span>
                {derivedState?.toLowerCase()===s.toLowerCase() && <b>← Your location</b>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Year-by-year chart */}
      <Card title={`${years}-year cashflow projection`} subtitle="Setup period shown separately · Reference estimates only">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{top:10,right:12,left:0,bottom:0}}>
            <CartesianGrid stroke="#edf1ed" vertical={false}/>
            <XAxis dataKey="year" tick={{fontSize:10,fill:'#738176'}} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fontSize:10,fill:'#738176'}} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v,n)=>[money(v),n]} contentStyle={{border:'1px solid #e0e8e0',borderRadius:8,fontSize:12}}/>
            <Legend wrapperStyle={{fontSize:10}}/>
            <Bar dataKey="Annual revenue" fill="#74c69d" maxBarSize={28} radius={[3,3,0,0]}/>
            <Bar dataKey="Annual cost"    fill="#d6a05d" maxBarSize={28} radius={[3,3,0,0]}/>
            <Bar dataKey="Cumulative profit">
              {chartData.map((d,i)=><Cell key={i} fill={d['Cumulative profit']>=0?'#2d6a4f':'#c0392b'} radius={[3,3,0,0]}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="lac-chart-note">
          Green bars = revenue · Orange = costs · Dark/red = cumulative profit (negative during setup)
        </p>
        <div className="inline-feedback" style={{marginTop:8}}>
          <AlertTriangle size={14}/>
          <span>Projections exclude timber/fruit income shown separately. Actual results depend on tree survival, market access, and management quality.</span>
        </div>
      </Card>
    </div>
  )
}
