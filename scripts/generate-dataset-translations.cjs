// scripts/generate-dataset-translations.cjs
const fs = require('fs');
const path = require('path');

// Complete multilingual dictionary for all data sources, datasets, and ML metadata
const DATASET_TRANSLATIONS = {
  "ICRISAT District Level Database": {
    en: "ICRISAT District Level Database",
    hi: "ICRISAT जिला स्तरीय डेटाबेस",
    ta: "ICRISAT மாவட்ட அளவிலான தரவுத்தளம்",
    te: "ICRISAT జిల్లా స్థాయి డేటాబేస్",
    kn: "ICRISAT ಜಿಲ್ಲಾ ಮಟ್ಟದ ಡೇಟಾಬೇಸ್",
    ml: "ICRISAT ജില്ലാ തല ഡാറ്റാബേസ്",
    pa: "ICRISAT ਜ਼ਿਲ੍ਹਾ ਪੱਧਰੀ ਡਾਟਾਬੇਸ",
    or: "ICRISAT ଜିଲ୍ଲା ସ୍ତରୀୟ ଡାଟାବେସ୍"
  },
  "International Crops Research Institute for the Semi-Arid Tropics (ICRISAT)": {
    en: "International Crops Research Institute for the Semi-Arid Tropics (ICRISAT)",
    hi: "अर्ध-शुष्क उष्णकटिबंधीय अंतर्राष्ट्रीय फसल अनुसंधान संस्थान (ICRISAT)",
    ta: "அரை வறண்ட வெப்பமண்டலங்களுக்கான சர்வதேச பயிர் ஆராய்ச்சி நிறுவனம் (ICRISAT)",
    te: "అర్ధ-శుష్క ఉష్ణమండల అంతర్జాతీయ పంటల పరిశోధనా సంస్థ (ICRISAT)",
    kn: "ಅರೆ-ಶುಷ್ಕ ಉಷ್ಣವಲಯದ ಅಂತರರಾಷ್ಟ್ರೀಯ ಬೆಳೆ ಸಂಶೋಧನಾ ಸಂಸ್ಥೆ (ICRISAT)",
    ml: "അർദ്ധ-വരണ്ട ഉഷ്ണമേഖലാ അന്താരാഷ്ട്ര വിള ഗവേഷണ സ്ഥാപനം (ICRISAT)",
    pa: "ਅਰਧ-ਖੁਸ਼ਕ ਗਰਮ ਖੰਡੀ ਅੰਤਰਰਾਸ਼ਟਰੀ ਫਸਲ ਖੋਜ ਸੰਸਥਾ (ICRISAT)",
    or: "ଅର୍ଦ୍ଧ-ଶୁଷ୍କ କ୍ରାନ୍ତୀୟ ଆନ୍ତର୍ଜାତୀୟ ଫସଲ ଅନୁସନ୍ଧାନ ସଂସ୍ଥାନ (ICRISAT)"
  },
  "Historical district-level yields and crop area/production; the supplied wide-format export is reshaped using its documented units.": {
    en: "Historical district-level yields and crop area/production; the supplied wide-format export is reshaped using its documented units.",
    hi: "ऐतिहासिक जिला स्तरीय उपज और फसल क्षेत्र/उत्पादन; प्रदान किए गए विस्तृत प्रारूप निर्यात को इसकी प्रलेखित इकाइयों का उपयोग करके पुनर्गठित किया गया है।",
    ta: "மாவட்ட அளவிலான வரலாற்று விளைச்சல் மற்றும் பயிர் பரப்பளவு/உற்பத்தி; வழங்கப்பட்ட வைட்-ஃபார்மேட் ஏற்றுமதி அதன் ஆவணப்படுத்தப்பட்ட அலகுகளைப் பயன்படுத்தி மறுவடிவமைக்கப்பட்டுள்ளது.",
    te: "చారిత్రక జిల్లా స్థాయి దిగుబడులు మరియు పంట విస్తీర్ణం/ఉత్పత్తి; అందించిన విస్తృత ఆకృతి ఎగుమతి దాని డాక్యుమెంట్ చేయబడిన యూనిట్లను ఉపయోగించి పునర్నిర్మించబడింది.",
    kn: "ಐತಿಹಾಸಿಕ ಜಿಲ್ಲಾ ಮಟ್ಟದ ಇಳುವರಿ ಮತ್ತು ಬೆಳೆ ವಿಸ್ತೀರ್ಣ/ಉತ್ಪಾದನೆ; ಒದಗಿಸಿದ ವಿಶಾಲ-ಸ್ವರೂಪದ ರಫ್ತನ್ನು ಅದರ ದಾಖಲಿತ ಘಟಕಗಳನ್ನು ಬಳಸಿಕೊಂಡು ಮರುರೂಪಿಸಲಾಗಿದೆ.",
    ml: "ചരിത്രപരമായ ജില്ലാ തല വിളവും വിള വിസ്തൃതിയും/ഉൽപ്പാദനവും; നൽകിയിട്ടുള്ള വൈഡ് ഫോർമാറ്റ് കയറ്റുമതി അതിൻ്റെ രേഖപ്പെടുത്തപ്പെട്ട യൂണിറ്റുകൾ ഉപയോഗിച്ച് പുനഃക്രമീകരിച്ചിരിക്കുന്നു.",
    pa: "ਇਤਿਹਾਸਕ ਜ਼ਿਲ੍ਹਾ ਪੱਧਰੀ ਝਾੜ ਅਤੇ ਫਸਲੀ ਰਕਬਾ/ਉਤਪਾਦਨ; ਪ੍ਰਦਾਨ ਕੀਤੇ ਗਏ ਵਾਈਡ-ਫਾਰਮੈਟ ਨਿਰਯਾਤ ਨੂੰ ਇਸਦੇ ਦਸਤਾਵੇਜ਼ੀ ਯੂਨਿਟਾਂ ਦੀ ਵਰਤੋਂ ਕਰਕੇ ਮੁੜ ਆਕਾਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।",
    or: "ଐତିହାସିକ ଜିଲ୍ଲା ସ୍ତରୀୟ ଅମଳ ଏବଂ ଫସଲ କ୍ଷେତ୍ର/ଉତ୍ପାଦନ; ପ୍ରଦାନ କରାଯାଇଥିବା ୱାଇଡ୍-ଫର୍ମାଟ୍ ରପ୍ତାନିକୁ ଏହାର ଦସ୍ତାବିଜ୍ ୟୁନିଟ୍ ବ୍ୟବହାର କରି ପୁନଃନିର୍ମାଣ କରାଯାଇଛି |"
  },
  "ICRISAT-District Level Data.csv": {
    en: "ICRISAT-District Level Data.csv",
    hi: "ICRISAT-जिला स्तरीय डेटा.csv",
    ta: "ICRISAT-மாவட்ட அளவிலான தரவு.csv",
    te: "ICRISAT-జిల్లా స్థాయి డేటా.csv",
    kn: "ICRISAT-ಜಿಲ್ಲಾ ಮಟ್ಟದ ಡೇಟಾ.csv",
    ml: "ICRISAT-ജില്ലാ തല ഡാറ്റ.csv",
    pa: "ICRISAT-ਜ਼ਿਲ੍ਹਾ ਪੱਧਰੀ ਡਾਟਾ.csv",
    or: "ICRISAT-ଜିଲ୍ଲା ସ୍ତରୀୟ ଡାଟା.csv"
  },
  "District-wise, season-wise crop production statistics": {
    en: "District-wise, season-wise crop production statistics",
    hi: "जिला-वार, मौसम-वार फसल उत्पादन सांख्यिकी",
    ta: "மாவட்ட வாரியான, பருவ வாரியான பயிர் உற்பத்தி புள்ளிவிவரங்கள்",
    te: "జిల్లా వారీగా, సీజన్ వారీగా పంట ఉత్పత్తి గణాంకాలు",
    kn: "ಜಿಲ್ಲಾವಾರು, ಋತುವಾರು ಬೆಳೆ ಉತ್ಪಾದನಾ ಅಂಕಿಅಂಶಗಳು",
    ml: "ജില്ലാടിസ്ഥാനത്തിൽ, സീസൺ തിരിച്ചുള്ള വിള ഉൽപ്പാദന സ്ഥിതിവിവരക്കണക്കുകൾ",
    pa: "ਜ਼ਿਲ੍ਹੇਵਾਰ, ਸੀਜ਼ਨਵਾਰ ਫਸਲ ਉਤਪਾਦਨ ਦੇ ਅੰਕੜੇ",
    or: "ଜିଲ୍ଲା-ୱାରୀ, ଋତୁ-ଅନୁଯାୟୀ ଫସଲ ଉତ୍ପାଦନ ପରିସଂଖ୍ୟାନ"
  },
  "Ministry of Agriculture & Farmers Welfare, Department of Agriculture & Farmers Welfare, Directorate of Economics and Statistics": {
    en: "Ministry of Agriculture & Farmers Welfare, Department of Agriculture & Farmers Welfare, Directorate of Economics and Statistics",
    hi: "कृषि एवं किसान कल्याण मंत्रालय, कृषि एवं किसान कल्याण विभाग, अर्थशास्त्र एवं सांख्यिकी निदेशालय",
    ta: "வேளாண்மை மற்றும் விவசாயிகள் நல அமைச்சகம், வேளாண்மை மற்றும் விவசாயிகள் நலத்துறை, பொருளாதாரம் மற்றும் புள்ளியியல் இயக்ககம்",
    te: "వ్యవసాయం & రైతు సంక్షేమ మంత్రిత్వ శాఖ, వ్యవసాయం & రైతు సంక్షేమ శాఖ, ఆర్థిక శాస్త్రం & గణాంకాల డైరెక్టరేట్",
    kn: "ಕೃಷಿ ಮತ್ತು ರೈತರ ಕಲ್ಯಾಣ ಸಚಿವಾಲಯ, ಕೃಷಿ ಮತ್ತು ರೈತರ ಕಲ್ಯಾಣ ಇಲಾಖೆ, ಅರ್ಥಶಾಸ್ತ್ರ ಮತ್ತು ಅಂಕಿಅಂಶ ನಿರ್ದೇಶನಾಲಯ",
    ml: "കൃഷി, കർഷക ക്ഷേമ മന്ത്രാലയം, കൃഷി, കർഷക ക്ഷേമ വകുപ്പ്, സാമ്പത്തിക, സ്ഥിതിവിവരക്കണക്ക് ഡയറക്ടറേറ്റ്",
    pa: "ਖੇਤੀਬਾੜੀ ਅਤੇ ਕਿਸਾਨ ਭਲਾਈ ਮੰਤਰਾਲਾ, ਖੇਤੀਬਾੜੀ ਅਤੇ ਕਿਸਾਨ ਭਲਾਈ ਵਿਭਾਗ, ਅਰਥ ਸ਼ਾਸਤਰ ਅਤੇ ਅੰਕੜਾ ਡਾਇਰੈਕਟੋਰੇਟ",
    or: "କୃଷି ଏବଂ କୃଷକ କଲ୍ୟାଣ ମନ୍ତ୍ରଣାଳୟ, କୃଷି ଏବଂ କୃଷକ କଲ୍ୟାଣ ବିଭାଗ, ଅର୍ଥନୀତି ଏବଂ ପରିସଂଖ୍ୟାନ ନିର୍ଦ୍ଦେଶାଳୟ"
  },
  "Ministry of Agriculture & Farmers Welfare · Directorate of Economics and Statistics": {
    en: "Ministry of Agriculture & Farmers Welfare · Directorate of Economics and Statistics",
    hi: "कृषि एवं किसान कल्याण मंत्रालय · अर्थशास्त्र एवं सांख्यिकी निदेशालय",
    ta: "வேளாண்மை மற்றும் விவசாயிகள் நல அமைச்சகம் · பொருளாதாரம் மற்றும் புள்ளியியல் இயக்ககம்",
    te: "వ్యవసాయం & రైతు సంక్షేమ మంత్రిత్వ శాఖ · ఆర్థిక శాస్త్రం & గణాంకాల డైరెక్టరేట్",
    kn: "ಕೃಷಿ ಮತ್ತು ರೈತರ ಕಲ್ಯಾಣ ಸಚಿವಾಲಯ · ಅರ್ಥಶಾಸ್ತ್ರ ಮತ್ತು ಅಂಕಿಅಂಶ ನಿರ್ದೇಶನಾಲಯ",
    ml: "കൃഷി, കർഷക ക്ഷേമ മന്ത്രാലയം · സാമ്പത്തിക, സ്ഥിതിവിവരക്കണക്ക് ഡയറക്ടറേറ്റ്",
    pa: "ਖੇਤੀਬਾੜੀ ਅਤੇ ਕਿਸਾਨ ਭਲਾਈ ਮੰਤਰਾਲਾ · ਅਰਥ ਸ਼ਾਸਤਰ ਅਤੇ ਅੰਕੜਾ ਡਾਇਰੈਕਟੋਰੇਟ",
    or: "କୃଷି ଏବଂ କୃଷକ କଲ୍ୟାଣ ମନ୍ତ୍ରଣାଳୟ · ଅର୍ଥନୀତି ଏବଂ ପରିସଂଖ୍ୟାନ ନିର୍ଦ୍ଦେଶାଳୟ"
  },
  "Official district, crop, season, year, area, production, and yield observations when a source file is supplied.": {
    en: "Official district, crop, season, year, area, production, and yield observations when a source file is supplied.",
    hi: "स्रोत फ़ाइल प्रदान किए जाने पर आधिकारिक जिला, फसल, मौसम, वर्ष, क्षेत्र, उत्पादन और उपज के अवलोकन।",
    ta: "மூலக் கோப்பு வழங்கப்படும்போது, அதிகாரப்பூர்வ மாவட்டம், பயிர், பருவம், ஆண்டு, பரப்பளவு, உற்பத்தி மற்றும் விளைச்சல் குறித்த அவதானிப்புகள்.",
    te: "మూల ఫైల్ అందించబడినప్పుడు అధికారిక జిల్లా, పంట, సీజన్, సంవత్సరం, విస్తీర్ణం, ఉత్పత్తి మరియు దిగుబడి పరిశీలనలు.",
    kn: "ಮೂಲ ಫೈಲ್ ಒದಗಿಸಿದಾಗ ಅಧಿಕೃತ ಜಿಲ್ಲೆ, ಬೆಳೆ, ಋತು, ವರ್ಷ, ವಿಸ್ತೀರ್ಣ, ಉತ್ಪಾದನೆ ಮತ್ತು ಇಳುವರಿ ಅವಲೋಕನಗಳು.",
    ml: "ഉറവിട ഫയൽ നൽകുമ്പോൾ ഔദ്യോഗിക ജില്ല, വിള, സീസൺ, വർഷം, വിസ്തീർണ്ണം, ഉൽപ്പാദനം, വിളവ് എന്നിവയുടെ നിരീക്ഷണങ്ങൾ.",
    pa: "ਅਧਿਕਾਰਤ ਜ਼ਿਲ੍ਹਾ, ਫਸਲ, ਸੀਜ਼ਨ, ਸਾਲ, ਰਕਬਾ, ਉਤਪਾਦਨ, ਅਤੇ ਝਾੜ ਦੇ ਨਿਰੀਖਣ ਜਦੋਂ ਇੱਕ ਸਰੋਤ ਫਾਈਲ ਪ੍ਰਦਾਨ ਕੀਤੀ ਜਾਂਦੀ ਹੈ।",
    or: "ଏକ ଉତ୍ସ ଫାଇଲ୍ ପ୍ରଦାନ କରାଯିବା ସମୟରେ ସରକାରୀ ଜିଲ୍ଲା, ଫସଲ, ଋତୁ, ବର୍ଷ, କ୍ଷେତ୍ର, ଉତ୍ପାଦନ ଏବଂ ଅମଳ ପର୍ଯ୍ୟବେକ୍ଷଣ |"
  },
  "Official Indian crop area and production records; file not integrated.": {
    en: "Official Indian crop area and production records; file not integrated.",
    hi: "आधिकारिक भारतीय फसल क्षेत्र और उत्पादन रिकॉर्ड; फ़ाइल एकीकृत नहीं है।",
    ta: "அதிகாரப்பூர்வ இந்திய பயிர் பரப்பளவு மற்றும் உற்பத்தி பதிவுகள்; கோப்பு ஒருங்கிணைக்கப்படவில்லை.",
    te: "అధికారిక భారతీయ పంట విస్తీర్ణం మరియు ఉత్పత్తి రికార్డులు; ఫైల్ అనుసంధానించబడలేదు.",
    kn: "ಅಧಿಕೃತ ಭಾರತೀಯ ಬೆಳೆ ವಿಸ್ತೀರ್ಣ ಮತ್ತು ಉತ್ಪಾದನಾ ದಾಖಲೆಗಳು; ಫೈಲ್ ಸಂಯೋಜಿಸಲ್ಪಟ್ಟಿಲ್ಲ.",
    ml: "ഔദ്യോഗിക ഇന്ത്യൻ വിള വിസ്തൃതിയും ഉൽപ്പാദന രേഖകളും; ഫയൽ സംയോജിപ്പിച്ചിട്ടില്ല.",
    pa: "ਅਧਿਕਾਰਤ ਭਾਰਤੀ ਫਸਲੀ ਰਕਬਾ ਅਤੇ ਉਤਪਾਦਨ ਰਿਕਾਰਡ; ਫਾਈਲ ਏਕੀਕ੍ਰਿਤ ਨਹੀਂ ਹੈ।",
    or: "ସରକାରୀ ଭାରତୀୟ ଫସଲ କ୍ଷେତ୍ର ଏବଂ ଉତ୍ପାଦନ ରେକର୍ଡ; ଫାଇଲ୍ ସଂଯୁକ୍ତ ହୋଇନାହିଁ |"
  },
  "Historical district-level agricultural data; file not integrated.": {
    en: "Historical district-level agricultural data; file not integrated.",
    hi: "ऐतिहासिक जिला स्तरीय कृषि डेटा; फ़ाइल एकीकृत नहीं है।",
    ta: "வரலாற்று ரீதியான மாவட்ட அளவிலான விவசாயத் தரவு; கோப்பு ஒருங்கிணைக்கப்படவில்லை.",
    te: "చారిత్రక జిల్లా స్థాయి వ్యవసాయ డేటా; ఫైల్ అనుసంధానించబడలేదు.",
    kn: "ಐತಿಹಾಸಿಕ ಜಿಲ್ಲಾ ಮಟ್ಟದ ಕೃಷಿ ಡೇಟಾ; ಫೈಲ್ ಸಂಯೋಜಿಸಲ್ಪಟ್ಟಿಲ್ಲ.",
    ml: "ചരിത്രപരമായ ജില്ലാ തല കാർഷിക ഡാറ്റ; ഫയൽ സംയോജിപ്പിച്ചിട്ടില്ല.",
    pa: "ਇਤਿਹਾਸਕ ਜ਼ਿਲ੍ਹਾ ਪੱਧਰੀ ਖੇਤੀਬਾੜੀ ਡਾਟਾ; ਫਾਈਲ ਏਕੀਕ੍ਰਿਤ ਨਹੀਂ ਹੈ।",
    or: "ଐତିହାସିକ ଜିଲ୍ଲା ସ୍ତରୀୟ କୃଷି ତଥ୍ୟ; ଫାଇଲ୍ ସଂଯୁକ୍ତ ହୋଇନାହିଁ |"
  },
  "NASA POWER Daily Point": {
    en: "NASA POWER Daily Point",
    hi: "नासा पावर दैनिक बिंदु (NASA POWER Daily Point)",
    ta: "நாசா பவர் தினசரி புள்ளி (NASA POWER Daily Point)",
    te: "నాసా పవర్ రోజువారీ పాయింట్ (NASA POWER Daily Point)",
    kn: "ನಾಸಾ ಪವರ್ ದೈನಂದಿನ ಬಿಂದು (NASA POWER Daily Point)",
    ml: "നാസ പവർ ദൈനംദിന പോയിൻ്റ് (NASA POWER Daily Point)",
    pa: "ਨਾਸਾ ਪਾਵਰ ਰੋਜ਼ਾਨਾ ਪੁਆਇੰਟ (NASA POWER Daily Point)",
    or: "ନାସା ପାୱାର ଦୈନିକ ବିନ୍ଦୁ (NASA POWER Daily Point)"
  },
  "NASA Langley Research Center": {
    en: "NASA Langley Research Center",
    hi: "नासा लैंगली रिसर्च सेंटर (NASA Langley Research Center)",
    ta: "நாசா லாங்லி ஆராய்ச்சி மையம் (NASA Langley Research Center)",
    te: "నాసా లాంగ్లీ పరిశోధనా కేంద్రం (NASA Langley Research Center)",
    kn: "ನಾಸಾ ಲ್ಯಾಂಗ್ಲಿ ಸಂಶೋಧನಾ ಕೇಂದ್ರ (NASA Langley Research Center)",
    ml: "നാസ ലാങ്‌ലി റിസർച്ച് സെൻ്റർ (NASA Langley Research Center)",
    pa: "ਨਾਸਾ ਲੈਂਗਲੇ ਰਿਸਰਚ ਸੈਂਟਰ (NASA Langley Research Center)",
    or: "ନାସା ଲାଙ୍ଗଲି ଅନୁସନ୍ଧାନ କେନ୍ଦ୍ର (NASA Langley Research Center)"
  },
  "Observed precipitation, temperature, humidity, and solar radiation for user-supplied district-season periods and coordinates.": {
    en: "Observed precipitation, temperature, humidity, and solar radiation for user-supplied district-season periods and coordinates.",
    hi: "उपयोगकर्ता द्वारा प्रदान किए गए जिला-मौसम अवधियों और निर्देशांकों के लिए प्रेक्षित वर्षा, तापमान, आर्द्रता और सौर विकिरण।",
    ta: "பயனர் வழங்கிய மாவட்ட-பருவ காலங்கள் மற்றும் ஆயத்தொலைவுகளுக்கான அவதானிக்கப்பட்ட மழைப்பொழிவு, வெப்பநிலை, ஈரப்பதம் மற்றும் சூரிய கதிர்வீச்சு.",
    te: "వినియోగదారు అందించిన జిల్లా-సీజన్ కాలాలు మరియు కోఆర్డినేట్‌ల కోసం గమనించిన వర్షపాతం, ఉష్ణోగ్రత, తేమ మరియు సౌర వికిరణం.",
    kn: "ಬಳಕೆದಾರರು ಒದಗಿಸಿದ ಜಿಲ್ಲಾ-ಋತು ಅವಧಿಗಳು ಮತ್ತು ನಿರ್ದೇಶಾಂಕಗಳಿಗಾಗಿ ಗಮನಿಸಿದ ಮಳೆ, ತಾಪಮಾನ, ಆರ್ದ್ರತೆ ಮತ್ತು ಸೌರ ವಿಕಿರಣ.",
    ml: "ഉപയോക്താവ് നൽകിയ ജില്ലാ-സീസൺ കാലയളവുകൾക്കും കോർഡിനേറ്റുകൾക്കുമായി നിരീക്ഷിച്ച മഴ, താപനില, ഈർപ്പം, സൗരവികിരണം.",
    pa: "ਉਪਭੋਗਤਾ ਦੁਆਰਾ ਪ੍ਰਦਾਨ ਕੀਤੇ ਜ਼ਿਲ੍ਹਾ-ਸੀਜ਼ਨ ਦੇ ਸਮੇਂ ਅਤੇ ਕੋਆਰਡੀਨੇਟਸ ਲਈ ਦੇਖਿਆ ਗਿਆ ਮੀਂਹ, ਤਾਪਮਾਨ, ਨਮੀ ਅਤੇ ਸੂਰਜੀ ਰੇਡੀਏਸ਼ਨ।",
    or: "ଉପଭୋକ୍ତା ପ୍ରଦତ୍ତ ଜିଲ୍ଲା-ଋତୁ ଅବଧି ଏବଂ ନିର୍ଦ୍ଦେଶାଙ୍କ ପାଇଁ ପର୍ଯ୍ୟବେକ୍ଷଣ କରାଯାଇଥିବା ବୃଷ୍ଟିପାତ, ତାପମାତ୍ରା, ଆର୍ଦ୍ରତା ଏବଂ ସୌର ବିକିରଣ |"
  },
  "Observed weather by documented district coordinates and crop-season period; not integrated.": {
    en: "Observed weather by documented district coordinates and crop-season period; not integrated.",
    hi: "प्रलेखित जिला निर्देशांक और फसल-मौसम अवधि द्वारा प्रेक्षित मौसम; एकीकृत नहीं।",
    ta: "ஆவணப்படுத்தப்பட்ட மாவட்ட ஆயத்தொலைவுகள் மற்றும் பயிர்-பருவ காலத்தின்படி அவதானிக்கப்பட்ட வானிலை; ஒருங்கிணைக்கப்படவில்லை.",
    te: "డాక్యుమెంట్ చేయబడిన జిల్లా కోఆర్డినేట్‌లు మరియు పంట-సీజన్ కాలం ద్వారా గమనించిన వాతావరణం; అనుసంధానించబడలేదు.",
    kn: "ದಾಖಲಿತ ಜಿಲ್ಲಾ ನಿರ್ದೇಶಾಂಕಗಳು ಮತ್ತು ಬೆಳೆ-ಋತುವಿನ ಅವಧಿಯಿಂದ ಗಮನಿಸಿದ ಹವಾಮಾನ; ಸಂಯೋಜಿಸಲ್ಪಟ್ಟಿಲ್ಲ.",
    ml: "രേഖപ്പെടുത്തപ്പെട്ട ജില്ലാ കോർഡിനേറ്റുകളും വിള-സീസൺ കാലയളവും അനുസരിച്ച് നിരീക്ഷിച്ച കാലാവസ്ഥ; സംയോജിപ്പിച്ചിട്ടില്ല.",
    pa: "ਦਸਤਾਵੇਜ਼ੀ ਜ਼ਿਲ੍ਹਾ ਕੋਆਰਡੀਨੇਟਸ ਅਤੇ ਫਸਲ-ਸੀਜ਼ਨ ਦੀ ਮਿਆਦ ਦੁਆਰਾ ਦੇਖਿਆ ਗਿਆ ਮੌਸਮ; ਏਕੀਕ੍ਰਿਤ ਨਹੀਂ।",
    or: "ଦସ୍ତାବିଜ୍ ଜିଲ୍ଲା ନିର୍ଦ୍ଦେଶାଙ୍କ ଏବଂ ଫସଲ-ଋତୁ ଅବଧି ଦ୍ୱାରା ପର୍ଯ୍ୟବେକ୍ଷଣ କରାଯାଇଥିବା ପାଗ; ସଂଯୁକ୍ତ ହୋଇନାହିଁ |"
  },
  "SoilGrids": {
    en: "SoilGrids",
    hi: "मृदा ग्रिड (SoilGrids)",
    ta: "மண் கட்டங்கள் (SoilGrids)",
    te: "నేల గ్రిడ్లు (SoilGrids)",
    kn: "ಮಣ್ಣಿನ ಗ್ರಿಡ್‌ಗಳು (SoilGrids)",
    ml: "സോയിൽ ഗ്രിഡുകൾ (SoilGrids)",
    pa: "ਸੋਇਲ ਗਰਿੱਡ (SoilGrids)",
    or: "ମୃତ୍ତିକା ଗ୍ରୀଡ୍ (SoilGrids)"
  },
  "ISRIC — World Soil Information": {
    en: "ISRIC — World Soil Information",
    hi: "आईएसआरआईसी — विश्व मृदा सूचना",
    ta: "ஐஎஸ்ஆர்ஐசி — உலக மண் தகவல்",
    te: "ISRIC — ప్రపంచ నేల సమాచారం",
    kn: "ISRIC — ವಿಶ್ವ ಮಣ್ಣಿನ ಮಾಹಿತಿ",
    ml: "ISRIC — ലോക മണ്ണ് വിവരങ്ങൾ",
    pa: "ISRIC — ਵਿਸ਼ਵ ਮਿੱਟੀ ਜਾਣਕਾਰੀ",
    or: "ISRIC — ବିଶ୍ୱ ମୃତ୍ତିକା ସୂଚନା"
  },
  "Optional soil information; no district-level soil values are currently integrated.": {
    en: "Optional soil information; no district-level soil values are currently integrated.",
    hi: "वैकल्पिक मृदा जानकारी; वर्तमान में कोई जिला स्तरीय मृदा मूल्य एकीकृत नहीं हैं।",
    ta: "விருப்பத்தேர்வுக்குரிய மண் தகவல்: தற்போது மாவட்ட அளவிலான மண் மதிப்புகள் எதுவும் ஒருங்கிணைக்கப்படவில்லை.",
    te: "ఐచ్ఛిక నేల సమాచారం; ప్రస్తుతం జిల్లా స్థాయి నేల విలువలు ఏవీ అనుసంధానించబడలేదు.",
    kn: "ಐಚ್ಛಿಕ ಮಣ್ಣಿನ ಮಾಹಿತಿ; ಪ್ರಸ್ತುತ ಯಾವುದೇ ಜಿಲ್ಲಾ ಮಟ್ಟದ ಮಣ್ಣಿನ ಮೌಲ್ಯಗಳನ್ನು ಸಂಯೋಜಿಸಲಾಗಿಲ್ಲ.",
    ml: "ഓപ്ഷണൽ മണ്ണ് വിവരങ്ങൾ; നിലവിൽ ജില്ലാ തല മണ്ണ് മൂല്യങ്ങളൊന്നും സംയോജിപ്പിച്ചിട്ടില്ല.",
    pa: "ਵਿਕਲਪਿਕ ਮਿੱਟੀ ਦੀ ਜਾਣਕਾਰੀ; ਵਰਤਮਾਨ ਵਿੱਚ ਕੋਈ ਵੀ ਜ਼ਿਲ੍ਹਾ ਪੱਧਰੀ ਮਿੱਟੀ ਮੁੱਲ ਏਕੀਕ੍ਰਿਤ ਨਹੀਂ ਹਨ।",
    or: "ଇଚ୍ଛାଧୀନ ମୃତ୍ତିକା ସୂଚନା; ବର୍ତ୍ତମାନ କୌଣସି ଜିଲ୍ଲା ସ୍ତରୀୟ ମୃତ୍ତିକା ମୂଲ୍ୟ ସଂଯୁକ୍ତ ହୋଇନାହିଁ |"
  },
  "Soil layer not available for this prediction.": {
    en: "Soil layer not available for this prediction.",
    hi: "इस भविष्यवाणी के लिए मिट्टी की परत उपलब्ध नहीं है।",
    ta: "இந்த கணிப்புக்கு மண் அடுக்கு கிடைக்கவில்லை.",
    te: "ఈ అంచనా కోసం నేల పొర అందుబాటులో లేదు.",
    kn: "ಈ ಮುನ್ಸೂಚನೆಗಾಗಿ ಮಣ್ಣಿನ ಪದರ ಲಭ್ಯವಿಲ್ಲ.",
    ml: "ഈ പ്രവചനത്തിന് മണ്ണ് പാളി ലഭ്യമല്ല.",
    pa: "ਇਸ ਭਵਿੱਖਬਾਣੀ ਲਈ ਮਿੱਟੀ ਦੀ ਪਰਤ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।",
    or: "ଏହି ପୂର୍ବାନୁମାନ ପାଇଁ ମୃତ୍ତିକା ସ୍ତର ଉପଲବ୍ଧ ନାହିଁ |"
  },
  "Soil layer not available for this prediction. No soil properties are fabricated or imputed.": {
    en: "Soil layer not available for this prediction. No soil properties are fabricated or imputed.",
    hi: "इस भविष्यवाणी के लिए मिट्टी की परत उपलब्ध नहीं है। कोई भी मिट्टी गुण मनगढ़ंत या आरोपित नहीं हैं।",
    ta: "இந்த கணிப்புக்கு மண் அடுக்கு கிடைக்கவில்லை. எந்த மண் பண்புகளும் புனையப்படவில்லை அல்லது திணிக்கப்படவில்லை.",
    te: "ఈ అంచనా కోసం నేల పొర అందుబాటులో లేదు. నేల లక్షణాలు ఏవీ కల్పితం లేదా ఆపాదించబడలేదు.",
    kn: "ಈ ಮುನ್ಸೂಚನೆಗಾಗಿ ಮಣ್ಣಿನ ಪದರ ಲಭ್ಯವಿಲ್ಲ. ಯಾವುದೇ ಮಣ್ಣಿನ ಗುಣಲಕ್ಷಣಗಳನ್ನು ರೂಪಿಸಲಾಗಿಲ್ಲ ಅಥವಾ ಅಂದಾಜಿಸಲಾಗಿಲ್ಲ.",
    ml: "ഈ പ്രവചനത്തിന് മണ്ണ് പാളി ലഭ്യമല്ല. മണ്ണിൻ്റെ ഗുണങ്ങളൊന്നും കൃത്രിമമായി ഉണ്ടാക്കുകയോ ആരോപിക്കുകയോ ചെയ്തിട്ടില്ല.",
    pa: "ਇਸ ਭਵਿੱਖਬਾਣੀ ਲਈ ਮਿੱਟੀ ਦੀ ਪਰਤ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਕੋਈ ਵੀ ਮਿੱਟੀ ਦੇ ਗੁਣ ਮਨਘੜਤ ਜਾਂ ਲਗਾਏ ਨਹੀਂ ਗਏ ਹਨ।",
    or: "ଏହି ପୂର୍ବାନୁମାନ ପାଇଁ ମୃତ୍ତିକା ସ୍ତର ଉପଲବ୍ଧ ନାହିଁ | କୌଣସି ମୃତ୍ତିକା ଗୁଣ କଳ୍ପିତ କିମ୍ବା ଆରୋପିତ ହୋଇନାହିଁ |"
  },
  "Climate not integrated · Soil not integrated": {
    en: "Climate not integrated · Soil not integrated",
    hi: "जलवायु एकीकृत नहीं · मिट्टी एकीकृत नहीं",
    ta: "வானிலை ஒருங்கிணைக்கப்படவில்லை · மண் ஒருங்கிணைக்கப்படவில்லை",
    te: "వాతావరణం అనుసంధానించబడలేదు · నేల అనుసంధానించబడలేదు",
    kn: "ಹವಾಮಾನ ಸಂಯೋಜಿಸಲ್ಪಟ್ಟಿಲ್ಲ · ಮಣ್ಣು ಸಂಯೋಜಿಸಲ್ಪಟ್ಟಿಲ್ಲ",
    ml: "കാലാവസ്ഥ സംയോജിപ്പിച്ചിട്ടില്ല · മണ്ണ് സംയോജിപ്പിച്ചിട്ടില്ല",
    pa: "ਜਲਵਾਯੂ ਏਕੀਕ੍ਰਿਤ ਨਹੀਂ · ਮਿੱਟੀ ਏਕੀਕ੍ਰਿਤ ਨਹੀਂ",
    or: "ଜଳବାୟୁ ସଂଯୁକ୍ତ ନୁହେଁ · ମୃତ୍ତିକା ସଂଯୁକ୍ତ ନୁହେଁ"
  },
  "Permutation importance is global and does not explain an individual prediction. Per-prediction SHAP is unavailable unless the optional shap package is installed.": {
    en: "Permutation importance is global and does not explain an individual prediction. Per-prediction SHAP is unavailable unless the optional shap package is installed.",
    hi: "क्रमपरिवर्तन महत्व वैश्विक है और किसी व्यक्तिगत भविष्यवाणी की व्याख्या नहीं करता है। जब तक वैकल्पिक shap पैकेज स्थापित नहीं होता, प्रति-भविष्यवाणी SHAP अनुपलब्ध है।",
    ta: "வரிசைமாற்ற முக்கியத்துவம் உலகளாவியது மற்றும் தனிப்பட்ட கணிப்பை விளக்காது. விருப்பத்தேர்வான shap தொகுப்பு நிறுவப்படாவிட்டால், ஒவ்வொரு கணிப்புக்குமான SHAP கிடைக்காது.",
    te: "ప్రస్తారణ ప్రాముఖ్యత గ్లోబల్ మరియు వ్యక్తిగత అంచనాను వివరించదు. ఐచ్ఛిక shap ప్యాకేజీ ఇన్‌స్టాల్ చేయబడితే తప్ప ప్రతి అంచనాకు SHAP అందుబాటులో ఉండదు.",
    kn: "ಕ್ರಮಪಲ್ಲಟನೆಯ ಪ್ರಾಮುಖ್ಯತೆಯು ಜಾಗತಿಕವಾಗಿದೆ ಮತ್ತು ವೈಯಕ್ತಿಕ ಮುನ್ಸೂಚನೆಯನ್ನು ವಿವರಿಸುವುದಿಲ್ಲ. ಐಚ್ಛಿಕ shap ಪ್ಯಾಕೇಜ್ ಸ್ಥಾಪಿಸದ ಹೊರತು ಪ್ರತಿ-ಮುನ್ಸೂಚನೆಯ SHAP ಲಭ್ಯವಿರುವುದಿಲ್ಲ.",
    ml: "പെർമ്യൂട്ടേഷൻ പ്രാധാന്യം ആഗോളമാണ്, മാത്രമല്ല ഒരു വ്യക്തിഗത പ്രവചനത്തെ വിശദീകരിക്കുന്നില്ല. ഓപ്ഷണൽ shap പാക്കേജ് ഇൻസ്റ്റാൾ ചെയ്തിട്ടില്ലെങ്കിൽ പ്രതി-പ്രവചന SHAP ലഭ്യമല്ല.",
    pa: "ਕ੍ਰਮਬੱਧਤਾ ਮਹੱਤਵ ਗਲੋਬਲ ਹੈ ਅਤੇ ਇੱਕ ਵਿਅਕਤੀਗਤ ਭਵਿੱਖਬਾਣੀ ਦੀ ਵਿਆਖਿਆ ਨਹੀਂ ਕਰਦਾ ਹੈ। ਜਦੋਂ ਤੱਕ ਵਿਕਲਪਿਕ shap ਪੈਕੇਜ ਸਥਾਪਤ ਨਹੀਂ ਹੁੰਦਾ, ਪ੍ਰਤੀ-ਭਵਿੱਖਬਾਣੀ SHAP ਅਣਉਪਲਬਧ ਹੈ।",
    or: "କ୍ରମପରିବର୍ତ୍ତନ ମହତ୍ତ୍ୱ ବୈଶ୍ୱିକ ଏବଂ ଏକ ବ୍ୟକ୍ତିଗତ ପୂର୍ବାନୁମାନ ବ୍ୟାଖ୍ୟା କରେ ନାହିଁ | ଇଚ୍ଛାଧୀନ shap ପ୍ୟାକେଜ୍ ସଂସ୍ଥାପିତ ନହେବା ପର୍ଯ୍ୟନ୍ତ ପ୍ରତି-ପୂର୍ବାନୁମାନ SHAP ଅନୁପଲବ୍ଧ |"
  },
  "Equal-weight mean of empirical percentile ranks for historical yield coefficient of variation and approximate prediction-interval width relative to predicted yield; tercile labels.": {
    en: "Equal-weight mean of empirical percentile ranks for historical yield coefficient of variation and approximate prediction-interval width relative to predicted yield; tercile labels.",
    hi: "ऐतिहासिक उपज परिवर्तनशीलता गुणांक और अनुमानित उपज के सापेक्ष अनुमानित भविष्यवाणी-अंतराल चौड़ाई के लिए अनुभवजन्य प्रतिशतक रैंक का समान-भार माध्य; टर्सिल लेबल।",
    ta: "வரலாற்று விளைச்சல் மாறுபாட்டுக் குணகம் மற்றும் கணிக்கப்பட்ட விளைச்சலுடன் தொடர்புடைய தோராயமான கணிப்பு-இடைவெளி அகலத்திற்கான அனுபவ சதவீத தரவரிசைகளின் சம-எடை சராசரி; முப்பிரிவு லேபிள்கள்.",
    te: "చారిత్రక దిగుబడి వైవిధ్య గుణకం మరియు ఊహించిన దిగుబడికి సంబంధించి సుమారు అంచనా-విరామ వెడల్పు కోసం అనుభావిక శాతపు ర్యాంకుల సమాన-బరువు సగటు; టెర్సైల్ లేబుల్స్.",
    kn: "ಐತಿಹಾಸಿಕ ಇಳುವರಿ ವ್ಯತ್ಯಾಸದ ಗುಣಾಂಕ ಮತ್ತು ಅಂದಾಜು ಇಳುವರಿಗೆ ಸಂಬಂಧಿಸಿದಂತೆ ಅಂದಾಜು ಮುನ್ಸೂಚನೆ-ಅಂತರದ ಅಗಲಕ್ಕಾಗಿ ಪ್ರಾಯೋಗಿಕ ಶೇಕಡಾವಾರು ಶ್ರೇಣಿಗಳ ಸಮಾನ-ತೂಕದ ಸರಾಸರಿ; ಟರ್ಸಿಲ್ ಲೇಬಲ್‌ಗಳು.",
    ml: "ചരിത്രപരമായ വിളവ് വ്യതിയാന ഗുണകത്തിനും പ്രവചിച്ച വിളവുമായി താരതമ്യപ്പെടുത്തുമ്പോൾ ഏകദേശ പ്രവചന-ഇടവേള വീതിക്കും വേണ്ടിയുള്ള അനുഭവപരമായ ശതമാന റാങ്കുകളുടെ തുല്യ-ഭാര ശരാശരി; ടെർസൈൽ ലേബലുകൾ.",
    pa: "ਇਤਿਹਾਸਕ ਝਾੜ ਪਰਿਵਰਤਨਸ਼ੀਲਤਾ ਗੁਣਾਂਕ ਅਤੇ ਅਨੁਮਾਨਿਤ ਝਾੜ ਦੇ ਸਾਪੇਖਿਕ ਅੰਦਾਜ਼ਨ ਭਵਿੱਖਬਾਣੀ-ਅੰਤਰਾਲ ਚੌੜਾਈ ਲਈ ਅਨੁਭਵੀ ਪ੍ਰਤੀਸ਼ਤ ਰੈਂਕਾਂ ਦਾ ਬਰਾਬਰ-ਭਾਰ ਮੱਧਮਾਨ; ਟਰਸਾਈਲ ਲੇਬਲ।",
    or: "ଐତିହାସିକ ଅମଳ ପରିବର୍ତ୍ତନଶୀଳତା ଗୁଣାଙ୍କ ଏବଂ ପୂର୍ବାନୁମାନିତ ଅମଳ ତୁଳନାରେ ଆନୁମାନିକ ପୂର୍ବାନୁମାନ-ବ୍ୟବଧାନ ପ୍ରସ୍ଥ ପାଇଁ ଅନୁଭବସିଦ୍ଧ ଶତକଡ଼ା ର଼୍ୟାଙ୍କର ସମାନ-ଭାର ମାଧ୍ୟ; ଟର୍ସାଇଲ୍ ଲେବଲ୍ |"
  },
  "Yield variability and prediction interval relative to expected output.": {
    en: "Yield variability and prediction interval relative to expected output.",
    hi: "अपेक्षित उत्पादन के सापेक्ष उपज परिवर्तनशीलता और भविष्यवाणी अंतराल।",
    ta: "எதிர்பார்க்கப்படும் உற்பத்திக்கு ஏற்ப விளைச்சல் மாறுபாடு மற்றும் கணிப்பு இடைவெளி.",
    te: "ఆశించిన ఉత్పత్తికి సంబంధించి దిగుబడి వైవిధ్యం మరియు అంచనా విరామం.",
    kn: "ನಿರೀಕ್ಷಿತ ಇಳುವರಿಗೆ ಸಂಬಂಧಿಸಿದಂತೆ ಇಳುವರಿ ವ್ಯತ್ಯಾಸ ಮತ್ತು ಮುನ್ಸೂಚನೆ ಮಧ್ಯಂತರ.",
    ml: "പ്രതീക്ഷിക്കുന്ന ഉൽപ്പാദനവുമായി ബന്ധപ്പെട്ട് വിളവ് വ്യതിയാനവും പ്രവചന ഇടവേളയും.",
    pa: "ਸੰਭਾਵਿਤ ਉਤਪਾਦਨ ਦੇ ਸਾਪੇਖਿਕ ਝਾੜ ਦੀ ਪਰਿਵਰਤਨਸ਼ੀਲਤਾ ਅਤੇ ਭਵਿੱਖਬਾਣੀ ਅੰਤਰਾਲ।",
    or: "ପ୍ରତ୍ୟାଶିତ ଉତ୍ପାଦନ ତୁଳନାରେ ଅମଳ ପରିବର୍ତ୍ତନଶୀଳତା ଏବଂ ପୂର୍ବାନୁମାନ ବ୍ୟବଧାନ |"
  },
  "The selected year": {
    en: "The selected year",
    hi: "चयनित वर्ष",
    ta: "தேர்ந்தெடுக்கப்பட்ட ஆண்டு",
    te: "ఎంచుకున్న సంవత్సరం",
    kn: "ಆಯ್ಕೆಮಾಡಿದ ವರ್ಷ",
    ml: "തിരഞ്ഞെടുത്ത വർഷം",
    pa: "ਚੁਣਿਆ ਗਿਆ ਸਾਲ",
    or: "ଚୟନିତ ବର୍ଷ"
  },
  "Production risk analysis": {
    en: "Production risk analysis",
    hi: "उत्पादन जोखिम विश्लेषण",
    ta: "உற்பத்தி இடர் பகுப்பாய்வு",
    te: "ఉత్పత్తి ప్రమాద విశ్లేషణ",
    kn: "ಉತ್ಪಾದನಾ ಅಪಾಯದ ವಿಶ್ಲೇಷಣೆ",
    ml: "ഉൽപ്പാദന അപകടസാധ്യത വിശകലനം",
    pa: "ਉਤਪਾਦਨ ਜੋਖਮ ਵਿਸ਼ਲੇਸ਼ਣ",
    or: "ଉତ୍ପାଦନ ବିପଦ ବିଶ୍ଳେଷଣ"
  },
  "ICRISAT historical mean yield relative to crop average": {
    en: "ICRISAT historical mean yield relative to crop average",
    hi: "फसल औसत के सापेक्ष ICRISAT ऐतिहासिक औसत उपज",
    ta: "பயிர் சராசரியுடன் ஒப்பிடும்போது ICRISAT வரலாற்று சராசரி விளைச்சல்",
    te: "పంట సగటుతో పోలిస్తే ICRISAT చారిత్రక సగటు దిగుబడి",
    kn: "ಬೆಳೆ ಸರಾಸರಿಗೆ ಹೋಲಿಸಿದರೆ ICRISAT ಐತಿಹಾಸಿಕ ಸರಾಸರಿ ಇಳುವರಿ",
    ml: "വിള ശരാശരിയുമായി താരതമ്യപ്പെടുത്തുമ്പോൾ ICRISAT ചരിത്രപരമായ ശരാശരി വിളവ്",
    pa: "ਫਸਲ ਦੀ ਔਸਤ ਦੇ ਮੁਕਾਬਲੇ ICRISAT ਇਤਿਹਾਸਕ ਔਸਤ ਝਾੜ",
    or: "ଫସଲ ହାରାହାରି ତୁଳନାରେ ICRISAT ଐତିହାସିକ ହାରାହାରି ଅମଳ"
  },
  "ICRISAT yield data": {
    en: "ICRISAT yield data",
    hi: "ICRISAT उपज डेटा",
    ta: "ICRISAT விளைச்சல் தரவு",
    te: "ICRISAT దిగుబడి డేటా",
    kn: "ICRISAT ಇಳುವರಿ ಡೇಟಾ",
    ml: "ICRISAT വിളവ് ഡാറ്റ",
    pa: "ICRISAT ਝਾੜ ਡਾਟਾ",
    or: "ICRISAT ଅମଳ ତଥ୍ୟ"
  },
  "ICRISAT District baseline applied for Thiruvallur. Real ML model index pending for exact district-year boundary.": {
    en: "ICRISAT District baseline applied for Thiruvallur. Real ML model index pending for exact district-year boundary.",
    hi: "तिरुवल्लूर के लिए ICRISAT जिला आधार रेखा लागू। सटीक जिला-वर्ष सीमा के लिए वास्तविक एमएल मॉडल इंडेक्स लंबित है।",
    ta: "திருவள்ளூர் மாவட்டத்திற்கான ICRISAT மாவட்ட அடிப்படைத் தரவு பயன்படுத்தப்பட்டுள்ளது. சரியான மாவட்ட-ஆண்டு எல்லைக்கான உண்மையான இயந்திர கற்றல் (ML) மாதிரி குறியீடு நிலுவையில் உள்ளது.",
    te: "తిరువళ్లూరు కోసం ICRISAT జిల్లా బేస్‌లైన్ వర్తింపజేయబడింది. ఖచ్చితమైన జిల్లా-సంవత్సరం సరిహద్దు కోసం నిజమైన ML మోడల్ సూచిక పెండింగ్‌లో ఉంది.",
    kn: "ತಿರುವಳ್ಳೂರು ಜಿಲ್ಲೆಗೆ ICRISAT ಜಿಲ್ಲಾ ಬೇಸ್‌ಲೈನ್ ಅನ್ವಯಿಸಲಾಗಿದೆ. ನಿಖರವಾದ ಜಿಲ್ಲಾ-ವರ್ಷದ ಗಡಿಗಾಗಿ ನಿಜವಾದ ML ಮಾದರಿ ಸೂಚ್ಯಂಕ ಬಾಕಿ ಉಳಿದಿದೆ.",
    ml: "തിരുവള്ളൂരിനായി ICRISAT ജില്ലാ ബേസ്‌ലൈൻ പ്രയോഗിച്ചു. കൃത്യമായ ജില്ലാ-വർഷ അതിർത്തിക്കായി യഥാർത്ഥ ML മോഡൽ സൂചിക ശേഷിക്കുന്നു.",
    pa: "ਤਿਰੂਵੱਲੂਰ ਲਈ ICRISAT ਜ਼ਿਲ੍ਹਾ ਬੇਸਲਾਈਨ ਲਾਗੂ ਕੀਤੀ ਗਈ। ਸਹੀ ਜ਼ਿਲ੍ਹਾ-ਸਾਲ ਸੀਮਾ ਲਈ ਅਸਲ ML ਮਾਡਲ ਸੂਚਕਾਂਕ ਬਕਾਇਆ ਹੈ।",
    or: "ତିରୁଭାଲ୍ଲୁର ପାଇଁ ICRISAT ଜିଲ୍ଲା ବେସଲାଇନ ପ୍ରୟୋଗ କରାଯାଇଛି | ସଠିକ୍ ଜିଲ୍ଲା-ବର୍ଷ ସୀମା ପାଇଁ ପ୍ରକୃତ ML ମଡେଲ୍ ସୂଚକାଙ୍କ ବାକି ଅଛି |"
  },
  "Crop recommendations are estimates based on real data from ICRISAT, AGMARKNET, NASA POWER, IMD, and Soil Health Card sources. They are not official agronomic advice. Confirm all decisions with your local Krishi Vigyan Kendra or agricultural extension officer.": {
    en: "Crop recommendations are estimates based on real data from ICRISAT, AGMARKNET, NASA POWER, IMD, and Soil Health Card sources. They are not official agronomic advice. Confirm all decisions with your local Krishi Vigyan Kendra or agricultural extension officer.",
    hi: "फसल सिफारिशें ICRISAT, AGMARKNET, NASA POWER, IMD और मृदा स्वास्थ्य कार्ड स्रोतों के वास्तविक आंकड़ों पर आधारित अनुमान हैं। वे आधिकारिक कृषि सलाह नहीं हैं। अपने स्थानीय कृषि विज्ञान केंद्र या कृषि विस्तार अधिकारी से सभी निर्णयों की पुष्टि करें।",
    ta: "பயிர் பரிந்துரைகள் ICRISAT, AGMARKNET, NASA POWER, IMD மற்றும் மண் ஆரோக்கிய அட்டை மூலங்களின் உண்மையான தரவுகளின் அடிப்படையிலான மதிப்பீடுகளாகும். இவை அதிகாரப்பூர்வ வேளாண் ஆலோசனைகள் அல்ல. அனைத்து முடிவுகளையும் உங்கள் உள்ளூர் கிருஷி விஞ்ஞான் மையம் அல்லது விவசாய விரிவாக்க அதிகாரியுடன் உறுதிப்படுத்திக் கொள்ளுங்கள்.",
    te: "పంట సిఫార్సులు ICRISAT, AGMARKNET, NASA POWER, IMD మరియు సాయిల్ హెల్త్ కార్డ్ మూలాల నుండి వచ్చిన నిజమైన డేటా ఆధారంగా అంచనాలు. అవి అధికారిక వ్యవసాయ సలహా కావు. మీ స్థానిక కృషి విజ్ఞాన కేంద్రం లేదా వ్యవసాయ విస్తరణ అధికారితో అన్ని నిర్ణయాలను నిర్ధారించండి.",
    kn: "ಬೆಳೆ ಶಿಫಾರಸುಗಳು ICRISAT, AGMARKNET, NASA POWER, IMD ಮತ್ತು ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್ ಮೂಲಗಳಿಂದ ಬಂದ ನೈಜ ಡೇಟಾವನ್ನು ಆಧರಿಸಿದ ಅಂದಾಜುಗಳಾಗಿವೆ. ಅವು ಅಧಿಕೃತ ಕೃಷಿ ಸಲಹೆಯಲ್ಲ. ನಿಮ್ಮ ಸ್ಥಳೀಯ ಕೃಷಿ ವಿಜ್ಞಾನ ಕೇಂದ್ರ ಅಥವಾ ಕೃಷಿ ವಿಸ್ತರಣಾ ಅಧಿಕಾರಿಯೊಂದಿಗೆ ಎಲ್ಲಾ ನಿರ್ಧಾರಗಳನ್ನು ದೃಢೀಕರಿಸಿ.",
    ml: "വിള ശുപാർശകൾ ICRISAT, AGMARKNET, NASA POWER, IMD, സോയിൽ ഹെൽത്ത് കാർഡ് ഉറവിടങ്ങളിൽ നിന്നുള്ള യഥാർത്ഥ ഡാറ്റയെ അടിസ്ഥാനമാക്കിയുള്ള കണക്കുകൂട്ടലുകളാണ്. അവ ഔദ്യോഗിക കാർഷിക ഉപദേശമല്ല. നിങ്ങളുടെ പ്രാദേശിക കൃഷി വിജ്ഞാന കേന്ദ്രവുമായോ കാർഷിക വിപുലീകരണ ഉദ്യോഗസ്ഥനുമായോ എല്ലാ തീരുമാനങ്ങളും സ്ഥിരീകരിക്കുക.",
    pa: "ਫਸਲ ਦੀਆਂ ਸਿਫ਼ਾਰਸ਼ਾਂ ICRISAT, AGMARKNET, NASA POWER, IMD, ਅਤੇ ਸੋਇਲ ਹੈਲਥ ਕਾਰਡ ਸਰੋਤਾਂ ਦੇ ਅਸਲ ਡੇਟਾ 'ਤੇ ਆਧਾਰਿਤ ਅੰਦਾਜ਼ੇ ਹਨ। ਉਹ ਅਧਿਕਾਰਤ ਖੇਤੀ ਸੰਬੰਧੀ ਸਲਾਹ ਨਹੀਂ ਹਨ। ਆਪਣੇ ਸਥਾਨਕ ਕ੍ਰਿਸ਼ੀ ਵਿਗਿਆਨ ਕੇਂਦਰ ਜਾਂ ਖੇਤੀਬਾੜੀ ਵਿਸਥਾਰ ਅਧਿਕਾਰੀ ਨਾਲ ਸਾਰੇ ਫੈਸਲਿਆਂ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ।",
    or: "ଫସଲ ସୁପାରିଶଗୁଡ଼ିକ ICRISAT, AGMARKNET, NASA POWER, IMD, ଏବଂ ମୃତ୍ତିକା ସ୍ୱାସ୍ଥ୍ୟ କାର୍ଡ ଉତ୍ସଗୁଡ଼ିକରୁ ପ୍ରକୃତ ତଥ୍ୟ ଉପରେ ଆଧାରିତ ଆକଳନ | ସେଗୁଡ଼ିକ ସରକାରୀ କୃଷି ପରାମର୍ଶ ନୁହେଁ | ଆପଣଙ୍କ ସ୍ଥାନୀୟ କୃଷି ବିଜ୍ଞାନ କେନ୍ଦ୍ର କିମ୍ବା କୃଷି ବିସ୍ତାର ଅଧିକାରୀଙ୍କ ସହିତ ସମସ୍ତ ନିଷ୍ପତ୍ତି ନିଶ୍ଚିତ କରନ୍ତୁ |"
  },
  "Yield: ICRISAT historical mean (Tamil Nadu). Price: AGMARKNET — mandi price snapshot. Cost: ICAR/TNAU reference cost of cultivation (published estimates). Revenue = total yield (kg) × price per kg. Net return = revenue − cultivation cost. Excludes post-harvest losses, transport, and market commissions.": {
    en: "Yield: ICRISAT historical mean (Tamil Nadu). Price: AGMARKNET — mandi price snapshot. Cost: ICAR/TNAU reference cost of cultivation (published estimates). Revenue = total yield (kg) × price per kg. Net return = revenue − cultivation cost. Excludes post-harvest losses, transport, and market commissions.",
    hi: "उपज: ICRISAT ऐतिहासिक औसत (तमिलनाडु)। मूल्य: AGMARKNET — मंडी मूल्य स्नैपशॉट। लागत: ICAR/TNAU संदर्भ खेती लागत (प्रकाशित अनुमान)। राजस्व = कुल उपज (किग्रा) × मूल्य प्रति किग्रा। शुद्ध लाभ = राजस्व − खेती लागत। इसमें फसल कटाई के बाद के नुकसान, परिवहन और मंडी कमीशन शामिल नहीं हैं।",
    ta: "விளைச்சல்: ICRISAT வரலாற்று சராசரி (தமிழ்நாடு). விலை: AGMARKNET — மண்டி விலை நிலவரம். செலவு: ICAR/TNAU சாகுபடி குறிப்பு செலவு (வெளியிடப்பட்ட மதிப்பீடுகள்). வருவாய் = மொத்த விளைச்சல் (kg) × கிலோ விலை. நிகர லாபம் = வருவாய் − சாகுபடி செலவு. அறுவடைக்குப் பின் ஏற்படும் இழப்புகள், போக்குவரத்து மற்றும் சந்தை கமிஷன்கள் இதில் சேர்க்கப்படவில்லை.",
    te: "దిగుబడి: ICRISAT చారిత్రక సగటు (తమిళనాడు). ధర: AGMARKNET — మండి ధర స్నాప్‌షాట్. ఖర్చు: ICAR/TNAU సాగు ఖర్చు సూచన (ప్రచురించబడిన అంచనాలు). ఆదాయం = మొత్తం దిగుబడి (కేజీ) × కేజీ ధర. నికర రాబడి = ఆదాయం − సాగు ఖర్చు. కోత అనంతర నష్టాలు, రవాణా మరియు మార్కెట్ కమీషన్‌లను మినహాయించింది.",
    kn: "ಇಳುವರಿ: ICRISAT ಐತಿಹಾಸಿಕ ಸರಾಸರಿ (ತಮಿಳುನಾಡು). ಬೆಲೆ: AGMARKNET — ಮಂಡಿ ಬೆಲೆ ಸ್ನ್ಯಾಪ್‌ಶಾಟ್. ವೆಚ್ಚ: ICAR/TNAU ಉಲ್ಲೇಖಿತ ಕೃಷಿ ವೆಚ್ಚ (ಪ್ರಕಟಿತ ಅಂದಾಜುಗಳು). ಆದಾಯ = ಒಟ್ಟು ಇಳುವರಿ (ಕೆಜಿ) × ಪ್ರತಿ ಕೆಜಿ ಬೆಲೆ. ನಿವ್ವಳ ಲಾಭ = ಆದಾಯ − ಕೃಷಿ ವೆಚ್ಚ. ಸುಗ್ಗಿಯ ನಂತರದ ನಷ್ಟಗಳು, ಸಾರಿಗೆ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ಕಮಿಷನ್‌ಗಳನ್ನು ಹೊರತುಪಡಿಸಿದೆ.",
    ml: "വിളവ്: ICRISAT ചരിത്രപരമായ ശരാശരി (തമിഴ്‌നാട്). വില: AGMARKNET — മണ്ടി വില നിലവാരം. ചിലവ്: ICAR/TNAU റഫറൻസ് കൃഷിച്ചെലവ് (പ്രസിദ്ധീകരിച്ച കണക്കുകൾ). വരുമാനം = ആകെ വിളവ് (കിലോ) × കിലോഗ്രാം വില. അറ്റാദായം = വരുമാനം − കൃഷിച്ചെലവ്. വിളവെടുപ്പിനു ശേഷമുള്ള നഷ്ടം, ഗതാഗതം, മാർക്കറ്റ് കമ്മീഷനുകൾ എന്നിവ ഒഴിവാക്കുന്നു.",
    pa: "ਝਾੜ: ICRISAT ਇਤਿਹਾਸਕ ਔਸਤ (ਤਾਮਿਲਨਾਡੂ)। ਕੀਮਤ: AGMARKNET — ਮੰਡੀ ਕੀਮਤ ਸਨੈਪਸ਼ਾਟ। ਲਾਗਤ: ICAR/TNAU ਕਾਸ਼ਤ ਦੀ ਸੰਦਰਭ ਲਾਗਤ (ਪ੍ਰਕਾਸ਼ਿਤ ਅੰਦਾਜ਼ੇ)। ਆਮਦਨ = ਕੁੱਲ ਝਾੜ (ਕਿਲੋਗ੍ਰਾਮ) × ਪ੍ਰਤੀ ਕਿਲੋ ਕੀਮਤ। ਸ਼ੁੱਧ ਰਿਟਰਨ = ਆਮਦਨ − ਕਾਸ਼ਤ ਲਾਗਤ। ਵਾਢੀ ਤੋਂ ਬਾਅਦ ਦੇ ਨੁਕਸਾਨ, ਆਵਾਜਾਈ ਅਤੇ ਮਾਰਕੀਟ ਕਮਿਸ਼ਨ ਸ਼ਾਮਲ ਨਹੀਂ ਹਨ।",
    or: "ଅମଳ: ICRISAT ଐତିହାସିକ ହାରାହାରି (ତାମିଲନାଡୁ) | ମୂଲ୍ୟ: AGMARKNET — ମଣ୍ଡି ମୂଲ୍ୟ ସ୍ନାପସଟ୍ | ମୂଲ୍ୟ: ICAR/TNAU ସନ୍ଦର୍ଭ ଚାଷ ଖର୍ଚ୍ଚ (ପ୍ରକାଶିତ ଆକଳନ) | ରାଜସ୍ୱ = ମୋଟ ଅମଳ (କିଲୋଗ୍ରାମ) × କିଲୋଗ୍ରାମ ପ୍ରତି ମୂଲ୍ୟ | ନିଟ୍ ଲାଭ = ରାଜସ୍ୱ − ଚାଷ ଖର୍ଚ୍ଚ | ଅମଳ ପରବର୍ତ୍ତୀ କ୍ଷତି, ପରିବହନ ଏବଂ ବଜାର କମିଶନକୁ ବାଦ୍ ଦେଇଛି |"
  },
  "Village-level aggregated survey data. Individual farm soil may differ. These records are from the 2024–25 Soil Health Card campaign. For precise recommendations, obtain a laboratory soil test.": {
    en: "Village-level aggregated survey data. Individual farm soil may differ. These records are from the 2024–25 Soil Health Card campaign. For precise recommendations, obtain a laboratory soil test.",
    hi: "ग्राम-स्तरीय समेकित सर्वेक्षण डेटा। व्यक्तिगत खेत की मिट्टी भिन्न हो सकती है। ये रिकॉर्ड 2024–25 मृदा स्वास्थ्य कार्ड अभियान से हैं। सटीक सिफारिशों के लिए, प्रयोगशाला मृदा परीक्षण प्राप्त करें।",
    ta: "கிராம அளவிலான ஒருங்கிணைந்த கணக்கெடுப்புத் தரவு. தனிப்பட்ட பண்ணை மண் மாறுபடலாம். இந்தப் பதிவுகள் 2024–25 மண் ஆரோக்கிய அட்டை பிரச்சாரத்தின் மூலம் பெறப்பட்டவை. துல்லியமான பரிந்துரைகளுக்கு, ஆய்வக மண் பரிசோதனையைப் பெறவும்.",
    te: "గ్రామ స్థాయి సగటు సర్వే డేటా. వ్యక్తిగత పొలం నేల మారవచ్చు. ఈ రికార్డులు 2024–25 సాయిల్ హెల్త్ కార్డ్ ప్రచారం నుండి వచ్చినవి. ఖచ్చితమైన సిఫార్సుల కోసం, ప్రయోగశాల నేల పరీక్షను పొందండి.",
    kn: "ಗ್ರಾಮ ಮಟ್ಟದ ಒಟ್ಟು ಸಮೀಕ್ಷೆ ಡೇಟಾ. ವೈಯಕ್ತಿಕ ಕೃಷಿ ಮಣ್ಣು ಬದಲಾಗಬಹುದು. ಈ ದಾಖಲೆಗಳು 2024–25 ರ ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್ ಅಭಿಯಾನದವು. ನಿಖರವಾದ ಶಿಫಾರಸುಗಳಿಗಾಗಿ, ಪ್ರಯೋಗಾಲಯ ಮಣ್ಣಿನ ಪರೀಕ್ಷೆಯನ್ನು ಪಡೆಯಿರಿ.",
    ml: "ഗ്രാമതല സമാഹരിച്ച സർവേ ഡാറ്റ. വ്യക്തിഗത ഫാം മണ്ണ് വ്യത്യാസപ്പെടാം. ഈ രേഖകൾ 2024-25 ലെ സോയിൽ ഹെൽത്ത് കാർഡ് കാമ്പെയ്‌നിൽ നിന്നുള്ളതാണ്. കൃത്യമായ ശുപാർശകൾക്ക്, ലബോറട്ടറി മണ്ണ് പരിശോധന നടത്തുക.",
    pa: "ਪਿੰਡ ਪੱਧਰੀ ਸਮੁੱਚਾ ਸਰਵੇਖਣ ਡਾਟਾ। ਵਿਅਕਤੀਗਤ ਖੇਤ ਦੀ ਮਿੱਟੀ ਵੱਖਰੀ ਹੋ ਸਕਦੀ ਹੈ। ਇਹ ਰਿਕਾਰਡ 2024–25 ਸੋਇਲ ਹੈਲਥ ਕਾਰਡ ਮੁਹਿੰਮ ਦੇ ਹਨ। ਸਹੀ ਸਿਫ਼ਾਰਸ਼ਾਂ ਲਈ, ਇੱਕ ਪ੍ਰਯੋਗਸ਼ਾਲਾ ਮਿੱਟੀ ਦੀ ਜਾਂਚ ਪ੍ਰਾਪਤ ਕਰੋ।",
    or: "ଗ୍ରାମ ସ୍ତରୀୟ ଏକତ୍ରିତ ସର୍ଭେକ୍ଷଣ ତଥ୍ୟ | ବ୍ୟକ୍ତିଗତ ଫାର୍ମ ମୃତ୍ତିକା ଭିନ୍ନ ହୋଇପାରେ | ଏହି ରେକର୍ଡଗୁଡ଼ିକ ୨୦୨୪–୨୫ ମୃତ୍ତିକା ସ୍ୱାସ୍ଥ୍ୟ କାର୍ଡ ଅଭିଯାନରୁ ଆସିଛି | ସଠିକ୍ ସୁପାରିଶ ପାଇଁ, ଏକ ପରୀକ୍ଷାଗାର ମୃତ୍ତିକା ପରୀକ୍ଷା କରାନ୍ତୁ |"
  },
  "Source: India Data Portal — Soil Health Card scheme (2024–25)": {
    en: "Source: India Data Portal — Soil Health Card scheme (2024–25)",
    hi: "स्रोत: इंडिया डेटा पोर्टल — मृदा स्वास्थ्य कार्ड योजना (2024–25)",
    ta: "மூலம்: இந்தியா டேட்டா போர்ட்டல் — மண் ஆரோக்கிய அட்டை திட்டம் (2024–25)",
    te: "మూలం: ఇండియా డేటా పోర్టల్ — సాయిల్ హెల్త్ కార్డ్ పథకం (2024–25)",
    kn: "ಮೂಲ: ಇಂಡಿಯಾ ಡೇಟಾ ಪೋರ್ಟಲ್ — ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್ ಯೋಜನೆ (2024–25)",
    ml: "ഉറവിടം: ഇന്ത്യ ഡാറ്റാ പോർട്ടൽ — സോയിൽ ഹെൽത്ത് കാർഡ് പദ്ധതി (2024–25)",
    pa: "ਸਰੋਤ: ਇੰਡੀਆ ਡੇਟਾ ਪੋਰਟਲ — ਸੋਇਲ ਹੈਲਥ ਕਾਰਡ ਸਕੀਮ (2024–25)",
    or: "ଉତ୍ସ: ଇଣ୍ଡିଆ ଡାଟା ପୋର୍ଟାଲ୍ — ମୃତ୍ତିକା ସ୍ୱାସ୍ଥ୍ୟ କାର୍ଡ ଯୋଜନା (୨୦୨୪–୨୫)"
  },
  "yield_t_ha": {
    en: "Crop yield (tonnes/hectare)",
    hi: "फसल उपज (टन/हेक्टेयर)",
    ta: "பயிர் விளைச்சல் (டன்/ஹெக்டேர்)",
    te: "పంట దిగుబడి (టన్నులు/హెక్టారు)",
    kn: "ಬೆಳೆ ಇಳುವರಿ (ಟನ್/ಹೆಕ್ಟೇರ್)",
    ml: "വിളവ് (ടൺ/ഹെക്ടർ)",
    pa: "ਫਸਲ ਦਾ ਝਾੜ (ਟਨ/ਹੈਕਟੇਅਰ)",
    or: "ଫସଲ ଅମଳ (ଟନ୍/ହେକ୍ଟର)"
  }
};

// 1. Inject into src/i18n/locales/{lang}/translation.json
const languages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'pa', 'or'];

languages.forEach(lang => {
  const filePath = path.join('src/i18n/locales', lang, 'translation.json');
  const dict = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let addedCount = 0;

  for (const [enKey, transMap] of Object.entries(DATASET_TRANSLATIONS)) {
    const targetVal = transMap[lang] || enKey;
    if (dict[enKey] !== targetVal) {
      dict[enKey] = targetVal;
      addedCount++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(dict, null, 2), 'utf8');
  console.log(`[PASS] Updated '${lang}' translation.json (+${addedCount} keys, total: ${Object.keys(dict).length})`);
});

// 2. Also register all reverse mappings in src/i18n/reverseDict.js
// so that any text in Tamil, Hindi, Telugu, etc. can be resolved back to its canonical English key!
const revPath = path.join('src/i18n/reverseDict.js');
let revContent = fs.readFileSync(revPath, 'utf8');

// Build new reverse mappings object
const newReverse = {};
for (const [enKey, transMap] of Object.entries(DATASET_TRANSLATIONS)) {
  for (const [lang, val] of Object.entries(transMap)) {
    if (lang !== 'en' && val && val !== enKey) {
      newReverse[val.toLowerCase().trim()] = enKey;
      newReverse[val.trim()] = enKey;
    }
  }
}

// Inject into reverseDict.js right before the closing "};"
const entriesText = Object.entries(newReverse)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join('\n');

if (revContent.includes('export const REVERSE_DICT = {')) {
  revContent = revContent.replace(
    'export const REVERSE_DICT = {',
    `export const REVERSE_DICT = {\n${entriesText}`
  );
  fs.writeFileSync(revPath, revContent, 'utf8');
  console.log(`[PASS] Injected ${Object.keys(newReverse).length} reverse lookups into src/i18n/reverseDict.js`);
}

// 3. Purge poisoned English values from voice_data/dynamic_translations_cache.json
const cachePath = 'voice_data/dynamic_translations_cache.json';
if (fs.existsSync(cachePath)) {
  try {
    const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    let cleaned = 0;
    languages.forEach(l => {
      if (l !== 'en' && cache[l]) {
        for (const [k, v] of Object.entries(cache[l])) {
          // If the cached value is identical to English key or matches English letters
          if (v === k && /[a-zA-Z]{4,}/.test(v)) {
            delete cache[l][k];
            cleaned++;
          }
        }
        // Also inject accurate translations
        for (const [enKey, transMap] of Object.entries(DATASET_TRANSLATIONS)) {
          if (transMap[l]) {
            cache[l][enKey] = transMap[l];
            cache[l][enKey.toLowerCase()] = transMap[l];
          }
        }
      }
    });
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
    console.log(`[PASS] Cleaned ${cleaned} poisoned entries and injected official translations in voice_data/dynamic_translations_cache.json`);
  } catch(e) {
    console.error('Error updating dynamic cache:', e);
  }
}

