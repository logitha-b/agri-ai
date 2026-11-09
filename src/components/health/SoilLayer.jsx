import { useEffect, useState } from 'react'
import { Loader, ShieldCheck, Sparkles } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { localizeLocationName } from '../../services/contentLocalization'

const API = (import.meta.env.VITE_CROP_HEALTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV && typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8003` : 'https://agri-ai-jnpi.onrender.com')).replace(/\/$/, '')

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

// ── Main component ─────────────────────────────────────────────────────────
export default function SoilLayer({ crop = 'Paddy', userState = 'Tamil Nadu', userDistrict = 'Thiruvallur', userVillage = 'Ponneri' }) {
  const { t, language } = useLanguage()
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const loadGeminiSoil = async (customState, customDistrict, customBlock, customVillage) => {
    const s = customState || userState || 'Tamil Nadu'
    const d = customDistrict || userDistrict || 'Thiruvallur'
    const b = customBlock || userVillage || 'Ponneri'
    const v = customVillage || userVillage || 'Ponneri'
    const c = crop || 'Paddy'

    setLoading(true)
    setError('')
    try {
      const data = await apiGet(`/api/soil/gemini-estimate?state=${encodeURIComponent(s)}&district=${encodeURIComponent(d)}&block=${encodeURIComponent(b)}&village=${encodeURIComponent(v)}&crop=${encodeURIComponent(c)}&language=${encodeURIComponent(language || 'en')}`)
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

  // Load soil intelligence via Gemini on mount or when crop/location changes
  useEffect(() => {
    loadGeminiSoil()
  }, [userState, userDistrict, userVillage, crop, language]) // eslint-disable-line react-hooks/exhaustive-deps

  const macro = result?.nutrients?.filter(n => n.nutrient_type === 'Macro') || []
  const micro = result?.nutrients?.filter(n => n.nutrient_type === 'Micro') || []
  const hasResult = result && !loading

  return (
    <div className="sn-root">
      {/* Header */}
      <div className="sn-header">
        <span className="ch2-kind-badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
          ✨ {result?.source || t("GEMINI AI INTELLIGENCE", "GEMINI AI INTELLIGENCE")}
        </span>
        <span className="sn-header-source">
          {`${t('AI Soil Intelligence', 'AI Soil Intelligence')} · ${crop || 'Paddy'} · ${userDistrict || 'Thiruvallur'}, ${userState || 'Tamil Nadu'}`}
        </span>
      </div>

      {/* Prominent Gemini AI Soil Intelligence Action Banner */}
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
            {`${userState || 'Tamil Nadu'} · ${userDistrict || 'Thiruvallur'} · ${userVillage || 'Ponneri'} · ${t('12 macro/micro nutrients with Gemini AI', '12 macro/micro nutrients with Gemini AI')}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => loadGeminiSoil()}
            disabled={loading}
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
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(59,130,246,0.25)',
            }}
            title={t("Generate AI soil assessment for this location using Gemini", "Generate AI soil assessment for this location using Gemini")}
          >
            <Sparkles size={15}/>
            {loading ? t('Generating with Gemini AI…', 'Generating with Gemini AI…') : t('✨ Generate with Gemini AI', '✨ Generate with Gemini AI')}
          </button>
          <button
            type="button"
            onClick={() => loadGeminiSoil()}
            disabled={loading}
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
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(16,185,129,0.25)',
            }}
            title={t("Load Soil Health Card data via Gemini AI", "Load Soil Health Card data via Gemini AI")}
          >
            <Sparkles size={15}/>
            {t('✨ Load Soil Health Card (Gemini AI)', '✨ Load Soil Health Card (Gemini AI)')}
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

      {/* Loading / error */}
      {loading && (
        <div className="sn-state sn-loading">
          <Loader size={20} className="ch2-spin"/>
          <p>{t('Generating soil nutrients with Gemini AI…', 'Generating soil nutrients with Gemini AI…')}</p>
        </div>
      )}
      {error && !loading && <div className="sn-state sn-error"><p>{t(error, error)}</p></div>}

      {/* Results */}
      {hasResult && result.available !== false && (
        <>
          {/* Location bar */}
          <div className="sn-result-head">
            <div>
              <span className="ch2-eyebrow">
                {t('GEMINI AI SOIL INTELLIGENCE')} · {t('SOIL HEALTH CARD 2024-25')}
              </span>
              <b>
                {`${localizeLocationName(result.location?.village || userVillage || 'Ponneri', language)}, ${localizeLocationName(result.location?.district || userDistrict || 'Thiruvallur', language)}, ${localizeLocationName(result.location?.state || userState || 'Tamil Nadu', language)}`}
              </b>
            </div>
            {result.fallback_note && <div className="sn-fallback-note">⚠ {t(result.fallback_note, result.fallback_note)}</div>}
          </div>

          {/* Interpretation note */}
          <div className="sn-interp-banner">
            <ShieldCheck size={13}/>
            <span>{t(result.value_interpretation || '12 dominant Soil Health Card nutrient parameters analyzed via Gemini AI & ICAR agronomic thresholds.', result.value_interpretation || '12 dominant Soil Health Card nutrient parameters analyzed via Gemini AI & ICAR agronomic thresholds.')}</span>
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
