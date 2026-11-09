import { useLanguage } from '../context/LanguageContext'
/**

 * VoiceAssistant — Multilingual Voice AI Farm Agent

 *

 * Architecture:

 *   STT : faster-whisper (POST /api/voice/transcribe on port 8004)

 *   LLM : Gemini 2.0 Flash via backend (POST /api/assistant/chat)

 *   TTS : Browser Web Speech API — zero cost, works for Indian languages

 *         in Chrome/Edge (Tamil, Telugu, Hindi, Kannada, Malayalam, etc.)

 *

 * Storage: conversations persisted via backend JSON files

 *          (falls back to localStorage if voice API offline)

 *

 * All module results come from the real backend APIs — nothing invented.

 */

import React, { useCallback, useEffect, useRef, useState, Component } from 'react'

import { useNavigate } from 'react-router-dom'

import {

  AlertTriangle, ArrowRight, BookOpen, CheckCircle2,
  Edit3, ExternalLink, ImagePlus, Loader, MessageCircle,
  Mic, MicOff, Pause, Play, Plus, RotateCcw, Send, Square, Trash2,
  Volume1, Volume2, VolumeX, X,

} from 'lucide-react'

import { Card, Notice } from '../components'

import ModuleResultRenderer from '../components/ModuleResultRenderer'

const VOICE_API = (import.meta.env.VITE_VOICE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV && typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8004` : 'https://agri-ai-jnpi.onrender.com')).replace(/\/$/, '')
const HEALTH_API = (import.meta.env.VITE_CROP_HEALTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV && typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8003` : 'https://agri-ai-jnpi.onrender.com')).replace(/\/$/, '')

const safeParseJson = async (res) => {
  if (!res) return null
  const ct = (res.headers?.get('content-type') || '').toLowerCase()
  if (ct.includes('application/json')) {
    return await res.json().catch(() => null)
  }
  const text = await res.text().catch(() => '')
  try {
    return JSON.parse(text)
  } catch {
    return text ? { detail: text } : null
  }
}

const callVoiceApi = async (path, options = {}) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const candidates = [
    ...(VOICE_API ? [`${VOICE_API}${cleanPath}`] : []),
    cleanPath, // Vite dev-server proxy or production reverse proxy
    ...(import.meta.env.DEV ? [`http://127.0.0.1:8004${cleanPath}`, `http://localhost:8004${cleanPath}`] : []),
  ]
  let lastErr = null
  for (const url of candidates) {
    try {
      const res = await fetch(url, options)
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      // Skip if static host returned HTML or non-JSON 404/405 method error
      if (
        (ct.includes('text/html') && !cleanPath.endsWith('.html')) ||
        (res.status === 405) ||
        (res.status === 404 && !ct.includes('application/json'))
      ) {
        continue
      }
      return res
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr || new Error('Failed to connect to Voice backend. Ensure Cloudflare Tunnel is active.')
}


const SPOKEN_LANG_OPTIONS = [
  { code: 'auto', name: 'Auto Detect (AI)', native: '✨ Auto Detect' },
  { code: 'en',   name: 'English',          native: 'English' },
  { code: 'hi',   name: 'Hindi',            native: 'हिंदी (Hindi)' },
  { code: 'ta',   name: 'Tamil',            native: 'தமிழ் (Tamil)' },
  { code: 'te',   name: 'Telugu',           native: 'తెలుగు (Telugu)' },
  { code: 'ml',   name: 'Malayalam',        native: 'മലയാളം (Malayalam)' },
  { code: 'kn',   name: 'Kannada',          native: 'ಕನ್ನಡ (Kannada)' },
  { code: 'pa',   name: 'Punjabi',          native: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'or',   name: 'Odia',             native: 'ଓଡ଼ିଆ (Odia)' },
]

const LANGUAGES = [
  { code:'en', name:'English', native:'English', tts:'en-IN' },
  { code:'ta', name:'தமிழ் (Tamil)', native:'தமிழ்', tts:'ta-IN' },
  { code:'te', name:'తెలుగు (Telugu)', native:'తెలుగు', tts:'te-IN' },
  { code:'hi', name:'हिन्दी (Hindi)', native:'हिन्दी', tts:'hi-IN' },
  { code:'kn', name:'ಕನ್ನಡ (Kannada)', native:'ಕನ್ನಡ', tts:'kn-IN' },
  { code:'ml', name:'മലയാളം (Malayalam)', native:'മലയാളം', tts:'ml-IN' },
  { code:'pa', name:'ਪੰਜਾਬੀ (Punjabi)', native:'ਪੰਜਾਬੀ', tts:'pa-IN' },
  { code:'or', name:'ଓଡ଼ିଆ (Odia)', native:'ଓଡ଼ିଆ', tts:'or-IN' },
]

const USER_ID = 'default'   // In production replace with auth user ID

const MODULE_LABELS = {

  weather:           { label:'Weather & Climate',       route:'/crop-health',         color:'#4e9af1' },

  lac_suitability:   { label:'Lac Suitability',         route:'/lac',                 color:'#2d6a4f' },

  lac_forecast:      { label:'Lac Production Forecast', route:'/lac',                 color:'#2d6a4f' },

  lac_risk:          { label:'Lac Environmental Risk',  route:'/lac',                 color:'#b87c1a' },

  lac_calendar:      { label:'Lac Crop Calendar',       route:'/lac',                 color:'#2d6a4f' },

  lac_market:        { label:'Lac Market & Profit',     route:'/lac',                 color:'#1a5c6e' },

  lac_history:       { label:'Lac Historical Trends',   route:'/lac',                 color:'#2d6a4f' },

  lac_guidance:      { label:'Lac Cultivation Guidance',route:'/lac',                 color:'#2d6a4f' },

  pearl_suitability: { label:'Pearl Suitability',       route:'/pearl',               color:'#1a5c6e' },

  pearl_risk:        { label:'Pearl Env. Risk',         route:'/pearl',               color:'#1a5c6e' },
  pearl_water_quality:{ label:'Pearl Water Quality',    route:'/pearl',               color:'#1a5c6e' },
  pearl_calendar:     { label:'Pearl Culture Calendar', route:'/pearl',               color:'#1a5c6e' },
  pearl_market:       { label:'Pearl Market & Profit',  route:'/pearl',               color:'#1a5c6e' },
  pearl_guidance:     { label:'Pearl Guidance',         route:'/pearl',               color:'#1a5c6e' },

  flood_risk:        { label:'Flood & Water Risk',      route:'/water-risk',          color:'#e76f51' },

  market:            { label:'Market Prices',           route:'/market',              color:'#f4a261' },

  crop_recommendation:{label:'Crop Recommendation',    route:'/crop-recommendation', color:'#74c69d' },

  crop_loss:         { label:'Crop Loss & Insurance',   route:'/loss-insurance',      color:'#c0392b' },

  cashflow:          { label:'Cash Flow',               route:'/cash-flow',           color:'#8b5500' },

  production:        { label:'Crop Production',         route:'/production',          color:'#6c63ac' },

  disease:           { label:'Crop Disease Analysis',   route:'/crop-health',         color:'#c0392b' },

  soil_nutrients:    { label:'Soil Health',             route:'/crop-health',         color:'#7c6a3e' },

  schemes:           { label:'Government Schemes',      route:'/schemes',             color:'#2d6a4f' },

  crop_health:       { label:'🛰️ AI Crop Health',       route:'/crop-health',         color:'#2d6a4f' },

}

const QUICK_PROMPTS = {
  en: [
    'What is the soil health in my field?',
    'What is the expected paddy yield in Tamil Nadu?',
    'What crops are recommended for my area?',
    'Show paddy market prices near Thiruvallur',
    'What government schemes am I eligible for?',
  ],
  ta: [
    'என் வயலில் மண் சுகாதாரம் என்ன?',
    'தமிழ்நாட்டில் நெல் மகசூல் எவ்வளவு?',
    'என் பகுதிக்கு என்ன பயிர் சிறந்தது?',
    'அரசு திட்டங்கள் என்னென்ன கிடைக்கும்?',
  ],
  te: [
    'నా పొలంలో మట్టి ఆరోగ్యం ఎంత?',
    'ఆంధ్రప్రదేశ్‌లో వరి దిగుబడి ఎంత?',
    'మా ప్రాంతానికి ఏ పంట మంచిది?',
    'ప్రభుత్వ పథకాలు ఏమిటి?',
  ],
  hi: [
    'मेरे खेत की मिट्टी की जांच करो',
    'उत्तर प्रदेश में गेहूं की उपज कितनी है?',
    'मेरे क्षेत्र के लिए कौन सी फसल सही है?',
    'सरकारी योजनाएं कौन सी मिल सकती हैं?',
  ],
  kn: [
    'ನನ್ನ ಜಮೀನಿನ ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಹೇಗಿದೆ?',
    'ಕರ್ನಾಟಕದಲ್ಲಿ ಭತ್ತದ ಇಳುವರಿ ಎಷ್ಟಾಗಬಹುದು?',
    'ನನ್ನ ಪ್ರದೇಶಕ್ಕೆ ಯಾವ ಬೆಳೆ ಸೂಕ್ತ?',
    'ನನಗೆ ಯಾವ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಸಿಗುತ್ತವೆ?',
  ],
  ml: [
    'എന്റെ തോട്ടത്തിലെ മണ്ണുപരിശോധന ഫലം എന്താണ്?',
    'കേരളത്തിൽ നെല്ല് ഉത്പാദനം എത്ര പ്രതീക്ഷിക്കാം?',
    'എന്റെ പ്രദേശത്തിന് അനുയോജ്യമായ വിളകൾ ഏതാണ്?',
    'ഏതൊക്കെ സർക്കാർ പദ്ധതികൾ എനിക്ക് ലഭിക്കും?',
  ],
  pa: [
    'ਮੇਰੇ ਖੇਤ ਦੀ ਮਿੱਟੀ ਦੀ ਸਿਹਤ ਕਿਹੋ ਜਿਹੀ ਹੈ?',
    'ਪੰਜਾਬ ਵਿੱਚ ਝੋਨੇ/ਕਣਕ ਦੀ ਪੈਦਾਵਾਰ ਕਿੰਨੀ ਹੋ ਸਕਦੀ ਹੈ?',
    'ਮੇਰੇ ਇਲਾਕੇ ਲਈ ਕਿਹੜੀ ਫ਼ਸਲ ਸਹੀ ਹੈ?',
    'ਮੈਨੂੰ ਕਿਹੜੀਆਂ ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਮਿਲ ਸਕਦੀਆਂ ਹਨ?',
  ],
  or: [
    'ମୋ ଜମିର ମାଟି ସ୍ୱାସ୍ଥ୍ୟ କିପରି ଅଛି?',
    'ଓଡ଼ିଶାରେ ଧାନ ଉତ୍ପାଦନ କେତେ ହୋଇପାରେ?',
    'ମୋ ଅଞ୍ଚଳ ପାଇଁ କେଉଁ ଫସଲ ଭଲ?',
    'ମୋତେ କେଉଁ ସରକାରୀ ଯୋଜନା ମିଳିପାରିବ?',
  ],
}

// —— localStorage fallback for conversation list ———————————————————————————————

const LS_CONVS_KEY = 'va_conversations'

function lsLoadConvList()  { try { return JSON.parse(localStorage.getItem(LS_CONVS_KEY) || '[]') } catch { return [] } }

function lsSaveConvList(d) { try { localStorage.setItem(LS_CONVS_KEY, JSON.stringify(d)) } catch {} }

// —— Multilingual Text Language Detection & TTS Engine ————————————————————————

export const SCRIPT_RANGES = [
  { code: 'ta', name: 'Tamil',     tts: 'ta-IN', native: 'தமிழ்',   regex: /[\u0B80-\u0BFF]/g },
  { code: 'te', name: 'Telugu',    tts: 'te-IN', native: 'తెలుగు',  regex: /[\u0C00-\u0C7F]/g },
  { code: 'hi', name: 'Hindi',     tts: 'hi-IN', native: 'हिन्दी',  regex: /[\u0900-\u097F]/g },
  { code: 'kn', name: 'Kannada',   tts: 'kn-IN', native: 'ಕನ್ನಡ',   regex: /[\u0C80-\u0CFF]/g },
  { code: 'ml', name: 'Malayalam', tts: 'ml-IN', native: 'മലയാളം', regex: /[\u0D00-\u0D7F]/g },
  { code: 'pa', name: 'Punjabi',   tts: 'pa-IN', native: 'ਪੰਜਾਬੀ', regex: /[\u0A00-\u0A7F]/g },
  { code: 'or', name: 'Odia',      tts: 'or-IN', native: 'ଓଡ଼ିଆ',   regex: /[\u0B00-\u0B7F]/g },
]

export function detectTextLanguage(text) {
  if (!text || typeof text !== 'string') {
    return { code: 'en', name: 'English', native: 'English', tts: 'en-IN', detected: false }
  }

  let best = null
  let maxCount = 0

  for (const s of SCRIPT_RANGES) {
    const matches = text.match(s.regex)
    const count = matches ? matches.length : 0
    if (count > maxCount) {
      maxCount = count
      best = s
    }
  }

  if (best && maxCount > 0) {
    return { code: best.code, name: best.name, native: best.native, tts: best.tts, detected: true }
  }

  return { code: 'en', name: 'English', native: 'English', tts: 'en-IN', detected: false }
}

export function chunkTextIntoSentences(text, maxLen = 180) {
  if (!text) return []
  const parts = text.match(/[^.!?।\n]+[.!?।\n]+|[^.!?।\n]+$/g) || [text]
  const chunks = []
  let curr = ''
  for (const p of parts) {
    const trimmed = p.trim()
    if (!trimmed) continue
    if ((curr + ' ' + trimmed).length <= maxLen) {
      curr = curr ? `${curr} ${trimmed}` : trimmed
    } else {
      if (curr) chunks.push(curr)
      curr = trimmed
    }
  }
  if (curr) chunks.push(curr)
  return chunks
}

function cleanForTTS(text) {
  if (!text) return ''
  let t = text
  t = t.replace(/\*\*(.+?)\*\*/g, '$1')
  t = t.replace(/\*(.+?)\*/g, '$1')
  t = t.replace(/`([^`]+)`/g, '$1')
  t = t.replace(/^#{1,6}\s+/gm, '')
  t = t.replace(/\u2014/g, ', ')
  t = t.replace(/\u2013/g, ' to ')
  t = t.replace(/^\s*[-•]\s+/gm, '')
  t = t.replace(/^\s*\d+\.\s+/gm, '')
  t = t.replace(/[\[\]{}|<>#~^]/g, '')
  t = t.replace(/\.{2,}/g, '.')
  t = t.replace(/\n{2,}/g, '. ')
  t = t.replace(/\n/g, '. ')
  t = t.replace(/\s{2,}/g, ' ')
  return t.trim()
}

let currentTtsAudio = null
let currentUtterances = []
let isBrowserSpeaking = false

function stopSpeakingGlobal() {
  isTtsCancelled = true
  if (currentTtsAudio) {
    try {
      currentTtsAudio.pause()
      currentTtsAudio.currentTime = 0
    } catch {}
    currentTtsAudio = null
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try { window.speechSynthesis.cancel() } catch {}
  }
  isBrowserSpeaking = false
  currentUtterances = []
}

function fallbackBrowserSpeak(cleanText, langCode, onEnd) {
  if (typeof window === 'undefined' || !window.speechSynthesis) { onEnd?.(); return null }
  window.speechSynthesis.cancel()
  if (!cleanText) { onEnd?.(); return null }

  const lang = LANGUAGES.find(l => l.code === langCode)
  const ttsTag = lang?.tts || 'en-IN'
  const chunks = chunkTextIntoSentences(cleanText, 180)
  if (!chunks.length) { onEnd?.(); return null }

  const voices = window.speechSynthesis.getVoices() || []
  const langPfx = ttsTag.split('-')[0].toLowerCase()

  // Helper to strictly prefer consistent female voices and reject male voices
  const isFemaleVoice = (v) => {
    if (!v || !v.name) return false
    const n = v.name.toLowerCase()
    if (/male|ravi|hemant|madhur|prabhat|gagan|midhun|mohan|david|mark|george|steve|richard|james|stefan|pavel|deep/i.test(n)) {
      return false
    }
    return /female|zira|heera|kalpana|swara|neerja|pallavi|shruti|sapna|sobhana|harleen|manpreet|aradhana|sangeeta|priya|ananya|kavya|google|natural/i.test(n) || !n.includes('male')
  }

  // Filter voices matching the target language
  const matchingVoices = voices.filter(v => {
    if (!v.lang) return false
    const vl = v.lang.toLowerCase()
    return vl === ttsTag.toLowerCase() || vl.startsWith(langPfx)
  })

  // Pick single consistent female voice identity
  const exactMatch = matchingVoices.find(v => isFemaleVoice(v) && /female|zira|heera|swara|neerja|pallavi|shruti|sapna|sobhana|natural/i.test(v.name))
                  || matchingVoices.find(v => isFemaleVoice(v))
                  || matchingVoices[0]
                  || voices.find(v => isFemaleVoice(v))

  isBrowserSpeaking = true
  let index = 0

  const playNext = () => {
    if (!isBrowserSpeaking || index >= chunks.length) {
      isBrowserSpeaking = false
      onEnd?.()
      return
    }
    const utt = new SpeechSynthesisUtterance(chunks[index])
    utt.lang = ttsTag
    utt.rate = 0.92
    utt.pitch = 1.05
    utt.volume = 1.0

    if (exactMatch) {
      utt.voice = exactMatch
    }

    utt.onend = () => {
      index++
      playNext()
    }
    utt.onerror = () => {
      index++
      playNext()
    }
    window.speechSynthesis.speak(utt)
  }

  playNext()
}

// Queue and state for progressive low-latency sentence-level TTS streaming
let ttsQueue = []
let ttsQueueIndex = 0
let isTtsCancelled = false

function speak(text, langCode, onEnd) {
  stopSpeakingGlobal()
  isTtsCancelled = false
  const cleanText = cleanForTTS(text)
  if (!cleanText) { onEnd?.(); return null }

  const targetCode = (langCode || 'en').toLowerCase().split('-')[0]
  const supportedBackendLangs = ['ta', 'hi', 'te', 'kn', 'ml', 'pa', 'en']

  if (!supportedBackendLangs.includes(targetCode)) {
    return fallbackBrowserSpeak(cleanText, langCode, onEnd)
  }

  // Split into sentence chunks for immediate instant playback (<300ms)
  const rawSentences = cleanText
    .split(/(?<=[.!?।॥\n])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  const sentences = rawSentences.length > 0 ? rawSentences : [cleanText.slice(0, 500)]
  ttsQueue = sentences.slice(0, 10)
  ttsQueueIndex = 0

  // Pre-load audio cache map
  const audioCache = new Map()

  const getAudioUrl = (sent) => `${VOICE_API}/api/voice/tts?text=${encodeURIComponent(sent)}&language=${encodeURIComponent(targetCode)}`

  // Pre-fetch next sentence in background while current plays
  const prefetchSentence = (idx) => {
    if (idx >= ttsQueue.length || audioCache.has(idx)) return
    try {
      const a = new Audio(getAudioUrl(ttsQueue[idx]))
      a.preload = 'auto'
      audioCache.set(idx, a)
    } catch {}
  }

  const playSentenceAt = (idx) => {
    if (isTtsCancelled || idx >= ttsQueue.length) {
      currentTtsAudio = null
      onEnd?.()
      return
    }

    let audio = audioCache.get(idx)
    if (!audio) {
      audio = new Audio(getAudioUrl(ttsQueue[idx]))
      audioCache.set(idx, audio)
    }
    currentTtsAudio = audio

    // Pre-fetch next sentence while this one plays
    prefetchSentence(idx + 1)

    audio.onended = () => {
      if (isTtsCancelled) return
      playSentenceAt(idx + 1)
    }

    audio.onerror = () => {
      if (isTtsCancelled) return
      // If error on sentence, attempt fallback or next sentence
      playSentenceAt(idx + 1)
    }

    const p = audio.play()
    if (p !== undefined) {
      p.catch(() => {
        if (!isTtsCancelled) {
          fallbackBrowserSpeak(cleanText, langCode, onEnd)
        }
      })
    }
  }

  // Immediately start sentence 0
  prefetchSentence(1)
  playSentenceAt(0)

  return {
    pause: () => {
      isTtsCancelled = true
      if (currentTtsAudio) { currentTtsAudio.pause(); currentTtsAudio = null }
    }
  }
}

// —— Markdown → JSX renderer ———————————————————————————————————————————————————

// Handles: # ## ### headings, **bold**, *italic*, `code`,

//          numbered lists, bullet lists, --- dividers, blank lines

// -- Error Boundary — catches crashes in MessageBubble so page doesn't go blank -

class BubbleErrorBoundary extends Component {

  constructor(props) { super(props); this.state = { hasError: false, error: null } }

  static getDerivedStateFromError(error) { return { hasError: true, error } }

  componentDidCatch(error, info) { console.error('[VoiceAssistant] Bubble render error:', error?.message, info?.componentStack) }

  render() {

    if (this.state.hasError) {

      return (

        <div className="va-msg va-msg-ai">

          <div className="va-msg-body" style={{ background:'#fff5f5', border:'1px solid #f5c6c6', borderRadius:8, padding:12 }}>

            <p style={{ color:'#7a0000', fontSize:12, margin:0 }}>

              ? Failed to render this message. Error: {this.state.error?.message || 'Unknown'}

            </p>

            <button onClick={() => this.setState({ hasError: false, error: null })}

              style={{ marginTop:6, fontSize:11, padding:'3px 8px', borderRadius:4, border:'1px solid #f5c6c6', background:'#fff', cursor:'pointer', color:'#7a0000' }}>

              Retry

            </button>

          </div>

        </div>

      )

    }

    return this.props.children

  }

}

function renderMarkdown(text) {

  if (!text) return null

  // Pre-clean: remove stray trailing asterisks that Gemini sometimes emits

  // e.g. "value*" → "value", but keep **bold** and *italic* intact

  const cleanText = text

    .replace(/(?<!\*)\*(?!\*)/g, '')   // lone * not part of ** → remove

    .replace(/\*{3,}/g, '')            // *** or more → remove

  const lines = cleanText.split('\n')

  const elements = []

  let listItems = []

  let listType  = null

  const flushList = () => {

    if (!listItems.length) return

    const Tag = listType === 'ol' ? 'ol' : 'ul'

    elements.push(

      <Tag key={`list-${elements.length}`} className="va-md-list">

        {listItems.map((item, i) => <li key={i}>{inlineFormat(item)}</li>)}

      </Tag>

    )

    listItems = []; listType = null

  }

  // Convert inline **bold** and `code` to React nodes (no lone *)

  const inlineFormat = (str) => {

    const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`)/)

    return parts.map((part, i) => {

      if (part.startsWith('**') && part.endsWith('**'))

        return <strong key={i}>{part.slice(2, -2)}</strong>

      if (part.startsWith('`') && part.endsWith('`'))

        return <code key={i} className="va-md-code">{part.slice(1, -1)}</code>

      return part

    })

  }

  lines.forEach((rawLine, idx) => {

    const line = rawLine.trimEnd()

    // Horizontal rule: --- or ___

    if (/^[-_]{3,}\s*$/.test(line)) {

      flushList()

      elements.push(<hr key={`hr-${idx}`} style={{ border:'none', borderTop:'1px solid #dde8dd', margin:'8px 0' }}/>)

      return

    }

    // Headings: ### ## #

    const h3 = line.match(/^###\s+(.+)/)

    const h2 = line.match(/^##\s+(.+)/)

    const h1 = line.match(/^#\s+(.+)/)

    if (h3 || h2 || h1) {

      flushList()

      const content = (h3 || h2 || h1)[1]

      const fontSize = h3 ? 12 : h2 ? 13 : 14

      const weight   = 700

      elements.push(

        <div key={`h-${idx}`} style={{

          fontSize, fontWeight: weight, color: '#1a5c2a',

          marginTop: 10, marginBottom: 3, letterSpacing: h3 ? '0.3px' : 0

        }}>

          {inlineFormat(content)}

        </div>

      )

      return

    }

    // Numbered list

    const olMatch = line.match(/^\s*\d+\.\s+(.+)/)

    // Bullet list: - or •

    const ulMatch = line.match(/^\s*[-•]\s+(.+)/)

    if (olMatch) {

      if (listType !== 'ol') { flushList(); listType = 'ol' }

      listItems.push(olMatch[1]); return

    }

    if (ulMatch) {

      if (listType !== 'ul') { flushList(); listType = 'ul' }

      listItems.push(ulMatch[1]); return

    }

    flushList()

    if (line.trim() === '') {

      // Only add spacing if previous element wasn't also a spacer

      if (elements.length && elements[elements.length-1]?.type !== 'br')

        elements.push(<br key={`br-${idx}`}/>)

    } else {

      elements.push(

        <span key={`p-${idx}`} style={{ display:'block' }}>

          {inlineFormat(line)}

        </span>

      )

    }

  })

  flushList()

  return <div className="va-md-body">{elements}</div>

}

// —— Message bubble ————————————————————————————————————————————————————————————

function MessageBubble({ msg, language, playbackState, onListen, onPause, onResume, onStop, onReplay, onNavigate, onRetry }) {
  const { t } = useLanguage()

  const isUser  = msg.role === 'user'

  const modInfo = msg.module_id ? MODULE_LABELS[msg.module_id] : null

  return (

    <div className={`va-msg ${isUser ? 'va-msg-user' : 'va-msg-ai'}`}>

      {!isUser && (

        <span className="va-msg-icon"><BookOpen size={14}/></span>

      )}

      <div className="va-msg-body">

        {isUser && msg.photo_url && (

          <div className="va-user-attached-thumb" style={{ marginBottom: 6 }}>

            <img src={msg.photo_url} alt="Attached crop" style={{ maxWidth: 220, maxHeight: 150, borderRadius: 8, objectFit: 'cover', border: '1.5px solid #a3cca8', display: 'block' }} />

          </div>

        )}

        {isUser
          ? <p style={{ whiteSpace:'pre-wrap' }}>{msg.content}</p>
          : <div className="va-msg-ai-content" data-no-dom-translate="true">{renderMarkdown(msg.content)}</div>
        }

        {/* Primary module card with section header */}

        {!isUser && msg.module_id && msg.module_result && (() => {

          const info = MODULE_LABELS[msg.module_id]

          return (

            <div className="va-module-section">

              {info && (

                <div style={{ marginBottom: 6 }}>

                  <span style={{

                    background: info.color + '20', color: info.color, fontSize: 10,

                    fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase',

                    padding: '2px 8px', borderRadius: 20, border: `1px solid ${info.color}44`

                  }}>

                    {t(info.label, info.label)}

                  </span>

                </div>

              )}

              <ModuleResultRenderer moduleId={msg.module_id} moduleResult={msg.module_result}/>

              {info?.route && (

                <button className="va-module-link" style={{ marginTop: 6 }}

                  onClick={() => onNavigate?.(info.route)}>

                  Open full {t(info.label, info.label)} <ExternalLink size={11}/>

                </button>

              )}

            </div>

          )

        })()}

        {/* Additional module cards for multi-intent queries */}

        {!isUser && msg.multi_modules && msg.multi_modules.map((m, i) => {

          if (!m.module_id || !m.module_result) return null

          const mInfo = MODULE_LABELS[m.module_id]

          return (

            <div key={`multi-${i}`} style={{ marginTop: 14, paddingTop: 12,

              borderTop: '1px solid #e8ede8' }}>

              {mInfo && (

                <div style={{ marginBottom: 6 }}>

                  <span style={{

                    background: mInfo.color + '20', color: mInfo.color, fontSize: 10,

                    fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase',

                    padding: '2px 8px', borderRadius: 20, border: `1px solid ${mInfo.color}44`

                  }}>

                    {t(mInfo.label, mInfo.label)}

                  </span>

                </div>

              )}

              <ModuleResultRenderer moduleId={m.module_id} moduleResult={m.module_result}/>

              {mInfo?.route && (

                <button className="va-module-link" style={{ marginTop: 6 }}

                  onClick={() => onNavigate?.(mInfo.route)}>

                  Open full {t(mInfo.label, mInfo.label)} <ExternalLink size={11}/>

                </button>

              )}

            </div>

          )

        })}

        {msg.isError && msg.failedQuestion && onRetry && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => onRetry(msg.failedQuestion)}
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 4,
                border: '1px solid #c0392b', background: '#fff',
                color: '#c0392b', cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', gap: 4, fontWeight: 600
              }}
            >
              <RotateCcw size={11}/> Retry question
            </button>
          </div>
        )}
        <div className="va-msg-footer">
          {msg.spoken_info && (
            <span style={{ fontSize:10, background:'#e8f5e9', color:'#1b5e20', padding:'1px 6px', borderRadius:8, fontWeight:600 }}>
              🎙️ {msg.spoken_info}
            </span>
          )}

          <small>{new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</small>
        </div>

        {!isUser && (() => {
          const isThisMsgActive = playbackState?.messageId === msg.id
          const audioStatus = isThisMsgActive ? (playbackState?.status || 'stopped') : 'stopped'
          const msgLang = (msg.language || language || 'en').toLowerCase().split('-')[0]
          const langObj = LANGUAGES.find(l => l.code === msgLang) || { native: 'English', name: 'English', tts: 'en-IN' }
          const langBadge = `${langObj.native || langObj.name} (${langObj.tts || 'en-IN'})`

          return (
            <div className="va-playback-panel">
              <div className="va-lang-indicator" title={`Language: ${langBadge}`}>
                <Volume2
                  size={13}
                  className={audioStatus === 'playing' ? 'va-pulse-icon' : ''}
                  style={{ color: audioStatus === 'playing' ? '#1b5e20' : '#4b5563' }}
                />
                <span className="va-lang-indicator-text">{langBadge}</span>
                {audioStatus === 'playing' && <span className="va-status-pill playing">Speaking</span>}
                {audioStatus === 'paused' && <span className="va-status-pill paused">Paused</span>}
              </div>

              <div className="va-playback-controls">
                {audioStatus === 'stopped' ? (
                  <button
                    type="button"
                    className="va-ctrl-btn va-btn-listen"
                    onClick={() => onListen?.(msg)}
                    title="Listen response aloud"
                  >
                    <Play size={11} style={{ fill: 'currentColor' }}/> Listen
                  </button>
                ) : audioStatus === 'playing' ? (
                  <>
                    <button
                      type="button"
                      className="va-ctrl-btn va-btn-pause"
                      onClick={() => onPause?.()}
                      title="Pause playback"
                    >
                      <Pause size={11} style={{ fill: 'currentColor' }}/> Pause
                    </button>
                    <button
                      type="button"
                      className="va-ctrl-btn va-btn-stop"
                      onClick={() => onStop?.()}
                      title="Stop playback"
                    >
                      <Square size={10} style={{ fill: 'currentColor' }}/> Stop
                    </button>
                    <button
                      type="button"
                      className="va-ctrl-btn va-btn-replay"
                      onClick={() => onReplay?.(msg)}
                      title="Replay from start"
                    >
                      <RotateCcw size={11}/> Replay
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="va-ctrl-btn va-btn-resume"
                      onClick={() => onResume?.()}
                      title="Resume playback"
                    >
                      <Play size={11} style={{ fill: 'currentColor' }}/> Resume
                    </button>
                    <button
                      type="button"
                      className="va-ctrl-btn va-btn-stop"
                      onClick={() => onStop?.()}
                      title="Stop playback"
                    >
                      <Square size={10} style={{ fill: 'currentColor' }}/> Stop
                    </button>
                    <button
                      type="button"
                      className="va-ctrl-btn va-btn-replay"
                      onClick={() => onReplay?.(msg)}
                      title="Replay from start"
                    >
                      <RotateCcw size={11}/> Replay
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })()}

      </div>

    </div>

  )

}

// —— Main page —————————————————————————————————————————————————————————————————

export default function VoiceAssistant() {

  const navigate = useNavigate()

  const { language, setLanguage, t } = useLanguage()

  const [messages,     setMessages]     = useState([])

  const [convId,       setConvId]       = useState(null)

  const [convList,     setConvList]     = useState(() => lsLoadConvList())

  const [sidebarOpen,  setSidebarOpen]  = useState(false)

  // Input

  const [textInput,    setTextInput]    = useState('')

  const [transcript,   setTranscript]   = useState('')

  const [editTrans,    setEditTrans]    = useState(false)

  // Recording

  const [recording,    setRecording]    = useState(false)

  const [recSeconds,   setRecSeconds]   = useState(0)

  const mediaRecRef    = useRef(null)

  const chunksRef      = useRef([])

  const recTimerRef    = useRef(null)

  const speechRecRef   = useRef(null)

  const browserTranscriptRef = useRef('')

  // Processing

  const [status,       setStatus]       = useState('idle') // idle|recording|transcribing|thinking|speaking|error

  const [errorMsg,     setErrorMsg]     = useState('')

  // TTS
  const [speaking,     setSpeaking]     = useState(false)
  const lastTtsRef     = useRef(null)

  // Multi-state voice playback controller (Listen, Pause, Resume, Stop, Replay)
  const [playbackState, setPlaybackState] = useState({
    messageId: null,
    status: 'stopped', // 'playing' | 'paused' | 'stopped'
    lang: 'en'
  })
  const currentAudioRef = useRef(null)
  const isBrowserSpeakingRef = useRef(false)

  const handleStop = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
      } catch {}
      currentAudioRef.current = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel() } catch {}
    }
    isBrowserSpeakingRef.current = false
    setPlaybackState({ messageId: null, status: 'stopped', lang: 'en' })
    setSpeaking(false)
    setStatus(prev => prev === 'speaking' ? 'idle' : prev)
  }, [])

  const handlePause = useCallback(() => {
    if (currentAudioRef.current) {
      try { currentAudioRef.current.pause() } catch {}
    }
    if (isBrowserSpeakingRef.current && typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.pause() } catch {}
    }
    setPlaybackState(prev => ({ ...prev, status: 'paused' }))
    setSpeaking(false)
  }, [])

  const handleResume = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.play()
        setPlaybackState(prev => ({ ...prev, status: 'playing' }))
        setSpeaking(true)
        return
      } catch {}
    }
    if (isBrowserSpeakingRef.current && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.resume()
        setPlaybackState(prev => ({ ...prev, status: 'playing' }))
        setSpeaking(true)
        return
      } catch {}
    }
  }, [])

  const handlePlayMessage = useCallback((msg, fromStart = true) => {
    if (!msg) return
    handleStop()

    const textToSpeak = cleanForTTS(msg.tts_text || msg.content)
    if (!textToSpeak) return

    const targetCode = (msg.language || language || 'en').toLowerCase().split('-')[0]
    setPlaybackState({ messageId: msg.id, status: 'playing', lang: targetCode })
    setSpeaking(true)
    setStatus('speaking')

    const onEnd = () => {
      setPlaybackState({ messageId: null, status: 'stopped', lang: 'en' })
      setSpeaking(false)
      setStatus(prev => prev === 'speaking' ? 'idle' : prev)
    }

    if (targetCode === 'or') {
      isBrowserSpeakingRef.current = true
      fallbackBrowserSpeak(textToSpeak, targetCode, onEnd)
      return
    }

    try {
      const audioUrl = `${VOICE_API}/api/voice/tts?text=${encodeURIComponent(textToSpeak.slice(0, 1500))}&language=${encodeURIComponent(targetCode)}`
      const audio = new Audio(audioUrl)
      currentAudioRef.current = audio

      audio.onended = () => {
        if (currentAudioRef.current === audio) currentAudioRef.current = null
        onEnd()
      }
      audio.onerror = () => {
        if (currentAudioRef.current === audio) currentAudioRef.current = null
        isBrowserSpeakingRef.current = true
        fallbackBrowserSpeak(textToSpeak, targetCode, onEnd)
      }

      const p = audio.play()
      if (p !== undefined) {
        p.catch(() => {
          if (currentAudioRef.current === audio) currentAudioRef.current = null
          isBrowserSpeakingRef.current = true
          fallbackBrowserSpeak(textToSpeak, targetCode, onEnd)
        })
      }
    } catch {
      isBrowserSpeakingRef.current = true
      fallbackBrowserSpeak(textToSpeak, targetCode, onEnd)
    }
  }, [language, handleStop])

  const handleListen = useCallback((msg) => {
    if (!msg) return
    if (playbackState.messageId === msg.id && playbackState.status === 'playing') {
      handlePause()
      return
    }
    if (playbackState.messageId === msg.id && playbackState.status === 'paused') {
      handleResume()
      return
    }
    handlePlayMessage(msg, true)
  }, [playbackState, handlePause, handleResume, handlePlayMessage])

  const handleReplay = useCallback((msg) => {
    if (!msg) return
    handlePlayMessage(msg, true)
  }, [handlePlayMessage])

  // Attached produce photo for quality / disease inspection

  const [attachedPhoto, setAttachedPhoto] = useState(null)
  const [spokenLanguage, setSpokenLanguage] = useState('auto')
  const [detectedSpokenLang, setDetectedSpokenLang] = useState(null)
  const [aiResponseLanguage, setAiResponseLanguage] = useState('')

  // Backend

  const [backendOk,    setBackendOk]    = useState(null)

  const bottomRef      = useRef(null)

  const inputRef       = useRef(null)

  const photoInputRef  = useRef(null)   // hidden file input for disease photo upload

  // Check backend health on mount

  useEffect(() => {

    callVoiceApi('/api/voice/health')
      .then(async r => {
        if (!r.ok) return false
        return await safeParseJson(r)
      })
      .then(d => setBackendOk(d || false))
      .catch(() => setBackendOk(false))
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load conversation list from backend
  const loadConvList = useCallback(async () => {
    try {
      const r = await callVoiceApi(`/api/conversations?user_id=${USER_ID}`)
      if (r && r.ok) {
        const d = await safeParseJson(r)
        if (d && d.conversations) {
          setConvList(d.conversations || [])
          lsSaveConvList(d.conversations || [])
        }
      }
    } catch {
      // use localStorage fallback
    }
  }, [])

  useEffect(() => { loadConvList() }, [loadConvList])

  // Load a specific conversation
  const loadConversation = async (id) => {
    try {
      const r = await callVoiceApi(`/api/conversations/${id}?user_id=${USER_ID}`)
      if (r && r.ok) {
        const d = await safeParseJson(r)
        const ms = d?.conversation?.messages || []

        setMessages(ms)

        setConvId(id)

        setLanguage(d.conversation?.language || 'en')

        setSidebarOpen(false)

      }

    } catch { /* ignore */ }

  }

  const startNewConversation = () => {

    setMessages([])

    setConvId(null)

    setTranscript('')

    setTextInput('')

    setStatus('idle')

    setErrorMsg('')

    stopSpeaking()

  }

  const deleteConversation = async (id, e) => {

    e.stopPropagation()

    if (!window.confirm('Delete this conversation? This cannot be undone.')) return

    try {

      await callVoiceApi(`/api/conversations/${id}?user_id=${USER_ID}`, { method:'DELETE' })

    } catch { /* ignore */ }

    setConvList(prev => prev.filter(c => c.id !== id))

    lsSaveConvList(convList.filter(c => c.id !== id))

    if (convId === id) startNewConversation()

  }

  const renameConversation = async (id, e) => {

    e.stopPropagation()

    const title = window.prompt('New name for this conversation:')

    if (!title) return

    try {

      await callVoiceApi(`/api/conversations/${id}?user_id=${USER_ID}`, {

        method:'PATCH', headers:{'Content-Type':'application/json'},

        body: JSON.stringify({ title }),

      })

      await loadConvList()

    } catch { /* ignore */ }

  }

  // —— Recording ———————————————————————————————————————————————————————————————

  const startRecording = async () => {

    setErrorMsg(''); setTranscript(''); setStatus('recording')
    browserTranscriptRef.current = ''

    // Parallel browser SpeechRecognition (instant client fallback & zero-latency preview)
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const sr = new SpeechRecognition()
        sr.continuous = true
        sr.interimResults = true
        const langMap = {
          en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN',
          kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', or: 'or-IN', mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN'
        }
        sr.lang = langMap[spokenLanguage] || (spokenLanguage !== 'auto' ? spokenLanguage : (language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-IN'))
        sr.onresult = (ev) => {
          let text = ''
          for (let i = 0; i < ev.results.length; i++) {
            text += ev.results[i][0].transcript + ' '
          }
          if (text.trim()) {
            browserTranscriptRef.current = text.trim()
            setTranscript(text.trim())
          }
        }
        sr.onerror = () => {}
        sr.start()
        speechRecRef.current = sr
      }
    } catch {
      // SpeechRecognition is optional enhancement
    }

    try {

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      chunksRef.current = []

      let mimeType = 'audio/webm'
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus'
        else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm'
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4'
        else if (MediaRecorder.isTypeSupported('audio/aac')) mimeType = 'audio/aac'
      }

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }

      mr.onstop          = () => { stream.getTracks().forEach(t=>t.stop()); processAudio() }

      mr.start(200)

      mediaRecRef.current = mr

      setRecording(true)

      setRecSeconds(0)

      recTimerRef.current = setInterval(() => setRecSeconds(s => s+1), 1000)

    } catch (err) {

      if (speechRecRef.current) {
        try { speechRecRef.current.stop() } catch {}
      }

      setStatus('error')

      setErrorMsg(`Microphone access denied: ${err.message}. Please allow microphone access in your browser.`)

    }

  }

  const stopRecording = () => {

    if (speechRecRef.current) {
      try { speechRecRef.current.stop() } catch {}
    }

    if (mediaRecRef.current?.state === 'recording') {

      mediaRecRef.current.stop()

    }

    clearInterval(recTimerRef.current)

    setRecording(false)

  }

  const processAudio = async () => {

    setStatus('transcribing')
    const fallbackTranscript = browserTranscriptRef.current?.trim() || ''

    try {

      const blob = new Blob(chunksRef.current, { type:'audio/webm' })

      if (blob.size < 1000) {

        if (fallbackTranscript) {
          setTranscript(fallbackTranscript)
          setStatus('idle')
          await sendMessage(fallbackTranscript, { code: spokenLanguage !== 'auto' ? spokenLanguage : (language || 'en'), name: 'User', confidence: 0.9 })
          return
        }

        setStatus('idle')

        setErrorMsg('Audio too short — please hold the button and speak clearly.')

        return

      }

      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      if (spokenLanguage && spokenLanguage !== 'auto') {
        fd.append('language', spokenLanguage)
      } else {
        fd.append('language', 'auto')
      }

      let data = null
      let apiError = null
      try {
        const r = await callVoiceApi('/api/voice/transcribe', { method:'POST', body:fd })
        data = await safeParseJson(r)
        if (!r.ok || !data) {
          apiError = data?.detail || `Server returned HTTP ${r?.status || 'error'}`
        }
      } catch (fErr) {
        apiError = fErr.message
      }

      const finalTranscript = data?.transcript?.trim() || fallbackTranscript

      if (!finalTranscript) {
        setStatus('idle')
        let userMsg = data?.warning || apiError || 'No speech detected. Please speak clearly and try again.'
        if (typeof userMsg === 'string' && (userMsg.includes('Whisper') || userMsg.includes('server logs') || userMsg.includes('503'))) {
          userMsg = 'No speech detected. Please hold the microphone and speak clearly, or type your question below.'
        }
        setErrorMsg(userMsg)
        return
      }

      setTranscript(finalTranscript)

      const detectedInfo = {
        code: data?.detected_language || (spokenLanguage !== 'auto' ? spokenLanguage : (language || 'en')),
        name: data?.language_name || 'Language',
        confidence: data?.confidence || 0.9,
      }
      setDetectedSpokenLang(detectedInfo)
      setStatus('idle')

      // Auto-send after transcription with detected language context
      await sendMessage(finalTranscript, detectedInfo)

    } catch (err) {

      if (fallbackTranscript) {
        setTranscript(fallbackTranscript)
        setStatus('idle')
        await sendMessage(fallbackTranscript, { code: spokenLanguage !== 'auto' ? spokenLanguage : (language || 'en'), name: 'User', confidence: 0.9 })
        return
      }

      setStatus('error')

      let errText = err.message || ''
      if (errText.includes('Whisper') || errText.includes('server logs') || errText.includes('503')) {
        errText = 'Could not process audio. Please speak clearly or type your question.'
      } else {
        errText = `Transcription issue: ${errText}. Please speak clearly or type your question.`
      }
      setErrorMsg(errText)

    }

  }

  const handlePhotoSelected = (file) => {

    if (!file) return

    const previewUrl = URL.createObjectURL(file)

    const reader = new FileReader()

    reader.onload = () => {

      setAttachedPhoto({

        file,

        previewUrl,

        base64: reader.result,

        name: file.name,

      })

    }

    reader.readAsDataURL(file)

  }

  // —— Send message —————————————————————————————————————————————————————————————

    const sendMessage = async (text = null, detectedOverride = null) => {
    const rawQ = (text !== null ? text : textInput || transcript).trim()
    if (!rawQ && !attachedPhoto) return

    const textLang = detectTextLanguage(rawQ)
    const activeDetected = detectedOverride || (textLang.detected ? textLang : detectedSpokenLang)
    const q = rawQ || (attachedPhoto ? `Please analyze my crop produce quality from this photo and give market and profit advice.` : '')
    const photoToSend = attachedPhoto

    setTextInput(''); setTranscript(''); setEditTrans(false); setAttachedPhoto(null)
    setStatus('thinking')
    setErrorMsg('')

    const inputLangCode = activeDetected?.code || (spokenLanguage !== 'auto' ? spokenLanguage : textLang.code)
    const inputLangName = activeDetected?.name || textLang.name
    // Output language: explicit choice > detected non-English script > active app language > input language
    const targetRespLang = aiResponseLanguage || (textLang.detected ? textLang.code : (language || inputLangCode))

    // Optimistically add user message
    const userMsg = {
      role: 'user',
      content: rawQ || `📷 Crop produce photo attached: ${photoToSend?.name || 'produce.jpg'}`,
      photo_url: photoToSend?.previewUrl || null,
      language: inputLangCode,
      spoken_info: activeDetected ? `${activeDetected.name} (${Math.round((activeDetected.confidence || 1) * 100)}%)` : (textLang.detected ? `${textLang.name} (detected)` : null),
      timestamp: new Date().toISOString(),
      id: `tmp_${Date.now()}`
    }

    setMessages(prev => [...prev, userMsg])

    try {
      const body = {
        message: q,
        language: targetRespLang,
        detected_language: inputLangCode,
        detected_language_name: inputLangName,
        website_language: language,
        response_language: targetRespLang,
        user_id: USER_ID,
        image_b64: photoToSend?.base64 || null,
        image_name: photoToSend?.name || null
      }

      if (convId) body.conversation_id = convId

      let r = null
      let data = null
      let fetchErr = null
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          r = await callVoiceApi('/api/assistant/chat', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify(body),
          })
          data = await safeParseJson(r)
          if (!r.ok || !data) throw new Error(data?.detail || `Chat API returned HTTP ${r?.status || 'error'}`)
          fetchErr = null
          break
        } catch (err) {
          fetchErr = err
          if (attempt === 0) {
            await new Promise(res => setTimeout(res, 1200))
          }
        }
      }
      if (fetchErr) throw fetchErr

      const aiMsg = {

        role:                  'assistant',

        content:               data.reply,

        language:              data.language,

        timestamp:             data.timestamp,

        id:                    data.message_id,

        module_id:             data.module_id,

        module_result:         data.module_result,   // full raw data for rendering

        multi_modules:         data.multi_modules,   // additional module results for multi-intent queries

        module_result_summary: data.module_result ? '(module data loaded)' : null,

        suggested_route:       data.suggested_route,

        tts_text:              data.tts_text,

      }

      setConvId(data.conversation_id)

      setMessages(prev => [...prev, aiMsg])

      // Automatically speak the response aloud in detected language
      handlePlayMessage(aiMsg, true)

      await loadConvList()

    } catch (err) {

      setStatus('error')

      setErrorMsg(`Could not get answer: ${err.message}`)

      setMessages(prev => [...prev, {
        role:'assistant', content:`Sorry, I could not process that. ${err.message}`,
        isError: true, failedQuestion: q,
        language, timestamp:new Date().toISOString(), id:`err_${Date.now()}`
      }])

    }

  }

  // Format module result for display in the message

  const formatModuleResult = (moduleId, result) => {

    if (!result) return null

    if (moduleId === 'weather' && result.available) {

      const s = result.summary || {}

      const rain = result.total_rainfall_mm || s.total_rainfall_mm || '?'

      const tmax = result.max_temp_c || s.max_temp_c || '?'

      return `30-day rainfall: ${rain} mm · Max temp: ${tmax}°C · Source: NASA POWER`

    }

    if (moduleId === 'lac_history' && result.available) {

      const nat = result.national_by_year || []

      return nat.slice(-3).map(r=>`${r.year_label}: ${Math.round(r.total_t||0)} t`).join(' | ')

        + '\nSource: ICAR-IINRG Statistics Bulletins'

    }

    if (moduleId === 'lac_suitability') {

      const level = result.overall_risk_level

      const score = result.overall_risk_score

      return level ? `Environmental risk: ${level} (score ${score}/100) · Source: ICAR-IINRG thresholds` : null

    }

    if (moduleId === 'pearl_suitability' && result.available) {

      return `Climate suitability score: ${result.overall_score}/100 — ${result.overall_label} · ${result.thresholds}`

    }

    // Generic

    const keys = ['overall_risk_level','overall_risk_score','forecast_tonnes','available','note']

    const parts = keys.filter(k=>result[k]!==undefined).map(k=>`${k}: ${result[k]}`)

    return parts.length ? parts.join(' · ') : null

  }

  // —— Photo upload for crop disease analysis ———————————————————————————————

  const uploadPhoto = async (file) => {

    if (!file) return

    setStatus('thinking')

    setErrorMsg('')

    // Show user message with the photo name

    const userMsg = {

      role: 'user', content: `📷 Uploaded photo: ${file.name}`,

      language, timestamp: new Date().toISOString(), id: `photo_${Date.now()}`,

    }

    setMessages(prev => [...prev, userMsg])

    try {

      const fd = new FormData()

      fd.append('image', file, file.name)

      fd.append('language', language)

      // Try to extract crop from recent conversation context

      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')

      if (lastUserMsg?.content) fd.append('crop', lastUserMsg.content.slice(0, 60))

      const r    = await fetch(`${HEALTH_API}/api/health/disease`, { method: 'POST', body: fd })
      const data = await safeParseJson(r)

      if (!r.ok || !data) throw new Error(data?.detail || `Disease analysis failed (${r?.status || 'network error'})`)

      const diseaseName = data.disease_name || 'Analysis complete'

      const severity    = data.severity || 'Unknown'

      const replyText   = data.disease_detected === false

        ? `Your crop looks healthy! No disease detected. ${data.analysis_note || ''}`

        : `Disease detected: ${diseaseName} (${severity} severity). ${data.immediate_action || ''} ${data.analysis_note || ''}`

      const aiMsg = {

        role:          'assistant',

        content:       replyText,

        language,

        timestamp:     new Date().toISOString(),

        id:            `disease_${Date.now()}`,

        module_id:     'disease',

        module_result: { ...data, photo_url: URL.createObjectURL(file) },

        tts_text:      replyText.slice(0, 300),

      }

      setMessages(prev => [...prev, aiMsg])
      handlePlayMessage(aiMsg, true)

    } catch (err) {

      setStatus('error')

      setErrorMsg(`Disease analysis failed: ${err.message}`)

      setMessages(prev => [...prev, {

        role: 'assistant', content: `Sorry, disease analysis failed. ${err.message}`,

        language, timestamp: new Date().toISOString(), id: `err_${Date.now()}`,

      }])

    }

  }

  // —— TTS controls ——————————————————————————————————————————————————————————

  const stopSpeaking = () => {
    handleStop()
  }

  const replayLast = () => {
    const lastAI = [...messages].reverse().find(m => m.role==='assistant')
    if (!lastAI) return
    handlePlayMessage(lastAI, true)
  }

  const handleNavigate = (route) => {

    navigate(route)

  }

  const quickPrompts = QUICK_PROMPTS[language] || QUICK_PROMPTS.en

  const statusLabel = {

    idle:         '',

    recording:    `Recording… ${recSeconds}s`,

    transcribing: 'Transcribing…',

    thinking:     'Thinking…',

    speaking:     'Speaking…',

    error:        'Error',

  }[status] || ''

  return (

    <div className="page va-page">

      {/* —— Header ——————————————————————————————————————————————————————————— */}

      <div className="va-header">

        <div className="va-header-left">

          <span className="va-header-icon"><MessageCircle size={22}/></span>

          <div>

            <h1>{t('aiAssistant', 'AI Farm Assistant')}</h1>

            <p>{t('Ask in your language · get answers from your farm data', 'Ask in your language · get answers from your farm data')}</p>

          </div>

        </div>

        <div className="va-header-right">

          {/* Language selector */}

          <select value={language} onChange={e=>setLanguage(e.target.value)} className="va-lang-select">

            {LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.native} ({l.name})</option>)}

          </select>

          <button className="button secondary" onClick={()=>setSidebarOpen(v=>!v)}>

            History

          </button>

          <button className="button" onClick={startNewConversation}>

            <Plus size={14}/> New

          </button>

        </div>

      </div>

      {/* —— Backend status —————————————————————————————————————————————————— */}

      {backendOk === false && (

        <div className="va-offline-banner">

          <AlertTriangle size={14}/>

          <span>

            Voice AI backend is connecting. Text input and speech recognition are active.

            &nbsp; Text input still works but transcription and AI responses require the backend.

          </span>

        </div>

      )}

      {backendOk && !backendOk.gemini_ready && (

        <div className="va-offline-banner" style={{ background:'#fff8f0', borderColor:'#f5d6b0' }}>

          <AlertTriangle size={14}/> <span>

            Gemini API key not configured. Add <code>GEMINI_API_KEY</code> to your <code>.env</code> file

            and restart the voice backend.

          </span>

        </div>

      )}

      <div className="va-layout">

        {/* —— Sidebar: conversation history —————————————————————————————————— */}

        {sidebarOpen && (

          <aside className="va-sidebar">

            <div className="va-sidebar-header">

              <b>Conversations</b>

              <button className="icon-button" onClick={()=>setSidebarOpen(false)}><X size={16}/></button>

            </div>

            {convList.length === 0 ? (

              <p className="va-sidebar-empty">No conversations yet.</p>

            ) : (

              convList.map(c => (

                <div key={c.id} className={`va-conv-item ${c.id===convId?'active':''}`}

                  onClick={()=>loadConversation(c.id)}>

                  <div className="va-conv-title">{c.title || 'Untitled'}</div>

                  <div className="va-conv-meta">

                    {c.message_count} msgs · {new Date(c.updated_at).toLocaleDateString('en-IN')}

                  </div>

                  <div className="va-conv-actions">

                    <button className="icon-button" title="Rename" onClick={e=>renameConversation(c.id,e)}><Edit3 size={11}/></button>

                    <button className="icon-button" title="Delete" onClick={e=>deleteConversation(c.id,e)}><Trash2 size={11}/></button>

                  </div>

                </div>

              ))

            )}

          </aside>

        )}

        {/* —— Main chat area ————————————————————————————————————————————————— */}

        <div className="va-main">

          {/* Messages */}

          <div className="va-messages">

            {messages.length === 0 && (

              <div className="va-welcome">

                <MessageCircle size={36}/>

                <h2>Namaste! Ask me anything about your farm.</h2>

                <p>Speak in Tamil, Telugu, Hindi, or any supported language. I use your actual farm data to answer.</p>

                <div className="va-welcome-hint">

                  <ImagePlus size={14}/>

                  <span>Tap the <b>photo button</b> to upload a crop photo for instant disease analysis.</span>

                </div>

                <div className="va-quick-prompts">

                  {quickPrompts.map(q => (

                    <button key={q} className="va-quick-btn" onClick={()=>sendMessage(q)}>

                      <ArrowRight size={11}/> {q}

                    </button>

                  ))}

                </div>

              </div>

            )}

            {messages.map((msg, i) => (
              <BubbleErrorBoundary key={`eb-${msg.id || i}`}>
                <MessageBubble
                  key={msg.id || i}
                  msg={msg}
                  language={language}
                  playbackState={playbackState}
                  onListen={handleListen}
                  onPause={handlePause}
                  onResume={handleResume}
                  onStop={handleStop}
                  onReplay={handleReplay}
                  onNavigate={handleNavigate}
                  onRetry={q => sendQuestion(q)}
                />
              </BubbleErrorBoundary>
            ))}

            {/* Thinking indicator */}

            {(status === 'thinking' || status === 'transcribing') && (

              <div className="va-msg va-msg-ai">

                <span className="va-msg-icon"><Loader size={14} className="spin"/></span>

                <div className="va-msg-body">

                  <div className="va-typing">

                    <span/><span/><span/>

                  </div>

                  <small style={{ color:'#8a968c' }}>{statusLabel}</small>

                </div>

              </div>

            )}

            <div ref={bottomRef}/>

          </div>

          {/* Status bar */}

          {statusLabel && (

            <div className={`va-status-bar ${status==='error'?'error':''}`}>

              {status==='error' ? <AlertTriangle size={13}/> : <Loader size={13} className={status!=='idle'?'spin':''}/>}

              <span>{statusLabel}</span>

            </div>

          )}

          {errorMsg && (

            <div className="va-error-msg"><AlertTriangle size={13}/> {errorMsg}</div>

          )}

          {/* Transcript preview */}

          {transcript && (

            <div className="va-transcript">

              <div className="va-transcript-header">

                <small>Transcribed (edit before sending)</small>

                <button className="icon-button" onClick={()=>setEditTrans(v=>!v)}><Edit3 size={12}/></button>

              </div>

              {editTrans ? (

                <textarea className="va-transcript-edit"

                  value={transcript} onChange={e=>setTranscript(e.target.value)}

                  rows={3}/>

              ) : (

                <p className="va-transcript-text">{transcript}</p>

              )}

              <div style={{ display:'flex', gap:8, marginTop:6 }}>

                <button className="button" style={{ flex:1 }} onClick={()=>sendMessage(transcript)}>

                  <Send size={13}/> Send this

                </button>

                <button className="button secondary" onClick={()=>setTranscript('')}>

                  <X size={13}/> Discard

                </button>

              </div>

            </div>

          )}

          {/* Input area container */}

          <div className="va-input-area-container" style={{ width: '100%' }}>
            {/* Spoken language selector & live detection feedback */}
            <div className="va-speech-bar">
              <div className="va-speech-selector-wrap">
                <span>🎙️ Voice input:</span>
                <select
                  value={spokenLanguage}
                  onChange={e => {
                    setSpokenLanguage(e.target.value)
                    setDetectedSpokenLang(null)
                  }}
                  className="va-speech-select"
                  title="Speech Recognition Language (Auto-detect by default)"
                >
                  {SPOKEN_LANG_OPTIONS.map(opt => (
                    <option key={opt.code} value={opt.code}>
                      {opt.native}
                    </option>
                  ))}
                </select>
              </div>

              {detectedSpokenLang && (
                <div className="va-detected-lang-pill">
                  <span className="dot" />
                  <span>
                    Detected: <b>{detectedSpokenLang.name}</b> ({Math.round((detectedSpokenLang.confidence || 1) * 100)}%)
                  </span>
                  <button
                    type="button"
                    onClick={() => setDetectedSpokenLang(null)}
                    title="Dismiss badge"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Attached Photo Preview Chip */}

            {attachedPhoto && (

              <div className="va-attached-chip">

                <img src={attachedPhoto.previewUrl} alt="Attached crop" className="va-attached-thumb" />

                <div className="va-attached-info">

                  <b>Produce Photo Attached</b>

                  <small>{attachedPhoto.name} · Ready for quality grading & market advice</small>

                </div>

                <button className="icon-button" onClick={() => setAttachedPhoto(null)} title="Remove photo">

                  <X size={15} />

                </button>

              </div>

            )}

            <div className="va-input-area">

              {/* Hidden file input for photo upload */}

              <input

                ref={photoInputRef}

                type="file"

                accept="image/jpeg,image/png,image/webp,image/heic"

                style={{ display: 'none' }}

                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSelected(f); e.target.value = '' }}

              />

              {/* Mic button */}

              <button

                className={`va-mic-btn ${recording?'recording':''} ${status==='transcribing'?'processing':''}`}

                onClick={recording ? stopRecording : startRecording}

                disabled={status==='thinking' || status==='transcribing'}

                aria-label={recording ? 'Stop recording' : 'Start recording'}

                title={recording ? 'Tap to stop' : 'Tap to speak'}

              >

                {recording ? <MicOff size={26}/> : status==='transcribing' ? <Loader size={26} className="spin"/> : <Mic size={26}/>}

                {recording && <span className="va-rec-pulse"/>}

              </button>

              {/* Photo upload button */}

              <button

                className={`va-photo-btn ${attachedPhoto ? 'has-photo' : ''}`}

                onClick={() => photoInputRef.current?.click()}

                disabled={status==='thinking'}

                title="Attach crop/produce photo for quality grading or disease analysis"

                aria-label="Attach crop photo"

              >

                <ImagePlus size={20}/>

              </button>

              {/* Text input */}

              <div className="va-text-input-wrap">

                <input

                  ref={inputRef}

                  value={textInput}

                  onChange={e=>setTextInput(e.target.value)}

                  onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage() } }}

                  placeholder={recording ? `Recording… ${recSeconds}s` : attachedPhoto ? 'Add details (crop, quantity, region, date) or send now…' : t('typeOrSpeakPlaceholder', 'Type or speak your question…')}

                  disabled={recording || status==='thinking'}

                  className="va-text-input"

                />

                <button

                  className="va-send-btn"

                  onClick={()=>sendMessage()}

                  disabled={(!textInput.trim() && !attachedPhoto) || status==='thinking'}

                >

                  {status==='thinking' ? <Loader size={18} className="spin"/> : <Send size={18}/>}

                </button>

              </div>

            {/* TTS controls */}

            <div className="va-tts-controls">

              {speaking ? (

                <button className="va-tts-btn active" onClick={stopSpeaking} title="Stop speaking">

                  <Square size={15}/>

                </button>

              ) : (

                <button className="va-tts-btn" onClick={replayLast}

                  disabled={!messages.some(m=>m.role==='assistant')} title="Replay last answer">

                  <Play size={15}/>

                </button>

              )}

              {speaking && <span className="va-speaking-dot"/>}

            </div>

          </div>

        </div>

          {/* Module quick links */}

          <div className="va-module-links">

            <small>Open module:</small>

            {[
              { path: '/production',          label: 'production' },
              { path: '/schemes',             label: 'schemes' },
              { path: '/crop-health',         label: 'crop health' },
              { path: '/disease',             label: 'disease' },
              { path: '/water-risk',          label: 'water risk' },
              { path: '/crop-recommendation', label: 'crop recommendation' },
              { path: '/market',              label: 'market' },
              { path: '/loss-insurance',      label: 'crop loss' },
              { path: '/cash-flow',           label: 'cash flow' },
              { path: '/lac',                 label: 'lac' },
              { path: '/pearl',               label: 'pearl' },
            ].map(m => (

              <button key={m.path} className="va-module-link-btn" onClick={() => handleNavigate(m.path)}>

                {m.label}

              </button>

            ))}

          </div>

        </div>

      </div>

    </div>

  )

}

