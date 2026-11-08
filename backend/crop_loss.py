"""
Crop Loss & Insurance Assessment Engine.

Orchestrates data from all existing engines to produce a complete,
explainable crop-loss assessment for a reported damage incident.

Data sources used:
  - NASA POWER weather (30-day)           — real observed climate
  - IMD district rainfall                 — real district-level rainfall
  - Flood risk estimator                  — rules-based, documented
  - Sentinel-1 / NDVI satellite           — Copernicus (if credentials present)
  - ICRISAT yield data (crop_yield_training.csv) — historical 1978-2017
  - AGMARKNET market prices (JSON)        — snapshot 2026-10-13
  - PMFBY & scheme data (schemes.json)    — official published information

Honest labelling:
  All output fields carry a 'data_kind':
    'measured'    — real observation from identified source
    'calculated'  — derived from data using published agronomic rules
    'estimated'   — approximation with stated uncertainty
    'unavailable' — no supporting data; no value fabricated

Assessment is clearly labelled as an AI-assisted estimate, NOT an official
damage certificate or approved insurance claim.

Financial estimates use actual AGMARKNET market prices where available.
No prices are invented.
"""

from __future__ import annotations

import json
import statistics
from datetime import date, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]

# ── Imports from existing engines ────────────────────────────────────────────

from backend.crop_recommendation import (
    FALLBACK_YIELD_T_HA,
    COST_PER_ACRE,
    PRODUCTION_CROP_MAP,
    MARKET_COMMODITY_MAP,
    WATERLOGGING_SENSITIVITY,
    CANDIDATE_CROPS,
    _get_historical_yield,
    _get_market_price,
)
from backend.crop_report import CROP_CALENDARS


# ── Constants ──────────────────────────────────────────────────────────────────

ACRES_TO_HA = 0.404686

# Damage type → expected production loss percentage (ICAR / FAO indicative)
# These are broad indicative ranges, NOT official or guaranteed
DAMAGE_LOSS_PCT: dict[str, dict] = {
    "flood": {
        "low":    20,
        "medium": 45,
        "high":   75,
        "note":   "Estimated from ICAR/FAO flood-damage ranges. Actual loss depends on flood depth, duration, and crop stage.",
    },
    "drought": {
        "low":    15,
        "medium": 35,
        "high":   60,
        "note":   "Estimated from ICAR drought-impact ranges. Actual loss depends on duration and growth stage.",
    },
    "heavy_rainfall": {
        "low":    10,
        "medium": 30,
        "high":   55,
        "note":   "Estimated from ICAR waterlogging damage ranges.",
    },
    "storm": {
        "low":    20,
        "medium": 50,
        "high":   80,
        "note":   "Storm / cyclone damage ranges vary widely with wind speed and crop type.",
    },
    "heat_stress": {
        "low":    5,
        "medium": 20,
        "high":   40,
        "note":   "Heat stress loss depends on crop stage. Most severe during flowering.",
    },
    "pest": {
        "low":    10,
        "medium": 30,
        "high":   60,
        "note":   "Pest damage ranges depend on pest type, infestation level, and control action.",
    },
    "disease": {
        "low":    10,
        "medium": 35,
        "high":   65,
        "note":   "Disease damage ranges depend on disease type, timing, and crop resistance.",
    },
    "other": {
        "low":    10,
        "medium": 30,
        "high":   60,
        "note":   "Indicative range for unlisted damage types.",
    },
}

# PMFBY indicative premium rates (% of sum insured, indicative only — actuals per notification)
PMFBY_PREMIUM_RATES = {
    "Kharif": 2.0,
    "Rabi":   1.5,
    "Annual": 5.0,   # Horticulture
}

# Recovery cost estimates ₹/acre (approximate, ICAR/state KVK guidance)
RECOVERY_COSTS: dict[str, dict] = {
    "flood": {
        "drainage":    500,    # field drainage labour
        "replanting":  4000,   # approx replanting cost (seed + labour)
        "treatment":   800,    # fungicide / disease treatment post-flood
        "note":        "Approximate recovery costs. Actual costs depend on severity, crop variety, and local rates.",
    },
    "drought": {
        "irrigation":  2000,
        "treatment":   600,
        "note":        "Approximate irrigation and recovery costs.",
    },
    "heavy_rainfall": {
        "drainage":    500,
        "treatment":   800,
        "note":        "Approximate drainage and disease treatment costs.",
    },
    "storm": {
        "clearing":    1500,
        "replanting":  4000,
        "note":        "Approximate storm debris clearing and replanting costs.",
    },
    "heat_stress": {
        "irrigation":  2000,
        "treatment":   500,
        "note":        "Approximate irrigation and foliar treatment costs.",
    },
    "pest": {
        "pesticide":   1200,
        "labour":      800,
        "note":        "Approximate pesticide and application labour costs.",
    },
    "disease": {
        "fungicide":   1500,
        "labour":      800,
        "note":        "Approximate fungicide and application labour costs.",
    },
    "other": {
        "general":     1000,
        "note":        "Approximate general recovery costs.",
    },
}

# Growth stage sensitivity factors (1.0 = max sensitivity)
# Most damage is most severe during flowering / grain fill
STAGE_SENSITIVITY: dict[str, float] = {
    "seedling":    0.6,
    "germination": 0.5,
    "vegetative":  0.5,
    "tillering":   0.6,
    "flowering":   1.0,
    "pi":          0.9,
    "booting":     0.9,
    "pod":         0.9,
    "podfill":     0.85,
    "tassel":      0.95,
    "grain_fill":  0.85,
    "grainfill":   0.85,
    "ripening":    0.7,
    "harvest":     0.5,
    "other":       0.7,
}


# ── PMFBY scheme data ──────────────────────────────────────────────────────────

_schemes_cache: list[dict] | None = None

def _load_schemes() -> list[dict]:
    global _schemes_cache
    if _schemes_cache is None:
        path = ROOT / "backend" / "data" / "schemes.json"
        _schemes_cache = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else []
    return _schemes_cache


def get_insurance_schemes(crop: str, season: str | None = None) -> list[dict]:
    """Return schemes relevant to the given crop (category: Crop Insurance)."""
    schemes = _load_schemes()
    relevant = []
    for s in schemes:
        if s.get("category") not in ("Crop Insurance",):
            continue
        crops = s.get("crops", [])
        # If crop list is empty, scheme is general; include it
        if not crops or any(c.lower() == crop.lower() for c in crops):
            relevant.append(s)
    return relevant


# ── Yield estimation ───────────────────────────────────────────────────────────

def _reference_yield_t_ha(crop: str, state: str | None, district: str | None, season: str) -> dict[str, Any]:
    """Get reference yield, preferring ICRISAT data over fallback."""
    hist = _get_historical_yield(crop, state, district, season)
    if hist.get("available"):
        return {
            "yield_t_ha": hist["mean_yield_t_ha"],
            "source": hist["source"],
            "data_kind": "measured",
            "geographic_level": hist.get("geographic_level", "district"),
            "years": hist.get("years", ""),
            "note": hist.get("note", ""),
        }
    # Fallback
    fallback = FALLBACK_YIELD_T_HA.get(crop)
    if fallback:
        return {
            "yield_t_ha": fallback,
            "source": "ICRISAT crop-average fallback (no district data available)",
            "data_kind": "estimated",
            "geographic_level": "all-India average",
            "note": f"District-level ICRISAT data not available for {crop}. Using national average reference yield.",
        }
    return {
        "yield_t_ha": None,
        "source": None,
        "data_kind": "unavailable",
        "note": f"No reference yield data available for {crop}.",
    }


# ── Weather-based loss evidence ────────────────────────────────────────────────

def _weather_evidence(
    weather: dict | None,
    imd_rainfall: dict | None,
    incident_type: str,
    crop: str,
    stage_key: str,
) -> dict[str, Any]:
    """Extract weather signals relevant to the reported damage type."""
    evidence: list[str] = []
    supporting = False

    if weather and weather.get("available"):
        summary = weather.get("summary", {})
        total_rain_mm = weather.get("total_rainfall_mm") or summary.get("total_rainfall_mm")
        max_temp = weather.get("max_temp_c") or summary.get("max_temp_c")
        avg_humid = weather.get("avg_humidity_pct") or summary.get("avg_humidity_pct")

        if incident_type in ("flood", "heavy_rainfall") and total_rain_mm is not None:
            if total_rain_mm > 200:
                evidence.append(f"NASA POWER: {total_rain_mm:.0f} mm rainfall recorded in past 30 days — high accumulation supporting flood/waterlogging claim.")
                supporting = True
            elif total_rain_mm > 100:
                evidence.append(f"NASA POWER: {total_rain_mm:.0f} mm rainfall in past 30 days — moderate rainfall recorded.")
            else:
                evidence.append(f"NASA POWER: {total_rain_mm:.0f} mm rainfall in past 30 days — below threshold for severe flood/waterlogging.")

        elif incident_type == "drought" and total_rain_mm is not None:
            if total_rain_mm < 20:
                evidence.append(f"NASA POWER: Only {total_rain_mm:.0f} mm rainfall in past 30 days — very low moisture consistent with drought.")
                supporting = True
            elif total_rain_mm < 50:
                evidence.append(f"NASA POWER: {total_rain_mm:.0f} mm rainfall in past 30 days — below normal, consistent with moisture stress.")
            else:
                evidence.append(f"NASA POWER: {total_rain_mm:.0f} mm rainfall in past 30 days — not consistent with severe drought conditions.")

        elif incident_type == "heat_stress" and max_temp is not None:
            if max_temp > 38:
                evidence.append(f"NASA POWER: Maximum temperature {max_temp:.1f}°C recorded — high heat stress conditions.")
                supporting = True
            elif max_temp > 35:
                evidence.append(f"NASA POWER: Maximum temperature {max_temp:.1f}°C — elevated heat stress risk.")
            else:
                evidence.append(f"NASA POWER: Maximum temperature {max_temp:.1f}°C — within normal range.")

    if imd_rainfall and imd_rainfall.get("available"):
        total = imd_rainfall.get("total_mm")
        if total is not None:
            if incident_type in ("flood", "heavy_rainfall") and total > 150:
                evidence.append(f"IMD District Rainfall: {total:.0f} mm total rainfall — significantly above normal.")
                supporting = True
            elif incident_type == "drought" and total < 30:
                evidence.append(f"IMD District Rainfall: {total:.0f} mm total — very low district rainfall consistent with drought.")
                supporting = True
            else:
                evidence.append(f"IMD District Rainfall: {total:.0f} mm recorded for district.")

    if not evidence:
        evidence.append("Weather data unavailable or insufficient for the incident period. Manual evidence (photographs, field assessment) is essential for insurance claims.")

    return {
        "supporting_weather_claim": supporting,
        "evidence_lines": evidence,
        "data_sources": ["NASA POWER" if weather and weather.get("available") else None,
                         "IMD District Rainfall" if imd_rainfall and imd_rainfall.get("available") else None],
        "note": "Weather evidence supports or contextualises the claim but is not a substitute for official crop-cutting experiments or physical assessment.",
    }


# ── Flood risk evidence ────────────────────────────────────────────────────────

def _flood_evidence(flood_risk: dict | None, incident_type: str) -> dict[str, Any]:
    """Extract flood risk signals."""
    if not flood_risk:
        return {
            "available": False,
            "note": "Flood risk data unavailable.",
        }

    score = flood_risk.get("flood_risk_score", 0)
    level = flood_risk.get("flood_risk_level", "Unknown")
    factors = flood_risk.get("risk_factors", [])

    relevant = incident_type in ("flood", "heavy_rainfall")
    return {
        "available": True,
        "flood_risk_score": score,
        "flood_risk_level": level,
        "risk_factors": factors[:4],   # top 4 contributing factors
        "relevant_to_claim": relevant,
        "note": "Flood risk is an independent modelled estimate based on location, dams, and rainfall. It is not equivalent to satellite observation.",
        "data_kind": "calculated",
    }


# ── Crop stage identification ──────────────────────────────────────────────────

def _identify_growth_stage(crop: str, sowing_date_str: str | None, incident_date_str: str | None) -> dict[str, Any]:
    """Identify the likely crop growth stage at time of incident."""
    crop_key = crop.lower().replace(" ", "")
    calendar = CROP_CALENDARS.get(crop_key) or CROP_CALENDARS.get(crop.lower())

    if not calendar:
        return {
            "stage_name": "Unknown",
            "stage_key": "other",
            "days_after_sowing": None,
            "available": False,
            "note": f"No phenology calendar for '{crop}'. Stage assessment unavailable.",
        }

    if not sowing_date_str or not incident_date_str:
        return {
            "stage_name": "Unknown — dates not provided",
            "stage_key": "other",
            "days_after_sowing": None,
            "available": False,
            "note": "Sowing date or incident date not provided. Cannot determine growth stage.",
        }

    try:
        sowing = date.fromisoformat(sowing_date_str)
        incident = date.fromisoformat(incident_date_str)
        das = (incident - sowing).days
    except ValueError:
        return {
            "stage_name": "Unknown — invalid date",
            "stage_key": "other",
            "days_after_sowing": None,
            "available": False,
            "note": "Invalid date format. Use YYYY-MM-DD.",
        }

    if das < 0:
        return {
            "stage_name": "Pre-sowing",
            "stage_key": "other",
            "days_after_sowing": das,
            "available": True,
            "note": "Incident occurred before sowing date.",
        }

    current_stage = None
    for s in calendar["stages"]:
        if s["start"] <= das <= s["end"]:
            current_stage = s
            break
    if not current_stage and das > calendar["total_days"]:
        current_stage = calendar["stages"][-1]   # post-harvest

    if not current_stage:
        current_stage = {"name": "Inter-stage", "key": "other"}

    return {
        "stage_name": current_stage["name"],
        "stage_key": current_stage.get("key", "other"),
        "days_after_sowing": das,
        "total_crop_days": calendar["total_days"],
        "progress_pct": round(min(das / calendar["total_days"] * 100, 100), 1),
        "available": True,
        "source": calendar.get("source", "TNAU/ICAR crop calendar"),
        "data_kind": "calculated",
    }


# ── Loss estimate ──────────────────────────────────────────────────────────────

def _estimate_loss(
    crop: str,
    total_area_acres: float,
    affected_area_acres: float,
    incident_type: str,
    damage_severity: str,            # "low" | "medium" | "high" | "total"
    stage_key: str,
    weather_supporting: bool,
    flood_risk_level: str | None,
    yield_ref: dict,
) -> dict[str, Any]:
    """
    Estimate expected production, remaining production, and production loss.
    All values are estimates with explicitly stated assumptions.
    """
    yield_t_ha = yield_ref.get("yield_t_ha")
    if yield_t_ha is None:
        return {
            "available": False,
            "reason": "Reference yield unavailable — cannot compute production estimates.",
            "data_kind": "unavailable",
        }

    # Convert acres to hectares
    total_area_ha = total_area_acres * ACRES_TO_HA
    affected_area_ha = affected_area_acres * ACRES_TO_HA

    # Expected production (undamaged)
    expected_production_t = round(yield_t_ha * total_area_ha, 3)

    # Damage percentage for affected area
    dmg_map = DAMAGE_LOSS_PCT.get(incident_type, DAMAGE_LOSS_PCT["other"])
    if damage_severity == "total":
        damage_pct = 95.0
    else:
        damage_pct = float(dmg_map.get(damage_severity, dmg_map["medium"]))

    # Adjust for growth stage sensitivity
    stage_factor = STAGE_SENSITIVITY.get(stage_key, 0.7)
    adjusted_damage_pct = round(damage_pct * stage_factor, 1)

    # Adjust for waterlogging sensitivity (flood/heavy rain)
    if incident_type in ("flood", "heavy_rainfall"):
        wl_sens = WATERLOGGING_SENSITIVITY.get(crop, 0.5)
        adjusted_damage_pct = round(min(adjusted_damage_pct * (0.7 + wl_sens * 0.3), 99.0), 1)

    # Boost slightly if weather evidence supports
    if weather_supporting:
        adjusted_damage_pct = min(adjusted_damage_pct * 1.1, 99.0)
        adjusted_damage_pct = round(adjusted_damage_pct, 1)

    # Production loss applies only to affected area
    affected_expected_t = round(yield_t_ha * affected_area_ha, 3)
    estimated_loss_t = round(affected_expected_t * (adjusted_damage_pct / 100), 3)
    estimated_remaining_t = round(
        (expected_production_t - affected_expected_t)   # undamaged area production
        + (affected_expected_t - estimated_loss_t),     # surviving production from affected area
        3,
    )

    loss_pct_of_total = round(estimated_loss_t / expected_production_t * 100, 1) if expected_production_t > 0 else 0

    return {
        "available": True,
        "total_area_acres": total_area_acres,
        "total_area_ha": round(total_area_ha, 3),
        "affected_area_acres": affected_area_acres,
        "affected_area_ha": round(affected_area_ha, 3),
        "affected_area_pct": round(affected_area_acres / total_area_acres * 100, 1) if total_area_acres > 0 else 0,
        "reference_yield_t_ha": yield_t_ha,
        "expected_production_t": expected_production_t,
        "estimated_loss_t": estimated_loss_t,
        "estimated_remaining_t": estimated_remaining_t,
        "loss_pct_of_total": loss_pct_of_total,
        "damage_severity": damage_severity,
        "adjusted_damage_pct_on_affected": adjusted_damage_pct,
        "stage_sensitivity_factor": stage_factor,
        "assumptions": [
            f"Reference yield: {yield_t_ha} t/ha ({yield_ref.get('geographic_level','district average')}, {yield_ref.get('source','ICRISAT')})",
            f"Incident type: {incident_type} — indicative damage range used from ICAR/FAO guidance",
            f"Growth stage sensitivity factor: {stage_factor:.2f} (based on crop phenology calendar)",
            f"Damage percentage applied to affected area: {adjusted_damage_pct}%",
        ],
        "data_kind": "estimated",
        "note": "These are preliminary estimates based on reference yields and indicative damage ranges. Official crop-cutting experiments or field assessment by authorised personnel are required for insurance claims.",
    }


# ── Financial loss estimation ──────────────────────────────────────────────────

def _estimate_financial_loss(
    crop: str,
    state: str | None,
    loss_t: float | None,
    expected_t: float | None,
    total_area_acres: float,
    incident_type: str,
) -> dict[str, Any]:
    """
    Estimate financial impact using AGMARKNET market prices.
    No prices are invented — if price data is unavailable, that is stated clearly.
    """
    price_data = _get_market_price(crop, state)

    if not price_data.get("available"):
        return {
            "available": False,
            "reason": "AGMARKNET market price data not available for this crop and state.",
            "crop": crop,
            "data_kind": "unavailable",
            "note": "Cannot estimate financial loss without market price data. Check local mandi rates.",
        }

    price_rs_per_kg = price_data["price_rs_per_kg"]
    modal_rs_per_quintal = price_data["modal_price_rs_per_quintal"]

    result: dict[str, Any] = {
        "available": True,
        "crop": crop,
        "market_price": {
            "modal_rs_per_quintal": modal_rs_per_quintal,
            "price_rs_per_kg": price_rs_per_kg,
            "markets_sampled": price_data["markets_sampled"],
            "date_range": price_data["date_range"],
            "source": "AGMARKNET mandi price snapshot",
            "data_kind": "measured",
            "note": "Historical mandi snapshot prices. Actual sale price depends on quality, grade, and market-day conditions.",
        },
    }

    if expected_t is not None:
        expected_value_rs = round(expected_t * 1000 * price_rs_per_kg)
        result["expected_crop_value_rs"] = expected_value_rs

    if loss_t is not None:
        lost_value_rs = round(loss_t * 1000 * price_rs_per_kg)
        result["estimated_lost_value_rs"] = lost_value_rs

    # Recovery costs
    recovery = RECOVERY_COSTS.get(incident_type, RECOVERY_COSTS["other"])
    recovery_note = recovery.pop("note", "")
    total_recovery_rs = round(sum(v for k, v in recovery.items()) * total_area_acres)
    result["estimated_recovery_cost_rs"] = total_recovery_rs
    result["recovery_cost_note"] = recovery_note
    result["recovery_cost_breakdown"] = {k: round(v * total_area_acres) for k, v in recovery.items()}

    if loss_t is not None:
        result["total_economic_impact_rs"] = round(lost_value_rs + total_recovery_rs)

    # Cost of cultivation
    cost_per_acre = COST_PER_ACRE.get(crop)
    if cost_per_acre:
        result["cultivation_cost_total_rs"] = round(cost_per_acre * total_area_acres)
        result["cultivation_cost_per_acre_rs"] = cost_per_acre
        result["cultivation_cost_source"] = "ICAR/TNAU published reference (Kharif 2023-24)"

    result["data_kind"] = "estimated"
    result["note"] = (
        "Financial estimates use reference market prices and approximate recovery costs. "
        "Insured sum, compensation, and actual sale prices may differ significantly. "
        "These figures are not an insurance valuation."
    )
    return result


# ── Document checklist ────────────────────────────────────────────────────────

def _document_checklist(
    farmer_name: str | None,
    policy_ref: str | None,
    insurance_scheme: str | None,
    incident_type: str,
    crop: str,
    incident_date_str: str | None,
    has_photos: bool,
) -> dict[str, Any]:
    """Generate a document checklist based on reported details."""
    today = date.today()

    docs = [
        {"id": "aadhaar",     "name": "Aadhaar / accepted identity document", "required": True,  "present": bool(farmer_name), "note": "Required for all government scheme applications."},
        {"id": "land_record", "name": "Land records / Khasra / tenancy document", "required": True, "present": False, "note": "Required to establish ownership or tenancy of affected land."},
        {"id": "sowing_cert", "name": "Sowing certificate / self-declaration", "required": True, "present": False, "note": "Required to confirm crop sown and area under cultivation."},
        {"id": "policy",      "name": "Insurance policy document / acknowledgement", "required": bool(policy_ref), "present": bool(policy_ref), "note": "Required if enrolled under PMFBY or other insurance."},
        {"id": "photos",      "name": "Photographs of damage (date-stamped, geo-tagged preferred)", "required": True, "present": has_photos, "note": "Essential evidence for any insurance or compensation claim."},
        {"id": "bank",        "name": "Bank account details (for compensation transfer)", "required": True, "present": False, "note": "Required for any digital compensation payment."},
        {"id": "crop_loss_report", "name": "AI-assisted crop loss assessment report (this document)", "required": False, "present": True, "note": "Supportive evidence for insurance and government schemes. Not an official certificate."},
        {"id": "field_report", "name": "Field inspection report by agriculture officer / insurance assessor", "required": True, "present": False, "note": "Official field inspection is required for insurance claims."},
    ]

    # Deadline guidance
    deadline_notes = []
    if incident_date_str:
        try:
            incident_dt = date.fromisoformat(incident_date_str)
            days_since = (today - incident_dt).days
            deadline_notes.append({
                "rule": "PMFBY crop damage reporting (preventable losses)",
                "requirement": "Report to insurer, bank, or agriculture department as soon as possible — typically within 72 hours for preventable losses.",
                "days_since_incident": days_since,
                "urgent": days_since >= 2,
                "status": "URGENT — report immediately" if days_since >= 2 else "Within reporting window",
                "source": "pmfby.gov.in guidance (indicative)",
                "note": "Exact reporting deadlines depend on the notified policy terms for your crop, season, state, and insurer. Confirm with your insurer or KCC bank.",
            })
            deadline_notes.append({
                "rule": "PMFBY yield-based crop loss claim",
                "requirement": "Yield loss claims are assessed via crop-cutting experiments. Report the incident to the insurer and local agriculture office.",
                "note": "The timeline for crop-cutting experiments is determined by the state government and insurer, not the farmer.",
                "source": "pmfby.gov.in guidance (indicative)",
            })
        except ValueError:
            pass

    missing = [d for d in docs if d["required"] and not d["present"]]

    return {
        "checklist": docs,
        "missing_required": [d["id"] for d in missing],
        "missing_count": len(missing),
        "deadlines": deadline_notes,
        "note": "This checklist is indicative. Actual requirements depend on the specific scheme, state, season, insurer, and policy terms. Confirm all requirements with the relevant insurer or agriculture department.",
    }


# ── Recovery recommendations ──────────────────────────────────────────────────

def _recovery_recommendations(
    crop: str,
    incident_type: str,
    damage_severity: str,
    stage_key: str,
    loss_pct: float | None,
    flood_risk: dict | None,
    weather: dict | None,
) -> list[dict[str, str]]:
    """Generate recovery recommendations based on crop, stage, and damage type."""
    recs: list[dict[str, str]] = []
    crop_key = crop.lower().replace(" ", "")

    # Universal first steps
    recs.append({
        "action": "Document the damage immediately",
        "reason": "Take date-stamped, geo-tagged photographs of affected fields from multiple angles. Evidence quality directly affects insurance claim outcomes.",
        "urgency": "Immediate",
        "source": "PMFBY claim guidelines",
    })
    recs.append({
        "action": "Notify insurer and agriculture department",
        "reason": "Inform your crop insurer (bank or insurance company), local agriculture office, and village-level worker (VLW) about the damage. PMFBY requires timely reporting.",
        "urgency": "Within 24–72 hours",
        "source": "pmfby.gov.in",
    })

    # Flood-specific
    if incident_type in ("flood", "heavy_rainfall"):
        recs.append({
            "action": "Drain standing water as quickly as possible",
            "reason": "Prolonged waterlogging causes root asphyxiation. Drainage within 24–48 hours of flood recession significantly reduces final yield loss.",
            "urgency": "As soon as flood recedes",
            "source": "ICAR flood damage management guidelines",
        })
        if crop_key in ("groundnut", "maize", "tomato"):
            recs.append({
                "action": f"Apply fungicide spray for {crop} after flood recession",
                "reason": f"{crop} is susceptible to stem rot and collar rot following waterlogging. Preventive fungicide application reduces secondary disease losses.",
                "urgency": "Within 3–5 days of flood recession",
                "source": "TNAU post-flood crop recovery advisory",
            })

    # Drought-specific
    if incident_type == "drought":
        recs.append({
            "action": "Implement water-saving irrigation practices (drip or deficit irrigation)",
            "reason": "Conserve available water resources and prioritise critical growth stages (flowering, grain fill) where water stress causes maximum yield loss.",
            "urgency": "Immediate",
            "source": "ICAR drought management guidelines",
        })
        recs.append({
            "action": "Apply foliar nutrient spray",
            "reason": "Drought stress reduces nutrient uptake. Foliar application of potassium and micronutrients can partially compensate for reduced root zone absorption.",
            "urgency": "When drought stress first confirmed",
            "source": "TNAU foliar nutrition advisory",
        })

    # Heat stress
    if incident_type == "heat_stress":
        recs.append({
            "action": "Irrigate during early morning or evening to reduce heat stress",
            "reason": "Evaporative cooling lowers canopy temperature. Irrigating during cooler parts of the day is most effective during the critical flowering stage.",
            "urgency": "Immediate",
            "source": "ICAR heat stress management",
        })

    # Pest / disease
    if incident_type in ("pest", "disease"):
        recs.append({
            "action": "Contact KVK / Agriculture Department for diagnosis and recommended treatment",
            "reason": "Correct identification of pest or disease is essential before applying any treatment. Misidentification can worsen the problem.",
            "urgency": "Within 2–3 days",
            "source": "ICAR KVK advisory system",
        })
        recs.append({
            "action": "Isolate affected plants to prevent spread (disease)",
            "reason": "Removing or isolating heavily infected plants slows disease spread to unaffected areas of the field.",
            "urgency": "Immediate",
            "source": "ICAR plant protection advisory",
        })

    # Stage-specific
    if stage_key in ("flowering", "booting", "pi"):
        recs.append({
            "action": f"Prioritise support for {crop} at the critical flowering/grain-initiation stage",
            "reason": "The current growth stage is the most sensitive to damage. Every intervention now has the highest yield-saving potential.",
            "urgency": "High — act within days",
            "source": "TNAU/ICAR crop phenology guidance",
        })

    # Severe loss
    if loss_pct is not None and loss_pct > 50:
        recs.append({
            "action": "Evaluate feasibility of salvage operations or replanting",
            "reason": f"Estimated loss exceeds 50% of expected production. A second crop, cover crop, or salvage harvest may recover some value from the season.",
            "urgency": "After initial damage assessment",
            "source": "ICAR contingency crop planning",
        })

    # Consult expert
    recs.append({
        "action": "Request official field inspection by Agriculture Officer or Insurance Company Representative",
        "reason": "An official field inspection and crop-cutting experiment result is the authoritative basis for insurance compensation. AI estimates supplement but do not replace this assessment.",
        "urgency": "As soon as possible",
        "source": "PMFBY operational guidelines",
    })

    return recs


# ── Main orchestrator ─────────────────────────────────────────────────────────

def assess_crop_loss(
    *,
    crop: str,
    variety: str | None,
    season: str,
    sowing_date: str | None,
    total_area_acres: float,
    affected_area_acres: float,
    incident_date: str | None,
    incident_type: str,
    damage_severity: str,
    damage_description: str | None,
    lat: float | None,
    lng: float | None,
    state: str | None,
    district: str | None,
    farmer_name: str | None,
    insurance_scheme: str | None,
    policy_ref: str | None,
    has_photos: bool,
    # Fetched externally and passed in
    weather: dict | None = None,
    imd_rainfall: dict | None = None,
    flood_risk: dict | None = None,
) -> dict[str, Any]:
    """
    Full crop loss assessment orchestrator.

    Combines all available evidence into a structured assessment report.
    Nothing is invented — if data is unavailable, that is stated explicitly.
    """
    today = date.today()

    # ── 1. Growth stage identification ──────────────────────────────────────
    stage_info = _identify_growth_stage(crop, sowing_date, incident_date)
    stage_key = stage_info.get("stage_key", "other")

    # ── 2. Reference yield ───────────────────────────────────────────────────
    yield_ref = _reference_yield_t_ha(crop, state, district, season)

    # ── 3. Weather evidence ──────────────────────────────────────────────────
    wx_evidence = _weather_evidence(weather, imd_rainfall, incident_type, crop, stage_key)

    # ── 4. Flood risk evidence ───────────────────────────────────────────────
    flood_ev = _flood_evidence(flood_risk, incident_type)
    flood_risk_level = flood_ev.get("flood_risk_level") if flood_ev.get("available") else None

    # ── 5. Production loss estimate ──────────────────────────────────────────
    loss_est = _estimate_loss(
        crop=crop,
        total_area_acres=total_area_acres,
        affected_area_acres=affected_area_acres,
        incident_type=incident_type,
        damage_severity=damage_severity,
        stage_key=stage_key,
        weather_supporting=wx_evidence.get("supporting_weather_claim", False),
        flood_risk_level=flood_risk_level,
        yield_ref=yield_ref,
    )

    # ── 6. Financial loss estimate ───────────────────────────────────────────
    loss_t = loss_est.get("estimated_loss_t") if loss_est.get("available") else None
    expected_t = loss_est.get("expected_production_t") if loss_est.get("available") else None
    fin_loss = _estimate_financial_loss(
        crop=crop,
        state=state,
        loss_t=loss_t,
        expected_t=expected_t,
        total_area_acres=total_area_acres,
        incident_type=incident_type,
    )

    # ── 7. Insurance schemes ─────────────────────────────────────────────────
    schemes = get_insurance_schemes(crop, season)

    # PMFBY premium estimate
    pmfby_premium_pct = PMFBY_PREMIUM_RATES.get(season, PMFBY_PREMIUM_RATES["Kharif"])
    pmfby_note = (
        f"Indicative PMFBY farmer premium for {season} season: {pmfby_premium_pct}% of sum insured. "
        "Actual premium depends on notified rate, crop, state, and insurer. Check pmfby.gov.in."
    )

    # ── 8. Document checklist ────────────────────────────────────────────────
    checklist = _document_checklist(
        farmer_name=farmer_name,
        policy_ref=policy_ref,
        insurance_scheme=insurance_scheme,
        incident_type=incident_type,
        crop=crop,
        incident_date_str=incident_date,
        has_photos=has_photos,
    )

    # ── 9. Recovery recommendations ──────────────────────────────────────────
    recovery = _recovery_recommendations(
        crop=crop,
        incident_type=incident_type,
        damage_severity=damage_severity,
        stage_key=stage_key,
        loss_pct=loss_est.get("loss_pct_of_total"),
        flood_risk=flood_risk,
        weather=weather,
    )

    # ── 10. Assemble report ───────────────────────────────────────────────────
    return {
        "report_type":   "AI-assisted crop loss assessment",
        "disclaimer":    (
            "This report is an AI-assisted estimate based on available data. "
            "It is NOT an official damage certificate, a crop-cutting experiment result, "
            "or an approved insurance claim. Insurance eligibility and compensation are "
            "determined solely by the insurer and relevant government authority."
        ),
        "generated_date": str(today),
        "assessment_version": "1.0",

        "incident": {
            "crop":            crop,
            "variety":         variety,
            "season":          season,
            "sowing_date":     sowing_date,
            "incident_date":   incident_date,
            "incident_type":   incident_type,
            "damage_severity": damage_severity,
            "description":     damage_description,
            "location": {
                "lat":      lat,
                "lng":      lng,
                "state":    state,
                "district": district,
            },
        },

        "farmer": {
            "name":             farmer_name,
            "insurance_scheme": insurance_scheme,
            "policy_ref":       policy_ref,
        },

        "growth_stage":      stage_info,
        "reference_yield":   yield_ref,
        "weather_evidence":  wx_evidence,
        "flood_evidence":    flood_ev,
        "production_loss":   loss_est,
        "financial_loss":    fin_loss,

        "insurance": {
            "schemes":             schemes,
            "pmfby_premium_note":  pmfby_note,
            "important_notice":    (
                "This application cannot verify PMFBY enrollment status, policy terms, "
                "or claim outcomes. Contact your insurer, bank, or the official PMFBY portal "
                "(pmfby.gov.in) to confirm coverage, reporting deadlines, and claim status."
            ),
            "official_links": [
                {"name": "PMFBY Official Portal",  "url": "https://pmfby.gov.in/"},
                {"name": "Crop Insurance India",   "url": "https://www.cropinsurance.in/"},
                {"name": "Agriculture Ministry",   "url": "https://agricoop.nic.in/"},
            ],
        },

        "document_checklist": checklist,
        "recovery_recommendations": recovery,

        "data_sources_used": {
            "weather":     "NASA POWER" if weather and weather.get("available") else "unavailable",
            "rainfall":    "IMD District Rainfall" if imd_rainfall and imd_rainfall.get("available") else "unavailable",
            "flood_risk":  "Rules-based flood risk estimator" if flood_risk else "unavailable",
            "yield":       yield_ref.get("source", "unavailable"),
            "market":      "AGMARKNET mandi price snapshot (2026-10-13)" if fin_loss.get("available") else "unavailable",
            "schemes":     "backend/data/schemes.json (official published information)",
            "phenology":   "TNAU/ICAR crop phenology calendars",
        },
    }
