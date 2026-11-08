// scripts/add_missing_budget_keys.cjs
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const languages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'pa', 'or'];

const newKeys = {
  "Within budget": {
    en: "Within budget",
    hi: "बजट के भीतर",
    ta: "பட்ஜெட்டுக்குள்",
    te: "బడ్జెట్ పరిధిలో",
    kn: "ಬಜೆಟ್ ಮಿತಿಯೊಳಗೆ",
    ml: "ബജറ്റിനുള്ളിൽ",
    pa: "ਬਜਟ ਦੇ ਅੰਦਰ",
    or: "ବଜେଟ୍ ମଧ୍ୟରେ"
  },
  "uses": {
    en: "uses",
    hi: "उपयोग करता है",
    ta: "பயன்படுத்துகிறது",
    te: "ఉపయోగిస్తుంది",
    kn: "ಬಳಸುತ್ತದೆ",
    ml: "ഉപയോഗിക്കുന്നു",
    pa: "ਵਰਤਦਾ ਹੈ",
    or: "ବ୍ୟବହାର କରେ"
  },
  "Exceeds budget": {
    en: "Exceeds budget",
    hi: "बजट से अधिक",
    ta: "பட்ஜெட்டை மீறுகிறது",
    te: "బడ్జెట్‌ను మించుతుంది",
    kn: "ಬಜೆಟ್ ಮೀರಿದೆ",
    ml: "ബജറ്റ് കവിയുന്നു",
    pa: "ਬਜਟ ਤੋਂ ਵੱਧ",
    or: "ବଜେଟ୍ ଅତିକ୍ରମ କରେ"
  },
  "needs": {
    en: "needs",
    hi: "आवश्यकता है",
    ta: "தேவைப்படுகிறது",
    te: "అవసరం",
    kn: "ಅಗತ್ಯವಿದೆ",
    ml: "ആവശ്യമാണ്",
    pa: "ਲੋੜ ਹੈ",
    or: "ଆବଶ୍ୟକ"
  },
  "have": {
    en: "have",
    hi: "उपलब्ध है",
    ta: "உள்ளது",
    te: "కలిగి ఉంది",
    kn: "ಹೊಂದಿದೆ",
    ml: "ഉണ്ട്",
    pa: "ਕੋਲ ਹੈ",
    or: "ଅଛି"
  }
};

languages.forEach(l => {
  const p = path.join(localesDir, l, 'translation.json');
  const dict = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const [key, trans] of Object.entries(newKeys)) {
    dict[key] = trans[l] || trans.en;
  }
  fs.writeFileSync(p, JSON.stringify(dict, null, 2), 'utf8');
});

console.log('Successfully updated all 8 locales with budget keys.');

