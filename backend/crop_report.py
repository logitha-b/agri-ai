"""
Rules-based AI Crop Health Report generator.

This module derives field-specific assessments from:
  - Crop type and sowing date (phenology calendar)
  - NASA POWER weather summary (temperature, rainfall, humidity)
  - NDVI availability flag
  - SoilGrids soil properties

All outputs are clearly labelled:
  - 'calculated'  — derived from data using published agronomic rules
  - 'estimated'   — best-available estimate with stated uncertainty
  - 'unavailable' — no supporting data; no value is fabricated

No LLM is used. Every recommendation traces to a published reference.
References: ICAR Crop Production Guide, TNAU Agritech Portal, FAO guidelines.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path
from typing import Any

logger = logging.getLogger("crop_report")

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

# ── Crop phenology calendars (TNAU / ICAR published data) ────────────────────

CROP_CALENDARS: dict[str, dict] = {
    "paddy": {
        "total_days": 140,
        "stages": [
            {"name": "Germination & seedling", "start": 0,   "end": 20,  "key": "seedling"},
            {"name": "Tillering",              "start": 21,  "end": 55,  "key": "tillering"},
            {"name": "Panicle initiation",     "start": 56,  "end": 75,  "key": "pi"},
            {"name": "Booting & heading",      "start": 76,  "end": 95,  "key": "booting"},
            {"name": "Flowering",              "start": 96,  "end": 105, "key": "flowering"},
            {"name": "Grain filling",          "start": 106, "end": 130, "key": "grainfill"},
            {"name": "Ripening & harvest",     "start": 131, "end": 140, "key": "harvest"},
        ],
        "heat_stress_c": 35,
        "cold_stress_c": 20,
        "drought_threshold_mm_week": 10,
        "flood_threshold_mm_week": 40,
        "irrigation": {
            "seedling":   "Maintain 2–5 cm standing water. Transplanted paddy needs continuous flooding.",
            "tillering":  "Maintain 5 cm standing water. Intermittent flooding is acceptable.",
            "pi":         "Maintain 5 cm continuous water. Critical stage — do not allow water stress.",
            "booting":    "Maintain 5–7 cm water. Most sensitive stage to water deficit.",
            "flowering":  "Maintain 5 cm water during flowering. Drought reduces grain set by up to 40%.",
            "grainfill":  "Maintain 2–3 cm water during grain fill. Reduce to alternate wetting/drying.",
            "harvest":    "Drain field 10–14 days before harvest to firm the soil.",
        },
        "fertiliser": {
            "seedling":   "Apply basal dose: DAP (100 kg/ha) + MOP (50 kg/ha) at transplanting.",
            "tillering":  "Apply 1st split urea (33% N, ~33 kg urea/ha) at 20–25 DAS.",
            "pi":         "Apply 2nd split urea (33% N) at panicle initiation. Zinc sulphate 25 kg/ha if deficiency observed.",
            "booting":    "Apply 3rd split urea (remaining N) at booting. Foliar potassium if needed.",
            "flowering":  "No additional fertiliser at flowering. Foliar micronutrient spray if deficiency confirmed.",
            "grainfill":  "No further fertiliser. Monitor for nutrient deficiency symptoms.",
            "harvest":    "No fertiliser at harvest stage.",
        },
        "source": "TNAU crop calendar — medium-duration Kharif paddy (~140 days). ICAR Crop Production Guide.",
    },
    "groundnut": {
        "total_days": 125,
        "stages": [
            {"name": "Germination",          "start": 0,   "end": 10,  "key": "germination"},
            {"name": "Vegetative growth",    "start": 11,  "end": 35,  "key": "vegetative"},
            {"name": "Flowering",            "start": 36,  "end": 55,  "key": "flowering"},
            {"name": "Peg & pod initiation", "start": 56,  "end": 80,  "key": "pod"},
            {"name": "Pod filling",          "start": 81,  "end": 110, "key": "podfill"},
            {"name": "Maturation & harvest", "start": 111, "end": 125, "key": "harvest"},
        ],
        "heat_stress_c": 38,
        "cold_stress_c": 15,
        "drought_threshold_mm_week": 8,
        "flood_threshold_mm_week": 50,
        "irrigation": {
            "germination": "Light irrigation (25 mm) at sowing. Avoid waterlogging.",
            "vegetative":  "One irrigation at 20–25 DAS if rainfall is insufficient (< 8 mm/week).",
            "flowering":   "Critical stage. Ensure adequate moisture (25 mm if dry). Avoid flooding.",
            "pod":         "Peg penetration requires moist, loose soil. Irrigate if soil surface is hard.",
            "podfill":     "One to two irrigations during pod-fill if rainfall is insufficient.",
            "harvest":     "Stop irrigation 2–3 weeks before harvest to facilitate digging.",
        },
        "fertiliser": {
            "germination": "Basal dose: SSP 375 kg/ha (75 kg P₂O₅) + MOP 83 kg/ha (50 kg K₂O).",
            "vegetative":  "Gypsum application 400 kg/ha at flowering (30–35 DAS) for pod development.",
            "flowering":   "Foliar spray of 2% DAP at flowering if stunted growth observed.",
            "pod":         "No additional fertiliser. Gypsum already applied at flowering.",
            "podfill":     "No further fertiliser. Scout for late leaf spot and rust.",
            "harvest":     "No fertiliser required.",
        },
        "source": "TNAU crop calendar — Kharif groundnut (~125 days). ICAR Crop Production Guide.",
    },
    "maize": {
        "total_days": 115,
        "stages": [
            {"name": "Germination & emergence", "start": 0,   "end": 10,  "key": "germination"},
            {"name": "Vegetative (V1–V8)",       "start": 11,  "end": 45,  "key": "vegetative"},
            {"name": "Tasseling (VT)",           "start": 46,  "end": 60,  "key": "tassel"},
            {"name": "Silking & pollination",    "start": 61,  "end": 70,  "key": "silk"},
            {"name": "Blister & milk (R2–R3)",   "start": 71,  "end": 85,  "key": "milk"},
            {"name": "Dough & dent (R4–R5)",     "start": 86,  "end": 105, "key": "dough"},
            {"name": "Maturation & harvest",     "start": 106, "end": 115, "key": "harvest"},
        ],
        "heat_stress_c": 34,
        "cold_stress_c": 18,
        "drought_threshold_mm_week": 12,
        "flood_threshold_mm_week": 45,
        "irrigation": {
            "germination": "Pre-sowing irrigation if soil is dry. Avoid crusting.",
            "vegetative":  "One irrigation every 10–12 days if rainfall is insufficient.",
            "tassel":      "Critical window. Irrigate immediately if rainfall < 12 mm/week.",
            "silk":        "Most critical stage. Water deficit reduces kernel set significantly.",
            "milk":        "Maintain soil moisture for grain development.",
            "dough":       "One irrigation if rainfall is insufficient.",
            "harvest":     "Stop irrigation 2 weeks before harvest.",
        },
        "fertiliser": {
            "germination": "Basal: DAP 100 kg/ha (18N+46P) + MOP 50 kg/ha at sowing.",
            "vegetative":  "Urea 65 kg/ha (30 kg N) at V3–V4 stage as side-dressing.",
            "tassel":      "Urea 65 kg/ha (30 kg N) at tasseling. Foliar zinc if needed.",
            "silk":        "No additional fertiliser. Scout for fall armyworm.",
            "milk":        "No further fertiliser.",
            "dough":       "No further fertiliser.",
            "harvest":     "No fertiliser required.",
        },
        "source": "TNAU crop calendar — Kharif maize (~115 days). ICAR Crop Production Guide.",
    },
    "tomato": {
        "total_days": 120,
        "stages": [
            {"name": "Germination & seedling",        "start": 0,   "end": 20,  "key": "seedling"},
            {"name": "Transplanting & establishment", "start": 21,  "end": 35,  "key": "transplant"},
            {"name": "Vegetative growth",             "start": 36,  "end": 60,  "key": "vegetative"},
            {"name": "Flowering",                     "start": 61,  "end": 80,  "key": "flowering"},
            {"name": "Fruit set & development",       "start": 81,  "end": 105, "key": "fruitset"},
            {"name": "Ripening & harvest",            "start": 106, "end": 120, "key": "harvest"},
        ],
        "heat_stress_c": 35,
        "cold_stress_c": 15,
        "drought_threshold_mm_week": 14,
        "flood_threshold_mm_week": 35,
        "irrigation": {
            "seedling":   "Light frequent irrigation to keep nursery moist. Avoid waterlogging.",
            "transplant": "Immediate light irrigation after transplanting. Daily for first week.",
            "vegetative": "Irrigate every 5–7 days. Drip irrigation preferred.",
            "flowering":  "Regular irrigation critical. Irregular water causes blossom-end rot.",
            "fruitset":   "Maintain consistent moisture during fruit development.",
            "harvest":    "Reduce irrigation 1 week before harvest to improve fruit quality.",
        },
        "fertiliser": {
            "seedling":   "Apply FYM 25 t/ha before transplanting. No chemical fertiliser in nursery.",
            "transplant": "Basal: DAP 100 kg/ha + MOP 83 kg/ha at transplanting.",
            "vegetative": "Urea 50 kg/ha at 30 DAS. Micronutrient spray if yellowing observed.",
            "flowering":  "Urea 50 kg/ha at early flowering. 0.5% potassium nitrate foliar spray.",
            "fruitset":   "Urea 50 kg/ha during fruit development. Calcium spray if BER observed.",
            "harvest":    "No fertiliser at harvest stage.",
        },
        "source": "TNAU crop calendar — Kharif tomato (~120 days). ICAR Crop Production Guide.",
    },
    "millet": {
        "total_days": 90,
        "stages": [
            {"name": "Germination",             "start": 0,  "end": 8,  "key": "germination"},
            {"name": "Vegetative (3–8 leaves)", "start": 9,  "end": 35, "key": "vegetative"},
            {"name": "Panicle initiation",      "start": 36, "end": 50, "key": "pi"},
            {"name": "Booting & heading",       "start": 51, "end": 65, "key": "booting"},
            {"name": "Flowering",               "start": 66, "end": 72, "key": "flowering"},
            {"name": "Grain filling",           "start": 73, "end": 83, "key": "grainfill"},
            {"name": "Maturation & harvest",    "start": 84, "end": 90, "key": "harvest"},
        ],
        "heat_stress_c": 40,
        "cold_stress_c": 18,
        "drought_threshold_mm_week": 8,
        "flood_threshold_mm_week": 50,
        "irrigation": {
            "germination": "Pre-sowing irrigation if soil is dry. Millet is drought-tolerant.",
            "vegetative":  "One irrigation at crown root initiation (20–25 DAS) if dry.",
            "pi":          "One irrigation at panicle initiation is beneficial.",
            "booting":     "Critical stage. Irrigate if rainfall < 8 mm/week.",
            "flowering":   "One irrigation at 50% flowering if conditions are dry.",
            "grainfill":   "One irrigation during grain-fill improves yield significantly.",
            "harvest":     "Stop irrigation 1 week before harvest.",
        },
        "fertiliser": {
            "germination": "Basal: Urea 32 kg/ha (15 kg N) + SSP 125 kg/ha at sowing.",
            "vegetative":  "Top-dressing: Urea 32 kg/ha at 25–30 DAS.",
            "pi":          "Urea 32 kg/ha (final top-dressing) at panicle initiation.",
            "booting":     "No further fertiliser. Scout for blast and downy mildew.",
            "flowering":   "No fertiliser. Scout for shoot fly.",
            "grainfill":   "No further fertiliser.",
            "harvest":     "No fertiliser required.",
        },
        "source": "TNAU crop calendar — Kharif pearl millet (~90 days). ICAR Crop Production Guide.",
    },
}

# ── Nearby suppliers (placeholder — requires Places API integration) ──────────

SUPPLIER_PLACEHOLDER = {
    "available": False,
    "note": (
        "Nearby supplier search requires a Places API key (e.g. Google Places or OpenStreetMap Overpass). "
        "Set PLACES_API_KEY in .env and integrate backend/places.py to enable this feature. "
        "No supplier names, phone numbers, or addresses are fabricated."
    ),
    "suppliers": [],
}


# ── Report generation ─────────────────────────────────────────────────────────

def generate_report(
    crop: str,
    sowing_date_str: str,
    weather_summary: dict | None,
    soil_props: dict | None,
    ndvi_available: bool,
    field_area_ha: float | None,
    variety: str | None = None,
    language: str = "en",
) -> dict[str, Any]:
    """
    Generate a rules-based crop health report.

    All sections carry a 'confidence' and 'data_kind' label.
    Nothing is invented — sections with insufficient data state that clearly.
    """
    crop_key = crop.lower().replace(" ", "")
    calendar = CROP_CALENDARS.get(crop_key)

    # ── Growth stage ──────────────────────────────────────────────────────────
    growth_stage = _compute_growth_stage(calendar, sowing_date_str)

    # ── Harvest estimate ──────────────────────────────────────────────────────
    harvest_estimate = _compute_harvest_estimate(calendar, sowing_date_str)

    # ── Weather stress flags ──────────────────────────────────────────────────
    stress_flags = _compute_stress_flags(calendar, weather_summary)

    # ── Irrigation recommendation ─────────────────────────────────────────────
    irrigation = _compute_irrigation(calendar, growth_stage, weather_summary)

    # ── Fertiliser recommendation ─────────────────────────────────────────────
    fertiliser = _compute_fertiliser(calendar, growth_stage, soil_props)

    # ── Vegetation condition ──────────────────────────────────────────────────
    vegetation = _compute_vegetation(ndvi_available, stress_flags)

    # ── Crop problems ─────────────────────────────────────────────────────────
    problems = _compute_problems(calendar, stress_flags, ndvi_available, growth_stage)

    # ── Unified Multilingual Localization (8 Languages) ─────────────────────
    if language and language != "en":
        try:
            # 1. Growth stage
            if growth_stage.get("current_stage"):
                growth_stage["current_stage"] = _translate_text(growth_stage["current_stage"], language)
            das = growth_stage.get("days_after_sowing", 45)
            if language == "hi":
                growth_stage["note"] = (
                    f"बुवाई की तारीख {sowing_date_str} और प्रकाशित टीएनएयू / आईसीएआर फसल कैलेंडर पर आधारित। "
                    f"{das}-दिन की अवधि वाली फसल के लिए फेनोलॉजी। "
                    "किस्म, तापमान और स्थानीय परिस्थितियों के आधार पर वास्तविक चरण 5-10 दिनों तक भिन्न हो सकता है।"
                )
            elif language == "ta":
                growth_stage["note"] = (
                    f"விதைப்பு தேதி {sowing_date_str} மற்றும் வெளியிடப்பட்ட TNAU / ICAR பயிர் காலண்டர் அடிப்படையிலானது. "
                    f"{das} நாள் கால அளவு கொண்ட பயிருக்கான கட்டமைப்பு. "
                    "வகை, வெப்பநிலை மற்றும் உள்ளூர் நிலைமைகளைப் பொறுத்து உண்மையான கட்டம் 5-10 நாட்கள் மாறுபடலாம்."
                )
            elif language == "te":
                growth_stage["note"] = (
                    f"విత్తే తేదీ {sowing_date_str} మరియు ప్రచురించబడిన TNAU / ICAR పంట క్యాలెండర్ ఆధారంగా. "
                    f"{das} రోజుల వ్యవధి పంట కోసం ఫెనోలజీ. "
                    "రకం, ఉష్ణోగ్రత మరియు స్థానిక పరిస్థితులపై ఆధారపడి వాస్తవ దశ 5-10 రోజులు మారవచ్చు."
                )
            elif language == "kn":
                growth_stage["note"] = (
                    f"ಬಿತ್ತನೆ ದಿನಾಂಕ {sowing_date_str} ಮತ್ತು ಪ್ರಕಟಿತ TNAU / ICAR ಬೆಳೆ ಕ್ಯಾಲೆಂಡರ್ ಆಧರಿಸಿದೆ. "
                    f"{das} ದಿನಗಳ ಬೆಳೆಯ ಫಿನಾಲಜಿ. "
                    "ತಳಿ, ತಾಪಮಾನ ಮತ್ತು ಸ್ಥಳೀಯ ಪರಿಸ್ಥಿತಿಗಳನ್ನು ಅವಲಂಬಿಸಿ ನಿಜವಾದ ಹಂತವು 5-10 ದಿನಗಳು ಬದಲಾಗಬಹುದು."
                )
            elif language == "ml":
                growth_stage["note"] = (
                    f"വിത്ത് വിതച്ച തീയതി {sowing_date_str} പ്രസിദ്ധീകരിച്ച TNAU / ICAR വിള കലണ്ടർ എന്നിവ അടിസ്ഥാനമാക്കി. "
                    f"{das} ദിവസത്തെ വിളയുടെ ഫിനോളജി. "
                    "ഇനം, താപനില, പ്രാദേശിക സാഹചര്യങ്ങൾ എന്നിവയെ ആശ്രയിച്ച് യഥാർത്ഥ ഘട്ടം 5-10 ദിവസങ്ങൾ വ്യത്യാസപ്പെടാം."
                )
            elif language == "pa":
                growth_stage["note"] = (
                    f"ਬਿਜਾਈ ਦੀ ਮਿਤੀ {sowing_date_str} ਅਤੇ ਪ੍ਰਕਾਸ਼ਿਤ TNAU / ICAR ਫਸਲ ਕੈਲੰਡਰ 'ਤੇ ਆਧਾਰਿਤ। "
                    f"{das}-ਦਿਨਾਂ ਦੀ ਫਸਲ ਲਈ ਫੀਨੋਲੋਜੀ। "
                    "ਕਿਸਮ, ਤਾਪਮਾਨ ਅਤੇ ਸਥਾਨਕ ਸਥਿਤੀਆਂ ਦੇ ਆਧਾਰ 'ਤੇ ਅਸਲ ਪੜਾਅ 5-10 ਦਿਨ ਵੱਖਰਾ ਹੋ ਸਕਦਾ ਹੈ।"
                )
            elif language == "or":
                growth_stage["note"] = (
                    f"ବୁଣିବା ତାରିଖ {sowing_date_str} ଏବଂ ପ୍ରକାଶିତ TNAU / ICAR ଫସଲ କ୍ୟାଲେଣ୍ଡର ଉପରେ ଆଧାରିତ | "
                    f"{das} ଦିନିଆ ଫସଲର ଫେନୋଲୋଜି | "
                    "କିସମ, ତାପମାତ୍ରା ଏବଂ ସ୍ଥାନୀୟ ପରିସ୍ଥିତି ଉପରେ ନିର୍ଭର କରି ପ୍ରକୃତ ପର୍ଯ୍ୟାୟ ୫-୧୦ ଦିନ ଭିନ୍ନ ହୋଇପାରେ |"
                )
            else:
                growth_stage["note"] = _translate_text(growth_stage.get("note", ""), language)

            # 2. Harvest estimate
            total_days = harvest_estimate.get("total_crop_duration_days") or (calendar.get("total_days") if calendar else 140)
            if harvest_estimate.get("basis"):
                if language == "hi":
                    harvest_estimate["basis"] = (
                        f"इस फसल के लिए प्रकाशित {total_days} दिनों की कुल अवधि पर आधारित अनुमान "
                        f"(स्रोत: टीएनएयू / आईसीएआर फसल उत्पादन गाइड)। "
                        "±7 दिनों की सीमा किस्मों के अंतर और स्थानीय जलवायु भिन्नता को दर्शाती है।"
                    )
                elif language == "ta":
                    harvest_estimate["basis"] = (
                        f"இந்த பயிர் வகைக்கு வெளியிடப்பட்ட {total_days} நாட்கள் கால அளவின் அடிப்படையிலான மதிப்பீடு "
                        f"(மூலம்: TNAU / ICAR பயிர் உற்பத்தி வழிகாட்டி). "
                        "±7 நாட்கள் வேறுபாடு ரக வேறுபாடுகள் மற்றும் உள்ளூர் காலநிலை மாறுபாடுகளைக் குறிக்கிறது."
                    )
                elif language == "te":
                    harvest_estimate["basis"] = (
                        f"ఈ పంట రకానికి ప్రచురించబడిన మొత్తం {total_days} రోజుల వ్యవధి ఆధారంగా అంచనా "
                        f"(మూలం: TNAU / ICAR పంట ఉత్పత్తి గైడ్). "
                        "±7 రోజుల పరిధి రకాల తేడాలు మరియు స్థానిక వాతావరణ వైవిధ్యాన్ని పరిగణనలోకి తీసుకుంటుంది."
                    )
                elif language == "kn":
                    harvest_estimate["basis"] = (
                        f"ಈ ಬೆಳೆ ಪ್ರಕಾರಕ್ಕೆ ಪ್ರಕಟಿಸಲಾದ ಒಟ್ಟು {total_days} ದಿನಗಳ ಅವಧಿಯ ಆಧಾರದ ಮೇಲೆ ಅಂದಾಜು "
                        f"(ಮೂಲ: TNAU / ICAR ಬೆಳೆ ಉತ್ಪಾದನಾ ಮಾರ್ಗದರ್ಶಿ). "
                        "±7-ದಿನಗಳ ಶ್ರೇಣಿಯು ತಳಿ ವ್ಯತ್ಯಾಸಗಳು ಮತ್ತು ಸ್ಥಳೀಯ ಹವಾಮಾನ ವ್ಯತ್ಯಾಸಗಳನ್ನು ಪರಿಗಣಿಸುತ್ತದೆ."
                    )
                elif language == "ml":
                    harvest_estimate["basis"] = (
                        f"ഈ വിള തരത്തിന് പ്രസിദ്ധീകരിച്ച ആകെ {total_days} ദിവസത്തെ ദൈർഘ്യം അടിസ്ഥാനമാക്കിയുള്ള കണക്കുകൂട്ടൽ "
                        f"(ഉറവിടം: TNAU / ICAR വിള ഉൽപ്പാദന ഗൈഡ്). "
                        "±7 ദിവസത്തെ വ്യത്യാസം ഇന വ്യത്യാസങ്ങളും പ്രാദേശിക കാലാവസ്ഥാ വ്യതിയാനങ്ങളും കണക്കിലെടുക്കുന്നു."
                    )
                elif language == "pa":
                    harvest_estimate["basis"] = (
                        f"ਇਸ ਫ਼ਸਲ ਕਿਸਮ ਲਈ ਪ੍ਰਕਾਸ਼ਿਤ ਕੁੱਲ {total_days} ਦਿਨਾਂ ਦੀ ਮਿਆਦ 'ਤੇ ਆਧਾਰਿਤ ਅਨੁਮਾਨ "
                        f"(ਸਰੋਤ: TNAU / ICAR ਫ਼ਸਲ ਉਤਪਾਦਨ ਗਾਈਡ)। "
                        "±7 ਦਿਨਾਂ ਦਾ ਅੰਤਰ ਕਿਸਮ ਦੇ ਅੰਤਰ ਅਤੇ ਸਥਾਨਕ ਜਲਵਾਯੂ ਪਰਿਵਰਤਨ ਨੂੰ ਦਰਸਾਉਂਦਾ ਹੈ।"
                    )
                elif language == "or":
                    harvest_estimate["basis"] = (
                        f"ଏହି ଫସଲ ପ୍ରକାର ପାଇଁ ପ୍ରକାଶିତ ସମୁଦାୟ {total_days} ଦିନ ଅବଧି ଉପରେ ଆଧାରିତ ଆକଳନ "
                        f"(ଉତ୍ସ: TNAU / ICAR ଫସଲ ଉତ୍ପାଦନ ନିର୍ଦ୍ଦେଶିକା) | "
                        "±୭ ଦିନର ପରିସର କିସମ ପାର୍ଥକ୍ୟ ଏବଂ ସ୍ଥାନୀୟ ଜଳବାୟୁ ପରିବର୍ତ୍ତନକୁ ଦର୍ଶାଏ |"
                    )
                else:
                    harvest_estimate["basis"] = _translate_text(harvest_estimate["basis"], language)
            if harvest_estimate.get("note"):
                harvest_estimate["note"] = _translate_text(harvest_estimate["note"], language)
            if harvest_estimate.get("uncertainty"):
                harvest_estimate["uncertainty"] = _translate_text(harvest_estimate["uncertainty"], language)

            # 3. Problems and remedies
            for p in problems:
                for k in ["issue", "cause", "evidence", "inspection", "remedy", "important_note"]:
                    if p.get(k):
                        p[k] = _translate_text(p[k], language)
                # Ensure dynamic cause strings with rain/temp numbers get translated
                if p.get("cause"):
                    c_text = p["cause"]
                    if "Average rainfall" in c_text:
                        if language == "hi":
                            c_text = c_text.replace("Average rainfall", "औसत वर्षा").replace("exceeds flood risk threshold", "बाढ़ जोखिम सीमा से अधिक है").replace("is below drought threshold", "सूखा सीमा से कम है").replace("mm/week", "मिमी/सप्ताह")
                        elif language == "ta":
                            c_text = c_text.replace("Average rainfall", "சராசரி மழைப்பொழிவு").replace("exceeds flood risk threshold", "வெள்ள அபாய வரம்பை விட அதிகமாக உள்ளது").replace("is below drought threshold", "வறட்சி வரம்பிற்கு கீழே உள்ளது").replace("mm/week", "மி.மீ/வாரம்")
                        elif language == "te":
                            c_text = c_text.replace("Average rainfall", "సగటు వర్షపాతం").replace("exceeds flood risk threshold", "వరద ప్రమాద పరిమితిని మించిపోయింది").replace("is below drought threshold", "కరువు పరిమితి కంటే తక్కువగా ఉంది").replace("mm/week", "మి.మీ/వారం")
                        elif language == "kn":
                            c_text = c_text.replace("Average rainfall", "ಸರಾಸರಿ ಮಳೆ").replace("exceeds flood risk threshold", "ಪ್ರವಾಹದ ಅಪಾಯದ ಮಿತಿಯನ್ನು ಮೀರಿದೆ").replace("is below drought threshold", "ಬರ ಮಿತಿಗಿಂತ ಕಡಿಮೆಯಾಗಿದೆ").replace("mm/week", "ಮಿ.ಮೀ/ವಾರ")
                        elif language == "ml":
                            c_text = c_text.replace("Average rainfall", "ശരാശരി മഴ").replace("exceeds flood risk threshold", "വെള്ളപ്പൊക്ക സാധ്യത പരിധി കവിയുന്നു").replace("is below drought threshold", "വരൾച്ച പരിധിക്ക് താഴെയാണ്").replace("mm/week", "മി.മീ/ആഴ്ച")
                        elif language == "pa":
                            c_text = c_text.replace("Average rainfall", "ਔਸਤ ਵਰਖਾ").replace("exceeds flood risk threshold", "ਹੜ੍ਹ ਦੇ ਖਤਰੇ ਦੀ ਸੀਮਾ ਤੋਂ ਵੱਧ ਹੈ").replace("is below drought threshold", "ਸੋਕੇ ਦੀ ਸੀਮਾ ਤੋਂ ਹੇਠਾਂ ਹੈ").replace("mm/week", "ਮਿਲੀਮੀਟਰ/ਹਫ਼ਤਾ")
                        elif language == "or":
                            c_text = c_text.replace("Average rainfall", "ହାରାହାରି ବୃଷ୍ଟିପାତ").replace("exceeds flood risk threshold", "ବନ୍ୟା ବିପଦ ସୀମା ଅତିକ୍ରମ କରେ").replace("is below drought threshold", "ମରୁଡ଼ି ସୀମାଠାରୁ କମ୍ ଅଟେ").replace("mm/week", "ମିମି/ସପ୍ତାହ")
                    elif "Maximum temperature" in c_text and "exceeds heat stress threshold" in c_text:
                        if language == "hi":
                            c_text = c_text.replace("Maximum temperature", "अधिकतम तापमान").replace("exceeds heat stress threshold", "गर्मी तनाव सीमा से अधिक है")
                        elif language == "ta":
                            c_text = c_text.replace("Maximum temperature", "அதிகபட்ச வெப்பநிலை").replace("exceeds heat stress threshold", "வெப்ப அழுத்த வரம்பை விட அதிகமாக உள்ளது")
                        elif language == "te":
                            c_text = c_text.replace("Maximum temperature", "గరిష్ట ఉష్ణోగ్రత").replace("exceeds heat stress threshold", "వేడి ఒత్తిడి పరిమితిని మించిపోయింది")
                        elif language == "kn":
                            c_text = c_text.replace("Maximum temperature", "ಗರಿಷ್ಠ ತಾಪಮಾನ").replace("exceeds heat stress threshold", "ಶಾಖದ ಒತ್ತಡದ ಮಿತಿಯನ್ನು ಮೀರಿದೆ")
                        elif language == "ml":
                            c_text = c_text.replace("Maximum temperature", "പരമാവധി താപനില").replace("exceeds heat stress threshold", "താപ സമ്മർദ്ദ പരിധി കവിയുന്നു")
                        elif language == "pa":
                            c_text = c_text.replace("Maximum temperature", "ਵੱਧ ਤੋਂ ਵੱਧ ਤਾਪਮਾਨ").replace("exceeds heat stress threshold", "ਗਰਮੀ ਦੇ ਤਣਾਅ ਦੀ ਸੀਮਾ ਤੋਂ ਵੱਧ ਹੈ")
                        elif language == "or":
                            c_text = c_text.replace("Maximum temperature", "ସର୍ବାଧିକ ତାପମାତ୍ରା").replace("exceeds heat stress threshold", "ତାପ ଚାପ ସୀମା ଅତିକ୍ରମ କରେ")
                    p["cause"] = c_text

            # 4. Irrigation
            if irrigation.get("recommendation"):
                rec = irrigation["recommendation"]
                if "Maintain 5 cm standing water" in rec:
                    if language == "hi":
                        rec = rec.replace("Maintain 5 cm standing water. Intermittent flooding is acceptable.", "5 सेमी खड़ा पानी बनाए रखें। रुक-रुक कर जलभराव स्वीकार्य है।")
                    elif language == "ta":
                        rec = rec.replace("Maintain 5 cm standing water. Intermittent flooding is acceptable.", "5 செ.மீ தேங்கிய தண்ணீரை பராமரிக்கவும். இடைப்பட்ட வெள்ளம் ஏற்கத்தக்கது.")
                    elif language == "te":
                        rec = rec.replace("Maintain 5 cm standing water. Intermittent flooding is acceptable.", "5 సెం.మీ నిలిచిన నీటిని నిర్వహించండి. అడపాదడపా నీరు నిలవడం ఆమోదయోగ్యమే.")
                    elif language == "kn":
                        rec = rec.replace("Maintain 5 cm standing water. Intermittent flooding is acceptable.", "5 ಸೆಂ.ಮೀ ನಿಂತ ನೀರನ್ನು ಕಾಪಾಡಿಕೊಳ್ಳಿ. ಮಧ್ಯಂತರ ಪ್ರವಾಹವು ಸ್ವೀಕಾರಾರ್ಹವಾಗಿದೆ.")
                    elif language == "ml":
                        rec = rec.replace("Maintain 5 cm standing water. Intermittent flooding is acceptable.", "5 സെ.മീ കെട്ടിക്കിടക്കുന്ന വെള്ളം നിലനിർത്തുക. ഇടയ്ക്കിടെയുള്ള വെള്ളപ്പൊക്കം സ്വീകാര്യമാണ്.")
                    elif language == "pa":
                        rec = rec.replace("Maintain 5 cm standing water. Intermittent flooding is acceptable.", "5 ਸੈਂਟੀਮੀਟਰ ਖੜ੍ਹਾ ਪਾਣੀ ਬਣਾਈ ਰੱਖੋ। ਰੁਕ-ਰੁਕ ਕੇ ਪਾਣੀ ਭਰਨਾ ਸਵੀਕਾਰਯੋਗ ਹੈ।")
                    elif language == "or":
                        rec = rec.replace("Maintain 5 cm standing water. Intermittent flooding is acceptable.", "୫ ସେମି ଠିଆ ପାଣି ବଜାୟ ରଖନ୍ତୁ | ମଝିରେ ମଝିରେ ବନ୍ୟା ଗ୍ରହଣୀୟ ଅଟେ |")
                if "Current rainfall" in rec:
                    if language == "hi":
                        rec = rec.replace("Current rainfall", "वर्तमान वर्षा").replace("exceeds the", "सीमा से अधिक है (").replace("flood threshold — check drainage and avoid additional irrigation.", "बाढ़ सीमा) — जल निकासी की जांच करें और अतिरिक्त सिंचाई से बचें।").replace("is below the", "सीमा से कम है (").replace("threshold — supplemental irrigation is likely needed.", "सीमा) — पूरक सिंचाई की आवश्यकता हो सकती है।")
                    elif language == "ta":
                        rec = rec.replace("Current rainfall", "தற்போதைய மழை").replace("flood threshold — check drainage and avoid additional irrigation.", "வெள்ள வரம்பை மீறுகிறது — வடிகால் சரிபார்த்து கூடுதல் பாசனத்தை தவிர்க்கவும்.")
                    elif language == "te":
                        rec = rec.replace("Current rainfall", "ప్రస్తుత వర్షపాతం").replace("flood threshold — check drainage and avoid additional irrigation.", "వరద పరిమితిని మించుతుంది — డ్రైనేజీని తనిਖీ చేయండి మరియు అదనపు నీటిపారుదలని నివారించండి.")
                    elif language == "kn":
                        rec = rec.replace("Current rainfall", "ಪ್ರಸ್ತುತ ಮಳೆ").replace("flood threshold — check drainage and avoid additional irrigation.", "ಪ್ರವಾಹ ಮಿತಿಯನ್ನು ಮೀರಿದೆ — ಒಳಚರಂಡಿಯನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಹೆಚ್ಚುವರಿ ನೀರಾವರಿ ತಪ್ಪಿಸಿ.")
                    elif language == "ml":
                        rec = rec.replace("Current rainfall", "നിലവിലെ മഴ").replace("flood threshold — check drainage and avoid additional irrigation.", "വെള്ളപ്പൊക്ക പരിധി കവിയുന്നു — ഡ്രെയിനേജ് പരിശോധിച്ച് അധിക ജലസേചനം ഒഴിവാക്കുക.")
                    elif language == "pa":
                        rec = rec.replace("Current rainfall", "ਮੌਜੂਦਾ ਵਰਖਾ").replace("flood threshold — check drainage and avoid additional irrigation.", "ਹੜ੍ਹ ਦੀ ਸੀਮਾ ਤੋਂ ਵੱਧ ਹੈ — ਨਿਕਾਸੀ ਦੀ ਜਾਂਚ ਕਰੋ ਅਤੇ ਵਾਧੂ ਸਿੰਚਾਈ ਤੋਂ ਬਚੋ।")
                    elif language == "or":
                        rec = rec.replace("Current rainfall", "ବର୍ତ୍ତମାନର ବୃଷ୍ଟିପାତ").replace("flood threshold — check drainage and avoid additional irrigation.", "ବନ୍ୟା ସୀମା ଅତିକ୍ରମ କରେ — ଡ୍ରେନେଜ୍ ଯାଞ୍ଚ କରନ୍ତୁ ଏବଂ ଅଧିକ ଜଳସେଚନରୁ ଦୂରେଇ ରୁହନ୍ତୁ |")
                    rain_unit = {
                        "hi": "मिमी/सप्ताह", "ta": "மி.மீ/வாரம்", "te": "మి.మీ/వారం",
                        "kn": "ಮಿ.ಮೀ/ವಾರ", "ml": "മി.മീ/ആഴ്ച", "pa": "ਮਿਲੀਮੀਟਰ/ਹਫ਼ਤਾ", "or": "ମିମି/ସପ୍ତାହ"
                    }.get(language, "mm/week")
                    rec = rec.replace("mm/week", rain_unit)
                irrigation["recommendation"] = rec
            if irrigation.get("weather_context"):
                ctx = irrigation["weather_context"]
                if "30-day avg rainfall:" in ctx:
                    if language == "hi":
                        ctx = ctx.replace("30-day avg rainfall:", "30-दिवसीय औसत वर्षा:").replace("mm/week from NASA POWER", "मिमी/सप्ताह, नासा पावर से")
                    elif language == "ta":
                        ctx = ctx.replace("30-day avg rainfall:", "30 நாள் சராசரி மழை:").replace("mm/week from NASA POWER", "மி.மீ/வாரம், NASA POWER")
                    elif language == "te":
                        ctx = ctx.replace("30-day avg rainfall:", "30 రోజుల సగటు వర్షపాతం:").replace("mm/week from NASA POWER", "మి.మీ/వారం, NASA POWER")
                    elif language == "kn":
                        ctx = ctx.replace("30-day avg rainfall:", "30-ದಿನಗಳ ಸರಾಸರಿ ಮಳೆ:").replace("mm/week from NASA POWER", "ಮಿ.ಮೀ/ವಾರ, NASA POWER")
                    elif language == "ml":
                        ctx = ctx.replace("30-day avg rainfall:", "30 ദിവസത്തെ ശരാശരി മഴ:").replace("mm/week from NASA POWER", "മി.മീ/ആഴ്ച, NASA POWER")
                    elif language == "pa":
                        ctx = ctx.replace("30-day avg rainfall:", "30-ਦਿਨਾਂ ਦੀ ਔਸਤ ਵਰਖਾ:").replace("mm/week from NASA POWER", "ਮਿਲੀਮੀਟਰ/ਹਫ਼ਤਾ, ਨਾਸਾ ਪਾਵਰ")
                    elif language == "or":
                        ctx = ctx.replace("30-day avg rainfall:", "୩୦-ଦିନିଆ ହାରାହାରି ବୃଷ୍ଟିପାତ:").replace("mm/week from NASA POWER", "ମିମି/ସପ୍ତାହ, ନାସା ପାୱାର")
                irrigation["weather_context"] = ctx

            if irrigation.get("source"):
                if language == "hi":
                    irrigation["source"] = "टीएनएयू / आईसीएआर फसल उत्पादन गाइड एवं सिंचाई अनुसूची"
                elif language == "ta":
                    irrigation["source"] = "TNAU / ICAR பயிர் உற்பத்தி வழிகாட்டி மற்றும் பாசன அட்டவணை"
                elif language == "te":
                    irrigation["source"] = "TNAU / ICAR పంట ఉత్పత్తి గైడ్ మరియు నీటిపారుదల షెడ్యూల్"
                elif language == "kn":
                    irrigation["source"] = "TNAU / ICAR ಬೆಳೆ ಉತ್ಪಾದನಾ ಮಾರ್ಗದರ್ಶಿ ಮತ್ತು ನೀರಾವರಿ ವೇಳಾಪಟ್ಟಿ"
                elif language == "ml":
                    irrigation["source"] = "TNAU / ICAR വിള ഉൽപ്പാദന ഗൈഡും ജലസേചന ഷെഡ്യൂളും"
                elif language == "pa":
                    irrigation["source"] = "TNAU / ICAR ਫ਼ਸਲ ਉਤਪਾਦਨ ਗਾਈਡ ਅਤੇ ਸਿੰਚਾਈ ਅਨੁਸੂਚੀ"
                elif language == "or":
                    irrigation["source"] = "TNAU / ICAR ଫସଲ ଉତ୍ପାଦନ ନିର୍ଦ୍ଦେଶିକା ଏବଂ ଜଳସେଚନ କାର୍ଯ୍ୟସୂଚୀ"
                else:
                    irrigation["source"] = _translate_text(irrigation["source"], language)

            if irrigation.get("note"):
                irrigation["note"] = _translate_text(irrigation["note"], language)
            if irrigation.get("current_stage"):
                irrigation["current_stage"] = _translate_text(irrigation["current_stage"], language)

            # 5. Fertiliser
            if fertiliser.get("recommendation"):
                fertiliser["recommendation"] = _translate_text(fertiliser["recommendation"], language)
            if fertiliser.get("organic_manure"):
                fertiliser["organic_manure"] = _translate_text(fertiliser["organic_manure"], language)
            if fertiliser.get("soil_test_note"):
                fertiliser["soil_test_note"] = _translate_text(fertiliser["soil_test_note"], language)
            if fertiliser.get("source"):
                if language == "hi":
                    fertiliser["source"] = "आईसीएआर / टीएनएयू फसल उत्पादन गाइड एवं उर्वरक अनुसूची"
                elif language == "ta":
                    fertiliser["source"] = "ICAR / TNAU பயிர் உற்பத்தி வழிகாட்டி மற்றும் உர அட்டவணை"
                elif language == "te":
                    fertiliser["source"] = "ICAR / TNAU పంట ఉత్పత్తి గైడ్ మరియు ఎరువుల షెడ్యూల్"
                elif language == "kn":
                    fertiliser["source"] = "ICAR / TNAU ಬೆಳೆ ಉತ್ಪಾದನಾ ಮಾರ್ಗದರ್ಶಿ ಮತ್ತು ರಸಗೊಬ್ಬರ ವೇಳಾಪಟ್ಟಿ"
                elif language == "ml":
                    fertiliser["source"] = "ICAR / TNAU വിള ഉൽപ്പാദന ഗൈഡും വളപ്രയോഗ ഷെഡ്യൂളും"
                elif language == "pa":
                    fertiliser["source"] = "ICAR / TNAU ਫ਼ਸਲ ਉਤਪਾਦਨ ਗਾਈਡ ਅਤੇ ਖਾਦ ਅਨੁਸੂਚੀ"
                elif language == "or":
                    fertiliser["source"] = "ICAR / TNAU ଫସଲ ଉତ୍ପାଦନ ନିର୍ଦ୍ଦେଶିକା ଏବଂ ସାର କାର୍ଯ୍ୟସୂଚୀ"
                else:
                    fertiliser["source"] = _translate_text(fertiliser["source"], language)
            if fertiliser.get("note"):
                fertiliser["note"] = _translate_text(fertiliser["note"], language)
            if fertiliser.get("current_stage"):
                fertiliser["current_stage"] = _translate_text(fertiliser["current_stage"], language)

            # 6. Vegetation
            has_stress = any(f.get("id") in ("drought", "heat") for f in stress_flags) if stress_flags else False
            if vegetation.get("interpretation"):
                if language == "hi":
                    vegetation["interpretation"] = (
                        "एनडीवीआई उपग्रह छवि प्राप्त की गई। स्थानिक वनस्पति पैटर्न के लिए एनडीवीआई परत देखें। "
                        + ("मौसम डेटा संभावित तनाव स्थितियों को दर्शाता है — कम मान वाले क्षेत्रों के लिए एनडीवीआई की जांच करें।"
                           if has_stress else
                           "कोई बड़ा मौसम तनाव सक्रिय नहीं है। विसंगतियों के लिए मौसमी आधार रेखा से एनडीवीआई की तुलना करें।")
                    )
                elif language == "ta":
                    vegetation["interpretation"] = (
                        "NDVI செயற்கைக்கோள் படம் பெறப்பட்டது. இடஞ்சார்ந்த தாவர அமைப்புகளுக்கு NDVI அடுக்கைப் பார்க்கவும். "
                        + ("வானிலை தரவு சாத்தியமான அழுத்த நிலைகளைக் குறிக்கிறது — குறைந்த மதிப்புள்ள பகுதிகளுக்கு NDVI ஐ சரிபார்க்கவும்."
                           if has_stress else
                           "முக்கிய வானிலை அழுத்தக் குறிகள் எதுவும் செயலில் இல்லை. முரண்பாடுகளுக்கு NDVI ஐ பருவகால அடிப்படையுடன் ஒப்பிடவும்.")
                    )
                elif language == "te":
                    vegetation["interpretation"] = (
                        "NDVI ఉపగ్రహ చిత్రం పొందబడింది. ప్రాదేశిక వృక్షసంపద నమూనాల కోసం NDVI పొరను చూడండి. "
                        + ("వాతావరణ డేటా ఒత్తిడి పరిస్థితులను సూచిస్తుంది — తక్కువ విలువ గల ప్రాంతాల కోసం NDVIని తనిఖీ చేయండి."
                           if has_stress else
                           "ఎటువంటి ముఖ్యమైన వాతావరణ ఒత్తిడి లేదు. వ్యత్యాసాల కోసం NDVIని కాలానుగుణ బేస్‌లైన్‌తో పోల్చండి.")
                    )
                elif language == "kn":
                    vegetation["interpretation"] = (
                        "NDVI ಉಪಗ್ರಹ ಚಿತ್ರವನ್ನು ಪಡೆಯಲಾಗಿದೆ. ಪ್ರಾದೇಶಿಕ ಸಸ್ಯವರ್ಗದ ಮಾದರಿಗಳಿಗಾಗಿ NDVI ಲೇಯರ್ ನೋಡಿ. "
                        + ("ಹವಾಮಾನ ದತ್ತಾಂಶವು ಸಂಭಾವ್ಯ ಒತ್ತಡದ ಪರಿಸ್ಥಿತಿಗಳನ್ನು ಸೂಚಿಸುತ್ತದೆ — ಕಡಿಮೆ ಮೌಲ್ಯದ ಪ್ರದೇಶಗಳಿಗಾಗಿ NDVI ಪರಿಶೀಲಿಸಿ."
                           if has_stress else
                           "ಯಾವುದೇ ಪ್ರಮುಖ ಹವಾಮಾನ ಒತ್ತಡ ಸಕ್ರಿಯವಾಗಿಲ್ಲ. ವ್ಯತ್ಯಾಸಗಳಿಗಾಗಿ ಕಾಲೋಚಿತ ಬೇಸ್‌ಲೈನ್‌ಗೆ NDVI ಹೋಲಿಸಿ.")
                    )
                elif language == "ml":
                    vegetation["interpretation"] = (
                        "NDVI ഉപഗ്രഹ ചിത്രം ലഭ്യമാക്കി. സസ്യങ്ങളുടെ വിതരണം കാണാൻ NDVI ലെയർ പരിശോധിക്കുക. "
                        + ("കാലാവസ്ഥാ ഡാറ്റ സമ്മർദ്ദാവസ്ഥയെ സൂചിപ്പിക്കുന്നു — കുറഞ്ഞ മൂല്യമുള്ള പ്രദേശങ്ങൾക്കായി NDVI പരിശോധിക്കുക."
                           if has_stress else
                           "പ്രത്യേക കാലാവസ്ഥാ സമ്മർദ്ദങ്ങളൊന്നുമില്ല. വ്യതിയാനങ്ങൾക്കായി NDVI പരിശോധിക്കുക.")
                    )
                elif language == "pa":
                    vegetation["interpretation"] = (
                        "NDVI ਉਪਗ੍ਰਹਿ ਤਸਵੀਰ ਪ੍ਰਾਪਤ ਕੀਤੀ ਗਈ। ਸਥਾਨਿਕ ਬਨਸਪਤੀ ਪੈਟਰਨਾਂ ਲਈ NDVI ਪਰਤ ਦੇਖੋ। "
                        + ("ਮੌਸਮ ਡੇਟਾ ਤਣਾਅ ਦੇ ਹਾਲਾਤ ਦਰਸਾਉਂਦਾ ਹੈ — ਘੱਟ ਮੁੱਲ ਵਾਲੇ ਖੇਤਰਾਂ ਲਈ NDVI ਦੀ ਜਾਂਚ ਕਰੋ।"
                           if has_stress else
                           "ਕੋਈ ਵੱਡਾ ਮੌਸਮ ਤਣਾਅ ਕਿਰਿਆਸ਼ੀਲ ਨਹੀਂ ਹੈ। ਵਿਗਾੜਾਂ ਲਈ ਮੌਸਮੀ ਅਧਾਰ ਰੇਖਾ ਨਾਲ NDVI ਦੀ ਤੁਲਨਾ ਕਰੋ।")
                    )
                elif language == "or":
                    vegetation["interpretation"] = (
                        "NDVI ଉପଗ୍ରହ ଚିତ୍ର ପ୍ରାପ୍ତ ହୋଇଛି | ସ୍ଥାନୀୟ ଉଦ୍ଭିଦ ଢାଞ୍ଚା ପାଇଁ NDVI ସ୍ତର ଦେଖନ୍ତୁ | "
                        + ("ପାଣିପାଗ ତଥ୍ୟ ଚାପ ସ୍ଥିତିକୁ ସୂଚିତ କରେ — କମ୍ ମୂଲ୍ୟ ଥିବା କ୍ଷେତ୍ରଗୁଡିକ ପାଇଁ NDVI ଯାଞ୍ଚ କରନ୍ତୁ |"
                           if has_stress else
                           "କୌଣସି ପ୍ରମୁଖ ପାଣିପାଗ ଚାପ ସକ୍ରିୟ ନାହିଁ | ତ୍ରୁଟି ପାଇଁ ଋତୁକାଳୀନ ଆଧାର ରେଖା ସହିତ NDVI ତୁଳନା କରନ୍ତୁ |")
                    )
                else:
                    vegetation["interpretation"] = _translate_text(vegetation["interpretation"], language)
            if vegetation.get("limitations"):
                vegetation["limitations"] = _translate_text(vegetation["limitations"], language)
        except Exception as e:
            logger.warning("Error localizing crop report: %s", e)

    disclaimer = (
        "This report is generated from agronomic calendars and available environmental data. "
        "It is not a substitute for field inspection or expert agricultural advice. "
        "Confirm all recommendations with your local Krishi Vigyan Kendra or extension officer."
    )
    if language and language != "en":
        disclaimer = _translate_text(disclaimer, language)

    data_sources = _data_sources_used(weather_summary, soil_props, ndvi_available)
    if language and language != "en":
        for s in data_sources:
            s["name"] = _translate_text(s["name"], language)
            s["note"] = _translate_text(s["note"], language)

    return {
        "crop": crop,
        "variety": variety or _translate_text("Not specified", language),
        "sowing_date": sowing_date_str,
        "report_date": date.today().isoformat(),
        "growth_stage": growth_stage,
        "harvest_estimate": harvest_estimate,
        "vegetation_condition": vegetation,
        "stress_flags": stress_flags,
        "problems_and_remedies": problems,
        "irrigation_recommendation": irrigation,
        "fertiliser_recommendation": fertiliser,
        "nearby_suppliers": SUPPLIER_PLACEHOLDER,
        "data_sources": data_sources,
        "language": language,
        "disclaimer": disclaimer,
    }


def _compute_growth_stage(calendar: dict | None, sowing_date_str: str) -> dict:
    if not calendar:
        return {"available": False, "reason": "Crop calendar not available for this crop type."}
    try:
        sowing = date.fromisoformat(sowing_date_str)
    except ValueError:
        return {"available": False, "reason": "Invalid sowing date format."}

    das = (date.today() - sowing).days
    if das < 0:
        return {"available": False, "reason": "Sowing date is in the future."}

    total = calendar["total_days"]
    progress_pct = min(100, round(das / total * 100))

    active = None
    for stage in calendar["stages"]:
        if stage["start"] <= das <= stage["end"]:
            active = stage
            break
    if active is None and das > total:
        active = calendar["stages"][-1]

    days_remaining = max(0, total - das)

    return {
        "available": True,
        "days_after_sowing": das,
        "total_crop_duration_days": total,
        "progress_pct": progress_pct,
        "current_stage": active["name"] if active else "Beyond expected harvest",
        "stage_key": active["key"] if active else "harvest",
        "days_remaining_to_harvest": days_remaining,
        "source": calendar.get("source", "TNAU / ICAR crop calendar"),
        "data_kind": "calculated",
        "confidence": "high" if active else "low",
        "note": (
            f"Based on sowing date {sowing_date_str} and published {calendar.get('source', 'TNAU')} "
            f"phenology for {das}-day duration crop. "
            "Actual stage may vary by 5–10 days depending on variety, temperature, and local conditions."
        ),
    }


def _compute_harvest_estimate(calendar: dict | None, sowing_date_str: str) -> dict:
    if not calendar:
        return {"available": False}
    try:
        sowing = date.fromisoformat(sowing_date_str)
    except ValueError:
        return {"available": False, "reason": "Invalid sowing date."}

    total = calendar["total_days"]
    estimated_harvest = sowing + timedelta(days=total)
    # ±7 day uncertainty range
    earliest = (sowing + timedelta(days=total - 7)).isoformat()
    latest   = (sowing + timedelta(days=total + 7)).isoformat()

    das = (date.today() - sowing).days
    days_remaining = max(0, total - das)

    return {
        "available": True,
        "estimated_harvest_date": estimated_harvest.isoformat(),
        "earliest": earliest,
        "latest": latest,
        "days_remaining": days_remaining,
        "basis": (
            f"Estimate based on published total duration of {total} days for this crop type "
            f"(source: {calendar.get('source', 'TNAU / ICAR')}). "
            "The ±7-day range accounts for variety differences and local climate variation."
        ),
        "uncertainty": "±7 days (variety-specific durations may differ by up to 2–3 weeks)",
        "data_kind": "estimated",
        "confidence": "medium",
        "note": (
            "If you know the specific variety, provide it for a more accurate estimate. "
            "Actual harvest date depends on weather, variety, crop health, and local conditions."
        ),
    }


def _compute_stress_flags(calendar: dict | None, weather_summary: dict | None) -> list[dict]:
    if not calendar or not weather_summary or not weather_summary.get("available"):
        return []

    flags = []
    s = weather_summary.get("summary", {})
    t_max  = s.get("max_temperature_c")
    t_avg  = s.get("avg_temperature_c")
    rain   = s.get("total_rainfall_mm")
    humid  = s.get("avg_humidity_pct")
    days   = s.get("period_days", 30)
    rain_per_week = (rain / (days / 7)) if rain is not None and days else None

    heat_thresh  = calendar.get("heat_stress_c")
    cold_thresh  = calendar.get("cold_stress_c")
    drought_thresh = calendar.get("drought_threshold_mm_week")
    flood_thresh   = calendar.get("flood_threshold_mm_week")

    if t_max is not None and heat_thresh and t_max >= heat_thresh:
        flags.append({
            "id": "heat", "level": "High",
            "label": f"Maximum temperature ({t_max} °C) exceeds heat stress threshold ({heat_thresh} °C).",
            "source": "NASA POWER T2M_MAX vs ICAR/TNAU threshold",
        })
    if t_avg is not None and cold_thresh and t_avg <= cold_thresh:
        flags.append({
            "id": "cold", "level": "High",
            "label": f"Average temperature ({t_avg} °C) is at or below cold stress threshold ({cold_thresh} °C).",
            "source": "NASA POWER T2M vs ICAR/TNAU threshold",
        })
    if rain_per_week is not None and drought_thresh and rain_per_week < drought_thresh:
        flags.append({
            "id": "drought", "level": "Medium",
            "label": f"Average rainfall ({rain_per_week:.1f} mm/week) is below drought threshold ({drought_thresh} mm/week).",
            "source": "NASA POWER PRECTOTCORR vs TNAU threshold",
        })
    if rain_per_week is not None and flood_thresh and rain_per_week > flood_thresh:
        flags.append({
            "id": "flood", "level": "High",
            "label": f"Average rainfall ({rain_per_week:.1f} mm/week) exceeds flood risk threshold ({flood_thresh} mm/week).",
            "source": "NASA POWER PRECTOTCORR vs TNAU threshold",
        })
    if humid is not None and humid >= 80 and t_avg is not None and 24 <= t_avg <= 30:
        flags.append({
            "id": "disease_risk", "level": "Medium",
            "label": f"High humidity ({humid}%) with temperature {t_avg} °C matches documented disease infection windows (TNAU).",
            "source": "NASA POWER RH2M + T2M vs TNAU disease calendar",
        })
    return flags


def _compute_irrigation(calendar, growth_stage, weather_summary) -> dict:
    if not calendar or not growth_stage.get("available"):
        return {
            "available": False,
            "data_kind": "unavailable",
            "reason": "Crop calendar or growth stage not available.",
        }

    stage_key = growth_stage.get("stage_key", "")
    stage_guidance = calendar.get("irrigation", {}).get(stage_key, "No specific guidance for this stage.")

    weather_context = ""
    stress_note = ""
    if weather_summary and weather_summary.get("available"):
        s = weather_summary["summary"]
        rain_week = (s.get("total_rainfall_mm", 0) / max(1, s.get("period_days", 30) / 7))
        drought_thresh = calendar.get("drought_threshold_mm_week", 10)
        flood_thresh = calendar.get("flood_threshold_mm_week", 40)
        if rain_week < drought_thresh:
            stress_note = (
                f" Current rainfall ({rain_week:.1f} mm/week) is below the {drought_thresh} mm/week "
                "threshold — supplemental irrigation is likely needed."
            )
        elif rain_week > flood_thresh:
            stress_note = (
                f" Current rainfall ({rain_week:.1f} mm/week) exceeds the {flood_thresh} mm/week "
                "flood threshold — check drainage and avoid additional irrigation."
            )
        weather_context = f" (30-day avg rainfall: {rain_week:.1f} mm/week from NASA POWER)"

    return {
        "available": True,
        "current_stage": growth_stage.get("current_stage"),
        "recommendation": stage_guidance + stress_note,
        "weather_context": weather_context,
        "source": f"TNAU / ICAR irrigation schedule for {calendar.get('source', 'this crop')}",
        "data_kind": "calculated",
        "confidence": "medium",
        "note": (
            "Recommendation is based on published stage-specific guidelines and available weather data. "
            "Adjust based on local soil type, drainage, and field observation."
        ),
    }


def _compute_fertiliser(calendar, growth_stage, soil_props) -> dict:
    if not calendar or not growth_stage.get("available"):
        return {
            "available": False,
            "data_kind": "unavailable",
            "reason": "Crop calendar or growth stage not available.",
        }

    stage_key = growth_stage.get("stage_key", "")
    stage_guidance = calendar.get("fertiliser", {}).get(stage_key, "No specific guidance for this stage.")

    soil_note = ""
    soil_test_needed = True
    if soil_props and soil_props.get("available"):
        ph = soil_props.get("properties", {}).get("phh2o", {}).get("surface_value")
        soc = soil_props.get("properties", {}).get("soc", {}).get("surface_value")
        if ph is not None:
            if ph < 5.5:
                soil_note += f" Soil pH is acidic ({ph}). Lime application may be needed before fertilising."
            elif ph > 7.5:
                soil_note += f" Soil pH is alkaline ({ph}). Consider sulphur amendment and prefer ammonium-based fertilisers."
        if soc is not None and soc < 5:
            soil_note += " Low organic carbon detected — incorporate FYM or compost to improve soil health."
        soil_test_needed = False

    return {
        "available": True,
        "current_stage": growth_stage.get("current_stage"),
        "recommendation": stage_guidance + soil_note,
        "soil_test_needed": soil_test_needed,
        "soil_test_note": (
            "SoilGrids estimates are used here (250 m modelled data). "
            "For precise dosage, obtain a laboratory soil test from your local KVK."
        ) if not soil_test_needed else (
            "Soil data not available. Conduct a laboratory soil test before applying fertilisers. "
            "Contact your nearest Krishi Vigyan Kendra (KVK) for free testing."
        ),
        "organic_manure": (
            "Apply 5–10 t/ha of well-composted farmyard manure (FYM) before sowing "
            "to improve soil structure and nutrient availability. "
            "Green manuring with Dhaincha (Sesbania) is recommended where feasible."
        ),
        "source": f"ICAR / TNAU fertiliser schedule for {calendar.get('source', 'this crop')}",
        "data_kind": "calculated",
        "confidence": "medium" if not soil_test_needed else "low",
        "note": (
            "Quantities are standard recommendations from published guidelines. "
            "Exact doses depend on soil test results, variety, and expected yield. "
            "Do not infer nutrient deficiencies from satellite imagery alone."
        ),
    }


def _compute_vegetation(ndvi_available: bool, stress_flags: list) -> dict:
    if not ndvi_available:
        return {
            "available": False,
            "data_kind": "unavailable",
            "reason": (
                "No satellite NDVI image is available for this field. "
                "Provide Copernicus credentials and confirm the field location to enable satellite analysis."
            ),
        }

    has_stress = any(f["id"] in ("drought", "heat") for f in stress_flags)
    return {
        "available": True,
        "data_kind": "satellite",
        "confidence": "medium",
        "interpretation": (
            "NDVI image acquired. See the NDVI layer for spatial vegetation patterns. "
            + ("Weather data indicates possible stress conditions — check NDVI for low-value areas."
               if has_stress else
               "No major weather stress flags active. Compare NDVI to seasonal baseline for anomalies.")
        ),
        "limitations": (
            "NDVI indicates vegetation greenness, not a specific disease, pest, or nutrient deficiency. "
            "Low NDVI can result from drought, heat, disease, poor establishment, or soil exposure. "
            "Always validate anomalies with field inspection."
        ),
    }


def _compute_problems(calendar, stress_flags, ndvi_available, growth_stage) -> list[dict]:
    problems = []
    for flag in stress_flags:
        if flag["id"] == "drought":
            problems.append({
                "issue": "Possible water stress",
                "cause": flag["label"],
                "evidence": f"NASA POWER 30-day rainfall data ({flag['source']})",
                "inspection": "Check soil moisture at 10 cm depth. Look for leaf rolling or wilting in the morning.",
                "remedy": "Irrigate according to the stage-specific recommendation above.",
                "confidence": "medium",
            })
        elif flag["id"] == "flood":
            problems.append({
                "issue": "Possible waterlogging",
                "cause": flag["label"],
                "evidence": f"NASA POWER rainfall ({flag['source']})",
                "inspection": "Inspect field drainage channels. Check for yellowing of lower leaves.",
                "remedy": "Open drainage channels immediately. Avoid further irrigation.",
                "confidence": "medium",
            })
        elif flag["id"] == "heat":
            problems.append({
                "issue": "Possible heat stress",
                "cause": flag["label"],
                "evidence": f"NASA POWER maximum temperature ({flag['source']})",
                "inspection": "Look for leaf bleaching, tip burn, or poor pollination at flowering.",
                "remedy": "Evening irrigation can reduce canopy temperature. Avoid spraying during peak heat.",
                "confidence": "medium",
            })
        elif flag["id"] == "disease_risk":
            problems.append({
                "issue": "Elevated disease risk (humidity + temperature window)",
                "cause": flag["label"],
                "evidence": f"NASA POWER humidity and temperature ({flag['source']})",
                "inspection": (
                    "Scout for leaf spots, blight symptoms, or unusual discolouration. "
                    "Use the Disease Detection engine to photograph and analyse affected leaves."
                ),
                "remedy": (
                    "Confirm disease identity before applying fungicide. "
                    "Consult your agricultural extension officer or KVK."
                ),
                "confidence": "low",
                "important_note": (
                    "High humidity and temperature create conditions favourable to disease but "
                    "do NOT confirm the presence of disease. Field inspection is required."
                ),
            })
    if not problems:
        problems.append({
            "issue": "No stress-triggered problems identified",
            "cause": "No weather thresholds exceeded in the 30-day NASA POWER data.",
            "evidence": "NASA POWER weather summary",
            "inspection": "Continue routine field scouting every 5–7 days.",
            "remedy": "No remedial action required at this time.",
            "confidence": "medium",
        })
    return problems


def _data_sources_used(weather_summary, soil_props, ndvi_available) -> list[dict]:
    sources = [
        {
            "name": "TNAU / ICAR Crop Calendar",
            "used": True,
            "type": "calculated",
            "note": "Growth stage, harvest estimate, irrigation and fertiliser guidance.",
        },
        {
            "name": "NASA POWER Daily Climate API",
            "used": weather_summary is not None and weather_summary.get("available", False),
            "type": "measured",
            "note": "30-day rainfall, temperature, humidity (~55 km resolution).",
        },
        {
            "name": "SoilGrids v2.0 (ISRIC)",
            "used": soil_props is not None and soil_props.get("available", False),
            "type": "modelled",
            "note": "Soil pH, organic carbon, texture (250 m modelled estimates).",
        },
        {
            "name": "Copernicus Sentinel-2 NDVI",
            "used": ndvi_available,
            "type": "satellite",
            "note": "Field-level vegetation index (10 m resolution).",
        },
    ]
    return sources
