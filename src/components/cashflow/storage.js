/**
 * Cash Flow localStorage persistence layer.
 *
 * All data stays in the browser — no backend database.
 * Each key is namespaced under "cf_" to avoid collisions.
 *
 * Data model:
 *   transactions  — array of Transaction
 *   budgets       — array of SeasonBudget
 *   loans         — array of Loan
 *   savings_goals — array of SavingsGoal
 *   settings      — { opening_balance, currency }
 *
 * Transaction shape:
 *   { id, date, amount, category, type: 'income'|'expense'|'loan_in'|'loan_out',
 *     finance_type: 'farm'|'household', description, payment_method, notes,
 *     planned: bool, created_at }
 *
 * SeasonBudget shape:
 *   { id, crop, variety, area_acres, season, sowing_date, harvest_date,
 *     budget_total, planned_items: [{category, amount}],
 *     expected_yield_t, expected_price_per_kg, created_at }
 *
 * Loan shape:
 *   { id, lender, ref, principal, outstanding, interest_rate,
 *     repayment_amount, frequency, due_date, paid_total, created_at }
 *
 * SavingsGoal shape:
 *   { id, name, category, target, saved, created_at }
 */

const KEYS = {
  transactions:  'cf_transactions',
  budgets:       'cf_budgets',
  loans:         'cf_loans',
  savings:       'cf_savings_goals',
  settings:      'cf_settings',
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ── Transactions ──────────────────────────────────────────────────────────────

export function getTransactions() {
  return read(KEYS.transactions, [])
}

export function saveTransaction(tx) {
  const list = getTransactions()
  const now  = new Date().toISOString()
  if (tx.id) {
    const idx = list.findIndex(t => t.id === tx.id)
    if (idx >= 0) { list[idx] = { ...tx, updated_at: now } }
    else           { list.push({ ...tx, created_at: now }) }
  } else {
    list.push({ ...tx, id: `tx_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, created_at: now })
  }
  write(KEYS.transactions, list)
  return list
}

export function deleteTransaction(id) {
  const list = getTransactions().filter(t => t.id !== id)
  write(KEYS.transactions, list)
  return list
}

// ── Season Budgets ────────────────────────────────────────────────────────────

export function getBudgets() {
  return read(KEYS.budgets, [])
}

export function saveBudget(budget) {
  const list = getBudgets()
  const now  = new Date().toISOString()
  if (budget.id) {
    const idx = list.findIndex(b => b.id === budget.id)
    if (idx >= 0) list[idx] = { ...budget, updated_at: now }
    else          list.push({ ...budget, created_at: now })
  } else {
    list.push({ ...budget, id: `bgt_${Date.now()}`, created_at: now })
  }
  write(KEYS.budgets, list)
  return list
}

export function deleteBudget(id) {
  const list = getBudgets().filter(b => b.id !== id)
  write(KEYS.budgets, list)
  return list
}

// ── Loans ─────────────────────────────────────────────────────────────────────

export function getLoans() {
  return read(KEYS.loans, [])
}

export function saveLoan(loan) {
  const list = getLoans()
  const now  = new Date().toISOString()
  if (loan.id) {
    const idx = list.findIndex(l => l.id === loan.id)
    if (idx >= 0) list[idx] = { ...loan, updated_at: now }
    else          list.push({ ...loan, created_at: now })
  } else {
    list.push({ ...loan, id: `ln_${Date.now()}`, created_at: now })
  }
  write(KEYS.loans, list)
  return list
}

export function deleteLoan(id) {
  const list = getLoans().filter(l => l.id !== id)
  write(KEYS.loans, list)
  return list
}

// ── Savings goals ─────────────────────────────────────────────────────────────

export function getSavingsGoals() {
  return read(KEYS.savings, [])
}

export function saveSavingsGoal(goal) {
  const list = getSavingsGoals()
  const now  = new Date().toISOString()
  if (goal.id) {
    const idx = list.findIndex(g => g.id === goal.id)
    if (idx >= 0) list[idx] = { ...goal, updated_at: now }
    else          list.push({ ...goal, created_at: now })
  } else {
    list.push({ ...goal, id: `sv_${Date.now()}`, created_at: now })
  }
  write(KEYS.savings, list)
  return list
}

export function deleteSavingsGoal(id) {
  const list = getSavingsGoals().filter(g => g.id !== id)
  write(KEYS.savings, list)
  return list
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSettings() {
  return read(KEYS.settings, { opening_balance: 0, currency: '₹' })
}

export function saveSettings(s) {
  write(KEYS.settings, s)
}

// ── Derived calculations ──────────────────────────────────────────────────────

/**
 * Compute summary totals from real transactions only (planned=false).
 * Loan inflows are tracked separately from earned income.
 */
export function computeSummary(transactions, settings) {
  const actual = transactions.filter(t => !t.planned)
  const opening = Number(settings?.opening_balance || 0)

  let income     = 0  // earned income only
  let loan_in    = 0  // loans received (cash in, not income)
  let expenses   = 0
  let loan_out   = 0  // loan repayments (principal + interest)

  for (const t of actual) {
    const amt = Number(t.amount || 0)
    if      (t.type === 'income')   income   += amt
    else if (t.type === 'loan_in')  loan_in  += amt
    else if (t.type === 'expense')  expenses += amt
    else if (t.type === 'loan_out') loan_out += amt
  }

  const total_in   = income + loan_in
  const total_out  = expenses + loan_out
  const net_cf     = income - expenses          // earned net cash flow (excludes loans)
  const balance    = opening + total_in - total_out

  return { opening, income, loan_in, expenses, loan_out,
           total_in, total_out, net_cf, balance }
}

/**
 * Build month-by-month cash flow from actual transactions.
 * Returns array of { month, label, income, loan_in, expenses, loan_out, net, balance }
 */
export function buildMonthlyFlow(transactions, settings) {
  const opening = Number(settings?.opening_balance || 0)
  const map = {}

  for (const t of transactions) {
    if (t.planned) continue
    if (!t.date) continue
    const d     = new Date(t.date)
    const key   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const label = d.toLocaleDateString('en-IN', { month:'short', year:'2-digit' })
    if (!map[key]) map[key] = { month: key, label, income:0, loan_in:0, expenses:0, loan_out:0 }
    const amt = Number(t.amount || 0)
    if      (t.type === 'income')   map[key].income   += amt
    else if (t.type === 'loan_in')  map[key].loan_in  += amt
    else if (t.type === 'expense')  map[key].expenses += amt
    else if (t.type === 'loan_out') map[key].loan_out += amt
  }

  const rows = Object.values(map).sort((a,b) => a.month.localeCompare(b.month))
  let running = opening
  return rows.map(r => {
    running += r.income + r.loan_in - r.expenses - r.loan_out
    return { ...r, net: r.income - r.expenses, balance: running }
  })
}

/**
 * Build a 6-month forward forecast from:
 *  - Current closing balance
 *  - Planned transactions
 *  - Loan repayment schedules
 *  - Expected crop income entries
 */
export function buildForecast(transactions, loans, budgets, settings) {
  const summary = computeSummary(transactions, settings)
  let balance   = summary.balance

  const today   = new Date()
  const months  = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
    months.push({
      key:   `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      label: d.toLocaleDateString('en-IN', { month:'short', year:'2-digit' }),
      income: 0, loan_in: 0, expenses: 0, loan_out: 0,
    })
  }

  // Planned transactions
  for (const t of transactions) {
    if (!t.planned || !t.date) continue
    const d   = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const row = months.find(m => m.key === key)
    if (!row) continue
    const amt = Number(t.amount || 0)
    if      (t.type === 'income')   row.income   += amt
    else if (t.type === 'loan_in')  row.loan_in  += amt
    else if (t.type === 'expense')  row.expenses += amt
    else if (t.type === 'loan_out') row.loan_out += amt
  }

  // Recurring loan repayments
  for (const loan of loans) {
    if (!loan.due_date || !loan.repayment_amount) continue
    const repay   = Number(loan.repayment_amount)
    const dueDate = new Date(loan.due_date)
    for (const row of months) {
      const [yr, mo] = row.key.split('-').map(Number)
      // Monthly frequency — add to every month from due_date
      if (loan.frequency === 'monthly') {
        if (new Date(yr, mo-1, dueDate.getDate()) >= today) {
          row.loan_out += repay
        }
      } else {
        // Single upcoming payment
        const pmKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth()+1).padStart(2,'0')}`
        if (row.key === pmKey) row.loan_out += repay
      }
    }
  }

  // Expected crop income from budgets (harvest date)
  for (const b of budgets) {
    if (!b.harvest_date || !b.expected_yield_t || !b.expected_price_per_kg) continue
    const d   = new Date(b.harvest_date)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const row = months.find(m => m.key === key)
    if (!row) continue
    const gross = Math.round(Number(b.expected_yield_t) * 1000 * Number(b.expected_price_per_kg))
    row.income += gross
  }

  return months.map(row => {
    balance += row.income + row.loan_in - row.expenses - row.loan_out
    return { ...row, net: row.income - row.expenses, balance, projected: true }
  })
}
