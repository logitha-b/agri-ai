import { useLanguage } from '../context/LanguageContext'
/**
 * CashFlow — /cash-flow route.
 *
 * Tabs:
 *   Dashboard     — actual balance, insights, monthly chart
 *   Transactions  — add/edit/filter income & expenses
 *   Season Budget — crop budgets with planned vs actual
 *   Forecast      — 6-month forward projection
 *   What-If       — scenario simulator (isolated from real records)
 *   Loans & Savings — debt tracker + savings goals
 *   Settings      — opening balance, crop income estimator
 *
 * Storage: browser localStorage (no backend database).
 * All calculations use actual recorded transactions — no fabricated values.
 */

import { useEffect, useRef, useState } from 'react'
import { Activity, AlertTriangle, ArrowRight, BarChart3, Calculator, CheckCircle2, Download, Landmark, Leaf, List, PiggyBank, RefreshCw, Settings, Sparkles, TrendingUp } from 'lucide-react'
import { Button, Card, Field, Notice, PageHeader } from '../components'
import CashDashboard   from '../components/cashflow/CashDashboard'
import TransactionList from '../components/cashflow/TransactionList'
import SeasonBudget    from '../components/cashflow/SeasonBudget'
import CashForecast    from '../components/cashflow/CashForecast'
import WhatIfSimulator from '../components/cashflow/WhatIfSimulator'
import LoanSavings     from '../components/cashflow/LoanSavings'
import {
  getTransactions, saveTransaction, deleteTransaction,
  getBudgets, saveBudget, deleteBudget,
  getLoans, saveLoan, deleteLoan,
  getSavingsGoals, saveSavingsGoal, deleteSavingsGoal,
  getSettings, saveSettings,
  computeSummary,
} from '../components/cashflow/storage'

const API   = (import.meta.env.VITE_CROP_HEALTH_API_BASE_URL || '').replace(/\/$/, '')
const money = v => `₹${Number(v || 0).toLocaleString('en-IN')}`

// ── Sample data — R. Kumar, Thiruvallur, Paddy Kharif 2026 ───────────────────

const SAMPLE_SETTINGS = { opening_balance: 40000, currency: '₹' }

const SAMPLE_TRANSACTIONS = [
  // ── Actual income ──────────────────────────────────────────────────────────
  { id:'stx_01', date:'2026-06-01', type:'income',   amount:5000,  category:'Subsidies / assistance',   finance_type:'farm',      description:'PM-KISAN instalment',                 payment_method:'Bank transfer', planned:false },
  { id:'stx_02', date:'2026-09-25', type:'income',   amount:82500, category:'Crop sales',               finance_type:'farm',      description:'Paddy sold — 2.75 t at ₹30/kg',      payment_method:'Bank transfer', planned:false },
  { id:'stx_03', date:'2026-10-02', type:'income',   amount:8000,  category:'Wages / labour',           finance_type:'household', description:'Borewell repair work for neighbour', payment_method:'Cash',          planned:false },
  // ── Actual expenses ────────────────────────────────────────────────────────
  { id:'stx_04', date:'2026-06-05', type:'expense',  amount:4500,  category:'Seeds / fertilizer / manure', finance_type:'farm',   description:'ADT 45 paddy seed — 15 kg',           payment_method:'Cash',          planned:false },
  { id:'stx_05', date:'2026-06-12', type:'expense',  amount:8200,  category:'Labour / machinery',       finance_type:'farm',      description:'Land preparation — tractor hire',     payment_method:'Cash',          planned:false },
  { id:'stx_06', date:'2026-06-20', type:'expense',  amount:12500, category:'Seeds / fertilizer / manure', finance_type:'farm',   description:'DAP + Urea — 2 bags each',            payment_method:'Cash',          planned:false },
  { id:'stx_07', date:'2026-07-10', type:'expense',  amount:9000,  category:'Labour / machinery',       finance_type:'farm',      description:'Transplanting labour — 6 workers',   payment_method:'Cash',          planned:false },
  { id:'stx_08', date:'2026-07-28', type:'expense',  amount:3800,  category:'Pesticides',               finance_type:'farm',      description:'Blast fungicide spray',               payment_method:'Cash',          planned:false },
  { id:'stx_09', date:'2026-08-15', type:'expense',  amount:6500,  category:'Irrigation / water',       finance_type:'farm',      description:'Borewell electricity bill',           payment_method:'Bank transfer', planned:false },
  { id:'stx_10', date:'2026-09-10', type:'expense',  amount:8000,  category:'Harvesting / packaging',   finance_type:'farm',      description:'Harvesting labour + gunny bags',      payment_method:'Cash',          planned:false },
  { id:'stx_11', date:'2026-09-18', type:'expense',  amount:3200,  category:'Transport',                finance_type:'farm',      description:'Transport to Chennai mandi',          payment_method:'Cash',          planned:false },
  { id:'stx_12', date:'2026-10-05', type:'expense',  amount:7500,  category:'Household groceries',      finance_type:'household', description:'Monthly household expenses',          payment_method:'Cash',          planned:false },
  { id:'stx_13', date:'2026-10-10', type:'expense',  amount:2800,  category:'Healthcare',               finance_type:'household', description:'Medical — family',                    payment_method:'Cash',          planned:false },
  // ── Loan movements ─────────────────────────────────────────────────────────
  { id:'stx_14', date:'2026-06-01', type:'loan_in',  amount:25000, category:'Loan / advance received',  finance_type:'farm',      description:'KCC crop loan — SBI',                 payment_method:'Bank transfer', planned:false },
  { id:'stx_15', date:'2026-10-01', type:'loan_out', amount:4200,  category:'EMI payment',              finance_type:'farm',      description:'KCC loan EMI — October',              payment_method:'Bank transfer', planned:false },
  // ── Planned (future) entries ───────────────────────────────────────────────
  { id:'stx_16', date:'2026-11-15', type:'expense',  amount:15000, category:'Seeds / fertilizer / manure', finance_type:'farm',   description:'Rabi season land prep + seeds (planned)', payment_method:'Cash',     planned:true  },
  { id:'stx_17', date:'2026-11-01', type:'loan_out', amount:4200,  category:'EMI payment',              finance_type:'farm',      description:'KCC loan EMI — November (planned)',   payment_method:'Bank transfer', planned:true  },
  { id:'stx_18', date:'2026-12-01', type:'loan_out', amount:4200,  category:'EMI payment',              finance_type:'farm',      description:'KCC loan EMI — December (planned)',   payment_method:'Bank transfer', planned:true  },
].map(t => ({ ...t, created_at: new Date().toISOString() }))

const SAMPLE_BUDGETS = [{
  id: 'sbgt_01',
  crop: 'Paddy', variety: 'ADT 45', area_acres: 2.5,
  season: 'Kharif', sowing_date: '2026-06-15', harvest_date: '2026-09-20',
  budget_total: '60000',
  planned_items: [
    { category: 'Land preparation',    amount: '8200'  },
    { category: 'Seeds / nursery',      amount: '4500'  },
    { category: 'Fertilizer & manure', amount: '12500' },
    { category: 'Irrigation',           amount: '6500'  },
    { category: 'Labour',              amount: '9000'  },
    { category: 'Plant protection',    amount: '3800'  },
    { category: 'Harvesting',          amount: '8000'  },
    { category: 'Transport & misc',    amount: '3200'  },
  ],
  expected_yield_t: '2.75',
  expected_price_per_kg: '30',
  created_at: new Date().toISOString(),
}]

const SAMPLE_LOANS = [{
  id: 'sln_01',
  lender: 'SBI Kisan Credit Card', ref: 'KCC-TN-2026-4892',
  principal: 25000, outstanding: 20800,
  interest_rate: '7', repayment_amount: 4200,
  frequency: 'monthly', due_date: '2026-11-01',
  paid_total: 4200, notes: 'Crop loan for Kharif 2026',
  created_at: new Date().toISOString(),
}]

const SAMPLE_SAVINGS = [
  {
    id: 'ssv_01', name: 'Next season seeds & fertilizer',
    category: 'Seeds & agricultural inputs', target: 18000, saved: 3000,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ssv_02', name: 'Healthcare emergency fund',
    category: 'Healthcare', target: 10000, saved: 1500,
    created_at: new Date().toISOString(),
  },
]

function loadSampleData() {
  localStorage.setItem('cf_settings',      JSON.stringify(SAMPLE_SETTINGS))
  localStorage.setItem('cf_transactions',  JSON.stringify(SAMPLE_TRANSACTIONS))
  localStorage.setItem('cf_budgets',       JSON.stringify(SAMPLE_BUDGETS))
  localStorage.setItem('cf_loans',         JSON.stringify(SAMPLE_LOANS))
  localStorage.setItem('cf_savings_goals', JSON.stringify(SAMPLE_SAVINGS))
  localStorage.setItem('cf_sample_active', 'true')
}

function clearAllData() {
  ['cf_settings','cf_transactions','cf_budgets','cf_loans','cf_savings_goals','cf_sample_active'].forEach(k => localStorage.removeItem(k))
}

const TABS = [
  { id: 'dashboard',    label: 'Dashboard',      icon: Activity },
  { id: 'transactions', label: 'Transactions',   icon: List },
  { id: 'budget',       label: 'Season Budget',  icon: Leaf },
  { id: 'forecast',     label: 'Forecast',       icon: TrendingUp },
  { id: 'simulator',    label: 'What-If',        icon: Calculator },
  { id: 'loans',        label: 'Loans & Savings', icon: PiggyBank },
  { id: 'settings',     label: 'Settings',       icon: Settings },
]

// ── Settings panel ────────────────────────────────────────────────────────────

function SettingsPanel({ settings, onSave, onClearAll, sampleLoaded }) {
  const { t } = useLanguage()
  const [opening, setOpening]   = useState(String(settings.opening_balance || 0))
  const [saved, setSaved]       = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    onSave({ ...settings, opening_balance: parseFloat(opening) || 0 })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page">
      <Card title={t("Cash Flow Settings", "Cash Flow Settings")} subtitle={t("Opening balance is used as the starting point for all calculations.", "Opening balance is used as the starting point for all calculations.")}>
        <form onSubmit={handleSave} noValidate>
          <div className="input-grid columns-2">
            <Field label={t("OPENING BALANCE (₹)", "OPENING BALANCE (₹)")}>
              <input type="number" min="0" step="1" value={opening}
                onChange={e => setOpening(e.target.value)}
                placeholder={t("Your starting cash balance", "Your starting cash balance")} />
            </Field>
          </div>
          <p className="cf-settings-note">
            {t("Opening balance is the cash you had available at the start of your tracking period. It does not include expected or future income.", "Opening balance is the cash you had available at the start of your tracking period. It does not include expected or future income.")}
          </p>
          <Button type="submit">{saved ? t('✓ Saved', '✓ Saved') : t('Save settings', 'Save settings')}</Button>
        </form>
      </Card>

      <Card title={t("Crop Income Estimator", "Crop Income Estimator")} subtitle={t("Look up AGMARKNET reference prices for any crop", "Look up AGMARKNET reference prices for any crop")}>
        <CropIncomeEstimator sampleLoaded={sampleLoaded} />
      </Card>

      <Card title={t("Data Management", "Data Management")} subtitle={t("All data is stored in your browser only.", "All data is stored in your browser only.")}>
        <div className="inline-feedback" style={{ marginBottom: 12 }}>
          <AlertTriangle size={14}/>
          <span>
            {t("All transactions, budgets, loans, and savings goals are stored in your browser's localStorage. Clearing browser data will erase all records. Export a report before clearing.", "All transactions, budgets, loans, and savings goals are stored in your browser's localStorage. Clearing browser data will erase all records. Export a report before clearing.")}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {confirmed ? (
            <button className="button" type="button" style={{ background: '#c0392b', borderColor: '#c0392b' }}
              onClick={() => { onClearAll(); setConfirmed(false) }}>
              {t("Confirm — clear all data", "Confirm — clear all data")}
            </button>
          ) : (
            <button className="button secondary" type="button" onClick={() => setConfirmed(true)}>
              {t("Clear all my data", "Clear all my data")}
            </button>
          )}
          {confirmed && (
            <button className="button secondary" type="button" onClick={() => setConfirmed(false)}>{t("Cancel", "Cancel")}</button>
          )}
        </div>
      </Card>
    </div>
  )
}

// ── Crop income estimator (standalone widget) ─────────────────────────────────

const CROPS = ['Paddy', 'Groundnut', 'Maize', 'Tomato', 'Millet', 'Wheat', 'Cotton', 'Soybean']

function CropIncomeEstimator({ sampleLoaded }) {
  const { t } = useLanguage()
  const [crop, setCrop]       = useState('Paddy')
  const [qty,  setQty]        = useState('')
  const [unit, setUnit]       = useState('kg')
  const [state, setState]     = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  const lookup = async (overrideCrop, overrideQty, overrideUnit, overrideState) => {
    const curCrop  = overrideCrop !== undefined ? overrideCrop : crop
    const curQty   = overrideQty !== undefined ? overrideQty : qty
    const curUnit  = overrideUnit !== undefined ? overrideUnit : unit
    const curState = overrideState !== undefined ? overrideState : state

    if (!curQty || isNaN(curQty) || +curQty <= 0) { setErr('Enter a quantity.'); return }
    setLoading(true); setErr('')
    try {
      const qtyKg = curUnit === 'quintal' ? +curQty * 100 : curUnit === 'tonne' ? +curQty * 1000 : +curQty
      const res   = await fetch(`${API}/api/cashflow/crop-income`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ crop: curCrop, quantity_kg: qtyKg, state: curState || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'API error')
      setResult(data)
    } catch (e) { setErr(e.message || 'Could not fetch price data.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (sampleLoaded) {
      setCrop('Paddy')
      setState('Tamil Nadu')
      setQty('2500')
      setUnit('kg')
      lookup('Paddy', '2500', 'kg', 'Tamil Nadu')
    } else {
      setQty('')
      setState('')
      setResult(null)
      setErr('')
    }
  }, [sampleLoaded])

  return (
    <div>
      <div className="input-grid columns-2" style={{ marginBottom: 12 }}>
        <Field label={t("CROP", "CROP")}>
          <select value={crop} onChange={e => { setCrop(e.target.value); setResult(null) }}>
            {CROPS.map(c => <option key={c}>{t(c, c)}</option>)}
          </select>
        </Field>
        <Field label={t("STATE (optional — for local price)", "STATE (optional — for local price)")}>
          <input value={state} onChange={e => setState(e.target.value)} placeholder={t("e.g. Tamil Nadu", "e.g. Tamil Nadu")} />
        </Field>
        <Field label={t("QUANTITY", "QUANTITY")}>
          <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder={t("e.g. 2500", "e.g. 2500")} />
        </Field>
        <Field label={t("UNIT", "UNIT")}>
          <select value={unit} onChange={e => setUnit(e.target.value)}>
            <option value="kg">{t("kg", "kg")}</option>
            <option value="quintal">{t("Quintal (100 kg)", "Quintal (100 kg)")}</option>
            <option value="tonne">{t("Tonne (1000 kg)", "Tonne (1000 kg)")}</option>
          </select>
        </Field>
      </div>
      <div>
        <button className="button secondary" onClick={() => lookup()} disabled={loading}>
          {loading ? t('Loading…', 'Loading…') : <><BarChart3 size={13}/> {t('Look up reference price', 'Look up reference price')}</>}
        </button>
      </div>
      {err && <p className="cf-form-error" style={{ marginTop: 8 }}><AlertTriangle size={12}/> {t(err, err)}</p>}
      {result?.available && (
        <div className="cf-price-result">
          <div className="cf-price-row">
            <span>{t('Modal price', 'Modal price')}</span>
            <b>₹{result.modal?.price_rs_per_quintal}/qtl · ₹{result.modal?.price_rs_per_kg}/kg</b>
          </div>
          <div className="cf-price-row">
            <span>{t('Estimated gross revenue (modal)', 'Estimated gross revenue (modal)')}</span>
            <b style={{ color: '#3d8050' }}>{money(result.modal?.gross_revenue_rs)}</b>
          </div>
          {result.low && (
            <div className="cf-price-row">
              <span>{t('Low price scenario', 'Low price scenario')}</span>
              <b style={{ color: '#8b5500' }}>{money(result.low.gross_revenue_rs)}</b>
            </div>
          )}
          {result.high && (
            <div className="cf-price-row">
              <span>{t('High price scenario', 'High price scenario')}</span>
              <b style={{ color: '#3d8050' }}>{money(result.high.gross_revenue_rs)}</b>
            </div>
          )}
          <small className="cf-price-source">
            {t('Source:', 'Source:')} {t(result.source, result.source)} · {result.markets_sampled} {t('markets', 'markets')} · {result.date_range}
          </small>
          <p className="cf-price-note">{t(result.note, result.note)}</p>
        </div>
      )}
      {result && !result.available && (
        <p className="cf-form-error" style={{ marginTop: 8 }}><AlertTriangle size={12}/> {t(result.reason, result.reason)}</p>
      )}
    </div>
  )
}

// ── HTML report export ────────────────────────────────────────────────────────

function buildReportHtml(transactions, budgets, loans, savings, settings) {
  const summary = computeSummary(transactions, settings)
  const rs = v => `₹${Number(v||0).toLocaleString('en-IN')}`
  const today = new Date().toLocaleDateString('en-IN')

  const txRows = transactions.filter(t=>!t.planned).slice(0,50).map(t =>
    `<tr><td>${t.date||'—'}</td><td>${t.type}</td><td>${t.category||'—'}</td><td>${t.description||'—'}</td><td>${t.finance_type}</td><td>${t.planned?'Planned':'Actual'}</td><td>${rs(t.amount)}</td></tr>`
  ).join('')

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Cash Flow Report — ${today}</title>
<style>body{font:14px Georgia,serif;max-width:860px;margin:40px auto;padding:0 24px;color:#2a2a2a}
h1{color:#1a4430;font-size:26px}h2{color:#1a4430;border-bottom:2px solid #1a4430;padding-bottom:4px;margin:24px 0 10px;font-size:16px}
table{width:100%;border-collapse:collapse;font-size:11px;margin:8px 0}
th{background:#f0f5ef;text-align:left;padding:7px;border:1px solid #d4e2d4;color:#3a6b4f}
td{padding:7px;border:1px solid #e0e8e0}
.warn{background:#fff3cd;padding:10px;border-radius:6px;font-size:12px;margin:8px 0}
.cover{background:linear-gradient(135deg,#1a4430,#285a3e);color:white;padding:28px;border-radius:8px;margin-bottom:28px}
.cover h1{color:white;margin:0 0 8px}.cover p{color:#d0e4d0;font-size:12px;margin:0}</style></head>
<body>
<div class="cover"><h1>Cash Flow Report</h1><p>Generated: ${today} · Agri-Economic Intelligence Platform</p></div>
<h2>Summary</h2>
<table><tr><th>Opening balance</th><td>${rs(summary.opening)}</td><th>Total income</th><td>${rs(summary.income)}</td></tr>
<tr><th>Total expenses</th><td>${rs(summary.expenses)}</td><th>Loans received</th><td>${rs(summary.loan_in)}</td></tr>
<tr><th>Loan repayments</th><td>${rs(summary.loan_out)}</td><th>Current balance</th><td><b>${rs(summary.balance)}</b></td></tr></table>
<h2>Recent Transactions (last 50 actual)</h2>
<table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Finance type</th><th>Status</th><th>Amount</th></tr></thead>
<tbody>${txRows || '<tr><td colspan="7">No transactions recorded.</td></tr>'}</tbody></table>
<h2>Loans</h2>
<table><thead><tr><th>Lender</th><th>Original</th><th>Outstanding</th><th>Repayment</th><th>Frequency</th><th>Next due</th></tr></thead>
<tbody>${loans.map(l=>`<tr><td>${l.lender||'—'}</td><td>${rs(l.principal)}</td><td>${rs(l.outstanding)}</td><td>${rs(l.repayment_amount)}</td><td>${l.frequency}</td><td>${l.due_date||'—'}</td></tr>`).join('')||'<tr><td colspan="6">No loans recorded.</td></tr>'}</tbody></table>
<h2>Savings Goals</h2>
<table><thead><tr><th>Goal</th><th>Category</th><th>Target</th><th>Saved</th><th>Remaining</th></tr></thead>
<tbody>${savings.map(g=>`<tr><td>${g.name}</td><td>${g.category}</td><td>${rs(g.target)}</td><td>${rs(g.saved||0)}</td><td>${rs(Math.max(0,Number(g.target)-Number(g.saved||0)))}</td></tr>`).join('')||'<tr><td colspan="5">No goals recorded.</td></tr>'}</tbody></table>
<div class="warn">All data is farmer-entered and stored locally in the browser. This report is a personal financial record — not an official financial statement.</div>
</body></html>`
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CashFlow() {
  const { t } = useLanguage()
  const [tab, setTab]                 = useState('dashboard')
  const [transactions, setTx]         = useState(() => getTransactions())
  const [budgets, setBudgets]         = useState(() => getBudgets())
  const [loans, setLoans]             = useState(() => getLoans())
  const [savings, setSavings]         = useState(() => getSavingsGoals())
  const [settings, setSettings]       = useState(() => getSettings())
  const [sampleLoaded, setSampleLoaded] = useState(() => {
    try { return localStorage.getItem('cf_sample_active') === 'true' } catch { return false }
  })

  // Persist helpers
  const handleSaveTx   = (tx)  => setTx(saveTransaction(tx))
  const handleDelTx    = (id)  => setTx(deleteTransaction(id))
  const handleSaveBgt  = (b)   => setBudgets(saveBudget(b))
  const handleDelBgt   = (id)  => setBudgets(deleteBudget(id))
  const handleSaveLoan = (l)   => setLoans(saveLoan(l))
  const handleDelLoan  = (id)  => setLoans(deleteLoan(id))
  const handleSaveGoal = (g)   => setSavings(saveSavingsGoal(g))
  const handleDelGoal  = (id)  => setSavings(deleteSavingsGoal(id))
  const handleSettings = (s)   => { saveSettings(s); setSettings(s) }

  const handleLoadSample = () => {
    loadSampleData()
    setTx(getTransactions())
    setBudgets(getBudgets())
    setLoans(getLoans())
    setSavings(getSavingsGoals())
    setSettings(getSettings())
    setSampleLoaded(true)
  }

  const handleClearAll = () => {
    clearAllData()
    setTx([])
    setBudgets([])
    setLoans([])
    setSavings([])
    setSettings({ opening_balance: 0, currency: '₹' })
    setSampleLoaded(false)
  }

  const summary = computeSummary(transactions, settings)

  const downloadReport = () => {
    const html = buildReportHtml(transactions, budgets, loans, savings, settings)
    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `cash-flow-report-${new Date().toISOString().slice(0,10)}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page cf-page">
      <PageHeader
        eyebrow={t("FARM CASH FLOW", "FARM CASH FLOW")}
        title={t("Cash Flow Management", "Cash Flow Management")}
        description={t("Track income, expenses, seasonal budgets, and plan ahead for cash shortages.", "Track income, expenses, seasonal budgets, and plan ahead for cash shortages.")}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button"
            onClick={handleLoadSample}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              padding: '8px 16px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            title={t("Load sample data for cash flow", "Load sample data for cash flow")}
          >
            <Sparkles size={15} />
            {t('✨ Load sample data', '✨ Load sample data')}
          </button>
          <button className="button secondary" onClick={downloadReport} title={t("Download HTML report", "Download HTML report")}>
            <Download size={14}/> {t("Export report", "Export report")}
          </button>
        </div>
      </PageHeader>

      {/* Unified sample confirmation badge */}
      {sampleLoaded && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 14px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #e8f5e9 100%)',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          fontSize: 12,
          color: '#166534',
          marginTop: -6,
          marginBottom: 12,
          fontWeight: 600,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <CheckCircle2 size={16} color="#16a34a" />
          <span>
            {t(
              'Sample data active across Cash Flow: R. Kumar, Thiruvallur (Paddy Kharif 2026, 2.5 ac). 18 transactions, season budget, KCC loan EMI schedule, and 2 savings goals loaded.',
              'Sample data active across Cash Flow: R. Kumar, Thiruvallur (Paddy Kharif 2026, 2.5 ac). 18 transactions, season budget, KCC loan EMI schedule, and 2 savings goals loaded.'
            )}
          </span>
        </div>
      )}

      {/* Quick summary strip */}
      <div className="cf-summary-strip">
        <div className="cf-summary-item">
          <small>{t('Current balance')}</small>
          <b style={{ color: summary.balance >= 0 ? '#3d8050' : '#c0392b' }}>{money(summary.balance)}</b>
        </div>
        <div className="cf-summary-item">
          <small>{t('Total income')}</small>
          <b>{money(summary.income)}</b>
        </div>
        <div className="cf-summary-item">
          <small>{t('Total expenses')}</small>
          <b>{money(summary.expenses)}</b>
        </div>
        <div className="cf-summary-item">
          <small>{t('Transactions')}</small>
          <b>{transactions.filter(t=>!t.planned).length} {t('actual', 'actual')}</b>
        </div>
      </div>

      {/* Tab bar */}
      <div className="cf-tab-bar">
        {TABS.map(tabItem => {
          const Icon = tabItem.icon
          return (
            <button
              key={tabItem.id}
              className={`cf-tab ${tab === tabItem.id ? 'active' : ''}`}
              onClick={() => setTab(tabItem.id)}
              aria-current={tab === tabItem.id ? 'page' : undefined}
            >
              <Icon size={14}/>
              <span className="cf-tab-label">{t(tabItem.label, tabItem.label)}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'dashboard'    && <CashDashboard transactions={transactions} loans={loans} savings={savings} settings={settings} onTabChange={setTab} />}
      {tab === 'transactions' && <TransactionList transactions={transactions} onSave={handleSaveTx} onDelete={handleDelTx} />}
      {tab === 'budget'       && <SeasonBudget budgets={budgets} transactions={transactions} onSave={handleSaveBgt} onDelete={handleDelBgt} />}
      {tab === 'forecast'     && <CashForecast transactions={transactions} loans={loans} budgets={budgets} settings={settings} />}
      {tab === 'simulator'    && <WhatIfSimulator transactions={transactions} loans={loans} budgets={budgets} settings={settings} />}
      {tab === 'loans'        && <LoanSavings loans={loans} savings={savings} onSaveLoan={handleSaveLoan} onDeleteLoan={handleDelLoan} onSaveGoal={handleSaveGoal} onDeleteGoal={handleDelGoal} />}
      {tab === 'settings'     && <SettingsPanel settings={settings} onSave={handleSettings} onClearAll={handleClearAll} sampleLoaded={sampleLoaded} />}

      {/* Educational note */}
      <div className="cash-intro" style={{ marginTop: 8 }}>
        <Activity size={18}/>
        <div>
          <b>{t("Profit isn't the same as cash in hand.", "Profit isn't the same as cash in hand.")}</b>
          <p>{t("A farm can be profitable across the season while still running short on cash before harvest income arrives. Track your actual transactions in the Transactions tab, then use Forecast to plan the gap.", "A farm can be profitable across the season while still running short on cash before harvest income arrives. Track your actual transactions in the Transactions tab, then use Forecast to plan the gap.")}</p>
        </div>
      </div>
    </div>
  )
}
