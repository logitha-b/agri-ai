import { useLanguage } from '../../context/LanguageContext'
import { ShieldCheck, TrendingUp } from 'lucide-react'

const money = v => v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`

export default function ProfitSummary({ result }) {
  const { t } = useLanguage()
  if (!result?.available) return null

  const rec = result.recommendation || {}
  const best = result.markets?.[0]
  const modal = best?.profit?.modal

  return (
    <div className="mp-summary-card">
      <div className="mp-summary-head">
        <span className="mp-summary-icon"><TrendingUp size={20} /></span>
        <div>
          <span className="mp-eyebrow">{t('MARKET COMPARISON SUMMARY', 'MARKET COMPARISON SUMMARY')}</span>
          <h3>{t(result.commodity, result.commodity)} · {result.quantity_quintals} {t('quintals', 'quintals')} ({result.quantity_kg?.toLocaleString('en-IN')} kg)</h3>
        </div>
      </div>

      {/* Key numbers */}
      {modal && (
        <div className="mp-summary-stats">
          <div className="mp-summary-stat">
            <small>{t('Best est. gross revenue', 'Best est. gross revenue')}</small>
            <b>{money(modal.gross_revenue_inr)}</b>
            <span>@ ₹{best.modal_price_rs_per_quintal}/qtl {t('modal', 'modal')}</span>
          </div>
          <div className="mp-summary-stat">
            <small>{t('Est. selling costs', 'Est. selling costs')}</small>
            <b>{money(modal.total_selling_costs_inr)}</b>
            <span>{t('transport + commission + handling', 'transport + commission + handling')}</span>
          </div>
          <div className="mp-summary-stat mp-summary-net">
            <small>{t('Est. net proceeds', 'Est. net proceeds')}</small>
            <b>{money(modal.net_proceeds_inr)}</b>
            <span>{t('after selling costs', 'after selling costs')}</span>
          </div>
          {modal.net_profit_inr != null && (
            <div className={`mp-summary-stat ${modal.net_profit_inr >= 0 ? 'mp-summary-profit' : 'mp-summary-loss'}`}>
              <small>{t('Est. net profit', 'Est. net profit')}</small>
              <b>{money(modal.net_profit_inr)}</b>
              <span>{t('after cultivation cost', 'after cultivation cost')}</span>
            </div>
          )}
        </div>
      )}

      {/* Recommendation text */}
      {rec.summary && (
        <div className="mp-rec-text">
          <span className="mp-eyebrow">{t('RECOMMENDATION', 'RECOMMENDATION')}</span>
          <p>{t(rec.summary, rec.summary)}</p>
        </div>
      )}

      {/* Key comparisons */}
      <div className="mp-rec-grid">
        {rec.best_net_proceeds && (
          <div><small>{t('Best net proceeds', 'Best net proceeds')}</small><b>{t(rec.best_net_proceeds, rec.best_net_proceeds)}</b></div>
        )}
        {rec.nearest_market && (
          <div><small>{t('Nearest market', 'Nearest market')}</small><b>{t(rec.nearest_market, rec.nearest_market)}</b></div>
        )}
        {rec.highest_price_market && rec.highest_price_market !== rec.best_net_proceeds && (
          <div><small>{t('Highest price', 'Highest price')}</small><b>{t(rec.highest_price_market, rec.highest_price_market)}</b></div>
        )}
      </div>

      {/* Markets found */}
      <div className="mp-summary-meta">
        <span>{result.total_markets_found} {t('markets found', 'markets found')}</span>
        <span>{t('Source:', 'Source:')} {t(result.source, result.source)} · {result.source_date}</span>
        <span>{t('Sorted by:', 'Sorted by:')} {t(result.sort_by?.replace('_', ' '), result.sort_by?.replace('_', ' '))}</span>
      </div>

      {/* Uncertainty */}
      {rec.key_uncertainty && (
        <div className="mp-uncertainty">
          <ShieldCheck size={13} />
          <span>{t(rec.key_uncertainty, rec.key_uncertainty)}</span>
        </div>
      )}

      <p className="mp-disclaimer">{t(result.disclaimer, result.disclaimer)}</p>
    </div>
  )
}
