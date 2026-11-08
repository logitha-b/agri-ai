import { useLanguage } from '../../context/LanguageContext'
/**
 * LacHistory — Historical production data from ICAR-IINRG bulletins (2012-2019).
 * Also shows ERA5 climate profile for selected state.
 * All data from verified official sources — nothing fabricated.
 */
import { useEffect, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { AlertTriangle, Download, Loader } from 'lucide-react'
import { Card, Notice } from '../../components'

const API = (import.meta.env.VITE_CROP_HEALTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8003' : '')).replace(/\/$/, '')
const axis = {fontSize:11,fill:'#738176'}
const tt   = {border:'1px solid #e0e8e0',borderRadius:8,fontSize:12}

const LAC_STATES = ['Jharkhand','Chhattisgarh','Madhya Pradesh','Maharashtra',
                    'West Bengal','Odisha','Assam','Andhra Pradesh',
                    'Uttar Pradesh','Gujarat','Meghalaya','All states']

const STATE_COLORS = {
  Jharkhand:'#2d6a4f', Chhattisgarh:'#74c69d', 'Madhya Pradesh':'#f4a261',
  Maharashtra:'#e76f51', 'West Bengal':'#264653', Odisha:'#4e9af1',
}

// Full production data embedded (ICAR-IINRG Bulletins + IASRI Table 5.25)
const PRODUCTION_DATA = [
  // 2012-13
  {year_label:'2012-13',start_year:2012,state:'Jharkhand',    total_t:11020,baisakhi_t:1155,jethwi_t:5370,katki_t:940, aghani_t:3555,season_complete:true},
  {year_label:'2012-13',start_year:2012,state:'Chhattisgarh', total_t:3260, baisakhi_t:930, jethwi_t:785, katki_t:575, aghani_t:970, season_complete:true},
  {year_label:'2012-13',start_year:2012,state:'Madhya Pradesh',total_t:2524,baisakhi_t:2005,jethwi_t:45,  katki_t:413, aghani_t:61,  season_complete:true},
  {year_label:'2012-13',start_year:2012,state:'Maharashtra',  total_t:1155, baisakhi_t:605, jethwi_t:5,   katki_t:545, aghani_t:0,   season_complete:true},
  {year_label:'2012-13',start_year:2012,state:'West Bengal',  total_t:780,  baisakhi_t:370, jethwi_t:35,  katki_t:310, aghani_t:65,  season_complete:true},
  {year_label:'2012-13',start_year:2012,state:'Odisha',       total_t:310,  baisakhi_t:70,  jethwi_t:70,  katki_t:55,  aghani_t:115, season_complete:true},
  {year_label:'2012-13',start_year:2012,state:'Assam',        total_t:130,  baisakhi_t:50,  jethwi_t:0,   katki_t:80,  aghani_t:0,   season_complete:true},
  {year_label:'2012-13',start_year:2012,state:'Andhra Pradesh',total_t:93,  baisakhi_t:30,  jethwi_t:2,   katki_t:60,  aghani_t:1,   season_complete:true},
  {year_label:'2012-13',start_year:2012,state:'Uttar Pradesh',total_t:100,  baisakhi_t:50,  jethwi_t:0,   katki_t:50,  aghani_t:0,   season_complete:true},
  {year_label:'2012-13',start_year:2012,state:'Gujarat',      total_t:55,   baisakhi_t:15,  jethwi_t:25,  katki_t:5,   aghani_t:10,  season_complete:true},
  {year_label:'2012-13',start_year:2012,state:'Meghalaya',    total_t:150,  baisakhi_t:145, jethwi_t:0,   katki_t:5,   aghani_t:0,   season_complete:true},
  // 2013-14
  {year_label:'2013-14',start_year:2013,state:'Jharkhand',    total_t:12207,baisakhi_t:1235,jethwi_t:6280,katki_t:1080,aghani_t:3612,season_complete:true},
  {year_label:'2013-14',start_year:2013,state:'Chhattisgarh', total_t:3381, baisakhi_t:885, jethwi_t:855, katki_t:635, aghani_t:1006,season_complete:true},
  {year_label:'2013-14',start_year:2013,state:'Madhya Pradesh',total_t:2497,baisakhi_t:1910,jethwi_t:48,  katki_t:468, aghani_t:71,  season_complete:true},
  {year_label:'2013-14',start_year:2013,state:'Maharashtra',  total_t:1182, baisakhi_t:625, jethwi_t:0,   katki_t:557, aghani_t:0,   season_complete:true},
  {year_label:'2013-14',start_year:2013,state:'West Bengal',  total_t:500,  baisakhi_t:185, jethwi_t:60,  katki_t:180, aghani_t:75,  season_complete:true},
  {year_label:'2013-14',start_year:2013,state:'Odisha',       total_t:673,  baisakhi_t:87,  jethwi_t:251, katki_t:65,  aghani_t:270, season_complete:true},
  {year_label:'2013-14',start_year:2013,state:'Assam',        total_t:150,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2013-14',start_year:2013,state:'Andhra Pradesh',total_t:113, baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2013-14',start_year:2013,state:'Uttar Pradesh',total_t:90,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2013-14',start_year:2013,state:'Gujarat',      total_t:47,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2013-14',start_year:2013,state:'Meghalaya',    total_t:168,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  // 2014-15
  {year_label:'2014-15',start_year:2014,state:'Jharkhand',    total_t:8630, baisakhi_t:385, jethwi_t:3895,katki_t:625, aghani_t:3725,season_complete:true},
  {year_label:'2014-15',start_year:2014,state:'Chhattisgarh', total_t:2336, baisakhi_t:445, jethwi_t:373, katki_t:378, aghani_t:1140,season_complete:true},
  {year_label:'2014-15',start_year:2014,state:'Madhya Pradesh',total_t:2586,baisakhi_t:1990,jethwi_t:58,  katki_t:495, aghani_t:43,  season_complete:true},
  {year_label:'2014-15',start_year:2014,state:'Maharashtra',  total_t:1525, baisakhi_t:765, jethwi_t:0,   katki_t:760, aghani_t:0,   season_complete:true},
  {year_label:'2014-15',start_year:2014,state:'West Bengal',  total_t:451,  baisakhi_t:91,  jethwi_t:30,  katki_t:240, aghani_t:90,  season_complete:true},
  {year_label:'2014-15',start_year:2014,state:'Odisha',       total_t:715,  baisakhi_t:40,  jethwi_t:95,  katki_t:105, aghani_t:475, season_complete:true},
  {year_label:'2014-15',start_year:2014,state:'Assam',        total_t:285,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2014-15',start_year:2014,state:'Andhra Pradesh',total_t:170, baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2014-15',start_year:2014,state:'Uttar Pradesh',total_t:75,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2014-15',start_year:2014,state:'Gujarat',      total_t:45,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2014-15',start_year:2014,state:'Meghalaya',    total_t:160,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  // 2015-16
  {year_label:'2015-16',start_year:2015,state:'Jharkhand',    total_t:9950, baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2015-16',start_year:2015,state:'Chhattisgarh', total_t:3187, baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2015-16',start_year:2015,state:'Madhya Pradesh',total_t:2222,baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2015-16',start_year:2015,state:'Maharashtra',  total_t:1465, baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2015-16',start_year:2015,state:'West Bengal',  total_t:582,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2015-16',start_year:2015,state:'Odisha',       total_t:623,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2015-16',start_year:2015,state:'Assam',        total_t:315,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2015-16',start_year:2015,state:'Andhra Pradesh',total_t:172, baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2015-16',start_year:2015,state:'Uttar Pradesh',total_t:55,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2015-16',start_year:2015,state:'Gujarat',      total_t:48,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2015-16',start_year:2015,state:'Meghalaya',    total_t:127,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  // 2016-17
  {year_label:'2016-17',start_year:2016,state:'Jharkhand',    total_t:8926, baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2016-17',start_year:2016,state:'Chhattisgarh', total_t:2693, baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2016-17',start_year:2016,state:'Madhya Pradesh',total_t:2274,baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2016-17',start_year:2016,state:'Maharashtra',  total_t:875,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2016-17',start_year:2016,state:'West Bengal',  total_t:980,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2016-17',start_year:2016,state:'Odisha',       total_t:354,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2016-17',start_year:2016,state:'Assam',        total_t:105,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2016-17',start_year:2016,state:'Andhra Pradesh',total_t:88,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2016-17',start_year:2016,state:'Uttar Pradesh',total_t:15,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2016-17',start_year:2016,state:'Gujarat',      total_t:22,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2016-17',start_year:2016,state:'Meghalaya',    total_t:20,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  // 2017-18
  {year_label:'2017-18',start_year:2017,state:'Jharkhand',    total_t:7746, baisakhi_t:363, jethwi_t:3226,katki_t:277, aghani_t:3880,season_complete:true},
  {year_label:'2017-18',start_year:2017,state:'Chhattisgarh', total_t:2252, baisakhi_t:650, jethwi_t:420, katki_t:497, aghani_t:685, season_complete:true},
  {year_label:'2017-18',start_year:2017,state:'Madhya Pradesh',total_t:2236,baisakhi_t:1188,jethwi_t:56,  katki_t:951, aghani_t:41,  season_complete:true},
  {year_label:'2017-18',start_year:2017,state:'Maharashtra',  total_t:865,  baisakhi_t:390, jethwi_t:2,   katki_t:465, aghani_t:8,   season_complete:true},
  {year_label:'2017-18',start_year:2017,state:'West Bengal',  total_t:794,  baisakhi_t:45,  jethwi_t:29,  katki_t:590, aghani_t:130, season_complete:true},
  {year_label:'2017-18',start_year:2017,state:'Odisha',       total_t:279,  baisakhi_t:13,  jethwi_t:111, katki_t:9,   aghani_t:147, season_complete:true},
  {year_label:'2017-18',start_year:2017,state:'Assam',        total_t:9,    baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2017-18',start_year:2017,state:'Andhra Pradesh',total_t:9,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2017-18',start_year:2017,state:'Uttar Pradesh',total_t:12,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2017-18',start_year:2017,state:'Gujarat',      total_t:22,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2017-18',start_year:2017,state:'Meghalaya',    total_t:6,    baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  // 2018-19
  {year_label:'2018-19',start_year:2018,state:'Jharkhand',    total_t:9071, baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2018-19',start_year:2018,state:'Chhattisgarh', total_t:2763, baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2018-19',start_year:2018,state:'Madhya Pradesh',total_t:2086,baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2018-19',start_year:2018,state:'Maharashtra',  total_t:722,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2018-19',start_year:2018,state:'West Bengal',  total_t:902,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2018-19',start_year:2018,state:'Odisha',       total_t:522,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2018-19',start_year:2018,state:'Assam',        total_t:21,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2018-19',start_year:2018,state:'Andhra Pradesh',total_t:10,  baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2018-19',start_year:2018,state:'Uttar Pradesh',total_t:16,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2018-19',start_year:2018,state:'Gujarat',      total_t:16,   baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
  {year_label:'2018-19',start_year:2018,state:'Meghalaya',    total_t:6,    baisakhi_t:null,jethwi_t:null,katki_t:null,aghani_t:null,season_complete:false},
]

function buildOfflineData(stateFilter) {
  const records = stateFilter === 'All states'
    ? PRODUCTION_DATA
    : PRODUCTION_DATA.filter(r => r.state === stateFilter)

  const yearMap = {}
  records.forEach(r => {
    if (!yearMap[r.year_label]) yearMap[r.year_label] = { year_label:r.year_label, start_year:r.start_year, total_t:0, states:0 }
    yearMap[r.year_label].total_t  += r.total_t
    yearMap[r.year_label].states   += 1
  })
  const nat = Object.values(yearMap).sort((a,b) => a.start_year - b.start_year)
  const states = [...new Set(PRODUCTION_DATA.map(r => r.state))].sort()
  const years  = nat.map(r => r.start_year)
  return {
    available: true, state_filter: stateFilter, rows: records.length,
    records, national_by_year: nat, states,
    year_range: years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '',
    source: 'ICAR-IINRG Statistics Bulletins 2013–2018 / IASRI Table 5.25 (embedded)',
    note: 'All production values are sticklac in tonnes from market surveys.',
    offline: true,
  }
}

export default function LacHistory({ derivedState, sampleSeed }) {
  const { t } = useLanguage()
  const [stateFilter, setStateFilter] = useState(derivedState || 'All states')
  const [data,        setData]        = useState(null)
  const [climate,     setClimate]     = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  const fetchData = async (state) => {
    setLoading(true); setError('')

    // ── Always load embedded data first (works offline) ───────────────────
    const offline = buildOfflineData(state)
    setData(offline)

    // ── Try backend for live data + ERA5 climate profile ──────────────────
    try {
      const params = state !== 'All states' ? `?state=${encodeURIComponent(state)}` : ''
      const [histRes, climRes] = await Promise.all([
        fetch(`${API}/api/lac/historical${params}`, { signal: AbortSignal.timeout(6000) }),
        state !== 'All states'
          ? fetch(`${API}/api/lac/climate-profile?state=${encodeURIComponent(state)}`, { signal: AbortSignal.timeout(6000) })
          : Promise.resolve(null),
      ])
      if (histRes.ok) {
        const hist = await histRes.json()
        if (hist.available) setData(hist)
      }
      if (climRes?.ok) {
        const clim = await climRes.json()
        if (clim?.available) setClimate(clim)
      }
    } catch {
      // Backend offline — embedded data already set above
    }

    setLoading(false)
  }
  useEffect(() => {
    if (sampleSeed) {
      setStateFilter('Jharkhand')
      fetchData('Jharkhand')
    } else if (derivedState && derivedState !== 'All states') {
      setStateFilter(derivedState)
      fetchData(derivedState)
    }
  }, [sampleSeed, derivedState])

  // Build national totals chart
  const natChart = data?.national_by_year?.map(r => ({
    year: r.year_label, total: Math.round(r.total_t),
  })) || []

  // Build season breakdown for selected state
  const seasonChart = data?.records?.reduce((acc, r) => {
    const existing = acc.find(x => x.year === r.year_label)
    if (existing) return acc
    const row = data.records.filter(x => x.year_label === r.year_label && x.state === r.state)
    if (row.length) {
      acc.push({
        year: r.year_label,
        baisakhi: row[0].baisakhi_t || 0,
        jethwi:   row[0].jethwi_t   || 0,
        katki:    row[0].katki_t     || 0,
        aghani:   row[0].aghani_t   || 0,
        total:    row[0].total_t,
      })
    }
    return acc
  }, []) || []

  // Multi-state chart
  const stateYears = ['2012-13','2013-14','2014-15','2015-16','2016-17','2017-18','2018-19']
  const multiData  = data?.national_by_year ? stateYears.map(yr => {
    const row = {year: yr.slice(0,4)}
    if (data.records) {
      data.records.filter(r => r.year_label === yr).forEach(r => {
        row[r.state] = r.total_t
      })
    }
    return row
  }) : []

  const downloadCSV = () => {
    if (!data?.records) return
    const cols = ['year_label','state','total_t','baisakhi_t','jethwi_t','katki_t','aghani_t','source']
    const rows = data.records.map(r => cols.map(c => r[c] ?? '').join(','))
    const csv  = [cols.join(','), ...rows].join('\n')
    const blob = new Blob([csv], {type:'text/csv'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `lac-production-${stateFilter.replace(/\s/g,'-')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <Notice>
        Production data from ICAR-IINRG Statistics Bulletins 2013–2018 and IASRI Agricultural
        Research Data Book 2020, Table 5.25. All values are sticklac in tonnes from market surveys.
        Data are not crop-cutting experiments — they are survey-based estimates.
      </Notice>

      {/* Controls */}
      <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
        <label className="field" style={{minWidth:220}}>
          <span>STATE FILTER</span>
          <select value={stateFilter} onChange={e=>setStateFilter(e.target.value)}>
            {LAC_STATES.map(s=><option key={s}>{s}</option>)}
          </select>
        </label>
        {data && (
          <button className="button secondary" style={{marginTop:20}} onClick={downloadCSV}>
            <Download size={13}/> Download CSV
          </button>
        )}
      </div>

      {loading && <div className="lac-loading"><Loader size={24} className="spin"/><p>Loading production data…</p></div>}
      {error   && <p className="lac-error"><AlertTriangle size={13}/> {error}</p>}

      {data?.available && (
        <>
          {/* Summary stats */}
          <div className="stats-grid four">
            <article className="stat-card">
              <div className="stat-label">Records</div>
              <strong className="stat-value" style={{fontSize:22}}>{data.rows}</strong>
              <div className="stat-foot"><span>state-year observations</span></div>
            </article>
            <article className="stat-card">
              <div className="stat-label">Year range</div>
              <strong className="stat-value" style={{fontSize:18}}>{data.year_range}</strong>
              <div className="stat-foot"><span>7 years</span></div>
            </article>
            <article className="stat-card">
              <div className="stat-label">States covered</div>
              <strong className="stat-value" style={{fontSize:22}}>{data.states?.length}</strong>
              <div className="stat-foot"><span>producing states</span></div>
            </article>
            <article className="stat-card">
              <div className="stat-label">Peak year</div>
              <strong className="stat-value" style={{fontSize:18}}>2013-14</strong>
              <div className="stat-foot"><span>21,008 t national total</span></div>
            </article>
          </div>

          {/* National totals chart */}
          {stateFilter === 'All states' && natChart.length > 0 && (
            <Card title="National lac production 2012–2019" subtitle="All-India sticklac totals · ICAR-IINRG + IASRI">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={natChart} margin={{top:10,right:12,left:0,bottom:0}}>
                  <CartesianGrid stroke="#edf1ed" vertical={false}/>
                  <XAxis dataKey="year" tick={axis} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}k`} tick={axis} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={v=>[`${v?.toLocaleString('en-IN')} t`,'Production']} contentStyle={tt}/>
                  <Bar dataKey="total" name="National total (t)" radius={[5,5,0,0]}>
                    {natChart.map((_,i)=><Cell key={i} fill="#2d6a4f" opacity={0.75+i*0.03}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="lac-chart-note">Source: ICAR-IINRG Statistics Bulletins · All values in tonnes (sticklac)</p>
            </Card>
          )}

          {/* Multi-state line chart */}
          {stateFilter === 'All states' && multiData.length > 0 && (
            <Card title="State-wise production trends" subtitle="Top 6 states · 2012–2018">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={multiData} margin={{top:10,right:12,left:0,bottom:0}}>
                  <CartesianGrid stroke="#edf1ed" vertical={false}/>
                  <XAxis dataKey="year" tick={axis} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>`${(v/1000).toFixed(1)}k`} tick={axis} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={(v,n)=>[`${v?.toLocaleString('en-IN') || 0} t`,n]} contentStyle={tt}/>
                  <Legend wrapperStyle={{fontSize:10}}/>
                  {Object.entries(STATE_COLORS).map(([s,c])=>(
                    <Line key={s} type="monotone" dataKey={s} stroke={c} strokeWidth={2}
                      dot={{r:3}} connectNulls/>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* State-specific season breakdown */}
          {stateFilter !== 'All states' && seasonChart.length > 0 && (
            <Card title={`${stateFilter} — Production by season`} subtitle="Baisakhi · Jethwi · Katki · Aghani crop breakdown">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={seasonChart} margin={{top:10,right:12,left:0,bottom:0}}>
                  <CartesianGrid stroke="#edf1ed" vertical={false}/>
                  <XAxis dataKey="year" tick={axis} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>`${(v/1000).toFixed(1)}k`} tick={axis} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={(v,n)=>[`${v?.toLocaleString('en-IN') || 0} t`,n]} contentStyle={tt}/>
                  <Legend wrapperStyle={{fontSize:10}}/>
                  <Bar dataKey="baisakhi" name="Baisakhi (Rangeeni·Summer)" stackId="a" fill="#2d6a4f"/>
                  <Bar dataKey="katki"    name="Katki (Rangeeni·Rainy)"    stackId="a" fill="#74c69d"/>
                  <Bar dataKey="jethwi"   name="Jethwi (Kusmi·Summer)"    stackId="a" fill="#f4a261"/>
                  <Bar dataKey="aghani"   name="Aghani (Kusmi·Winter)"    stackId="a" fill="#e76f51" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
              <p className="lac-chart-note">Rangeeni = Baisakhi + Katki · Kusmi = Jethwi + Aghani</p>
            </Card>
          )}

          {/* ERA5 climate profile */}
          {climate && (
            <Card title={`${stateFilter} — ERA5 seasonal climate profile`}
              subtitle={`Average over ${climate.year_range} · Source: ERA5-Land reanalysis`}>
              <div className="lac-climate-grid">
                {Object.entries(climate.seasonal).map(([season, vals]) => (
                  <div key={season} className="lac-climate-card">
                    <b>{season.replace('_',' ')}</b>
                    <div><small>Temp mean</small><span>{vals.temp_mean_c}°C</span></div>
                    <div><small>Temp max</small><span>{vals.temp_max_c}°C</span></div>
                    <div><small>Precip total</small><span>{vals.precip_sum_mm} mm</span></div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Data table */}
          <Card title="Raw production data" subtitle={`Source: ${data.source}`}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Year</th><th>State</th><th>Total (t)</th>
                    <th>Baisakhi</th><th>Jethwi</th><th>Katki</th><th>Aghani</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.slice(0,50).map((r,i) => (
                    <tr key={i}>
                      <td>{r.year_label}</td>
                      <td>{r.state}</td>
                      <td><b>{r.total_t?.toLocaleString('en-IN')}</b></td>
                      <td>{r.baisakhi_t?.toLocaleString('en-IN') || '—'}</td>
                      <td>{r.jethwi_t?.toLocaleString('en-IN')   || '—'}</td>
                      <td>{r.katki_t?.toLocaleString('en-IN')     || '—'}</td>
                      <td>{r.aghani_t?.toLocaleString('en-IN')    || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.records.length > 50 && <p style={{fontSize:10,color:'#8a968c',marginTop:6}}>Showing 50 of {data.records.length} records. Download CSV for full data.</p>}
          </Card>
        </>
      )}
    </div>
  )
}
