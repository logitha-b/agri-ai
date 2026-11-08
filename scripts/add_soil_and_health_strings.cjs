/**
 * Collects all soil nutrient card names, levels, and agronomic guidance sentences,
 * plus problem and irrigation text from Crop Health, and adds them to all 8 translation dictionaries.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const BACKEND_STATIC_PATH = path.join(__dirname, '..', 'backend', 'data', 'translations_static.json');
const LANGS = ['hi', 'ta', 'te', 'ml', 'kn', 'pa', 'or'];

const STRINGS_TO_ADD = [
  // Soil Nutrient Names & Levels
  "Electrical Conductivity",
  "Nitrogen (N)",
  "Phosphorus (P)",
  "Potassium (K)",
  "Soil pH",
  "Organic Carbon",
  "Zinc (Zn)",
  "Iron (Fe)",
  "Manganese (Mn)",
  "Copper (Cu)",
  "Boron (B)",
  "Sulphur (S)",
  "Macro",
  "Micro",
  "Non Saline",
  "Saline",
  "Neutral",
  "Acidic",
  "Alkaline",
  "Deficient",
  "Sufficient",
  "Low",
  "Medium",
  "High",

  // Crop Guidance
  "Low N at tillering reduces tiller count. Confirm with soil test before applying urea (ICAR).",
  "High P — no additional P required.",
  "Low K increases blast and BLB susceptibility. MOP at tillering is common (TNAU).",
  "Neutral pH is ideal for paddy.",
  "Zinc deficiency (Khaira disease) is common. Foliar ZnSO₄ at tillering when confirmed (TNAU).",
  "Adequate Zn — no supplemental Zn required.",
  "Low P can delay root development and panicle initiation. Basal DAP is typically recommended (ICAR).",
  "Adequate P. Standard basal dose is sufficient.",
  "Moderate N — adequate for most paddy stages.",
  "High N — reduce application to avoid lodging and blast risk.",
  "Adequate K.",
  "High K — no additional K required.",
  "Acidic soil reduces P and Zn availability. Lime application may help — consult KVK.",
  "Alkaline soil can cause Fe/Zn deficiency. Monitor for chlorosis.",

  // Crop Health Step 2 Confirmation Box
  "FIELD SUMMARY",
  "Sown:",
  "Area:",
  "Add a sowing date for growth stage and harvest estimates.",
  "Analysis uses the pin coordinates above. The map is provided by OpenStreetMap contributors.",
  "Field confirmed — analysing…",
  "Confirm field & start analysis",

  // Crop Health Problems & Irrigation
  "Possible waterlogging",
  "Possible water stress",
  "Possible heat stress",
  "Elevated disease risk (humidity + temperature window)",
  "Inspect field drainage channels. Check for yellowing of lower leaves.",
  "Open drainage channels immediately. Avoid further irrigation.",
  "Check soil moisture at 10 cm depth. Look for leaf rolling or wilting in the morning.",
  "Irrigate according to the stage-specific recommendation above.",
  "Look for leaf bleaching, tip burn, or poor pollination at flowering.",
  "Evening irrigation can reduce canopy temperature. Avoid spraying during peak heat.",
  "Scout for leaf spots, blight symptoms, or unusual discolouration. Use the Disease Detection engine to photograph and analyse affected leaves.",
  "Confirm disease identity before applying fungicide. Consult your agricultural extension officer or KVK.",
  "High humidity and temperature create conditions favourable to disease but do NOT confirm the presence of disease. Field inspection is required.",
  "Maintain 5 cm standing water. Intermittent flooding is acceptable.",
  "Maintain 2–5 cm standing water. Transplanted paddy needs continuous flooding.",
  "No stress-triggered problems identified",
  "No weather thresholds exceeded in the 30-day NASA POWER data.",
  "NASA POWER rainfall (NASA POWER PRECTOTCORR vs TNAU threshold)",
  "NASA POWER 30-day rainfall data (NASA POWER PRECTOTCORR vs TNAU threshold)",
  "NASA POWER maximum temperature (NASA POWER T2M_MAX vs ICAR/TNAU threshold)",
  "NASA POWER humidity and temperature (NASA POWER RH2M + T2M vs TNAU disease calendar)"
];

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
  console.log(`Translating ${STRINGS_TO_ADD.length} Crop Health & Soil strings across 7 languages...`);

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

  console.log('Successfully updated both frontend and backend translation files!');
}

main().catch(console.error);

