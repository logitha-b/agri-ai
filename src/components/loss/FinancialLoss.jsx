import { useLanguage } from '../../context/LanguageContext'
/**
 * FinancialLoss — Step 3: Financial impact estimation using AGMARKNET market prices.
 * Clearly distinguishes estimated economic loss from insured loss.
 */
import { AlertTriangle, IndianRupee, ShoppingCart, TrendingDown, Wrench } from 'lucide-react'
import { Card, Notice } from '../../components'

function Rs({ value }) {
  if (value == null) return <span className="loss-unavail-inline">—</span>
  return <span>₹{Number(value).toLocaleString('en-IN')}</span>
}

export default function FinancialLoss({ assessment }) {
  const { t } = useLanguage()
  if (!assessment) return null
  const { financial_loss, production_loss, incident } = assessment
  const fin = financial_loss

  if (!fin?.available) {
    return (
      <Card title="Financial Loss Estimate" subtitle="Market price data required.">
        <div className="inline-feedback">
          <AlertTriangle size={15} />
          <span>{fin?.reason || 'Financial loss cannot be estimated — market price data unavailable for this crop.'}</span>
        </div>
      </Card>
    )
  }

  const lossT    = production_loss?.estimated_loss_t
  const expectT  = production_loss?.expected_production_t

  return (
    <div className="page">
      <Notice>
        Financial figures are estimates based on reference market prices and indicative recovery
        costs. They are NOT an insurance valuation. Actual sale prices, insured sums, and
        compensation may differ significantly.
      </Notice>

      {/* Key financial stats */}
      <div className="stats-grid four">
        {expectT != null && fin.expected_crop_value_rs != null && (
          <article className="stat-card">
            <div className="stat-label">Expected Crop Value<span className="stat-glyph"><IndianRupee size={16}/></span></div>
            <strong className="stat-value" style={{ fontSize: 20 }}>₹{Number(fin.expected_crop_value_rs).toLocaleString('en-IN')}</strong>
            <div className="stat-foot"><span>Before damage ({expectT} t)</span></div>
          </article>
        )}
        {lossT != null && fin.estimated_lost_value_rs != null && (
          <article className="stat-card">
            <div className="stat-label">Estimated Lost Value<span className="stat-glyph amber"><TrendingDown size={16}/></span></div>
            <strong className="stat-value" style={{ fontSize: 20 }}>₹{Number(fin.estimated_lost_value_rs).toLocaleString('en-IN')}</strong>
            <div className="stat-foot"><b className="down">{lossT} tonnes lost</b></div>
          </article>
        )}
        <article className="stat-card">
          <div className="stat-label">Recovery Costs (est.)<span className="stat-glyph aqua"><Wrench size={16}/></span></div>
          <strong className="stat-value" style={{ fontSize: 20 }}>₹{Number(fin.estimated_recovery_cost_rs).toLocaleString('en-IN')}</strong>
          <div className="stat-foot"><span>Drainage, replanting, treatment</span></div>
        </article>
        {fin.total_economic_impact_rs != null && (
          <article className="stat-card">
            <div className="stat-label">Total Economic Impact<span className="stat-glyph amber"><ShoppingCart size={16}/></span></div>
            <strong className="stat-value" style={{ fontSize: 20 }}>₹{Number(fin.total_economic_impact_rs).toLocaleString('en-IN')}</strong>
            <div className="stat-foot"><b className="down">Loss + recovery costs</b></div>
          </article>
        )}
      </div>

      {/* Market price used */}
      <Card
        title="Market Price Used"
        subtitle={`Source: ${fin.market_price.source}`}
      >
        <div className="market-callout">
          <div>
            <span>AGMARKNET MODAL PRICE</span>
            <b>₹{fin.market_price.modal_rs_per_quintal}/qtl</b>
            <small>₹{fin.market_price.price_rs_per_kg}/kg</small>
          </div>
          <p>
            Median modal price across <b>{fin.market_price.markets_sampled} markets</b> for{' '}
            <b>{incident?.crop}</b>.<br />
            Dates observed: {fin.market_price.date_range}.<br />
            <small>{fin.market_price.note}</small>
          </p>
        </div>
      </Card>

      {/* Breakdown */}
      <Card title="Financial Breakdown" subtitle="All values are estimates. See assumptions below.">
        <div className="loss-table-simple">
          {fin.expected_crop_value_rs != null && (
            <div className="loss-row"><span>Expected gross crop value (pre-damage)</span><b><Rs value={fin.expected_crop_value_rs} /></b></div>
          )}
          {fin.estimated_lost_value_rs != null && (
            <div className="loss-row loss-row-loss"><span>Estimated value of lost production</span><b><Rs value={fin.estimated_lost_value_rs} /></b></div>
          )}
          {fin.cultivation_cost_total_rs != null && (
            <div className="loss-row">
              <span>Cultivation cost — total field ({fin.cultivation_cost_per_acre_rs?.toLocaleString('en-IN')}/acre)</span>
              <b><Rs value={fin.cultivation_cost_total_rs} /></b>
            </div>
          )}
          <div className="loss-row">
            <span>Estimated recovery costs</span>
            <b><Rs value={fin.estimated_recovery_cost_rs} /></b>
          </div>
          {fin.total_economic_impact_rs != null && (
            <div className="loss-row loss-row-total">
              <span>Total estimated economic impact</span>
              <b><Rs value={fin.total_economic_impact_rs} /></b>
            </div>
          )}
        </div>

        {/* Recovery cost breakdown */}
        {fin.recovery_cost_breakdown && Object.keys(fin.recovery_cost_breakdown).length > 0 && (
          <details className="loss-breakdown-detail" style={{ marginTop: 12 }}>
            <summary>Recovery cost breakdown</summary>
            <div className="loss-table-simple" style={{ marginTop: 8 }}>
              {Object.entries(fin.recovery_cost_breakdown).map(([k, v]) => (
                <div key={k} className="loss-row">
                  <span>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                  <b><Rs value={v} /></b>
                </div>
              ))}
            </div>
            <p className="loss-note" style={{ marginTop: 6 }}>{fin.recovery_cost_note}</p>
            {fin.cultivation_cost_source && (
              <p className="loss-source">Cultivation cost source: {fin.cultivation_cost_source}</p>
            )}
          </details>
        )}

        <div className="inline-feedback" style={{ marginTop: 14 }}>
          <AlertTriangle size={15} />
          <span>{fin.note}</span>
        </div>
      </Card>

      {/* Important distinction */}
      <Card title="Estimated Loss vs Insurance Compensation" subtitle="These are different values — please read carefully.">
        <div className="loss-comparison-table">
          <div className="loss-comparison-row">
            <div className="loss-comparison-cell loss-comparison-label">Estimated economic loss</div>
            <div className="loss-comparison-cell">
              {fin.estimated_lost_value_rs != null ? `₹${Number(fin.estimated_lost_value_rs).toLocaleString('en-IN')}` : 'See above'} — AI estimate based on reference prices
            </div>
          </div>
          <div className="loss-comparison-row">
            <div className="loss-comparison-cell loss-comparison-label">Sum insured (PMFBY)</div>
            <div className="loss-comparison-cell">
              Determined by state notification — depends on notified threshold yield and your enrolled crop/area. Check your policy document.
            </div>
          </div>
          <div className="loss-comparison-row">
            <div className="loss-comparison-cell loss-comparison-label">Insurance compensation</div>
            <div className="loss-comparison-cell">
              Calculated by the insurer after official crop-cutting experiment results. Cannot be estimated by this application.
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
