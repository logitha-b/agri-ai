# Script to update backend/crop_recommendation.py with multilingual support
import re

with open("backend/crop_recommendation.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update def build_crop_comparison signature
old_sig = """def build_crop_comparison(
    profile: dict,
    weather: dict | None,
    imd_rainfall: dict | None,
    flood_risk: dict | None,
    soil_data: dict | None,
) -> dict[str, Any]:"""

new_sig = """def build_crop_comparison(
    profile: dict,
    weather: dict | None,
    imd_rainfall: dict | None,
    flood_risk: dict | None,
    soil_data: dict | None,
    language: str = "en",
) -> dict[str, Any]:"""

content = content.replace(old_sig, new_sig)

# 2. Update call to _build_explanation
old_call = """        explanation = _build_explanation(
            crop=crop, season=season, area_acres=area_acres,
            soil_suit=soil_suit, weather_suit=weather_suit,
            water_dim=water_dim, flood_dim=flood_dim,
            yield_data=yield_data, market_data=market_data,
            econ=econ, flood_risk=flood_risk,
            irrigation=irrigation, water_avail=water_avail,
        )"""

new_call = """        explanation = _build_explanation(
            crop=crop, season=season, area_acres=area_acres,
            soil_suit=soil_suit, weather_suit=weather_suit,
            water_dim=water_dim, flood_dim=flood_dim,
            yield_data=yield_data, market_data=market_data,
            econ=econ, flood_risk=flood_risk,
            irrigation=irrigation, water_avail=water_avail,
            language=language,
        )"""

content = content.replace(old_call, new_call)

# 3. Multilingual _build_explanation
ml_explanation = '''LANG_TERMS = {
    "hi": {
        "Paddy": "धान", "Groundnut": "मूंगफली", "Maize": "मक्का", "Tomato": "टमाटर", "Millet": "बाजरा",
        "Kharif": "खरीफ", "Rabi": "रबी", "Zaid": "जायद",
        "Clay loam": "चिकनी दोमट", "Sandy loam": "बलुई दोमट", "Clay": "चिकनी मिट्टी",
        "Loam": "दोमट", "Black": "काली मिट्टी", "Red": "लाल मिट्टी",
        "Borewell": "बोरवेल", "Canal": "नहर", "Rain-fed": "वर्षा आधारित",
        "Drip irrigation": "ड्रिप सिंचाई", "Sprinkler": "स्प्रिंकलर",
        "High": "उच्च", "Moderate": "मध्यम", "Low": "कम",
        "within": "निर्धारित बजट के भीतर", "exceeds": "निर्धारित बजट से अधिक",
        "Tamil Nadu": "तमिलनाडु", "regional": "क्षेत्रीय", "state": "राज्य", "district": "जिला",
    },
    "ta": {
        "Paddy": "நெல்", "Groundnut": "நிலக்கடலை", "Maize": "மக்காச்சோளம்", "Tomato": "தக்காளி", "Millet": "கம்பு",
        "Kharif": "காரிப்", "Rabi": "ரபி",
        "Clay loam": "களிமண் வண்டல்", "Sandy loam": "மணல் வண்டல்", "Clay": "களிமண்",
        "Borewell": "ஆழ்துளை கிணறு", "Canal": "கால்வாய்", "Rain-fed": "மானாவாரி",
        "High": "அதிக", "Moderate": "மிதமான", "Low": "குறைந்த",
        "within": "பட்ஜெட்டுக்குள்", "exceeds": "பட்ஜெட்டை விட அதிகம்",
        "Tamil Nadu": "தமிழ்நாடு", "regional": "பிராந்திய", "state": "மாநில", "district": "மாவட்டம்",
    },
    "te": {
        "Paddy": "వరి", "Groundnut": "వేరుశనగ", "Maize": "మొక్కజొన్న", "Tomato": "టమోటా", "Millet": "సజ్జలు",
        "Kharif": "ఖరీఫ్", "Rabi": "రబీ",
        "Clay loam": "క్లే లోమ్", "Sandy loam": "ఇసుక లోమ్", "Clay": "బంకమట్టి",
        "Borewell": "బోరుబావి", "Canal": "కాలువ", "Rain-fed": "వర్షాధార",
        "High": "అధిక", "Moderate": "మితమైన", "Low": "తక్కువ",
        "within": "బడ్జెట్ పరిధిలో", "exceeds": "బడ్జెట్ మించిపోయింది",
        "Tamil Nadu": "తమిళనాడు", "regional": "ప్రాంతీయ", "state": "రాష్ట్ర", "district": "జిల్లా",
    },
    "kn": {
        "Paddy": "ಭತ್ತ", "Groundnut": "ಕಡಲೆಕಾಯಿ", "Maize": "ಮೆಕ್ಕೆಜೋಳ", "Tomato": "ಟೊಮೆಟೊ", "Millet": "ಸಜ್ಜೆ",
        "Kharif": "ಖಾರೀಫ್", "Rabi": "ರಬಿ",
        "Clay loam": "ಜೇಡಿ ಮಣ್ಣು", "Sandy loam": "ಮರಳು ಮಣ್ಣು", "Clay": "ಜೇಡಿಮಣ್ಣು",
        "Borewell": "ಬೋರ್‌ವೆಲ್", "Canal": "ಕಾಲುವೆ", "Rain-fed": "ಮಳೆಯಾಶ್ರಿತ",
        "High": "ಹೆಚ್ಚು", "Moderate": "ಮಧ್ಯಮ", "Low": "ಕಡಿಮೆ",
        "within": "ಬಜೆಟ್ ಒಳಗೆ", "exceeds": "ಬಜೆಟ್ ಮೀರಿದೆ",
        "Tamil Nadu": "ತಮಿಳುನಾಡು", "regional": "ಪ್ರಾದೇಶಿಕ", "state": "ರಾಜ್ಯ", "district": "ಜಿಲ್ಲೆ",
    },
    "ml": {
        "Paddy": "നെല്ല്", "Groundnut": "നിലക്കടല", "Maize": "മക്കച്ചോളം", "Tomato": "തക്കാളി", "Millet": "കംബ്",
        "Kharif": "ഖാരിഫ്", "Rabi": "റബി",
        "Clay loam": "കളിമണ്ണ്", "Sandy loam": "മണൽമണ്ണ്", "Clay": "കളിമണ്ണ്",
        "Borewell": "കുഴൽക്കിണർ", "Canal": "കനാൽ", "Rain-fed": "മഴയെ ആശ്രയിച്ചുള്ള",
        "High": "ഉയർന്ന", "Moderate": "മിതമായ", "Low": "കുറഞ്ഞ",
        "within": "ബജറ്റിനുള്ളിൽ", "exceeds": "ബജറ്റിനേക്കാൾ കൂടുതൽ",
        "Tamil Nadu": "തമിഴ്നാട്", "regional": "പ്രാദേശിക", "state": "സംസ്ഥാന", "district": "ജില്ല",
    },
    "pa": {
        "Paddy": "ਝੋਨਾ", "Groundnut": "ਮੂੰਗਫਲੀ", "Maize": "ਮੱਕੀ", "Tomato": "ਟਮਾਟਰ", "Millet": "ਬਾਜਰਾ",
        "Kharif": "ਖਰੀਫ", "Rabi": "ਰਬੀ",
        "Clay loam": "ਚੀਕਣੀ ਮਿੱਟੀ", "Sandy loam": "ਰੇਤਲੀ ਮਿੱਟੀ", "Clay": "ਚੀਕਣੀ ਮਿੱਟੀ",
        "Borewell": "ਬੋਰਵੈੱਲ", "Canal": "ਨਹਿਰ", "Rain-fed": "ਮੀਂਹ ਆਧਾਰਿਤ",
        "High": "ਉੱਚ", "Moderate": "ਦਰਮਿਆਨਾ", "Low": "ਘੱਟ",
        "within": "ਬਜਟ ਦੇ ਅੰਦਰ", "exceeds": "ਬਜਟ ਤੋਂ ਵੱਧ",
        "Tamil Nadu": "ਤਾਮਿਲਨਾਡੂ", "regional": "ਖੇਤਰੀ", "state": "ਰਾਜ", "district": "ਜ਼ਿਲ੍ਹਾ",
    },
    "or": {
        "Paddy": "ଧାନ", "Groundnut": "ଚିନାବାଦାମ", "Maize": "ମକା", "Tomato": "ଟମାଟୋ", "Millet": "ବାଜରା",
        "Kharif": "ଖରିଫ", "Rabi": "ରବି",
        "Clay loam": "ମଟାଳ ମାଟି", "Sandy loam": "ବାଲିଆ ମାଟି", "Clay": "ମଟାଳ ମାଟି",
        "Borewell": "ବୋରୱେଲ", "Canal": "କେନାଲ", "Rain-fed": "ବର୍ଷା ନିର୍ଭରଶୀଳ",
        "High": "ଅଧିକ", "Moderate": "ମଧ୍ୟମ", "Low": "କମ୍",
        "within": "ବଜେଟ୍ ମଧ୍ୟରେ", "exceeds": "ବଜେଟ୍ ଅତିକ୍ରମ କରେ",
        "Tamil Nadu": "ତାମିଲନାଡୁ", "regional": "ଆଞ୍ଚଳିକ", "state": "ରାଜ୍ୟ", "district": "ଜିଲ୍ଲା",
    },
}

def _build_explanation(
    crop, season, area_acres, soil_suit, weather_suit, water_dim,
    flood_dim, yield_data, market_data, econ, flood_risk,
    irrigation, water_avail,
    language: str = "en",
) -> str:
    lang = (language or "en").lower().strip()
    if lang not in LANG_TERMS:
        # Standard English
        parts = []
        if soil_suit["score"] >= 0.8:
            parts.append(f"Soil: {soil_suit.get('form_soil_type', 'selected soil')} is well-suited to {crop} (ICAR).")
        elif soil_suit["score"] >= 0.6:
            parts.append(f"Soil: {soil_suit.get('form_soil_type', 'selected soil')} is moderately suitable — manageable with correct fertiliser.")
        else:
            parts.append(f"Soil: {soil_suit.get('form_soil_type', 'selected soil')} is suboptimal for {crop}. Extra amendment costs expected.")
        for flag in soil_suit.get("flags", []):
            parts.append(f"Soil concern: {flag}")

        if weather_suit["data_kind"] == "unavailable":
            parts.append("Weather: NASA POWER data unavailable — weather suitability could not be assessed.")
        elif weather_suit["score"] >= 0.8:
            parts.append(f"Weather: Temperature and rainfall conditions are broadly suitable for {crop} in {season}.")
        else:
            for flag in weather_suit.get("flags", []):
                parts.append(f"Weather: {flag}")

        if water_dim >= 0.8:
            parts.append(f"Water: {irrigation} with {water_avail.lower()} availability is adequate for {crop}.")
        elif water_dim >= 0.6:
            parts.append(f"Water: {irrigation} with {water_avail.lower()} water supply may be marginal for {crop}'s requirements.")
        else:
            parts.append(f"Water: {irrigation} and {water_avail.lower()} availability may be insufficient for {crop}. Supplemental irrigation may be needed.")

        flood_level = flood_dim.get("flood_risk_level", "INSUFFICIENT_DATA")
        if flood_level == "ELEVATED_RISK":
            sens = flood_dim.get("waterlogging_sensitivity", 0.5)
            if sens >= 0.8:
                parts.append(f"Flood risk: Elevated flood risk detected. {crop} is highly sensitive to waterlogging — serious yield loss risk.")
            else:
                parts.append(f"Flood risk: Elevated flood risk detected. {crop} has moderate waterlogging tolerance — monitor drainage.")
        elif flood_level == "OBSERVED_FLOODING":
            parts.append(f"Flood risk: Flooding observed in this area. Growing {crop} is high-risk under current conditions.")
        else:
            parts.append(f"Flood risk: No elevated flood risk detected for this season.")

        if yield_data.get("available"):
            parts.append(
                f"Historical yield ({yield_data.get('geographic_level', 'regional')}): "
                f"{yield_data['mean_yield_t_ha']} t/ha average over {yield_data.get('years', 'recorded years')} "
                f"({yield_data['n_observations']} observations, ICRISAT DLD)."
            )
        else:
            parts.append(f"Historical yield: No ICRISAT data available for {crop} in {season} for this location. Fallback reference value used.")

        if market_data.get("available"):
            parts.append(
                f"Market price: ₹{market_data['modal_price_rs_per_quintal']:.0f}/quintal reported "
                f"({market_data.get('markets_sampled', '?')} markets, {market_data.get('date_range', 'recent')})."
            )
        else:
            parts.append(f"Market price: No AGMARKNET price data found for {crop}. Indicative reference price used.")

        if econ.get("available"):
            net = econ.get("estimated_net_return_inr", 0)
            budget_ok = econ.get("budget_ok", True)
            parts.append(
                f"Estimated economics: Revenue ₹{econ.get('estimated_revenue_inr', 0):,.0f}, "
                f"cost ₹{econ.get('estimated_cost_inr', 0):,.0f}, "
                f"net return ₹{net:,.0f} "
                f"({'within' if budget_ok else 'exceeds'} stated budget of ₹{econ.get('budget_available_inr', 0):,.0f})."
            )
            if not budget_ok:
                parts.append("Budget: Estimated cultivation cost exceeds stated investment — additional capital will be required.")

        return " ".join(parts)

    # ── Localized Indic Explanation ──
    lt = LANG_TERMS[lang]
    c = lt.get(crop, crop)
    s = lt.get(season, season)
    raw_st = soil_suit.get("form_soil_type", "selected soil")
    st = lt.get(raw_st, raw_st)
    ir = lt.get(irrigation, irrigation)
    wa = lt.get(water_avail, water_avail)
    parts = []

    # 1. Soil
    if lang == "hi":
        if soil_suit["score"] >= 0.8:
            parts.append(f"मृदा: {st} {c} के लिए अत्यधिक उपयुक्त है (ICAR)।")
        elif soil_suit["score"] >= 0.6:
            parts.append(f"मृदा: {st} मध्यम रूप से उपयुक्त है — उचित उर्वरक प्रबंधन से अच्छा उत्पादन संभव है।")
        else:
            parts.append(f"मृदा: {st} {c} के लिए कम अनुकूल है। अतिरिक्त संशोधन लागत अपेक्षित है।")
    elif lang == "ta":
        if soil_suit["score"] >= 0.8:
            parts.append(f"மண்: {st} {c} பயிருக்கு மிகவும் உகந்தது (ICAR).")
        elif soil_suit["score"] >= 0.6:
            parts.append(f"மண்: {st} மிதமான ஏற்றது — சரியான உர மேலாண்மை மூலம் பயிரிடலாம்.")
        else:
            parts.append(f"மண்: {st} {c} பயிருக்கு குறைவான ஏற்றது.")
    elif lang == "te":
        if soil_suit["score"] >= 0.8:
            parts.append(f"నేల: {st} {c} పంటకు బాగా సరిపోతుంది (ICAR).")
        elif soil_suit["score"] >= 0.6:
            parts.append(f"నేల: {st} మోస్తరుగా అనుకూలమైనది — సరైన ఎరువులతో నిర్వహించవచ్చు.")
        else:
            parts.append(f"నేల: {st} {c} పంటకు తక్కువ అనుకూలమైనది.")
    elif lang == "kn":
        if soil_suit["score"] >= 0.8:
            parts.append(f"ಮಣ್ಣು: {st} {c} ಬೆಳೆಗೆ ಹೆಚ್ಚು ಸೂಕ್ತವಾಗಿದೆ (ICAR).")
        elif soil_suit["score"] >= 0.6:
            parts.append(f"ಮಣ್ಣು: {st} ಮಧ್ಯಮವಾಗಿ ಸೂಕ್ತವಾಗಿದೆ — ಸರಿಯಾದ ಗೊಬ್ಬರದಿಂದ ನಿರ್ವಹಿಸಬಹುದು.")
        else:
            parts.append(f"ಮಣ್ಣು: {st} {c} ಬೆಳೆಗೆ ಕಡಿಮೆ ಸೂಕ್ತವಾಗಿದೆ.")
    elif lang == "ml":
        if soil_suit["score"] >= 0.8:
            parts.append(f"മണ്ണ്: {st} {c} വിളയ്ക്ക് വളരെ അനുയോജ്യമാണ് (ICAR).")
        elif soil_suit["score"] >= 0.6:
            parts.append(f"മണ്ണ്: {st} മിതമായ അളവിൽ അനുയോജ്യമാണ് — ശരിയായ വളപ്രയോഗത്തിലൂടെ പരിപാലിക്കാം.")
        else:
            parts.append(f"മണ്ണ്: {st} {c} വിളയ്ക്ക് അനുയോജ്യമല്ല.")
    elif lang == "pa":
        if soil_suit["score"] >= 0.8:
            parts.append(f"ਮਿੱਟੀ: {st} {c} ਲਈ ਬਹੁਤ ਢੁਕਵੀਂ ਹੈ (ICAR).")
        elif soil_suit["score"] >= 0.6:
            parts.append(f"ਮਿੱਟੀ: {st} ਦਰਮਿਆਨੀ ਢੁਕਵੀਂ ਹੈ — ਸਹੀ ਖਾਦ ਨਾਲ ਸੰਭਾਲਣਯੋਗ ਹੈ।")
        else:
            parts.append(f"ਮਿੱਟੀ: {st} {c} ਲਈ ਘੱਟ ਢੁਕਵੀਂ ਹੈ।")
    elif lang == "or":
        if soil_suit["score"] >= 0.8:
            parts.append(f"ମୃତ୍ତିକା: {st} {c} ପାଇଁ ଅତ୍ୟନ୍ତ ଉପଯୁକ୍ତ (ICAR)।")
        elif soil_suit["score"] >= 0.6:
            parts.append(f"ମୃତ୍ତିକା: {st} ମଧ୍ୟମ ଉପଯୁକ୍ତ — ଉପଯୁକ୍ତ ସାର ଦ୍ୱାରା ପରିଚାଳନା ଯୋଗ୍ୟ।")
        else:
            parts.append(f"ମୃତ୍ତିକା: {st} {c} ପାଇଁ କମ୍ ଉପଯୁକ୍ତ।")

    # 2. Weather
    if weather_suit["score"] >= 0.8:
        if lang == "hi": parts.append(f"मौसम: {s} मौसम में {c} के लिए तापमान और वर्षा की स्थितियाँ काफी अनुकूल हैं।")
        elif lang == "ta": parts.append(f"வானிலை: {s} பருவத்தில் {c} பயிருக்கு வெப்பநிலை மற்றும் மழை நிலைமைகள் சாதகமாக உள்ளன.")
        elif lang == "te": parts.append(f"వాతావరణం: {s} సీజన్‌లో {c} పంటకు ఉష్ణోగ్రత మరియు వర్షపాతం అనుకూలంగా ఉన్నాయి.")
        elif lang == "kn": parts.append(f"ಹವಾಮಾನ: {s} ಋತುವಿನಲ್ಲಿ {c} ಬೆಳೆಗೆ ತಾಪಮಾನ ಮತ್ತು ಮಳೆ ಪರಿಸ್ಥಿತಿಗಳು ಸೂಕ್ತವಾಗಿವೆ.")
        elif lang == "ml": parts.append(f"കാലാവസ്ഥ: {s} സീസണിൽ {c} വിളയ്ക്ക് താപനിലയും മഴയും അനുകൂലമാണ്.")
        elif lang == "pa": parts.append(f"ਮੌਸਮ: {s} ਵਿੱਚ {c} ਲਈ ਤਾਪਮਾਨ ਅਤੇ ਮੀਂਹ ਦੇ ਹਾਲਾਤ ਕਾਫੀ ਢੁਕਵੇਂ ਹਨ।")
        elif lang == "or": parts.append(f"ପାଣିପାଗ: {s} ଋତୁରେ {c} ପାଇଁ ତାପମାତ୍ରା ଏବଂ ବର୍ଷା ସ୍ଥିତି ଅନୁକୂଳ ଅଟେ।")

    # 3. Water
    if water_dim >= 0.8:
        if lang == "hi": parts.append(f"जल: {ir} एवं {wa} उपलब्धता {c} के लिए पर्याप्त है।")
        elif lang == "ta": parts.append(f"நீர்: {ir} மற்றும் {wa} நீர் இருப்பு {c} பயிருக்கு போதுமானது.")
        elif lang == "te": parts.append(f"నీరు: {ir} మరియు {wa} లభ్యత {c} పంటకు సరిపోతుంది.")
        elif lang == "kn": parts.append(f"ನೀರು: {ir} ಮತ್ತು {wa} ಲಭ್ಯತೆ {c} ಬೆಳೆಗೆ ಸಾಕಾಗುತ್ತದೆ.")
        elif lang == "ml": parts.append(f"ജലം: {ir} ഒപ്പം {wa} ലഭ്യത {c} വിളയ്ക്ക് പര്യാപ്തമാണ്.")
        elif lang == "pa": parts.append(f"ਪਾਣੀ: {ir} ਅਤੇ {wa} ਉਪਲਬਧਤਾ {c} ਲਈ ਕਾਫੀ ਹੈ।")
        elif lang == "or": parts.append(f"ଜଳ: {ir} ଏବଂ {wa} ଉପଲବ୍ଧତା {c} ପାଇଁ ଯଥେଷ୍ଟ।")

    # 4. Flood
    flood_level = flood_dim.get("flood_risk_level", "INSUFFICIENT_DATA")
    if flood_level == "NO_ELEVATED_RISK" or flood_level == "INSUFFICIENT_DATA":
        if lang == "hi": parts.append("बाढ़ जोखिम: इस मौसम के लिए कोई बढ़ा हुआ बाढ़ जोखिम नहीं मिला।")
        elif lang == "ta": parts.append("வெள்ள அபாயம்: இந்த பருவத்தில் வெள்ள அபாயம் எதுவும் கண்டறியப்படவில்லை.")
        elif lang == "te": parts.append("వరద ప్రమాదం: ఈ సీజన్‌కు ఎటువంటి వరద ముప్పు గుర్తించబడలేదు.")
        elif lang == "kn": parts.append("ಪ್ರವಾಹ ಅಪಾಯ: ಈ ಋತುವಿನಲ್ಲಿ ಯಾವುದೇ ಪ್ರವಾಹದ ಅಪಾಯ ಕಂಡುಬಂದಿಲ್ಲ.")
        elif lang == "ml": parts.append("വെള്ളപ്പൊക്ക സാധ്യത: ഈ സീസണിൽ വെള്ളപ്പൊക്ക സാധ്യതയൊന്നും കണ്ടെത്തിയില്ല.")
        elif lang == "pa": parts.append("ਹੜ੍ਹ ਦਾ ਖਤਰਾ: ਇਸ ਸੀਜ਼ਨ ਲਈ ਕੋਈ ਵਧਿਆ ਹੜ੍ਹ ਖਤਰਾ ਨਹੀਂ ਮਿਲਿਆ।")
        elif lang == "or": parts.append("ବନ୍ୟା ବିପଦ: ଏହି ଋତୁ ପାଇଁ କୌଣସି ବନ୍ୟା ବିପଦ ଚିହ୍ନଟ ହୋଇନାହିଁ।")

    # 5. Yield
    if yield_data.get("available"):
        geo = lt.get(yield_data.get('geographic_level', 'regional'), yield_data.get('geographic_level', 'regional'))
        mean_y = yield_data['mean_yield_t_ha']
        years = yield_data.get('years', 'recorded years')
        n_obs = yield_data['n_observations']
        if lang == "hi": parts.append(f"ऐतिहासिक उपज ({geo}): ICRISAT DLD के अनुसार {years} में औसत {mean_y} टन/हेक्टेयर ({n_obs} अवलोकन)।")
        elif lang == "ta": parts.append(f"வரலாற்று மகசூல் ({geo}): ICRISAT DLD தரவுகளின்படி {years} சராசரி {mean_y} டன்/ஹெக்டேர் ({n_obs} பதிவுகள்).")
        elif lang == "te": parts.append(f"చారిత్రక దిగుబడి ({geo}): ICRISAT DLD ప్రకారం {years} సగటు {mean_y} టన్/హెక్టారు ({n_obs} పరిశీలనలు).")
        elif lang == "kn": parts.append(f"ಐತಿಹಾಸಿಕ ಇಳುವರಿ ({geo}): ICRISAT DLD ಪ್ರಕಾರ {years} ಸರಾಸರಿ {mean_y} ಟನ್/ಹೆಕ್ಟೇರ್ ({n_obs} ವೀಕ್ಷಣೆಗಳು).")
        elif lang == "ml": parts.append(f"ചരിത്രപരമായ വിളവ് ({geo}): ICRISAT DLD പ്രകാരം {years} ശരാശരി {mean_y} ടൺ/ഹെക്ടർ ({n_obs} നിരീക്ഷണങ്ങൾ).")
        elif lang == "pa": parts.append(f"ਇਤਿਹਾਸਕ ਝਾੜ ({geo}): ICRISAT DLD ਅਨੁਸਾਰ {years} ਔਸਤ {mean_y} ਟਨ/ਹੈਕਟੇਅਰ ({n_obs} ਨਿਰੀਖਣ).")
        elif lang == "or": parts.append(f"ଐତିହାସିକ ଅମଳ ({geo}): ICRISAT DLD ଅନୁସାରେ {years} ହାରାହାରି {mean_y} ଟନ୍/ହେକ୍ଟର ({n_obs} ପର୍ଯ୍ୟବେକ୍ଷଣ)।")
    else:
        if lang == "hi": parts.append(f"ऐतिहासिक उपज: इस स्थान के लिए {s} में {c} का ICRISAT डेटा उपलब्ध नहीं है। संदर्भ मूल्य प्रयुक्त।")

    # 6. Market
    if market_data.get("available"):
        price = market_data['modal_price_rs_per_quintal']
        mkts = market_data.get('markets_sampled', '?')
        dr = market_data.get('date_range', 'recent')
        if lang == "hi": parts.append(f"बाजार मूल्य: ₹{price:.0f}/क्विंटल दर्ज ({mkts} बाजार, {dr})।")
        elif lang == "ta": parts.append(f"சந்தை விலை: ₹{price:.0f}/குவிண்டால் பதிவானது ({mkts} சந்தைகள், {dr}).")
        elif lang == "te": parts.append(f"మార్కెట్ ధర: ₹{price:.0f}/క్వింటాల్ నమోదైంది ({mkts} మార్కెట్లు, {dr}).")
        elif lang == "kn": parts.append(f"ಮಾರುಕಟ್ಟೆ ಬೆಲೆ: ₹{price:.0f}/ಕ್ವಿಂಟಾಲ್ ದಾಖಲಾಗಿದೆ ({mkts} ಮಾರುಕಟ್ಟೆಗಳು, {dr}).")
        elif lang == "ml": parts.append(f"വിപണി വില: ₹{price:.0f}/ക്വിന്റൽ രേഖപ്പെടുത്തി ({mkts} വിപണികൾ, {dr}).")
        elif lang == "pa": parts.append(f"ਮੰਡੀ ਕੀਮਤ: ₹{price:.0f}/ਕੁਇੰਟਲ ਦਰਜ ({mkts} ਮੰਡੀਆਂ, {dr}).")
        elif lang == "or": parts.append(f"ବଜାର ଦର: ₹{price:.0f}/କ୍ୱିଣ୍ଟାଲ୍ ରିପୋର୍ଟ ହୋଇଛି ({mkts} ବଜାର, {dr})।")

    # 7. Economics
    if econ.get("available"):
        net = econ.get('estimated_net_return_inr', 0)
        cost = econ.get('estimated_cost_inr', 0)
        rev = econ.get('estimated_revenue_inr', 0)
        bud = econ.get('budget_available_inr', 0)
        budget_ok = econ.get("budget_ok", True)
        b_word = lt.get("within" if budget_ok else "exceeds", "within")
        if lang == "hi": parts.append(f"अनुमानित अर्थशास्त्र: राजस्व ₹{rev:,.0f}, लागत ₹{cost:,.0f}, शुद्ध लाभ ₹{net:,.0f} ({b_word} ₹{bud:,.0f})।")
        elif lang == "ta": parts.append(f"மதிப்பிடப்பட்ட பொருளாதாரம்: வருவாய் ₹{rev:,.0f}, செலவு ₹{cost:,.0f}, நிகர லாபம் ₹{net:,.0f} ({b_word} ₹{bud:,.0f}).")
        elif lang == "te": parts.append(f"అంచనా వేసిన ఆర్థిక వివరాలు: రాబడి ₹{rev:,.0f}, ఖర్చు ₹{cost:,.0f}, నికర లాభం ₹{net:,.0f} ({b_word} ₹{bud:,.0f}).")
        elif lang == "kn": parts.append(f"ಅಂದಾಜು ಆರ್ಥಿಕತೆ: ಆದಾಯ ₹{rev:,.0f}, ವೆಚ್ಚ ₹{cost:,.0f}, ನಿವ್ವಳ ಲಾಭ ₹{net:,.0f} ({b_word} ₹{bud:,.0f}).")
        elif lang == "ml": parts.append(f"പ്രതീക്ഷിത സാമ്പത്തിക വിവരങ്ങൾ: വരുമാനം ₹{rev:,.0f}, ചെലവ് ₹{cost:,.0f}, അറ്റാദായം ₹{net:,.0f} ({b_word} ₹{bud:,.0f}).")
        elif lang == "pa": parts.append(f"ਅਨੁਮਾਨਿਤ ਅਰਥਸ਼ਾਸਤਰ: ਆਮਦਨ ₹{rev:,.0f}, ਲਾਗਤ ₹{cost:,.0f}, ਸ਼ੁੱਧ ਮੁਨਾਫਾ ₹{net:,.0f} ({b_word} ₹{bud:,.0f}).")
        elif lang == "or": parts.append(f"ଆକଳିତ ଅର୍ଥନୀତି: ରାଜସ୍ୱ ₹{rev:,.0f}, ଖର୍ଚ୍ଚ ₹{cost:,.0f}, ନିଟ୍ ଲାଭ ₹{net:,.0f} ({b_word} ₹{bud:,.0f})।")

    return " ".join(parts)
'''

# Replace from `def _build_explanation(` to end of function
idx = content.find("def _build_explanation(")
content = content[:idx] + ml_explanation

with open("backend/crop_recommendation.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated backend/crop_recommendation.py successfully")

