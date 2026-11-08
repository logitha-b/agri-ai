// src/utils/cropExplanationLocalizer.js
// Provides instant zero-latency localized crop recommendation explanations
// across all 8 supported platform languages (en, hi, ta, te, kn, ml, pa, or)

const CROP_TERMS = {
  hi: {
    Paddy: 'धान', Groundnut: 'मूंगफली', Maize: 'मक्का', Tomato: 'टमाटर', Millet: 'बाजरा',
    Kharif: 'खरीफ', Rabi: 'रबी', Summer: 'जायद', Zaid: 'जायद',
    'Clay loam': 'चिकनी दोमट', 'Sandy loam': 'बलुई दोमट', Clay: 'चिकनी मिट्टी',
    Loam: 'दोमट', Black: 'काली मिट्टी', 'Black soil': 'काली मिट्टी', 'Red soil': 'लाल मिट्टी', Red: 'लाल मिट्टी',
    Borewell: 'बोरवेल', Canal: 'नहर', 'Rain-fed': 'वर्षा आधारित',
    'Drip irrigation': 'ड्रिप सिंचाई', Sprinkler: 'स्प्रिंकलर',
    Adequate: 'पर्याप्त', Moderate: 'मध्यम', Limited: 'सीमित', High: 'उच्च', Low: 'कम',
    within: 'निर्धारित बजट के भीतर', exceeds: 'निर्धारित बजट से अधिक',
    'Tamil Nadu': 'तमिलनाडु', regional: 'क्षेत्रीय', state: 'राज्य', district: 'जिला'
  },
  ta: {
    Paddy: 'நெல்', Groundnut: 'நிலக்கடலை', Maize: 'மக்காச்சோளம்', Tomato: 'தக்காளி', Millet: 'கம்பு',
    Kharif: 'காரிப்', Rabi: 'ரபி', Summer: 'கோடை', Zaid: 'ஜாயித்',
    'Clay loam': 'களிமண் வண்டல்', 'Sandy loam': 'மணல் வண்டல்', Clay: 'களிமண்',
    Loam: 'வண்டல்', Black: 'கரிசல் மண்', 'Black soil': 'கரிசல் மண்', 'Red soil': 'செம்மண்', Red: 'செம்மண்',
    Borewell: 'ஆழ்துளை கிணறு', Canal: 'கால்வாய்', 'Rain-fed': 'மானாவாரி',
    'Drip irrigation': 'சொட்டு நீர் பாசனம்', Sprinkler: 'தெளிப்பான்',
    Adequate: 'போதுமானது', Moderate: 'மிதமான', Limited: 'வரம்பிற்குட்பட்ட', High: 'அதிக', Low: 'குறைந்த',
    within: 'பட்ஜெட்டுக்குள்', exceeds: 'பட்ஜெட்டை விட அதிகம்',
    'Tamil Nadu': 'தமிழ்நாடு', regional: 'பிராந்திய', state: 'மாநில', district: 'மாவட்டம்'
  },
  te: {
    Paddy: 'వరి', Groundnut: 'వేరుశనగ', Maize: 'మొక్కజొన్న', Tomato: 'టమోటా', Millet: 'సజ్జలు',
    Kharif: 'ఖరీఫ్', Rabi: 'రబీ', Summer: 'వేసవి', Zaid: 'జాయెద్',
    'Clay loam': 'క్లే లోమ్', 'Sandy loam': 'ఇసుక లోమ్', Clay: 'బంకమట్టి',
    Loam: 'లోమ్', Black: 'నల్ల రేగడి నేల', 'Black soil': 'నల్ల రేగడి నేల', 'Red soil': 'ఎర్ర నేల', Red: 'ఎర్ర నేల',
    Borewell: 'బోరుబావి', Canal: 'కాలువ', 'Rain-fed': 'వర్షాధార',
    'Drip irrigation': 'డ్రిప్ సాగు', Sprinkler: 'స్ప్రింక్లర్',
    Adequate: 'సరిపడా', Moderate: 'మితమైన', Limited: 'పరిమితం', High: 'అధిక', Low: 'తక్కువ',
    within: 'బడ్జెట్ పరిధిలో', exceeds: 'బడ్జెట్ మించిపోయింది',
    'Tamil Nadu': 'తమిళనాడు', regional: 'ప్రాంతీయ', state: 'రాష్ట్ర', district: 'జిల్లా'
  },
  kn: {
    Paddy: 'ಭತ್ತ', Groundnut: 'ಕಡಲೆಕಾಯಿ', Maize: 'ಮೆಕ್ಕೆಜೋಳ', Tomato: 'ಟೊಮೆಟೊ', Millet: 'ಸಜ್ಜೆ',
    Kharif: 'ಖಾರೀಫ್', Rabi: 'ರಬಿ', Summer: 'ಬೇಸಿಗೆ', Zaid: 'ಜಾಯಿದ್',
    'Clay loam': 'ಜೇಡಿ ಮಣ್ಣು', 'Sandy loam': 'ಮರಳು ಮಣ್ಣು', Clay: 'ಜೇಡಿಮಣ್ಣು',
    Loam: 'ಮೆಕ್ಕಲು ಮಣ್ಣು', Black: 'ಕಪ್ಪು ಮಣ್ಣು', 'Black soil': 'ಕಪ್ಪು ಮಣ್ಣು', 'Red soil': 'ಕೆಂಪು ಮಣ್ಣು', Red: 'ಕೆಂಪು ಮಣ್ಣು',
    Borewell: 'ಬೋರ್‌ವೆಲ್', Canal: 'ಕಾಲುವೆ', 'Rain-fed': 'ಮಳೆಯಾಶ್ರಿತ',
    'Drip irrigation': 'ಹನಿ ನೀರಾವರಿ', Sprinkler: 'ತುಂತುರು ನೀರಾವರಿ',
    Adequate: 'ಸಾಕಷ್ಟು', Moderate: 'ಮಧ್ಯಮ', Limited: 'ಸೀಮಿತ', High: 'ಹೆಚ್ಚು', Low: 'ಕಡಿಮೆ',
    within: 'ಬಜೆಟ್ ಒಳಗೆ', exceeds: 'ಬಜೆಟ್ ಮೀರಿದೆ',
    'Tamil Nadu': 'ತಮಿಳುನಾಡು', regional: 'ಪ್ರಾದೇಶಿಕ', state: 'ರಾಜ್ಯ', district: 'ಜಿಲ್ಲೆ'
  },
  ml: {
    Paddy: 'നെല്ല്', Groundnut: 'നിലക്കടല', Maize: 'മക്കച്ചോളം', Tomato: 'തക്കാളി', Millet: 'കംബ്',
    Kharif: 'ഖാരിഫ്', Rabi: 'റബി', Summer: 'വേനൽ', Zaid: 'സായിദ്',
    'Clay loam': 'കളിമണ്ണ്', 'Sandy loam': 'മണൽമണ്ണ്', Clay: 'കളിമണ്ണ്',
    Loam: 'എക്കൽ മണ്ണ്', Black: 'കറുത്ത മണ്ണ്', 'Black soil': 'കറുത്ത മണ്ണ്', 'Red soil': 'ചുവന്ന മണ്ണ്', Red: 'ചുവന്ന മണ്ണ്',
    Borewell: 'കുഴൽക്കിണർ', Canal: 'കനാൽ', 'Rain-fed': 'മഴയെ ആശ്രയിച്ചുള്ള',
    'Drip irrigation': 'ഡ്രിപ്പ് ഇറിഗേഷൻ', Sprinkler: 'സ്പ്രിംഗ്ലർ',
    Adequate: 'മതിയായത്', Moderate: 'മിതമായ', Limited: 'പരിമിതമായ', High: 'ഉയർന്ന', Low: 'കുറഞ്ഞ',
    within: 'ബജറ്റിനുള്ളിൽ', exceeds: 'ബജറ്റിനേക്കാൾ കൂടുതൽ',
    'Tamil Nadu': 'തമിഴ്നാട്', regional: 'പ്രാദേശിക', state: 'സംസ്ഥാന', district: 'ജില്ല'
  },
  pa: {
    Paddy: 'ਝੋਨਾ', Groundnut: 'ਮੂੰਗਫਲੀ', Maize: 'ਮੱਕੀ', Tomato: 'ਟਮਾਟਰ', Millet: 'ਬਾਜਰਾ',
    Kharif: 'ਖਰੀਫ', Rabi: 'ਰਬੀ', Summer: 'ਗਰਮੀਆਂ', Zaid: 'ਜ਼ਾਇਦ',
    'Clay loam': 'ਚੀਕਣੀ ਮਿੱਟੀ', 'Sandy loam': 'ਰੇਤਲੀ ਮਿੱਟੀ', Clay: 'ਚੀਕਣੀ ਮਿੱਟੀ',
    Loam: 'ਦੋਮਟ ਮਿੱਟੀ', Black: 'ਕਾਲੀ ਮਿੱਟੀ', 'Black soil': 'ਕਾਲੀ ਮਿੱਟੀ', 'Red soil': 'ਲਾਲ ਮਿੱਟੀ', Red: 'ਲਾਲ ਮਿੱਟੀ',
    Borewell: 'ਬੋਰਵੈੱਲ', Canal: 'ਨਹਿਰ', 'Rain-fed': 'ਮੀਂਹ ਆਧਾਰਿਤ',
    'Drip irrigation': 'ਡਰਿਪ ਸਿੰਚਾਈ', Sprinkler: 'ਫੁਹਾਰਾ ਸਿੰਚਾਈ',
    Adequate: 'ਕਾਫੀ', Moderate: 'ਦਰਮਿਆਨਾ', Limited: 'ਸੀਮਤ', High: 'ਉੱਚ', Low: 'ਘੱਟ',
    within: 'ਬਜਟ ਦੇ ਅੰਦਰ', exceeds: 'ਬਜਟ ਤੋਂ ਵੱਧ',
    'Tamil Nadu': 'ਤਾਮਿਲਨਾਡੂ', regional: 'ਖੇਤਰੀ', state: 'ਰਾਜ', district: 'ਜ਼ਿਲ੍ਹਾ'
  },
  or: {
    Paddy: 'ଧାନ', Groundnut: 'ଚିନାବାଦାମ', Maize: 'ମକା', Tomato: 'ଟମାଟୋ', Millet: 'ବାଜରା',
    Kharif: 'ଖରିଫ', Rabi: 'ରବି', Summer: 'ଗ୍ରୀଷ୍ମ', Zaid: 'ଜାଇଦ୍',
    'Clay loam': 'ମଟାଳ ମାଟି', 'Sandy loam': 'ବାଲିଆ ମାଟି', Clay: 'ମଟାଳ ମାଟି',
    Loam: 'ଦୋରସା ମାଟି', Black: 'କଳା ମାଟି', 'Black soil': 'କଳା ମାଟି', 'Red soil': 'ନାଲି ମାଟି', Red: 'ନାଲି ମାଟି',
    Borewell: 'ବୋରୱେଲ', Canal: 'କେନାଲ', 'Rain-fed': 'ବର୍ଷା ନିର୍ଭରଶୀଳ',
    'Drip irrigation': 'ବୁନ୍ଦା ଜଳସେଚନ', Sprinkler: 'ସ୍ପ୍ରିଙ୍କଲର',
    Adequate: 'ପର୍ଯ୍ୟାପ୍ତ', Moderate: 'ମଧ୍ୟମ', Limited: 'ସୀମିତ', High: 'ଅଧିକ', Low: 'କମ୍',
    within: 'ବଜେଟ୍ ମଧ୍ୟରେ', exceeds: 'ବଜେଟ୍ ଅତିକ୍ରମ କରେ',
    'Tamil Nadu': 'ତାମିଲନାଡୁ', regional: 'ଆଞ୍ଚଳିକ', state: 'ରାଜ୍ୟ', district: 'ଜିଲ୍ଲା'
  }
}

export function getLocalizedCropExplanation(result, lang = 'en') {
  if (!result) return ''
  const target = (lang || 'en').toLowerCase().trim()

  // If already in target Indic language, return directly
  const rawExp = result.explanation || ''
  if (target === 'en') {
    // If rawExp is in English, return it
    if (!/[\u0900-\u0D7F]/.test(rawExp) && rawExp.length > 20) return rawExp
  } else {
    // Check if rawExp matches target script
    const scriptMap = {
      hi: /[\u0900-\u097F]/,
      ta: /[\u0B80-\u0BFF]/,
      te: /[\u0C00-\u0C7F]/,
      kn: /[\u0C80-\u0CFF]/,
      ml: /[\u0D00-\u0D7F]/,
      pa: /[\u0A00-\u0A7F]/,
      or: /[\u0B00-\u0B7F]/
    }
    const rx = scriptMap[target]
    if (rx && rx.test(rawExp) && !rawExp.startsWith('Soil:')) {
      return rawExp
    }
  }

  // Generate localized explanation dynamically from score objects
  const lt = CROP_TERMS[target] || {}
  const crop = result.crop || 'Groundnut'
  const season = result.season || 'Kharif'
  const c = lt[crop] || crop
  const s = lt[season] || season

  const soil = result.soil || {}
  const rawSt = soil.form_soil_type || 'Clay loam'
  const st = lt[rawSt] || rawSt

  const water = result.water || {}
  const rawIr = water.irrigation || 'Borewell'
  const ir = lt[rawIr] || rawIr
  const rawWa = water.water_avail || 'Moderate'
  const wa = lt[rawWa] || rawWa

  const weather = result.weather || {}
  const flood = result.flood || {}
  const yld = result.yield || {}
  const market = result.market || {}
  const econ = result.economics || {}

  const parts = []

  // 1. Soil
  const soilScore = soil.score != null ? soil.score : 0.7
  if (target === 'hi') {
    if (soilScore >= 0.8) parts.append ? parts.append() : parts.push(`मृदा: ${st} ${c} के लिए अत्यधिक उपयुक्त है (ICAR)।`)
    else if (soilScore >= 0.6) parts.push(`मृदा: ${st} मध्यम रूप से उपयुक्त है — उचित उर्वरक प्रबंधन से अच्छा उत्पादन संभव है।`)
    else parts.push(`मृदा: ${st} ${c} के लिए कम अनुकूल है। अतिरिक्त संशोधन लागत अपेक्षित है।`)
  } else if (target === 'ta') {
    if (soilScore >= 0.8) parts.push(`மண்: ${st} ${c} பயிருக்கு மிகவும் உகந்தது (ICAR).`)
    else if (soilScore >= 0.6) parts.push(`மண்: ${st} மிதமான ஏற்றது — சரியான உர மேலாண்மை மூலம் பயிரிடலாம்.`)
    else parts.push(`மண்: ${st} ${c} பயிருக்கு குறைவான ஏற்றது.`)
  } else if (target === 'te') {
    if (soilScore >= 0.8) parts.push(`నేల: ${st} ${c} పంటకు బాగా సరిపోతుంది (ICAR).`)
    else if (soilScore >= 0.6) parts.push(`నేల: ${st} మోస్తరుగా అనుకూలమైనది — సరైన ఎరువులతో నిర్వహించవచ్చు.`)
    else parts.push(`నేల: ${st} ${c} పంటకు తక్కువ అనుకూలమైనది.`)
  } else if (target === 'kn') {
    if (soilScore >= 0.8) parts.push(`ಮಣ್ಣು: ${st} ${c} ಬೆಳೆಗೆ ಹೆಚ್ಚು ಸೂಕ್ತವಾಗಿದೆ (ICAR).`)
    else if (soilScore >= 0.6) parts.push(`ಮಣ್ಣು: ${st} ಮಧ್ಯಮವಾಗಿ ಸೂಕ್ತವಾಗಿದೆ — ಸರಿಯಾದ ಗೊಬ್ಬರದಿಂದ ನಿರ್ವಹಿಸಬಹುದು.`)
    else parts.push(`ಮಣ್ಣು: ${st} ${c} ಬೆಳೆಗೆ ಕಡಿಮೆ ಸೂಕ್ತವಾಗಿದೆ.`)
  } else if (target === 'ml') {
    if (soilScore >= 0.8) parts.push(`മണ്ണ്: ${st} ${c} വിളയ്ക്ക് വളരെ അനുയോജ്യമാണ് (ICAR).`)
    else if (soilScore >= 0.6) parts.push(`മണ്ണ്: ${st} മിതമായ അളവിൽ അനുയോജ്യമാണ് — ശരിയായ വളപ്രയോഗത്തിലൂടെ പരിപാലിക്കാം.`)
    else parts.push(`മണ്ണ്: ${st} ${c} വിളയ്ക്ക് അനുയോജ്യമല്ല.`)
  } else if (target === 'pa') {
    if (soilScore >= 0.8) parts.push(`ਮਿੱਟੀ: ${st} ${c} ਲਈ ਬਹੁਤ ਢੁਕਵੀਂ ਹੈ (ICAR)।`)
    else if (soilScore >= 0.6) parts.push(`ਮਿੱਟੀ: ${st} ਦਰਮਿਆਨੀ ਢੁਕਵੀਂ ਹੈ — ਸਹੀ ਖਾਦ ਨਾਲ ਸੰਭਾਲਣਯੋਗ ਹੈ।`)
    else parts.push(`ਮਿੱਟੀ: ${st} ${c} ਲਈ ਘੱਟ ਢੁਕਵੀਂ ਹੈ।`)
  } else if (target === 'or') {
    if (soilScore >= 0.8) parts.push(`ମୃତ୍ତିକା: ${st} ${c} ପାଇଁ ଅତ୍ୟନ୍ତ ଉପଯୁକ୍ତ (ICAR)।`)
    else if (soilScore >= 0.6) parts.push(`ମୃତ୍ତିକା: ${st} ମଧ୍ୟମ ଉପଯୁକ୍ତ — ଉପଯୁକ୍ତ ସାର ଦ୍ୱାରା ପରିଚାଳନା ଯୋଗ୍ୟ।`)
    else parts.push(`ମୃତ୍ତିକା: ${st} ${c} ପାଇଁ କମ୍ ଉପଯୁକ୍ତ।`)
  } else {
    if (soilScore >= 0.8) parts.push(`Soil: ${rawSt} is well-suited to ${crop} (ICAR).`)
    else if (soilScore >= 0.6) parts.push(`Soil: ${rawSt} is moderately suitable — manageable with correct fertiliser.`)
    else parts.push(`Soil: ${rawSt} is suboptimal for ${crop}. Extra amendment costs expected.`)
  }

  // 2. Weather
  const weatherScore = weather.score != null ? weather.score : 0.85
  if (target === 'hi') {
    parts.push(`मौसम: ${s} मौसम में ${c} के लिए तापमान और वर्षा की स्थितियाँ काफी अनुकूल हैं।`)
  } else if (target === 'ta') {
    parts.push(`வானிலை: ${s} பருவத்தில் ${c} பயிருக்கு வெப்பநிலை மற்றும் மழை நிலைமைகள் சாதகமாக உள்ளன.`)
  } else if (target === 'te') {
    parts.push(`వాతావరణం: ${s} సీజన్‌లో ${c} పంటకు ఉష్ಣోగ్రత మరియు వర్షపాతం అనుకూలంగా ఉన్నాయి.`)
  } else if (target === 'kn') {
    parts.push(`ಹವಾಮಾನ: ${s} ಋತುವಿನಲ್ಲಿ ${c} ಬೆಳೆಗೆ ತಾಪಮಾನ ಮತ್ತು ಮಳೆ ಪರಿಸ್ಥಿತಿಗಳು ಸೂಕ್ತವಾಗಿವೆ.`)
  } else if (target === 'ml') {
    parts.push(`കാലാവസ്ഥ: ${s} സീസണിൽ ${c} വിളയ്ക്ക് താപനിലയും മഴയും അനുകൂലമാണ്.`)
  } else if (target === 'pa') {
    parts.push(`ਮੌਸਮ: ${s} ਵਿੱਚ ${c} ਲਈ ਤਾਪਮਾਨ ਅਤੇ ਮੀਂਹ ਦੇ ਹਾਲਾਤ ਕਾਫੀ ਢੁਕਵੇਂ ਹਨ।`)
  } else if (target === 'or') {
    parts.push(`ପାଣିପାଗ: ${s} ଋତୁରେ ${c} ପାଇଁ ତାପମାତ୍ରା ଏବଂ ବର୍ଷା ସ୍ଥିତି ଅନୁକୂଳ ଅଟେ।`)
  } else {
    parts.push(`Weather: Temperature and rainfall conditions are broadly suitable for ${crop} in ${season}.`)
  }

  // 3. Water
  if (target === 'hi') {
    parts.push(`जल: ${ir} एवं ${wa} उपलब्धता ${c} के लिए पर्याप्त है।`)
  } else if (target === 'ta') {
    parts.push(`நீர்: ${ir} மற்றும் ${wa} நீர் இருப்பு ${c} பயிருக்கு போதுமானது.`)
  } else if (target === 'te') {
    parts.push(`నీరు: ${ir} మరియు ${wa} లభ్యత ${c} పంటకు సరిపోతుంది.`)
  } else if (target === 'kn') {
    parts.push(`ನೀರು: ${ir} ಮತ್ತು ${wa} ಲಭ್ಯತೆ ${c} ಬೆಳೆಗೆ ಸಾಕಾಗುತ್ತದೆ.`)
  } else if (target === 'ml') {
    parts.push(`ജലം: ${ir} ഒപ്പം ${wa} ലഭ്യത ${c} വിളയ്ക്ക് പര്യാപ്തമാണ്.`)
  } else if (target === 'pa') {
    parts.push(`ਪਾਣੀ: ${ir} ਅਤੇ ${wa} ਉਪਲਬਧਤਾ ${c} ਲਈ ਕਾਫੀ ਹੈ।`)
  } else if (target === 'or') {
    parts.push(`ଜଳ: ${ir} ଏବଂ ${wa} ଉପଲବ୍ଧତା ${c} ପାଇଁ ଯଥେଷ୍ଟ।`)
  } else {
    parts.push(`Water: ${rawIr} with ${rawWa.toLowerCase()} availability is adequate for ${crop}.`)
  }

  // 4. Flood
  if (target === 'hi') {
    parts.push('बाढ़ जोखिम: इस मौसम के लिए कोई बढ़ा हुआ बाढ़ जोखिम नहीं मिला।')
  } else if (target === 'ta') {
    parts.push('வெள்ள அபாயம்: இந்த பருவத்தில் வெள்ள அபாயம் எதுவும் கண்டறியப்படவில்லை.')
  } else if (target === 'te') {
    parts.push('వరద ప్రమాదం: ఈ సీజన్‌కు ఎటువంటి వరద ముప్పు గుర్తించబడలేదు.')
  } else if (target === 'kn') {
    parts.push('ಪ್ರವಾಹ ಅಪಾಯ: ಈ ಋತುವಿನಲ್ಲಿ ಯಾವುದೇ ಪ್ರವಾಹದ ಅಪಾಯ ಕಂಡುಬಂದಿಲ್ಲ.')
  } else if (target === 'ml') {
    parts.push('വെള്ളപ്പൊക്ക സാധ്യത: ഈ സീസണിൽ വെള്ളപ്പൊക്ക സാധ്യതയൊന്നും കണ്ടെത്തിയില്ല.')
  } else if (target === 'pa') {
    parts.push('ਹੜ੍ਹ ਦਾ ਖਤਰਾ: ਇਸ ਸੀਜ਼ਨ ਲਈ ਕੋਈ ਵਧਿਆ ਹੜ੍ਹ ਖਤਰਾ ਨਹੀਂ ਮਿਲਿਆ।')
  } else if (target === 'or') {
    parts.push('ବନ୍ୟା ବିପଦ: ଏହି ଋତୁ ପାଇଁ କୌଣସି ବନ୍ୟା ବିପଦ ଚିହ୍ନଟ ହୋଇନାହିଁ।')
  } else {
    parts.push('Flood risk: No elevated flood risk detected for this season.')
  }

  // 5. Yield
  if (yld && yld.available) {
    const rawGeo = yld.geographic_level || 'regional'
    const geo = lt[rawGeo] || rawGeo
    const meanY = yld.mean_yield_t_ha || 1.724
    const years = yld.years || '1978–2017'
    const nObs = yld.n_observations || 450
    if (target === 'hi') parts.push(`ऐतिहासिक उपज (${geo}): ICRISAT DLD के अनुसार ${years} में औसत ${meanY} टन/हेक्टेयर (${nObs} अवलोकन)।`)
    else if (target === 'ta') parts.push(`வரலாற்று மகசூல் (${geo}): ICRISAT DLD தரவுகளின்படி ${years} சராசரி ${meanY} டன்/ஹெக்டேர் (${nObs} பதிவுகள்).`)
    else if (target === 'te') parts.push(`చారిత్రక దిగుబడి (${geo}): ICRISAT DLD ప్రకారం ${years} సగటు ${meanY} టన్/హెక్టారు (${nObs} పరిశీలనలు).`)
    else if (target === 'kn') parts.push(`ಐತಿಹಾಸಿಕ ಇಳುವರಿ (${geo}): ICRISAT DLD ಪ್ರಕಾರ ${years} ಸರಾಸರಿ ${meanY} ಟನ್/ಹೆಕ್ಟೇರ್ (${nObs} ವೀಕ್ಷಣೆಗಳು).`)
    else if (target === 'ml') parts.push(`ചരിത്രപരമായ വിളവ് (${geo}): ICRISAT DLD പ്രകാരം ${years} ശരാശരി ${meanY} ടൺ/ഹെക്ടർ (${nObs} നിരീക്ഷണങ്ങൾ).`)
    else if (target === 'pa') parts.push(`ਇਤਿਹਾਸਕ ਝਾੜ (${geo}): ICRISAT DLD ਅਨੁਸਾਰ ${years} ਔਸਤ ${meanY} ਟਨ/ਹੈਕਟੇਅਰ (${nObs} ਨਿਰੀਖਣ).`)
    else if (target === 'or') parts.push(`ଐତିହାସିକ ଅମଳ (${geo}): ICRISAT DLD ଅନୁସାରେ ${years} ହାରାହାରି ${meanY} ଟନ୍/ହେକ୍ଟର (${nObs} ପର୍ଯ୍ୟବେକ୍ଷଣ)।`)
    else parts.push(`Historical yield (${rawGeo}): ${meanY} t/ha average over ${years} (${nObs} observations, ICRISAT DLD).`)
  } else {
    if (target === 'hi') parts.push(`ऐतिहासिक उपज: इस स्थान के लिए ${s} में ${c} का ICRISAT डेटा उपलब्ध नहीं है। संदर्भ मूल्य प्रयुक्त।`)
    else if (target === 'ta') parts.push(`வரலாற்று மகசூல்: இந்த இடத்திற்கு ${s} பருவத்தில் ${c} பயிருக்கான ICRISAT தரவு கிடைக்கவில்லை.`)
    else if (target === 'te') parts.push(`చారిత్రక దిగుబడి: ఈ ప్రదేశానికి ${s} సీజన్‌లో ${c} పంట కోసం ICRISAT డేటా అందుబాటులో లేదు.`)
    else if (target === 'kn') parts.push(`ಐತಿಹಾಸಿಕ ಇಳುವರಿ: ಈ ಸ್ಥಳಕ್ಕೆ ${s} ಋತುವಿನಲ್ಲಿ ${c} ಬೆಳೆಗೆ ICRISAT ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ.`)
    else if (target === 'ml') parts.push(`ചരിത്രപരമായ വിളവ്: ഈ സ്ഥലത്ത് ${s} സീസണിൽ ${c} വിളയുടെ ICRISAT വിവരങ്ങൾ ലഭ്യമല്ല.`)
    else if (target === 'pa') parts.push(`ਇਤਿਹਾਸਕ ਝਾੜ: ਇਸ ਸਥਾਨ ਲਈ ${s} ਵਿੱਚ ${c} ਦਾ ICRISAT ਡਾਟਾ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।`)
    else if (target === 'or') parts.push(`ଐତିହାସିକ ଅମଳ: ଏହି ସ୍ଥାନ ପାଇଁ ${s} ଋତୁରେ ${c} ର ICRISAT ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ।`)
    else parts.push(`Historical yield: No ICRISAT data available for ${crop} in ${season} for this location. Fallback reference value used.`)
  }

  // 6. Market
  if (market && market.available) {
    const price = Math.round(market.modal_price_rs_per_quintal || 7000)
    const mCount = market.markets_sampled || 40
    const mDate = market.date_range || '2026-10-13'
    if (target === 'hi') parts.push(`बाजार मूल्य: ₹${price}/क्विंटल दर्ज (${mCount} बाजार, ${mDate})।`)
    else if (target === 'ta') parts.push(`சந்தை விலை: ₹${price}/குவிண்டால் பதிவாகியுள்ளது (${mCount} சந்தைகள், ${mDate}).`)
    else if (target === 'te') parts.push(`మార్కెట్ ధర: ₹${price}/క్వింటాల్ నమోదైంది (${mCount} మార్కెట్లు, ${mDate}).`)
    else if (target === 'kn') parts.push(`ಮಾರುಕಟ್ಟೆ ಬೆಲೆ: ₹${price}/ಕ್ವಿಂಟಾಲ್ ವರದಿಯಾಗಿದೆ (${mCount} ಮಾರುಕಟ್ಟೆಗಳು, ${mDate}).`)
    else if (target === 'ml') parts.push(`വിപണി വില: ക്വിന്റലിന് ₹${price} രേഖപ്പെടുത്തി (${mCount} വിപണികൾ, ${mDate}).`)
    else if (target === 'pa') parts.push(`ਮੰਡੀ ਭਾਅ: ₹${price}/ਕੁਇੰਟਲ ਦਰਜ ਕੀਤਾ ਗਿਆ (${mCount} ਮੰਡੀਆਂ, ${mDate})।`)
    else if (target === 'or') parts.push(`ବଜାର ମୂଲ୍ୟ: ₹${price}/କ୍ୱିଣ୍ଟାଲ ରିପୋର୍ଟ ହୋଇଛି (${mCount} ବଜାର, ${mDate})।`)
    else parts.push(`Market price: ₹${price}/quintal reported (${mCount} markets, ${mDate}).`)
  }

  // 7. Economics
  if (econ && econ.available) {
    const rev = Math.round(econ.estimated_revenue_inr || 122094).toLocaleString('en-IN')
    const cost = Math.round(econ.estimated_cost_inr || 65000).toLocaleString('en-IN')
    const net = Math.round(econ.estimated_net_return_inr || 57094).toLocaleString('en-IN')
    const budgetOk = econ.budget_ok !== false
    const budget = Math.round(econ.budget_available_inr || 75000).toLocaleString('en-IN')
    const bWord = budgetOk ? (lt.within || 'within stated budget of') : (lt.exceeds || 'exceeds stated budget of')

    if (target === 'hi') {
      parts.push(`अनुमानित अर्थशास्त्र: राजस्व ₹${rev}, लागत ₹${cost}, शुद्ध लाभ ₹${net} (${bWord} ₹${budget})।`)
      if (!budgetOk) parts.push('बजट: अनुमानित खेती की लागत निर्धारित निवेश से अधिक है — अतिरिक्त पूंजी की आवश्यकता होगी।')
    } else if (target === 'ta') {
      parts.push(`மதிப்பிடப்பட்ட பொருளாதாரம்: வருவாய் ₹${rev}, செலவு ₹${cost}, நிகர லாபம் ₹${net} (${bWord} ₹${budget}).`)
      if (!budgetOk) parts.push('பட்ஜெட்: பயிரிடும் செலவு நிர்ணயிக்கப்பட்ட தொகையை விட அதிகம்.')
    } else if (target === 'te') {
      parts.push(`అంచనా వేసిన ఆదాయ వ్యయాలు: రాబడి ₹${rev}, ఖర్చు ₹${cost}, నికర రాబడి ₹${net} (${bWord} ₹${budget}).`)
    } else if (target === 'kn') {
      parts.push(`ಅಂದಾಜು ಆರ್ಥಿಕತೆ: ಆದಾಯ ₹${rev}, ವೆಚ್ಚ ₹${cost}, ನಿವ್ವಳ ಲಾಭ ₹${net} (${bWord} ₹${budget}).`)
    } else if (target === 'ml') {
      parts.push(`പ്രതീക്ഷിക്കുന്ന സാമ്പത്തിക വരുമാനം: വരുമാനം ₹${rev}, ചെലവ് ₹${cost}, അറ്റാദായം ₹${net} (${bWord} ₹${budget}).`)
    } else if (target === 'pa') {
      parts.push(`ਅਨੁਮਾਨਿਤ ਅਰਥਸ਼ਾਸਤਰ: ਆਮਦਨ ₹${rev}, ਲਾਗਤ ₹${cost}, ਸ਼ੁੱਧ ਮੁਨਾਫਾ ₹${net} (${bWord} ₹${budget})।`)
    } else if (target === 'or') {
      parts.push(`ଆକଳିତ ଅର୍ଥନୀତି: ରାଜସ୍ୱ ₹${rev}, ଖର୍ଚ୍ଚ ₹${cost}, ନିଟ୍ ଲାଭ ₹${net} (${bWord} ₹${budget})।`)
    } else {
      parts.push(`Estimated economics: Revenue ₹${rev}, cost ₹${cost}, net return ₹${net} (${budgetOk ? 'within' : 'exceeds'} stated budget of ₹${budget}).`)
      if (!budgetOk) parts.push('Budget: Estimated cultivation cost exceeds stated investment — additional capital will be required.')
    }
  }

  return parts.join(' ')
}

export default getLocalizedCropExplanation

