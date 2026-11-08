// src/components/water/RainfallChart.jsx
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

const axis  = { fontSize: 11, fill: '#718074' }
const ttStyle = { border: '1px solid #e0e8e0', borderRadius: 8, fontSize: 12 }

export default function RainfallChart({ data, loading, error }) {
  const { t } = useLanguage()

  if (loading) return <div className="wr-chart-loading"><span className="wr-spinner"/><p>{t("Loading IMD district rainfall…", "Loading IMD district rainfall…")}</p></div>
  if (error)   return <div className="wr-chart-error"><p>{t(error, error)}</p></div>
  if (!data?.available) {
    return (
      <div className="wr-chart-empty">
        <p>{t(data?.reason || 'Enter state and district above to load IMD rainfall data.', data?.reason || 'Enter state and district above to load IMD rainfall data.')}</p>
        <small>{t("IMD district-wise daily rainfall · National Water Data Portal", "IMD district-wise daily rainfall · National Water Data Portal")}</small>
      </div>
    )
  }

  const series = (data.series || []).map(r => ({
    date:     r.date?.slice(5),  // MM-DD
    actual:   r.daily_actual_mm,
    normal:   r.daily_normal_mm,
  }))

  const acc = data.accumulated || {}

  return (
    <div className="wr-rain-chart">
      {/* Accumulated summary */}
      <div className="wr-rain-stats">
        {[
          ['Yesterday',   acc.last_1_day_mm,  'mm'],
          ['Last 3 days', acc.last_3_days_mm, 'mm'],
          ['Last 7 days', acc.last_7_days_mm, 'mm'],
          ['This week',   data.weekly_actual_mm, 'mm'],
          ['This month',  data.monthly_actual_mm, 'mm'],
        ].map(([label, val, unit]) => (
          <div key={label} className="wr-rain-stat">
            <small>{t(label, label)}</small>
            <b>{val != null ? `${val} ${t(unit, unit)}` : '—'}</b>
          </div>
        ))}
      </div>

      {/* Category badge */}
      {data.daily_category && (
        <div className="wr-rain-cat">
          <span>{t("Today's IMD category:", "Today's IMD category:")}</span>
          <b className={`wr-cat-${(data.daily_category || '').toLowerCase().replace(/\s+/g,'_')}`}>
            {t(data.daily_category, data.daily_category)}
          </b>
          <span className="wr-rain-dep">{t("Departure:", "Departure:")} {data.daily_departure_pct || '—'}</span>
        </div>
      )}

      {/* Chart */}
      <div className="wr-rain-chart-label">{t("Daily rainfall (mm)", "Daily rainfall (mm)")} — {t(data.state, data.state)} / {t(data.district, data.district)}</div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#edf1ed" vertical={false}/>
          <XAxis dataKey="date" tick={axis} axisLine={false} tickLine={false} interval={Math.floor(series.length / 6)}/>
          <YAxis unit=" mm" tick={axis} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={ttStyle} formatter={(v, n) => [`${v ?? '—'} mm`, t(n, n)]}/>
          <Bar  dataKey="actual" name={t("Actual (mm)", "Actual (mm)")}  fill="#5c91a6" radius={[3,3,0,0]}/>
          <Line dataKey="normal" name={t("Normal (mm)", "Normal (mm)")}  stroke="#d19a4d" strokeDasharray="4 3" dot={false}/>
        </ComposedChart>
      </ResponsiveContainer>

      <div className="wr-rain-meta">
        <span>{t("Latest:", "Latest:")} {data.latest_date}</span>
        <span>{t("Source:", "Source:")} {t(data.source, data.source)}</span>
        <span>{t(data.units, data.units)}</span>
      </div>

      <div className="wr-rain-note">
        <ShieldCheck size={12}/>
        <span>{t(data.note, data.note)}</span>
      </div>
    </div>
  )
}
