import { useLanguage } from '../../context/LanguageContext'
// Compact side-by-side comparison table

const money = v => v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`
const pct   = v => v == null ? '—' : `${Math.round(v * 100)}/100`
const fmt   = (v, u) => v == null ? '—' : `${v} ${u}`

const RISK_COLORS = {
  ELEVATED_RISK:     { bg: '#fee2e2', text: '#991b1b', label: 'Elevated' },
  OBSERVED_FLOODING: { bg: '#fecaca', text: '#7f1d1d', label: 'Flooding' },
  NO_ELEVATED_RISK:  { bg: '#dcfce7', text: '#166534', label: 'Low' },
  INSUFFICIENT_DATA: { bg: '#f1f5f9', text: '#64748b', label: '—' },
}

export default function CompareTable({ candidates }) {
  const { t } = useLanguage()
  if (!candidates || candidates.length === 0) return null

  return (
    <div className="rc-compare-wrap">
      <div className="rc-compare-table-label">{t('Side-by-side comparison · all values are estimates', 'Side-by-side comparison · all values are estimates')}</div>
      <div className="rc-compare-scroll">
        <table className="rc-compare-table">
          <thead>
            <tr>
              <th>{t('Crop', 'Crop')}</th>
              <th>{t('Overall score', 'Overall score')}</th>
              <th>{t('Agronomic fit', 'Agronomic fit')}</th>
              <th>{t('Flood risk', 'Flood risk')}</th>
              <th>{t('Hist. yield (t/ha)', 'Hist. yield (t/ha)')}</th>
              <th>{t('Market price (₹/qtl)', 'Market price (₹/qtl)')}</th>
              <th>{t('Est. net return', 'Est. net return')}</th>
              <th>{t('Budget', 'Budget')}</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, i) => {
              const fl = RISK_COLORS[c.flood?.flood_risk_level] || RISK_COLORS.INSUFFICIENT_DATA
              const budgetOk = c.economics?.budget_ok
              return (
                <tr key={c.crop} className={i === 0 ? 'rc-compare-top' : ''}>
                  <td>
                    <div className="rc-compare-crop">
                      <span>{c.crop === 'Paddy' ? '🌾' : c.crop === 'Groundnut' ? '🥜' : c.crop === 'Maize' ? '🌽' : c.crop === 'Tomato' ? '🍅' : '🌿'}</span>
                      <b>{t(c.crop, c.crop)}</b>
                      {i === 0 && <span className="rc-compare-best">{t('Best', 'Best')}</span>}
                    </div>
                  </td>
                  <td className="rc-compare-score">{Math.round((c.final_score || 0) * 100)}</td>
                  <td>{pct(c.scores?.agronomic)}</td>
                  <td>
                    <span className="rc-compare-flood" style={{ background: fl.bg, color: fl.text }}>
                      {fl.label === '—' ? '—' : t(fl.label, fl.label)}
                    </span>
                  </td>
                  <td>{fmt(c.yield?.mean_yield_t_ha, '')}</td>
                  <td>{c.market?.modal_price_rs_per_quintal != null ? `₹${c.market.modal_price_rs_per_quintal}` : '—'}</td>
                  <td className={c.economics?.estimated_net_return_inr > 0 ? 'rc-compare-pos' : 'rc-compare-neg'}>
                    {money(c.economics?.estimated_net_return_inr)}
                  </td>
                  <td>
                    {budgetOk == null ? '—' : (
                      <span className={budgetOk ? 'rc-compare-ok' : 'rc-compare-warn'}>
                        {budgetOk ? `✓ ${t('OK', 'OK')}` : `⚠ ${t('Exceeds', 'Exceeds')}`}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
