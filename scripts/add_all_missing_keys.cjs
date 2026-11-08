/**
 * Scans component files to find all t("...") calls that are missing from translation.json,
 * then translates them into all 8 languages using the Google Translate endpoint,
 * and adds them to all translation.json files.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const SRC_DIR = path.join(__dirname, '..', 'src');
const LANGS = ['hi', 'ta', 'te', 'ml', 'kn', 'pa', 'or'];

const enDict = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en', 'translation.json'), 'utf8'));

// Extract all t(...) string keys from .jsx/.js files
function getAllFiles(dir, exts = ['.jsx', '.js']) {
  let res = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '.git' && e.name !== 'dist') {
        res = res.concat(getAllFiles(full, exts));
      }
    } else if (exts.includes(path.extname(e.name))) {
      res.push(full);
    }
  }
  return res;
}

const files = getAllFiles(SRC_DIR);
const missingKeys = new Set();
const tRegex = /\bt\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    const key = match[2];
    if (key && !enDict[key] && !key.includes('${') && key.length < 250) {
      missingKeys.add(key);
    }
  }
}

console.log(`Found ${missingKeys.size} missing t() keys to add across all dictionaries!`);

function translate(text, targetLang) {
  return new Promise((resolve) => {
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
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          let result;
          if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
            result = typeof parsed[0][0] === 'string' ? parsed[0][0] : parsed[0][0]?.trans;
          } else if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
            result = parsed[0];
          }
          resolve(result || text);
        } catch {
          resolve(text);
        }
      });
    });
    req.on('error', () => resolve(text));
    req.setTimeout(8000, () => { req.destroy(); resolve(text); });
    req.write(postData);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const keysArray = Array.from(missingKeys);
  if (keysArray.length === 0) {
    console.log('No missing keys found.');
    return;
  }

  // Load all dicts
  const dicts = {};
  for (const lang of ['en', ...LANGS]) {
    dicts[lang] = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, lang, 'translation.json'), 'utf8'));
  }

  for (const key of keysArray) {
    dicts.en[key] = key;
  }

  for (const lang of LANGS) {
    console.log(`Translating ${keysArray.length} keys for ${lang}...`);
    for (let i = 0; i < keysArray.length; i++) {
      const key = keysArray[i];
      if (!dicts[lang][key]) {
        dicts[lang][key] = await translate(key, lang);
        await sleep(35);
      }
    }
    fs.writeFileSync(path.join(LOCALES_DIR, lang, 'translation.json'), JSON.stringify(dicts[lang], null, 2) + '\n', 'utf8');
  }

  fs.writeFileSync(path.join(LOCALES_DIR, 'en', 'translation.json'), JSON.stringify(dicts.en, null, 2) + '\n', 'utf8');
  console.log('Successfully added all missing keys and wrote to locale files.');
}

main().catch(console.error);

