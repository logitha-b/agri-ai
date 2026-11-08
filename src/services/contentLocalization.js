// src/services/contentLocalization.js
// Production-grade Content Localization Service for Agri-Economic Intelligence Platform
// Bridges static UI and dynamic dataset/API content across all 8 supported languages

import i18n from '../i18n/index.js'
import { REVERSE_DICT } from '../i18n/reverseDict'
import { transliterateIndic } from '../utils/transliterate.js'

/**
 * Resolves any string in any supported language back to its canonical English key.
 * If already English or unknown, returns the cleaned string.
 */
export function resolveCanonicalKey(text) {
  if (!text || typeof text !== 'string') return text || ''
  const trimmed = text.trim()
  if (!trimmed) return ''

  // 1. Direct match in REVERSE_DICT
  if (REVERSE_DICT[trimmed]) return REVERSE_DICT[trimmed]

  // 2. Case-insensitive match in REVERSE_DICT
  const lower = trimmed.toLowerCase()
  if (REVERSE_DICT[lower]) return REVERSE_DICT[lower]

  // 3. Suffix handler (*, :, .)
  let suffix = ''
  let base = trimmed
  if (base.endsWith('*')) {
    suffix = ' *'
    base = base.slice(0, -1).trim()
  } else if (base.endsWith(':')) {
    suffix = ':'
    base = base.slice(0, -1).trim()
  }

  if (REVERSE_DICT[base]) return REVERSE_DICT[base] + suffix
  if (REVERSE_DICT[base.toLowerCase()]) return REVERSE_DICT[base.toLowerCase()] + suffix

  return trimmed
}

/**
 * Localizes any text or key from any language into the target language.
 * Always guarantees:
 * - When target is 'en': returns pure English (0 Indic script).
 * - When target is Indic (hi, ta, te, kn, ml, pa, or): translates from canonical key.
 * - Cross-language switching: e.g. Tamil input -> Hindi target resolves cleanly without leaving Tamil.
 */
export function localizeText(textOrKey, targetLang = 'en') {
  if (!textOrKey || typeof textOrKey !== 'string') return textOrKey || ''
  const trimmed = textOrKey.trim()
  if (!trimmed) return ''

  // 1. Resolve canonical English key first
  const canonical = resolveCanonicalKey(trimmed)

  // Suffix handling
  let base = canonical
  let suffix = ''
  if (base.endsWith('*')) {
    suffix = ' *'
    base = base.slice(0, -1).trim()
  } else if (base.endsWith(':')) {
    suffix = ':'
    base = base.slice(0, -1).trim()
  }

  // 2. If target is English, return canonical English
  if (!targetLang || targetLang === 'en') {
    return base + suffix
  }

  // 3. Look up canonical key in target language i18n resource bundle
  if (i18n && i18n.getResource) {
    const val = i18n.getResource(targetLang, 'translation', canonical)
    if (val) return val

    const baseVal = i18n.getResource(targetLang, 'translation', base)
    if (baseVal) return baseVal + suffix

    // Check lowercase canonical
    const lowerVal = i18n.getResource(targetLang, 'translation', base.toLowerCase())
    if (lowerVal) return lowerVal + suffix
  }

  // Fallback: If no dictionary translation exists and target is Indic,
  // dynamically transliterate into target script without hardcoding!
  if (targetLang && targetLang !== 'en' && /[a-zA-Z]/.test(base)) {
    return transliterateIndic(base, targetLang) + suffix
  }

  // Fallback: If target is English or already translated
  return base + suffix
}

/**
 * Localizes a single data source object (e.g. ICRISAT, NASA, SoilGrids).
 * Preserves original non-text values: url, rows_used, year_range, integrated, etc.
 */
export function localizeDataSource(source, lang = 'en') {
  if (!source || typeof source !== 'object') return source
  return {
    ...source,
    name: localizeText(source.name, lang),
    organization: localizeText(source.organization, lang),
    usage: localizeText(source.usage, lang),
    dataset_version: source.dataset_version ? localizeText(source.dataset_version, lang) : source.dataset_version,
  }
}

/**
 * Localizes an array of data sources.
 */
export function localizeDataSources(sources, lang = 'en') {
  if (!Array.isArray(sources)) return sources
  return sources.map(s => localizeDataSource(s, lang))
}

/**
 * Localizes ML model metadata and statistical explanations.
 */
export function localizeMetadata(metadata, lang = 'en') {
  if (!metadata || typeof metadata !== 'object') return metadata
  const cloned = { ...metadata }

  if (cloned.model) cloned.model = localizeText(cloned.model, lang)
  if (cloned.target) cloned.target = localizeText(cloned.target, lang)
  if (cloned.explanation_note) cloned.explanation_note = localizeText(cloned.explanation_note, lang)

  if (cloned.risk_reference && typeof cloned.risk_reference === 'object') {
    cloned.risk_reference = {
      ...cloned.risk_reference,
      method: localizeText(cloned.risk_reference.method, lang)
    }
  }

  return cloned
}

/**
 * Localizes crop health reports (growth stage, harvest estimate, problems, irrigation, fertiliser).
 */
export function localizeReport(report, lang = 'en') {
  if (!report || typeof report !== 'object') return report
  const cloned = { ...report }

  if (cloned.crop) cloned.crop = localizeText(cloned.crop, lang)
  if (cloned.variety && cloned.variety !== 'Not specified') {
    cloned.variety = localizeText(cloned.variety, lang)
  }

  if (cloned.growth_stage) {
    cloned.growth_stage = {
      ...cloned.growth_stage,
      current_stage: localizeText(cloned.growth_stage.current_stage, lang),
      note: localizeText(cloned.growth_stage.note, lang),
    }
  }

  if (cloned.harvest_estimate) {
    cloned.harvest_estimate = {
      ...cloned.harvest_estimate,
      basis: localizeText(cloned.harvest_estimate.basis, lang),
      note: localizeText(cloned.harvest_estimate.note, lang),
    }
  }

  if (Array.isArray(cloned.problems_and_remedies)) {
    cloned.problems_and_remedies = cloned.problems_and_remedies.map(p => ({
      ...p,
      issue: localizeText(p.issue, lang),
      cause: localizeText(p.cause, lang),
      evidence: localizeText(p.evidence, lang),
      inspection: localizeText(p.inspection, lang),
      remedy: localizeText(p.remedy, lang),
      important_note: p.important_note ? localizeText(p.important_note, lang) : p.important_note,
    }))
  }

  if (cloned.irrigation_recommendation) {
    cloned.irrigation_recommendation = {
      ...cloned.irrigation_recommendation,
      recommendation: localizeText(cloned.irrigation_recommendation.recommendation, lang),
      weather_context: cloned.irrigation_recommendation.weather_context ? localizeText(cloned.irrigation_recommendation.weather_context, lang) : '',
      note: localizeText(cloned.irrigation_recommendation.note, lang),
      source: localizeText(cloned.irrigation_recommendation.source, lang),
    }
  }

  if (cloned.vegetation_condition) {
    cloned.vegetation_condition = {
      ...cloned.vegetation_condition,
      interpretation: localizeText(cloned.vegetation_condition.interpretation, lang),
      limitations: localizeText(cloned.vegetation_condition.limitations, lang),
      reason: cloned.vegetation_condition.reason ? localizeText(cloned.vegetation_condition.reason, lang) : undefined,
    }
  }

  if (cloned.fertiliser_recommendation) {
    cloned.fertiliser_recommendation = {
      ...cloned.fertiliser_recommendation,
      recommendation: localizeText(cloned.fertiliser_recommendation.recommendation, lang),
      organic_manure: cloned.fertiliser_recommendation.organic_manure ? localizeText(cloned.fertiliser_recommendation.organic_manure, lang) : undefined,
      soil_test_note: cloned.fertiliser_recommendation.soil_test_note ? localizeText(cloned.fertiliser_recommendation.soil_test_note, lang) : undefined,
      source: cloned.fertiliser_recommendation.source ? localizeText(cloned.fertiliser_recommendation.source, lang) : undefined,
      note: cloned.fertiliser_recommendation.note ? localizeText(cloned.fertiliser_recommendation.note, lang) : undefined,
    }
  }

  return cloned
}

/**
 * Generic object localizer: deeply traverses an object and localizes specified keys.
 */
export function localizeObject(obj, lang = 'en', translatableKeys = ['name', 'title', 'description', 'organization', 'usage', 'note', 'summary', 'cause', 'remedy']) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    return obj.map(item => localizeObject(item, lang, translatableKeys))
  }

  const out = {}
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && translatableKeys.includes(key)) {
      out[key] = localizeText(val, lang)
    } else if (val && typeof val === 'object') {
      out[key] = localizeObject(val, lang, translatableKeys)
    } else {
      out[key] = val
    }
  }
  return out
}

export function localizeLocationName(name, targetLang = 'en') {
  if (!name || typeof name !== 'string') return name || ''
  const trimmed = name.trim()
  if (!trimmed) return ''

  // 1. Resolve canonical English name first (e.g. 'எல்லாபுரம்' -> 'Ellapuram', 'அகாரம்2' -> 'Agaram2')
  const canonical = resolveCanonicalKey(trimmed)

  if (!targetLang || targetLang === 'en') {
    return canonical
  }

  // 2. Direct lookup in target language i18n resource bundle
  if (i18n && i18n.getResource) {
    const val = i18n.getResource(targetLang, 'translation', canonical)
    if (val && typeof val === 'string') {
      return val
    }

    // Check with trailing number stripped (e.g. "Agaram 2" -> "Agaram" + " 2")
    const match = canonical.match(/^([A-Za-z\s]+)(\d+)$/)
    if (match) {
      const baseName = match[1].trim()
      const digit = match[2]
      const baseVal = i18n.getResource(targetLang, 'translation', baseName)
      if (baseVal) {
        return `${baseVal} ${digit}`
      }
    }
  }

  // 3. Dynamic transliteration fallback (never leaves English for un-hardcoded villages)
  return transliterateIndic(canonical, targetLang)
}

export { transliterateIndic }

export default {
  resolveCanonicalKey,
  localizeText,
  localizeLocationName,
  localizeDataSource,
  localizeDataSources,
  localizeMetadata,
  localizeReport,
  localizeObject
}
