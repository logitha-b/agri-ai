import { AlertTriangle } from 'lucide-react'
import { LayerEmpty, LayerError, LayerLoading, LayerUnavailable } from './SatelliteViewer'
import { useLanguage } from '../../context/LanguageContext'

export default function FloodLayer({ data, loading, error }) {
  const { t } = useLanguage()

  if (loading) return <LayerLoading label={t('Retrieving Sentinel-1 SAR radar backscatter for flood / inundation indicators…')} />
  if (error)   return <LayerError message={t(error, error)} />
  if (!data)   return <LayerEmpty label={t('Flood risk layer will appear after field confirmation.')} />
  if (!data.available) return <LayerUnavailable code={data.error_code} message={t(data.message, data.message)} setupUrl={data.setup_url} />

  return (
    <div className="ch2-sat-view">
      <div className="ch2-sat-image-wrap">
        <img
          src={`data:image/png;base64,${data.image_b64}`}
          alt={t('Sentinel-1 SAR flood indicator image')}
          className="ch2-sat-img"
        />
        <div className="ch2-sat-overlay-label">{t('SENTINEL-1 SAR · VV BACKSCATTER')}</div>
      </div>

      {/* Legend */}
      <div className="ch2-ndvi-legend">
        {data.colour_legend?.map(item => (
          <div key={item.colour} className="ch2-legend-row">
            <span className="ch2-legend-swatch" style={{ background: item.colour }} />
            <span className="ch2-legend-meaning">{t(item.meaning, item.meaning)}</span>
          </div>
        ))}
      </div>

      <div className="ch2-sat-meta">
        <div className="ch2-meta-row"><span>{t('Observation window')}</span><b>{data.date_from} → {data.date_to}</b></div>
        <div className="ch2-meta-row"><span>{t('Spatial resolution')}</span><b>{data.resolution_m} m</b></div>
        <div className="ch2-meta-row"><span>{t('Collection')}</span><b>{t(data.collection, data.collection)}</b></div>
        <div className="ch2-meta-row"><span>{t('Source')}</span><b>{t(data.source, data.source)}</b></div>
      </div>

      <div className="ch2-flood-warning">
        <AlertTriangle size={15} />
        <div>
          <b>{t('This is NOT a confirmed flood map')}</b>
          <p>{t(data.limitations, data.limitations)}</p>
        </div>
      </div>

      <div className="ch2-sat-note"><AlertTriangle size={13} /><span>{t(data.note, data.note)}</span></div>
      <p className="ch2-attr">{t(data.attribution, data.attribution)}</p>
    </div>
  )
}
