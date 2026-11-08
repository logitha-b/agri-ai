import { useLanguage } from '../../context/LanguageContext'
/**
 * SeasonBudget — Month-by-month seasonal farming budget.
 * Fetches reference costs from /api/cashflow/crop-budget.
 * Displays planned vs actual expenses, expected income, and cash gap warnings.
 */
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, Loader, Plus, Trash2, X } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Button, Card, Field, Notice, Progress } from '../../components'

const API   = (import.meta.env.VITE_CROP_HEALTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8003' : '')).replace(/\/$/, '')
const money = v => `₹${Number(v || 0).toLocaleString('en-IN')}`
const axis  = { fontSize: 11, fill: '#738176' }
const tt    = { border: '1px solid #e0e8e0', borderRadius: 8, fontSize: 12 }

const CROPS   = ['Paddy', 'Groundnut', 'Maize', 'Tomato', 'Millet', 'Wheat', 'Cotton', 'Other']
const SEASONS = ['Kharif', 'Rabi', 'Summer']

const DEFAULT_ITEMS = [
  { category: 'Land preparation',     amount: '' },
  { category: 'Seeds / nursery',       amount: '' },
  { category: 'Fertilizer & manure',  amount: '' },
  { category: 'Irrigation',            amount: '' },
  { category: 'Labour',               amount: '' },
  { category: 'Plant protection',     amount: '' },
  { category: 'Harvesting',           amount: '' },
  { category: 'Transport & misc',     amount: '' },
]

function BudgetForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    crop: 'Paddy', variety: '', area_acres: '', season: 'Kharif',
    sowing_date: '', harvest_date: '', budget_total: '',
    planned_items: DEFAULT_ITEMS.map(i => ({ ...i })),
    expected_yield_t: '', expected_price_per_kg: '',
  })
  const [refLoading, setRefLoading] = useState(false)
  const [refData,    setRefData]    = useState(null)
  const [refError,   setRefError]   = useState('')
  const [err, setErr] = useState('')

  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setItem = (i, v) => setForm(f => ({
    ...f,
    planned_items: f.planned_items.map((item, idx) => idx === i ? { ...item, amount: v } : item),
  }))

  const loadRef = async () => {
    if (!form.crop || !form.area_acres) { setRefError('Enter crop and area first.'); return }
    setRefLoading(true); setRefError('')
    try {
      const res  = await fetch(`${API}/api/cashflow/crop-budget`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ crop: form.crop, area_acres: parseFloat(form.area_acres), season: form.season }),
      })
      const data = await res.json()
      setRefData(data)
      // Pre-fill items from phase breakdown
      if (data.cost?.phase_breakdown) {
        const newItems = form.planned_items.map(item => {
          const match = Object.entries(data.cost.phase_breakdown).find(([k]) =>
            k.toLowerCase().includes(item.category.toLowerCase().split(' ')[0])
          )
          return match ? { ...item, amount: String(match[1].amount_rs) } : item
        })
        setForm(f => ({ ...f, planned_items: newItems,
          budget_total: String(data.cost.total_rs || ''),
          expected_yield_t: String(data.yield.expected_yield_t || ''),
          expected_price_per_kg: String(data.market_price?.price_rs_per_kg || ''),
        }))
      }
    } catch { setRefError('Could not load reference data — enter values manually.') }
    finally { setRefLoading(false) }
  }

  const submit = (e) => {
    e.preventDefault(); setErr('')
    if (!form.area_acres || isNaN(form.area_acres) || +form.area_acres <= 0) { setErr('Cultivated area is required.'); return }
    onSave({ ...form, area_acres: parseFloat(form.area_acres) })
  }

  const totalPlanned = form.planned_items.reduce((s, i) => s + Number(i.amount || 0), 0)

  return (
    <form onSubmit={submit} className="cf-budget-form" noValidate>
      <div className="input-grid columns-2">
        <Field label="CROP">
          <select value={form.crop} onChange={e => set('crop', e.target.value)}>
            {CROPS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="VARIETY (optional)">
          <input value={form.variety} onChange={e => set('variety', e.target.value)} placeholder="e.g. ADT 45" />
        </Field>
        <Field label="CULTIVATED AREA (acres) *">
          <input type="number" min="0.1" step="0.1" value={form.area_acres} onChange={e => set('area_acres', e.target.value)} placeholder="e.g. 2.5" />
        </Field>
        <Field label="SEASON">
          <select value={form.season} onChange={e => set('season', e.target.value)}>
            {SEASONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="SOWING DATE">
          <input type="date" value={form.sowing_date} onChange={e => set('sowing_date', e.target.value)} />
        </Field>
        <Field label="EXPECTED HARVEST DATE">
          <input type="date" value={form.harvest_date} onChange={e => set('harvest_date', e.target.value)} />
        </Field>
      </div>

      <div style={{ margin: '10px 0' }}>
        <button type="button" className="button secondary" onClick={loadRef} disabled={refLoading}>
          {refLoading ? <Loader size={13} className="spin" /> : <ArrowRight size={13} />}
          {refLoading ? 'Loading reference…' : 'Load ICAR reference costs'}
        </button>
        {refError && <p className="cf-form-error" style={{ marginTop: 6 }}><AlertTriangle size={12} /> {refError}</p>}
        {refData?.cost?.available && (
          <div className="cf-ref-note">
            Reference: {money(refData.cost.total_rs)} for {form.area_acres} acres ({refData.cost.source}).
            Values pre-filled — adjust as needed.
          </div>
        )}
      </div>

      <div className="cf-planned-items">
        <div className="cf-items-header"><b>Planned Expense Breakdown</b><small>Total: {money(totalPlanned)}</small></div>
        {form.planned_items.map((item, i) => (
          <div key={i} className="cf-item-row">
            <span>{item.category}</span>
            <input type="number" min="0" step="1" value={item.amount}
              onChange={e => setItem(i, e.target.value)}
              placeholder="₹ amount" className="cf-item-input" />
          </div>
        ))}
      </div>

      <div className="input-grid columns-2" style={{ marginTop: 12 }}>
        <Field label="AVAILABLE BUDGET (₹)">
          <input type="number" value={form.budget_total} onChange={e => set('budget_total', e.target.value)} placeholder="Total available budget" />
        </Field>
        <div />
        <Field label="EXPECTED YIELD (tonnes)">
          <input type="number" step="0.01" value={form.expected_yield_t} onChange={e => set('expected_yield_t', e.target.value)} placeholder="e.g. 3.5" />
        </Field>
        <Field label="EXPECTED SELLING PRICE (₹/kg)">
          <input type="number" step="0.01" value={form.expected_price_per_kg} onChange={e => set('expected_price_per_kg', e.target.value)} placeholder="e.g. 12.5" />
        </Field>
      </div>

      {err && <div className="cf-form-error"><AlertTriangle size={13}/> {err}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button type="submit"><Check size={14} /> Save budget</Button>
        <Button type="button" kind="secondary" onClick={onCancel}><X size={14} /> Cancel</Button>
      </div>
    </form>
  )
}

function BudgetCard({ budget, transactions, onDelete }) {
  const actual = transactions.filter(t =>
    !t.planned && t.finance_type === 'farm' &&
    t.type === 'expense' && t.date >= (budget.sowing_date || '0000') &&
    t.date <= (budget.harvest_date || '9999')
  )
  const actualTotal   = actual.reduce((s, t) => s + Number(t.amount), 0)
  const plannedTotal  = budget.planned_items?.reduce((s, i) => s + Number(i.amount || 0), 0) || 0
  const budgetTotal   = Number(budget.budget_total || plannedTotal)
  const remaining     = budgetTotal - actualTotal
  const pctUsed       = budgetTotal > 0 ? Math.min(100, Math.round(actualTotal / budgetTotal * 100)) : 0
  const grossIncome   = (Number(budget.expected_yield_t || 0) * 1000 * Number(budget.expected_price_per_kg || 0))
  const netMargin     = grossIncome - plannedTotal

  // Chart data: planned vs actual by category
  const chartData = (budget.planned_items || []).map(item => ({
    name:    item.category.split(' ')[0],
    planned: Number(item.amount || 0),
    actual:  actual.filter(t => (t.category || '').toLowerCase().includes(item.category.toLowerCase().split(' ')[0])).reduce((s,t)=>s+Number(t.amount),0),
  })).filter(d => d.planned > 0 || d.actual > 0)

  return (
    <Card
      title={`${budget.crop}${budget.variety ? ` (${budget.variety})` : ''} — ${budget.season}`}
      subtitle={`${budget.area_acres} acres · ${budget.sowing_date || '?'} → ${budget.harvest_date || '?'}`}
      action={<button className="icon-button" onClick={() => onDelete(budget.id)} aria-label="Delete budget"><Trash2 size={14}/></button>}
    >
      <div className="stats-grid four" style={{ marginBottom: 14 }}>
        <article className="stat-card">
          <div className="stat-label">Planned costs<span className="stat-glyph amber" /></div>
          <strong className="stat-value" style={{ fontSize: 18 }}>{money(plannedTotal)}</strong>
        </article>
        <article className="stat-card">
          <div className="stat-label">Actual costs<span className="stat-glyph amber" /></div>
          <strong className="stat-value" style={{ fontSize: 18 }}>{money(actualTotal)}</strong>
          <div className="stat-foot"><span>{pctUsed}% of budget used</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Remaining budget<span className="stat-glyph" /></div>
          <strong className="stat-value" style={{ fontSize: 18, color: remaining < 0 ? '#c0392b' : undefined }}>{money(remaining)}</strong>
        </article>
        <article className="stat-card">
          <div className="stat-label">Est. net margin<span className="stat-glyph" /></div>
          <strong className="stat-value" style={{ fontSize: 18, color: netMargin >= 0 ? '#3d8050' : '#c0392b' }}>{grossIncome > 0 ? money(netMargin) : '—'}</strong>
          <div className="stat-foot"><span>{grossIncome > 0 ? `Revenue: ${money(grossIncome)}` : 'Enter yield & price'}</span></div>
        </article>
      </div>

      <Progress label="Budget used" value={pctUsed} color={pctUsed > 90 ? 'amber' : 'green'} />

      {remaining < 0 && (
        <div className="inline-feedback" style={{ marginTop: 10 }}>
          <AlertTriangle size={14}/>
          <span>Actual expenses have exceeded the planned budget by {money(Math.abs(remaining))}. Review costs and adjust the budget or plan.</span>
        </div>
      )}

      {chartData.length > 0 && (
        <>
          <div style={{ marginTop: 14, marginBottom: 6 }}>
            <small className="cf-chart-label">Planned vs Actual by Category</small>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#edf1ed" vertical={false}/>
              <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v => `₹${Math.round(v/1000)}k`} tick={axis} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v => money(v)} contentStyle={tt}/>
              <Bar dataKey="planned" name="Planned" fill="#78a67a" maxBarSize={22}/>
              <Bar dataKey="actual"  name="Actual"  fill="#d6a05d" maxBarSize={22}/>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {grossIncome > 0 && (
        <div className="inline-feedback" style={{ marginTop: 10, background: '#f0f8f0', borderColor: '#d4e8d4' }}>
          <AlertTriangle size={14} style={{ color: '#3d8050' }}/>
          <span>
            A crop can be profitable overall while still running short on cash before harvest.
            The income ({money(grossIncome)}) arrives at harvest — but expenses are paid throughout the season.
          </span>
        </div>
      )}
    </Card>
  )
}

export default function SeasonBudget({ budgets, transactions, onSave, onDelete }) {
  const { t } = useLanguage()
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="page">
      <Notice>
        Reference costs are from ICAR/TNAU published estimates. Adjust them to match your
        actual farm costs. Expected income is an estimate — actual sale price may differ.
      </Notice>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="button" onClick={() => setShowForm(v => !v)}>
          <Plus size={14}/> {showForm ? 'Cancel' : 'New season budget'}
        </button>
      </div>

      {showForm && (
        <Card title="New Season Budget">
          <BudgetForm
            onSave={d => { onSave(d); setShowForm(false) }}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      {budgets.length === 0 && !showForm && (
        <div className="cf-empty">
          <p>No season budgets yet. Create one to track planned vs actual farming costs.</p>
        </div>
      )}

      {budgets.map(b => (
        <BudgetCard key={b.id} budget={b} transactions={transactions} onDelete={onDelete} />
      ))}
    </div>
  )
}
