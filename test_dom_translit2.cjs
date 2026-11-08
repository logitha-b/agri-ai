const { transliterateIndic } = require('./src/utils/transliterate.js');
const fs = require('fs');

const hiDict = JSON.parse(fs.readFileSync('./src/i18n/locales/hi/translation.json', 'utf8'));

function transliterateMixedText(text, targetLang, dict = {}) {
  if (!text || typeof text !== 'string') return text;
  if (!targetLang || targetLang === 'en') return text;

  // Split into tokens (words vs non-words)
  return text.replace(/[a-zA-Z]+(?:\s+[a-zA-Z]+)*/g, (chunk) => {
    // 1. Direct dictionary match for multi-word chunk
    if (dict[chunk]) return dict[chunk];
    const chunkLower = chunk.toLowerCase();
    for (const [k, v] of Object.entries(dict)) {
      if (k.toLowerCase() === chunkLower && typeof v === 'string') {
        return v;
      }
    }

    // 2. Split chunk into individual words
    return chunk.replace(/[a-zA-Z]+/g, (word) => {
      if (dict[word]) return dict[word];
      const wordLower = word.toLowerCase();
      for (const [k, v] of Object.entries(dict)) {
        if (k.toLowerCase() === wordLower && typeof v === 'string') {
          return v;
        }
      }
      // 3. Fallback: dynamic Indic transliteration!
      return transliterateIndic(word, targetLang);
    });
  });
}

const input1 = `Soil: Clay loam is moderately suitable — manageable with correct fertiliser. Weather: Temperature and rainfall conditions are broadly suitable for Groundnut in Kharif. Water: Borewell with moderate availability is adequate for Groundnut. Flood risk: No elevated flood risk detected for this season. Historical yield (Tamil Nadu): 1.724 t/ha average over 1978–2017 (450 observations, ICRISAT DLD). Market price: ₹7000/quintal reported (40 markets, 2026-10-13). Estimated economics: Revenue ₹122,094, cost ₹65,000, net return ₹57,094 (within stated budget of ₹75,000).`;

const input2 = `Top recommendation: Groundnut (score 86/100). Soil: Clay loam is moderately suitable — manageable with correct fertiliser. Weather: Temperature and rainfall conditions are broadly suitable for Groundnut in Kharif. Water: Borewell with moderate availability is adequate for Groundnut.`;

console.log('Result 1 (Hindi):');
console.log(transliterateMixedText(input1, 'hi', hiDict));

console.log('\nResult 2 (Hindi):');
console.log(transliterateMixedText(input2, 'hi', hiDict));

console.log('\nResult 1 (Tamil):');
const taDict = JSON.parse(fs.readFileSync('./src/i18n/locales/ta/translation.json', 'utf8'));
console.log(transliterateMixedText(input1, 'ta', taDict));

