# -*- coding: utf-8 -*-
from pathlib import Path

pages_path = Path("src/pages.jsx")
content = pages_path.read_text(encoding="utf-8")

# 1. Add DIALOGUE_SIMULATIONS before LandingPage
sim_code = '''const DIALOGUE_SIMULATIONS = {
  en: {
    farmerLabel: "Farmer (Thiruvallur · Voice Query in English)",
    farmerText: "\\"I see brown spots on the leaves of my 2.5-acre paddy crop. Which government scheme benefits can I avail?\\"",
    aiLabel: "Agri AI Assistant · Spoken Response (en-IN)",
    aiText: "\\"Your crop shows symptoms of Paddy Blast / Blight. Apply Tricyclazole 75% WP (0.6 g/L) immediately. Additionally, for your 2.5-acre holding, financial support up to ₹55,000 is available under PM-KISAN, PMFBY crop insurance, and the SMAM farm mechanization scheme.\\"",
  },
  hi: {
    farmerLabel: "किसान (तिरुवल्लूर · हिन्दी में वॉयस क्वेरी)",
    farmerText: "\\"मेरी 2.5 एकड़ धान की फसल में पत्तों पर भूरे धब्बे दिख रहे हैं और मुझे कौन सी सरकारी योजना का लाभ मिल सकता है?\\"",
    aiLabel: "अग्रि एआई सहायक · वाक् प्रतिक्रिया (hi-IN)",
    aiText: "\\"आपकी फसल में धान का झुलसा रोग (Blast / Blight) के लक्षण प्रतीत होते हैं। तुरंत ट्राइसाइक्लाज़ोल 75% WP (0.6 ग्राम/लीटर) का छिड़काव करें। साथ ही, आपकी 2.5 एकड़ जोत के लिए PM-KISAN, PMFBY फसल बीमा और SMAM कृषि यंत्रीकरण योजना के तहत ₹55,000 तक की वित्तीय सहायता उपलब्ध है।\\"",
  },
  ta: {
    farmerLabel: "விவசாயி (திருவள்ளூர் · தமிழில் குரல் கேள்வி)",
    farmerText: "\\"எனது 2.5 ஏக்கர் நெல் பயிரில் இலைகளில் பழுப்பு நிற புள்ளிகள் தெரிகின்றன, எனக்கு எந்த அரசு திட்டத்தின் கீழ் உதவி கிடைக்கும்?\\"",
    aiLabel: "அக்ரி ஏஐ உதவியாளர் · குரல் பதில் (ta-IN)",
    aiText: "\\"உங்கள் பயிரில் நெல் குலைநோய் (Blast / Blight) அறிகுறிகள் தென்படுகின்றன. உடனடியாக டிரைசைக்ளசோல் 75% WP (0.6 கிராம்/லிட்டர்) தெளிக்கவும். மேலும், உங்கள் 2.5 ஏக்கர் நிலத்திற்கு PM-KISAN, PMFBY பயிர் காப்பீடு மற்றும் SMAM திட்டத்தின் கீழ் ₹55,000 வரை நிதி உதவி பெறலாம்.\\"",
  },
  te: {
    farmerLabel: "రైతు (తిరువళ్లూరు · తెలుగులో వాయిస్ ప్రశ్న)",
    farmerText: "\\"నా 2.5 ఎకరాల వరి పంటలో ఆకులపై గోధుమ రంగు మచ్చలు కనిపిస్తున్నాయి, నాకు ఏ ప్రభుత్వ పథకం లబ్ధి చేకూరుతుంది?\\"",
    aiLabel: "అగ్రి AI అసిస్టెంట్ · వాయిస్ సమాధానం (te-IN)",
    aiText: "\\"మీ పంటలో వరి అగ్గితెగులు (Blast / Blight) లక్షణాలు కనిపిస్తున్నాయి. వెంటనే ట్రైసైక్లాజోల్ 75% WP (0.6 గ్రా/లీటరు) పిచికారీ చేయండి. అలాగే, మీ 2.5 ఎకరాల సాగుకు PM-KISAN, PMFBY పంట బీమా మరియు SMAM పథకం కింద ₹55,000 వరకు ఆర్థిక సహాయం అందుబాటులో ఉంది.\\"",
  },
  kn: {
    farmerLabel: "ರೈತ (ತಿರುವಳ್ಳೂರು · ಕನ್ನಡದಲ್ಲಿ ಧ್ವನಿ ಪ್ರಶ್ನೆ)",
    farmerText: "\\"ನನ್ನ 2.5 ಎಕರೆ ಭತ್ತದ ಬೆಳೆಯಲ್ಲಿ ಎಲೆಗಳ ಮೇಲೆ ಕಂದು ಕಲೆಗಳು ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತಿವೆ ಮತ್ತು ನನಗೆ ಯಾವ ಸರ್ಕಾರಿ ಯೋಜನೆಯ ಲಾಭ ಸಿಗಬಹುದು?\\"",
    aiLabel: "ಅಗ್ರಿ AI ಸಹಾಯಕ · ಧ್ವನಿ ಪ್ರತಿಕ್ರಿಯೆ (kn-IN)",
    aiText: "\\"ನಿಮ್ಮ ಬೆಳೆಯಲ್ಲಿ ಭತ್ತದ ಬೆಂಕಿ ರೋಗ (Blast / Blight) ಲಕ್ಷಣಗಳು ಕಂಡುಬರುತ್ತಿವೆ. ತಕ್ಷಣವೇ ಟ್ರೈಸೈಕ್ಲೋಜೋಲ್ 75% WP (0.6 ಗ್ರಾಂ/ಲೀಟರ್) ಸಿಂಪಡಿಸಿ. ಜೊತೆಗೆ, ನಿಮ್ಮ 2.5 ಎಕರೆ ಜಮೀನಿಗೆ PM-KISAN, PMFBY ಬೆಳೆ ವಿಮೆ ಮತ್ತು SMAM ಯೋಜನೆಯಡಿ ₹55,000 ವರೆಗೆ ಆರ್ಥಿಕ ನೆರವು ಲಭ್ಯವಿದೆ.\\"",
  },
  ml: {
    farmerLabel: "കർഷകൻ (തിരുവള്ളൂർ · മലയാളത്തിൽ വോയ്‌സ് ചോദ്യം)",
    farmerText: "\\"എന്റെ 2.5 ഏക്കർ നെൽകൃഷിയിൽ ഇലകളിൽ തവിട്ടുനിറത്തിലുള്ള പാടുകൾ കാണുന്നു, എനിക്ക് ഏത് സർക്കാർ പദ്ധതിയുടെ ആനുകൂല്യം ലഭിക്കും?\\"",
    aiLabel: "അഗ്രി AI അസിസ്റ്റന്റ് · ശബ്ദ പ്രതികരണം (ml-IN)",
    aiText: "\\"നിങ്ങളുടെ വിളയിൽ നെല്ലിന്റെ ബ്ലാസ്റ്റ് രോഗ (Blast / Blight) ലക്ഷണങ്ങൾ കാണപ്പെടുന്നു. ഉടൻ തന്നെ ട്രൈസൈക്ലസോൾ 75% WP (0.6 ഗ്രാം/ലിറ്റർ) തളിക്കുക. കൂടാതെ, നിങ്ങളുടെ 2.5 ഏക്കർ കൃഷിക്ക് PM-KISAN, PMFBY വിള ഇൻഷുറൻസ്, SMAM പദ്ധതി വഴി ₹55,000 വരെ സാമ്പത്തിക സഹായം ലഭ്യമാണ്.\\"",
  },
  pa: {
    farmerLabel: "ਕਿਸਾਨ (ਤਿਰੂਵੱਲੁਰ · ਪੰਜਾਬੀ ਵਿੱਚ ਆਵਾਜ਼ ਸਵਾਲ)",
    farmerText: "\\"ਮੇਰੀ 2.5 ਏਕੜ ਝੋਨੇ ਦੀ ਫਸਲ ਵਿੱਚ ਪੱਤਿਆਂ 'ਤੇ ਭੂਰੇ ਧੱਬੇ ਦਿਖ ਰਹੇ ਹਨ ਅਤੇ ਮੈਨੂੰ ਕਿਹੜੀ ਸਰਕਾਰੀ ਸਕੀਮ ਦਾ ਲਾਭ ਮਿਲ ਸਕਦਾ ਹੈ?\\"",
    aiLabel: "ਐਗਰੀ AI ਸਹਾਇਕ · ਆਵਾਜ਼ ਜਵਾਬ (pa-IN)",
    aiText: "\\"ਤੁਹਾਡੀ ਫਸਲ ਵਿੱਚ ਝੋਨੇ ਦੇ ਝੁਲਸ ਰੋਗ (Blast / Blight) ਦੇ ਲੱਛਣ ਪ੍ਰਤੀਤ ਹੁੰਦੇ ਹਨ। ਤੁਰੰਤ ਟ੍ਰਾਈਸਾਈਕਲਾਜ਼ੋਲ 75% WP (0.6 ਗ੍ਰਾਮ/ਲੀਟਰ) ਦਾ ਛਿੜਕਾਅ ਕਰੋ। ਨਾਲ ਹੀ, ਤੁਹਾਡੀ 2.5 ਏਕੜ ਜ਼ਮੀਨ ਲਈ PM-KISAN, PMFBY ਫਸਲ ਬੀਮਾ ਅਤੇ SMAM ਸਕੀਮ ਅਧੀਨ ₹55,000 ਤੱਕ ਦੀ ਵਿੱਤੀ ਸਹਾਇਤਾ ਉਪਲਬਧ ਹੈ।\\"",
  },
  or: {
    farmerLabel: "କୃଷକ (ତିରୁଭାଲୁର · ଓଡ଼ିଆରେ ଭଏସ୍ ପ୍ରଶ୍ନ)",
    farmerText: "\\"ମୋର 2.5 ଏକର ଧାନ ଫସଲରେ ପତ୍ରରେ ବାଦାମୀ ଦାଗ ଦେଖାଯାଉଛି ଏବଂ ମୁଁ କେଉଁ ସରକାରୀ ଯୋଜନାର ଲାଭ ପାଇପାରିବି?\\"",
    aiLabel: "ଅଗ୍ରି AI ସହାୟକ · କଣ୍ଠସ୍ୱର ପ୍ରତିକ୍ରିୟା (or-IN)",
    aiText: "\\"ଆପଣଙ୍କ ଫସଲରେ ଧାନର ବ୍ଲାଷ୍ଟ ରୋଗ (Blast / Blight) ର ଲକ୍ଷଣ ଦେଖାଯାଉଛି। ତୁରନ୍ତ ଟ୍ରାଇସାଇକ୍ଲାଜୋଲ ୭୫% WP (୦.୬ ଗ୍ରାମ/ଲିଟର) ସ୍ପ୍ରେ କରନ୍ତୁ। ଏଥିସହ, ଆପଣଙ୍କ ୨.୫ ଏକର ଚାଷ ପାଇଁ PM-KISAN, PMFBY ଫସଲ ବୀମା ଏବଂ SMAM ଯୋଜନା ଅଧୀନରେ ₹୫୫,୦୦୦ ପର୍ଯ୍ୟନ୍ତ ଆର୍ଥିକ ସହାୟତା ଉପଲବ୍ଧ ଅଟେ।\\"",
  },
}
'''

if "const DIALOGUE_SIMULATIONS =" not in content:
    content = content.replace("export function LandingPage() {", sim_code + "\nexport function LandingPage() {")

# 2. Update LandingPage dialogue render
old_dialogue = '''          <div className="ai-bubble-user">
            <small>Farmer (Thiruvallur · Voice Query in Hindi)</small>
            <p>"मेरी 2.5 एकड़ धान की फसल में पत्तों पर भूरे धब्बे दिख रहे हैं और मुझे कौन सी सरकारी योजना का लाभ मिल सकता है?"</p>
          </div>

          <div className="ai-bubble-assistant">
            <small><Sparkles size={14}/> Agri AI Assistant · Spoken Response (hi-IN) <Volume2 size={14} color="#86efac"/></small>
            <p>
              "आपकी फसल में धान का झुलसा रोग (Blast / Blight) के लक्षण प्रतीत होते हैं। तुरंत ट्राइसाइक्लाज़ोल 75% WP (0.6 ग्राम/लीटर) का छिड़काव करें। साथ ही, आपकी 2.5 एकड़ जोत के लिए PM-KISAN, PMFBY फसल बीमा और SMAM कृषि यंत्रीकरण योजना के तहत ₹55,000 तक की वित्तीय सहायता उपलब्ध है।"
            </p>
            <div className="ai-bubble-chips">
              <span>✓ Engine 4: Disease Pathology</span>
              <span>✓ Engine 1: Schemes Analysis</span>
              <span>✓ Engine 7: Mandi Economics</span>
            </div>
          </div>'''

new_dialogue = '''          {(() => {
            const sim = DIALOGUE_SIMULATIONS[language] || DIALOGUE_SIMULATIONS.en
            return <>
              <div className="ai-bubble-user">
                <small>{sim.farmerLabel}</small>
                <p>{sim.farmerText}</p>
              </div>

              <div className="ai-bubble-assistant">
                <small><Sparkles size={14}/> {sim.aiLabel} <Volume2 size={14} color="#86efac"/></small>
                <p>{sim.aiText}</p>
                <div className="ai-bubble-chips">
                  <span>✓ {t('Engine 4: Disease Pathology', 'Engine 4: Disease Pathology')}</span>
                  <span>✓ {t('Engine 1: Schemes Analysis', 'Engine 1: Schemes Analysis')}</span>
                  <span>✓ {t('Engine 7: Mandi Economics', 'Engine 7: Mandi Economics')}</span>
                </div>
              </div>
            </>
          })()}'''

if old_dialogue in content:
    content = content.replace(old_dialogue, new_dialogue)
    print("Replaced old_dialogue successfully!")
else:
    print("Warning: old_dialogue not matched directly, checking whitespace.")

# 3. Add notranslate to ai-lang-pill
content = content.replace('className="ai-lang-pill">हिन्दी (Hindi)</span>', 'className="ai-lang-pill notranslate" translate="no">हिन्दी (Hindi)</span>')
content = content.replace('className="ai-lang-pill">தமிழ் (Tamil)</span>', 'className="ai-lang-pill notranslate" translate="no">தமிழ் (Tamil)</span>')
content = content.replace('className="ai-lang-pill">తెలుగు (Telugu)</span>', 'className="ai-lang-pill notranslate" translate="no">తెలుగు (Telugu)</span>')
content = content.replace('className="ai-lang-pill">ಕನ್ನಡ (Kannada)</span>', 'className="ai-lang-pill notranslate" translate="no">ಕನ್ನಡ (Kannada)</span>')
content = content.replace('className="ai-lang-pill">മലയാളം (Malayalam)</span>', 'className="ai-lang-pill notranslate" translate="no">മലയാളം (Malayalam)</span>')
content = content.replace('className="ai-lang-pill">ਪੰਜਾਬੀ (Punjabi)</span>', 'className="ai-lang-pill notranslate" translate="no">ਪੰਜਾਬੀ (Punjabi)</span>')
content = content.replace('className="ai-lang-pill">ଓଡ଼ିଆ (Odia)</span>', 'className="ai-lang-pill notranslate" translate="no">ଓଡ଼ିଆ (Odia)</span>')

# 4. Fix line 1760 fallback
old_line1760 = "? `${t('Top recommendation:', 'शीर्ष सिफारिश:')} ${t(candidates[0].crop, candidates[0].crop)} (${t('score', 'अंक')} ${Math.round(candidates[0].final_score*100)}/100). ${candidates[0].explanation.slice(0, 200)}…`"
new_line1760 = "? `${t('Top recommendation:', 'Top recommendation:')} ${t(candidates[0].crop, candidates[0].crop)} (${t('score', 'score')} ${Math.round(candidates[0].final_score*100)}/100). ${candidates[0].explanation.slice(0, 200)}…`"
if old_line1760 in content:
    content = content.replace(old_line1760, new_line1760)
    print("Fixed line 1760 fallback successfully!")
else:
    print("Warning: old_line1760 not matched directly.")

pages_path.write_text(content, encoding="utf-8")
print("Updated src/pages.jsx successfully.")

