// src/components/water/FeaturePanel.jsx
import { ShieldCheck, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

function Row({ label, value }) {
  const { t } = useLanguage()
  if (value == null || value === '') return null
  return (
    <div className="wr-panel-row">
      <span>{t(label, label)}</span>
      <b>{t(String(value), String(value))}</b>
    </div>
  )
}

export function DamPanel({ dam, onClose }) {
  const { t } = useLanguage()
  if (!dam) return null
  return (
    <div className="wr-feature-panel">
      <div className="wr-panel-head">
        <div>
          <span className="wr-panel-badge wr-badge-dam">{t("DAM · NDSA", "DAM · NDSA")}</span>
          <h3>{t(dam.name, dam.name)}</h3>
        </div>
        <button className="wr-panel-close" onClick={onClose} aria-label={t("Close", "Close")}><X size={16}/></button>
      </div>

      <div className="wr-panel-grid">
        <Row label="State"         value={dam.state} />
        <Row label="District"      value={dam.district} />
        <Row label="River"         value={dam.river} />
        <Row label="Basin"         value={dam.basin} />
        <Row label="Purpose"       value={dam.purpose} />
        <Row label="Dam type"      value={dam.dam_type} />
        <Row label="Completed"     value={dam.completion_year} />
        <Row label="Height (m)"    value={dam.height_m} />
        <Row label="Length (m)"    value={dam.dam_length_m} />
        <Row label="FRL (m)"       value={dam.full_reservoir_level_m} />
        <Row label="Max WL (m)"    value={dam.max_water_level_m} />
        <Row label="Gross storage" value={dam.gross_storage_mcm != null ? `${dam.gross_storage_mcm} MCM` : null} />
        <Row label="Coordinates"   value={`${dam.lat}° N, ${dam.lng}° E`} />
        <Row label="In-charge"     value={dam.incharge} />
      </div>

      <div className="wr-panel-disclaimer">
        <ShieldCheck size={13}/>
        <span>
          {t("Static geographic inventory — no live water level, storage, inflow, outflow, or gate-operation data. Source:", "Static geographic inventory — no live water level, storage, inflow, outflow, or gate-operation data. Source:")} {dam.source}
        </span>
      </div>
    </div>
  )
}

export function ReservoirPanel({ reservoir, onClose }) {
  const { t } = useLanguage()
  if (!reservoir) return null
  return (
    <div className="wr-feature-panel">
      <div className="wr-panel-head">
        <div>
          <span className="wr-panel-badge wr-badge-res">{t("RESERVOIR · CWC", "RESERVOIR · CWC")}</span>
          <h3>{t(reservoir.res_name, reservoir.res_name)}</h3>
        </div>
        <button className="wr-panel-close" onClick={onClose} aria-label={t("Close", "Close")}><X size={16}/></button>
      </div>

      <div className="wr-panel-grid">
        <Row label="Basin"               value={reservoir.basin} />
        <Row label="Sub-basin"           value={reservoir.sub_basin} />
        <Row label="River"               value={reservoir.river} />
        <Row label="States benefiting"   value={reservoir.states_benefited} />
        <Row label="Full Res Level (m)"  value={reservoir.full_res_level_m} />
        <Row label="Current WL (m)"      value={reservoir.current_water_level_m} />
        <Row label="Live capacity (BCM)" value={reservoir.live_capacity_bcm} />
        <Row label="Current storage (BCM)" value={reservoir.current_storage_bcm} />
        <Row label="Storage (% of live)" value={reservoir.current_storage_pct != null ? `${reservoir.current_storage_pct}%` : null} />
        <Row label="Normal storage (BCM)" value={reservoir.normal_storage_bcm} />
        <Row label="Last year storage"   value={reservoir.last_year_storage_bcm != null ? `${reservoir.last_year_storage_bcm} BCM` : null} />
        <Row label="Report date"         value={reservoir.report_date} />
        <Row label="Agency"              value={reservoir.agency} />
      </div>

      <div className="wr-panel-disclaimer">
        <ShieldCheck size={13}/>
        <span>
          {t("Source: Central Water Commission (CWC) bulletin · National Water Data Portal.", "Source: Central Water Commission (CWC) bulletin · National Water Data Portal.")}
        </span>
      </div>
    </div>
  )
}
