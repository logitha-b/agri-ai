import { useLanguage } from '../../context/LanguageContext'
/**
 * TransactionList — Add, edit, filter, and delete transactions.
 * Supports income, expenses, loan inflows, loan repayments.
 * Distinguishes farm vs household and actual vs planned.
 */
import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button, Card, Field } from '../../components'

const money = v => `₹${Number(v || 0).toLocaleString('en-IN')}`

const INCOME_CATS  = ['Crop sales', 'Dairy / livestock', 'Poultry', 'Subsidies / assistance',
                      'Wages / labour', 'Rural business', 'Other income']
const EXPENSE_CATS = ['Seeds / fertilizer / manure', 'Pesticides', 'Labour / machinery',
                      'Irrigation / water', 'Electricity / fuel', 'Harvesting / packaging',
                      'Transport', 'Household groceries', 'Education', 'Healthcare', 'Other expense']
const PAYMENT_METHODS = ['Cash', 'Bank transfer', 'UPI / mobile', 'Cheque', 'Unknown']

const TYPE_LABELS = {
  income:   { label: 'Income',          color: '#3d8050' },
  expense:  { label: 'Expense',         color: '#c0392b' },
  loan_in:  { label: 'Loan received',   color: '#4e86c8' },
  loan_out: { label: 'Loan repayment',  color: '#8b4513' },
}

function categoryOptions(type) {
  if (type === 'income')  return INCOME_CATS
  if (type === 'expense') return EXPENSE_CATS
  if (type === 'loan_in') return ['Loan / advance received']
  return ['Loan principal repayment', 'Loan interest payment', 'EMI payment']
}

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  type: 'income', amount: '', category: '', finance_type: 'farm',
  description: '', payment_method: 'Cash', notes: '', planned: false,
}

function TxForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  const [err, setErr]   = useState('')
  const amtRef          = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    setErr('')
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) {
      setErr('Amount is required and must be greater than zero.')
      amtRef.current?.focus()
      return
    }
    if (!form.date) { setErr('Date is required.'); return }
    onSave({ ...form, amount: parseFloat(form.amount) })
  }

  const cats = categoryOptions(form.type)

  return (
    <form className="cf-tx-form" onSubmit={submit} noValidate>
      <div className="input-grid columns-2">
        <Field label="TYPE">
          <select value={form.type} onChange={e => { set('type', e.target.value); set('category', '') }}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="loan_in">Loan received</option>
            <option value="loan_out">Loan repayment / EMI</option>
          </select>
        </Field>
        <Field label="AMOUNT (₹) *">
          <input ref={amtRef} type="number" min="0.01" step="0.01"
            value={form.amount} onChange={e => set('amount', e.target.value)}
            placeholder="e.g. 12000"
            style={err && !form.amount ? { borderColor: '#c0392b' } : {}} />
        </Field>
        <Field label="DATE *">
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="CATEGORY">
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">— Select —</option>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="FARM OR HOUSEHOLD">
          <select value={form.finance_type} onChange={e => set('finance_type', e.target.value)}>
            <option value="farm">Farm</option>
            <option value="household">Household</option>
          </select>
        </Field>
        <Field label="PAYMENT METHOD">
          <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="DESCRIPTION">
          <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Short description (optional)" />
        </Field>
        <Field label="STATUS">
          <select value={form.planned ? 'planned' : 'actual'} onChange={e => set('planned', e.target.value === 'planned')}>
            <option value="actual">Actual — money already received / paid</option>
            <option value="planned">Planned — expected future transaction</option>
          </select>
        </Field>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          <span>NOTES (optional)</span>
          <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
            style={{ width: '100%', padding: '6px 9px', border: '1px solid #dfe6df', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', resize: 'vertical' }} />
        </label>
      </div>
      {err && (
        <div className="cf-form-error"><AlertTriangle size={14} /> {err}</div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Button type="submit"><Check size={14} /> Save</Button>
        <Button type="button" kind="secondary" onClick={onCancel}><X size={14} /> Cancel</Button>
      </div>
    </form>
  )
}

function TxRow({ tx, onEdit, onDelete }) {
  const cfg   = TYPE_LABELS[tx.type] || TYPE_LABELS.income
  const sign  = (tx.type === 'income' || tx.type === 'loan_in') ? '+' : '−'
  const color = (tx.type === 'income' || tx.type === 'loan_in') ? '#3d8050' : '#c0392b'
  return (
    <div className={`cf-tx-row ${tx.planned ? 'cf-tx-planned' : ''}`}>
      <div className="cf-tx-date">{new Date(tx.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' })}</div>
      <div className="cf-tx-info">
        <b>{tx.description || tx.category || cfg.label}</b>
        <small>{tx.category}{tx.category && tx.finance_type ? ' · ' : ''}{tx.finance_type}</small>
        {tx.planned && <span className="cf-planned-chip">PLANNED</span>}
      </div>
      <div className="cf-tx-amount" style={{ color }}>
        {sign} {money(tx.amount)}
      </div>
      <div className="cf-tx-actions">
        <button className="icon-button" onClick={() => onEdit(tx)} aria-label="Edit"><Pencil size={13} /></button>
        <button className="icon-button" onClick={() => onDelete(tx.id)} aria-label="Delete"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

export default function TransactionList({ transactions, onSave, onDelete }) {
  const { t } = useLanguage()
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [filterType, setFilterType]   = useState('all')
  const [filterPlan, setFilterPlan]   = useState('all')
  const [filterFin,  setFilterFin]    = useState('all')
  const [monthFilter, setMonthFilter] = useState('')
  const [search, setSearch]           = useState('')

  const filtered = useMemo(() => {
    return transactions
      .filter(t => filterType === 'all' || t.type === filterType)
      .filter(t => filterPlan === 'all' || (filterPlan === 'actual' ? !t.planned : t.planned))
      .filter(t => filterFin  === 'all' || t.finance_type === filterFin)
      .filter(t => !monthFilter || (t.date || '').startsWith(monthFilter))
      .filter(t => !search || [t.description, t.category, t.notes].join(' ').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [transactions, filterType, filterPlan, filterFin, monthFilter, search])

  const totalIn  = filtered.filter(t => ['income','loan_in'].includes(t.type)).reduce((s,t) => s+Number(t.amount),0)
  const totalOut = filtered.filter(t => ['expense','loan_out'].includes(t.type)).reduce((s,t) => s+Number(t.amount),0)

  const handleSave = (data) => {
    onSave(data)
    setShowForm(false)
    setEditing(null)
  }

  const handleEdit = (tx) => { setEditing(tx); setShowForm(false) }

  return (
    <div className="page">
      <Card
        title={t("Transactions")}
        subtitle="Actual income, expenses, and loan movements"
        action={
          <button className="button" type="button" onClick={() => { setShowForm(v => !v); setEditing(null) }}>
            <Plus size={14} /> {showForm ? 'Cancel' : 'Add transaction'}
          </button>
        }
      >
        {(showForm && !editing) && (
          <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid #edf0ed' }}>
            <TxForm initial={EMPTY_FORM} onSave={handleSave} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {/* Filters */}
        <div className="cf-filters">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="cf-filter-select">
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expenses</option>
            <option value="loan_in">Loans received</option>
            <option value="loan_out">Repayments</option>
          </select>
          <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} className="cf-filter-select">
            <option value="all">Actual + planned</option>
            <option value="actual">Actual only</option>
            <option value="planned">Planned only</option>
          </select>
          <select value={filterFin} onChange={e => setFilterFin(e.target.value)} className="cf-filter-select">
            <option value="all">Farm + household</option>
            <option value="farm">Farm only</option>
            <option value="household">Household only</option>
          </select>
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="cf-filter-select" title="Filter by month" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="cf-filter-select" />
        </div>

        {/* Totals strip */}
        <div className="cf-tx-totals">
          <span>Showing {filtered.length} of {transactions.length}</span>
          <span style={{ color: '#3d8050' }}>In: {money(totalIn)}</span>
          <span style={{ color: '#c0392b' }}>Out: {money(totalOut)}</span>
          <span>Net: <b style={{ color: totalIn - totalOut >= 0 ? '#3d8050' : '#c0392b' }}>{money(totalIn - totalOut)}</b></span>
        </div>

        {/* List */}
        <div className="cf-tx-list">
          {filtered.length === 0 ? (
            <div className="cf-empty">
              <p>{transactions.length === 0 ? 'No transactions recorded yet. Click "Add transaction" to start.' : 'No transactions match the current filters.'}</p>
            </div>
          ) : (
            filtered.map(tx => editing?.id === tx.id ? (
              <div key={tx.id} className="cf-tx-edit-inline">
                <TxForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
              </div>
            ) : (
              <TxRow key={tx.id} tx={tx} onEdit={handleEdit} onDelete={onDelete} />
            ))
          )}
        </div>
      </Card>

      <div className="cf-tx-note">
        <AlertTriangle size={13} />
        <span>Loans received are tracked separately from earned income. Repayments are tracked separately from operating expenses. This prevents double-counting your finances.</span>
      </div>
    </div>
  )
}
