const fs = require('fs');

const entries = {
  "Engine 4: Disease Pathology": {
    en: "Engine 4: Disease Pathology",
    hi: "इंजन 4: फसल रोग निदान",
    ta: "இயந்திரம் 4: பயிர் நோய் நோயியல்",
    te: "ఇంజిన్ 4: వ్యాధి రోగనిర్ధారణ",
    kn: "ಎಂಜಿನ್ 4: ರೋಗ ರೋಗಶಾಸ್ತ್ರ",
    ml: "എഞ്ചിൻ 4: രോഗ രോഗശാസ്ത്രം",
    pa: "ਇੰਜਨ 4: ਫਸਲ ਬਿਮਾਰੀ ਵਿਗਿਆਨ",
    or: "ଇଞ୍ଜିନ୍ ୪: ଫସଲ ରୋଗ ନିଦାନ"
  },
  "Engine 1: Schemes Analysis": {
    en: "Engine 1: Schemes Analysis",
    hi: "इंजन 1: सरकारी योजनाएं विश्लेषण",
    ta: "இயந்திரம் 1: திட்டங்கள் பகுப்பாய்வு",
    te: "ఇంజిన్ 1: పథకాల విశ్లేషణ",
    kn: "ಎಂಜಿನ್ 1: ಯೋಜನೆಗಳ ವಿಶ್ಲೇಷಣೆ",
    ml: "എഞ്ചിൻ 1: പദ്ധതി വിശകലനം",
    pa: "ਇੰਜਨ 1: ਸਕੀਮਾਂ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ",
    or: "ଇଞ୍ଜିନ୍ ୧: ଯୋଜନା ବିଶ୍ଳେଷଣ"
  },
  "Engine 7: Mandi Economics": {
    en: "Engine 7: Mandi Economics",
    hi: "इंजन 7: मंडी अर्थशास्त्र",
    ta: "இயந்திரம் 7: மண்டி பொருளாதாரம்",
    te: "ఇంజిన్ 7: మార్కెట్ ఆర్థికశాస్త్రం",
    kn: "ಎಂಜಿನ್ 7: ಮಾರುಕಟ್ಟೆ ಅರ್ಥಶಾಸ್ತ್ರ",
    ml: "എഞ്ചിൻ 7: വിപണി സാമ്പത്തികശാസ്ത്രം",
    pa: "ਇੰਜਨ 7: ਮੰਡੀ ਅਰਥਸ਼ਾਸਤਰ",
    or: "ଇଞ୍ଜିନ୍ ୭: ମଣ୍ଡି ଅର୍ଥନୀତି"
  }
};

const langs = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'pa', 'or'];

for (const lang of langs) {
  const filePath = `src/i18n/locales/${lang}/translation.json`;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const [key, transMap] of Object.entries(entries)) {
    data[key] = transMap[lang];
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

console.log('Successfully added all 3 engine chip keys to all 8 locale translation files!');

