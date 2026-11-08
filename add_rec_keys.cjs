const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const languages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'pa', 'or'];

const newKeys = {
  'Top recommendation:': {
    en: 'Top recommendation:',
    hi: 'शीर्ष सिफारिश:',
    ta: 'முக்கிய பரிந்துரை:',
    te: 'అగ్ర సిఫార్సు:',
    kn: 'ಅಗ್ರ ಶಿಫಾರಸು:',
    ml: 'പ്രധാന ശുപാർശ:',
    pa: 'ਮੁੱਖ ਸਿਫਾਰਸ਼:',
    or: 'ମୁଖ୍ୟ ସୁପାରିଶ:'
  },
  'score': {
    en: 'score',
    hi: 'अंक',
    ta: 'மதிப்பெண்',
    te: 'స్కోరు',
    kn: 'ಸ್ಕೋರ್',
    ml: 'സ്കോർ',
    pa: 'ਸਕੋਰ',
    or: 'ସ୍କୋର'
  },
  'No crops passed the season and budget filters for your profile.': {
    en: 'No crops passed the season and budget filters for your profile.',
    hi: 'आपकी प्रोफ़ाइल के लिए मौसम और बजट फ़िल्टर में कोई फसल उपयुक्त नहीं पाई गई।',
    ta: 'உங்கள் சுயவிவரத்திற்கான பருவம் மற்றும் பட்ஜெட் வடிப்பான்களில் எந்தப் பயிரும் தேர்வாகவில்லை.',
    te: 'మీ ప్రొఫైల్ కొరకు సీజన్ మరియు బడ్జెట్ ఫిల్టర్‌లలో ఏ పంటలు ఉత్తీర్ణత సాధించలేదు.',
    kn: 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್‌ಗಾಗಿ ಋತು ಮತ್ತು ಬಜೆಟ್ ಫಿಲ್ಟರ್‌ಗಳಲ್ಲಿ ಯಾವುದೇ ಬೆಳೆಗಳು ಉತ್ತೀರ್ಣವಾಗಿಲ್ಲ.',
    ml: 'നിങ്ങളുടെ പ്രൊഫൈലിനായുള്ള സീസൺ, ബജറ്റ് ഫിൽട്ടറുകളിൽ വിളകളൊന്നും പാസായില്ല.',
    pa: 'ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ ਲਈ ਸੀਜ਼ਨ ਅਤੇ ਬਜਟ ਫਿਲਟਰਾਂ ਵਿੱਚ ਕੋਈ ਫਸਲ ਪਾਸ ਨਹੀਂ ਹੋਈ।',
    or: 'ଆପଣଙ୍କ ପ୍ରୋଫାଇଲ୍ ପାଇଁ ଋତୁ ଏବଂ ବଜେଟ୍ ଫିଲ୍ଟର୍ ଗୁଡ଼ିକରେ କୌଣସି ଫସଲ ମିଳିଲା ନାହିଁ।'
  }
};

languages.forEach(l => {
  const filePath = path.join(localesDir, l, 'translation.json');
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const [k, translations] of Object.entries(newKeys)) {
    json[k] = translations[l] || translations.en;
  }
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
});

console.log('Added keys to all locales successfully.');

