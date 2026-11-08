// test_dom_translit.cjs
const { transliterateIndic } = require('./src/utils/transliterate.js');

const SAMPLE_TEXT_1 = `Soil: Clay loam is moderately suitable — manageable with correct fertiliser. Weather: Temperature and rainfall conditions are broadly suitable for Groundnut in Kharif. Water: Borewell with moderate availability is adequate for Groundnut. Flood risk: No elevated flood risk detected for this season. Historical yield (Tamil Nadu): 1.724 t/ha average over 1978–2017 (450 observations, ICRISAT DLD). Market price: ₹7000/quintal reported (40 markets, 2026-10-13). Estimated economics: Revenue ₹122,094, cost ₹65,000, net return ₹57,094 (within stated budget of ₹75,000).`;

const SAMPLE_TEXT_2 = `Top recommendation: Groundnut (score 86/100). Soil: Clay loam is moderately suitable — manageable with correct fertiliser. Weather: Temperature and rainfall conditions are broadly suitable for Groundnut in Kharif. Water: Borewell with moderate availability is adequate for Groundnut.`;

const COMMON_TERMS = {
  hi: {
    'Soil:': 'मिट्टी:',
    'Weather:': 'मौसम:',
    'Water:': 'जल:',
    'Flood risk:': 'बाढ़ जोखिम:',
    'Historical yield': 'ऐतिहासिक उपज',
    'Market price:': 'बाजार भाव:',
    'Estimated economics:': 'अनुमानित अर्थशास्त्र:',
    'Top recommendation:': 'शीर्ष सिफारिश:',
    'Soil concern:': 'मृदा चिंता:',
    'Budget:': 'बजट:',
    'Revenue': 'राजस्व',
    'cost': 'लागत',
    'net return': 'शुद्ध लाभ',
    'within stated budget of': 'निर्धारित बजट के भीतर',
    'exceeds stated budget of': 'निर्धारित बजट से अधिक',
    'observations': 'अवलोकन',
    'markets': 'बाजार',
    'reported': 'दर्ज',
    'average over': 'औसत',
    'season': 'मौसम',
    'Kharif': 'खरीफ',
    'Paddy': 'धान',
    'Groundnut': 'मूंगफली',
    'Maize': 'मक्का',
    'Tomato': 'टमाटर',
    'Millet': 'बाजरा'
  },
  ta: {
    'Soil:': 'மண்:',
    'Weather:': 'வானிலை:',
    'Water:': 'நீர்:',
    'Flood risk:': 'வெள்ள அபாயம்:',
    'Historical yield': 'வரலாற்று மகசூல்',
    'Market price:': 'சந்தை விலை:',
    'Estimated economics:': 'மதிப்பிடப்பட்ட பொருளாதாரம்:',
    'Top recommendation:': 'முக்கிய பரிந்துரை:',
    'Revenue': 'வருவாய்',
    'cost': 'செலவு',
    'net return': 'நிகர லாபம்',
    'season': 'பருவம்'
  }
};

function translateSentenceOrParagraph(text, lang = 'hi', dict = {}) {
  if (!text || typeof text !== 'string') return text;
  if (!lang || lang === 'en') return text;

  let out = text;
  const terms = COMMON_TERMS[lang] || {};

  // 1. Substitute known dictionary multi-word and single-word terms
  // Sort by length descending so longer phrases match first
  const sortedKeys = Object.keys(terms).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    const reg = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
    out = out.replace(reg, terms[k]);
  }

  // 2. Also check the loaded app dictionary for any matching words/phrases
  if (dict) {
    // Check direct match
    if (dict[text]) return dict[text];
  }

  // 3. For any remaining English words, dynamically transliterate using transliterateIndic
  out = out.replace(/[a-zA-Z]+/g, m => {
    // If it's in terms, use it
    const lower = m.toLowerCase();
    for (const [k, v] of Object.entries(terms)) {
      if (k.toLowerCase() === lower) return v;
    }
    // Otherwise transliterate phonetically!
    return transliterateIndic(m, lang);
  });

  return out;
}

console.log('--- Hindi Result ---');
console.log(translateSentenceOrParagraph(SAMPLE_TEXT_1, 'hi'));
console.log('\n--- AI Insight Hindi ---');
console.log(translateSentenceOrParagraph(SAMPLE_TEXT_2, 'hi'));

console.log('\n--- Tamil Result ---');
console.log(translateSentenceOrParagraph(SAMPLE_TEXT_2, 'ta'));

