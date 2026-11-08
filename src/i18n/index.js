// src/i18n/index.js
// Central internationalization engine powered by i18next + react-i18next
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE, FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES, STORAGE_KEY, getSavedLanguage } from './config.js'

// Import all 8 static translation bundles for 0ms zero-latency instant switching
import en from './locales/en/translation.json'
import hi from './locales/hi/translation.json'
import ta from './locales/ta/translation.json'
import te from './locales/te/translation.json'
import kn from './locales/kn/translation.json'
import ml from './locales/ml/translation.json'
import pa from './locales/pa/translation.json'
import or from './locales/or/translation.json'

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  ta: { translation: ta },
  te: { translation: te },
  kn: { translation: kn },
  ml: { translation: ml },
  pa: { translation: pa },
  or: { translation: or },
}

const initialLang = getSavedLanguage()

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: FALLBACK_LANGUAGE,
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes values safely
    },
    react: {
      useSuspense: false, // Prevent blank loading screens during translation switches
    },
    // Strong missing-translation protection: English is the default fallback
    saveMissing: true,
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[i18n missing key] lang="${lng}" ns="${ns}" key="${key}" -> using fallback "${fallbackValue}"`)
      }
    },
  })

// Sync language changes with localStorage and HTML document attributes
i18n.on('languageChanged', (lng) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, lng)
    }
    if (typeof document !== 'undefined') {
      const langObj = SUPPORTED_LANGUAGES.find(l => l.code === lng) || SUPPORTED_LANGUAGES[0]
      document.documentElement.lang = lng === 'en' ? 'en' : (langObj.locale || lng)
      document.documentElement.setAttribute('translate', 'no')
      document.documentElement.classList.add('notranslate')
      if (lng === 'en') {
        document.documentElement.classList.remove('translated-ltr', 'translated-rtl')
        document.body?.classList.remove('translated-ltr', 'translated-rtl')
      }
    }
  } catch (e) {
    // ignore
  }
})

export default i18n
export { i18n, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE }

