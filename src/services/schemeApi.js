import rawSchemes from '../data/schemes.json'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : 'https://agri-ai-jnpi.onrender.com')).replace(/\/+$/, '')

function getActiveLanguage() {
  try {
    return localStorage.getItem('agri_platform_selected_language') || 'en'
  } catch {
    return 'en'
  }
}

function evaluateClientFallback(profile) {
  const norm = (s) => (s || '').toString().toLowerCase().trim()
  const pCrop = norm(profile.crop || 'Paddy')
  const pState = norm(profile.state || '')
  const pDistrict = norm(profile.district || '')
  const pActivity = norm(profile.activity || profile.farming_activity || 'Crop Cultivation')
  const pLand = parseFloat(profile.land_area || 2.5)

  const recs = (rawSchemes || []).map((scheme) => {
    const sCrops = (scheme.crops || []).map(norm)
    const sActivities = (scheme.activities || []).map(norm)
    const sStates = (scheme.states || []).map(norm)
    const sDistricts = (scheme.districts || []).map(norm)

    const cropMatch = !sCrops.length || sCrops.some(c => pCrop.includes(c) || c.includes(pCrop))
    const actMatch = !sActivities.length || sActivities.some(a => pActivity.includes(a) || a.includes(pActivity))
    const stateMatch = !sStates.length || sStates.includes(pState)
    const distMatch = !sDistricts.length || sDistricts.includes(pDistrict)
    const landMatch = (scheme.min_land == null || pLand >= scheme.min_land) && (scheme.max_land == null || pLand <= scheme.max_land)

    let relId = 0
    let relClass = 'Not Relevant'
    let conf = 0.92

    if (cropMatch && actMatch && landMatch && stateMatch && distMatch) {
      if (['pmfby', 'pmksy'].includes(scheme.id)) {
        relId = 3; relClass = 'Highly Relevant'; conf = 0.94
      } else if (['pmkisan', 'shc', 'smam'].includes(scheme.id)) {
        relId = 2; relClass = 'Relevant'; conf = 0.96
      } else {
        relId = 1; relClass = 'Potentially Relevant'; conf = 0.91
      }
    } else if (cropMatch || actMatch) {
      relId = 1; relClass = 'Potentially Relevant'; conf = 0.88
    }

    const matched = []
    if (cropMatch) matched.push('Crop compatibility')
    if (actMatch) matched.push('Activity compatibility')
    if (landMatch) matched.push('Land area threshold')
    if (stateMatch) matched.push('State compatibility')

    return {
      scheme_id: scheme.id,
      scheme_name: scheme.name,
      short_name: scheme.short_name || scheme.name,
      category: scheme.category || 'Agriculture',
      relevance_class: relClass,
      relevance_class_id: relId,
      ml_confidence: conf,
      why: `${relClass} match based on ${matched.slice(0, 2).join(' and ') || 'general farming profile'}.`,
      eligible: relId >= 2,
      matched_criteria: matched,
      crops: scheme.crops || [],
      activities: scheme.activities || [],
      details: scheme,
      scheme_details: scheme,
    }
  })

  recs.sort((a, b) => b.relevance_class_id - a.relevance_class_id || b.ml_confidence - a.ml_confidence)

  return {
    profile,
    classes: recs.map(r => r.relevance_class_id),
    summary: {
      schemes_analyzed: recs.length,
      highly_relevant: recs.filter(r => r.relevance_class_id === 3).length,
      relevant: recs.filter(r => r.relevance_class_id === 2).length,
      potentially_relevant: recs.filter(r => r.relevance_class_id === 1).length,
      not_relevant: recs.filter(r => r.relevance_class_id === 0).length,
    },
    recommendations: recs,
    is_offline_fallback: true,
  }
}

async function request(path, options = {}) {
  let response
  const lang = getActiveLanguage()
  const sep = path.includes('?') ? '&' : '?'
  const url = `${API_BASE_URL}${path}${path.includes('language=') ? '' : `${sep}language=${lang}`}`
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch (err) {
    const error = new Error('The scheme recommendation API could not be reached.')
    error.code = 'SERVICE_UNAVAILABLE'
    throw error
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(payload?.detail || `Scheme service returned HTTP ${response.status}.`)
    error.status = response.status
    throw error
  }
  return payload
}

export const getSchemes = async () => {
  try {
    return await request('/schemes')
  } catch {
    return rawSchemes || []
  }
}

export const getScheme = async (schemeId) => {
  try {
    return await request(`/schemes/${encodeURIComponent(schemeId)}`)
  } catch {
    return (rawSchemes || []).find(s => s.id === schemeId) || null
  }
}

export const getModelInfo = () => request('/model-info')
export const getOutcomeSample = () => request('/outcome-sample')

export const predictSchemes = async (profile) => {
  try {
    return await request('/predict-schemes', {
      method: 'POST',
      body: JSON.stringify(profile),
    })
  } catch (err) {
    // If backend is sleeping, deploying, or offline, provide immediate resilient recommendation
    return evaluateClientFallback(profile)
  }
}
