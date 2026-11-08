// src/utils/domTranslator.js
// Safe DOM Language Coordination & Multilingual Auto-Translator
// Ensures HTML document attributes match the selected platform language
// and provides safe in-memory synchronous DOM translation for all UI text nodes.

import { SUPPORTED_LANGUAGES, getSavedLanguage } from '../i18n/config.js'
import { translations, phraseTranslations } from '../i18n/translations.js'
import { REVERSE_DICT } from '../i18n/reverseDict.js'
import { transliterateIndic, transliterateMixedText } from './transliterate.js'

let activeLang = getSavedLanguage() || 'en'
let pendingLang = null
let animationFrameId = null
let isTranslating = false
let observer = null

// WeakMap to track original English text for text nodes (strictly English only)
const originalTextMap = new WeakMap()

// Pre-indexed reverse lookup for Hindi text to English canonical key
const HINDI_REVERSE = {}
if (translations && translations.hi) {
  for (const [k, v] of Object.entries(translations.hi)) {
    if (typeof v === 'string' && v.trim()) {
      HINDI_REVERSE[v.trim()] = k
      HINDI_REVERSE[v.trim().toLowerCase()] = k
    }
  }
}
if (phraseTranslations && phraseTranslations.hi) {
  for (const [k, v] of Object.entries(phraseTranslations.hi)) {
    if (typeof v === 'string' && v.trim()) {
      HINDI_REVERSE[v.trim()] = k
      HINDI_REVERSE[v.trim().toLowerCase()] = k
    }
  }
}

// Pre-sort Hindi phrases by character length descending for accurate substring replacement
const HINDI_PHRASES = Object.keys(HINDI_REVERSE)
  .filter(k => k.length >= 2 && /[\u0900-\u097F]/.test(k))
  .sort((a, b) => b.length - a.length)

const SCRIPT_RANGES = {
  hi: /[\u0900-\u097F]/, // Devanagari
  ta: /[\u0B80-\u0BFF]/, // Tamil
  te: /[\u0C00-\u0C7F]/, // Telugu
  kn: /[\u0C80-\u0CFF]/, // Kannada
  ml: /[\u0D00-\u0D7F]/, // Malayalam
  pa: /[\u0A00-\u0A7F]/, // Gurmukhi (Punjabi)
  or: /[\u0B00-\u0B7F]/, // Odia
}

// Elements and classes to strictly avoid touching
const IGNORE_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'OPTION'
])

function shouldSkipNode(node) {
  if (!node || !node.parentElement) return true
  let el = node.parentElement
  while (el && el !== document.body) {
    if (IGNORE_TAGS.has(el.tagName)) return true
    if (el.classList && (el.classList.contains('notranslate-strict') || el.classList.contains('leaflet-container'))) {
      return true
    }
    el = el.parentElement
  }
  return false
}

function walkAndTranslate(targetLang) {
  if (typeof document === 'undefined' || !document.body) return
  if (isTranslating) return
  if (targetLang !== activeLang) return

  isTranslating = true
  try {
    const langDict = (translations && translations[targetLang]) || {}
    const phraseDict = (phraseTranslations && phraseTranslations[targetLang]) || {}

    // Use TreeWalker for fast text-node traversal
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(n) {
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_SKIP
          if (shouldSkipNode(n)) return NodeFilter.FILTER_REJECT
          return NodeFilter.FILTER_ACCEPT
        }
      }
    )

    let node
    while ((node = walker.nextNode())) {
      if (targetLang !== activeLang) break // Abort if user switched language mid-walk

      const currentVal = node.nodeValue
      const trimmed = currentVal.trim()
      if (!trimmed || trimmed.length < 2) continue

      // Ignore pure numbers/dates/punctuation/measurements
      if (/^[\d\s.,:;/%₹$#+\-–—()]+$/.test(trimmed)) continue

      if (targetLang === 'en') {
        // If target is English, restore original English text
        if (originalTextMap.has(node)) {
          const orig = originalTextMap.get(node)
          if (node.nodeValue !== orig) {
            node.nodeValue = orig
          }
        } else if (REVERSE_DICT && REVERSE_DICT[trimmed]) {
          const enText = REVERSE_DICT[trimmed]
          node.nodeValue = currentVal.replace(trimmed, enText)
        } else if (HINDI_REVERSE[trimmed]) {
          const enText = HINDI_REVERSE[trimmed]
          node.nodeValue = currentVal.replace(trimmed, enText)
        }
      } else {
        // Target is non-English (hi, ta, te, kn, ml, pa, or)

        // 1. If text is already in the target language script (and contains no Hindi when target is not Hindi)
        if (SCRIPT_RANGES[targetLang] && SCRIPT_RANGES[targetLang].test(trimmed)) {
          if (targetLang === 'hi' || !SCRIPT_RANGES.hi.test(trimmed)) {
            continue
          }
        }

        // 2. Identify English key (checking stored English or reverse dictionaries)
        let englishKey = null

        if (originalTextMap.has(node)) {
          const orig = originalTextMap.get(node)
          if (orig && !/[\u0900-\u0D7F]/.test(orig)) {
            englishKey = orig
          }
        }

        if (!englishKey) {
          if (langDict[trimmed] || phraseDict[trimmed]) {
            englishKey = trimmed
            if (!/[\u0900-\u0D7F]/.test(currentVal)) {
              originalTextMap.set(node, currentVal)
            }
          } else if (HINDI_REVERSE[trimmed] || HINDI_REVERSE[trimmed.toLowerCase()]) {
            englishKey = HINDI_REVERSE[trimmed] || HINDI_REVERSE[trimmed.toLowerCase()]
          } else if (REVERSE_DICT && (REVERSE_DICT[trimmed] || REVERSE_DICT[trimmed.toLowerCase()])) {
            englishKey = REVERSE_DICT[trimmed] || REVERSE_DICT[trimmed.toLowerCase()]
          }
        }

        // 3. If English key resolved, translate it into targetLang
        if (englishKey) {
          let translated = langDict[englishKey] || phraseDict[englishKey]
          if (!translated && typeof englishKey === 'string') {
            const lower = englishKey.toLowerCase()
            translated = langDict[lower] || phraseDict[lower]
          }
          if (translated) {
            if (translated !== trimmed) {
              if (!originalTextMap.has(node) && !/[\u0900-\u0D7F]/.test(currentVal)) {
                originalTextMap.set(node, currentVal)
              }
              node.nodeValue = currentVal.replace(trimmed, translated)
            }
            continue
          } else if (/[a-zA-Z]/.test(englishKey)) {
            const transliterated = transliterateMixedText(englishKey, targetLang, langDict, phraseDict)
            if (transliterated && transliterated !== trimmed) {
              node.nodeValue = currentVal.replace(trimmed, transliterated)
            }
            continue
          }
        }

        // 4. If target is non-Hindi (te, kn, ml, pa, or, ta) and node contains stray Hindi text
        if (targetLang !== 'hi' && SCRIPT_RANGES.hi.test(trimmed)) {
          // Handle colon-separated statements like "मिट्टी: Clay loam" or "शीर्ष सिफारिश: Groundnut"
          if (trimmed.includes(':') && !trimmed.includes('\n')) {
            const colonIdx = trimmed.indexOf(':')
            const prefix = trimmed.slice(0, colonIdx).trim()
            const rest = trimmed.slice(colonIdx + 1).trim()
            const pKey = HINDI_REVERSE[prefix] || REVERSE_DICT[prefix]
            if (pKey) {
              const pTrans = langDict[pKey] || phraseDict[pKey] || pKey
              let rTrans = rest
              const rKey = HINDI_REVERSE[rest] || REVERSE_DICT[rest]
              if (rKey) {
                rTrans = langDict[rKey] || phraseDict[rKey] || rKey
              } else if (/[a-zA-Z]/.test(rest)) {
                rTrans = transliterateMixedText(rest, targetLang, langDict, phraseDict)
              }
              node.nodeValue = currentVal.replace(trimmed, `${pTrans}: ${rTrans}`)
              continue
            }
          }

          // Substring scan: replace any known Hindi phrase inside nodeValue with its targetLang translation
          let replacedText = currentVal
          let matchedAny = false
          for (let i = 0; i < HINDI_PHRASES.length; i++) {
            const hPhrase = HINDI_PHRASES[i]
            if (replacedText.includes(hPhrase)) {
              const enK = HINDI_REVERSE[hPhrase]
              const loc = langDict[enK] || phraseDict[enK]
              if (loc && loc !== hPhrase) {
                replacedText = replacedText.split(hPhrase).join(loc)
                matchedAny = true
              }
            }
          }
          if (matchedAny) {
            node.nodeValue = replacedText
            continue
          }
        }

        // 5. Dynamic transliteration for pure English text nodes
        if (/[a-zA-Z]/.test(trimmed)) {
          if (!originalTextMap.has(node) && !/[\u0900-\u0D7F]/.test(currentVal)) {
            originalTextMap.set(node, currentVal)
          }
          const transliterated = transliterateMixedText(trimmed, targetLang, langDict, phraseDict)
          if (transliterated && transliterated !== trimmed) {
            node.nodeValue = currentVal.replace(trimmed, transliterated)
          }
        }
      }
    }
  } catch (err) {
    console.warn('domTranslator walk error:', err)
  } finally {
    isTranslating = false
  }
}

function startDomObserver(targetLang) {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (!targetLang || targetLang === 'en') return

  observer = new MutationObserver(() => {
    if (isTranslating) return // Never react to our own DOM translations
    scheduleDomTranslation(activeLang)
  })
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  }
}

function scheduleDomTranslation(targetLang) {
  if (typeof window === 'undefined') return
  const lang = targetLang || activeLang
  if (!lang) return
  pendingLang = lang

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
  animationFrameId = window.requestAnimationFrame(() => {
    animationFrameId = null
    const runLang = pendingLang || activeLang
    walkAndTranslate(runLang)
  })
}

export const domTranslator = {
  setLanguage(newLang) {
    if (!newLang) return
    activeLang = newLang.toLowerCase()
    pendingLang = activeLang

    if (typeof document !== 'undefined') {
      const langObj = (SUPPORTED_LANGUAGES || []).find(l => l.code === activeLang)
      const locale = langObj?.locale || (activeLang === 'en' ? 'en' : `${activeLang}-IN`)

      document.documentElement.lang = activeLang === 'en' ? 'en' : locale
      document.documentElement.setAttribute('translate', 'no')
      document.documentElement.classList.add('notranslate')

      if (activeLang === 'en') {
        document.documentElement.classList.remove('translated-ltr', 'translated-rtl')
        document.body?.classList.remove('translated-ltr', 'translated-rtl')
      }

      startDomObserver(activeLang)
      scheduleDomTranslation(activeLang)
    }
  },

  retranslate(lang) {
    if (lang) {
      activeLang = lang.toLowerCase()
      pendingLang = activeLang
    }
    if (typeof document !== 'undefined') {
      startDomObserver(activeLang)
      scheduleDomTranslation(activeLang)
    }
  },

  getActiveLanguage() {
    return activeLang
  }
}

export default domTranslator
