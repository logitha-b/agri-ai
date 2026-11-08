"""
Explainable rules-based flood-risk estimator.

Inputs used (all clearly labelled, missing treated as absent not zero):
  - IMD district rainfall: daily_actual_mm, weekly_actual_mm, accumulated 1/3/7-day
  - Nearby dams: count, closest dam distance, whether any serve Flood Control purpose
  - Nearby reservoirs: count, closest reservoir

Risk levels (4 categories only):
  OBSERVED_FLOODING   — satellite SAR or official alert confirms flooding (not yet integrated)
  ELEVATED_RISK       — multiple evidence signals exceed documented thresholds
  NO_ELEVATED_RISK    — evidence present and thresholds not crossed
  INSUFFICIENT_DATA   — not enough inputs to assess risk

Rules and thresholds (documented, not arbitrary):
  Heavy rain threshold  : 64.5 mm/day   (IMD "Heavy Rain" category)
  Very heavy threshold  : 115.5 mm/day  (IMD "Very Heavy Rain")
  Weekly high threshold : 200 mm/week   (indicative of sustained high rainfall)
  7-day high threshold  : 150 mm         (accumulated, from IMD category references)

References: IMD rainfall classification (2016); CWC Flood Forecasting guidelines.

This module does NOT:
  - Claim a dam is releasing water unless a confirmed source says so
  - Predict exact flood extent or timing
  - Use elevation, soil saturation, or river gauge data (not available)
  - Present scores as validated model outputs
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

_TRANS_CACHE: dict[str, dict[str, str]] | None = None

def _translate_text(text: str, lang: str) -> str:
    global _TRANS_CACHE
    if not text or not lang or lang == "en":
        return text
    if _TRANS_CACHE is None:
        try:
            static_file = Path(__file__).resolve().parent / "data" / "translations_static.json"
            if not static_file.is_file():
                static_file = Path(__file__).resolve().parent.parent / "data" / "translations_static.json"
            if static_file.is_file():
                _TRANS_CACHE = json.loads(static_file.read_text(encoding="utf-8"))
            else:
                _TRANS_CACHE = {}
        except Exception:
            _TRANS_CACHE = {}

    lang_dict = _TRANS_CACHE.get(lang, {}) if _TRANS_CACHE else {}
    if text in lang_dict:
        return lang_dict[text]
    t_stripped = text.strip()
    if t_stripped in lang_dict:
        return lang_dict[t_stripped]
    t_lower = t_stripped.lower()
    for k, v in lang_dict.items():
        if k.lower() == t_lower:
            return v
    return text


# ── Published IMD thresholds (mm/day) ─────────────────────────────────────────
HEAVY_RAIN_MM_DAY      = 64.5
VERY_HEAVY_RAIN_MM_DAY = 115.5
WEEKLY_HIGH_MM         = 200.0
ACC7_HIGH_MM           = 150.0


def estimate_flood_risk(
    lat: float,
    lng: float,
    state: str | None,
    district: str | None,
    nearby_dams: list[dict],
    nearby_reservoirs: list[dict],
    imd_rainfall: dict | None,
    nasa_rainfall: dict | None,
    language: str = "en",
) -> dict[str, Any]:
    """
    Derive an explainable flood-risk estimate from available evidence.

    Returns a structured dict with:
        risk_level      — one of OBSERVED_FLOODING / ELEVATED_RISK /
                          NO_ELEVATED_RISK / INSUFFICIENT_DATA
        evidence        — list of evidence items (each has source, value,
                          threshold, triggered flags)
        missing_inputs  — list of inputs that were absent
        precautions     — practical actions matching the risk level
        disclaimer      — honest limitation statement
    """
    evidence: list[dict] = []
    missing: list[str] = []
    triggered: list[str] = []

    # ── 1. IMD rainfall signals ──────────────────────────────────────────────
    if imd_rainfall and imd_rainfall.get("available"):
        daily = imd_rainfall.get("daily_actual_mm")
        weekly = imd_rainfall.get("weekly_actual_mm")
        acc = imd_rainfall.get("accumulated", {})
        acc7 = acc.get("last_7_days_mm")
        acc3 = acc.get("last_3_days_mm")
        obs_date = imd_rainfall.get("latest_date", "unknown")
        imd_state  = imd_rainfall.get("state", state or "")
        imd_dist   = imd_rainfall.get("district", district or "")

        if daily is not None:
            flag = daily >= HEAVY_RAIN_MM_DAY
            evidence.append({
                "signal":    "Daily rainfall",
                "value":     f"{daily} mm",
                "date":      obs_date,
                "threshold": f"{HEAVY_RAIN_MM_DAY} mm/day (IMD Heavy Rain)",
                "triggered": flag,
                "source":    f"IMD district rainfall — {imd_state}/{imd_dist}",
                "note":      "IMD 'Heavy Rain' category ≥ 64.5 mm/day; 'Very Heavy' ≥ 115.5 mm/day.",
            })
            if flag:
                triggered.append("daily_heavy_rain")
            if daily >= VERY_HEAVY_RAIN_MM_DAY:
                triggered.append("daily_very_heavy_rain")
        else:
            missing.append("IMD daily rainfall (no data for this district)")

        if weekly is not None:
            flag = weekly >= WEEKLY_HIGH_MM
            evidence.append({
                "signal":    "Weekly rainfall",
                "value":     f"{weekly} mm",
                "date":      obs_date,
                "threshold": f"{WEEKLY_HIGH_MM} mm/week (indicative sustained high rainfall)",
                "triggered": flag,
                "source":    f"IMD district rainfall — {imd_state}/{imd_dist}",
            })
            if flag:
                triggered.append("weekly_high")
        else:
            missing.append("IMD weekly rainfall")

        if acc7 is not None:
            flag = acc7 >= ACC7_HIGH_MM
            evidence.append({
                "signal":    "7-day accumulated rainfall",
                "value":     f"{acc7} mm",
                "date":      obs_date,
                "threshold": f"{ACC7_HIGH_MM} mm over 7 days",
                "triggered": flag,
                "source":    f"IMD district rainfall — {imd_state}/{imd_dist}",
            })
            if flag:
                triggered.append("acc7_high")
        else:
            missing.append("7-day accumulated rainfall")

        if acc3 is not None:
            evidence.append({
                "signal":    "3-day accumulated rainfall",
                "value":     f"{acc3} mm",
                "date":      obs_date,
                "threshold": "No specific threshold applied",
                "triggered": False,
                "source":    f"IMD district rainfall — {imd_state}/{imd_dist}",
            })
    else:
        missing.append("IMD district rainfall (district not found or file unavailable)")

    # ── 2. NASA POWER regional rainfall (backup/context) ────────────────────
    if nasa_rainfall and nasa_rainfall.get("available"):
        s = nasa_rainfall.get("summary", {})
        total_30 = s.get("total_rainfall_mm")
        if total_30 is not None:
            avg_weekly = round(total_30 / (s.get("period_days", 30) / 7), 1)
            flag = avg_weekly >= WEEKLY_HIGH_MM
            evidence.append({
                "signal":    "30-day regional rainfall (NASA POWER)",
                "value":     f"{total_30} mm total / {avg_weekly} mm avg per week",
                "date":      s.get("period_end", "unknown"),
                "threshold": f"{WEEKLY_HIGH_MM} mm/week avg",
                "triggered": flag,
                "source":    "NASA POWER ~55 km grid — regional context only",
                "note":      "NASA POWER resolution is ~55 km. Not a district-level measurement.",
            })
            if flag:
                triggered.append("nasa_weekly_high")
    else:
        missing.append("NASA POWER regional rainfall")

    # ── 3. Dam proximity ────────────────────────────────────────────────────
    if nearby_dams:
        closest = nearby_dams[0]
        flood_control_dams = [d for d in nearby_dams if d.get("flood_control")]
        evidence.append({
            "signal":    f"{len(nearby_dams)} dam(s) within 50 km",
            "value":     f"Closest: {closest['name']} ({closest.get('distance_km', '?')} km)",
            "date":      "Static inventory",
            "triggered": False,
            "source":    "NDSA National Dam Safety Authority — National Water Data Portal",
            "note":      (
                "Dam presence indicates managed water storage, NOT an imminent release. "
                "No live gate-operation or release data is available. "
                + (f"{len(flood_control_dams)} dam(s) have Flood Control as a stated purpose."
                   if flood_control_dams else "")
            ),
        })
    else:
        evidence.append({
            "signal":    "Nearby dams",
            "value":     "No dams found within 50 km",
            "date":      "Static inventory",
            "triggered": False,
            "source":    "NDSA National Dam Safety Authority",
        })
        missing.append("Dam proximity data (none within 50 km)")

    # ── 4. Reservoir proximity ───────────────────────────────────────────────
    if nearby_reservoirs:
        closest_r = nearby_reservoirs[0]
        evidence.append({
            "signal":    f"{len(nearby_reservoirs)} reservoir(s) within 50 km",
            "value":     f"Closest: {closest_r.get('res_name','?')} ({closest_r.get('distance_km','?')} km)",
            "date":      "Static inventory",
            "triggered": False,
            "source":    "CWC Central Water Commission — National Water Data Portal",
            "note":      "No live water-level, storage, inflow, or outflow data available.",
        })
    else:
        missing.append("Reservoir data (none within 50 km)")

    # ── 5. Satellite inundation (not yet integrated) ─────────────────────────
    missing.append(
        "Satellite flood inundation (Sentinel-1 SAR not linked to district-level alerts — "
        "use the Sentinel-1 layer in Crop Health for visual flood indicators)"
    )
    missing.append("River gauge levels (CWC real-time data requires registration at india-water.gov.in)")
    missing.append("Elevation / DEM (not integrated — low-lying areas may face higher risk than indicated)")

    # ── 6. Determine risk level ──────────────────────────────────────────────
    n_triggered = len(triggered)

    if n_triggered == 0 and "IMD district rainfall (district not found or file unavailable)" in missing:
        risk_level = "INSUFFICIENT_DATA"
        risk_label = "Insufficient Data"
        risk_color = "grey"
        summary = (
            "Not enough data to assess flood risk for this location. "
            "IMD district rainfall was not found, and no other confirming signals are available."
        )
    elif n_triggered >= 3 or "daily_very_heavy_rain" in triggered:
        risk_level = "ELEVATED_RISK"
        risk_label = "Elevated Risk"
        risk_color = "red"
        summary = (
            f"{n_triggered} rainfall threshold(s) exceeded based on IMD district data and/or "
            "NASA POWER regional data. Risk is elevated — check official CWC/NDMA flood alerts."
        )
    elif n_triggered >= 1:
        risk_level = "ELEVATED_RISK"
        risk_label = "Elevated Risk"
        risk_color = "amber"
        summary = (
            f"{n_triggered} rainfall threshold(s) crossed. Monitor conditions closely and "
            "check official flood warnings before field work."
        )
    else:
        risk_level = "NO_ELEVATED_RISK"
        risk_label = "No Elevated Risk Detected"
        risk_color = "green"
        summary = (
            "No rainfall thresholds exceeded in the available data. "
            "This does not guarantee safety — missing inputs (listed below) may carry risk."
        )

    # ── 7. Precautions per risk level ────────────────────────────────────────
    if risk_level == "ELEVATED_RISK":
        precautions = [
            "Check the official CWC Flood Forecasting portal: cwc.gov.in/flood-forecasting",
            "Monitor NDMA flood alerts: ndma.gov.in",
            "Do not enter flooded or waterlogged fields.",
            "Ensure field drainage channels are clear.",
            "Move stored harvest, machinery, and livestock to higher ground if flooding is confirmed.",
            "Do not rely on this estimate as an official flood warning.",
        ]
    elif risk_level == "OBSERVED_FLOODING":
        precautions = [
            "Flooding confirmed — do not enter flooded areas.",
            "Contact local emergency services and agricultural extension officers.",
            "Move assets to safety immediately.",
        ]
    elif risk_level == "INSUFFICIENT_DATA":
        precautions = [
            "Check official IMD rainfall forecasts: mausam.imd.gov.in",
            "Check official CWC flood bulletins: cwc.gov.in",
            "Conduct a field inspection before any agricultural operations.",
        ]
    else:
        precautions = [
            "Continue routine field monitoring.",
            "Keep drainage channels clear as a precaution.",
            "Check official weather forecasts before the next irrigation or field operation.",
        ]

    # ── Unified Multilingual Localization (8 Languages) ─────────────────────
    official_sources = [
        {"name": "CWC Flood Forecasting", "url": "https://cwc.gov.in/flood-forecasting"},
        {"name": "NDMA Flood Alerts",     "url": "https://ndma.gov.in"},
        {"name": "IMD Weather",           "url": "https://mausam.imd.gov.in"},
    ]
    disclaimer = (
        "This is a rules-based estimate derived from published IMD thresholds and available "
        "satellite/inventory data. It is NOT an official flood warning, forecast, or validated "
        "hydrological model output. Inputs marked as missing may carry risk not captured here. "
        "Always consult official CWC and NDMA flood alerts before taking action."
    )

    if language and language != "en":
        try:
            # 1. risk_label
            risk_label_map = {
                "No Elevated Risk Detected": {
                    "hi": "कोई बढ़ा हुआ जोखिम नहीं मिला", "ta": "அதிகரித்த ஆபத்து எதுவும் கண்டறியப்படவில்லை",
                    "te": "ఎలాంటి పెరిగిన ప్రమాదం కనుగొనబడలేదు", "kn": "ಯಾವುದೇ ಹೆಚ್ಚಿದ ಅಪಾಯ ಪತ್ತೆಯಾಗಿಲ್ಲ",
                    "ml": "കൂടിയ അപകടസാധ്യത കണ്ടെത്തിയില്ല", "pa": "ਕੋਈ ਵਧਿਆ ਹੋਇਆ ਜੋਖਮ ਨਹੀਂ ਮਿਲਿਆ",
                    "or": "କୌଣସି ବୃଦ୍ଧି ପ୍ରାପ୍ତ ବିପଦ ଚିହ୍ନଟ ହୋଇନାହିଁ",
                },
                "Elevated Risk": {
                    "hi": "बढ़ा हुआ जोखिम", "ta": "அதிகரித்த ஆபத்து",
                    "te": "పెరిగిన ప్రమాదం", "kn": "ಹೆಚ್ಚಿದ ಅಪಾಯ",
                    "ml": "കൂടിയ അപകടസാധ്യത", "pa": "ਵਧਿਆ ਹੋਇਆ ਖਤਰਾ",
                    "or": "ବୃଦ୍ଧି ପ୍ରାପ୍ତ ବିପଦ",
                },
                "Observed Flooding": {
                    "hi": "बाढ़ की पुष्टि हुई", "ta": "வெள்ளம் உறுதி செய்யப்பட்டது",
                    "te": "వరదలు నిర్ధారించబడ్డాయి", "kn": "ಪ್ರವಾಹ ದೃಢಪಟ್ಟಿದೆ",
                    "ml": "വെള്ളപ്പൊക്കം സ്ഥിരീകരിച്ചു", "pa": "ਹੜ੍ਹ ਦੀ ਪੁਸ਼ਟੀ ਹੋਈ",
                    "or": "ବନ୍ୟା ନିଶ୍ଚିତ ହୋଇଛି",
                },
                "Insufficient Data": {
                    "hi": "अपर्याप्त डेटा", "ta": "போதுமான தரவு இல்லை",
                    "te": "సరిపోని డేటా", "kn": "ಸಾಕಷ್ಟಿಲ್ಲದ ಡೇಟಾ",
                    "ml": "അപര്യാപ്തമായ വിവരങ്ങൾ", "pa": "ਨਾਕਾਫ਼ੀ ਡੇਟਾ",
                    "or": "ଅପର୍ଯ୍ୟାପ୍ତ ତଥ୍ୟ",
                },
            }
            if risk_label in risk_label_map and language in risk_label_map[risk_label]:
                risk_label = risk_label_map[risk_label][language]
            else:
                risk_label = _translate_text(risk_label, language)

            # 2. summary
            if "No rainfall thresholds exceeded in the available data" in summary:
                summary_map = {
                    "hi": "उपलब्ध आंकड़ों में कोई वर्षा सीमा पार नहीं हुई है। यह पूर्ण सुरक्षा की गारंटी नहीं देता — नीचे सूचीबद्ध अनुपलब्ध इनपुट में जोखिम हो सकता है।",
                    "ta": "கிடைக்கக்கூடிய தரவுகளில் மழைப்பொழிவு வரம்புகள் எதுவும் தாண்டவில்லை. இது முழுப் பாதுகாப்பிற்கு உத்தரவாதம் அளிக்காது — கீழே பட்டியலிடப்பட்டுள்ள விடுபட்ட தகவல்களில் ஆபத்து இருக்கலாம்.",
                    "te": "అందుబాటులో ఉన్న డేటాలో ఎటువంటి వర్షపాత పరిమితులు మించలేదు. ఇది భద్రతకు హామీ ఇవ్వదు — దిగువ జాబితా చేయబడిన తప్పిపోయిన ఇన్‌పుట్‌లు ప్రమాదాన్ని కలిగి ఉండవచ్చు.",
                    "kn": "ಲಭ್ಯವಿರುವ ಡೇಟಾದಲ್ಲಿ ಯಾವುದೇ ಮಳೆಯ ಮಿತಿಗಳನ್ನು ಮೀರಲಾಗಿಲ್ಲ. ಇದು ಸಂಪೂರ್ಣ ಸುರಕ್ಷತೆಯನ್ನು ಖಾತರಿಪಡಿಸುವುದಿಲ್ಲ — ಕೆಳಗೆ ಪಟ್ಟಿ ಮಾಡಲಾದ ಕಾಣೆಯಾದ ಇನ್‌ಪುಟ್‌ಗಳು ಅಪಾಯವನ್ನು ಹೊಂದಿರಬಹುದು.",
                    "ml": "ലഭ്യമായ വിവരങ്ങളിൽ മഴയുടെ പരിധി കവിഞ്ഞിട്ടില്ല. ഇത് പൂർണ്ണ സുരക്ഷിതത്വം ഉറപ്പുനൽകുന്നില്ല — താഴെ നൽകിയിട്ടുള്ള വിവരങ്ങളുടെ അഭാവം അപകടസാധ്യത ഉണ്ടാക്കാം.",
                    "pa": "ਉਪਲਬਧ ਡੇਟਾ ਵਿੱਚ ਕੋਈ ਵਰਖਾ ਸੀਮਾ ਪਾਰ ਨਹੀਂ ਹੋਈ ਹੈ। ਇਹ ਸੁਰੱਖਿਆ ਦੀ ਗਰੰਟੀ ਨਹੀਂ ਦਿੰਦਾ — ਹੇਠਾਂ ਦਿੱਤੇ ਗੁੰਮ ਹੋਏ ਇਨਪੁਟਸ ਵਿੱਚ ਜੋਖਮ ਹੋ ਸਕਦਾ ਹੈ।",
                    "or": "ଉପଲବ୍ଧ ତଥ୍ୟରେ କୌଣସି ବୃଷ୍ଟିପାତ ସୀମା ଅତିକ୍ରମ କରିନାହିଁ | ଏହା ସୁରକ୍ଷାକୁ ନିଶ୍ଚିତ କରେ ନାହିଁ — ନିମ୍ନରେ ତାଲିକାଭୁକ୍ତ ଅନୁପସ୍ଥିତ ଇନପୁଟ୍ ବିପଦ ବହନ କରିପାରେ |",
                }
                summary = summary_map.get(language, summary)
            else:
                summary = _translate_text(summary, language)

            # 3. evidence
            rainfall_signals = {
                "Daily rainfall": {
                    "hi": "दैनिक वर्षा", "ta": "தினசரி மழைப்பொழிவு", "te": "రోజువారీ వర్షపాతం",
                    "kn": "ದೈನಂದಿನ ಮಳೆ", "ml": "പ്രതിദിന മഴ", "pa": "ਰੋਜ਼ਾਨਾ ਵਰਖਾ", "or": "ଦୈନିକ ବୃଷ୍ଟିପାତ",
                },
                "Weekly rainfall": {
                    "hi": "साप्ताहिक वर्षा", "ta": "வாராந்திர மழைப்பொழிவு", "te": "వారపు వర్షపాతం",
                    "kn": "ವಾರದ ಮಳೆ", "ml": "പ്രതിവാര മഴ", "pa": "ਹਫ਼ਤਾਵਾਰੀ ਵਰਖਾ", "or": "ସାପ୍ତାହିକ ବୃଷ୍ଟିପାତ",
                },
                "7-day accumulated rainfall": {
                    "hi": "7-दिवसीय संचित वर्षा", "ta": "7 நாள் திரட்டப்பட்ட மழை", "te": "7 రోజుల సంచిత వర్షపాతం",
                    "kn": "7-ದಿನಗಳ ಸಂಚಿತ ಮಳೆ", "ml": "7 ദിവസത്തെ ആകെ മഴ", "pa": "7-ਦਿਨਾਂ ਦੀ ਇਕੱਠੀ ਹੋਈ ਵਰਖਾ", "or": "୭-ଦିନିଆ ସଞ୍ଚିତ ବୃଷ୍ଟିପାତ",
                },
                "3-day accumulated rainfall": {
                    "hi": "3-दिवसीय संचित वर्षा", "ta": "3 நாள் திரட்டப்பட்ட மழை", "te": "3 రోజుల సంచిత వర్షపాతం",
                    "kn": "3-ದಿನಗಳ ಸಂಚಿತ ಮಳೆ", "ml": "3 ദിവസത്തെ ആകെ മഴ", "pa": "3-ਦਿਨਾਂ ਦੀ ਇਕੱਠੀ ਹੋਈ ਵਰਖਾ", "or": "୩-ଦିନିଆ ସଞ୍ଚିତ ବୃଷ୍ଟିପାତ",
                },
                "30-day regional rainfall (NASA POWER)": {
                    "hi": "30-दिवसीय क्षेत्रीय वर्षा (नासा पावर)", "ta": "30 நாள் பிராந்திய மழை (NASA POWER)",
                    "te": "30 రోజుల ప్రాంతీయ వర్షపాతం (NASA POWER)", "kn": "30-ದಿನಗಳ ಪ್ರಾದೇಶಿಕ ಮಳೆ (NASA POWER)",
                    "ml": "30 ദിവസത്തെ പ്രാദേശിക മഴ (NASA POWER)", "pa": "30-ਦਿਨਾਂ ਦੀ ਖੇਤਰੀ ਵਰਖਾ (ਨਾਸਾ ਪਾਵਰ)",
                    "or": "୩୦-ଦିନିଆ ଆଞ୍ଚଳିକ ବୃଷ୍ଟିପାତ (ନାସା ପାୱାର)",
                },
                "Nearby dams": {
                    "hi": "निकटवर्ती बांध", "ta": "அருகிலுள்ள அணைகள்", "te": "సమీప డ్యామ్‌లు",
                    "kn": "ಹತ್ತಿರದ ಅಣೆಕಟ್ಟುಗಳು", "ml": "സമീപത്തുള്ള അണക്കെട്ടുകൾ", "pa": "ਨੇੜਲੇ ਡੈਮ", "or": "ନିକଟବର୍ତ୍ତୀ ବନ୍ଧ",
                },
            }
            for ev in evidence:
                sig = ev.get("signal", "")
                if sig in rainfall_signals and language in rainfall_signals[sig]:
                    ev["signal"] = rainfall_signals[sig][language]
                sig = ev.get("signal", "")
                if "dam(s) within 50 km" in sig:
                    n = sig.split()[0]
                    dams_sig = {
                        "hi": f"{n} बांध (50 किमी के भीतर)",
                        "ta": f"50 கி.மீ-க்குள் {n} அணை(கள்)",
                        "te": f"50 కి.மீ పరిధిలో {n} డ్యామ్(లు)",
                        "kn": f"50 ಕಿ.ಮೀ ಒಳಗೆ {n} ಅಣೆಕಟ್ಟು(ಗಳು)",
                        "ml": f"50 കി.മീറ്ററിനുള്ളിൽ {n} അണക്കെട്ട്(കൾ)",
                        "pa": f"50 ਕਿਲੋਮੀਟਰ ਦੇ ਅੰਦਰ {n} ਡੈਮ",
                        "or": f"୫୦ କିମି ମଧ୍ୟରେ {n} ଟି ବନ୍ଧ",
                    }
                    ev["signal"] = dams_sig.get(language, sig)
                elif "reservoir(s) within 50 km" in sig:
                    n = sig.split()[0]
                    res_sig = {
                        "hi": f"{n} जलाशय (50 किमी के भीतर)",
                        "ta": f"50 கி.மீ-க்குள் {n} நீர்த்தேக்கம்(கள்)",
                        "te": f"50 కి.மீ పరిధిలో {n} రిజర్వాయர்(లు)",
                        "kn": f"50 ಕಿ.ಮೀ ಒಳಗೆ {n} ಜಲಾಶಯ(ಗಳು)",
                        "ml": f"50 കി.മീറ്ററിനുള്ളിൽ {n} ജലാശയം(കൾ)",
                        "pa": f"50 ਕਿਲੋਮੀਟਰ ਦੇ ਅੰਦਰ {n} ਜਲ ਭੰਡਾਰ",
                        "or": f"୫୦ କିମି ମଧ୍ୟରେ {n} ଟି ଜଳାଶୟ",
                    }
                    ev["signal"] = res_sig.get(language, sig)
                else:
                    ev["signal"] = _translate_text(sig, language)

                val = ev.get("value", "")
                if val.startswith("Closest:"):
                    closest_labels = {
                        "hi": "निकटतम:", "ta": "மிக அருகில்:", "te": "సమీపంలో:",
                        "kn": "ಹತ್ತಿರದ:", "ml": "ഏറ്റവും അടുത്തത്:", "pa": "ਸਭ ਤੋਂ ਨੇੜੇ:", "or": "ନିକଟତମ:"
                    }
                    prefix = closest_labels.get(language, "Closest:")
                    rest = val[len("Closest:"):].strip()
                    km_unit = {"hi": "किमी", "ta": "கி.மீ", "te": "కి.మీ", "kn": "ಕಿ.ಮೀ", "ml": "കി.മീ", "pa": "ਕਿਲੋਮੀਟਰ", "or": "କିମି"}.get(language, "km")
                    rest = rest.replace("km", km_unit)
                    ev["value"] = f"{prefix} {rest}"
                elif "total /" in val and "avg per week" in val:
                    if language == "hi":
                        ev["value"] = val.replace("mm total", "मिमी कुल").replace("mm avg per week", "मिमी औसत प्रति सप्ताह")
                    elif language == "ta":
                        ev["value"] = val.replace("mm total", "மி.மீ மொத்தம்").replace("mm avg per week", "மி.மீ சராசரி/வாரம்")
                    elif language == "te":
                        ev["value"] = val.replace("mm total", "మి.మీ మొత్తం").replace("mm avg per week", "మి.మీ సగటు/వారం")
                    elif language == "kn":
                        ev["value"] = val.replace("mm total", "ಮಿ.ಮೀ ಒಟ್ಟು").replace("mm avg per week", "ಮಿ.ಮೀ ಸರಾಸರಿ/ವಾರ")
                    elif language == "ml":
                        ev["value"] = val.replace("mm total", "മി.മീ ആകെ").replace("mm avg per week", "മി.മീ ശരാശരി/ആഴ്ച")
                    elif language == "pa":
                        ev["value"] = val.replace("mm total", "ਮਿਲੀਮੀਟਰ ਕੁੱਲ").replace("mm avg per week", "ਮਿਲੀਮੀਟਰ ਔਸਤ/ਹਫ਼ਤਾ")
                    elif language == "or":
                        ev["value"] = val.replace("mm total", "ମିମି ମୋଟ").replace("mm avg per week", "ମିମି ହାରାହାରି/ସପ୍ତାହ")
                else:
                    ev["value"] = _translate_text(val, language)

                thresh = ev.get("threshold", "")
                if thresh:
                    if "No specific threshold applied" in thresh:
                        thresh_map = {
                            "hi": "कोई विशिष्ट सीमा लागू नहीं", "ta": "குறிப்பிட்ட வரம்பு எதுவும் பயன்படுத்தப்படவில்லை",
                            "te": "నిర్దిష్ట పరిమితి వర్తించలేదు", "kn": "ಯಾವುದೇ ನಿರ್ದಿಷ್ಟ ಮಿತಿ ಅನ್ವಯಿಸಿಲ್ಲ",
                            "ml": "പ്രത്യേക പരിധി ബാധകമല്ല", "pa": "ਕੋਈ ਖਾਸ ਸੀਮਾ ਲਾਗੂ ਨਹੀਂ ਕੀਤੀ ਗਈ",
                            "or": "କୌଣସି ନିର୍ଦ୍ଦିଷ୍ଟ ସୀମା ଲାଗୁ ହୋଇନାହିଁ",
                        }
                        ev["threshold"] = thresh_map.get(language, thresh)
                    elif "mm/day (IMD Heavy Rain)" in thresh:
                        num = thresh.split()[0]
                        t_map = {
                            "hi": f"{num} मिमी/दिन (आईएमडी भारी वर्षा)", "ta": f"{num} மி.மீ/நாள் (IMD அதிக மழை)",
                            "te": f"{num} మి.మీ/రోజు (IMD భారీ వర్షం)", "kn": f"{num} ಮಿ.ಮೀ/ದಿನ (IMD ಭಾರಿ ಮಳೆ)",
                            "ml": f"{num} മി.മീ/ദിവസം (IMD കനത്ത മഴ)", "pa": f"{num} ਮਿਲੀਮੀਟਰ/ਦਿਨ (IMD ਭਾਰੀ ਵਰਖਾ)",
                            "or": f"{num} ମିମି/ଦିନ (IMD ପ୍ରବଳ ବର୍ଷା)",
                        }
                        ev["threshold"] = t_map.get(language, thresh)
                    elif "mm/week (indicative sustained high rainfall)" in thresh:
                        num = thresh.split()[0]
                        t_map = {
                            "hi": f"{num} मिमी/सप्ताह (लगातार उच्च वर्षा का सूचक)",
                            "ta": f"{num} மி.மீ/வாரம் (தொடர்ச்சியான அதிக மழையைக் குறிக்கிறது)",
                            "te": f"{num} మి.మీ/వారం (నిరంతర భారీ వర్షపాత సూచిక)",
                            "kn": f"{num} ಮಿ.ಮೀ/ವಾರ (ನಿರಂತರ ಭಾರಿ ಮಳೆಯ ಸೂಚಕ)",
                            "ml": f"{num} മി.മീ/ആഴ്ച (തുടർച്ചയായ കനത്ത മഴയുടെ സൂചകം)",
                            "pa": f"{num} ਮਿਲੀਮੀਟਰ/ਹਫ਼ਤਾ (ਲਗਾਤਾਰ ਭਾਰੀ ਵਰਖਾ ਦਾ ਸੂਚਕ)",
                            "or": f"{num} ମିମି/ସପ୍ତାହ (ନିରନ୍ତର ଉଚ୍ଚ ବୃଷ୍ଟିପାତ ସୂଚକ)",
                        }
                        ev["threshold"] = t_map.get(language, thresh)
                    elif "mm over 7 days" in thresh:
                        num = thresh.split()[0]
                        t_map = {
                            "hi": f"7 दिनों में {num} मिमी", "ta": f"7 நாட்களில் {num} மி.மீ",
                            "te": f"7 రోజుల్లో {num} మి.మీ", "kn": f"7 ದಿನಗಳಲ್ಲಿ {num} ಮಿ.ಮೀ",
                            "ml": f"7 ദിവസത്തിനുള്ളിൽ {num} മി.മീ", "pa": f"7 ਦਿਨਾਂ ਵਿੱਚ {num} ਮਿਲੀਮੀਟਰ",
                            "or": f"୭ ଦିନରେ {num} ମିମି",
                        }
                        ev["threshold"] = t_map.get(language, thresh)
                    elif "mm/week avg" in thresh:
                        num = thresh.split()[0]
                        t_map = {
                            "hi": f"{num} मिमी/सप्ताह औसत", "ta": f"{num} மி.மீ/வாரம் சராசரி",
                            "te": f"{num} మి.మీ/వారం సగటు", "kn": f"{num} ಮಿ.ಮೀ/ವಾರ ಸರಾಸರಿ",
                            "ml": f"{num} മി.മീ/ആഴ്ച ശരാശരി", "pa": f"{num} ਮਿਲੀਮੀਟਰ/ਹਫ਼ਤਾ ਔਸਤ",
                            "or": f"{num} ମିମି/ସପ୍ତାହ ହାରାହାରି",
                        }
                        ev["threshold"] = t_map.get(language, thresh)
                    else:
                        ev["threshold"] = _translate_text(thresh, language)

                if ev.get("source"):
                    ev["source"] = _translate_text(ev["source"], language)

                note = ev.get("note", "")
                if note:
                    if "Dam presence indicates managed water storage" in note:
                        dam_notes = {
                            "hi": "बांध की उपस्थिति प्रबंधित जल भंडारण को दर्शाती है, तत्काल पानी छोड़े जाने को नहीं। कोई लाइव गेट-संचालन या पानी निकासी डेटा उपलब्ध नहीं है।",
                            "ta": "அணையின் இருப்பு நிர்வகிக்கப்படும் நீர் சேமிப்பைக் குறிக்கிறது, உடனடி நீர் திறப்பைக் குறிக்காது. நேரடி மதகு இயக்கம் அல்லது நீர் வெளியேற்ற தரவு எதுவும் கிடைக்கவில்லை.",
                            "te": "డ్యామ్ ఉనికి నిర్వహించబడే నీటి నిల్వను సూచిస్తుంది, తక్షణ విడుదల కాదు. ప్రత్యక్ష గేట్-ఆపరేషన్ లేదా నీటి విడుదల డేటా అందుబాటులో లేదు.",
                            "kn": "ಅಣೆಕಟ್ಟಿನ ಉಪಸ್ಥಿತಿಯು ನಿರ್ವಹಿಸಲಾದ ನೀರಿನ ಸಂಗ್ರಹಣೆಯನ್ನು ಸೂಚಿಸುತ್ತದೆ, ಸನ್ನಿಹಿತ ಬಿಡುಗಡೆಯಲ್ಲ. ಯಾವುದೇ ಲೈವ್ ಗೇಟ್ ಕಾರ್ಯಾಚರಣೆ ಅಥವಾ ನೀರು ಬಿಡುಗಡೆ ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ.",
                            "ml": "ഡാമുകളുടെ സാന്നിധ്യം ജലസംഭരണത്തെ സൂചിപ്പിക്കുന്നു, പെട്ടെന്നുള്ള വെള്ളം തുറന്നുവിടലല്ല. തത്സമയ ഗേറ്റ് പ്രവർത്തനമോ വെള്ളം തുറന്നുവിടൽ വിവരങ്ങളോ ലഭ്യമല്ല.",
                            "pa": "ਡੈਮ ਦੀ ਮੌਜੂਦਗੀ ਪ੍ਰਬੰਧਿਤ ਪਾਣੀ ਦੇ ਭੰਡਾਰਨ ਨੂੰ ਦਰਸਾਉਂਦੀ ਹੈ, ਨਾ ਕਿ ਤੁਰੰਤ ਪਾਣੀ ਛੱਡਣ ਨੂੰ। ਕੋਈ ਲਾਈਵ ਗੇਟ-ਸੰਚਾਲਨ ਜਾਂ ਪਾਣੀ ਛੱਡਣ ਦਾ ਡੇਟਾ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।",
                            "or": "ବନ୍ଧର ଉପସ୍ଥିତି ପରିଚାଳିତ ଜଳ ସଂରକ୍ଷଣକୁ ସୂଚିତ କରେ, ତୁରନ୍ତ ଜଳ ନିଷ୍କାସନକୁ ନୁହେଁ | କୌଣସି ଲାଇଭ୍ ଗେଟ୍-ଅପରେସନ୍ କିମ୍ବା ଜଳ ନିଷ୍କାସନ ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ |",
                        }
                        base_trans = dam_notes.get(language, note)
                        if "have Flood Control as a stated purpose" in note:
                            try:
                                fc_count = note.split("have Flood Control")[0].strip().split()[-2]
                                fc_add = {
                                    "hi": f" {fc_count} बांधों का उद्देश्य बाढ़ नियंत्रण है।",
                                    "ta": f" {fc_count} அணைகள் வெள்ளக் கட்டுப்பாட்டை நோக்கமாகக் கொண்டுள்ளன.",
                                    "te": f" {fc_count} డ్యామ్‌లు వరద నియంత్రణ ప్రయోజనాన్ని కలిగి ఉన్నాయి.",
                                    "kn": f" {fc_count} ಅಣೆಕಟ್ಟುಗಳು ಪ್ರವಾಹ ನಿಯಂತ್ರಣ ಉದ್ದೇಶವನ್ನು ಹೊಂದಿವೆ.",
                                    "ml": f" {fc_count} അണക്കെട്ടുകൾക്ക് വെള്ളപ്പൊക്ക നിയന്ത്രണ ലക്ഷ്യമുണ്ട്.",
                                    "pa": f" {fc_count} ਡੈਮਾਂ ਦਾ ਉਦੇਸ਼ ਹੜ੍ਹ ਕੰਟਰੋਲ ਹੈ।",
                                    "or": f" {fc_count} ଟି ବନ୍ଧର ଉଦ୍ଦେଶ୍ୟ ବନ୍ୟା ନିୟନ୍ତ୍ରଣ ଅଟେ |",
                                }.get(language, "")
                                base_trans += fc_add
                            except Exception:
                                pass
                        ev["note"] = base_trans
                    elif "No live water-level, storage, inflow, or outflow data available" in note:
                        res_notes = {
                            "hi": "कोई लाइव जल स्तर, भंडारण, आवक या बहिर्वाह डेटा उपलब्ध नहीं है।",
                            "ta": "நேரடி நீர்மட்டம், சேமிப்பு, வரத்து அல்லது வெளியேற்ற தரவு எதுவும் கிடைக்கவில்லை.",
                            "te": "ప్రత్యక్ష నీటి మట్టం, నిల్వ, ఇన్‌ఫ్లో లేదా అవుట్‌ఫ్లో డేటా అందుబాటులో లేదు.",
                            "kn": "ಯಾವುದೇ ಲೈವ್ ನೀರಿನ ಮಟ್ಟ, ಸಂಗ್ರಹಣೆ, ಒಳಹರಿವು ಅಥವಾ ಹೊರಹರಿವಿನ ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ.",
                            "ml": "തത്സമയ ജലനിരപ്പ്, സംഭരണം, നീരൊഴുക്ക് വിവരങ്ങൾ ലഭ്യമല്ല.",
                            "pa": "ਕੋਈ ਲਾਈਵ ਪਾਣੀ ਦਾ ਪੱਧਰ, ਸਟੋਰੇਜ, ਆਮਦ ਜਾਂ ਨਿਕਾਸ ਡੇਟਾ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।",
                            "or": "କୌଣସି ଲାଇଭ୍ ଜଳ ସ୍ତର, ସଂରକ୍ଷଣ, ପ୍ରବେଶ କିମ୍ବା ପ୍ରସ୍ଥାନ ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ |",
                        }
                        ev["note"] = res_notes.get(language, note)
                    elif "NASA POWER resolution is ~55 km" in note:
                        nasa_notes = {
                            "hi": "नासा पावर रिज़ॉल्यूशन ~55 किमी है। यह ज़िला-स्तरीय माप नहीं है।",
                            "ta": "NASA POWER தெளிவுத்திறன் ~55 கி.மீ. இது மாவட்ட அளவிலான அளவீடு அல்ல.",
                            "te": "NASA POWER రిజల్యూషన్ ~55 కి.మీ. ఇది జిల్లా స్థాయి కొలత కాదు.",
                            "kn": "NASA POWER ರೆಸಲ್ಯೂಶನ್ ~55 ಕಿ.ಮೀ. ಇದು ಜಿಲ್ಲಾ ಮಟ್ಟದ ಮಾಪನವಲ್ಲ.",
                            "ml": "NASA POWER റെസല്യൂഷൻ ~55 കി.മീ ആണ്. ഇത് ജില്ലാതല അളവല്ല.",
                            "pa": "ਨਾਸਾ ਪਾਵਰ ਰੈਜ਼ੋਲਿਊਸ਼ਨ ~55 ਕਿਲੋਮੀਟਰ ਹੈ। ਇਹ ਜ਼ਿਲ੍ਹਾ-ਪੱਧਰੀ ਮਾਪ ਨਹੀਂ ਹੈ।",
                            "or": "ନାସା ପାୱାର ରିଜୋଲ୍ୟୁସନ୍ ପ୍ରାୟ ୫୫ କିମି | ଏହା ଜିଲ୍ଲା ସ୍ତରୀୟ ମାପ ନୁହେଁ |",
                        }
                        ev["note"] = nasa_notes.get(language, note)
                    elif "IMD 'Heavy Rain' category" in note:
                        imd_notes = {
                            "hi": "आईएमडी 'भारी वर्षा' श्रेणी ≥ 64.5 मिमी/दिन; 'बहुत भारी' ≥ 115.5 मिमी/दिन।",
                            "ta": "IMD 'கனமழை' வகை ≥ 64.5 மி.மீ/நாள்; 'மிகக் கனமழை' ≥ 115.5 மி.மீ/நாள்.",
                            "te": "IMD 'భారీ వర్షం' వర్గం ≥ 64.5 மி.மீ/రోజు; 'చాలా భారీ' ≥ 115.5 மி.மீ/రోజు.",
                            "kn": "IMD 'ಭಾರಿ ಮಳೆ' ವರ್ಗ ≥ 64.5 ಮಿ.ಮೀ/ದಿನ; 'ಅತ್ಯಂತ ಭಾರಿ' ≥ 115.5 ಮಿ.ಮೀ/ದಿನ.",
                            "ml": "IMD 'കനത്ത മഴ' വിഭാഗം ≥ 64.5 മി.മീ/ദിവസം; 'അതിശക്തമായ മഴ' ≥ 115.5 മി.മീ/ദിവസം.",
                            "pa": "IMD 'ਭਾਰੀ ਵਰਖਾ' ਸ਼੍ਰੇਣੀ ≥ 64.5 ਮਿਲੀਮੀਟਰ/ਦਿਨ; 'ਬਹੁਤ ਭਾਰੀ' ≥ 115.5 ਮਿਲੀਮੀਟਰ/ਦਿਨ।",
                            "or": "IMD 'ପ୍ରବଳ ବର୍ଷା' ବର୍ଗ ≥ ୬୪.୫ ମିମି/ଦିନ; 'ଅତ୍ୟନ୍ତ ପ୍ରବଳ' ≥ ୧୧୫.୫ ମିମି/ଦିନ।",
                        }
                        ev["note"] = imd_notes.get(language, note)
                    else:
                        ev["note"] = _translate_text(note, language)

            # 4. missing_inputs
            missing_localized = []
            for m in missing:
                if "Satellite flood inundation" in m:
                    sat_map = {
                        "hi": "उपग्रह बाढ़ जलभराव (सेंटिनल-1 एसएआर ज़िला-स्तरीय अलर्ट से जुड़ा नहीं है — दृश्य बाढ़ संकेतकों के लिए फसल स्वास्थ्य में सेंटिनल-1 परत का उपयोग करें)",
                        "ta": "செயற்கைக்கோள் வெள்ளப் பெருக்கு (சென்டினல்-1 SAR மாவட்ட அளவிலான எச்சரிக்கைகளுடன் இணைக்கப்படவில்லை — காட்சி வெள்ள குறிகளுக்கு பயிர் ஆரோக்கியத்தில் உள்ள சென்டினல்-1 அடுக்கைப் பயன்படுத்தவும்)",
                        "te": "ఉపగ్రహ వరద ముంపు (సెంటినెల్-1 SAR జిల్లా-స్థాయి హెచ్చరికలతో లింక్ చేయబడలేదు — దృశ్య వరద సూచికల కోసం పంట ఆరోగ్యంలో సెంటినెల్-1 పొరను ఉపయోగించండి)",
                        "kn": "ಉಪಗ್ರಹ ಪ್ರವಾಹ ಜಲಾವೃತ (ಸೆಂಟಿನೆಲ್-1 SAR ಜಿಲ್ಲಾ ಮಟ್ಟದ ಎಚ್ಚರಿಕೆಗಳಿಗೆ ಲಿಂಕ್ ಮಾಡಲಾಗಿಲ್ಲ — ದೃಶ್ಯ ಪ್ರವಾಹ ಸೂಚಕಗಳಿಗಾಗಿ ಬೆಳೆ ಆರೋಗ್ಯದಲ್ಲಿ ಸೆಂಟಿನೆಲ್-1 ಪದರವನ್ನು ಬಳಸಿ)",
                        "ml": "ഉപഗ്രഹ വെള്ളപ്പൊക്ക വിവരങ്ങൾ (സെന്റിനൽ-1 SAR ജില്ലാതല മുന്നറിയിപ്പുകളുമായി ബന്ധിപ്പിച്ചിട്ടില്ല — ദൃശ്യ സൂചകങ്ങൾക്കായി ക്രോപ്പ് ഹെൽത്തിലെ സെന്റിനൽ-1 ലെയർ ഉപയോഗിക്കുക)",
                        "pa": "ਸੈਟੇਲਾਈਟ ਹੜ੍ਹ ਜਲ-ਭਰਾਅ (ਸੈਂਟੀਨਲ-1 SAR ਜ਼ਿਲ੍ਹਾ-ਪੱਧਰੀ ਚੇਤਾਵਨੀਆਂ ਨਾਲ ਲਿੰਕ ਨਹੀਂ ਹੈ — ਵਿਜ਼ੂਅਲ ਹੜ੍ਹ ਸੂਚਕਾਂ ਲਈ ਫਸਲ ਸਿਹਤ ਵਿੱਚ ਸੈਂਟੀਨਲ-1 ਪਰਤ ਦੀ ਵਰਤੋਂ ਕਰੋ)",
                        "or": "ଉପଗ୍ରହ ବନ୍ୟା ଜଳମଗ୍ନତା (ସେଣ୍ଟିନେଲ୍-୧ SAR ଜିଲ୍ଲା ସ୍ତରୀୟ ସତର୍କତା ସହିତ ଜଡିତ ନୁହେଁ — ଦୃଶ୍ୟମାନ ବନ୍ୟା ସୂଚକ ପାଇଁ ଫସଲ ସ୍ୱାସ୍ଥ୍ୟରେ ସେଣ୍ଟିନେଲ୍-୧ ସ୍ତର ବ୍ୟବହାର କରନ୍ତୁ)",
                    }
                    missing_localized.append(sat_map.get(language, m))
                elif "River gauge levels" in m:
                    gauge_map = {
                        "hi": "नदी गेज स्तर (सीडब्ल्यूसी वास्तविक समय डेटा के लिए india-water.gov.in पर पंजीकरण की आवश्यकता है)",
                        "ta": "நதி நீர்மட்ட அளவுகள் (CWC நிகழ்நேர தரவுக்கு india-water.gov.in இல் பதிவு செய்ய வேண்டும்)",
                        "te": "నది గేజ్ స్థాయిలు (CWC రియల్ టైమ్ డేటాకు india-water.gov.in లో రిజిస్ట్రేషన్ అవసరం)",
                        "kn": "ನದಿ ಗೇಜ್ ಮಟ್ಟಗಳು (CWC ನೈಜ-ಸಮಯದ ದತ್ತಾಂಶಕ್ಕೆ india-water.gov.in ನಲ್ಲಿ ನೋಂದಣಿ ಅಗತ್ಯವಿದೆ)",
                        "ml": "നദീജല നിരപ്പ് (CWC തത്സമയ വിവരങ്ങൾക്ക് india-water.gov.in ൽ രജിസ്ട്രേഷൻ ആവശ്യമാണ്)",
                        "pa": "ਨਦੀ ਗੇਜ ਪੱਧਰ (CWC ਰੀਅਲ-ਟਾਈਮ ਡੇਟਾ ਲਈ india-water.gov.in 'ਤੇ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਦੀ ਲੋੜ ਹੈ)",
                        "or": "ନଦୀ ଗେଜ୍ ସ୍ତର (CWC ରିଅଲ୍-ଟାଇମ୍ ତଥ୍ୟ ପାଇଁ india-water.gov.in ରେ ପଞ୍ଜୀକରଣ ଆବଶ୍ୟକ)",
                    }
                    missing_localized.append(gauge_map.get(language, m))
                elif "Elevation / DEM" in m:
                    dem_map = {
                        "hi": "ऊंचाई / डीईएम (एकीकृत नहीं — निचले इलाकों में बताए गए जोखिम से अधिक जोखिम हो सकता है)",
                        "ta": "உயர அமைப்பு / DEM (ஒருங்கிணைக்கப்படவில்லை — தாழ்வான பகுதிகள் குறிப்பிடப்பட்டதை விட அதிக ஆபத்தை சந்திக்க நேரிடலாம்)",
                        "te": "ఎలివేషన్ / DEM (ఇంటిగ్రేట్ చేయబడలేదు — పల్లపు ప్రాంతాలు సూచించిన దానికంటే ఎక్కువ ప్రమాదాన్ని ఎదుర్కొనవచ్చు)",
                        "kn": "ಎತ್ತರ / DEM (ಸಂಯೋಜಿತವಾಗಿಲ್ಲ — ತಗ್ಗು ಪ್ರದೇಶಗಳು ಸೂಚಿಸಿದ್ದಕ್ಕಿಂತ ಹೆಚ್ಚಿನ ಅಪಾಯವನ್ನು ಎದುರಿಸಬಹುದು)",
                        "ml": "ഭൂനിരപ്പ് / DEM (സംയോജിപ്പിച്ചിട്ടില്ല — താഴ്ന്ന പ്രദേശങ്ങളിൽ കൂടുതൽ അപകടസാധ്യത ഉണ്ടായേക്കാം)",
                        "pa": "ਉਚਾਈ / DEM (ਏਕੀਕ੍ਰਿਤ ਨਹੀਂ — ਨੀਵੇਂ ਇਲਾਕਿਆਂ ਵਿੱਚ ਦੱਸੇ ਗਏ ਨਾਲੋਂ ਵੱਧ ਜੋਖਮ ਹੋ ਸਕਦਾ ਹੈ)",
                        "or": "ଉଚ୍ଚତା / DEM (ଏକୀକୃତ ନୁହେଁ — ତଳିଆ ଅଞ୍ଚଳଗୁଡ଼ିକ ସୂଚିତ ବିପଦଠାରୁ ଅଧିକ ବିପଦର ସମ୍ମୁଖୀନ ହୋଇପାରେ)",
                    }
                    missing_localized.append(dem_map.get(language, m))
                elif "NASA POWER regional rainfall" in m:
                    nasa_m = {
                        "hi": "नासा पावर क्षेत्रीय वर्षा (डेटा अनुपलब्ध)",
                        "ta": "NASA POWER பிராந்திய மழை (தரவு கிடைக்கவில்லை)",
                        "te": "NASA POWER ప్రాంతీయ వర్షపాతం (డేటా అందుబాటులో లేదు)",
                        "kn": "NASA POWER ಪ್ರಾದೇಶಿಕ ಮಳೆ (ದತ್ತಾಂಶ ಲಭ್ಯವಿಲ್ಲ)",
                        "ml": "NASA POWER പ്രാദേശിക മഴ (വിവരങ്ങൾ ലഭ്യമല്ല)",
                        "pa": "ਨਾਸਾ ਪਾਵਰ ਖੇਤਰੀ ਵਰਖਾ (ਡੇਟਾ ਅਣਉਪਲਬਧ)",
                        "or": "ନାସା ପାୱାର ଆଞ୍ଚଳିକ ବୃଷ୍ଟିପାତ (ତଥ୍ୟ ଅନୁପଲବ୍ଧ)",
                    }
                    missing_localized.append(nasa_m.get(language, m))
                elif "Dam proximity data" in m:
                    dam_m = {
                        "hi": "बांध निकटता डेटा (50 किमी के भीतर कोई नहीं)",
                        "ta": "அணை அருகாமை தரவு (50 கி.மீ-க்குள் எதுவும் இல்லை)",
                        "te": "డ్యామ్ సామీప్య డేటా (50 కి.మీ పరిధిలో ఏదీ లేదు)",
                        "kn": "ಅಣೆಕಟ್ಟು ಸಾಮೀಪ್ಯ ದತ್ತಾಂಶ (50 ಕಿ.ಮೀ ಒಳಗೆ ಯಾವುದೂ ಇಲ್ಲ)",
                        "ml": "അണക്കെട്ട് സാമീപ്യ വിവരങ്ങൾ (50 കി.മീറ്ററിനുള്ളിൽ ഒന്നുമില്ല)",
                        "pa": "ਡੈਮ ਨੇੜਤਾ ਡੇਟਾ (50 ਕਿਲੋਮੀਟਰ ਦੇ ਅੰਦਰ ਕੋਈ ਨਹੀਂ)",
                        "or": "ବନ୍ଧ ନିକଟତର ତଥ୍ୟ (୫୦ କିମି ମଧ୍ୟରେ କିଛି ନାହିଁ)",
                    }
                    missing_localized.append(dam_m.get(language, m))
                elif "Reservoir data" in m:
                    res_m = {
                        "hi": "जलाशय डेटा (50 किमी के भीतर कोई नहीं)",
                        "ta": "நீர்த்தேக்க தரவு (50 கி.மீ-க்குள் எதுவும் இல்லை)",
                        "te": "రిజర్వాయర్ డేటా (50 కి.మీ పరిధిలో ఏదీ లేదు)",
                        "kn": "ಜಲಾಶಯ ದತ್ತಾಂಶ (50 ಕಿ.ಮೀ ಒಳಗೆ ಯಾವುದೂ ಇಲ್ಲ)",
                        "ml": "ജലാശയ വിവരങ്ങൾ (50 കി.മീറ്ററിനുള്ളിൽ ഒന്നുമില്ല)",
                        "pa": "ਜਲ ਭੰਡਾਰ ਡੇਟਾ (50 ਕਿਲੋਮੀਟਰ ਦੇ ਅੰਦਰ ਕੋਈ ਨਹੀਂ)",
                        "or": "ଜଳାଶୟ ତଥ୍ୟ (୫୦ କିମି ମଧ୍ୟରେ କିଛି ନାହିଁ)",
                    }
                    missing_localized.append(res_m.get(language, m))
                else:
                    missing_localized.append(_translate_text(m, language))
            missing = missing_localized

            # 5. precautions
            precaution_map = {
                "Continue routine field monitoring.": {
                    "hi": "खेत की नियमित निगरानी जारी रखें।",
                    "ta": "வழக்கமான களக் கண்காணிப்பைத் தொடரவும்.",
                    "te": "సాధారణ క్షేత్ర పర్యవేక్షణను కొనసాగించండి.",
                    "kn": "ನಿಯಮಿತ ಕೃಷಿಭೂಮಿ ಮೇಲ್ವಿಚಾರಣೆಯನ್ನು ಮುಂದುವರಿಸಿ.",
                    "ml": "പതിവ് പാടശേഖര നിരീക്ഷണം തുടരുക.",
                    "pa": "ਖੇਤ ਦੀ ਨਿਯਮਿਤ ਨਿਗਰਾਨੀ ਜਾਰੀ ਰੱਖੋ।",
                    "or": "ନିୟମିତ କ୍ଷେତ୍ର ନିରୀକ୍ଷଣ ଜାରି ରଖନ୍ତୁ |",
                },
                "Keep drainage channels clear as a precaution.": {
                    "hi": "सावधानी के तौर पर जल निकासी चैनलों को साफ रखें।",
                    "ta": "முன்னெச்சரிக்கையாக வடிகால் வாய்க்கால்களை தூர்வாரி வைக்கவும்.",
                    "te": "ముందుజాగ్రత్తగా డ్రైనేజీ కాలువలను శుభ్రంగా ఉంచండి.",
                    "kn": "ಮುನ್ನೆಚ್ಚರಿಕೆಯಾಗಿ ಒಳಚರಂಡಿ ಕಾಲುವೆಗಳನ್ನು ಸ್ವಚ್ಛವಾಗಿಡಿ.",
                    "ml": "മുൻകരുതലായി ഡ്രെയിനേജ് ചാലുകൾ വൃത്തിയായി സൂക്ഷിക്കുക.",
                    "pa": "ਸਾਵਧਾਨੀ ਵਜੋਂ ਨਿਕਾਸੀ ਨਾਲਿਆਂ ਨੂੰ ਸਾਫ਼ ਰੱਖੋ।",
                    "or": "ସତର୍କତାମୂଳକ ପଦକ୍ଷେପ ଭାବରେ ଡ୍ରେନେଜ୍ ନାଳଗୁଡ଼ିକୁ ସଫା ରଖନ୍ତୁ |",
                },
                "Check official weather forecasts before the next irrigation or field operation.": {
                    "hi": "अगली सिंचाई या खेत के काम से पहले आधिकारिक मौसम पूर्वानुमान अवश्य देखें।",
                    "ta": "அடுத்த பாசனம் அல்லது களப் பணிகளுக்கு முன் அதிகாரப்பூர்வ வானிலை முன்னறிவிப்பைச் சரிபார்க்கவும்.",
                    "te": "తదుపరి నీటిపారుదల లేదా క్షేత్ర కార్యకలాపాలకు ముందు అధికారిక వాతావరణ సూచనలను తనిਖీ చేయండి.",
                    "kn": "ಮುಂದಿನ ನೀರಾವರಿ ಅಥವಾ ಕೃಷಿ ಕೆಲಸಕ್ಕೆ ಮೊದಲು ಅಧಿಕೃತ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆಯನ್ನು ಪರಿಶೀಲಿಸಿ.",
                    "ml": "അടുത്ത നനയ്ക്കലിനോ മറ്റ് ജോലികൾക്കോ മുൻപായി ഔദ്യോഗിക കാലാവസ്ഥാ പ്രവചനം പരിശോധിക്കുക.",
                    "pa": "ਅਗਲੀ ਸਿੰਚਾਈ ਜਾਂ ਖੇਤੀ ਦੇ ਕੰਮ ਤੋਂ ਪਹਿਲਾਂ ਅਧਿਕਾਰਤ ਮੌਸਮ ਦੀ ਭਵਿੱਖਬਾਣੀ ਦੀ ਜਾਂਚ ਕਰੋ।",
                    "or": "ପରବର୍ତ୍ତୀ ଜଳସେଚନ କିମ୍ବା କ୍ଷେତ୍ର କାର୍ଯ୍ୟ ପୂର୍ବରୁ ସରକାରୀ ପାଣିପାଗ ପୂର୍ବାନୁମାନ ଯାଞ୍ଚ କରନ୍ତୁ |",
                },
                "Check the official CWC Flood Forecasting portal: cwc.gov.in/flood-forecasting": {
                    "hi": "आधिकारिक सीडब्ल्यूसी बाढ़ पूर्वानुमान पोर्टल देखें: cwc.gov.in/flood-forecasting",
                    "ta": "அதிகாரப்பூர்வ CWC வெள்ள முன்னறிவிப்பு போர்ட்டலைச் சரிபார்க்கவும்: cwc.gov.in/flood-forecasting",
                    "te": "అధికారిక CWC వరద సూచన పోర్టల్‌ని తనిఖీ చేయండి: cwc.gov.in/flood-forecasting",
                    "kn": "ಅಧಿಕೃತ CWC ಪ್ರವಾಹ ಮುನ್ಸೂಚನೆ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ: cwc.gov.in/flood-forecasting",
                    "ml": "ഔദ്യോഗിക CWC വെള്ളപ്പൊക്ക പ്രവചന പോർട്ടൽ പരിശോധിക്കുക: cwc.gov.in/flood-forecasting",
                    "pa": "ਅਧਿਕਾਰਤ CWC ਹੜ੍ਹ ਪੂਰਵ ਅਨੁਮਾਨ ਪੋਰਟਲ ਦੀ ਜਾਂਚ ਕਰੋ: cwc.gov.in/flood-forecasting",
                    "or": "ଅଫିସିଆଲ୍ CWC ବନ୍ୟା ପୂର୍ବାନୁମାନ ପୋର୍ଟାଲ୍ ଯାଞ୍ଚ କରନ୍ତୁ: cwc.gov.in/flood-forecasting",
                },
                "Monitor NDMA flood alerts: ndma.gov.in": {
                    "hi": "एनडीएमए बाढ़ अलर्ट की निगरानी करें: ndma.gov.in",
                    "ta": "NDMA வெள்ள எச்சரிக்கைகளைக் கண்காணிக்கவும்: ndma.gov.in",
                    "te": "NDMA వరద హెచ్చరికలను పర్యవేక్షించండి: ndma.gov.in",
                    "kn": "NDMA ಪ್ರವಾಹ ಎಚ್ಚರಿಕೆಗಳನ್ನು ಗಮನಿಸಿ: ndma.gov.in",
                    "ml": "NDMA വെള്ളപ്പൊക്ക മുന്നറിയിപ്പുകൾ നിരീക്ഷിക്കുക: ndma.gov.in",
                    "pa": "NDMA ਹੜ੍ਹ ਅਲਰਟਾਂ 'ਤੇ ਨਜ਼ਰ ਰੱਖੋ: ndma.gov.in",
                    "or": "NDMA ବନ୍ୟା ସତର୍କତା ଉପରେ ନଜର ରଖନ୍ତୁ: ndma.gov.in",
                },
                "Do not enter flooded or waterlogged fields.": {
                    "hi": "बाढ़ या जलभराव वाले खेतों में प्रवेश न करें।",
                    "ta": "வெள்ளம் அல்லது நீர் தேங்கிய வயல்களில் இறங்க வேண்டாம்.",
                    "te": "వరదలు లేదా నీరు నిలిచిన పొలాల్లోకి ప్రవేశించవద్దు.",
                    "kn": "ಪ್ರವಾಹ ಅಥವಾ ಜಲಾವೃತವಾದ ಹೊಲಗಳಿಗೆ ಪ್ರವೇಶಿಸಬೇಡಿ.",
                    "ml": "വെള്ളപ്പൊക്കമുള്ളതോ വെള്ളം കെട്ടിക്കിടക്കുന്നതോ ആയ പാടങ്ങളിൽ ഇറങ്ങരുത്.",
                    "pa": "ਹੜ੍ਹ ਜਾਂ ਪਾਣੀ ਭਰੇ ਖੇਤਾਂ ਵਿੱਚ ਨਾ ਜਾਓ।",
                    "or": "ବନ୍ୟା କିମ୍ବା ଜଳମଗ୍ନ କ୍ଷେତ୍ରରେ ପ୍ରବେଶ କରନ୍ତୁ ନାହିଁ |",
                },
                "Ensure field drainage channels are clear.": {
                    "hi": "सुनिश्चित करें कि खेत के जल निकासी चैनल साफ हैं।",
                    "ta": "வயல் வடிகால் வாய்க்கால்கள் தடையின்றி இருப்பதை உறுதிசெய்யவும்.",
                    "te": "పొలం డ్రైనేజీ కాలువలు స్పష్టంగా ఉండేలా చూసుకోండి.",
                    "kn": "ಹೊಲದ ಒಳಚರಂಡಿ ಕಾಲುವೆಗಳು ಸ್ವಚ್ಛವಾಗಿವೆ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
                    "ml": "പാടത്തെ ഡ്രെയിനേജ് ചാലുകൾ തടസ്സമില്ലാത്തതാണെന്ന് ഉറപ്പാക്കുക.",
                    "pa": "ਯਕੀਨੀ ਬਣਾਓ ਕਿ ਖੇਤ ਦੇ ਨਿਕਾਸ ਨਾਲੇ ਸਾਫ਼ ਹਨ।",
                    "or": "ନିଶ୍ଚିତ କରନ୍ତୁ ଯେ କ୍ଷେତ୍ର ଡ୍ରେନେଜ୍ ନାଳଗୁଡ଼ିକ ସଫା ଅଛି |",
                },
                "Move stored harvest, machinery, and livestock to higher ground if flooding is confirmed.": {
                    "hi": "बाढ़ की पुष्टि होने पर भंडारित फसल, मशीनरी और पशुओं को ऊंचे स्थानों पर ले जाएं।",
                    "ta": "வெள்ளம் உறுதி செய்யப்பட்டால், சேமிக்கப்பட்ட அறுவடை, இயந்திரங்கள் மற்றும் கால்நடைகளை மேடான பகுதிக்கு மாற்றவும்.",
                    "te": "వరదలు నిర్ధారించబడితే నిల్వ చేసిన పంట, యంత్రాలు మరియు పశువులను ఎత్తైన ప్రదేశాలకు తరలించండి.",
                    "kn": "ಪ್ರವಾಹ ದೃಢಪಟ್ಟರೆ ಸಂಗ್ರಹಿಸಿದ ಬೆಳೆ, ಯಂತ್ರೋಪಕರಣಗಳು ಮತ್ತು ಜಾನುವಾರುಗಳನ್ನು ಎತ್ತರದ ಪ್ರದೇಶಗಳಿಗೆ ಸ್ಥಳಾಂತರಿಸಿ.",
                    "ml": "വെള്ളപ്പൊക്കം സ്ഥിരീകരിച്ചാൽ വിളകൾ, യന്ത്രങ്ങൾ, കന്നുകാലികൾ എന്നിവ ഉയർന്ന പ്രദേശങ്ങളിലേക്ക് മാറ്റുക.",
                    "pa": "ਜੇਕਰ ਹੜ੍ਹ ਦੀ ਪੁਸ਼ਟੀ ਹੁੰਦੀ ਹੈ ਤਾਂ ਸਟੋਰ ਕੀਤੀ ਫ਼ਸਲ, ਮਸ਼ੀਨਰੀ ਅਤੇ ਪਸ਼ੂਆਂ ਨੂੰ ਉੱਚੀ ਥਾਂ 'ਤੇ ਲੈ ਜਾਓ।",
                    "or": "ଯଦି ବନ୍ୟା ନିଶ୍ଚିତ ହୁଏ, ତେବେ ସଂରକ୍ଷିତ ଫସଲ, ଯନ୍ତ୍ରପାତି ଏବଂ ଗୃହପାଳିତ ପଶୁମାନଙ୍କୁ ଉଚ୍ଚ ସ୍ଥାନକୁ ସ୍ଥାନାନ୍ତର କରନ୍ତୁ |",
                },
                "Do not rely on this estimate as an official flood warning.": {
                    "hi": "इस अनुमान को आधिकारिक बाढ़ चेतावनी के रूप में न लें।",
                    "ta": "இந்த மதிப்பீட்டை அதிகாரப்பூர்வ வெள்ள எச்சரிக்கையாக நம்ப வேண்டாம்.",
                    "te": "ఈ అంచనాను అధికారిక వరద హెచ్చరికగా భావించవద్దు.",
                    "kn": "ಈ ಅಂದಾಜನ್ನು ಅಧಿಕೃತ ಪ್ರವಾಹ ಎಚ್ಚರಿಕೆ ಎಂದು ಪರಿಗಣಿಸಬೇಡಿ.",
                    "ml": "ഈ കണക്കുകൂട്ടലിനെ ഔദ്യോഗിക വെള്ളപ്പൊക്ക മുന്നറിയിപ്പായി കണക്കാക്കരുത്.",
                    "pa": "ਇਸ ਅਨੁਮਾਨ ਨੂੰ ਅਧਿਕਾਰਤ ਹੜ੍ਹ ਚੇਤਾਵਨੀ ਵਜੋਂ ਨਾ ਲਓ।",
                    "or": "ଏହି ଆକଳନକୁ ସରକାରୀ ବନ୍ୟା ଚେତାବନୀ ଭାବରେ ନିର୍ଭର କରନ୍ତୁ ନାହିଁ |",
                },
            }
            precautions = [precaution_map.get(p, {}).get(language, _translate_text(p, language)) for p in precautions]

            # 6. disclaimer
            disclaimer_map = {
                "hi": "यह प्रकाशित आईएमडी सीमाओं और उपलब्ध उपग्रह/इन्वेंट्री डेटा से प्राप्त नियम-आधारित अनुमान है। यह आधिकारिक बाढ़ चेतावनी, पूर्वानुमान या मान्य हाइड्रोलॉजिकल मॉडल आउटपुट नहीं है। लापता के रूप में चिह्नित इनपुट में जोखिम हो सकता है। कोई भी कदम उठाने से पहले हमेशा आधिकारिक सीडब्ल्यूसी और एनडीएमए बाढ़ अलर्ट देखें।",
                "ta": "இது வெளியிடப்பட்ட IMD வரம்புகள் மற்றும் கிடைக்கக்கூடிய செயற்கைக்கோள் தரவுகளிலிருந்து பெறப்பட்ட விதி அடிப்படையிலான மதிப்பீடாகும். இது அதிகாரப்பூர்வ வெள்ள எச்சரிக்கை அல்லது முன்னறிவிப்பு அல்ல. விடுபட்டதாகக் குறிக்கப்பட்ட தகவல்களில் ஆபத்து இருக்கலாம். நடவடிக்கை எடுப்பதற்கு முன் எப்போதும் அதிகாரப்பூர்வ CWC மற்றும் NDMA வெள்ள எச்சரிக்கைகளைப் பார்க்கவும்.",
                "te": "ఇది ప్రచురించబడిన IMD పరిమితులు మరియు అందుబాటులో ఉన్న ఉపగ్రహ డేటా నుండి తీసుకోబడిన నియమ-ఆధారిత అంచనా. ఇది అధికారిక వరద హెచ్చరిక లేదా సూచన కాదు. తప్పిపోయినవిగా గుర్తించబడిన ఇన్‌పుట్‌లు ప్రమాదాన్ని కలిగి ఉండవచ్చు. చర్య తీసుకునే ముందు ఎల్లప్పుడూ అధికారిక CWC మరియు NDMA వరద హెచ్చరికలను సంప్రదించండి.",
                "kn": "ಇದು ಪ್ರಕಟಿತ IMD ಮಿತಿಗಳು ಮತ್ತು ಲಭ್ಯವಿರುವ ಉಪಗ್ರಹ ದತ್ತಾಂಶದಿಂದ ಪಡೆದ ನಿಯಮ-ಆಧಾರಿತ ಅಂದಾಜು. ಇದು ಅಧಿಕೃತ ಪ್ರವಾಹ ಎಚ್ಚರಿಕೆ ಅಥವಾ ಮುನ್ಸೂಚನೆಯಲ್ಲ. ಕಾಣೆಯಾಗಿದೆ ಎಂದು ಗುರುತಿಸಲಾದ ಇನ್‌ಪುಟ್‌ಗಳು ಅಪಾಯವನ್ನು ಹೊಂದಿರಬಹುದು. ಕ್ರಮ ಕೈಗೊಳ್ಳುವ ಮೊದಲು ಯಾವಾಗಲೂ ಅಧಿಕೃತ CWC ಮತ್ತು NDMA ಪ್ರವಾಹ ಎಚ್ಚರಿಕೆಗಳನ್ನು ಸಂಪರ್ಕಿಸಿ.",
                "ml": "ഇത് പ്രസിദ്ധീകരിച്ച IMD പരിധികളും ലഭ്യമായ ഉപഗ്രഹ വിവരങ്ങളും അടിസ്ഥാനമാക്കിയുള്ള ഒരു അനുമാനമാണ്. ഇത് ഔദ്യോഗിക വെള്ളപ്പൊക്ക മുന്നറിയിപ്പോ പ്രവചനമോ അല്ല. നടപടികൾ സ്വീകരിക്കുന്നതിന് മുമ്പ് എല്ലായ്പ്പോഴും ഔദ്യോഗിക CWC, NDMA മുന്നറിയിപ്പുകൾ പരിശോധിക്കുക.",
                "pa": "ਇਹ ਪ੍ਰਕਾਸ਼ਿਤ IMD ਥ੍ਰੈਸ਼ਹੋਲਡ ਅਤੇ ਉਪਲਬਧ ਸੈਟੇਲਾਈਟ ਡੇਟਾ ਤੋਂ ਲਿਆ ਗਿਆ ਇੱਕ ਨਿਯਮ-ਅਧਾਰਿਤ ਅਨੁਮਾਨ ਹੈ। ਇਹ ਕੋਈ ਅਧਿਕਾਰਤ ਹੜ੍ਹ ਚੇਤਾਵਨੀ ਜਾਂ ਭਵਿੱਖਬਾਣੀ ਨਹੀਂ ਹੈ। ਕਾਰਵਾਈ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਹਮੇਸ਼ਾ ਅਧਿਕਾਰਤ CWC ਅਤੇ NDMA ਹੜ੍ਹ ਚੇਤਾਵਨੀਆਂ ਦੀ ਸਲਾਹ ਲਓ।",
                "or": "ଏହା ପ୍ରକାଶିତ IMD ସୀମା ଏବଂ ଉପଲବ୍ଧ ଉପଗ୍ରହ ତଥ୍ୟରୁ ପ୍ରାପ୍ତ ଏକ ନିୟମ-ଆଧାରିତ ଆକଳନ | ଏହା ଏକ ସରକାରୀ ବନ୍ୟା ଚେତାବନୀ କିମ୍ବା ପୂର୍ବାନୁମାନ ନୁହେଁ | ପଦକ୍ଷେପ ନେବା ପୂର୍ବରୁ ସର୍ବଦା ସରକାରୀ CWC ଏବଂ NDMA ବନ୍ୟା ସତର୍କତା ଦେଖନ୍ତୁ |",
            }
            disclaimer = disclaimer_map.get(language, disclaimer)

            # 7. official sources
            for s in official_sources:
                s["name"] = _translate_text(s["name"], language)
        except Exception:
            pass

    return {
        "risk_level":     risk_level,
        "risk_label":     risk_label,
        "risk_color":     risk_color,
        "summary":        summary,
        "signals_triggered": triggered,
        "evidence":       evidence,
        "missing_inputs": missing,
        "precautions":    precautions,
        "location": {
            "lat":      lat,
            "lng":      lng,
            "state":    state,
            "district": district,
        },
        "assessment_date": date.today().isoformat(),
        "disclaimer":     disclaimer,
        "official_sources": official_sources,
    }
