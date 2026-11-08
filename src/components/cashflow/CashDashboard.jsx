import { useLanguage } from '../../context/LanguageContext'
/**
 * CashDashboard — Summary view of actual cash position + upcoming items.
 * Uses only real recorded transactions — never fabricates values.
 */
import { useMemo } from 'react'
import {
  Area, CartesianGrid, ComposedChart, Bar, ResponsiveContainer,
  Tooltip, XAxis, YAxis, ReferenceLine,
} from 'recharts'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2,
         TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Card, Notice, Progress } from '../../components'
import { buildMonthlyFlow, computeSummary } from './storage'

const money = v => `₹${Number(v || 0).toLocaleString('en-IN')}`
const axis  = { fontSize: 11, fill: '#738176' }
const tt    = { border: '1px solid #e0e8e0', borderRadius: 8, fontSize: 12 }

function KpiCard({ label, value, sub, tone = 'green', icon: Icon = Wallet }) {
  return (
    <article className="stat-card">
      <div className="stat-label">
        {label}
        <span className={`stat-glyph ${tone}`}><Icon size={16} /></span>
      </div>
      <strong className="stat-value" style={{ fontSize: 22 }}>{value}</strong>
      <div className="stat-foot"><span>{sub}</span></div>
    </article>
  )
}

function InsightRow({ type, text }) {
  const isWarn = type === 'warn'
  return (
    <div className={`cf-insight-row ${isWarn ? 'cf-insight-warn' : 'cf-insight-ok'}`}>
      {isWarn ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
      <span>{text}</span>
    </div>
  )
}

export default function CashDashboard({ transactions, loans, savings, settings, onTabChange }) {
  const { t } = useLanguage()
  const summary = useMemo(() => computeSummary(transactions, settings), [transactions, settings])
  const monthly = useMemo(() => buildMonthlyFlow(transactions, settings), [transactions, settings])

  const { opening, income, loan_in, expenses, loan_out, net_cf, balance } = summary

  // Upcoming loan repayments (next 30 days)
  const today    = new Date()
  const in30     = new Date(today.getTime() + 30 * 86400_000)
  const upcoming = loans.filter(l => {
    if (!l.due_date) return false
    const d = new Date(l.due_date)
    return d >= today && d <= in30
  })

  // Savings progress
  const savingsTotal  = savings.reduce((s, g) => s + Number(g.target || 0), 0)
  const savedTotal    = savings.reduce((s, g) => s + Number(g.saved  || 0), 0)
  const savingsPct    = savingsTotal > 0 ? Math.round(savedTotal / savingsTotal * 100) : 0

  // Auto-insights
  const insights = useMemo(() => {
    const list = []
    if (transactions.filter(t => !t.planned).length === 0) {
      list.push({ type: 'info', text: t('No transactions recorded yet. Add your first income or expense to see a real cash summary.', 'No transactions recorded yet. Add your first income or expense to see a real cash summary.') })
      return list
    }
    if (income > expenses)  list.push({ type: 'ok',   text: t(`Income (${money(income)}) exceeded expenses (${money(expenses)}) in recorded transactions.`, `Income (${money(income)}) exceeded expenses (${money(expenses)}) in recorded transactions.`) })
    if (expenses > income)  list.push({ type: 'warn', text: t(`Expenses (${money(expenses)}) exceeded income (${money(income)}) in recorded transactions.`, `Expenses (${money(expenses)}) exceeded income (${money(income)}) in recorded transactions.`) })
    if (balance < 0)        list.push({ type: 'warn', text: t(`Current balance is negative (${money(balance)}). Review upcoming expenses and income timing.`, `Current balance is negative (${money(balance)}). Review upcoming expenses and income timing.`) })
    if (upcoming.length > 0) list.push({ type: 'warn', text: `${upcoming.length} ${t('loan repayment', 'loan repayment')}${upcoming.length > 1 ? 's' : ''} ${t('due in the next 30 days', 'due in the next 30 days')} — ${t('total', 'total')} ${money(upcoming.reduce((s,l) => s + Number(l.repayment_amount||0), 0))}.` })
    if (savings.length > 0 && savingsPct < 50) list.push({ type: 'info', text: `${t('Savings goals are', 'Savings goals are')} ${savingsPct}% ${t('funded', 'funded')} (${money(savedTotal)} ${t('of', 'of')} ${money(savingsTotal)}).` })
    if (monthly.length > 0) {
      const lowest = Math.min(...monthly.map(m => m.balance))
      if (lowest < 5000) list.push({ type: 'warn', text: `${t('Lowest recorded monthly balance', 'Lowest recorded monthly balance')}: ${money(lowest)}. ${t('Plan ahead for low-cash periods.', 'Plan ahead for low-cash periods.')}` })
    }
    return list
  }, [transactions, balance, income, expenses, upcoming, savings, monthly])

  const hasData = transactions.filter(t => !t.planned).length > 0

  return (
    <div className="page">
      <Notice>
        {t("Dashboard shows actual recorded transactions only. Planned or expected transactions are shown in the Forecast tab. Opening balance is set in Settings.", "Dashboard shows actual recorded transactions only. Planned or expected transactions are shown in the Forecast tab. Opening balance is set in Settings.")}
      </Notice>

      {/* KPI row */}
      <div className="stats-grid four">
        <KpiCard label={t("Opening Balance", "Opening Balance")}   value={money(opening)}  sub={t("As set in settings", "As set in settings")}           icon={Wallet}       tone="green" />
        <KpiCard label={t("Total Income", "Total Income")}      value={money(income)}   sub={`+ ${money(loan_in)} ${t("loans received", "loans received")}`} icon={ArrowUpRight}  tone="green" />
        <KpiCard label={t("Total Expenses", "Total Expenses")}    value={money(expenses)} sub={`+ ${money(loan_out)} ${t("repaid", "repaid")}`}        icon={ArrowDownRight} tone="amber" />
        <KpiCard label={t("Current Balance", "Current Balance")}   value={money(balance)}  sub={net_cf >= 0 ? `${t("Net", "Net")} +${money(net_cf)}` : `${t("Net", "Net")} ${money(net_cf)}`} icon={net_cf >= 0 ? TrendingUp : TrendingDown} tone={balance >= 0 ? 'green' : 'amber'} />
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card title={t("Financial Insights", "Financial Insights")} subtitle={t("Based on your recorded transactions", "Based on your recorded transactions")}>
          <div className="cf-insights">
            {insights.map((ins, i) => <InsightRow key={i} type={ins.type} text={ins.text} />)}
          </div>
        </Card>
      )}

      {/* Monthly chart */}
      <Card title={t("Monthly Cash Flow", "Monthly Cash Flow")} subtitle={hasData ? t('Actual income and expenses by month', 'Actual income and expenses by month') : t('No transactions yet — add transactions to see this chart', 'No transactions yet — add transactions to see this chart')}>
        {hasData && monthly.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={monthly} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#edf1ed" vertical={false} />
                <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `₹${Math.round(v/1000)}k`} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => money(v)} contentStyle={tt} />
                <Area dataKey="balance" name={t("Closing balance", "Closing balance")} fill="#438b6220" stroke="#438b62" strokeWidth={2} />
                <Bar dataKey="income"   name={t("Income", "Income")}   fill="#78a67a" maxBarSize={32} />
                <Bar dataKey="expenses" name={t("Expenses", "Expenses")} fill="#d6a05d" maxBarSize={32} />
                <ReferenceLine y={0} stroke="#cd8367" strokeDasharray="4 4" />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="cf-chart-note">{t("Green bars = income · Orange bars = expenses · Line = closing balance", "Green bars = income · Orange bars = expenses · Line = closing balance")}</p>
          </>
        ) : (
          <div className="cf-empty">
            <Wallet size={32} />
            <p>{t("Add your first transaction to see the monthly chart.", "Add your first transaction to see the monthly chart.")}</p>
            <button className="button" onClick={() => onTabChange('transactions')}>{t("Add transaction", "Add transaction")}</button>
          </div>
        )}
      </Card>

      {/* Farm vs household split */}
      {hasData && (
        <div className="engine-two">
          <Card title={t("Income Breakdown", "Income Breakdown")} subtitle={t("Actual earned income only (loans excluded)", "Actual earned income only (loans excluded)")}>
            {income > 0 ? (
              <div className="cf-breakdown">
                {[
                  [t('Crop sales', 'Crop sales'),      transactions.filter(t=>t.type==='income'&&t.category==='Crop sales'&&!t.planned).reduce((s,t)=>s+Number(t.amount),0)],
                  [t('Dairy / livestock', 'Dairy / livestock'), transactions.filter(t=>t.type==='income'&&t.category==='Dairy / livestock'&&!t.planned).reduce((s,t)=>s+Number(t.amount),0)],
                  [t('Subsidies', 'Subsidies'),       transactions.filter(t=>t.type==='income'&&t.category==='Subsidies / assistance'&&!t.planned).reduce((s,t)=>s+Number(t.amount),0)],
                  [t('Wages / labour', 'Wages / labour'),  transactions.filter(t=>t.type==='income'&&t.category==='Wages / labour'&&!t.planned).reduce((s,t)=>s+Number(t.amount),0)],
                  [t('Other income', 'Other income'),    transactions.filter(t=>t.type==='income'&&!['Crop sales','Dairy / livestock','Subsidies / assistance','Wages / labour'].includes(t.category)&&!t.planned).reduce((s,t)=>s+Number(t.amount),0)],
                ].filter(([,v]) => v > 0).map(([label, val]) => (
                  <div key={label} className="cf-breakdown-row">
                    <span>{label}</span>
                    <b>{money(val)}</b>
                    <div className="cf-bar-track"><div className="cf-bar-fill" style={{ width: `${Math.min(100, val/income*100)}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : <p className="cf-empty-note">{t("No income recorded yet.", "No income recorded yet.")}</p>}
          </Card>

          <Card title={t("Expense Breakdown", "Expense Breakdown")} subtitle={t("Farm + household spending", "Farm + household spending")}>
            {expenses > 0 ? (
              <div className="cf-breakdown">
                {[
                  [t('Farm inputs', 'Farm inputs'),        transactions.filter(t=>t.type==='expense'&&t.finance_type==='farm'&&!t.planned).reduce((s,t)=>s+Number(t.amount),0)],
                  [t('Farm labour', 'Farm labour'),        transactions.filter(t=>t.type==='expense'&&t.category==='Labour / machinery'&&!t.planned).reduce((s,t)=>s+Number(t.amount),0)],
                  [t('Household', 'Household'),          transactions.filter(t=>t.type==='expense'&&t.finance_type==='household'&&!t.planned).reduce((s,t)=>s+Number(t.amount),0)],
                  [t('Loan repayments', 'Loan repayments'),    transactions.filter(t=>t.type==='loan_out'&&!t.planned).reduce((s,t)=>s+Number(t.amount),0)],
                ].filter(([,v]) => v > 0).map(([label, val]) => (
                  <div key={label} className="cf-breakdown-row">
                    <span>{label}</span>
                    <b>{money(val)}</b>
                    <div className="cf-bar-track"><div className="cf-bar-fill cf-bar-expense" style={{ width: `${Math.min(100, val/(expenses||1)*100)}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : <p className="cf-empty-note">{t("No expenses recorded yet.", "No expenses recorded yet.")}</p>}
          </Card>
        </div>
      )}

      {/* Upcoming repayments */}
      {upcoming.length > 0 && (
        <Card title={t("Repayments Due — Next 30 Days", "Repayments Due — Next 30 Days")} subtitle={t("Based on your loan schedule", "Based on your loan schedule")}>
          <div className="cf-upcoming">
            {upcoming.map(l => (
              <div key={l.id} className="cf-upcoming-row">
                <div>
                  <b>{l.lender || 'Loan'}</b>
                  {l.ref && <small> · {l.ref}</small>}
                </div>
                <div className="cf-upcoming-right">
                  <b>{money(l.repayment_amount)}</b>
                  <small>{new Date(l.due_date).toLocaleDateString('en-IN')}</small>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Savings summary */}
      {savings.length > 0 && (
        <Card title={t("Savings Goals", "Savings Goals")} subtitle={`${savingsPct}% ${t("funded across", "funded across")} ${savings.length} ${t("goal", "goal")}${savings.length !== 1 ? 's' : ''}`}>
          {savings.map(g => (
            <div key={g.id} className="cf-savings-row">
              <div className="cf-savings-label">
                <b>{t(g.name, g.name)}</b>
                <span>{money(g.saved)} {t("of", "of")} {money(g.target)}</span>
              </div>
              <Progress label="" value={Math.min(100, Math.round(Number(g.saved||0) / Number(g.target||1) * 100))} color="green" />
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
