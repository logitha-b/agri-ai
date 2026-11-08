import { useLanguage } from '../../context/LanguageContext'
/**
 * WhatIfSimulator — Compare base plan vs alternative scenario.
 * Scenarios are isolated from real transaction records.
 * All values are clearly labelled as user-defined assumptions.
 */
import { useMemo, useState } from 'react'
import {
  CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, Field, Notice } from '../../components'
import { buildForecast, computeSummary } from './storage'

const money = v => `₹${Number(v || 0).toLocaleString('en-IN')}`
const axis  = { fontSize: 11, fill: '#738176' }
const tt    = { border: '1px solid #e0e8e0', borderRadius: 8, fontSize: 12 }

const DEFAULT_SIM = {
  price_change_pct:    0,    // % change in crop selling price
  yield_change_pct:    0,    // % change in expected yield
  expense_change_pct:  0,    // % change in planned expenses
  harvest_delay_days:  0,    // days of harvest delay
  transport_extra:     0,    // extra transport cost ₹
  income_delay_days:   0,    // days extra delay for crop payment to arrive
}

function SimSlider({ label, min, max, step = 1, value, onChange, suffix = '', note }) {
  return (
    <div className="cf-sim-row">
      <div className="cf-sim-label">
        <span>{label}</span>
        <b style={{ color: value < 0 ? '#c0392b' : value > 0 ? '#3d8050' : '#68766c' }}>
          {value > 0 ? '+' : ''}{value}{suffix}
        </b>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} className="cf-range" />
      {note && <small className="cf-sim-note">{note}</small>}
    </div>
  )
}

export default function WhatIfSimulator({ transactions, loans, budgets, settings }) {
  const { t } = useLanguage()
  const [sim, setSim] = useState({ ...DEFAULT_SIM })

  const set = (k, v) => setSim(s => ({ ...s, [k]: v }))

  // Base forecast (no modifications)
  const baseForecast = useMemo(
    () => buildForecast(transactions, loans, budgets, settings),
    [transactions, loans, budgets, settings]
  )

  // Scenario forecast — modify budgets and planned transactions
  const scenarioForecast = useMemo(() => {
    // Build modified budgets
    const modBudgets = budgets.map(b => {
      const origYield = Number(b.expected_yield_t || 0)
      const origPrice = Number(b.expected_price_per_kg || 0)
      const newYield  = origYield * (1 + sim.yield_change_pct / 100)
      const newPrice  = origPrice * (1 + sim.price_change_pct / 100)

      // Delay harvest date
      let newHarvest = b.harvest_date
      if (b.harvest_date && sim.harvest_delay_days !== 0) {
        const d = new Date(b.harvest_date)
        d.setDate(d.getDate() + sim.harvest_delay_days)
        newHarvest = d.toISOString().slice(0, 10)
      }

      return {
        ...b,
        expected_yield_t:       newYield > 0 ? newYield : 0,
        expected_price_per_kg:  newPrice > 0 ? newPrice : 0,
        harvest_date:           newHarvest,
      }
    })

    // Build modified planned transactions (apply expense_change_pct to expense items)
    const modTx = transactions.map(t => {
      if (!t.planned) return t
      if (t.type === 'expense' && sim.expense_change_pct !== 0) {
        return { ...t, amount: Number(t.amount) * (1 + sim.expense_change_pct / 100) }
      }
      if ((t.type === 'income') && sim.income_delay_days !== 0 && t.date) {
        const d = new Date(t.date)
        d.setDate(d.getDate() + sim.income_delay_days)
        return { ...t, date: d.toISOString().slice(0, 10) }
      }
      return t
    })

    // Add extra transport cost as a planned expense to each harvest month
    const extraTx = [...modTx]
    if (sim.transport_extra > 0) {
      for (const b of modBudgets) {
        if (b.harvest_date) {
          extraTx.push({
            id: `sim_transport_${b.id}`,
            type: 'expense', planned: true,
            date: b.harvest_date,
            amount: sim.transport_extra,
            category: 'Transport', finance_type: 'farm',
            description: '[Scenario] Extra transport cost',
          })
        }
      }
    }

    return buildForecast(extraTx, loans, modBudgets, settings)
  }, [transactions, loans, budgets, settings, sim])

  // Merge for chart
  const chartData = baseForecast.map((base, i) => {
    const scen = scenarioForecast[i]
    return {
      label:    base.label,
      base:     base.balance,
      scenario: scen ? scen.balance : null,
    }
  })

  const baseEnd   = baseForecast.at(-1)?.balance  ?? 0
  const scenEnd   = scenarioForecast.at(-1)?.balance ?? 0
  const diff      = scenEnd - baseEnd
  const hasChange = Object.values(sim).some(v => v !== 0)

  return (
    <div className="page">
      <Notice>
        What-if scenarios are completely separate from your real records. Changing sliders
        does not modify any actual transaction, budget, or loan entry.
      </Notice>

      <div className="engine-two">
        {/* Controls */}
        <Card title="Scenario Assumptions" subtitle="Adjust sliders to model different outcomes">
          <div className="cf-sim-controls">
            <SimSlider label="Crop selling price"  min={-50} max={50}  value={sim.price_change_pct}   onChange={v => set('price_change_pct', v)}   suffix="%" note="Effect on expected gross revenue" />
            <SimSlider label="Expected yield"       min={-60} max={20}  value={sim.yield_change_pct}   onChange={v => set('yield_change_pct', v)}   suffix="%" note="Applied to all season budgets" />
            <SimSlider label="Planned expenses"     min={-20} max={50}  value={sim.expense_change_pct} onChange={v => set('expense_change_pct', v)} suffix="%" note="Applied to all planned expense transactions" />
            <SimSlider label="Harvest delay"        min={0}   max={60}  value={sim.harvest_delay_days} onChange={v => set('harvest_delay_days', v)} suffix=" days" note="Delays harvest-date income" />
            <SimSlider label="Extra transport cost" min={0}   max={20000} step={500} value={sim.transport_extra} onChange={v => set('transport_extra', v)} suffix="₹" note="Added as a planned expense at harvest" />
            <SimSlider label="Income arrival delay" min={0}   max={60}  value={sim.income_delay_days} onChange={v => set('income_delay_days', v)} suffix=" days" note="Delays all planned income transactions" />
          </div>
          <button className="button secondary" style={{ marginTop: 14 }} onClick={() => setSim({ ...DEFAULT_SIM })}>
            <RefreshCw size={13}/> Reset to base plan
          </button>
        </Card>

        {/* Impact summary */}
        <Card title="Scenario Impact" subtitle="6-month projected balance comparison">
          <div className="cf-sim-impact">
            <div className="cf-sim-impact-row">
              <span>Base plan closing balance</span>
              <b>{money(baseEnd)}</b>
            </div>
            <div className="cf-sim-impact-row">
              <span>Scenario closing balance</span>
              <b style={{ color: scenEnd < baseEnd ? '#c0392b' : '#3d8050' }}>{money(scenEnd)}</b>
            </div>
            <div className={`cf-sim-impact-row cf-sim-diff ${diff < 0 ? 'negative' : 'positive'}`}>
              <span>Difference</span>
              <b>{diff >= 0 ? '+' : ''}{money(diff)}</b>
            </div>
          </div>

          {/* Shortfall check */}
          {scenarioForecast.some(m => m.balance < 0) && (
            <div className="inline-feedback" style={{ marginTop: 12 }}>
              <AlertTriangle size={14}/>
              <span>
                Under this scenario, projected balance goes negative in{' '}
                {scenarioForecast.filter(m => m.balance < 0).map(m => m.label).join(', ')}.
                You may need additional working capital for that period.
              </span>
            </div>
          )}

          {!hasChange && (
            <p className="cf-empty-note" style={{ marginTop: 12 }}>
              Adjust the sliders to see how changes affect your projected cash flow.
            </p>
          )}
        </Card>
      </div>

      {/* Comparison chart */}
      <Card title="Base Plan vs Scenario — Projected Balance" subtitle="Both lines are estimates based on user-defined assumptions">
        {chartData.length === 0 ? (
          <div className="cf-empty"><p>Add season budgets and planned transactions to see a comparison.</p></div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#edf1ed" vertical={false}/>
                <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v => `₹${Math.round(v/1000)}k`} tick={axis} axisLine={false} tickLine={false}/>
                <Tooltip formatter={v => money(v)} contentStyle={tt}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
                <Line type="monotone" dataKey="base"     name="Base plan"  stroke="#438b62" strokeWidth={2} dot={{ r: 3 }}/>
                <Line type="monotone" dataKey="scenario" name="Scenario"   stroke="#d6600a" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 4"/>
              </LineChart>
            </ResponsiveContainer>
            <p className="cf-chart-note">Green = base plan · Orange dashed = scenario · Both are estimates</p>
          </>
        )}
      </Card>
    </div>
  )
}
