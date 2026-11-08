// src/utils/localeFormat.js
// Locale-aware formatting for numbers, currencies, dates, and measurements
// Supports: en-IN, hi-IN, ta-IN, te-IN, ml-IN, kn-IN, pa-IN, or-IN

export const LOCALE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  ml: 'ml-IN',
  kn: 'kn-IN',
  pa: 'pa-IN',
  or: 'or-IN',
}

export function formatNumber(val, lang = 'en', options = { maximumFractionDigits: 2 }) {
  if (val === null || val === undefined || isNaN(Number(val))) return '—'
  const locale = LOCALE_MAP[lang] || 'en-IN'
  try {
    return new Intl.NumberFormat(locale, options).format(Number(val))
  } catch {
    return Number(val).toLocaleString(undefined, options)
  }
}

export function formatCurrency(val, lang = 'en', maximumFractionDigits = 0) {
  if (val === null || val === undefined || isNaN(Number(val))) return '—'
  const locale = LOCALE_MAP[lang] || 'en-IN'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits,
    }).format(Number(val))
  } catch {
    return `₹${Number(val).toLocaleString(undefined, { maximumFractionDigits })}`
  }
}

export function formatPercent(val, lang = 'en', maximumFractionDigits = 1) {
  if (val === null || val === undefined || isNaN(Number(val))) return '—'
  const locale = LOCALE_MAP[lang] || 'en-IN'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits,
    }).format(Number(val) / 100)
  } catch {
    return `${Number(val).toFixed(maximumFractionDigits)}%`
  }
}

export function formatDate(dateVal, lang = 'en', options = { year: 'numeric', month: 'short', day: 'numeric' }) {
  if (!dateVal) return '—'
  const locale = LOCALE_MAP[lang] || 'en-IN'
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
    if (isNaN(d.getTime())) return String(dateVal)
    return new Intl.DateTimeFormat(locale, options).format(d)
  } catch {
    return String(dateVal)
  }
}

