// src/utils/transliterate.js
// High-performance dynamic phonetic transliteration engine for Indic scripts
// Converts arbitrary English / Roman place names, agricultural terms, and entity names
// into Hindi, Tamil, Telugu, Kannada, Malayalam, Punjabi, and Odia on the fly without hardcoding.

const SCRIPT_DATA = {
  hi: {
    name: 'Hindi',
    vowels: {
      aa: 'ा', a: '', ee: 'ी', ii: 'ी', i: 'ि', oo: 'ू', uu: 'ू', u: 'ु',
      ai: 'ै', ay: 'ै', au: 'ौ', ou: 'ौ', e: 'े', o: 'ो'
    },
    indVowels: {
      aa: 'आ', a: 'अ', ee: 'ई', ii: 'ई', i: 'इ', oo: 'ऊ', uu: 'ऊ', u: 'उ',
      ai: 'ऐ', ay: 'ऐ', au: 'औ', ou: 'औ', e: 'ए', o: 'ओ'
    },
    consonants: {
      chh: 'छ', ch: 'च', kh: 'ख', gh: 'घ', jh: 'झ', th: 'थ', dh: 'ध',
      ph: 'फ', bh: 'भ', sh: 'श', zh: 'ज़', ng: 'ंग', ny: 'ञ',
      k: 'क', g: 'ग', c: 'क', j: 'ज', t: 'त', d: 'द', n: 'न',
      p: 'प', b: 'ब', m: 'म', y: 'य', r: 'र', l: 'ल', v: 'व', w: 'व',
      s: 'स', h: 'ह', z: 'ज़', f: 'फ़', q: 'क', x: 'क्स'
    },
    virama: '्'
  },
  ta: {
    name: 'Tamil',
    vowels: {
      aa: 'ா', a: '', ee: 'ீ', ii: 'ீ', i: 'ி', oo: 'ூ', uu: 'ூ', u: 'ு',
      ai: 'ை', ay: 'ை', au: 'ௌ', ou: 'ௌ', e: 'ெ', o: 'ொ'
    },
    indVowels: {
      aa: 'ஆ', a: 'அ', ee: 'ஈ', ii: 'ஈ', i: 'இ', oo: 'ஊ', uu: 'ஊ', u: 'உ',
      ai: 'ஐ', ay: 'ஐ', au: 'ஔ', ou: 'ஔ', e: 'எ', o: 'ஒ'
    },
    consonants: {
      chh: 'ச', ch: 'ச', kh: 'க', gh: 'க', jh: 'ஜ', th: 'த', dh: 'த',
      ph: 'ப', bh: 'ப', sh: 'ஷ', zh: 'ழ', ng: 'ங', ny: 'ஞ',
      k: 'க', g: 'க', c: 'க', j: 'ஜ', t: 'த', d: 'த', n: 'ந',
      p: 'ப', b: 'ப', m: 'ம', y: 'ய', r: 'ர', l: 'ல', v: 'வ', w: 'வ',
      s: 'ஸ', h: 'ஹ', z: 'ஜ', f: 'ப', q: 'க', x: 'கஸ'
    },
    virama: '்'
  },
  te: {
    name: 'Telugu',
    vowels: {
      aa: 'ా', a: '', ee: 'ీ', ii: 'ీ', i: 'ి', oo: 'ూ', uu: 'ూ', u: 'ు',
      ai: 'ై', ay: 'ై', au: 'ౌ', ou: 'ౌ', e: 'ె', o: 'ొ'
    },
    indVowels: {
      aa: 'ఆ', a: 'అ', ee: 'ఈ', ii: 'ఈ', i: 'ఇ', oo: 'ఊ', uu: 'ఊ', u: 'ఉ',
      ai: 'ఐ', ay: 'ఐ', au: 'ఔ', ou: 'ఔ', e: 'ఎ', o: 'ఒ'
    },
    consonants: {
      chh: 'ఛ', ch: 'చ', kh: 'ఖ', gh: 'ఘ', jh: 'ఝ', th: 'థ', dh: 'ధ',
      ph: 'ఫ', bh: 'భ', sh: 'శ', zh: 'జ', ng: 'ఙ', ny: 'ఞ',
      k: 'క', g: 'గ', c: 'క', j: 'జ', t: 'త', d: 'ద', n: 'న',
      p: 'ప', b: 'బ', m: 'మ', y: 'య', r: 'ర', l: 'ల', v: 'వ', w: 'వ',
      s: 'స', h: 'హ', z: 'జ', f: 'ఫ', q: 'క', x: 'క్స్'
    },
    virama: '్'
  },
  kn: {
    name: 'Kannada',
    vowels: {
      aa: 'ಾ', a: '', ee: 'ೀ', ii: 'ೀ', i: 'ಿ', oo: 'ೂ', uu: 'ೂ', u: 'ು',
      ai: 'ೈ', ay: 'ೈ', au: 'ೌ', ou: 'ೌ', e: 'ೆ', o: 'ೊ'
    },
    indVowels: {
      aa: 'ಆ', a: 'ಅ', ee: 'ಈ', ii: 'ಈ', i: 'ಇ', oo: 'ಊ', uu: 'ಊ', u: 'ಉ',
      ai: 'ಐ', ay: 'ಐ', au: 'ಔ', ou: 'ಔ', e: 'ಎ', o: 'ಒ'
    },
    consonants: {
      chh: 'ಛ', ch: 'ಚ', kh: 'ಖ', gh: 'ಘ', jh: 'ಝ', th: 'ಥ', dh: 'ಧ',
      ph: 'ಫ', bh: 'ಭ', sh: 'ಶ', zh: 'ಜ', ng: 'ಙ', ny: 'ಞ',
      k: 'ಕ', g: 'ಗ', c: 'ಕ', j: 'ಜ', t: 'ತ', d: 'ದ', n: 'ನ',
      p: 'ಪ', b: 'ಬ', m: 'ಮ', y: 'ಯ', r: 'ರ', l: 'ಲ', v: 'ವ', w: 'ವ',
      s: 'ಸ', h: 'ಹ', z: 'ಜ', f: 'ಫ', q: 'ಕ', x: 'ಕ್ಸ್'
    },
    virama: '್'
  },
  ml: {
    name: 'Malayalam',
    vowels: {
      aa: 'ാ', a: '', ee: 'ീ', ii: 'ീ', i: 'ി', oo: 'ൂ', uu: 'ൂ', u: 'ു',
      ai: 'ൈ', ay: 'ൈ', au: 'ൌ', ou: 'ൌ', e: 'െ', o: 'ൊ'
    },
    indVowels: {
      aa: 'ആ', a: 'അ', ee: 'ഈ', ii: 'ഈ', i: 'ഇ', oo: 'ഊ', uu: 'ഊ', u: 'ഉ',
      ai: 'ഐ', ay: 'ഐ', au: 'ഔ', ou: 'ഔ', e: 'എ', o: 'ഒ'
    },
    consonants: {
      chh: 'ഛ', ch: 'ച', kh: 'ഖ', gh: 'ഘ', jh: 'ഝ', th: 'ഥ', dh: 'ധ',
      ph: 'ഫ', bh: 'ഭ', sh: 'ശ', zh: 'ഴ', ng: 'ങ', ny: 'ഞ',
      k: 'ക', g: 'ഗ', c: 'ക', j: 'ജ', t: 'ത', d: 'ദ', n: 'ന',
      p: 'പ', b: 'ബ', m: 'മ', y: 'യ', r: 'ര', l: 'ല', v: 'വ', w: 'വ',
      s: 'സ', h: 'ഹ', z: 'ജ', f: 'ഫ', q: 'ക', x: 'ക്സ്'
    },
    virama: '്'
  },
  pa: {
    name: 'Punjabi',
    vowels: {
      aa: 'ਾ', a: '', ee: 'ੀ', ii: 'ੀ', i: 'ਿ', oo: 'ੂ', uu: 'ੂ', u: 'ੁ',
      ai: 'ੈ', ay: 'ੈ', au: 'ੌ', ou: 'ੌ', e: 'ੇ', o: 'ੋ'
    },
    indVowels: {
      aa: 'ਆ', a: 'ਅ', ee: 'ਈ', ii: 'ਈ', i: 'ਇ', oo: 'ਊ', uu: 'ਊ', u: 'ਉ',
      ai: 'ਐ', ay: 'ਐ', au: 'ਔ', ou: 'ਔ', e: 'ਏ', o: 'ਓ'
    },
    consonants: {
      chh: 'ਛ', ch: 'ਚ', kh: 'ਖ', gh: 'ਘ', jh: 'ਝ', th: 'ਥ', dh: 'ਧ',
      ph: 'ਫ', bh: 'ਭ', sh: 'ਸ਼', zh: 'ਜ਼', ng: 'ਙ', ny: 'ਞ',
      k: 'ਕ', g: 'ਗ', c: 'ਕ', j: 'ਜ', t: 'ਤ', d: 'ਦ', n: 'ਨ',
      p: 'ਪ', b: 'ਬ', m: 'ਮ', y: 'ਯ', r: 'ਰ', l: 'ਲ', v: 'ਵ', w: 'ਵ',
      s: 'ਸ', h: 'ਹ', z: 'ਜ਼', f: 'ਫ਼', q: 'ਕ', x: 'ਕਸ'
    },
    virama: '੍'
  },
  or: {
    name: 'Odia',
    vowels: {
      aa: 'ା', a: '', ee: 'ୀ', ii: 'ୀ', i: 'ି', oo: 'ୂ', uu: 'ୂ', u: 'ୁ',
      ai: 'ୈ', ay: 'ୈ', au: 'ୌ', ou: 'ୌ', e: 'େ', o: 'ୋ'
    },
    indVowels: {
      aa: 'ଆ', a: 'ଅ', ee: 'ଈ', ii: 'ଈ', i: 'ଇ', oo: 'ଊ', uu: 'ଊ', u: 'ଉ',
      ai: 'ଐ', ay: 'ଐ', au: 'ଔ', ou: 'ଔ', e: 'ଏ', o: 'ଓ'
    },
    consonants: {
      chh: 'ଛ', ch: 'ଚ', kh: 'ଖ', gh: 'ଘ', jh: 'ଝ', th: 'ଥ', dh: 'ଧ',
      ph: 'ଫ', bh: 'ଭ', sh: 'ଶ', zh: 'ଜ', ng: 'ଙ', ny: 'ଞ',
      k: 'କ', g: 'ଗ', c: 'କ', j: 'ଜ', t: 'ତ', d: 'ଦ', n: 'ନ',
      p: 'ପ', b: 'ବ', m: 'ମ', y: 'ଯ', r: 'ର', l: 'ଲ', v: 'ୱ', w: 'ୱ',
      s: 'ସ', h: 'ହ', z: 'ଜ', f: 'ଫ', q: 'କ', x: 'କ୍ସ'
    },
    virama: '୍'
  }
}

const V_LIST = ['aa', 'ee', 'ii', 'oo', 'uu', 'ai', 'ay', 'au', 'ou', 'a', 'i', 'u', 'e', 'o']
const C_LIST = [
  'chh', 'ch', 'kh', 'gh', 'jh', 'th', 'dh', 'ph', 'bh', 'sh', 'zh', 'ng', 'ny',
  'k', 'g', 'c', 'j', 't', 'd', 'n', 'p', 'b', 'm', 'y', 'r', 'l', 'v', 'w', 's', 'h', 'z', 'f', 'q', 'x'
]

function transliterateWord(word, lang = 'hi') {
  const data = SCRIPT_DATA[lang] || SCRIPT_DATA.hi
  const s = word.toLowerCase()
  let i = 0
  let res = ''
  let prevWasConsonant = false

  while (i < s.length) {
    if (!/[a-z]/.test(s[i])) {
      res += s[i]
      prevWasConsonant = false
      i++
      continue
    }

    // Special Indian English phonetic combos
    if (s.startsWith('ia', i)) {
      if (prevWasConsonant) {
        res += data.vowels.i + (data.consonants.y || '') + (data.vowels.aa || '')
      } else {
        res += (data.indVowels.i || '') + (data.consonants.y || '') + (data.vowels.aa || '')
      }
      prevWasConsonant = false
      i += 2
      continue
    }

    // Check vowel
    let matchedVowel = null
    for (const v of V_LIST) {
      if (s.startsWith(v, i)) {
        matchedVowel = v
        break
      }
    }

    if (matchedVowel) {
      if (prevWasConsonant) {
        res += data.vowels[matchedVowel]
      } else {
        res += (data.indVowels[matchedVowel] || matchedVowel)
      }
      prevWasConsonant = false
      i += matchedVowel.length
      continue
    }

    // Check consonant
    let matchedConsonant = null
    for (const c of C_LIST) {
      if (s.startsWith(c, i)) {
        matchedConsonant = c
        break
      }
    }

    if (matchedConsonant) {
      if (prevWasConsonant) {
        // Virama (halant) connects consecutive consonants
        res += data.virama
      }
      res += data.consonants[matchedConsonant]
      prevWasConsonant = true
      i += matchedConsonant.length
      continue
    }

    // Fallback
    res += s[i]
    prevWasConsonant = false
    i++
  }

  return res
}

/**
 * Transliterates English text into the given Indic language script.
 * Preserves digits, punctuation, and non-Latin characters.
 * @param {string} text - English / Roman text to transliterate
 * @param {string} lang - Target language code ('hi', 'ta', 'te', 'kn', 'ml', 'pa', 'or')
 * @returns {string} Transliterated text in the target Indic script
 */
export function transliterateIndic(text, lang = 'hi') {
  if (!text || typeof text !== 'string') return text || ''
  if (!lang || lang === 'en') return text
  if (!SCRIPT_DATA[lang]) return text

  // If text already has Indic characters in target language block, leave it
  return text.replace(/[a-zA-Z]+/g, m => transliterateWord(m, lang))
}

/**
 * High-performance mixed text transliteration and phrase localization.
 * Checks dictionary for multi-word phrases and words first; falls back to dynamic Indic transliteration.
 * @param {string} text - English/mixed text
 * @param {string} targetLang - Target language code ('hi', 'ta', 'te', 'kn', 'ml', 'pa', 'or')
 * @param {Object} langDict - Translations dictionary for target language
 * @param {Object} phraseDict - Phrase translations dictionary for target language
 * @returns {string} Fully localized / transliterated string in the target Indic script
 */
export function transliterateMixedText(text, targetLang, langDict = {}, phraseDict = {}) {
  if (!text || typeof text !== 'string') return text
  if (!targetLang || targetLang === 'en') return text

  const dict = { ...phraseDict, ...langDict }
  const trimmed = text.trim()
  if (!trimmed) return text

  // 1. Direct whole-string match (preserves full human translations with punctuation)
  if (dict[trimmed] && typeof dict[trimmed] === 'string') return dict[trimmed]
  const lowerTrimmed = trimmed.toLowerCase()
  for (const [k, v] of Object.entries(dict)) {
    if (k.toLowerCase() === lowerTrimmed && typeof v === 'string') {
      return v
    }
  }

  // 2. Handle trailing colon or asterisk
  if (trimmed.endsWith(':') || trimmed.endsWith('*')) {
    const mark = trimmed.slice(-1)
    const baseStr = trimmed.slice(0, -1).trim()
    if (dict[baseStr]) return `${dict[baseStr]}${mark === '*' ? ' *' : ':'}`
    const baseLower = baseStr.toLowerCase()
    for (const [k, v] of Object.entries(dict)) {
      if (k.toLowerCase() === baseLower && typeof v === 'string') {
        return `${v}${mark === '*' ? ' *' : ':'}`
      }
    }
  }

  // 3. Handle parenthetical label expressions like "Custom transport rate (₹/km, optional)"
  const parenMatch = trimmed.match(/^([^(]+)\s*\(([^)]+)\)$/)
  if (parenMatch) {
    const mainPart = parenMatch[1].trim()
    const innerPart = parenMatch[2].trim()
    const transMain = dict[mainPart] || transliterateMixedText(mainPart, targetLang, langDict, phraseDict)
    const transInner = dict[innerPart] || transliterateMixedText(innerPart, targetLang, langDict, phraseDict)
    return `${transMain} (${transInner})`
  }

  // 4. Chunk & word fallback
  return text.replace(/[a-zA-Z]+(?:\s+[a-zA-Z]+)*/g, (chunk) => {
    // Direct dictionary match for chunk
    if (dict[chunk] && typeof dict[chunk] === 'string') return dict[chunk]
    const chunkLower = chunk.toLowerCase()
    for (const [k, v] of Object.entries(dict)) {
      if (k.toLowerCase() === chunkLower && typeof v === 'string') {
        return v
      }
    }

    // Individual word fallback
    return chunk.replace(/[a-zA-Z]+/g, (word) => {
      if (dict[word] && typeof dict[word] === 'string') return dict[word]
      const wordLower = word.toLowerCase()
      for (const [k, v] of Object.entries(dict)) {
        if (k.toLowerCase() === wordLower && typeof v === 'string') {
          return v
        }
      }
      // Dynamic Indic transliteration
      return transliterateIndic(word, targetLang)
    })
  })
}

export default transliterateIndic

