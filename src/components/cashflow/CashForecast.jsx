import { useLanguage } from '../../context/LanguageContext'
/**
 * CashForecast — 6-month forward cash flow projection.
 * Built from: current balance + planned transactions + loan schedules + expected crop income.
 * Clearly labelled as a forecast — not a guarantee.
 */
import { useMemo } from 'react'
import {
  Area, Bar, CartesianGrid, ComposedChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react'
import { Card, Notice } from '../../components'
import { buildForecast, computeSummary } from './storage'

const money = v => `₹${Number(v || 0).toLocaleString('en-IN')}`
const axis  = { fontSize: 11, fill: '#738176' }
const tt    = { border: '1px solid #e0e8e0', borderRadius: 8, fontSize: 12 }

export default function CashForecast({ transactions, loans, budgets, settings }) {
  const { t } = useLanguage()
  const summary  = useMemo(() => computeSummary(transactions, settings), [transactions, settings])
  const forecast = useMemo(() => buildForecast(transactions, loans, budgets, settings), [transactions, loans, budgets, settings])

  const hasPlanned = transactions.some(t => t.planned)
  const hasLoans   = loans.some(l => l.due_date && l.repayment_amount)
  const hasBudgets = budgets.some(b => b.harvest_date && b.expected_yield_t && b.expected_price_per_kg)

  const shortfalls = forecast.filter(m => m.balance < 0)
  const lowest     = forecast.length ? Math.min(...forecast.map(m => m.balance)) : 0

  // Assumptions used
  const assumptions = [
    `Opening forecast balance: ${money(summary.balance)} (from recorded actual transactions)`,
    hasPlanned  ? 'Planned transactions included'  : 'No planned transactions — add planned income/expenses in Transactions tab',
    hasLoans    ? 'Loan repayment schedules included' : 'No loan schedules — add in Loans & Savings tab',
    hasBudgets  ? 'Expected crop income from Season Budgets included' : 'No season budget with harvest date and price — add in Season Budget tab',
  ]

  return (
    <div className="page">
      <Notice>
        This forecast is an estimate based on your recorded transactions, planned entries, and
        loan schedules. It is not a financial guarantee. Edit your planned transactions to
        update the projection.
      </Notice>

      {shortfalls.length > 0 && (
        <div className="cf-shortage-alert">
          <TrendingDown size={18}/>
          <div>
            <b>Possible cash shortage in {shortfalls.map(m => m.label).join(', ')}</b>
            <p>
              Projected balance falls below zero. Review upcoming expenses and income timing.
              Plan for working capital needs before these months arrive.
            </p>
            <small>Lowest projected balance: {money(lowest)}</small>
          </div>
        </div>
      )}

      {/* Forecast chart */}
      <Card title="6-Month Cash Flow Forecast" subtitle="Projected income, expenses, and closing balance">
        {forecast.length === 0 ? (
          <div className="cf-empty">
            <p>Add planned transactions, loan schedules, or season budgets to see a forecast.</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={forecast} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#edf1ed" vertical={false}/>
                <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v => `₹${Math.round(v/1000)}k`} tick={axis} axisLine={false} tickLine={false}/>
                <Tooltip formatter={v => money(v)} contentStyle={tt}/>
                <Area dataKey="balance"  name="Projected balance" fill="#438b6218" stroke="#438b62" strokeWidth={2}/>
                <Bar  dataKey="income"   name="Expected income"   fill="#78a67a" maxBarSize={28}/>
                <Bar  dataKey="expenses" name="Planned expenses"  fill="#d6a05d" maxBarSize={28}/>
                <Bar  dataKey="loan_out" name="Loan repayments"   fill="#c09060" maxBarSize={28}/>
                <ReferenceLine y={0} stroke="#cd8367" strokeDasharray="4 4"/>
              </ComposedChart>
            </ResponsiveContainer>
            <p className="cf-chart-note">Green = income · Orange = expenses · Brown = repayments · Line = projected balance</p>
          </>
        )}
      </Card>

      {/* Month-by-month table */}
      {forecast.length > 0 && (
        <Card title="Month-by-Month Projection" subtitle="All values are estimates">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Expected income</th>
                  <th>Planned expenses</th>
                  <th>Loan repayments</th>
                  <th>Net</th>
                  <th>Projected balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {forecast.map(row => (
                  <tr key={row.key}>
                    <td><b>{row.label}</b></td>
                    <td style={{ color: '#3d8050' }}>{row.income > 0 ? money(row.income) : '—'}</td>
                    <td style={{ color: '#8b5500' }}>{row.expenses > 0 ? money(row.expenses) : '—'}</td>
                    <td style={{ color: '#8b4513' }}>{row.loan_out > 0 ? money(row.loan_out) : '—'}</td>
                    <td style={{ color: row.net >= 0 ? '#3d8050' : '#c0392b', fontWeight: 700 }}>
                      {row.net >= 0 ? '+' : ''}{money(row.net)}
                    </td>
                    <td style={{ fontWeight: 700, color: row.balance < 0 ? '#c0392b' : '#2d3d32' }}>
                      {money(row.balance)}
                    </td>
                    <td>
                      {row.balance < 0
                        ? <span className="cf-status-chip warn"><AlertTriangle size={11}/> Shortfall</span>
                        : row.balance < 5000
                          ? <span className="cf-status-chip caution">Low</span>
                          : <span className="cf-status-chip ok"><CheckCircle2 size={11}/> OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Assumptions */}
      <Card title="Forecast Assumptions" subtitle="Edit planned transactions to update this projection">
        <ul className="cf-assumptions">
          {assumptions.map((a, i) => (
            <li key={i} className={a.startsWith('No ') ? 'cf-assumption-missing' : ''}>
              {a.startsWith('No ') ? <AlertTriangle size={12}/> : <CheckCircle2 size={12}/>}
              <span>{a}</span>
            </li>
          ))}
        </ul>
        <div className="inline-feedback" style={{ marginTop: 12 }}>
          <AlertTriangle size={14}/>
          <span>
            Expected income is not counted as money received. The forecast only moves money
            into the projected balance when the payment date arrives in a planned transaction
            or a budget harvest date.
          </span>
        </div>
      </Card>
    </div>
  )
}
