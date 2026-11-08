import { useLanguage } from '../../context/LanguageContext'
/**
 * LoanSavings — Loan / debt planner + savings goals.
 * All data stored in browser localStorage.
 * Loan inflows are not treated as income; repayments are tracked separately.
 */
import { useState } from 'react'
import { AlertTriangle, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button, Card, Field, Notice, Progress } from '../../components'

const money = v => `₹${Number(v || 0).toLocaleString('en-IN')}`

const FREQ_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', one_time: 'One-time payment' }
const SAVINGS_CATS = ['Seeds & agricultural inputs', 'Education', 'Healthcare', 'Equipment', 'Livestock care', 'Emergency fund', 'Other']

// ── Loan form ─────────────────────────────────────────────────────────────────

const EMPTY_LOAN = {
  lender: '', ref: '', principal: '', outstanding: '',
  interest_rate: '', repayment_amount: '', frequency: 'monthly',
  due_date: '', paid_total: '', notes: '',
}

function LoanForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_LOAN, ...initial })
  const [err, setErr]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = (e) => {
    e.preventDefault(); setErr('')
    if (!form.principal || isNaN(form.principal) || +form.principal <= 0) { setErr('Loan amount is required.'); return }
    onSave({ ...form, principal: parseFloat(form.principal) || 0, outstanding: parseFloat(form.outstanding) || parseFloat(form.principal) || 0,
      repayment_amount: parseFloat(form.repayment_amount) || 0, paid_total: parseFloat(form.paid_total) || 0 })
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="input-grid columns-2">
        <Field label="LENDER / INSTITUTION">
          <input value={form.lender} onChange={e => set('lender', e.target.value)} placeholder="e.g. SBI, cooperative, private" />
        </Field>
        <Field label="LOAN REFERENCE (optional)">
          <input value={form.ref} onChange={e => set('ref', e.target.value)} placeholder="Account or reference number" />
        </Field>
        <Field label="ORIGINAL LOAN AMOUNT (₹) *">
          <input type="number" min="1" value={form.principal} onChange={e => set('principal', e.target.value)} placeholder="e.g. 50000" />
        </Field>
        <Field label="OUTSTANDING PRINCIPAL (₹)">
          <input type="number" min="0" value={form.outstanding} onChange={e => set('outstanding', e.target.value)} placeholder="Remaining balance" />
        </Field>
        <Field label="INTEREST RATE (% per annum, optional)">
          <input type="number" min="0" step="0.1" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} placeholder="e.g. 7.5" />
        </Field>
        <Field label="REPAYMENT AMOUNT (₹)">
          <input type="number" min="0" value={form.repayment_amount} onChange={e => set('repayment_amount', e.target.value)} placeholder="Amount per repayment" />
        </Field>
        <Field label="FREQUENCY">
          <select value={form.frequency} onChange={e => set('frequency', e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="one_time">One-time payment</option>
          </select>
        </Field>
        <Field label="NEXT DUE DATE">
          <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </Field>
        <Field label="TOTAL ALREADY REPAID (₹)">
          <input type="number" min="0" value={form.paid_total} onChange={e => set('paid_total', e.target.value)} placeholder="Principal repaid so far" />
        </Field>
        <Field label="NOTES (optional)">
          <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes" />
        </Field>
      </div>
      {err && <div className="cf-form-error"><AlertTriangle size={13}/> {err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Button type="submit"><Check size={14}/> Save loan</Button>
        <Button type="button" kind="secondary" onClick={onCancel}><X size={14}/> Cancel</Button>
      </div>
    </form>
  )
}

function LoanCard({ loan, onEdit, onDelete }) {
  const outstanding = Number(loan.outstanding || loan.principal || 0)
  const principal   = Number(loan.principal || 0)
  const paidPct     = principal > 0 ? Math.min(100, Math.round(Number(loan.paid_total || 0) / principal * 100)) : 0
  const overdue     = loan.due_date && new Date(loan.due_date) < new Date()

  return (
    <div className={`cf-loan-card ${overdue ? 'cf-loan-overdue' : ''}`}>
      <div className="cf-loan-header">
        <div>
          <b>{loan.lender || 'Loan'}</b>
          {loan.ref && <small> · {loan.ref}</small>}
          {loan.notes && <small> · {loan.notes}</small>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-button" onClick={() => onEdit(loan)} aria-label="Edit"><Pencil size={13}/></button>
          <button className="icon-button" onClick={() => onDelete(loan.id)} aria-label="Delete"><Trash2 size={13}/></button>
        </div>
      </div>
      <div className="cf-loan-body">
        <div><small>Original amount</small><b>{money(principal)}</b></div>
        <div><small>Outstanding</small><b style={{ color: outstanding > 0 ? '#c0392b' : '#3d8050' }}>{money(outstanding)}</b></div>
        {loan.interest_rate && <div><small>Interest rate</small><b>{loan.interest_rate}% p.a.</b></div>}
        <div><small>Repayment</small><b>{money(loan.repayment_amount)} ({FREQ_LABELS[loan.frequency] || loan.frequency})</b></div>
        {loan.due_date && <div><small>Next due</small><b style={{ color: overdue ? '#c0392b' : undefined }}>{new Date(loan.due_date).toLocaleDateString('en-IN')}{overdue ? ' ⚠ Overdue' : ''}</b></div>}
      </div>
      <Progress label={`Repaid: ${money(loan.paid_total || 0)} of ${money(principal)}`} value={paidPct} color={paidPct > 75 ? 'green' : 'amber'} />
    </div>
  )
}

// ── Savings goal form ─────────────────────────────────────────────────────────

const EMPTY_GOAL = { name: '', category: 'Emergency fund', target: '', saved: '' }

function GoalForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_GOAL, ...initial })
  const [err, setErr]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = (e) => {
    e.preventDefault(); setErr('')
    if (!form.name) { setErr('Goal name is required.'); return }
    if (!form.target || isNaN(form.target) || +form.target <= 0) { setErr('Target amount is required.'); return }
    onSave({ ...form, target: parseFloat(form.target), saved: parseFloat(form.saved) || 0 })
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="input-grid columns-2">
        <Field label="GOAL NAME *">
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Next season seeds" />
        </Field>
        <Field label="CATEGORY">
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            {SAVINGS_CATS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="TARGET AMOUNT (₹) *">
          <input type="number" min="1" value={form.target} onChange={e => set('target', e.target.value)} placeholder="e.g. 25000" />
        </Field>
        <Field label="AMOUNT ALREADY SAVED (₹)">
          <input type="number" min="0" value={form.saved} onChange={e => set('saved', e.target.value)} placeholder="0" />
        </Field>
      </div>
      {err && <div className="cf-form-error"><AlertTriangle size={13}/> {err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Button type="submit"><Check size={14}/> Save goal</Button>
        <Button type="button" kind="secondary" onClick={onCancel}><X size={14}/> Cancel</Button>
      </div>
    </form>
  )
}

function GoalCard({ goal, onEdit, onDelete }) {
  const pct  = goal.target > 0 ? Math.min(100, Math.round(Number(goal.saved||0) / Number(goal.target) * 100)) : 0
  const left = Math.max(0, Number(goal.target) - Number(goal.saved||0))
  return (
    <div className="cf-goal-card">
      <div className="cf-goal-header">
        <div>
          <b>{goal.name}</b>
          <small> · {goal.category}</small>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-button" onClick={() => onEdit(goal)} aria-label="Edit"><Pencil size={13}/></button>
          <button className="icon-button" onClick={() => onDelete(goal.id)} aria-label="Delete"><Trash2 size={13}/></button>
        </div>
      </div>
      <div className="cf-goal-nums">
        <span>Saved: <b>{money(goal.saved || 0)}</b></span>
        <span>Target: <b>{money(goal.target)}</b></span>
        <span>Remaining: <b style={{ color: left > 0 ? '#c0392b' : '#3d8050' }}>{money(left)}</b></span>
      </div>
      <Progress label={`${pct}% funded`} value={pct} color={pct >= 100 ? 'green' : 'amber'} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LoanSavings({ loans, savings, onSaveLoan, onDeleteLoan, onSaveGoal, onDeleteGoal }) {
  const { t } = useLanguage()
  const [showLoanForm, setShowLoanForm] = useState(false)
  const [editingLoan, setEditingLoan]   = useState(null)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoal, setEditingGoal]   = useState(null)

  const totalOutstanding = loans.reduce((s, l) => s + Number(l.outstanding || l.principal || 0), 0)
  const totalRepayment   = loans.filter(l => l.frequency === 'monthly').reduce((s, l) => s + Number(l.repayment_amount || 0), 0)

  const handleSaveLoan = (data) => { onSaveLoan(data); setShowLoanForm(false); setEditingLoan(null) }
  const handleEditLoan = (l) => { setEditingLoan(l); setShowLoanForm(false) }
  const handleSaveGoal = (data) => { onSaveGoal(data); setShowGoalForm(false); setEditingGoal(null) }
  const handleEditGoal = (g) => { setEditingGoal(g); setShowGoalForm(false) }

  return (
    <div className="page">
      <Notice>
        Loans received are recorded as a cash inflow but are NOT counted as income or farming profit.
        Repayments are recorded as a cash outflow but are NOT counted as a farming expense.
        This keeps your actual farm profitability separate from your cash position.
      </Notice>

      {/* ── Loans ───────────────────────────────────────────────────────────── */}
      <Card
        title="Loans & Debt"
        subtitle={`${loans.length} loan${loans.length !== 1 ? 's' : ''} · Outstanding: ${money(totalOutstanding)} · Monthly EMI: ${money(totalRepayment)}`}
        action={
          <button className="button" onClick={() => { setShowLoanForm(v => !v); setEditingLoan(null) }}>
            <Plus size={14}/> {showLoanForm ? 'Cancel' : 'Add loan'}
          </button>
        }
      >
        {showLoanForm && !editingLoan && (
          <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid #edf0ed' }}>
            <LoanForm initial={EMPTY_LOAN} onSave={handleSaveLoan} onCancel={() => setShowLoanForm(false)} />
          </div>
        )}

        {loans.length === 0 && !showLoanForm ? (
          <p className="cf-empty-note">No loans recorded. Add a loan to include repayments in your cash flow forecast.</p>
        ) : (
          loans.map(l => editingLoan?.id === l.id
            ? <div key={l.id} style={{ marginBottom: 14 }}><LoanForm initial={editingLoan} onSave={handleSaveLoan} onCancel={() => setEditingLoan(null)} /></div>
            : <LoanCard key={l.id} loan={l} onEdit={handleEditLoan} onDelete={onDeleteLoan} />
          )
        )}

        {totalOutstanding > 0 && (
          <div className="inline-feedback" style={{ marginTop: 12 }}>
            <AlertTriangle size={14}/>
            <span>
              Monthly loan repayments of {money(totalRepayment)} are included in the Forecast tab.
              Ensure your expected income covers both expenses and repayments each month.
            </span>
          </div>
        )}
      </Card>

      {/* ── Savings goals ────────────────────────────────────────────────────── */}
      <Card
        title="Savings Goals"
        subtitle="Track progress towards specific financial targets"
        action={
          <button className="button" onClick={() => { setShowGoalForm(v => !v); setEditingGoal(null) }}>
            <Plus size={14}/> {showGoalForm ? 'Cancel' : 'Add goal'}
          </button>
        }
      >
        {showGoalForm && !editingGoal && (
          <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid #edf0ed' }}>
            <GoalForm initial={EMPTY_GOAL} onSave={handleSaveGoal} onCancel={() => setShowGoalForm(false)} />
          </div>
        )}

        {savings.length === 0 && !showGoalForm ? (
          <p className="cf-empty-note">No savings goals yet. Add a goal to track your progress.</p>
        ) : (
          savings.map(g => editingGoal?.id === g.id
            ? <div key={g.id} style={{ marginBottom: 14 }}><GoalForm initial={editingGoal} onSave={handleSaveGoal} onCancel={() => setEditingGoal(null)} /></div>
            : <GoalCard key={g.id} goal={g} onEdit={handleEditGoal} onDelete={onDeleteGoal} />
          )
        )}

        <div className="inline-feedback" style={{ marginTop: 12 }}>
          <AlertTriangle size={14}/>
          <span>
            Savings contributions are only possible after covering all recorded expenses and
            loan repayments. Review your forecast before setting a savings contribution target.
          </span>
        </div>
      </Card>
    </div>
  )
}
