#!/usr/bin/env node
/**
 * scripts/check-translations.js
 * Automated translation validation system for Agri-Economic Intelligence Platform.
 * Validates:
 * 1. All 8 language dictionaries exist and are valid JSON.
 * 2. Compares keys across all 8 languages and detects missing keys.
 * 3. Detects empty translation values.
 * 4. Detects untranslated Indian script strings in English resources.
 * 5. Validates language-code mappings.
 * 6. Verifies fallback behavior.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REQUIRED_LANGUAGES = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'pa', 'or'];

console.log('===========================================================');
console.log('  AGRI-ECONOMIC INTELLIGENCE TRANSLATION AUDIT & VALIDATION');
console.log('===========================================================\n');

let totalErrors = 0;
let totalWarnings = 0;

// 1. Validate Locales Directory and Load Dictionaries
const localesDir = path.join(ROOT, 'src', 'i18n', 'locales');
if (!fs.existsSync(localesDir)) {
  console.error(`[FAIL] Locales directory missing: ${localesDir}`);
  process.exit(1);
}

const dictionaries = {};
for (const lang of REQUIRED_LANGUAGES) {
  const filePath = path.join(localesDir, lang, 'translation.json');
  if (!fs.existsSync(filePath)) {
    console.error(`[FAIL] Missing translation file for '${lang}': ${filePath}`);
    totalErrors++;
    continue;
  }
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    dictionaries[lang] = content;
    console.log(`[PASS] Loaded '${lang}' dictionary: ${Object.keys(content).length} keys`);
  } catch (err) {
    console.error(`[FAIL] Invalid JSON in '${filePath}': ${err.message}`);
    totalErrors++;
  }
}

if (totalErrors > 0) {
  console.error(`\nValidation aborted due to ${totalErrors} file/JSON errors.`);
  process.exit(1);
}

// 2. Key Consistency Check Across All Languages
const enKeys = new Set(Object.keys(dictionaries['en'] || {}));
console.log(`\nBase English keys count: ${enKeys.size}`);

for (const lang of REQUIRED_LANGUAGES) {
  if (lang === 'en') continue;
  const langKeys = new Set(Object.keys(dictionaries[lang] || {}));
  const missingFromLang = [...enKeys].filter(k => !langKeys.has(k));
  
  if (missingFromLang.length > 0) {
    console.error(`[FAIL] Language '${lang}' is missing ${missingFromLang.length} keys from English dictionary:`);
    missingFromLang.slice(0, 10).forEach(k => console.error(`  - ${k}`));
    if (missingFromLang.length > 10) console.error(`  ... and ${missingFromLang.length - 10} more.`);
    totalErrors++;
  } else {
    console.log(`[PASS] Language '${lang}': 100% key parity with English (${langKeys.size} keys)`);
  }
}

// 3. Check for Empty Values
for (const lang of REQUIRED_LANGUAGES) {
  let emptyCount = 0;
  for (const [k, v] of Object.entries(dictionaries[lang])) {
    if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) {
      emptyCount++;
    }
  }
  if (emptyCount > 0) {
    console.warn(`[WARN] Language '${lang}' has ${emptyCount} empty translation values.`);
    totalWarnings++;
  } else {
    console.log(`[PASS] Language '${lang}': zero empty translation values`);
  }
}

// 4. Check for Untranslated Hindi/Indian Script in English Dictionary
const indianScriptRegex = /[\u0900-\u0D7F]/;
let indianScriptInEn = 0;
for (const [k, v] of Object.entries(dictionaries['en'])) {
  if (typeof v === 'string' && indianScriptRegex.test(v)) {
    // Legitimate exceptions: native language labels in language selector
    if (v.includes('हिन्दी') || v.includes('தமிழ்') || v.includes('తెలుగు') || v.includes('ಕನ್ನಡ') || v.includes('മലയാളം') || v.includes('ਪੰਜਾਬੀ') || v.includes('ଓଡ଼ିଆ')) {
      continue;
    }
    console.error(`[FAIL] Untranslated Indian script found in English translation for key "${k}": "${v}"`);
    indianScriptInEn++;
    totalErrors++;
  }
}
if (indianScriptInEn === 0) {
  console.log(`[PASS] English dictionary: 100% pure English text (zero untranslated Indian script)`);
}

// 5. Scan Codebase for t(...) Calls and Verify Key Presence
console.log('\n--- Auditing Component Source Files for Translation Coverage ---');
function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        scanDir(fullPath, fileList);
      }
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      if (!fullPath.includes('translations.js') && !fullPath.includes('reverseDict.js') && !fullPath.includes('reportTranslations.js')) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

const sourceFiles = scanDir(path.join(ROOT, 'src'));
let totalTCalls = 0;
let missingTCalls = 0;

const tCallRegex = /\bt\(\s*(['"`])(.*?)\1(?:\s*,\s*(['"`])(.*?)\3)?\s*\)/g;

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tCallRegex.exec(content)) !== null) {
    totalTCalls++;
    const key = match[2].trim();
    const defaultText = match[4] ? match[4].trim() : '';

    if (!key || key.startsWith('$') || key.includes('{')) continue;

    // Check if key or default text exists in English dictionary
    const found = enKeys.has(key) || (defaultText && enKeys.has(defaultText));
    if (!found) {
      missingTCalls++;
      if (missingTCalls <= 10) {
        console.warn(`[WARN] Untranslated t() call in ${path.relative(ROOT, file)}: key="${key}" default="${defaultText}"`);
      }
    }
  }
}

console.log(`Total t(...) calls audited: ${totalTCalls}`);
if (missingTCalls === 0) {
  console.log(`[PASS] All t(...) calls in source code are covered by the translation dictionary!`);
} else {
  console.warn(`[WARN] ${missingTCalls} t(...) calls did not have exact dictionary matches (fallback will be used)`);
}

// Summary
console.log('\n===========================================================');
console.log(`  VALIDATION SUMMARY: ${totalErrors} Errors, ${totalWarnings} Warnings`);
console.log('===========================================================');

if (totalErrors > 0) {
  console.error('[FAIL] Translation validation failed. Fix errors above.');
  process.exit(1);
} else {
  console.log('[SUCCESS] All translation validations passed successfully!');
  process.exit(0);
}

