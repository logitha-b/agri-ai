# -*- coding: utf-8 -*-
"""
backend/i18n.py - Unified multilingual localization engine for Agri-Economic Intelligence.
Supports 8 languages: en, hi, ta, te, ml, kn, pa, or.
Preserves numbers, scientific calculations, dates, and units while localizing user-facing text.
"""
from __future__ import annotations
import re
from typing import Any

LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
    "kn": "Kannada",
    "pa": "Punjabi",
    "or": "Odia",
}

# Translation dictionary for backend strings
TRANSLATIONS: dict[str, dict[str, str]] = {
    "ta": {
        "Latest least-cloudy scene": "சமீபத்திய குறைந்த மேகமூட்டம் கொண்ட செயற்கைக்கோள் காட்சி",
        "Observation window": "கண்காணிப்பு காலம்",
        "Spatial resolution": "இடவியல் தெளிவுத்திறன்",
        "Collection": "தரவு சேகரிப்பு",
        "Source": "தரவு மூலம்",
        "Copernicus Sentinel-2 L2A — ESA / Copernicus Programme": "கோப்பர்நிக்கஸ் சென்டினல்-2 L2A — ESA / கோப்பர்நிக்கஸ் திட்டம்",
        "Contains modified Copernicus Sentinel data processed by ESA.": "ESA ஆல் செயலாக்கப்பட்ட மாற்றியமைக்கப்பட்ட கோப்பர்நிக்கஸ் சென்டினல் தரவைக் கொண்டுள்ளது.",
        "Sentinel-2 scene loading or cloud-covered. Please refresh or try again shortly.": "சென்டினல்-2 காட்சி ஏற்றப்படுகிறது அல்லது மேகமூட்டமாக உள்ளது. தயவுசெய்து சிறிது நேரம் கழித்து புதுப்பிக்கவும்.",
        "Sentinel-1 SAR data processing. Please refresh or try again shortly.": "சென்டினல்-1 SAR ரேடார் தரவு செயலாக்கப்படுகிறது. தயவுசெய்து சிறிது நேரம் கழித்து புதுப்பிக்கவும்.",
        "NDVI vegetative map generating. Please refresh or try again shortly.": "NDVI பயிர் பசுமை வரைபடம் உருவாக்கப்படுகிறது. தயவுசெய்து சிறிது நேரம் கழித்து புதுப்பிக்கவும்.",
        "Generating crop health report…": "பயிர் ஆரோக்கிய அறிக்கை உருவாக்கப்படுகிறது…",
        "Fetching weather, soil, and agronomic calendar data for your field.": "உங்கள் நிலத்திற்கான வானிலை, மண் மற்றும் வேளாண் நாட்காட்டித் தரவுகள் பெறப்படுகின்றன.",
        "Crop calendar not available for this crop type.": "இந்த பயிர் வகைக்கு பயிர் காலண்டர் கிடைக்கவில்லை.",
        "Invalid sowing date format.": "தவறான விதைப்பு தேதி வடிவம்.",
        "Sowing date is in the future.": "விதைப்பு தேதி எதிர்காலத்தில் உள்ளது.",
        "Beyond expected harvest": "எதிர்பார்க்கப்படும் அறுவடை காலத்தை தாண்டியது",
        "Germination & seedling": "முளைப்பு மற்றும் நாற்றுப் பருவம்",
        "Tillering": "தூர்கட்டும் பருவம்",
        "Panicle initiation": "கதிர் உருவாகும் பருவம்",
        "Booting & heading": "கருக்கட்டும் பருவம்",
        "Flowering": "பூக்கும் பருவம்",
        "Grain filling": "பால் பிடிக்கும் மற்றும் மணி கட்டும் பருவம்",
        "Ripening & harvest": "முதிர்ச்சி மற்றும் அறுவடைப் பருவம்",
        "Germination": "முளைப்புப் பருவம்",
        "Vegetative growth": "வளர்ச்சிப் பருவம்",
        "Peg & pod initiation": "விருது இறங்குதல் மற்றும் காய் பிடிக்கும் பருவம்",
        "Pod filling": "காய் முதிரும் பருவம்",
        "Maturation & harvest": "முதிர்ச்சி மற்றும் அறுவடை",
        "Germination & emergence": "முளைப்பு மற்றும் வெளிவருதல்",
        "Vegetative (V1–V8)": "இலை மற்றும் தண்டு வளர்ச்சி (V1–V8)",
        "Tasseling (VT)": "ஆண் பூ வெளிவருதல் (VT)",
        "Silking (R1)": "பெண் பூ மற்றும் தழும்பல் பருவம் (R1)",
        "Dough & dent": "மணி இறுகும் பருவம்",
        "Black layer & maturity": "கருப்பு அடுக்கு மற்றும் முழு முதிர்ச்சி",
        "Low": "குறைவு",
        "Medium": "நடுத்தரமானது",
        "High": "அதிகம்",
        "Deficient": "பற்றாக்குறை",
        "Sufficient": "போதுமானது",
        "Acidic": "அமிலத் தன்மை",
        "Neutral": "நடுநிலையானது",
        "Alkaline": "காரத் தன்மை",
        "Saline": "உப்புத் தன்மை",
        "Non Saline": "உப்புத்தன்மையற்றது",
        "This report is generated from agronomic calendars and available environmental data. It is not a substitute for field inspection or expert agricultural advice. Confirm all recommendations with your local Krishi Vigyan Kendra or extension officer.": "இந்த அறிக்கை வேளாண் நாட்காட்டிகள் மற்றும் சுற்றுச்சூழல் தரவுகளிலிருந்து உருவாக்கப்பட்டது. இது நேரடி கள ஆய்வு அல்லது நிபுணர் ஆலோசனைக்கு மாற்றாகாது. உங்கள் உள்ளூர் வேளாண்மை அறிவியல் மையம் (KVK) அல்லது வேளாண் அலுவலருடன் கலந்தாலோசிக்கவும்.",
    },
    "hi": {
        "Latest least-cloudy scene": "नवीनतम न्यूनतम बादलों वाला दृश्य",
        "Observation window": "निगरानी अवधि",
        "Spatial resolution": "स्थानिक रिज़ॉल्यूशन",
        "Collection": "डेटा संग्रह",
        "Source": "स्रोत",
        "Copernicus Sentinel-2 L2A — ESA / Copernicus Programme": "कोपरनिकस सेंटिनल-2 L2A — ईएसए / कोपरनिकस कार्यक्रम",
        "Contains modified Copernicus Sentinel data processed by ESA.": "ईएसए द्वारा संसाधित संशोधित कोपरनिकस सेंटिनल डेटा शामिल है।",
        "Sentinel-2 scene loading or cloud-covered. Please refresh or try again shortly.": "सेंटिनल-2 दृश्य लोड हो रहा है या बादलों से ढका है। कृपया कुछ समय बाद पुनः प्रयास करें।",
        "Sentinel-1 SAR data processing. Please refresh or try again shortly.": "सेंटिनल-1 SAR डेटा संसाधित हो रहा है। कृपया कुछ समय बाद पुनः प्रयास करें।",
        "NDVI vegetative map generating. Please refresh or try again shortly.": "एनडीवीआई वनस्पति मानचित्र तैयार हो रहा है। कृपया पुनः प्रयास करें।",
        "Generating crop health report…": "फसल स्वास्थ्य रिपोर्ट तैयार की जा रही है…",
        "Fetching weather, soil, and agronomic calendar data for your field.": "आपके खेत के लिए मौसम, मिट्टी और कृषि कैलेंडर डेटा प्राप्त किया जा रहा है।",
        "Low": "कम",
        "Medium": "मध्यम",
        "High": "अधिक",
        "Deficient": "कमी",
        "Sufficient": "पर्याप्त",
        "Acidic": "अम्लीय",
        "Neutral": "तटस्थ",
        "Alkaline": "क्षारीय",
    },
    "te": {
        "Latest least-cloudy scene": "తాజా తక్కువ మేఘావృత దృశ్యం",
        "Observation window": "పరిశీలన కాలం",
        "Spatial resolution": "ప్రాదేశిక రిజల్యూషన్",
        "Collection": "డేటా సేకరణ",
        "Source": "మూలం",
        "Generating crop health report…": "పంట ఆరోగ్య నివేదిక రూపొందించబడుతోంది…",
        "Fetching weather, soil, and agronomic calendar data for your field.": "మీ పొలం కోసం వాతావరణం, నేల మరియు వ్యవసాయ క్యాలెండర్ డేటా పొందబడుతోంది.",
    },
    "ml": {
        "Latest least-cloudy scene": "ഏറ്റവും പുതിയ കുറഞ്ഞ മേഘാവൃതമായ ദൃശ്യം",
        "Observation window": "നിരീക്ഷണ കാലയളവ്",
        "Spatial resolution": "സ്പേഷ്യൽ റെസലൂഷൻ",
        "Collection": "ഡാറ്റ ശേഖരണം",
        "Source": "ഉറവിടം",
        "Generating crop health report…": "വിള ആരോഗ്യ റിപ്പോർട്ട് തയ്യാറാക്കുന്നു…",
        "Fetching weather, soil, and agronomic calendar data for your field.": "നിങ്ങളുടെ പാടത്തിനായുള്ള കാലാവസ്ഥ, മണ്ണ്, കാർഷിക കലണ്ടർ വിവരങ്ങൾ ശേഖരിക്കുന്നു.",
    },
    "kn": {
        "Latest least-cloudy scene": "ಇತ್ತೀಚಿನ ಕನಿಷ್ಠ ಮೋಡ ಕವಿದ ದೃಶ್ಯ",
        "Observation window": "ವೀಕ್ಷಣಾ ಅವಧಿ",
        "Spatial resolution": "ಪ್ರಾದೇಶಿಕ ರೆಸಲ್ಯೂಶನ್",
        "Collection": "ಡೇಟಾ ಸಂಗ್ರಹ",
        "Source": "ಮೂಲ",
        "Generating crop health report…": "ಬೆಳೆ ಆರೋಗ್ಯ ವರದಿ ರಚಿಸಲಾಗುತ್ತಿದೆ…",
        "Fetching weather, soil, and agronomic calendar data for your field.": "ನಿಮ್ಮ ಜಮೀನಿನ ಹವಾಮಾನ, ಮಣ್ಣು ಮತ್ತು ಕೃಷಿ ಕ್ಯಾಲೆಂಡರ್ ಡೇಟಾ ಪಡೆಯಲಾಗುತ್ತಿದೆ.",
    },
    "pa": {
        "Latest least-cloudy scene": "ਤਾਜ਼ਾ ਘੱਟ ਬੱਦਲਾਂ ਵਾਲਾ ਦ੍ਰਿਸ਼",
        "Observation window": "ਨਿਗਰਾਨੀ ਦੀ ਮਿਆਦ",
        "Spatial resolution": "ਸਥਾਨਿਕ ਰੈਜ਼ੋਲਿਊਸ਼ਨ",
        "Collection": "ਡਾਟਾ ਸੰਗ੍ਰਹਿ",
        "Source": "ਸਰੋਤ",
        "Generating crop health report…": "ਫ਼ਸਲ ਸਿਹਤ ਰਿਪੋਰਟ ਤਿਆਰ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ…",
        "Fetching weather, soil, and agronomic calendar data for your field.": "ਤੁਹਾਡੇ ਖੇਤ ਲਈ ਮੌਸਮ, ਮਿੱਟੀ ਅਤੇ ਖੇਤੀਬਾੜੀ ਕੈਲੰਡਰ ਡੇਟਾ ਪ੍ਰਾਪਤ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ।",
    },
    "or": {
        "Latest least-cloudy scene": "ସର୍ବଶେଷ କମ୍ ମେଘୁଆ ଦୃଶ୍ୟ",
        "Observation window": "ପର୍ଯ୍ୟବେକ୍ଷଣ ସମୟ",
        "Spatial resolution": "ସ୍ଥାନିକ ରିଜୋଲ୍ୟୁସନ୍",
        "Collection": "ତଥ୍ୟ ସଂଗ୍ରହ",
        "Source": "ଉତ୍ସ",
        "Generating crop health report…": "ଫସଲ ସ୍ୱାସ୍ଥ୍ୟ ରିପୋର୍ଟ ପ୍ରସ୍ତୁତ କରାଯାଉଛି…",
        "Fetching weather, soil, and agronomic calendar data for your field.": "ଆପଣଙ୍କ ଜମି ପାଇଁ ପାଣିପାଗ, ମାଟି ଏବଂ କୃଷି କ୍ୟାଲେଣ୍ଡର ତଥ୍ୟ ସଂଗ୍ରହ କରାଯାଉଛି।",
    }
}

_STATIC_CACHE: dict[str, dict[str, str]] | None = None

def _get_static_translations() -> dict[str, dict[str, str]]:
    global _STATIC_CACHE
    if _STATIC_CACHE is None:
        try:
            from pathlib import Path
            import json
            sp = Path(__file__).resolve().parent / "data" / "translations_static.json"
            if sp.is_file():
                _STATIC_CACHE = json.loads(sp.read_text(encoding="utf-8"))
            else:
                _STATIC_CACHE = {}
        except Exception:
            _STATIC_CACHE = {}
    return _STATIC_CACHE

def translate_phrase(phrase: str, lang: str = "en") -> str:
    """Translates a phrase if available, otherwise returns the original phrase."""
    if not phrase or lang == "en":
        return phrase
    p_dict = TRANSLATIONS.get(lang, {})
    if phrase in p_dict:
        return p_dict[phrase]
    p_lower = phrase.strip().lower()
    for k, v in p_dict.items():
        if k.lower() == p_lower:
            return v
    # Check static cache (1591 keys across all 8 languages)
    static_dict = _get_static_translations().get(lang, {})
    if phrase in static_dict:
        return static_dict[phrase]
    if phrase.strip() in static_dict:
        return static_dict[phrase.strip()]
    for k, v in static_dict.items():
        if k.lower() == p_lower:
            return v
    return phrase

def localize_satellite_note(days_back: int, date_to: str, lang: str = "en") -> str:
    """Builds a localized note for satellite observation."""
    if lang == "ta":
        return f"{date_to} உடன் முடிவடையும் {days_back} நாள் காலப்பகுதியில் சமீபத்திய குறைந்த மேகமூட்டம் கொண்ட காட்சி. செயற்கைக்கோள் படத்தைப் பெறுவதில் மேகங்கள் ஓரளவு மறைக்கக்கூடும்."
    elif lang == "hi":
        return f"{date_to} को समाप्त होने वाले {days_back} दिनों के अंतराल में नवीनतम न्यूनतम बादलों वाला दृश्य। उपग्रह छवि में बादल आंशिक रूप से दृश्य को बाधित कर सकते हैं।"
    elif lang == "te":
        return f"{date_to} తో ముగిసే {days_back} రోజుల వ్యవధిలో తాజా తక్కువ మేఘావృత దృశ్యం. క్లౌడ్ కవరేజ్ చిత్రాన్ని పాక్షికంగా అస్పష్టం చేయవచ్చు."
    elif lang == "ml":
        return f"{date_to} ൽ അവസാനിക്കുന്ന {days_back} ദിവസത്തിനുള്ളിലെ ഏറ്റവും പുതിയ കുറഞ്ഞ മേഘാവൃതമായ ദൃശ്യം."
    elif lang == "kn":
        return f"{date_to} ರಂದು ಕೊನೆಗೊಳ್ಳುವ {days_back} ದಿನಗಳ ಅವಧಿಯಲ್ಲಿ ಇತ್ತೀචಿನ ಕನಿಷ್ಠ ಮೋಡ ಕವಿದ ದೃಶ್ಯ."
    elif lang == "pa":
        return f"{date_to} ਨੂੰ ਖਤਮ ਹੋਣ ਵਾਲੀ {days_back} ਦਿਨਾਂ ਦੀ ਮਿਆਦ ਵਿੱਚ ਤਾਜ਼ਾ ਘੱਟ ਬੱਦਲਾਂ ਵਾਲਾ ਦ੍ਰਿਸ਼।"
    elif lang == "or":
        return f"{date_to} ରେ ଶେଷ ହେଉଥିବା {days_back} ଦିନ ମଧ୍ୟରେ ସର୍ବଶେଷ କମ୍ ମେଘୁଆ ଦୃଶ୍ୟ।"
    return f"Latest least-cloudy scene in the {days_back}-day window ending {date_to}. Acquisition date is that of the selected mosaic scene. Cloud coverage may partially obscure the image."

def build_gemini_language_instruction(language_code: str) -> str:
    """Builds the strict multilingual system prompt instruction for Gemini."""
    lang_name = LANGUAGES.get(language_code, "English")
    return f"""The user's currently selected website language is {lang_name}.
The language code is {language_code}.

Generate every user-facing response entirely in {lang_name}.

This includes:
- Explanations.
- Analysis summaries.
- Agricultural recommendations.
- Financial recommendations.
- Risk descriptions.
- Warnings.
- Follow-up questions.
- Report descriptions.
- UI card headings.
- UI card descriptions.
- Status messages.
- Error messages.

Use natural, grammatically correct language suitable for the user's region.

Do not respond in English merely because the underlying dataset, API response, or technical source is in English.

Preserve numerical values, scientific measurements, dates, units, and the original meaning of technical information.

Where an English technical term is commonly used, include it in brackets alongside its translation when helpful.

Never silently change the user's selected language."""

def validate_language_response(text: str, language_code: str) -> bool:
    """Verifies that generated text uses the expected regional script."""
    if language_code == "en" or not text:
        return True
    ranges = {
        "hi": (0x0900, 0x097F), # Devanagari
        "ta": (0x0B80, 0x0BFF), # Tamil
        "te": (0x0C00, 0x0C7F), # Telugu
        "kn": (0x0C80, 0x0CFF), # Kannada
        "ml": (0x0D00, 0x0D7F), # Malayalam
        "pa": (0x0A00, 0x0A7F), # Gurmukhi
        "or": (0x0B00, 0x0B7F), # Odia
    }
    r = ranges.get(language_code)
    if not r:
        return True
    start, end = r
    script_chars = sum(1 for ch in text if start <= ord(ch) <= end)
    # At least 5 characters from the script should be present
    return script_chars >= 5

