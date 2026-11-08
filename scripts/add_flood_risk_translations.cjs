/**
 * Collects all strings from FloodRiskCard & flood_risk.py:
 * - summary text
 * - evidence signal templates and notes
 * - missing inputs list
 * - precautions list
 * - disclaimer text
 * Translates them to all 7 Indian languages and saves to both:
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
  // Summaries
  "No rainfall thresholds exceeded in the available data. This does not guarantee safety — missing inputs (listed below) may carry risk.",
  "Not enough data to assess flood risk for this location. IMD district rainfall was not found, and no other confirming signals are available.",

  // Missing Inputs
  "Satellite flood inundation (Sentinel-1 SAR not linked to district-level alerts — use the Sentinel-1 layer in Crop Health for visual flood indicators)",
  "River gauge levels (CWC real-time data requires registration at india-water.gov.in)",
  "Elevation / DEM (not integrated — low-lying areas may face higher risk than indicated)",
  "Dam proximity data (none within 50 km)",
  "Reservoir data (none within 50 km)",
  "NASA POWER regional rainfall",

  // Precautions / Recommended actions
  "Continue routine field monitoring.",
  "Keep drainage channels clear as a precaution.",
  "Check official weather forecasts before the next irrigation or field operation.",
  "Check the official CWC Flood Forecasting portal: cwc.gov.in/flood-forecasting",
  "Monitor NDMA flood alerts: ndma.gov.in",
  "Do not enter flooded or waterlogged fields.",
  "Ensure field drainage channels are clear.",
  "Move stored harvest, machinery, and livestock to higher ground if flooding is confirmed.",
  "Do not rely on this estimate as an official flood warning.",
  "Flooding confirmed — do not enter flooded areas.",
  "Contact local emergency services and agricultural extension officers.",
  "Move assets to safety immediately.",
  "Check official IMD rainfall forecasts: mausam.imd.gov.in",
  "Check official CWC flood bulletins: cwc.gov.in",
  "Conduct a field inspection before any agricultural operations.",

  // Notes and sources
  "Dam presence indicates managed water storage, NOT an imminent release. No live gate-operation or release data is available. 1 dam(s) have Flood Control as a stated purpose.",
  "Dam presence indicates managed water storage, NOT an imminent release. No live gate-operation or release data is available.",
  "No live water-level, storage, inflow, or outflow data available.",
  "NASA POWER resolution is ~55 km. Not a district-level measurement.",
  "Values represent IMD gridded/district-level estimates. Daily values are for the date shown; weekly and cumulative values are as published in the dataset for that date. These are not field-level measurements.",
  "3-day accumulated rainfall",
  "30-day regional rainfall (NASA POWER)",
  "No specific threshold applied",
  "Closest: Redhills (15.38 km)",
  "Closest: Redhills (16.16 km)",
  "CWC Central Water Commission — National Water Data Portal",
  "NDSA National Dam Safety Authority — National Water Data Portal",
  "NASA POWER ~55 km grid — regional context only",

  // Disclaimer
  "This is a rules-based estimate derived from published IMD thresholds and available satellite/inventory data. It is NOT an official flood warning, forecast, or validated hydrological model output. Inputs marked as missing may carry risk not captured here. Always consult official CWC and NDMA flood alerts before taking action."
];

// Generate dam/reservoir counts
for (let n = 1; n <= 20; n++) {
  STRINGS_TO_ADD.push(`${n} dam(s) within 50 km`);
  STRINGS_TO_ADD.push(`${n} reservoir(s) within 50 km`);
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
  console.log(`Translating ${STRINGS_TO_ADD.length} Flood Risk strings across 7 languages...`);

  const dicts = {};
  for (const lang of ['en', ...LANGS]) {
    dicts[lang] = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, lang, 'translation.json'), 'utf8'));
  }

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
        await sleep(35);
      } else {
        backendStatic[lang][str] = dicts[lang][str];
      }
    }
    fs.writeFileSync(path.join(LOCALES_DIR, lang, 'translation.json'), JSON.stringify(dicts[lang], null, 2) + '\n', 'utf8');
  }

  fs.writeFileSync(path.join(LOCALES_DIR, 'en', 'translation.json'), JSON.stringify(dicts.en, null, 2) + '\n', 'utf8');
  fs.writeFileSync(BACKEND_STATIC_PATH, JSON.stringify(backendStatic, null, 2) + '\n', 'utf8');

  console.log('Successfully updated translation dictionaries for Flood Risk!');
}

main().catch(console.error);

