const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '')).replace(/\/+$/, '')

function getActiveLanguage() {
  try {
    return localStorage.getItem('agri_platform_selected_language') || 'en'
  } catch {
    return 'en'
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
  } catch {
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

export const getSchemes = () => request('/schemes')
export const getScheme = schemeId => request(`/schemes/${encodeURIComponent(schemeId)}`)
export const getModelInfo = () => request('/model-info')
export const getOutcomeSample = () => request('/outcome-sample')
export const predictSchemes = profile => request('/predict-schemes', {
  method: 'POST',
  body: JSON.stringify(profile),
})
