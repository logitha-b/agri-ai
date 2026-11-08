# -*- coding: utf-8 -*-
import re

# 1. Update backend/crop_recommendation.py
with open("backend/crop_recommendation.py", "r", encoding="utf-8") as f:
    cr_content = f.read()

old_yield_fallback = '''    else:
        if lang == "hi": parts.append(f"ऐतिहासिक उपज: इस स्थान के लिए {s} में {c} का ICRISAT डेटा उपलब्ध नहीं है। संदर्भ मूल्य प्रयुक्त।")'''

new_yield_fallback = '''    else:
        if lang == "hi": parts.append(f"ऐतिहासिक उपज: इस स्थान के लिए {s} में {c} का ICRISAT डेटा उपलब्ध नहीं है। संदर्भ मूल्य प्रयुक्त।")
        elif lang == "ta": parts.append(f"வரலாற்று மகசூல்: இந்த இடத்திற்கு {s} பருவத்தில் {c} பயிருக்கான ICRISAT தரவு கிடைக்கவில்லை. குறிப்பு மதிப்பு பயன்படுத்தப்பட்டது.")
        elif lang == "te": parts.append(f"చారిత్రక దిగుబడి: ఈ ప్రదేశానికి {s} సీజన్‌లో {c} పంట కోసం ICRISAT డేటా అందుబాటులో లేదు. సూచన విలువ ఉపయోగించబడింది.")
        elif lang == "kn": parts.append(f"ಐತಿಹಾಸಿಕ ಇಳುವರಿ: ಈ ಸ್ಥಳಕ್ಕೆ {s} ಋತುವಿನಲ್ಲಿ {c} ಬೆಳೆಗೆ ICRISAT ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ. ಉಲ್ಲೇಖ ಮೌಲ್ಯವನ್ನು ಬಳಸಲಾಗಿದೆ.")
        elif lang == "ml": parts.append(f"ചരിത്രപരമായ വിളവ്: ഈ സ്ഥലത്തിനായി {s} സീസണിൽ {c} വിളയ്ക്കുള്ള ICRISAT ഡାറ്റ ലഭ്യമല്ല. റഫറൻസ് മൂല്യം ഉപയോഗിച്ചു.")
        elif lang == "pa": parts.append(f"ਇਤਿਹਾਸਕ ਝਾੜ: ਇਸ ਸਥਾਨ ਲਈ {s} ਵਿੱਚ {c} ਲਈ ICRISAT ਡੇਟਾ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਹਵਾਲਾ ਮੁੱਲ ਵਰਤਿਆ ਗਿਆ।")
        elif lang == "or": parts.append(f"ଐତିହାସିକ ଅମଳ: ଏହି ସ୍ଥାନ ପାଇଁ {s} ଋତୁରେ {c} ପାଇଁ ICRISAT ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ। ରେଫରେନ୍ସ ମୂଲ୍ୟ ବ୍ୟବହୃତ।")'''

if old_yield_fallback in cr_content:
    cr_content = cr_content.replace(old_yield_fallback, new_yield_fallback)
    with open("backend/crop_recommendation.py", "w", encoding="utf-8") as f:
        f.write(cr_content)
    print("Successfully updated backend/crop_recommendation.py yield fallback.")
else:
    print("Warning: old_yield_fallback pattern not matched in crop_recommendation.py")
