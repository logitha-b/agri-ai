"""
Unified Crop Recommendation Engine.

Orchestrates data from all existing engines to produce an explainable,
multi-dimensional crop comparison for a given farm profile.

Data sources used:
  - NASA POWER weather (GET /api/health/weather)      — real 30-day climate
  - IMD district rainfall (GET /api/water/rainfall)   — real district data
  - Flood risk (estimate_flood_risk)                  — rules-based
  - Nearby dams (dam_data.dams_near)                  — static inventory
  - Soil nutrients (soil_nutrients)                   — Soil Health Card
  - Production yield (ml/predict or ICRISAT CSV)      — ICRISAT 1978-2017
  - AGMARKNET market prices (local JSON)              — snapshot 2026-10-13
  - Crop calendars (crop_report.CROP_CALENDARS)       — TNAU/ICAR

Scoring methodology (documented, configurable):
  Each crop is evaluated on 5 dimensions, each 0-100:
    agronomic    — soil suitability + weather suitability + water fit
    flood_risk   — lower risk = higher score
    yield_hist   — historical district yield relative to crop average
    market       — recent modal price relative to cost-of-cultivation estimate
    economics    — estimated net return vs investment capacity

  Final score = weighted mean (weights in DIMENSION_WEIGHTS below).
  Crops failing hard constraints (wrong season, investment exceeds budget
  by >50%) are filtered out before scoring.

Honest labelling:
  Every output field carries a 'data_kind':
    'measured'   — real observation from identified source
    'calculated' — derived from data using published rules
    'estimated'  — model or approximation with stated uncertainty
    'sample'     — illustrative placeholder (mocked)
    'unavailable'— no supporting data; no value fabricated

All yield and profit figures explicitly state assumptions and uncertainty.
"""

from __future__ import annotations

import json
import statistics
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]

# ── Configuration ──────────────────────────────────────────────────────────────

# Scoring weights — must sum to 1.0
DIMENSION_WEIGHTS = {
    "agronomic":  0.30,   # soil + weather + water suitability
    "flood_risk": 0.15,   # lower flood exposure
    "yield_hist": 0.20,   # historical yield potential
    "market":     0.20,   # market price attractiveness
    "economics":  0.15,   # estimated net return vs budget
}
assert abs(sum(DIMENSION_WEIGHTS.values()) - 1.0) < 1e-9

# Candidate crops — must match CROP_CALENDARS keys and PRODUCTION_CROP_MAP
CANDIDATE_CROPS = ["Paddy", "Groundnut", "Maize", "Tomato", "Millet"]

# Map from our crop name → ICRISAT training CSV crop name
PRODUCTION_CROP_MAP = {
    "Paddy":     "Rice",
    "Groundnut": "Groundnut",
    "Maize":     "Maize",
    "Tomato":    None,           # not in ICRISAT dataset
    "Millet":    "Pearl Millet",
}

# Map from our crop name → AGMARKNET commodity name(s)
MARKET_COMMODITY_MAP = {
    "Paddy":     ["Paddy(Common)", "Paddy(Basmati)"],
    "Groundnut": ["Groundnut"],
    "Maize":     ["Maize"],
    "Tomato":    ["Tomato"],
    "Millet":    ["Bajra(Pearl Millet/Cumbu)", "Ragi(Finger Millet)"],
}

# Season compatibility: which seasons each crop is grown in
SEASON_COMPAT = {
    "Paddy":     ["Kharif", "Rabi"],
    "Groundnut": ["Kharif", "Rabi"],
    "Maize":     ["Kharif", "Rabi"],
    "Tomato":    ["Kharif", "Rabi", "Summer"],
    "Millet":    ["Kharif"],
}

# Reference crop water requirements (mm/season) — ICAR/FAO
WATER_REQUIREMENTS_MM = {
    "Paddy":     1200,
    "Groundnut": 500,
    "Maize":     500,
    "Tomato":    400,
    "Millet":    350,
}

# Irrigation method adequacy by crop (1=adequate, 0.7=marginal, 0.4=poor)
IRRIGATION_SCORES = {
    "Paddy":     {"Borewell": 1.0, "Canal": 1.0, "Drip irrigation": 0.7, "Sprinkler": 0.7, "Rain-fed": 0.4, "Tank / pond": 0.9, "River lift": 1.0},
    "Groundnut": {"Borewell": 1.0, "Canal": 1.0, "Drip irrigation": 1.0, "Sprinkler": 0.9, "Rain-fed": 0.7, "Tank / pond": 0.9, "River lift": 1.0},
    "Maize":     {"Borewell": 1.0, "Canal": 1.0, "Drip irrigation": 1.0, "Sprinkler": 1.0, "Rain-fed": 0.6, "Tank / pond": 0.9, "River lift": 1.0},
    "Tomato":    {"Borewell": 1.0, "Canal": 0.9, "Drip irrigation": 1.0, "Sprinkler": 0.8, "Rain-fed": 0.3, "Tank / pond": 0.8, "River lift": 1.0},
    "Millet":    {"Borewell": 0.9, "Canal": 0.9, "Drip irrigation": 0.9, "Sprinkler": 0.8, "Rain-fed": 0.9, "Tank / pond": 0.8, "River lift": 0.9},
}

# Water availability modifier
WATER_AVAIL_SCORES = {"Adequate": 1.0, "Moderate": 0.75, "Limited": 0.4}

# Soil type suitability per crop (0–1, ICAR guidance)
SOIL_SUITABILITY = {
    "Paddy":     {"Clay loam": 1.0, "Black soil": 1.0, "Red soil": 0.7, "Sandy loam": 0.5},
    "Groundnut": {"Sandy loam": 1.0, "Red soil": 0.9, "Clay loam": 0.7, "Black soil": 0.6},
    "Maize":     {"Clay loam": 1.0, "Red soil": 0.9, "Sandy loam": 0.8, "Black soil": 0.8},
    "Tomato":    {"Sandy loam": 1.0, "Clay loam": 0.9, "Red soil": 0.8, "Black soil": 0.7},
    "Millet":    {"Sandy loam": 1.0, "Red soil": 1.0, "Clay loam": 0.8, "Black soil": 0.7},
}

# Reference cost-of-cultivation ₹/acre (ICAR/TNAU published estimates, Kharif 2023-24)
COST_PER_ACRE = {
    "Paddy":     32800,
    "Groundnut": 26000,
    "Maize":     22000,
    "Tomato":    45000,
    "Millet":    14000,
}

# Reference yield t/ha (district average from ICRISAT, used when live data unavailable)
FALLBACK_YIELD_T_HA = {
    "Paddy":     2.9,
    "Groundnut": 1.1,
    "Maize":     3.4,
    "Tomato":   18.0,
    "Millet":    0.9,
}

# Waterlogging sensitivity (1=very sensitive, 0=tolerant) — ICAR
WATERLOGGING_SENSITIVITY = {
    "Paddy":     0.0,   # paddy thrives in standing water
    "Groundnut": 1.0,
    "Maize":     0.8,
    "Tomato":    0.9,
    "Millet":    0.7,
}


# ── AGMARKNET market price lookup (client-side JSON) ──────────────────────────

_market_cache: list[dict] | None = None

def _load_market_data() -> list[dict]:
    global _market_cache
    if _market_cache is None:
        path = ROOT / "src" / "data" / "agmarknetMarketPrices.json"
        if path.is_file():
            _market_cache = json.loads(path.read_text(encoding="utf-8")).get("records", [])
        else:
            _market_cache = []
    return _market_cache


def _get_market_price(crop: str, state: str | None = None) -> dict[str, Any]:
    """Return best available modal price for a crop from AGMARKNET snapshot."""
    records = _load_market_data()
    commodities = MARKET_COMMODITY_MAP.get(crop, [])
    if not commodities:
        return {"available": False, "crop": crop}

    matches = [r for r in records if r["commodity"] in commodities]
    if state:
        state_matches = [r for r in matches if r.get("state", "").lower() == state.lower()]
        if state_matches:
            matches = state_matches

    if not matches:
        return {"available": False, "crop": crop, "commodities_searched": commodities}

    prices = [r["modal_price_rs_per_quintal"] for r in matches if r.get("modal_price_rs_per_quintal") is not None]
    min_prices = [r["min_price_rs_per_quintal"] for r in matches if r.get("min_price_rs_per_quintal") is not None]
    max_prices = [r["max_price_rs_per_quintal"] for r in matches if r.get("max_price_rs_per_quintal") is not None]

    if not prices:
        return {"available": False, "crop": crop}

    median_modal = round(statistics.median(prices), 0)
    dates = sorted({r.get("arrival_date", "") for r in matches if r.get("arrival_date")})

    return {
        "available":        True,
        "crop":             crop,
        "commodity":        commodities[0],
        "modal_price_rs_per_quintal": median_modal,
        "min_price_rs_per_quintal":   round(min(min_prices), 0) if min_prices else None,
        "max_price_rs_per_quintal":   round(max(max_prices), 0) if max_prices else None,
        "price_rs_per_kg":            round(median_modal / 100, 2),
        "markets_sampled":            len(matches),
        "date_range":                 f"{dates[0]} – {dates[-1]}" if len(dates) > 1 else (dates[0] if dates else "unknown"),
        "source":                     "AGMARKNET — mandi price snapshot",
        "data_kind":                  "measured",
        "note":                       "Historical mandi snapshot, not a guaranteed future price.",
    }


# ── Historical yield from ICRISAT CSV ─────────────────────────────────────────

_yield_cache: dict[str, Any] = {}

def _get_historical_yield(crop: str, state: str | None, district: str | None, season: str) -> dict[str, Any]:
    """
    Query the crop_yield_training.csv for historical yields.
    Uses a simple pandas read; results are cached per (crop, state, district, season).
    """
    icrisat_crop = PRODUCTION_CROP_MAP.get(crop)
    if not icrisat_crop:
        return {
            "available":    False,
            "crop":         crop,
            "reason":       f"{crop} is not in the ICRISAT district-level training dataset.",
            "data_kind":    "unavailable",
        }

    cache_key = f"{icrisat_crop}|{state}|{district}|{season}"
    if cache_key in _yield_cache:
        return _yield_cache[cache_key]

    csv_path = ROOT / "ml" / "data" / "processed" / "crop_yield_training.csv"
    if not csv_path.is_file():
        return {"available": False, "crop": crop, "reason": "Training CSV not found.", "data_kind": "unavailable"}

    try:
        import pandas as pd
        df = pd.read_csv(csv_path, usecols=["state", "district", "crop", "season", "year", "yield_t_ha"])
        df = df[df["crop"].str.casefold() == icrisat_crop.casefold()]

        # Map user seasons → ICRISAT season labels.
        # ICRISAT uses "Annual" for most crops in southern Indian states (TN, AP, Karnataka etc.)
        # and Kharif/Rabi only for select crops in northern states.
        # Try the user-supplied season first, then fall back to "Annual".
        season_candidates = {
            "Kharif": ["Kharif", "Annual"],
            "Rabi":   ["Rabi",   "Annual"],
            "Summer": ["Annual", "Kharif"],
        }.get(season, [season, "Annual"])

        df_season = df[df["season"].str.casefold().isin([s.casefold() for s in season_candidates])]
        icrisat_season = ", ".join(season_candidates)

        # Try district level first, then state, then all India
        df_district = df_season.copy()
        geo_level = "all-India"
        if state:
            df_state = df_season[df_season["state"].str.casefold() == state.casefold()]
            if len(df_state) >= 5:
                df_district = df_state
                geo_level = state
        if district and geo_level != "all-India":
            df_d = df_district[df_district["district"].str.casefold() == district.casefold()]
            if len(df_d) >= 3:
                df_district = df_d
                geo_level = f"{district}, {state}"

        if df_district.empty:
            result = {"available": False, "crop": crop, "reason": f"No {icrisat_crop} records for {season} in dataset.", "data_kind": "unavailable"}
            _yield_cache[cache_key] = result
            return result

        yields = df_district["yield_t_ha"].dropna()
        if yields.empty:
            result = {"available": False, "crop": crop, "reason": "No valid yield values.", "data_kind": "unavailable"}
            _yield_cache[cache_key] = result
            return result

        result = {
            "available":            True,
            "crop":                 crop,
            "icrisat_crop_name":    icrisat_crop,
            "geographic_level":     geo_level,
            "season":               icrisat_season,
            "years":                f"{int(df_district['year'].min())}–{int(df_district['year'].max())}",
            "n_observations":       len(yields),
            "mean_yield_t_ha":      round(float(yields.mean()), 3),
            "median_yield_t_ha":    round(float(yields.median()), 3),
            "min_yield_t_ha":       round(float(yields.min()), 3),
            "max_yield_t_ha":       round(float(yields.max()), 3),
            "std_yield_t_ha":       round(float(yields.std()), 3) if len(yields) > 1 else None,
            "cv_pct":               round(float(yields.std() / yields.mean() * 100), 1) if len(yields) > 1 and yields.mean() > 0 else None,
            "source":               "ICRISAT District Level Database (real observations)",
            "data_kind":            "measured",
            "note":                 (
                f"District-level historical averages ({geo_level}), "
                "not a guarantee of farm-level yield. "
                "Data ends 2017; current conditions may differ."
            ),
        }
        _yield_cache[cache_key] = result
        return result

    except Exception as exc:
        result = {"available": False, "crop": crop, "reason": str(exc), "data_kind": "unavailable"}
        _yield_cache[cache_key] = result
        return result


# ── Weather suitability per crop ───────────────────────────────────────────────

def _weather_suitability(crop: str, weather: dict | None) -> dict[str, Any]:
    """Score weather suitability 0-1 for a crop using NASA POWER summary."""
    from backend.crop_report import CROP_CALENDARS
    cal = CROP_CALENDARS.get(crop.lower())

    if not weather or not weather.get("available") or not cal:
        return {
            "score": 0.5,  # neutral when data unavailable
            "data_kind": "unavailable",
            "flags": [],
            "note": "Weather data unavailable — neutral score applied.",
        }

    s = weather.get("summary", {})
    total_rain = s.get("total_rainfall_mm")   # 30-day total
    t_avg = s.get("avg_temperature_c")
    t_max = s.get("max_temperature_c")

    flags = []
    score = 1.0

    # Heat stress
    if t_max is not None and t_max >= cal["heat_stress_c"]:
        score -= 0.2
        flags.append(f"Heat stress: max temp {t_max}°C ≥ threshold {cal['heat_stress_c']}°C (ICAR)")

    # Drought
    if total_rain is not None:
        weekly_approx = total_rain / (30 / 7)
        if weekly_approx < cal["drought_threshold_mm_week"]:
            score -= 0.25
            flags.append(f"Rainfall deficit: {weekly_approx:.1f} mm/week avg < threshold {cal['drought_threshold_mm_week']} mm/week (TNAU)")
        elif weekly_approx > cal["flood_threshold_mm_week"]:
            # Penalise waterlogging-sensitive crops
            penalty = 0.15 * WATERLOGGING_SENSITIVITY.get(crop, 0.5)
            score -= penalty
            if penalty > 0.05:
                flags.append(f"Excess rainfall: {weekly_approx:.1f} mm/week avg > {cal['flood_threshold_mm_week']} mm/week flood threshold (TNAU)")

    score = max(0.0, min(1.0, score))
    return {
        "score":      round(score, 3),
        "data_kind":  "calculated",
        "flags":      flags,
        "total_rain_30d_mm": total_rain,
        "avg_temp_c": t_avg,
        "max_temp_c": t_max,
        "source":     "NASA POWER (~55 km regional grid)",
        "note":       "Based on 30-day NASA POWER regional averages — not field-level measurement.",
    }


# ── Economics estimate ─────────────────────────────────────────────────────────

def _economics(
    crop: str,
    area_acres: float,
    yield_data: dict,
    market_data: dict,
    investment_inr: float,
) -> dict[str, Any]:
    """
    Estimate economics for a crop on a given farm.

    Returns revenue, cost, net return estimates with explicit assumptions.
    All values are estimates, not guaranteed outcomes.
    """
    acres_to_ha = 0.404686
    area_ha = area_acres * acres_to_ha

    # Yield
    if yield_data.get("available"):
        yield_t_ha = yield_data["mean_yield_t_ha"]
        yield_source = f"ICRISAT historical mean ({yield_data.get('geographic_level', 'regional')})"
        yield_kind = "measured"
    else:
        yield_t_ha = FALLBACK_YIELD_T_HA.get(crop)
        yield_source = "ICAR reference average (fallback — no ICRISAT data for this location/season)"
        yield_kind = "estimated"

    if yield_t_ha is None:
        return {
            "available":  False,
            "reason":     "No yield estimate available.",
            "data_kind":  "unavailable",
        }

    total_yield_t = yield_t_ha * area_ha

    # Revenue
    if market_data.get("available"):
        price_per_kg = market_data["price_rs_per_kg"]
        price_source = market_data["source"]
        price_kind = "measured"
    else:
        # Generic fallback — clearly labelled
        fallback_prices = {"Paddy": 22.0, "Groundnut": 65.0, "Maize": 22.0, "Tomato": 20.0, "Millet": 35.0}
        price_per_kg = fallback_prices.get(crop, 20.0)
        price_source = "Indicative reference price (no market data available)"
        price_kind = "estimated"

    revenue_inr = total_yield_t * 1000 * price_per_kg  # t → kg × ₹/kg

    # Cost
    cost_per_acre = COST_PER_ACRE.get(crop, 25000)
    total_cost_inr = cost_per_acre * area_acres
    cost_source = "ICAR/TNAU reference cost of cultivation (published estimates)"

    net_return_inr = revenue_inr - total_cost_inr
    net_per_acre = net_return_inr / area_acres if area_acres > 0 else None

    budget_ok = total_cost_inr <= investment_inr
    budget_pct = round(total_cost_inr / max(1, investment_inr) * 100, 1)

    # Economics score 0-1
    if net_return_inr > 0 and budget_ok:
        # Score based on return on investment
        roi = net_return_inr / max(1, total_cost_inr)
        econ_score = min(1.0, roi / 1.5)   # 150% ROI = full score
    elif net_return_inr > 0 and not budget_ok:
        econ_score = 0.4   # profitable but exceeds budget
    elif net_return_inr <= 0:
        econ_score = 0.1   # expected loss
    else:
        econ_score = 0.3

    return {
        "available":            True,
        "area_acres":           round(area_acres, 2),
        "area_ha":              round(area_ha, 3),
        "yield_t_ha":           round(yield_t_ha, 3),
        "yield_source":         yield_source,
        "yield_data_kind":      yield_kind,
        "total_yield_t":        round(total_yield_t, 2),
        "price_rs_per_kg":      round(price_per_kg, 2),
        "price_source":         price_source,
        "price_data_kind":      price_kind,
        "estimated_revenue_inr": round(revenue_inr, 0),
        "estimated_cost_inr":    round(total_cost_inr, 0),
        "cost_source":           cost_source,
        "estimated_net_return_inr": round(net_return_inr, 0),
        "net_return_per_acre_inr":  round(net_per_acre, 0) if net_per_acre is not None else None,
        "budget_required_inr":   round(total_cost_inr, 0),
        "budget_available_inr":  round(investment_inr, 0),
        "budget_ok":             budget_ok,
        "budget_utilisation_pct": budget_pct,
        "economics_score":       round(econ_score, 3),
        "data_kind":             "estimated",
        "assumptions": (
            f"Yield: {yield_source}. "
            f"Price: {price_source}. "
            f"Cost: {cost_source}. "
            "Revenue = total yield (kg) × price per kg. "
            "Net return = revenue − cultivation cost. "
            "Excludes post-harvest losses, transport, and market commissions."
        ),
        "disclaimer": (
            "All values are estimates with significant uncertainty. "
            "Actual yield and price depend on many factors not captured here. "
            "This is a planning estimate, not a financial guarantee."
        ),
    }


# ── Soil suitability from Soil Health Card data ────────────────────────────────

def _soil_from_nutrients(crop: str, soil_data: dict | None, form_soil_type: str | None) -> dict[str, Any]:
    """
    Combine Soil Health Card nutrient data with form-submitted soil type
    to assess soil suitability for a crop.
    """
    # Soil type suitability from form input
    soil_type_score = SOIL_SUITABILITY.get(crop, {}).get(form_soil_type or "", 0.7)
    flags = []
    nutrient_notes = []

    if soil_data and soil_data.get("available"):
        nutrients = {n["nutrient_name"]: n for n in soil_data.get("nutrients", [])}

        # pH
        ph = nutrients.get("Soil Ph")
        if ph:
            dom = ph.get("dominant_level")
            if dom == "Acidic" and crop == "Paddy":
                nutrient_notes.append("Acidic soil pH — paddy can tolerate mild acidity but may reduce P availability.")
            elif dom == "Alkaline" and crop in ("Paddy", "Groundnut"):
                flags.append(f"Alkaline pH detected — may reduce Fe/Zn availability for {crop}.")
                soil_type_score *= 0.85

        # Nitrogen
        n = nutrients.get("Nitrogen")
        if n and n.get("dominant_level") == "Low":
            flags.append("Low nitrogen — significant urea input will be required.")
            nutrient_notes.append("N-deficient soil increases fertiliser cost for N-demanding crops (Paddy, Maize).")
            if crop in ("Paddy", "Maize"):
                soil_type_score *= 0.9

        # Phosphorus
        p = nutrients.get("Phosphorus")
        if p and p.get("dominant_level") == "Low":
            nutrient_notes.append("Low phosphorus — basal P fertiliser recommended at sowing.")

        # Potassium
        k = nutrients.get("Potassium")
        if k and k.get("dominant_level") == "Low" and crop == "Paddy":
            flags.append("Low potassium — increases BLB and blast susceptibility in paddy.")

        # Electrical Conductivity
        ec = nutrients.get("Electrical Conductivity")
        if ec and ec.get("dominant_level") == "Saline":
            flags.append("Saline EC detected — reduces germination and yield in most crops.")
            soil_type_score *= 0.7
            if crop == "Tomato":
                soil_type_score *= 0.7   # tomato is especially EC-sensitive

        source = f"Soil Health Card — {soil_data.get('location', {}).get('village', 'selected area')}"
        data_kind = "measured"
    else:
        source = "Form-submitted soil type only (no Soil Health Card data matched)"
        data_kind = "estimated"

    soil_type_score = max(0.0, min(1.0, soil_type_score))

    return {
        "score":          round(soil_type_score, 3),
        "form_soil_type": form_soil_type,
        "flags":          flags,
        "nutrient_notes": nutrient_notes,
        "source":         source,
        "data_kind":      data_kind,
        "note":           "Soil type suitability from ICAR guidance. Nutrient flags from Soil Health Card (village-level survey — not a field lab test).",
    }


# ── Flood risk score ──────────────────────────────────────────────────────────

def _flood_score_for_crop(crop: str, flood_risk: dict | None) -> dict[str, Any]:
    if not flood_risk or flood_risk.get("risk_level") == "INSUFFICIENT_DATA":
        return {"score": 0.5, "data_kind": "unavailable", "note": "Flood risk data unavailable — neutral score."}

    sensitivity = WATERLOGGING_SENSITIVITY.get(crop, 0.5)
    level = flood_risk.get("risk_level", "NO_ELEVATED_RISK")

    if level == "ELEVATED_RISK":
        color = flood_risk.get("risk_color", "amber")
        base_penalty = 0.5 if color == "red" else 0.3
        score = 1.0 - base_penalty * sensitivity
    elif level == "OBSERVED_FLOODING":
        score = 1.0 - 0.8 * sensitivity
    else:
        score = 1.0 - 0.05 * sensitivity   # small residual for waterlogging sensitivity

    return {
        "score":            round(max(0.0, min(1.0, score)), 3),
        "flood_risk_level": level,
        "waterlogging_sensitivity": sensitivity,
        "data_kind":        "calculated",
        "note":             f"Flood score adjusted for {crop}'s waterlogging sensitivity ({sensitivity:.1f}).",
    }


# ── Main orchestration ─────────────────────────────────────────────────────────

def build_crop_comparison(
    profile: dict,
    weather: dict | None,
    imd_rainfall: dict | None,
    flood_risk: dict | None,
    soil_data: dict | None,
    language: str = "en",
) -> dict[str, Any]:
    """
    Build a full ranked crop comparison from all available data sources.

    profile keys:
        location (str), state (str|None), district (str|None),
        area_acres (float), soil_type (str), irrigation (str),
        water_availability (str), season (str), investment_inr (float),
        lat (float|None), lng (float|None)
    """
    season      = profile.get("season", "Kharif")
    area_acres  = float(profile.get("area_acres", 2.5))
    soil_type   = profile.get("soil_type", "")
    irrigation  = profile.get("irrigation", "")
    water_avail = profile.get("water_availability", "Moderate")
    investment  = float(profile.get("investment_inr", 75000))
    state       = profile.get("state")
    district    = profile.get("district")

    results = []

    for crop in CANDIDATE_CROPS:
        # ── Hard constraint: season compatibility ────────────────────────────
        if season not in SEASON_COMPAT.get(crop, []):
            results.append({
                "crop": crop,
                "filtered_out": True,
                "filter_reason": f"{crop} is not typically grown in the {season} season.",
            })
            continue

        # ── Hard constraint: budget ──────────────────────────────────────────
        cost_est = COST_PER_ACRE.get(crop, 25000) * area_acres
        if cost_est > investment * 1.5:
            results.append({
                "crop": crop,
                "filtered_out": True,
                "filter_reason": (
                    f"Estimated cultivation cost ₹{cost_est:,.0f} exceeds "
                    f"investment capacity ₹{investment:,.0f} by more than 50%."
                ),
            })
            continue

        # ── Gather all evidence ───────────────────────────────────────────────
        yield_data   = _get_historical_yield(crop, state, district, season)
        market_data  = _get_market_price(crop, state)
        econ         = _economics(crop, area_acres, yield_data, market_data, investment)
        weather_suit = _weather_suitability(crop, weather)
        soil_suit    = _soil_from_nutrients(crop, soil_data, soil_type)
        flood_dim    = _flood_score_for_crop(crop, flood_risk)

        # ── Irrigation/water score ────────────────────────────────────────────
        irr_score   = IRRIGATION_SCORES.get(crop, {}).get(irrigation, 0.7)
        water_score = WATER_AVAIL_SCORES.get(water_avail, 0.75)
        water_dim   = round((irr_score * 0.6 + water_score * 0.4), 3)

        # ── Agronomic composite score (soil + weather + water) ────────────────
        agronomic_score = round(
            soil_suit["score"]    * 0.35 +
            weather_suit["score"] * 0.40 +
            water_dim             * 0.25,
            3,
        )

        # ── Yield history score (relative to crop average) ───────────────────
        if yield_data.get("available"):
            mean_y = yield_data["mean_yield_t_ha"]
            crop_avg = FALLBACK_YIELD_T_HA.get(crop, 1.0)
            yield_score = round(min(1.0, mean_y / (crop_avg * 1.5)), 3)
        else:
            yield_score = 0.4   # penalise missing yield data

        # ── Market score (price relative to cost per kg produced) ────────────
        if market_data.get("available") and yield_data.get("available"):
            price_kg = market_data["price_rs_per_kg"]
            # Rough breakeven price per kg
            breakeven_kg = (COST_PER_ACRE.get(crop, 25000) / (0.404686 * yield_data["mean_yield_t_ha"] * 1000))
            market_score = round(min(1.0, price_kg / (breakeven_kg * 2)), 3)
        elif market_data.get("available"):
            market_score = 0.6
        else:
            market_score = 0.4

        # ── Final weighted score ──────────────────────────────────────────────
        econ_score = econ.get("economics_score", 0.3) if econ.get("available") else 0.3
        final_score = round(
            agronomic_score                   * DIMENSION_WEIGHTS["agronomic"] +
            flood_dim["score"]                * DIMENSION_WEIGHTS["flood_risk"] +
            yield_score                       * DIMENSION_WEIGHTS["yield_hist"] +
            market_score                      * DIMENSION_WEIGHTS["market"] +
            econ_score                        * DIMENSION_WEIGHTS["economics"],
            3,
        )

        # ── Explanation ───────────────────────────────────────────────────────
        explanation = _build_explanation(
            crop=crop, season=season, area_acres=area_acres,
            soil_suit=soil_suit, weather_suit=weather_suit,
            water_dim=water_dim, flood_dim=flood_dim,
            yield_data=yield_data, market_data=market_data,
            econ=econ, flood_risk=flood_risk,
            irrigation=irrigation, water_avail=water_avail,
            language=language,
        )

        results.append({
            "crop":             crop,
            "filtered_out":     False,
            "season":           season,
            "final_score":      final_score,
            "scores": {
                "agronomic":    agronomic_score,
                "flood_risk":   flood_dim["score"],
                "yield_hist":   yield_score,
                "market":       market_score,
                "economics":    econ_score,
            },
            "soil":             soil_suit,
            "weather":          weather_suit,
            "water": {
                "score":        water_dim,
                "irrigation_score": irr_score,
                "water_avail_score": water_score,
                "irrigation":   irrigation,
                "water_avail":  water_avail,
                "data_kind":    "calculated",
            },
            "flood":            flood_dim,
            "yield":            yield_data,
            "market":           market_data,
            "economics":        econ,
            "explanation":      explanation,
        })

    # Sort: non-filtered first by final_score descending
    ranked = sorted(
        [r for r in results if not r.get("filtered_out")],
        key=lambda x: x["final_score"],
        reverse=True,
    )
    filtered = [r for r in results if r.get("filtered_out")]

    return {
        "profile":              profile,
        "assessment_date":      date.today().isoformat(),
        "candidates":           ranked,
        "filtered_out":         filtered,
        "scoring_methodology": {
            "weights":    DIMENSION_WEIGHTS,
            "dimensions": {
                "agronomic":  "Soil suitability (ICAR) × 35% + Weather (NASA POWER) × 40% + Water/Irrigation × 25%",
                "flood_risk": "Flood risk level × crop waterlogging sensitivity (ICAR)",
                "yield_hist": "ICRISAT historical mean yield relative to crop average",
                "market":     "AGMARKNET modal price relative to estimated breakeven",
                "economics":  "Estimated ROI vs budget compatibility",
            },
            "note": (
                "Scores are rules-based estimates using documented agronomic thresholds. "
                "They are not from a validated forecasting model. "
                "A higher score indicates relatively better conditions — not a guaranteed outcome."
            ),
        },
        "data_sources_used": _build_source_summary(weather, imd_rainfall, flood_risk, soil_data),
    }


LANG_TERMS = {
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
        elif lang == "ta": parts.append(f"வரலாற்று மகசூல்: இந்த இடத்திற்கு {s} பருவத்தில் {c} பயிருக்கான ICRISAT தரவு கிடைக்கவில்லை. குறிப்பு மதிப்பு பயன்படுத்தப்பட்டது.")
        elif lang == "te": parts.append(f"చారిత్రక దిగుబడి: ఈ ప్రదేశానికి {s} సీజన్‌లో {c} పంట కోసం ICRISAT డేటా అందుబాటులో లేదు. సూచన విలువ ఉపయోగించబడింది.")
        elif lang == "kn": parts.append(f"ಐತಿಹಾಸಿಕ ಇಳುವರಿ: ಈ ಸ್ಥಳಕ್ಕೆ {s} ಋತುವಿನಲ್ಲಿ {c} ಬೆಳೆಗೆ ICRISAT ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ. ಉಲ್ಲೇಖ ಮೌಲ್ಯವನ್ನು ಬಳಸಲಾಗಿದೆ.")
        elif lang == "ml": parts.append(f"ചരിത്രപരമായ വിളവ്: ഈ സ്ഥലത്തിനായി {s} സീസണിൽ {c} വിളയ്ക്കുള്ള ICRISAT ഡାറ്റ ലഭ്യമല്ല. റഫറൻസ് മൂല്യം ഉപയോഗിച്ചു.")
        elif lang == "pa": parts.append(f"ਇਤਿਹਾਸਕ ਝਾੜ: ਇਸ ਸਥਾਨ ਲਈ {s} ਵਿੱਚ {c} ਲਈ ICRISAT ਡੇਟਾ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਹਵਾਲਾ ਮੁੱਲ ਵਰਤਿਆ ਗਿਆ।")
        elif lang == "or": parts.append(f"ଐତିହାସିକ ଅମଳ: ଏହି ସ୍ଥାନ ପାଇଁ {s} ଋତୁରେ {c} ପାଇଁ ICRISAT ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ। ରେଫରେନ୍ସ ମୂଲ୍ୟ ବ୍ୟବହୃତ।")

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


def _build_source_summary(weather, imd_rainfall, flood_risk, soil_data) -> list[dict]:
    sources = []
    if weather and weather.get("available"):
        sources.append({"name": "NASA POWER weather", "available": True, "data_kind": "measured", "period": weather.get("summary", {}).get("period_end", "")})
    else:
        sources.append({"name": "NASA POWER weather", "available": False, "data_kind": "unavailable"})

    if imd_rainfall and imd_rainfall.get("available"):
        sources.append({"name": "IMD district rainfall", "available": True, "data_kind": "measured"})
    else:
        sources.append({"name": "IMD district rainfall", "available": False, "data_kind": "unavailable"})

    if flood_risk and flood_risk.get("available"):
        sources.append({"name": "Flood risk engine", "available": True, "data_kind": "satellite_derived"})
    else:
        sources.append({"name": "Flood risk engine", "available": False, "data_kind": "unavailable"})

    if soil_data and soil_data.get("available"):
        sources.append({"name": "Soil Health Card", "available": True, "data_kind": "measured"})
    else:
        sources.append({"name": "Soil Health Card", "available": False, "data_kind": "estimated"})

    sources.append({"name": "ICRISAT yield data", "available": True, "data_kind": "historical"})
    sources.append({"name": "AGMARKNET prices", "available": True, "data_kind": "market"})

    return sources
