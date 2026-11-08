// src/i18n/config.js
// Internationalization configuration for Agri-Economic Intelligence Platform
// Supports 8 Indian languages with English fallback

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', locale: 'en-IN', tts: 'en-IN' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', locale: 'hi-IN', tts: 'hi-IN' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', locale: 'kn-IN', tts: 'kn-IN' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', locale: 'ta-IN', tts: 'ta-IN' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', locale: 'te-IN', tts: 'te-IN' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', locale: 'ml-IN', tts: 'ml-IN' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', locale: 'pa-IN', tts: 'pa-IN' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', locale: 'or-IN', tts: 'or-IN' },
]

export const DEFAULT_LANGUAGE = 'en'
export const FALLBACK_LANGUAGE = 'en'
export const STORAGE_KEY = 'agri_platform_selected_language'

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map(l => l.code)

export function isValidLanguage(code) {
  return typeof code === 'string' && LANGUAGE_CODES.includes(code.toLowerCase().trim())
}

export function getSavedLanguage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved && isValidLanguage(saved)) {
        return saved.toLowerCase().trim()
      }
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_LANGUAGE
}

