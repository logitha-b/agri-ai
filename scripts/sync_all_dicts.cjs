// scripts/sync_all_dicts.cjs
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const languages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'pa', 'or'];

const allDicts = {};
languages.forEach(l => {
  allDicts[l] = JSON.parse(fs.readFileSync(path.join(localesDir, l, 'translation.json'), 'utf8'));
});

// 1. Build reverse dict
const reverseDict = {};
languages.forEach(l => {
  if (l === 'en') return;
  const dict = allDicts[l];
  for (const [enKey, locVal] of Object.entries(dict)) {
    if (locVal && typeof locVal === 'string' && locVal !== enKey) {
      reverseDict[locVal.trim()] = enKey.trim();
      reverseDict[locVal.trim().toLowerCase()] = enKey.trim();
    }
  }
});

const reverseDictContent = `// src/i18n/reverseDict.js
// Auto-generated bidirectional mapping for canonical key resolution
export const REVERSE_DICT = ${JSON.stringify(reverseDict, null, 2)};
export default REVERSE_DICT;
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'i18n', 'reverseDict.js'), reverseDictContent, 'utf8');
console.log(`Generated reverseDict.js with ${Object.keys(reverseDict).length} mappings.`);

// 2. Build translations.js
const { LANGUAGES } = require(path.join(__dirname, '..', 'src', 'i18n', 'config.js'));

const translationsContent = `// src/i18n/translations.js
export const LANGUAGES = ${JSON.stringify(LANGUAGES || [
  { code: 'en', name: 'English', native: 'English', tts: 'en-IN' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', tts: 'ta-IN' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', tts: 'te-IN' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', tts: 'hi-IN' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', tts: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', tts: 'ml-IN' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', tts: 'pa-IN' },
  { code: 'or', name: 'Odia (Odisi)', native: 'ଓଡ଼ିଆ', tts: 'or-IN' },
], null, 2)};

export const phraseTranslations = ${JSON.stringify(allDicts, null, 2)};
export const translations = ${JSON.stringify(allDicts, null, 2)};

export default { LANGUAGES, translations, phraseTranslations };
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'i18n', 'translations.js'), translationsContent, 'utf8');
console.log(`Generated translations.js successfully.`);

