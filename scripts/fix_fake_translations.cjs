/**
 * Fix fake translations — keys where non-English value === English value.
 * Uses free Google Translate endpoint to generate real translations.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const LANGS = ['hi', 'ta', 'te', 'ml', 'kn', 'pa', 'or'];

// Read all dictionaries
const dicts = {};
for (const lang of ['en', ...LANGS]) {
  dicts[lang] = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, lang, 'translation.json'), 'utf8'));
}

// Find fake keys (non-English value === English key)
const fakeKeys = [];
for (const key of Object.keys(dicts.en)) {
  for (const lang of LANGS) {
    if (dicts[lang][key] === key || dicts[lang][key] === dicts.en[key]) {
      if (!fakeKeys.includes(key)) fakeKeys.push(key);
      break;
    }
  }
}

console.log(`Found ${fakeKeys.length} keys with fake translations`);

// Google Translate free endpoint
function translate(text, targetLang) {
  return new Promise((resolve, reject) => {
    const postData = `q=${encodeURIComponent(text)}`;
    const options = {
      hostname: 'clients5.google.com',
      path: `/translate_a/t?client=dict-chrome-ex&sl=en&tl=${targetLang}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Response format: [[{"trans":"translated text",...}]] or [["translated text"]]
          let result;
          if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
            if (typeof parsed[0][0] === 'string') {
              result = parsed[0][0];
            } else if (parsed[0][0] && parsed[0][0].trans) {
              result = parsed[0][0].trans;
            }
          } else if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
            result = parsed[0];
          }
          resolve(result || text);
        } catch (e) {
          // Try simpler parse
          try {
            const simple = JSON.parse(data);
            if (typeof simple === 'string') resolve(simple);
            else if (Array.isArray(simple)) resolve(simple[0] || text);
            else resolve(text);
          } catch {
            resolve(text);
          }
        }
      });
    });
    req.on('error', () => resolve(text));
    req.setTimeout(10000, () => { req.destroy(); resolve(text); });
    req.write(postData);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function processLang(lang) {
  let fixed = 0;
  let failed = 0;
  const dict = dicts[lang];
  
  for (let i = 0; i < fakeKeys.length; i++) {
    const key = fakeKeys[i];
    // Skip if this lang already has a real translation
    if (dict[key] && dict[key] !== key && dict[key] !== dicts.en[key]) continue;
    
    try {
      const translated = await translate(key, lang);
      if (translated && translated !== key) {
        dict[key] = translated;
        fixed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
    
    // Rate limiting
    await sleep(40);
    
    if ((i + 1) % 50 === 0) {
      console.log(`  ${lang}: ${i + 1}/${fakeKeys.length} (${fixed} fixed, ${failed} failed)`);
    }
  }
  
  // Write back
  fs.writeFileSync(
    path.join(LOCALES_DIR, lang, 'translation.json'),
    JSON.stringify(dict, null, 2) + '\n',
    'utf8'
  );
  console.log(`  ${lang}: DONE — ${fixed} fixed, ${failed} failed`);
  return { lang, fixed, failed };
}

async function main() {
  console.log(`\nTranslating ${fakeKeys.length} fake keys across ${LANGS.length} languages...\n`);
  
  // Process languages sequentially to avoid rate limits
  const results = [];
  for (const lang of LANGS) {
    console.log(`Processing ${lang}...`);
    const r = await processLang(lang);
    results.push(r);
  }
  
  console.log('\n=== Summary ===');
  for (const r of results) {
    console.log(`  ${r.lang}: ${r.fixed} fixed, ${r.failed} failed`);
  }
  console.log('\nDone! Run: node scripts/sync_all_dicts.cjs');
}

main().catch(console.error);
