import { useLanguage } from '../../context/LanguageContext'
import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, MapPin, ShieldCheck, Truck } from 'lucide-react'

const money = v => v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`
const fmt   = (v, u) => v == null ? '—' : `${v} ${u}`

const KIND = {
  estimated: { cls: 'mp-kind-est',  label: 'ESTIMATED' },
  measured:  { cls: 'mp-kind-meas', label: 'OBSERVED'  },
  historical_snapshot: { cls: 'mp-kind-hist', label: 'HISTORICAL' },
}
function KBadge({ kind, t }) {
  const { cls, label } = KIND[kind] || KIND.estimated
  return <span className={`mp-kind-badge ${cls}`}>{t ? t(label, label) : label}</span>
}

function ScenarioRow({ label, scenario, highlight, t }) {
  if (!scenario) return null
  return (
    <div className={`mp-scenario-row ${highlight ? 'mp-scenario-highlight' : ''}`}>
      <span>{t ? t(label, label) : label} {t ? t('price scenario', 'price scenario') : 'price scenario'}</span>
      <div>
        <span>₹{scenario.price_per_quintal}/qtl</span>
        <span>{t ? t('Gross:', 'Gross:') : 'Gross:'} {money(scenario.gross_revenue_inr)}</span>
        <span>{t ? t('Transport:', 'Transport:') : 'Transport:'} {money(scenario.transport_cost_inr)}</span>
        <b>{t ? t('Net proceeds:', 'Net proceeds:') : 'Net proceeds:'} {money(scenario.net_proceeds_inr)}</b>
        {scenario.net_profit_inr != null && (
          <b className={scenario.net_profit_inr >= 0 ? 'mp-profit-pos' : 'mp-profit-neg'}>
            {t ? t('Net profit:', 'Net profit:') : 'Net profit:'} {money(scenario.net_profit_inr)}
          </b>
        )}
      </div>
    </div>
  )
}

export default function MarketCard({ market, rank, farmerState }) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(rank === 1)

  const p = market.profit || {}
  const transport = market.transport || {}
  const modal = p.modal || {}

  const isHighestNet = rank === 1

  return (
    <div className={`mp-market-card ${isHighestNet ? 'mp-card-top' : ''}`}>
      {/* ── Header ── */}
      <div className="mp-card-head">
        <div className="mp-card-title">
          <span className="mp-rank">#{rank}</span>
          <div>
            <b>{market.market}</b>
            <small>{market.district}, {market.state}</small>
          </div>
          {market.geo_approximate && (
            <span className="mp-approx-badge">~ {t('Approx location', 'Approx location')}</span>
          )}
        </div>

        <div className="mp-card-stats">
          {market.modal_price_rs_per_quintal != null && (
            <div className="mp-stat">
              <small>{t('Modal price', 'Modal price')}</small>
              <b>₹{market.modal_price_rs_per_quintal}/qtl</b>
            </div>
          )}
          {market.distance_km != null && (
            <div className="mp-stat">
              <small>{t('Distance', 'Distance')}</small>
              <b>{market.distance_km} km</b>
              <span>{t('straight-line', 'straight-line')}</span>
            </div>
          )}
          {modal.net_proceeds_inr != null && (
            <div className={`mp-stat mp-stat-net ${isHighestNet ? 'mp-stat-best' : ''}`}>
              <small>{t('Est. net proceeds', 'Est. net proceeds')}</small>
              <b>{money(modal.net_proceeds_inr)}</b>
            </div>
          )}
        </div>

        <div className="mp-card-actions">
          {market.map_url && (
            <a
              href={market.map_url}
              target="_blank"
              rel="noreferrer"
              className="mp-map-link"
              title={market.geo_approximate ? t('Approximate location — coordinates not verified', 'Approximate location — coordinates not verified') : t('View on Google Maps', 'View on Google Maps')}
            >
              <MapPin size={14} />
              {market.geo_approximate ? t('Approx. location ↗', 'Approx. location ↗') : t('View on map ↗', 'View on map ↗')}
            </a>
          )}
          <button className="mp-expand-btn" onClick={() => setExpanded(v => !v)}>
            {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          </button>
        </div>
      </div>

      {/* ── Price date + source ── */}
      <div className="mp-card-meta">
        <span>{t('Price date:', 'Price date:')} {market.latest_date || '—'}</span>
        <span>{t('Varieties:', 'Varieties:')} {market.varieties?.join(', ') || '—'}</span>
        <span>{t('Grade:', 'Grade:')} {market.grades?.join(', ') || '—'}</span>
        <KBadge kind="historical_snapshot" t={t} />
      </div>

      {/* ── Expandable detail ── */}
      {expanded && (
        <div className="mp-card-detail">
          {/* Prices */}
          <div className="mp-detail-section">
            <div className="mp-detail-label">{t('PRICE RANGE (₹/quintal)', 'PRICE RANGE (₹/quintal)')}</div>
            <div className="mp-price-row">
              <div><small>{t('Minimum', 'Minimum')}</small><b>{fmt(market.min_price_rs_per_quintal, '₹/qtl')}</b></div>
              <div className="mp-price-modal"><small>{t('Modal (median)', 'Modal (median)')}</small><b>{fmt(market.modal_price_rs_per_quintal, '₹/qtl')}</b></div>
              <div><small>{t('Maximum', 'Maximum')}</small><b>{fmt(market.max_price_rs_per_quintal, '₹/qtl')}</b></div>
            </div>
          </div>

          {/* Transport */}
          <div className="mp-detail-section">
            <div className="mp-detail-label"><Truck size={12} /> {t('TRANSPORT ESTIMATE', 'TRANSPORT ESTIMATE')}</div>
            <div className="mp-transport-grid">
              <div><small>{t('Vehicle', 'Vehicle')}</small><b>{t(transport.vehicle || '—', transport.vehicle || '—')}</b></div>
              <div><small>{t('Distance', 'Distance')}</small><b>{market.distance_km != null ? `${market.distance_km} km` : '—'}<span className="mp-dist-type"> {t('straight-line', 'straight-line')}</span></b></div>
              <div><small>{t('Transport cost', 'Transport cost')}</small><b>{money(transport.cost_inr)}</b></div>
              <div><small>{t('Rate basis', 'Rate basis')}</small><b>{t(transport.rate_basis || '—', transport.rate_basis || '—')}</b></div>
            </div>
            {transport.note && <p className="mp-note">{t(transport.note, transport.note)}</p>}
          </div>

          {/* Profit scenarios */}
          <div className="mp-detail-section">
            <div className="mp-detail-label">{t('FINANCIAL ESTIMATES', 'FINANCIAL ESTIMATES')}</div>
            <ScenarioRow label="Modal"   scenario={p.modal}   highlight t={t} />
            <ScenarioRow label="Low"     scenario={p.low}     t={t} />
            <ScenarioRow label="High"    scenario={p.high}    t={t} />
            {p.modal && (
              <div className="mp-cost-breakdown">
                <div className="mp-detail-label" style={{marginTop:8}}>{t('COST BREAKDOWN (modal scenario)', 'COST BREAKDOWN (modal scenario)')}</div>
                {[
                  [t('Transport', 'Transport'),        money(p.modal.transport_cost_inr)],
                  [t('Mandi commission', 'Mandi commission'), `${money(p.modal.commission_inr)} (${p.modal.commission_pct}%)`],
                  [t('Loading/unloading', 'Loading/unloading'),money(p.modal.loading_unloading_inr)],
                  p.modal.packaging_cost_inr ? [t('Packaging', 'Packaging'), money(p.modal.packaging_cost_inr)] : null,
                  p.modal.other_costs_inr    ? [t('Other', 'Other'),     money(p.modal.other_costs_inr)]    : null,
                  [t('Total selling costs', 'Total selling costs'), money(p.modal.total_selling_costs_inr)],
                ].filter(Boolean).map(([label, val]) => (
                  <div key={label} className="mp-breakdown-row">
                    <span>{label}</span><b>{val}</b>
                  </div>
                ))}
                {p.modal.cultivation_cost_inr != null && (
                  <div className="mp-breakdown-row mp-cult-row">
                    <span>{t('Cultivation cost', 'Cultivation cost')}</span><b>{money(p.modal.cultivation_cost_inr)}</b>
                  </div>
                )}
              </div>
            )}
            <p className="mp-note">{t(p.disclaimer, p.disclaimer)}</p>
          </div>

          {/* Map link */}
          <div className="mp-detail-section mp-map-section">
            {market.map_url ? (
              <a href={market.map_url} target="_blank" rel="noreferrer" className="mp-map-full-link">
                <ExternalLink size={14} />
                {market.geo_approximate
                  ? `${t('Open approximate location for')} ${market.market}, ${market.district} ${t('on Google Maps')}`
                  : `${t('Open')} ${market.market} ${t('on Google Maps')}`}
              </a>
            ) : (
              <span className="mp-note">{t('Map link unavailable — market could not be geocoded.')}</span>
            )}
            {market.geo_approximate && (
              <p className="mp-note">⚠ {t('Location is approximate (district-level). Verify the exact mandi address locally before travelling.')}</p>
            )}
          </div>

          <div className="mp-card-disclaimer">
            <ShieldCheck size={12} />
            <span>{t('Prices are from AGMARKNET snapshot 2026-10-13. Not a guaranteed sale price.')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
