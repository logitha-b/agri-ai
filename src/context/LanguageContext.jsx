// src/context/LanguageContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import i18n from '../i18n'
import { LANGUAGES, translations, phraseTranslations } from '../i18n/translations'
import { domTranslator } from '../utils/domTranslator'
import { LOCALE_MAP, formatNumber as fmtNumber, formatCurrency as fmtCurrency, formatPercent as fmtPercent, formatDate as fmtDate } from '../utils/localeFormat'
import { resolveCanonicalKey, localizeText } from '../services/contentLocalization'
import { REVERSE_DICT } from '../i18n/reverseDict'
import { transliterateIndic, transliterateMixedText } from '../utils/transliterate'

const LanguageContext = createContext(null)
const STORAGE_KEY = 'agri_platform_selected_language'

export { REVERSE_DICT }

export function LanguageProvider({ children }) {
  const [langVersion, setLangVersion] = useState(0)
  const latestRequestId = useRef(0)
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && LANGUAGES.some(l => l.code === saved.toLowerCase().trim())) {
        const clean = saved.toLowerCase().trim()
        if (i18n.language !== clean) {
          i18n.changeLanguage(clean)
        }
        return clean
      }
      if (i18n.language && LANGUAGES.some(l => l.code === i18n.language)) {
        return i18n.language
      }
    } catch (e) {
      // ignore
    }
    return 'en'
  })

  const currentDomLang = useRef(null)

  const languageInfo = useMemo(() => {
    const langObj = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]
    const localeMap = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      ml: 'ml-IN',
      kn: 'kn-IN',
      pa: 'pa-IN',
      or: 'or-IN'
    }
    return {
      language,
      language_code: language,
      language_name: langObj.name,
      native_name: langObj.native,
      locale: localeMap[language] || 'en-IN'
    }
  }, [language])

  const applyDomLanguage = useCallback((targetLang) => {
    if (!targetLang || currentDomLang.current === targetLang) return
    currentDomLang.current = targetLang
    domTranslator.setLanguage(targetLang)
  }, [])

  const targetLanguageRef = useRef(language)

  const setLanguage = useCallback((code) => {
    if (!code) return
    const valid = LANGUAGES.find(l => l.code === code.toLowerCase())
    const nextLang = valid ? valid.code : 'en'
    
    // Monotonic request ID sequencing to prevent race conditions on rapid switching
    const requestId = ++latestRequestId.current
    targetLanguageRef.current = nextLang
    
    setLanguageState(nextLang)
    setLangVersion(v => v + 1)
    
    try {
      localStorage.setItem(STORAGE_KEY, nextLang)
    } catch (e) {
      // ignore
    }
    
    applyDomLanguage(nextLang)

    i18n.changeLanguage(nextLang).then(() => {
      // If a newer request was dispatched while this was resolving, ignore this stale resolution
      if (latestRequestId.current !== requestId) return
    }).catch(err => {
      console.warn('i18n.changeLanguage error:', err)
    })
  }, [applyDomLanguage])

  // Synchronize with i18n languageChanged event
  useEffect(() => {
    const handleLanguageChanged = (newLng) => {
      if (!newLng) return
      const valid = LANGUAGES.find(l => l.code === newLng.toLowerCase())
      // Only apply if matching current target to prevent stale async events reverting language
      if (valid && valid.code === targetLanguageRef.current && valid.code !== language) {
        setLanguageState(valid.code)
        setLangVersion(v => v + 1)
        applyDomLanguage(valid.code)
      }
    }
    i18n.on('languageChanged', handleLanguageChanged)
    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [language, applyDomLanguage])

  useEffect(() => {
    applyDomLanguage(language)
  }, [language, applyDomLanguage])

  const formatNumber = useCallback((v, opt) => fmtNumber(v, language, opt), [language])
  const formatCurrency = useCallback((v, maxDec = 0) => fmtCurrency(v, language, maxDec), [language])
  const formatPercent = useCallback((v, maxDec = 1) => fmtPercent(v, language, maxDec), [language])
  const formatDate = useCallback((v, opt) => fmtDate(v, language, opt), [language])

  // Enhanced helper translation function
  const t = useCallback((keyOrPhrase, defaultText = '') => {
    if (!keyOrPhrase) return defaultText
    if (typeof keyOrPhrase !== 'string') return defaultText || String(keyOrPhrase)

    const raw = keyOrPhrase.trim()
    if (!raw) return defaultText

    // Check if trailing asterisk or colon
    let base = raw
    let suffix = ''
    if (base.endsWith('*')) {
      suffix = ' *'
      base = base.slice(0, -1).trim()
    } else if (base.endsWith(':')) {
      suffix = ':'
      base = base.slice(0, -1).trim()
    }

    // When language is English, return the English phrase
    if (!language || language === 'en') {
      if (i18n.getResource) {
        const i18nVal = i18n.getResource('en', 'translation', raw)
        if (i18nVal) return i18nVal
        const i18nBaseVal = i18n.getResource('en', 'translation', base)
        if (i18nBaseVal) return i18nBaseVal + suffix
      }
      const enDict = translations.en || {}
      const pEnDict = phraseTranslations.en || {}
      if (enDict[raw] !== undefined) return enDict[raw]
      if (pEnDict[raw] !== undefined) return pEnDict[raw]
      if (enDict[base] !== undefined) return enDict[base] + suffix
      if (pEnDict[base] !== undefined) return pEnDict[base] + suffix

      const lower = base.toLowerCase()
      if (REVERSE_DICT[lower]) {
        return REVERSE_DICT[lower] + suffix
      }
      if (REVERSE_DICT[base]) {
        return REVERSE_DICT[base] + suffix
      }

      const canonical = resolveCanonicalKey(base)
      if (canonical && !/[\u0900-\u0D7F]/.test(canonical) && canonical !== base) {
        return canonical + suffix
      }

      if (defaultText && typeof defaultText === 'string') {
        return defaultText + suffix
      }
      return base + suffix
    }

    const langDict = translations[language] || translations.en || {}
    const pDict = phraseTranslations[language] || phraseTranslations.en || {}

    // 0. i18next direct resource lookup
    if (i18n.getResource) {
      const i18nVal = i18n.getResource(language, 'translation', raw)
      if (i18nVal) return i18nVal
      const i18nBaseVal = i18n.getResource(language, 'translation', base)
      if (i18nBaseVal) return i18nBaseVal + suffix
    }

    // 1. Direct match
    if (langDict[raw] !== undefined) return langDict[raw]
    if (pDict[raw] !== undefined) return pDict[raw]

    // 2. Base match
    if (langDict[base] !== undefined) return langDict[base] + suffix
    if (pDict[base] !== undefined) return pDict[base] + suffix

    // 3. Case-insensitive match
    const baseLower = base.toLowerCase()
    for (const [k, v] of Object.entries(pDict)) {
      if (k.toLowerCase() === baseLower) {
        return v + suffix
      }
    }
    for (const [k, v] of Object.entries(langDict)) {
      if (k.toLowerCase() === baseLower) {
        return v + suffix
      }
    }

    // 4. Specific multi-segment dynamic patterns
    const sownMatch = base.match(/^Sown:\s*([^·]+)\s*·\s*Report date:\s*(.+)$/i)
    if (sownMatch) {
      const sownWord = langDict['Sown'] || pDict['Sown'] || 'Sown'
      const repWord = langDict['Report date'] || pDict['Report date'] || 'Report date'
      return `${sownWord}: ${sownMatch[1].trim()} · ${repWord}: ${sownMatch[2].trim()}${suffix}`
    }

    const dayMatch = base.match(/^Day\s+(\d+)\s+of\s+(\d+)$/i)
    if (dayMatch) {
      const [, d, tot] = dayMatch
      const dayWord = langDict['Day'] || pDict['Day'] || 'Day'
      const ofWord = langDict['of'] || pDict['of'] || '/'
      return `${dayWord} ${d} ${ofWord} ${tot}${suffix}`
    }

    // Pattern matches for dynamic statements with simple single prefixes
    if (base.includes(':') && !base.includes('\n')) {
      const colonIdx = base.indexOf(':')
      const prefix = base.slice(0, colonIdx).trim()
      const rest = base.slice(colonIdx + 1).trim()
      if (prefix.length <= 35 && !prefix.includes('.')) {
        const pTrans = langDict[prefix] || pDict[prefix]
        if (pTrans) {
          let localizedRest = rest
          if (langDict[rest]) {
            localizedRest = langDict[rest]
          } else if (pDict[rest]) {
            localizedRest = pDict[rest]
          } else if (language && language !== 'en' && /[a-zA-Z]/.test(rest)) {
            localizedRest = transliterateMixedText(rest, language, langDict, pDict)
          }
          return `${pTrans}: ${localizedRest}${suffix}`
        }
      }
    }
    // 5. If keyOrPhrase was already localized in another language, resolve via canonical resolver or reverse dict
    const canonical = resolveCanonicalKey(base)
    if (canonical && canonical !== base) {
      if (i18n.getResource) {
        const val = i18n.getResource(language, 'translation', canonical)
        if (val) return val + suffix
      }
      if (langDict[canonical] !== undefined) return langDict[canonical] + suffix
      if (pDict[canonical] !== undefined) return pDict[canonical] + suffix
    }

    const revEnKey = REVERSE_DICT[base] || REVERSE_DICT[baseLower]
    if (revEnKey) {
      if (i18n.getResource) {
        const val = i18n.getResource(language, 'translation', revEnKey)
        if (val) return val + suffix
      }
      if (langDict[revEnKey] !== undefined) return langDict[revEnKey] + suffix
      if (pDict[revEnKey] !== undefined) return pDict[revEnKey] + suffix
      if (language && language !== 'en') {
        return transliterateMixedText(revEnKey, language, langDict, pDict) + suffix
      }
      return revEnKey + suffix
    }

    // 6. If not found by key, try looking up defaultText
    if (defaultText && typeof defaultText === 'string') {
      const defRaw = defaultText.trim()
      let defBase = defRaw
      let defSuffix = ''
      if (defBase.endsWith('*')) {
        defSuffix = ' *'
        defBase = defBase.slice(0, -1).trim()
      } else if (defBase.endsWith(':')) {
        defSuffix = ':'
        defBase = defBase.slice(0, -1).trim()
      }
      if (langDict[defRaw] !== undefined) return langDict[defRaw]
      if (pDict[defRaw] !== undefined) return pDict[defRaw]
      if (langDict[defBase] !== undefined) return langDict[defBase] + defSuffix
      if (pDict[defBase] !== undefined) return pDict[defBase] + defSuffix

      const defLower = defBase.toLowerCase()
      for (const [k, v] of Object.entries(pDict)) {
        if (k.toLowerCase() === defLower) return v + defSuffix
      }
      for (const [k, v] of Object.entries(langDict)) {
        if (k.toLowerCase() === defLower) return v + defSuffix
      }
    }

    // Safety guard against showing wrong Indic script:
    // If keyOrPhrase has non-English Indic script, try resolving to canonical English,
    // and if still no translation found for the active language, return the canonical English
    // rather than rendering text from an unintended language!
    if (/[\u0900-\u0D7F]/.test(raw)) {
      const canonical = resolveCanonicalKey(base) || REVERSE_DICT[base] || REVERSE_DICT[baseLower]
      if (canonical && !/[\u0900-\u0D7F]/.test(canonical)) {
        if (i18n.getResource) {
          const val = i18n.getResource(language, 'translation', canonical)
          if (val) return val + suffix
        }
        if (langDict[canonical] !== undefined) return langDict[canonical] + suffix
        if (pDict[canonical] !== undefined) return pDict[canonical] + suffix
        if (language && language !== 'en') {
          return transliterateMixedText(canonical, language, langDict, pDict) + suffix
        }
        return canonical + suffix
      }
    }

    // Dynamic transliteration fallback when language is Indic and text contains English
    if (language && language !== 'en') {
      const textToTranslit = defaultText || base
      if (textToTranslit && typeof textToTranslit === 'string' && /[a-zA-Z]/.test(textToTranslit)) {
        return transliterateMixedText(textToTranslit, language, langDict, pDict) + suffix
      }
    }

    return defaultText || keyOrPhrase
  }, [language])

  const contextValue = useMemo(() => ({
    language,
    langVersion,
    languageInfo,
    setLanguage,
    t,
    languages: LANGUAGES,
    formatNumber,
    formatCurrency,
    formatPercent,
    formatDate,
    retranslate: () => domTranslator.retranslate()
  }), [language, langVersion, languageInfo, setLanguage, t, formatNumber, formatCurrency, formatPercent, formatDate])

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    return {
      language: 'en',
      langVersion: 0,
      languageInfo: { language: 'en', language_code: 'en', language_name: 'English', native_name: 'English', locale: 'en-IN' },
      setLanguage: () => {},
      t: (k, d = '') => d || k,
      languages: LANGUAGES,
      formatNumber: (v, opt) => fmtNumber(v, 'en', opt),
      formatCurrency: (v, maxDec) => fmtCurrency(v, 'en', maxDec),
      formatPercent: (v, maxDec) => fmtPercent(v, 'en', maxDec),
      formatDate: (v, opt) => fmtDate(v, 'en', opt),
      retranslate: () => {}
    }
  }
  return context
}
