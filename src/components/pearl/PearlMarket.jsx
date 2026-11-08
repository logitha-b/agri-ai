import { useLanguage } from '../../context/LanguageContext'
/**
 * PearlMarket — Pearl culture profitability calculator and market analysis.
 * Price reference from MPEDA / CIFE published data and fisheries department reports.
 * All values are estimates — user enters actual farm data.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, Notice } from '../../components'

const money = v => `₹${Number(v||0).toLocaleString('en-IN')}`
const axis  = { fontSize:11, fill:'#738176' }
const tt    = { border:'1px solid #e0e8e0', borderRadius:8, fontSize:12 }

// Published price ranges (MPEDA / CIFE / State Fisheries Dept, 2022-24)
// Freshwater: Lamellidens spp. nucleated pearls — Indian mandi and export price
// Marine: Pinctada fucata — Akoya type, Indian market
const PRICE_REFS = {
  freshwater: {
    'Grade A (round, lustrous)':         { min: 80,  modal: 150,  max: 300,  unit:'₹/pearl' },
    'Grade B (near-round)':              { min: 40,  modal: 80,   max: 150,  unit:'₹/pearl' },
    'Grade C (baroque, off-shape)':      { min: 10,  modal: 25,   max: 60,   unit:'₹/pearl' },
    'Reject / unsaleable':               { min: 0,   modal: 0,    max: 5,    unit:'₹/pearl' },
  },
  marine: {
    'AAA (high luster, round, >7mm)':   { min:1500, modal:3000, max:8000, unit:'₹/pearl' },
    'AA (good luster, near-round)':     { min: 700, modal:1500, max:3000, unit:'₹/pearl' },
    'A (moderate luster)':              { min: 200, modal: 600, max:1200, unit:'₹/pearl' },
    'B/C (commercial grade)':           { min:  50, modal: 150, max: 400, unit:'₹/pearl' },
  },
}

// Reference cultivation costs (ICAR-CIFE / CMFRI / State KVK, per cycle per pond unit)
const REF_COSTS = {
  freshwater: {
    'Mussel procurement': 5000, 'Nucleus & implantation (per 1000 mussels)': 8000,
    'Net / cage equipment': 12000, 'Feed supplements': 4000,
    'Labour (stocking, monitoring, harvest)': 15000, 'Water management': 3000,
    'Harvesting & processing': 5000, 'Transport & marketing': 3000,
  },
  marine: {
    'Spat/seed procurement': 15000, 'Nucleus & skilled labour': 25000,
    'Long-line & cage equipment': 45000, 'Boat & diving equipment': 20000,
    'Labour (monitoring, maintenance)': 30000, 'Harvesting & grading': 10000,
    'Transport & marketing': 8000,
  },
}

export default function PearlMarket({ cultureType = 'freshwater', sampleSeed }) {
  const { t } = useLanguage()
  const [cType,       setCType]      = useState('freshwater')
  const [harvested,   setHarvested]  = useState('')
  const [saleable,    setSaleable]   = useState('')
  const [gradeA_pct,  setGradeA_pct] = useState(20)
  const [gradeB_pct,  setGradeB_pct] = useState(35)
  const [gradeC_pct,  setGradeC_pct] = useState(30)
  const [priceA,      setPriceA]     = useState('')
  const [priceB,      setPriceB]     = useState('')
  const [priceC,      setPriceC]     = useState('')
  const [customCost,  setCustomCost] = useState('')

  useEffect(() => {
    if (sampleSeed) {
      const type = cultureType || 'freshwater'
      setCType(type)
      if (type === 'marine') {
        setHarvested(1200)
        setSaleable(980)
        setGradeA_pct(30)
        setGradeB_pct(40)
        setGradeC_pct(30)
        setPriceA(3000)
        setPriceB(1500)
        setPriceC(600)
        setCustomCost(153000)
      } else {
        setHarvested(2000)
        setSaleable(1650)
        setGradeA_pct(25)
        setGradeB_pct(45)
        setGradeC_pct(30)
        setPriceA(150)
        setPriceB(80)
        setPriceC(25)
        setCustomCost(55000)
      }
    }
  }, [sampleSeed, cultureType])

  useEffect(() => {
    if (sampleSeed) {
      const type = cultureType || 'freshwater'
      setCType(type)
      if (type === 'marine') {
        setHarvested(1200)
        setSaleable(980)
        setGradeA_pct(30)
        setGradeB_pct(40)
        setGradeC_pct(30)
        setPriceA(3000)
        setPriceB(1500)
        setPriceC(600)
        setCustomCost(153000)
      } else {
        setHarvested(2000)
        setSaleable(1650)
        setGradeA_pct(25)
        setGradeB_pct(45)
        setGradeC_pct(30)
        setPriceA(150)
        setPriceB(80)
        setPriceC(25)
        setCustomCost(55000)
      }
    }
  }, [sampleSeed, cultureType])

  const prices    = PRICE_REFS[cType]
  const costs_ref = REF_COSTS[cType]

  // Grade-wise revenue
  const sal    = Number(saleable || harvested || 0)
  const pA_pct = Number(gradeA_pct) / 100
  const pB_pct = Number(gradeB_pct) / 100
  const pC_pct = Number(gradeC_pct) / 100
  const countA = Math.round(sal * pA_pct)
  const countB = Math.round(sal * pB_pct)
  const countC = Math.round(sal * pC_pct)

  const priceKeys  = Object.keys(prices)
  const pA_modal   = Number(priceA) || prices[priceKeys[0]]?.modal || 0
  const pB_modal   = Number(priceB) || prices[priceKeys[1]]?.modal || 0
  const pC_modal   = Number(priceC) || prices[priceKeys[2]]?.modal || 0

  const grossRev   = Math.round(countA * pA_modal + countB * pB_modal + countC * pC_modal)
  const refCost    = Object.values(costs_ref).reduce((s, v) => s + v, 0)
  const totalCost  = customCost ? Number(customCost) : refCost
  const netProfit  = grossRev - totalCost
  const margin     = grossRev > 0 ? (netProfit / grossRev * 100).toFixed(1) : 0
  const breakeven  = sal > 0 ? (totalCost / sal).toFixed(0) : 0

  // Scenario chart
  const scenarios = ['min','modal','max'].map(s => {
    const rA = countA * (prices[priceKeys[0]]?.[s] || 0)
    const rB = countB * (prices[priceKeys[1]]?.[s] || 0)
    const rC = countC * (prices[priceKeys[2]]?.[s] || 0)
    const rev = Math.round(rA + rB + rC)
    return { label: s === 'min' ? 'Pessimistic' : s === 'modal' ? 'Expected' : 'Optimistic',
             revenue: rev, profit: rev - totalCost }
  })

  return (
    <div className="page">
      <Notice>
        Pearl prices are from MPEDA, ICAR-CIFE, and State Fisheries Department published data.
        Actual market prices vary by size, shape, luster, grade, buyer, and region.
        All calculations are reference estimates — verify with local buyers before investing.
      </Notice>

      <div className="engine-two">
        <Card title="Harvest and grade inputs">
          <div className="input-grid columns-2">
            <label className="field"><span>CULTURE TYPE</span>
              <select value={cType} onChange={e=>setCType(e.target.value)}>
                <option value="freshwater">Freshwater</option>
                <option value="marine">Marine</option>
              </select>
            </label>
            <label className="field"><span>TOTAL HARVESTED</span>
              <input type="number" min="0" value={harvested} onChange={e=>setHarvested(e.target.value)} placeholder="Total pearls harvested"/></label>
            <label className="field"><span>SALEABLE PEARLS</span>
              <input type="number" min="0" value={saleable} onChange={e=>setSaleable(e.target.value)} placeholder="After rejecting defective"/></label>
            <div/>
            <label className="field"><span>GRADE A % (top grade)</span>
              <input type="number" min="0" max="100" value={gradeA_pct} onChange={e=>setGradeA_pct(e.target.value)}/></label>
            <label className="field"><span>GRADE B %</span>
              <input type="number" min="0" max="100" value={gradeB_pct} onChange={e=>setGradeB_pct(e.target.value)}/></label>
            <label className="field"><span>GRADE C %</span>
              <input type="number" min="0" max="100" value={gradeC_pct} onChange={e=>setGradeC_pct(e.target.value)}/></label>
            <div/>
            <label className="field"><span>GRADE A PRICE (₹/pearl) — optional</span>
              <input type="number" min="0" value={priceA} onChange={e=>setPriceA(e.target.value)}
                placeholder={`Reference: ₹${prices[priceKeys[0]]?.modal}/pearl`}/></label>
            <label className="field"><span>GRADE B PRICE (₹/pearl)</span>
              <input type="number" min="0" value={priceB} onChange={e=>setPriceB(e.target.value)}
                placeholder={`Reference: ₹${prices[priceKeys[1]]?.modal}/pearl`}/></label>
            <label className="field"><span>TOTAL COST (₹) — leave blank for reference</span>
              <input type="number" min="0" value={customCost} onChange={e=>setCustomCost(e.target.value)}
                placeholder={`Reference: ₹${refCost.toLocaleString('en-IN')}`}/></label>
          </div>
        </Card>

        <Card title="Profitability summary" subtitle="Based on entered inputs and reference prices">
          <div className="lac-profit-grid">
            <div className="lac-profit-row lac-profit-rev"><span>Gross revenue</span><b>{money(grossRev)}</b></div>
            <div className="lac-profit-row"><span>Total cost</span><b>{money(totalCost)}</b></div>
            <div className={`lac-profit-row ${netProfit >= 0 ? 'lac-profit-net positive' : 'lac-profit-net negative'}`}>
              <span>Net profit</span><b style={{color:netProfit>=0?'#3d8050':'#c0392b'}}>{money(netProfit)}</b>
            </div>
            <div className="lac-profit-row"><span>Profit margin</span><b>{margin}%</b></div>
            <div className="lac-profit-row"><span>Break-even price/pearl</span><b>₹{breakeven}</b></div>
          </div>
          <div style={{marginTop:10,fontSize:11,color:'#3d5c44',background:'#f0f8f0',padding:'8px 10px',borderRadius:7}}>
            {countA > 0 && <div>Grade A: {countA.toLocaleString()} pearls × ₹{pA_modal} = {money(countA*pA_modal)}</div>}
            {countB > 0 && <div>Grade B: {countB.toLocaleString()} pearls × ₹{pB_modal} = {money(countB*pB_modal)}</div>}
            {countC > 0 && <div>Grade C: {countC.toLocaleString()} pearls × ₹{pC_modal} = {money(countC*pC_modal)}</div>}
          </div>
        </Card>
      </div>

      <Card title="Price scenario comparison" subtitle="Min / modal / max published reference prices">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={scenarios} margin={{top:8,right:10,left:0,bottom:0}}>
            <CartesianGrid stroke="#edf1ed" vertical={false}/>
            <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={axis} axisLine={false} tickLine={false}/>
            <Tooltip formatter={v=>money(v)} contentStyle={tt}/>
            <Bar dataKey="revenue" name="Gross revenue" fill="#74c69d" maxBarSize={36} radius={[4,4,0,0]}/>
            <Bar dataKey="profit"  name="Net profit"    maxBarSize={36} radius={[4,4,0,0]}>
              {scenarios.map((s,i) => <Cell key={i} fill={s.profit>=0?'#2d6a4f':'#c0392b'}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="engine-two">
        <Card title="Reference prices" subtitle="Published MPEDA / CIFE / Fisheries Dept data">
          {Object.entries(prices).map(([g, p]) => (
            <div key={g} className="lac-profit-row">
              <span style={{fontSize:11}}>{g}</span>
              <b>₹{p.min}–{p.max} <small style={{fontWeight:400}}>modal ₹{p.modal}</small></b>
            </div>
          ))}
          <p style={{fontSize:10,color:'#8a968c',marginTop:8}}>
            Source: MPEDA / ICAR-CIFE / State Fisheries Dept. Prices vary significantly by quality and market.
          </p>
        </Card>

        <Card title="Reference cost breakdown" subtitle="Per cultivation cycle (ICAR-CIFE / CMFRI)">
          {Object.entries(costs_ref).map(([k, v]) => (
            <div key={k} className="breakdown-row"><span>{k}</span><b>{money(v)}</b></div>
          ))}
          <hr/>
          <div className="breakdown-row"><span><b>Total reference cost</b></span><b>{money(refCost)}</b></div>
          <p style={{fontSize:10,color:'#8a968c',marginTop:6}}>Enter your actual cost above for accurate results.</p>
        </Card>
      </div>
    </div>
  )
}
