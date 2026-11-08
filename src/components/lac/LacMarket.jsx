import { useLanguage } from '../../context/LanguageContext'
/**
 * LacMarket — Lac cultivation profitability calculator.
 * Uses AGMARKNET prices where available via existing market API.
 * Published lac price data from ICAR-IINRG Statistics bulletins.
 * All calculations clearly labelled as estimates.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, IndianRupee, TrendingUp, TrendingDown } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { Card, Notice } from '../../components'

const money = v => `₹${Number(v||0).toLocaleString('en-IN')}`

// Published lac price data (ICAR-IINRG Statistics 2018, SFPEPC Kolkata)
// Sticklac mandi prices ₹/kg — approximate historical range
const PUBLISHED_PRICES = {
  sticklac:  { min: 120, modal: 165, max: 220, unit:'₹/kg', year:'2017-18', source:'ICAR-IINRG Statistics 2018' },
  seedlac:   { min: 280, modal: 340, max: 420, unit:'₹/kg', year:'2017-18', source:'ICAR-IINRG Statistics 2018' },
  shellac:   { min: 380, modal: 450, max: 560, unit:'₹/kg', year:'2017-18', source:'ICAR-IINRG Statistics 2018' },
}

// Reference cultivation costs (ICAR-IINRG / KVK guidance, per acre)
const REF_COSTS = {
  'Broodlac (inoculation material)': 4200,
  'Labour (inoculation + harvest)':  6500,
  'Host-tree maintenance':           2000,
  'Transport to market':             1500,
  'Processing / cleaning':           1200,
  'Miscellaneous':                   800,
}
const REF_COST_TOTAL = Object.values(REF_COSTS).reduce((s,v)=>s+v, 0)

export default function LacMarket({ sampleSeed }) {
  const { t } = useLanguage()
  const [area,       setArea]       = useState(1)
  const [priceType,  setPriceType]  = useState('sticklac')
  const [priceScen,  setPriceScen]  = useState('modal')  // min | modal | max
  const [yield_kgA,  setYield_kgA]  = useState(400)      // kg/acre
  const [lossRate,   setLossRate]   = useState(10)        // % monsoon losses
  const [customCost, setCustomCost] = useState('')

  useEffect(() => {
    if (sampleSeed) {
      setArea(2)
      setPriceType('sticklac')
      setPriceScen('modal')
      setYield_kgA(450)
      setLossRate(8)
      setCustomCost('26000')
    }
  }, [sampleSeed])

  const priceData    = PUBLISHED_PRICES[priceType]
  const pricePerKg   = priceData[priceScen]
  const yieldTotal   = Math.round(Number(area) * Number(yield_kgA) * (1 - Number(lossRate)/100))
  const grossRev     = Math.round(yieldTotal * pricePerKg)
  const refCostTotal = Math.round(REF_COST_TOTAL * Number(area))
  const totalCost    = customCost ? parseFloat(customCost) : refCostTotal
  const netProfit    = grossRev - totalCost
  const margin       = grossRev > 0 ? (netProfit / grossRev * 100).toFixed(1) : 0
  const breakeven    = yieldTotal > 0 ? (totalCost / yieldTotal).toFixed(0) : 0

  // Scenario comparison chart
  const scenarios = ['min','modal','max'].map(s => ({
    label: s === 'min' ? 'Pessimistic' : s === 'modal' ? 'Expected' : 'Optimistic',
    price: priceData[s],
    revenue: Math.round(yieldTotal * priceData[s]),
    profit: Math.round(yieldTotal * priceData[s]) - totalCost,
  }))

  return (
    <div className="page">
      <Notice>
        Lac prices from ICAR-IINRG Statistics 2017-18. Actual mandi prices vary by grade, season,
        quality, and buyer. Cultivation costs are reference estimates — enter your own for accuracy.
        All results are estimates. Verify locally before financial decisions.
      </Notice>

      <div className="engine-two">
        {/* Inputs */}
        <Card title={t("Farm and crop details", "Farm and crop details")}>
          <div className="input-grid columns-2">
            <label className="field">
              <span>AREA UNDER LAC (acres)</span>
              <input type="number" min="0.1" step="0.1" value={area} onChange={e=>setArea(e.target.value)}/>
            </label>
            <label className="field">
              <span>EXPECTED YIELD (kg/acre)</span>
              <input type="number" min="10" value={yield_kgA} onChange={e=>setYield_kgA(e.target.value)}/>
            </label>
            <label className="field">
              <span>PRODUCT TYPE</span>
              <select value={priceType} onChange={e=>setPriceType(e.target.value)}>
                <option value="sticklac">Sticklac (raw)</option>
                <option value="seedlac">Seedlac (processed)</option>
                <option value="shellac">Shellac (refined)</option>
              </select>
            </label>
            <label className="field">
              <span>PRICE SCENARIO</span>
              <select value={priceScen} onChange={e=>setPriceScen(e.target.value)}>
                <option value="min">Pessimistic (min price)</option>
                <option value="modal">Expected (modal price)</option>
                <option value="max">Optimistic (max price)</option>
              </select>
            </label>
            <label className="field">
              <span>MONSOON LOSS ESTIMATE (%)</span>
              <input type="number" min="0" max="60" value={lossRate} onChange={e=>setLossRate(e.target.value)}/>
            </label>
            <label className="field">
              <span>TOTAL CULTIVATION COST (₹) — optional</span>
              <input type="number" min="0" value={customCost}
                onChange={e=>setCustomCost(e.target.value)}
                placeholder={`Reference: ${money(refCostTotal)}`}/>
            </label>
          </div>
        </Card>

        {/* Results */}
        <Card title={t("Profitability estimate", "Profitability estimate")} subtitle={t("Based on entered inputs and reference prices", "Based on entered inputs and reference prices")}>
          <div className="lac-profit-grid">
            <div className="lac-profit-row">
              <span>Saleable production</span>
              <b>{yieldTotal.toLocaleString('en-IN')} kg</b>
            </div>
            <div className="lac-profit-row">
              <span>Price used ({priceScen})</span>
              <b>₹{pricePerKg}/kg · {priceData.year}</b>
            </div>
            <div className="lac-profit-row lac-profit-rev">
              <span>Gross revenue</span>
              <b>{money(grossRev)}</b>
            </div>
            <div className="lac-profit-row">
              <span>Total cost</span>
              <b>{money(totalCost)}</b>
            </div>
            <div className={`lac-profit-row lac-profit-net ${netProfit>=0?'positive':'negative'}`}>
              <span>Net profit</span>
              <b style={{color:netProfit>=0?'#3d8050':'#c0392b'}}>{money(netProfit)}</b>
            </div>
            <div className="lac-profit-row">
              <span>Profit margin</span>
              <b style={{color:netProfit>=0?'#3d8050':'#c0392b'}}>{margin}%</b>
            </div>
            <div className="lac-profit-row">
              <span>Break-even price</span>
              <b>₹{breakeven}/kg</b>
            </div>
          </div>
          {netProfit < 0 && (
            <div className="inline-feedback" style={{marginTop:10, background:'#fff0eb', borderColor:'#f5c6a0'}}>
              <AlertTriangle size={14}/>
              <span>At the {priceScen} price, expenses exceed revenue. Consider processing to seedlac or shellac for higher realisation.</span>
            </div>
          )}
        </Card>
      </div>

      {/* Scenario chart */}
      <Card title={t("Price scenario comparison", "Price scenario comparison")} subtitle={t("How min / modal / max price affects profitability", "How min / modal / max price affects profitability")}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={scenarios} margin={{top:10,right:12,left:0,bottom:0}}>
            <CartesianGrid stroke="#edf1ed" vertical={false}/>
            <XAxis dataKey="label" tick={{fontSize:11,fill:'#738176'}} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fontSize:10,fill:'#738176'}} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v,n)=>[money(v), n]} contentStyle={{border:'1px solid #e0e8e0',borderRadius:8,fontSize:12}}/>
            <Bar dataKey="revenue" name="Gross revenue" radius={[4,4,0,0]}>
              {scenarios.map((_,i) => <Cell key={i} fill="#74c69d"/>)}
            </Bar>
            <Bar dataKey="profit" name="Net profit" radius={[4,4,0,0]}>
              {scenarios.map((s,i) => <Cell key={i} fill={s.profit>=0?'#2d6a4f':'#c0392b'}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Cost breakdown */}
      <Card title={t("Reference cost breakdown", "Reference cost breakdown")} subtitle={`ICAR-IINRG / KVK estimate · per ${area} acres`}>
        {Object.entries(REF_COSTS).map(([k,v]) => (
          <div key={k} className="breakdown-row">
            <span>{k}</span>
            <b>{money(Math.round(v * Number(area)))}</b>
          </div>
        ))}
        <hr/>
        <div className="breakdown-row">
          <span><b>Total reference cost</b></span>
          <b>{money(refCostTotal)}</b>
        </div>
        <p style={{fontSize:10,color:'#8a968c',marginTop:8}}>
          Reference only — enter your actual cost above for accurate results.
          Source: ICAR-IINRG cultivation economics, KVK Jharkhand guidance.
        </p>
      </Card>

      {/* Published prices reference */}
      <Card title={t("Published lac prices reference", "Published lac prices reference")} subtitle="ICAR-IINRG Statistics 2017-18 · indicative only">
        <div className="lac-price-table">
          {Object.entries(PUBLISHED_PRICES).map(([product, p]) => (
            <div key={product} className="lac-price-row">
              <b>{product.charAt(0).toUpperCase()+product.slice(1)}</b>
              <span>Min: ₹{p.min}</span>
              <span>Modal: ₹{p.modal}</span>
              <span>Max: ₹{p.max}</span>
              <small>{p.unit} · {p.year}</small>
            </div>
          ))}
        </div>
        <p style={{fontSize:10,color:'#8a968c',marginTop:8}}>
          Prices are from {PUBLISHED_PRICES.sticklac.source}. Current market prices may differ.
          Check SFPEPC Kolkata or local mandis for current rates.
        </p>
      </Card>
    </div>
  )
}
