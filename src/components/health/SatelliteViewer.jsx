import { AlertTriangle, Loader, RefreshCw, Satellite } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

export default function SatelliteViewer({ data, loading, error, lat, lng }) {
  const { t } = useLanguage()

  if (loading) return <LayerLoading label={t('Retrieving latest Sentinel-2 true-colour image…')} />
  if (error)   return <LayerError message={t(error, error)} />
  if (!data)   return <LayerEmpty label={t('Satellite image will appear here after field confirmation.')} />

  if (!data.available) {
    return (
      <LayerUnavailable
        code={data.error_code}
        message={t(data.message, data.message)}
        setupUrl={data.setup_url}
      />
    )
  }

  return (
    <div className="ch2-sat-view">
      <div className="ch2-sat-image-wrap">
        <img
          src={`data:image/png;base64,${data.image_b64}`}
          alt={`Sentinel-2 true-colour satellite image of field at ${lat?.toFixed(4)}, ${lng?.toFixed(4)}`}
          className="ch2-sat-img"
        />
        <div className="ch2-sat-overlay-label">{t('TRUE COLOUR · SENTINEL-2')}</div>
      </div>

      <div className="ch2-sat-meta">
        <MetaRow label={t('Observation window')} value={`${data.date_from} → ${data.date_to}`} />
        <MetaRow label={t('Spatial resolution')} value={`${data.resolution_m} m`} />
        <MetaRow label={t('Collection')} value={t(data.collection, data.collection)} />
        <MetaRow label={t('Source')} value={t(data.source, data.source)} />
      </div>

      <div className="ch2-sat-note">
        <AlertTriangle size={13} />
        <span>{t(data.note, data.note)}</span>
      </div>

      <p className="ch2-attr">{t(data.attribution, data.attribution)}</p>
    </div>
  )
}

export function LayerLoading({ label }) {
  const { t } = useLanguage()
  return (
    <div className="ch2-layer-state">
      <span className="ch2-layer-spinner"><Loader size={28} className="ch2-spin" /></span>
      <p>{label || t('Loading satellite data…')}</p>
    </div>
  )
}

export function LayerError({ message }) {
  const { t } = useLanguage()
  return (
    <div className="ch2-layer-state ch2-layer-error">
      <AlertTriangle size={26} />
      <p>{message || t('An error occurred retrieving this layer.')}</p>
    </div>
  )
}

export function LayerEmpty({ label }) {
  const { t } = useLanguage()
  return (
    <div className="ch2-layer-state ch2-layer-empty">
      <Satellite size={28} />
      <p>{label || t('No data yet.')}</p>
    </div>
  )
}

export function LayerUnavailable({ code, message, setupUrl }) {
  const { t } = useLanguage()
  return (
    <div className="ch2-layer-unavail">
      <div className="ch2-layer-unavail-icon">🛰️</div>
      <div>
        <b>
          {code === 'CREDENTIALS_REQUIRED'
            ? t('Copernicus credentials required')
            : code === 'NO_IMAGERY'
            ? t('No suitable image available')
            : t('Satellite data unavailable')}
        </b>
        <p>{t(message, message)}</p>
        {setupUrl && (
          <a href={setupUrl} target="_blank" rel="noreferrer" className="ch2-setup-link">
            {t('Set up Copernicus account ↗')}
          </a>
        )}
      </div>
    </div>
  )
}

function MetaRow({ label, value }) {
  return (
    <div className="ch2-meta-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}
