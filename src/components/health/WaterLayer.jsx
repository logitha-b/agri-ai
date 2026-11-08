import { Droplets } from 'lucide-react'
import {
  Area, AreaChart,
  Bar, CartesianGrid, ComposedChart,
  Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import { LayerEmpty, LayerError, LayerLoading } from './SatelliteViewer'
import { useLanguage } from '../../context/LanguageContext'

const axisStyle = { fontSize: 11, fill: '#718074' }
const ttStyle   = { border: '1px solid #e0e8e0', borderRadius: 8, fontSize: 12, background: '#fff' }

// Custom tooltip for the rain+temp chart
function RainTempTooltip({ active, payload, label }) {
  const { t } = useLanguage()
  if (!active || !payload?.length) return null
  const rain = payload.find(p => p.dataKey === 'rain')
  const temp = payload.find(p => p.dataKey === 'temp')
  return (
    <div style={ttStyle} className="ch2-water-tooltip">
      <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{label}</p>
      {rain && rain.value != null && <p style={{ margin: 0, color: '#5c91a6' }}>{t('Rain')}: {rain.value} mm</p>}
      {temp && temp.value != null && <p style={{ margin: 0, color: '#e07340' }}>{t('Temp')}: {temp.value} °C</p>}
    </div>
  )
}

function HumidTooltip({ active, payload, label }) {
  const { t } = useLanguage()
  if (!active || !payload?.length) return null
  const h = payload.find(p => p.dataKey === 'humid')
  return (
    <div style={ttStyle} className="ch2-water-tooltip">
      <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{label}</p>
      {h && h.value != null && <p style={{ margin: 0, color: '#4da8a0' }}>{t('Humidity')}: {h.value}%</p>}
    </div>
  )
}

export default function WaterLayer({ data, loading, error }) {
  const { t } = useLanguage()

  if (loading) return <LayerLoading label={t('Fetching NASA POWER 30-day climate data…')} />
  if (error)   return <LayerError message={t(error, error)} />
  if (!data)   return <LayerEmpty label={t('Water / weather layer will appear after field confirmation.')} />

  if (!data.available) {
    return (
      <div className="ch2-layer-unavail">
        <Droplets size={28} />
        <div><b>{t('Weather data unavailable')}</b><p>{t(data.limitations, data.limitations)}</p></div>
      </div>
    )
  }

  const s     = data.summary || {}
  const daily = (data.daily || []).map(d => ({
    date:  d.date?.slice(5),
    rain:  d.rainfall_mm  ?? null,
    temp:  d.temp_avg_c   ?? null,
    tmax:  d.temp_max_c   ?? null,
    tmin:  d.temp_min_c   ?? null,
    humid: d.humidity_pct ?? null,
    solar: d.solar_mj_m2  ?? null,
  }))

  // Count days with actual data vs null (NASA POWER lag)
  const nullDays = daily.filter(d => d.rain === null).length
  const dataNote = nullDays > 0
    ? `${t('NASA POWER data available up to')} ${daily.filter(d => d.rain !== null).at(-1)?.date ?? '—'}. ${t('Last')} ${nullDays} ${t('days pending satellite processing.')}`
    : null

  // Temperature range for secondary axis
  const allTemps = daily.flatMap(d => [d.tmax, d.tmin, d.temp]).filter(v => v != null)
  const tempMin  = allTemps.length ? Math.floor(Math.min(...allTemps) - 2) : 0
  const tempMax  = allTemps.length ? Math.ceil(Math.max(...allTemps)  + 2) : 50

  return (
    <div className="ch2-water-view">
      {/* ── Summary stat cards ── */}
      <div className="ch2-water-stats">
        {[
          ['🌧️', t('Total rainfall'),     s.total_rainfall_mm != null ? `${s.total_rainfall_mm} mm` : '—', `${t('over')} ${s.period_days ?? 30} ${t('days')}`],
          ['🌡️', t('Avg temperature'),    s.avg_temperature_c  != null ? `${s.avg_temperature_c} °C` : '—', s.max_temperature_c != null ? `${t('max')} ${s.max_temperature_c} °C` : ''],
          ['💧', t('Avg humidity'),       s.avg_humidity_pct   != null ? `${s.avg_humidity_pct} %`  : '—', ''],
          ['📅', t('Days with rainfall'), s.days_with_rainfall != null ? `${s.days_with_rainfall}`  : '—', `${t('of')} ${s.period_days ?? 30} ${t('days')} (≥1 mm)`],
        ].map(([icon, label, value, sub]) => (
          <div key={label} className="ch2-water-stat">
            <span>{icon}</span>
            <div>
              <small>{label}</small>
              <b>{value}</b>
              {sub && <small>{sub}</small>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart 1: Rainfall bars + Temperature line (dual axis) ── */}
      <div className="ch2-water-chart-label">
        {t('Daily rainfall (mm) & temperature (°C) · last')} {s.period_days ?? 30} {t('days')}
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <ComposedChart data={daily} margin={{ top: 8, right: 48, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#edf1ed" vertical={false} />
          <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} interval={5} />
          {/* Left Y axis: rainfall in mm */}
          <YAxis
            yAxisId="rain"
            orientation="left"
            unit=" mm"
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          {/* Right Y axis: temperature in °C */}
          <YAxis
            yAxisId="temp"
            orientation="right"
            unit="°C"
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            domain={[tempMin, tempMax]}
            width={42}
          />
          <Tooltip content={<RainTempTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            formatter={v => v === 'rain' ? `${t('Rainfall')} (mm)` : v === 'temp' ? `${t('Avg temp')} (°C)` : t(v, v)}
          />
          {/* Rainfall bars */}
          <Bar yAxisId="rain" dataKey="rain" name="rain" fill="#5c91a6" radius={[3, 3, 0, 0]} maxBarSize={18} />
          {/* Avg temperature line — connectNulls bridges the NASA lag gap */}
          <Line
            yAxisId="temp"
            dataKey="temp"
            name="temp"
            stroke="#e07340"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          {/* Max/min temperature as faint dashed lines */}
          <Line yAxisId="temp" dataKey="tmax" stroke="#e07340" strokeWidth={1} strokeDasharray="3 3" dot={false} connectNulls legendType="none" />
          <Line yAxisId="temp" dataKey="tmin" stroke="#4da8a0" strokeWidth={1}  strokeDasharray="3 3" dot={false} connectNulls legendType="none" />
        </ComposedChart>
      </ResponsiveContainer>

      {/* ── Chart 2: Humidity area chart ── */}
      <div className="ch2-water-chart-label" style={{ marginTop: 18 }}>
        {t('Relative humidity (%) · last')} {s.period_days ?? 30} {t('days')}
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={daily} margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#edf1ed" vertical={false} />
          <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} interval={5} />
          <YAxis unit="%" tick={axisStyle} axisLine={false} tickLine={false} domain={[40, 100]} width={42} />
          <Tooltip content={<HumidTooltip />} />
          <ReferenceLine y={70} stroke="#4da8a0" strokeDasharray="4 3" label={{ value: '70%', fontSize: 10, fill: '#4da8a0' }} />
          <Area
            dataKey="humid"
            stroke="#4da8a0"
            fill="#4da8a020"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* ── Data-lag note ── */}
      {dataNote && (
        <div className="ch2-sat-note" style={{ marginTop: 12 }}>
          <Droplets size={13} />
          <span>{dataNote}</span>
        </div>
      )}

      {/* ── Metadata ── */}
      <div className="ch2-sat-meta" style={{ marginTop: 14 }}>
        <div className="ch2-meta-row"><span>{t('Source')}</span><b>{t(data.source, data.source)}</b></div>
        <div className="ch2-meta-row"><span>{t('Spatial resolution')}</span><b>{data.resolution}</b></div>
        <div className="ch2-meta-row"><span>{t('Observation window')}</span><b>{s.period_start} → {s.period_end}</b></div>
      </div>

      <div className="ch2-sat-note" style={{ marginTop: 10 }}>
        <Droplets size={13} />
        <span>{t(data.limitations, data.limitations)}</span>
      </div>
      <p className="ch2-attr">{t(data.attribution, data.attribution)}</p>
    </div>
  )
}
