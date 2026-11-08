import { useEffect, useState } from 'react'
import { Loader, ShieldCheck, Sparkles } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { localizeLocationName } from '../../services/contentLocalization'

const API = (import.meta.env.VITE_CROP_HEALTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV && typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8003` : '')).replace(/\/$/, '')

async function apiGet(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const candidates = [
    ...(API ? [`${API}${cleanPath}`] : []),
    cleanPath,
    ...(import.meta.env.DEV ? [`http://127.0.0.1:8003${cleanPath}`] : []),
  ]
  let lastErr = null
  for (const url of candidates) {
    try {
      const res = await fetch(url)
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      if (
        (ct.includes('text/html') && !cleanPath.endsWith('.html')) ||
        (res.status === 405) ||
        (res.status === 404 && !ct.includes('application/json'))
      ) {
        continue
      }
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr || new Error(`Failed to load ${path}`)
}

// ── Nutrient display config ────────────────────────────────────────────────
const NUTRIENT_META = {
  'Soil Ph':                  { icon: '🧪', label: 'Soil pH', nameKey: 'Soil pH' },
  'Electrical Conductivity':  { icon: '⚡', label: 'Electrical Conductivity', nameKey: 'Electrical Conductivity' },
  'Organic Carbon':           { icon: '🌿', label: 'Organic Carbon', nameKey: 'Organic Carbon' },
  'Nitrogen':                 { icon: '🌱', label: 'Nitrogen (N)', nameKey: 'Nitrogen (N)' },
  'Phosphorus':               { icon: '🔵', label: 'Phosphorus (P)', nameKey: 'Phosphorus (P)' },
  'Potassium':                { icon: '🟡', label: 'Potassium (K)', nameKey: 'Potassium (K)' },
  'Sulphur':                  { icon: '🟠', label: 'Sulphur (S)', nameKey: 'Sulphur (S)' },
  'Zinc':                     { icon: '🔩', label: 'Zinc (Zn)', nameKey: 'Zinc (Zn)' },
  'Iron':                     { icon: '🟤', label: 'Iron (Fe)', nameKey: 'Iron (Fe)' },
  'Manganese':                { icon: '🟣', label: 'Manganese (Mn)', nameKey: 'Manganese (Mn)' },
  'Copper':                   { icon: '🟠', label: 'Copper (Cu)', nameKey: 'Copper (Cu)' },
  'Boron':                    { icon: '⬜', label: 'Boron (B)', nameKey: 'Boron (B)' },
}

const LEVEL_BG   = { Low:'#fde68a', High:'#bbf7d0', Medium:'#dbeafe', Deficient:'#fecaca', Sufficient:'#bbf7d0', Acidic:'#fde68a', Neutral:'#bbf7d0', Alkaline:'#fecaca', Saline:'#fecaca', 'Non Saline':'#bbf7d0' }
const LEVEL_TEXT = { Low:'#92400e', High:'#166534', Medium:'#1e40af', Deficient:'#991b1b', Sufficient:'#166534', Acidic:'#92400e', Neutral:'#166534', Alkaline:'#991b1b', Saline:'#991b1b', 'Non Saline':'#166534' }
const LEVEL_BAR  = { Low:'#fbbf24', High:'#34d399', Medium:'#60a5fa', Deficient:'#f87171', Sufficient:'#34d399', Acidic:'#fbbf24', Neutral:'#34d399', Alkaline:'#f87171', Saline:'#f87171', 'Non Saline':'#34d399' }

// Crop guidance (rules-based, authoritative references only)
const CROP_GUIDANCE = {
  paddy: {
    'Nitrogen':   { Low:'Low N at tillering reduces tiller count. Confirm with soil test before applying urea (ICAR).', Medium:'Moderate N — adequate for most paddy stages.', High:'High N — reduce application to avoid lodging and blast risk.' },
    'Phosphorus': { Low:'Low P can delay root development and panicle initiation. Basal DAP is typically recommended (ICAR).', Medium:'Adequate P. Standard basal dose is sufficient.', High:'High P — no additional P required.' },
    'Potassium':  { Low:'Low K increases blast and BLB susceptibility. MOP at tillering is common (TNAU).', Medium:'Adequate K.', High:'High K — no additional K required.' },
    'Soil Ph':    { Acidic:'Acidic soil reduces P and Zn availability. Lime application may help — consult KVK.', Neutral:'Neutral pH is ideal for paddy.', Alkaline:'Alkaline soil can cause Fe/Zn deficiency. Monitor for chlorosis.' },
    'Zinc':       { Deficient:'Zinc deficiency (Khaira disease) is common. Foliar ZnSO₄ at tillering when confirmed (TNAU).', Sufficient:'Adequate Zn — no supplemental Zn required.' },
  },
  groundnut: {
    'Phosphorus': { Low:'Low P reduces peg formation and pod fill. SSP 375 kg/ha at sowing is commonly cited (ICAR).', Medium:'Moderate P — standard basal dose is sufficient.', High:'High P — no additional P required.' },
    'Sulphur':    { Low:'Groundnut has high S demand. Gypsum 400 kg/ha at flowering is widely recommended (ICRISAT).', Medium:'Adequate S.', High:'Sufficient S — no additional sulphur required.' },
    'Soil Ph':    { Acidic:'Slightly acidic pH (6.0–6.5) is optimal for groundnut.', Neutral:'Neutral pH is suitable.', Alkaline:'Alkaline soil can limit Fe and Mn availability.' },
  },
}

function getCropGuidance(crop, nutrientName, dominantLevel) {
  return CROP_GUIDANCE[(crop||'').toLowerCase()]?.[nutrientName]?.[dominantLevel] || null
}

// ── Nutrient card ─────────────────────────────────────────────────────────
function NutrientCard({ nutrient, crop }) {
  const { t } = useLanguage()
  const meta = NUTRIENT_META[nutrient.nutrient_name] || { icon: '📊', label: nutrient.nutrient_name, nameKey: nutrient.nutrient_name }
  const dominant = nutrient.dominant_level
  const guidance = dominant ? getCropGuidance(crop, nutrient.nutrient_name, dominant) : null
  const total = nutrient.total_samples || 0

  return (
    <div className="sn-card" style={{ borderColor: dominant ? (LEVEL_BG[dominant] || '#e8ede8') : '#e8ede8' }}>
      <div className="sn-card-head">
        <span className="sn-card-icon">{meta.icon}</span>
        <div>
          <b>{t(meta.label, meta.label)}</b>
          <small>{t(nutrient.nutrient_type, nutrient.nutrient_type)}</small>
        </div>
        {dominant && (
          <span className="sn-level-badge" style={{ background: LEVEL_BG[dominant] || '#f1f5f9', color: LEVEL_TEXT[dominant] || '#334155' }}>
            {t(dominant, dominant)}
          </span>
        )}
      </div>

      <div className="sn-levels">
        {nutrient.levels.map(l => {
          const pct = total > 0 ? Math.round((l.sample_count / total) * 100) : 0
          return (
            <div key={l.level} className="sn-level-row">
              <span className="sn-level-name">{t(l.level, l.level)}</span>
              <div className="sn-level-bar-track">
                <div className="sn-level-bar-fill" style={{ width: `${pct}%`, background: LEVEL_BAR[l.level] || '#94a3b8' }} />
              </div>
              <span className="sn-level-count">{l.sample_count} ({pct}%)</span>
            </div>
          )
        })}
      </div>

      {guidance && crop && (
        <div className="sn-guidance">
          <span>🌾 {t(crop, crop)} {t('guidance', 'guidance')}</span>
          <p>{t(guidance, guidance)}</p>
        </div>
      )}
    </div>
  )
}

// ── Dropdown helper ────────────────────────────────────────────────────────
function Sel({ label, value, onChange, options, disabled, placeholder }) {
  const { t, language } = useLanguage()
  return (
    <div className="field">
      <span>{t(label, label)}</span>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled || !options.length}>
        <option value="">{placeholder ? t(placeholder, placeholder) : `${t('Select')} ${t(label.toLowerCase())}`}</option>
        {options.map(o => <option key={o} value={o}>{localizeLocationName(o, language)}</option>)}
      </select>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function SoilLayer({ crop, userState = '', userDistrict = '', userVillage = '' }) {
  const { t, language } = useLanguage()
  const [dbStatus,    setDbStatus]    = useState(null)
  const [states,      setStates]      = useState([])
  const [districts,   setDistricts]   = useState([])
  const [blocks,      setBlocks]      = useState([])
  const [villages,    setVillages]    = useState([])

  const [selState,    setSelState]    = useState('')
  const [selDistrict, setSelDistrict] = useState('')
  const [selBlock,    setSelBlock]    = useState('')
  const [selVillage,  setSelVillage]  = useState('')

  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Loading flags for each cascade level
  const [loadingS, setLoadingS] = useState(false)
  const [loadingD, setLoadingD] = useState(false)
  const [loadingB, setLoadingB] = useState(false)
  const [loadingV, setLoadingV] = useState(false)


  const loadSampleSoil = async () => {
    const sampleState = 'Tamil Nadu'
    const sampleDistrict = 'Thiruvallur'
    const sampleBlock = 'Ellapuram'
    const sampleVillage = 'Agaram2'
    setSelState(sampleState)
    setSelDistrict(sampleDistrict)
    setSelBlock(sampleBlock)
    setSelVillage(sampleVillage)
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const [dList, bList, vList] = await Promise.all([
        apiGet(`/api/soil/districts?state=${encodeURIComponent(sampleState)}`),
        apiGet(`/api/soil/blocks?state=${encodeURIComponent(sampleState)}&district=${encodeURIComponent(sampleDistrict)}`),
        apiGet(`/api/soil/villages?state=${encodeURIComponent(sampleState)}&district=${encodeURIComponent(sampleDistrict)}&block=${encodeURIComponent(sampleBlock)}`),
      ])
      if (dList.districts) setDistricts(dList.districts)
      if (bList.blocks) setBlocks(bList.blocks)
      if (vList.villages) setVillages(vList.villages)
      const nut = await apiGet(`/api/soil/nutrients?state=${encodeURIComponent(sampleState)}&district=${encodeURIComponent(sampleDistrict)}&block=${encodeURIComponent(sampleBlock)}&village=${encodeURIComponent(sampleVillage)}&language=${encodeURIComponent(language || 'en')}`)
      setResult(nut)
    } catch (e) {
      setError(e.message || 'Failed to load sample soil data.')
    } finally {
      setLoading(false)
    }
  }

  const loadGeminiSoil = async (stateVal, distVal, blockVal, villVal) => {
    const s = stateVal || selState || userState || 'Tamil Nadu'
    const d = distVal || selDistrict || userDistrict || 'Thiruvallur'
    const b = blockVal || selBlock || 'Ponneri'
    const v = villVal || selVillage || userVillage || 'Ponneri'
    if (!selState && s) setSelState(s)
    if (!selDistrict && d) setSelDistrict(d)
    if (!selBlock && b) setSelBlock(b)
    if (!selVillage && v) setSelVillage(v)
    setLoading(true)
    setError('')
    try {
      const data = await apiGet(`/api/soil/gemini-estimate?state=${encodeURIComponent(s)}&district=${encodeURIComponent(d)}&block=${encodeURIComponent(b)}&village=${encodeURIComponent(v)}&crop=${encodeURIComponent(crop || 'Paddy')}&language=${encodeURIComponent(language || 'en')}`)
      if (data && data.nutrients) {
        setResult(data)
      } else {
        throw new Error('Could not generate Gemini soil response')
      }
    } catch (e) {
      setError(e.message || 'Failed to generate Gemini soil analysis.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 1: check DB, load states ──────────────────────────────────────
  useEffect(() => {
    apiGet('/api/soil/status')
      .then(s => {
        setDbStatus(s)
        if (s.db_ready) {
          setLoadingS(true)
          apiGet('/api/soil/states')
            .then(d => setStates(d.states || []))
            .catch(() => {})
            .finally(() => setLoadingS(false))
        }
      })
      .catch(() => setDbStatus({ available: false, db_ready: false }))
  }, [])

  // ── Step 2: pre-fill from user's form inputs once states are loaded ────
  useEffect(() => {
    if (!states.length || !userState) return
    // Find best matching state (case-insensitive fuzzy)
    const norm = s => s.toLowerCase().replace(/\s+/g, '')
    const match = states.find(s => norm(s) === norm(userState)) ||
                  states.find(s => norm(s).includes(norm(userState)) || norm(userState).includes(norm(s)))
    if (match) setSelState(match)
  }, [states, userState])

  // ── Step 3: when state is set, load districts and try to match district ─
  useEffect(() => {
    if (!selState) { setDistricts([]); setSelDistrict(''); setBlocks([]); setSelBlock(''); setVillages([]); setSelVillage(''); setResult(null); return }
    setLoadingD(true)
    apiGet(`/api/soil/districts?state=${encodeURIComponent(selState)}`)
      .then(d => {
        const list = d.districts || []
        setDistricts(list)
        // Auto-match the user's district
        if (userDistrict) {
          const norm = s => s.toLowerCase().replace(/\s+/g, '')
          const match = list.find(s => norm(s) === norm(userDistrict)) ||
                        list.find(s => norm(s).includes(norm(userDistrict)) || norm(userDistrict).includes(norm(s)))
          if (match) setSelDistrict(match)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingD(false))
  }, [selState, userDistrict]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 4: when district set, load blocks and auto-resolve village block ─
  useEffect(() => {
    if (!selState || !selDistrict) { setBlocks([]); setSelBlock(''); setVillages([]); setSelVillage(''); setResult(null); return }
    setLoadingB(true)
    apiGet(`/api/soil/blocks?state=${encodeURIComponent(selState)}&district=${encodeURIComponent(selDistrict)}`)
      .then(d => {
        const list = d.blocks || []
        setBlocks(list)
      })
      .catch(() => {})
      .finally(() => setLoadingB(false))

    if (userVillage) {
      apiGet(`/api/soil/find-block?state=${encodeURIComponent(selState)}&district=${encodeURIComponent(selDistrict)}&village=${encodeURIComponent(userVillage)}`)
        .then(res => {
          if (res && res.block) {
            setSelBlock(res.block)
          }
        })
        .catch(() => {})
    }
  }, [selState, selDistrict, userVillage])

  // ── Step 5: load villages (by block if selected, or for entire district) ──
  useEffect(() => {
    if (!selState || !selDistrict) { setVillages([]); setSelVillage(''); setResult(null); return }
    setLoadingV(true)
    const url = `/api/soil/villages?state=${encodeURIComponent(selState)}&district=${encodeURIComponent(selDistrict)}${selBlock ? `&block=${encodeURIComponent(selBlock)}` : ''}`
    apiGet(url)
      .then(d => {
        const list = d.villages || []
        setVillages(list)
        // Auto-match user's village
        if (userVillage && !selVillage) {
          const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '')
          const uvNorm = norm(userVillage)
          const match = list.find(s => norm(s) === uvNorm) ||
                        list.find(s => norm(s).startsWith(uvNorm) || uvNorm.startsWith(norm(s))) ||
                        list.find(s => norm(s).includes(uvNorm) || uvNorm.includes(norm(s)))
          if (match) {
            setSelVillage(match)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingV(false))
  }, [selState, selDistrict, selBlock, userVillage])

  const handleStateChange = (v) => {
    setSelState(v)
    setSelDistrict('')
    setSelBlock('')
    setSelVillage('')
    setResult(null)
  }

  const handleDistrictChange = (v) => {
    setSelDistrict(v)
    setSelBlock('')
    setSelVillage('')
    setResult(null)
  }

  const handleBlockChange = (v) => {
    setSelBlock(v)
    setSelVillage('')
    setResult(null)
  }

  const handleVillageChange = async (v) => {
    setSelVillage(v)
    if (v && !selBlock && selState && selDistrict) {
      try {
        const res = await apiGet(`/api/soil/find-block?state=${encodeURIComponent(selState)}&district=${encodeURIComponent(selDistrict)}&village=${encodeURIComponent(v)}`)
        if (res && res.block) {
          setSelBlock(res.block)
        }
      } catch (e) {
        // ignore
      }
    }
  }

  // ── Step 6: fetch nutrients when block or village is selected ─────────
  useEffect(() => {
    if (!selState || !selDistrict) return
    if (!selBlock && !selVillage) return

    let activeBlock = selBlock
    let isCancelled = false
    const fetchNutrients = async () => {
      setLoading(true); setError(''); setResult(null)
      try {
        if (!activeBlock && selVillage) {
          const fb = await apiGet(`/api/soil/find-block?state=${encodeURIComponent(selState)}&district=${encodeURIComponent(selDistrict)}&village=${encodeURIComponent(selVillage)}`)
          if (fb && fb.block) {
            activeBlock = fb.block
            if (!isCancelled) setSelBlock(fb.block)
          }
        }

        if (selVillage && activeBlock) {
          const nut = await apiGet(`/api/soil/nutrients?state=${encodeURIComponent(selState)}&district=${encodeURIComponent(selDistrict)}&block=${encodeURIComponent(activeBlock)}&village=${encodeURIComponent(selVillage)}&language=${encodeURIComponent(language || 'en')}`)
          if (!isCancelled) setResult(nut)
        } else if (activeBlock) {
          const bSummary = await apiGet(`/api/soil/block-summary?state=${encodeURIComponent(selState)}&district=${encodeURIComponent(selDistrict)}&block=${encodeURIComponent(activeBlock)}&language=${encodeURIComponent(language || 'en')}`)
          if (!isCancelled) setResult(bSummary)
        }
      } catch (e) {
        try {
          const aiData = await apiGet(`/api/soil/gemini-estimate?state=${encodeURIComponent(selState)}&district=${encodeURIComponent(selDistrict)}&block=${encodeURIComponent(activeBlock || 'Ponneri')}&village=${encodeURIComponent(selVillage || 'Ponneri')}&crop=${encodeURIComponent(crop || 'Paddy')}&language=${encodeURIComponent(language || 'en')}`)
          if (!isCancelled && aiData && aiData.nutrients) {
            setResult(aiData)
            return
          }
        } catch {
          // continue
        }
        if (!isCancelled) setError(e.message || 'Failed to load soil data.')
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }
    fetchNutrients()
    return () => { isCancelled = true }
  }, [selState, selDistrict, selBlock, selVillage, language])

  // ── DB not ready ───────────────────────────────────────────────────────
  if (!dbStatus) return <div className="sn-state sn-loading"><Loader size={20} className="ch2-spin"/><p>{t("Checking soil database…", "Checking soil database…")}</p></div>
  if (!dbStatus.db_ready && !result) return (
    <div className="sn-state sn-unavail" style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center', padding: '28px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>🌱</span>
        <div>
          <b>{t("Soil database building…", "Soil database building…")}</b>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
            {t("The offline soil nutrient index is being built. You can generate immediate soil diagnostics with Gemini AI.", "The offline soil nutrient index is being built. You can generate immediate soil diagnostics with Gemini AI.")}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => loadGeminiSoil()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 22px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
        }}
      >
        <Sparkles size={16}/>
        {t("✨ Generate with Gemini AI", "✨ Generate with Gemini AI")}
      </button>
    </div>
  )

  const macro = result?.nutrients?.filter(n => n.nutrient_type === 'Macro') || []
  const micro = result?.nutrients?.filter(n => n.nutrient_type === 'Micro') || []
  const hasResult = result && !loading

  return (
    <div className="sn-root">
      {/* Header */}
      <div className="sn-header">
        <span className={`ch2-kind-badge ${result?.ai_generated ? '' : 'ch2-kind-measured'}`} style={result?.ai_generated ? { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' } : {}}>
          {result?.ai_generated ? `✨ ${result.source || 'GEMINI AI INTELLIGENCE'}` : t("REAL DATA", "REAL DATA")}
        </span>
        <span className="sn-header-source">
          {result?.ai_generated ? `${t('AI Soil Intelligence', 'AI Soil Intelligence')} · ${result.crop || crop || 'Paddy'} · ${result.location?.district || userDistrict || 'Thiruvallur'}` : `${t("Soil Health Card", "Soil Health Card")} · ${t("India Data Portal", "India Data Portal")} · ${dbStatus.total_rows?.toLocaleString()} ${t("records", "records")} · ${dbStatus.years?.join(', ')}`}
        </span>
      </div>

      
      {/* Prominent Sample Data Banner for Soil Health Card */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '11px 15px',
        marginBottom: 14,
        background: 'linear-gradient(135deg, #f0fdf4 0%, #e8f5e9 100%)',
        border: '1px solid #bbf7d0',
        borderRadius: 8,
        flexWrap: 'wrap',
        gap: 10
      }}>
        <div>
          <div style={{ fontSize: 13, color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✨ {t('Soil Health Card & AI Intelligence', 'Soil Health Card & AI Intelligence')}</span>
          </div>
          <div style={{ fontSize: 12, color: '#4b7355', marginTop: 2 }}>
            {t('Tamil Nadu · Thiruvallur · Ponneri / Ellapuram · 12 macro/micro nutrients with Gemini AI', 'Tamil Nadu · Thiruvallur · Ponneri / Ellapuram · 12 macro/micro nutrients with Gemini AI')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => loadGeminiSoil()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(59,130,246,0.25)',
            }}
            title={t("Generate AI soil assessment for this location using Gemini", "Generate AI soil assessment for this location using Gemini")}
          >
            <Sparkles size={15}/>
            {t('✨ Generate with Gemini AI', '✨ Generate with Gemini AI')}
          </button>
          <button
            type="button"
            onClick={loadSampleSoil}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(16,185,129,0.25)',
            }}
            title={t("Load official Soil Health Card sample data for Agaram2, Thiruvallur", "Load official Soil Health Card sample data for Agaram2, Thiruvallur")}
          >
            <Sparkles size={15}/>
            {t('✨ Load Sample Soil Health Card', '✨ Load Sample Soil Health Card')}
          </button>
        </div>
      </div>

      {/* Gemini AI Diagnostic Summary Card */}
      {result?.ai_summary && (
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          padding: '13px 16px',
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{t('Gemini AI Soil Diagnostic Summary', 'Gemini AI Soil Diagnostic Summary')}</span>
              {result.soil_type && <span style={{ fontSize: 11, background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: 4 }}>{result.soil_type}</span>}
              {result.suitability_score && <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 4 }}>{result.suitability_score}% {t('Suitability', 'Suitability')}</span>}
            </div>
            <div style={{ fontSize: 13, color: '#334155', marginTop: 4, lineHeight: 1.5 }}>
              {result.ai_summary}
            </div>
            {result.crop_guidance && (
              <div style={{ fontSize: 12, color: '#15803d', marginTop: 6, fontWeight: 600 }}>
                💡 {result.crop_guidance}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location selector — pre-filled from user's form, editable if needed */}
      <div className="sn-selector">
        <div className="sn-selector-note">
          <ShieldCheck size={13}/>
          <span>
            {selState && selDistrict
              ? `${t("Location pre-filled from your field details.", "Location pre-filled from your field details.")} ${(!selVillage) ? t("Select a block and village to load soil data.", "Select a block and village to load soil data.") : ''}`
              : t("Select your state, district, block and village to view soil nutrient data.", "Select your state, district, block and village to view soil nutrient data.")}
          </span>
        </div>
        <div className="sn-selector-grid">
          <Sel label="State"    value={selState}    onChange={handleStateChange}    options={states}    disabled={loadingS} placeholder={loadingS ? t('Loading…', 'Loading…') : t('Select state', 'Select state')} />
          <Sel label="District" value={selDistrict} onChange={handleDistrictChange} options={districts} disabled={loadingD || !selState}    placeholder={loadingD ? t('Loading…', 'Loading…') : !selState ? t('Select state first', 'Select state first') : t('Select district', 'Select district')} />
          <Sel label="Block"    value={selBlock}    onChange={handleBlockChange}    options={blocks}    disabled={loadingB || !selDistrict} placeholder={loadingB ? t('Loading…', 'Loading…') : !selDistrict ? t('Select district first', 'Select district first') : t('Select block', 'Select block')} />
          <Sel label="Village"  value={selVillage}  onChange={handleVillageChange}  options={villages}  disabled={loadingV || !selDistrict || !villages.length}    placeholder={loadingV ? t('Loading…', 'Loading…') : !selDistrict ? t('Select district first', 'Select district first') : t('Select village', 'Select village')} />
        </div>
      </div>

      {/* Loading / error */}
      {loading && <div className="sn-state sn-loading"><Loader size={20} className="ch2-spin"/><p>{t('Loading soil nutrients for', 'Loading soil nutrients for')} {localizeLocationName(selVillage, language)}…</p></div>}
      {error && !loading && <div className="sn-state sn-error"><p>{t(error, error)}</p></div>}

      {/* Prompt to select village if auto-fill only got state/district */}
      {!loading && !error && !result && selDistrict && !selVillage && (
        <div className="sn-state sn-empty" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <span>📍</span>
          <p>{t("Select a block and village to load soil nutrient data for your area.", "Select a block and village to load soil nutrient data for your area.")}</p>
          <button
            type="button"
            onClick={() => loadGeminiSoil()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 4
            }}
          >
            <Sparkles size={14}/>
            {t("✨ Analyze Soil with Gemini AI", "✨ Analyze Soil with Gemini AI")}
          </button>
        </div>
      )}

      {/* No match found for user's details */}
      {!loading && !error && !result && selState && !selDistrict && !loadingD && (
        <div className="sn-state sn-empty">
          <span>🗺️</span>
          <p>{t('Select your state, district, block and village to view soil nutrient data.')}</p>
          <small>
            {t('Data covers')} {dbStatus.villages?.toLocaleString()} {t('villages across')} {dbStatus.states} {t('states · 2024-25')}
          </small>
        </div>
      )}

      {/* If genuine government data is unavailable for this location */}
      {hasResult && result.available === false && (
        <div className="sn-state sn-unavail" style={{ margin: '16px 0', padding: '20px', background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a' }}>
          <span style={{ fontSize: 24 }}>ℹ️</span>
          <div>
            <b style={{ color: '#92400e', display: 'block', marginBottom: 4 }}>
              {t("Official Soil Data Unavailable for Selected Location", "Official Soil Data Unavailable for Selected Location")}
            </b>
            <p style={{ color: '#78350f', margin: 0, fontSize: 13, lineHeight: 1.5 }}>
              {t(result.reason || "No Soil Health Card survey records found for this specific location. Official government data has not been published for this village/block.", "No Soil Health Card survey records found for this specific location. Official government data has not been published for this village/block.")}
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {hasResult && result.available !== false && (
        <>
          {/* Location bar */}
          <div className="sn-result-head">
            <div>
              <span className="ch2-eyebrow">
                {result.level === 'block' ? t('BLOCK-LEVEL SUMMARY') : t('VILLAGE-LEVEL DATA')} · {t('SOIL HEALTH CARD 2024-25')}
              </span>
              <b>
                {result.level === 'village'
                  ? `${localizeLocationName(result.location?.village, language)}, ${localizeLocationName(result.location?.block, language)}, ${localizeLocationName(result.location?.district, language)}, ${localizeLocationName(result.location?.state, language)}`
                  : `${localizeLocationName(result.block, language)}, ${localizeLocationName(result.district, language)}`}
              </b>
            </div>
            {result.fallback_note && <div className="sn-fallback-note">⚠ {t(result.fallback_note, result.fallback_note)}</div>}
          </div>

          {/* Interpretation note */}
          <div className="sn-interp-banner">
            <ShieldCheck size={13}/>
            <span>{t(result.value_interpretation, result.value_interpretation).replace(/'sample_count'/g, `'${t('sample count', 'Sample Count')}'`)}</span>
          </div>

          {/* Macro nutrients */}
          {macro.length > 0 && (
            <div className="sn-section">
              <div className="sn-section-label">{t('MACRO NUTRIENTS')}</div>
              <div className="sn-grid">
                {macro.map(n => <NutrientCard key={n.nutrient_name} nutrient={n} crop={crop} />)}
              </div>
            </div>
          )}

          {/* Micro nutrients */}
          {micro.length > 0 && (
            <div className="sn-section">
              <div className="sn-section-label">{t('MICRO NUTRIENTS')}</div>
              <div className="sn-grid">
                {micro.map(n => <NutrientCard key={n.nutrient_name} nutrient={n} crop={crop} />)}
              </div>
            </div>
          )}


        </>
      )}
    </div>
  )
}
