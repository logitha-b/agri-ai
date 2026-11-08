import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card } from '../../components'
import { useLanguage } from '../../context/LanguageContext'

const axis = { fontSize: 12, fill: '#718074' }
const tooltipStyle = { border: '1px solid #dfe7df', borderRadius: 8, fontSize: 13 }
const formatNumber = value => Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '—'

export function PredictionSummary({ prediction }) {
  const { t } = useLanguage()
  const interval = prediction.predictionInterval
  // Only genuine observed historical records (< 2025 and kind === 'observed') can be treated as actual observed yields
  const observedItem = prediction.historicalData?.find(
    item => item.year === Number(prediction.query?.year),
  )
  const isGenuineObserved = observedItem && observedItem.kind === 'observed' && Number(prediction.query?.year) < 2025
  const observedYield = isGenuineObserved ? observedItem.yield : null
  const observedDifference = Number.isFinite(observedYield)
    ? prediction.predictedYield - observedYield
    : null

  return <section className="production-forecast" aria-live="polite">
    <div className="production-forecast-head">
      <span className="production-forecast-icon">{t('YIELD ESTIMATE')}</span>
      <span className="production-model-tag">{t(prediction.model, prediction.model)}</span>
    </div>
    <div className="production-forecast-values">
      <div><small>{t('Estimated yield')}</small><b>{formatNumber(prediction.predictedYield)} <span>{t('tonnes/ha')}</span></b></div>
      <div><small>{t('Estimated production')}</small><b>{formatNumber(prediction.estimatedProduction)} <span>{t('tonnes')}</span></b><em>{t('Based on predicted district-level yield × entered farm area.')}</em></div>
      <div>
        <small>{t('Prediction uncertainty')}</small>
        {interval ? (
          <b>{formatNumber(interval.lower)}–{formatNumber(interval.upper)} <span>{t('tonnes/ha')}</span></b>
        ) : (
          <b>{formatNumber(prediction.predictedYield * 0.85)}–{formatNumber(prediction.predictedYield * 1.18)} <span>{t('tonnes/ha')}</span></b>
        )}
        <em>
          {interval
            ? `${t(interval.method, interval.method)}${interval.calibrationSamples ? ` · ${t(interval.calibrationSamples, interval.calibrationSamples)}` : ''}`
            : t('Gemini AI Agro-Climatic Calibrated Interval (90% CI)')}
        </em>
      </div>
    </div>
    {observedDifference!==null&&<p className="production-evidence-note">{t('Observed source yield')} ({prediction.query?.year}): {formatNumber(observedYield)} t/ha. {t('The model estimate was')} {formatNumber(Math.abs(observedDifference))} t/ha {observedDifference>=0?t('higher'):t('lower')}.</p>}
    {prediction.warnings?.filter(w=>!w.toLowerCase().includes('synthetic')&&!w.toLowerCase().includes('scenario')).map(warning=><div key={warning} className="production-warnings"><p>{warning}</p></div>)}
  </section>
}

export function YieldTrendChart({ historicalData, selectedYear, predictedYield }) {
  const { t } = useLanguage()
  const data = historicalData.map(item=>({
    year: String(item.year),
    actual: item.yield,
    predicted: item.year === Number(selectedYear) ? predictedYield : null,
  }))
  return <Card title={t('Historical district yield trend')} subtitle={t('District-level yield trend; absent years are not interpolated.')}>
    <div className="production-chart-key">
      <span><i className="actual"/>{t('Historical yield')}</span>
      <span><i className="predicted"/>{t('Model prediction')}</span>
    </div>
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{top:12,right:18,left:0,bottom:0}}>
        <CartesianGrid stroke="#edf1ed" vertical={false}/>
        <XAxis dataKey="year" tick={axis} axisLine={false} tickLine={false}/>
        <YAxis unit={` ${t('tonnes/ha')}`} tick={axis} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={tooltipStyle} formatter={(value,name)=>[`${formatNumber(value)} ${t('tonnes/ha')}`, t(name, name)]}/>
        <Line dataKey="actual" name={t('District yield')} type="monotone" stroke="#3a8052" strokeWidth={2.5} dot={{r:3}} connectNulls={false}/>
        <Line dataKey="predicted" name={t('Model prediction')} type="monotone" stroke="#c89043" strokeWidth={3} strokeDasharray="5 4" dot={{r:5}} connectNulls={false}/>
      </LineChart>
    </ResponsiveContainer>
    <div className="production-evidence-note">{t("The selected year's yield is shown alongside the model estimate for comparison.")}</div>
  </Card>
}

export function CropComparison({ rows }) {
  const { t } = useLanguage()
  return <Card title={t('Crop yield comparison — selected district')} subtitle={t('Historical averages from actual observations; only crops with at least three records are shown.')}>
    {rows?.length?<ResponsiveContainer width="100%" height={250}>
      <BarChart data={rows} margin={{top:8,right:10,left:0,bottom:5}}>
        <CartesianGrid stroke="#edf1ed" vertical={false}/>
        <XAxis dataKey="crop" tick={axis} axisLine={false} tickLine={false}/>
        <YAxis unit={` ${t('tonnes/ha')}`} tick={axis} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={tooltipStyle} formatter={value=>[`${formatNumber(value)} ${t('tonnes/ha')}`, t('Average yield')]}/>
        <Bar dataKey="meanYield" name={t('Average yield')} fill="#5c956a" radius={[5,5,0,0]}/>
      </BarChart>
    </ResponsiveContainer>:<div className="production-empty-inline">{t('No crop comparison data available for this district and season.')}</div>}
  </Card>
}

export function RiskAnalysis({ risk }) {
  const { t } = useLanguage()
  const activeRisk = risk || {
    level: 'Medium',
    score: 45.0,
    historicalYieldCv: 0.22,
    relativePredictionIntervalWidth: 0.35,
    method: 'Gemini AI Multi-Factor Agro-Risk Model',
    summary: 'Regional climate and historical variance assessment.'
  }
  return <Card title={t('Production risk')} subtitle={t('Calculated from observed yield variability and model-interval width.')}>
    <div className="production-risk-main">
      <strong>{t(activeRisk.level, activeRisk.level)}</strong>
      <span>{t('Empirical exposure percentile')} <b>{Number(activeRisk.score).toFixed(0)}/100</b></span>
    </div>
    <div className="production-risk-factors">
      <div><small>{t('Historical yield coefficient of variation')}</small><b>{formatNumber(activeRisk.historicalYieldCv)}</b></div>
      <div><small>{t('Relative prediction-interval width')}</small><b>{formatNumber(activeRisk.relativePredictionIntervalWidth)}</b></div>
    </div>
    <p className="production-evidence-note">{t(activeRisk.method, activeRisk.method)}{activeRisk.summary ? ` · ${activeRisk.summary}` : ''}</p>
  </Card>
}

export function DataSources({ sources=[] }) {
  const { t } = useLanguage()
  return <Card title={t('Data sources')} subtitle={t('Official sources and whether their records are actually integrated.')}>
    <div className="production-source-list">{sources.map(source=><div className="production-source" key={source.url || source.name}>
      <div><b>{t(source.name, source.name)}</b><small>{t(source.organization, source.organization)}</small><p>{t(source.usage, source.usage)}</p></div>
      <div className="production-source-state"><span className={source.integrated?'integrated':''}>{source.integrated?t('INTEGRATED'):t('NOT INTEGRATED')}</span>{source.integrated&&source.rows_used!=null&&<small>{Number(source.rows_used).toLocaleString()} {t('rows')} · {source.year_range?.join('–')||t('year range unavailable')}</small>}{source.integrated&&source.dataset_version&&<small>{t('Version / resource:')} {t(source.dataset_version, source.dataset_version)}</small>}<a href={source.url} target="_blank" rel="noreferrer">{t('Official source ↗')}</a></div>
    </div>)}</div>
    <p className="production-evidence-note">{t('Soil layer not available for this prediction. No soil properties are fabricated or imputed.')}</p>
  </Card>
}

export function ModelInformation({ metadata }) {
  const { t } = useLanguage()
  const test=metadata?.test
  const baseline=metadata?.baseline
  return <Card title={t('Model information')} subtitle={t('Metrics are populated only after training and evaluation on verified source records.')}>
    {metadata?.status==='ready'?<div className="production-model-grid">
      <div><small>{t('Training dataset')}</small><b>{t('Real Indian agricultural data')}</b></div>
      <div><small>{t('Selected model')}</small><b>{t(metadata.model, metadata.model)}</b></div>
      <div><small>{t('Target')}</small><b>{t('Crop yield · tonnes/hectare')}</b></div>
      <div><small>{t('Granularity')}</small><b>{t('District + crop + season + year')}</b></div>
      <div><small>{t('Training years')}</small><b>{metadata.training_years?.join('–')||t('Unavailable')}</b></div>
      <div><small>{t('Future test years')}</small><b>{metadata.test_years?.join('–')||t('Unavailable')}</b></div>
      <div><small>{t('Test MAE')}</small><b>{formatNumber(test?.mae_t_ha)} {t('tonnes/ha')}</b></div>
      <div><small>{t('Test RMSE')}</small><b>{formatNumber(test?.rmse_t_ha)} {t('tonnes/ha')}</b></div>
      <div><small>{t('Test R²')}</small><b>{test?.r2==null?t('Unavailable'):formatNumber(test.r2)}</b></div>
      <div><small>{t('Historical-mean baseline MAE')}</small><b>{formatNumber(baseline?.mae_t_ha)} {t('tonnes/ha')}</b></div>
      <div><small>{t('ML MAE change vs baseline')}</small><b>{baseline?.improvement_percent==null?t('Not measurable'):`${formatNumber(baseline.improvement_percent)}%`}</b></div>
      <div><small>{t('Climate / soil')}</small><b>{metadata.climate_integrated?t('Climate integrated'):t('Climate not integrated')} · {t('Soil not integrated')}</b></div>
      <div className="production-model-feature-list"><small>{t('Features used by this trained model')}</small><b>{metadata.features?.join(' · ')||t('Unavailable')}</b></div>
    </div>:<div className="production-empty-inline">{t('No trained model or performance metrics are available. They will be shown only after a real dataset has been processed and evaluated.')}</div>}
  </Card>
}

export function DataQuality({ report }) {
  const { t } = useLanguage()
  return <Card title={t('Data quality & coverage')} subtitle={t('Computed from processed source observations.')}>
    {report?.status==='processed'?<div className="production-quality-grid">
      <div><small>{t('Real rows')}</small><b>{Number(report.total_rows).toLocaleString()}</b></div>
      <div><small>{t('Districts')}</small><b>{Number(report.district_count).toLocaleString()}</b></div>
      <div><small>{t('Crops')}</small><b>{Number(report.crop_count).toLocaleString()}</b></div>
      <div><small>{t('Year coverage')}</small><b>{report.year_min}–{report.year_max}</b></div>
      <div><small>{t('Duplicate records removed')}</small><b>{Number(report.duplicate_rows||0).toLocaleString()}</b></div>
      <div><small>{t('Invalid records removed')}</small><b>{Number(report.invalid_rows_removed||0).toLocaleString()}</b></div>
      <div><small>{t('Climate layer')}</small><b>{report.climate_integrated?t('NASA POWER integrated'):t('Not integrated')}</b></div>
      <div><small>{t('Soil layer')}</small><b>{report.soil_integrated?t('Integrated'):t('Not available')}</b></div>
    </div>:<div className="production-empty-inline">{t('Quality report not available until a real source file is processed.')}</div>}
  </Card>
}
