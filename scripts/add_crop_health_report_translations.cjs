/**
 * Collects dynamic strings from crop_report.py:
 * 1. NDVI interpretation and limitations
 * 2. Growth stage phenology note pattern
 * 3. Harvest estimate basis and uncertainty
 * 4. Stress flag descriptions and inspection recommendations
 *
 * Translates them across all 7 Indian languages and inserts them into both:
 * - src/i18n/locales/{lang}/translation.json
 * - backend/data/translations_static.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const BACKEND_STATIC_PATH = path.join(__dirname, '..', 'backend', 'data', 'translations_static.json');
const LANGS = ['hi', 'ta', 'te', 'ml', 'kn', 'pa', 'or'];

const STRINGS_TO_ADD = [
  "NDVI image acquired. See the NDVI layer for spatial vegetation patterns. No major weather stress flags active. Compare NDVI to seasonal baseline for anomalies.",
  "NDVI image acquired. See the NDVI layer for spatial vegetation patterns. Weather data indicates possible stress conditions — check NDVI for low-value areas.",
  "NDVI indicates vegetation greenness, not a specific disease, pest, or nutrient deficiency. Low NDVI can result from drought, heat, disease, poor establishment, or soil exposure. Always validate anomalies with field inspection.",
  "Actual stage may vary by 5–10 days depending on variety, temperature, and local conditions.",
  "If you know the specific variety, provide it for a more accurate estimate. Actual harvest date depends on weather, variety, crop health, and local conditions.",
  "±7 days (variety-specific durations may differ by up to 2–3 weeks)",
  "No satellite NDVI image is available for this field. Provide Copernicus credentials and confirm the field location to enable satellite analysis.",
  "Maintain 5 cm standing water. Intermittent flooding is acceptable.",
  "Maintain 2–5 cm standing water. Transplanted paddy needs continuous flooding.",
  "This report is generated from agronomic calendars and available environmental data. It is not a substitute for field inspection or expert agricultural advice. Confirm all recommendations with your local Krishi Vigyan Kendra or extension officer."
];

// Also generate dynamic sowing date notes for standard days (30 to 60 days)
for (let das = 35; das <= 55; das += 5) {
  STRINGS_TO_ADD.push(
    `Based on sowing date 2026-09-22 and published TNAU crop calendar — medium-duration Kharif paddy (~140 days). ICAR Crop Production Guide. phenology for ${das}-day duration crop. Actual stage may vary by 5–10 days depending on variety, temperature, and local conditions.`
  );
  STRINGS_TO_ADD.push(
    `Based on sowing date 2026-09-22 and published TNAU phenology for ${das}-day duration crop. Actual stage may vary by 5–10 days depending on variety, temperature, and local conditions.`
  );
}

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
  console.log(`Translating ${STRINGS_TO_ADD.length} Crop Health report strings across 7 languages...`);

  // Load frontend dicts
  const dicts = {};
  for (const lang of ['en', ...LANGS]) {
    dicts[lang] = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, lang, 'translation.json'), 'utf8'));
  }

  // Load backend static translations
  let backendStatic = {};
  if (fs.existsSync(BACKEND_STATIC_PATH)) {
    backendStatic = JSON.parse(fs.readFileSync(BACKEND_STATIC_PATH, 'utf8'));
  }

  for (const str of STRINGS_TO_ADD) {
    dicts.en[str] = str;
  }

  for (const lang of LANGS) {
    if (!backendStatic[lang]) backendStatic[lang] = {};
    console.log(`Processing ${lang}...`);
    for (const str of STRINGS_TO_ADD) {
      if (!dicts[lang][str] || dicts[lang][str] === str) {
        const trans = await translate(str, lang);
        dicts[lang][str] = trans;
        backendStatic[lang][str] = trans;
        await sleep(40);
      } else {
        backendStatic[lang][str] = dicts[lang][str];
      }
    }
    fs.writeFileSync(path.join(LOCALES_DIR, lang, 'translation.json'), JSON.stringify(dicts[lang], null, 2) + '\n', 'utf8');
  }

  fs.writeFileSync(path.join(LOCALES_DIR, 'en', 'translation.json'), JSON.stringify(dicts.en, null, 2) + '\n', 'utf8');
  fs.writeFileSync(BACKEND_STATIC_PATH, JSON.stringify(backendStatic, null, 2) + '\n', 'utf8');

  console.log('Successfully updated both frontend and backend translation files!');
}

main().catch(console.error);

