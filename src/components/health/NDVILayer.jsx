import { AlertTriangle } from 'lucide-react'
import { LayerEmpty, LayerError, LayerLoading, LayerUnavailable } from './SatelliteViewer'
import { useLanguage } from '../../context/LanguageContext'

export default function NDVILayer({ data, loading, error }) {
  const { t } = useLanguage()

  if (loading) return <LayerLoading label={t('Calculating NDVI from Sentinel-2 Band 8 (NIR) and Band 4 (Red)…')} />
  if (error)   return <LayerError message={t(error, error)} />
  if (!data)   return <LayerEmpty label={t('NDVI layer will appear after field confirmation.')} />
  if (!data.available) return <LayerUnavailable code={data.error_code} message={t(data.message, data.message)} setupUrl={data.setup_url} />

  return (
    <div className="ch2-sat-view">
      <div className="ch2-sat-image-wrap">
        <img
          src={`data:image/png;base64,${data.image_b64}`}
          alt={t('NDVI colour-mapped satellite image')}
          className="ch2-sat-img"
        />
        <div className="ch2-sat-overlay-label">NDVI · (B08−B04)/(B08+B04)</div>
      </div>

      {/* Colour legend */}
      <div className="ch2-ndvi-legend">
        {data.colour_legend?.map(item => (
          <div key={item.range} className="ch2-legend-row">
            <span className="ch2-legend-swatch" style={{
              background: item.colour === 'transparent' ? 'repeating-linear-gradient(45deg,#e0e0e0,#e0e0e0 3px,#fff 3px,#fff 6px)' : item.colour
            }} />
            <span className="ch2-legend-range">{item.range}</span>
            <span className="ch2-legend-meaning">{t(item.meaning, item.meaning)}</span>
          </div>
        ))}
      </div>

      <div className="ch2-sat-meta">
        <div className="ch2-meta-row"><span>{t('Formula')}</span><b>{data.formula}</b></div>
        <div className="ch2-meta-row"><span>{t('NIR band')}</span><b>{data.bands_used?.NIR}</b></div>
        <div className="ch2-meta-row"><span>{t('Red band')}</span><b>{data.bands_used?.Red}</b></div>
        <div className="ch2-meta-row"><span>{t('Observation window')}</span><b>{data.date_from} → {data.date_to}</b></div>
        <div className="ch2-meta-row"><span>{t('Spatial resolution')}</span><b>{data.resolution_m} m</b></div>
      </div>

      <div className="ch2-sat-note">
        <AlertTriangle size={13} />
        <span>{t(data.limitations, data.limitations)}</span>
      </div>
      <p className="ch2-attr">{t(data.attribution, data.attribution)}</p>
    </div>
  )
}
