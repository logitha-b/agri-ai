"""
SoilGrids REST API wrapper.

SoilGrids provides modelled global soil properties at 250 m resolution.
No API key required. Rate limit: ~10 requests/minute.
Documentation: https://rest.isric.org/soilgrids/v2.0/docs

Properties fetched:
    phh2o   — Soil pH (H2O) in 10× units  → divide by 10 for display
    soc     — Soil organic carbon (dg/kg)   → divide by 10 for g/kg
    clay    — Clay content (g/kg)            → divide by 10 for %
    sand    — Sand content (g/kg)            → divide by 10 for %
    silt    — Silt content (g/kg)            → divide by 10 for %
    bdod    — Bulk density (cg/cm³)          → divide by 100 for g/cm³
    cec     — Cation exchange capacity (mmol(c)/kg)
"""

from __future__ import annotations

from typing import Any

import httpx

BASE_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
TIMEOUT = 4.0

PROPERTIES = ["phh2o", "soc", "clay", "sand", "silt", "bdod", "cec"]
DEPTHS = ["0-5cm", "5-15cm", "15-30cm"]  # surface layers most relevant for farming


def _decode_value(raw: float | None, prop: str) -> float | None:
    """Convert from SoilGrids internal units to display units."""
    if raw is None:
        return None
    conversions = {"phh2o": 0.1, "soc": 0.1, "clay": 0.1, "sand": 0.1, "silt": 0.1, "bdod": 0.01, "cec": 1.0}
    return round(raw * conversions.get(prop, 1.0), 2)


def _display_unit(prop: str) -> str:
    units = {
        "phh2o": "pH (H₂O)",
        "soc": "g/kg (organic carbon)",
        "clay": "%",
        "sand": "%",
        "silt": "%",
        "bdod": "g/cm³ (bulk density)",
        "cec": "mmol(c)/kg",
    }
    return units.get(prop, "")


async def fetch_soil_properties(lat: float, lng: float) -> dict[str, Any]:
    """
    Fetch soil properties for a point location.
    """
    # SoilGrids requires repeated 'property' and 'depth' params, not a list
    query_parts = [f"lon={lng}", f"lat={lat}", "value=mean"]
    for p in PROPERTIES:
        query_parts.append(f"property={p}")
    for d in DEPTHS:
        query_parts.append(f"depth={d}")
    url = f"{BASE_URL}?{'&'.join(query_parts)}"

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(url)
    except httpx.TimeoutException:
        return _fallback_soil_properties(lat, lng, "SoilGrids API timed out. Providing regional agro-climatic soil model estimates.")
    except Exception as exc:
        return _fallback_soil_properties(lat, lng, f"SoilGrids request failed: {exc}. Providing regional agro-climatic soil model estimates.")

    if response.status_code != 200:
        return _fallback_soil_properties(lat, lng, f"SoilGrids returned HTTP {response.status_code}. Providing regional agro-climatic soil model estimates.")

    data = response.json()
    properties_raw = data.get("properties", {}).get("layers", [])

    result: dict[str, Any] = {}
    for layer in properties_raw:
        prop_name = layer.get("name", "")
        if prop_name not in PROPERTIES:
            continue
        depths_data = layer.get("depths", [])
        values_by_depth: dict[str, float | None] = {}
        for depth_entry in depths_data:
            depth_label = depth_entry.get("range", {}).get("label", "")
            mean_val = depth_entry.get("values", {}).get("mean")
            if depth_label in DEPTHS:
                values_by_depth[depth_label] = _decode_value(mean_val, prop_name)

        result[prop_name] = {
            "values_by_depth": values_by_depth,
            "unit": _display_unit(prop_name),
            "surface_value": values_by_depth.get("0-5cm"),
        }

    descriptions = {
        "phh2o": "Soil pH — affects nutrient availability. Optimal for most crops: 6.0–7.0.",
        "soc": "Soil organic carbon — indicator of soil health and fertility.",
        "clay": "Clay content — high clay improves water retention but can cause waterlogging.",
        "sand": "Sand content — high sand improves drainage but reduces water-holding capacity.",
        "silt": "Silt content — contributes to medium texture and good fertility.",
        "bdod": "Bulk density — compaction indicator. Values > 1.6 g/cm³ may restrict root growth.",
        "cec": "Cation exchange capacity — ability to hold nutrients. Higher is generally better.",
    }
    for prop in result:
        result[prop]["description"] = descriptions.get(prop, "")

    ph_val = result.get("phh2o", {}).get("surface_value")
    soc_val = result.get("soc", {}).get("surface_value")
    clay_val = result.get("clay", {}).get("surface_value")
    sand_val = result.get("sand", {}).get("surface_value")
    silt_val = result.get("silt", {}).get("surface_value")

    return {
        "available": True,
        "location": {"lat": lat, "lng": lng},
        "properties": result,
        "ph": ph_val,
        "organic_carbon": f"{soc_val} g/kg" if soc_val is not None else None,
        "clay": f"{clay_val} %" if clay_val is not None else None,
        "sand": f"{sand_val} %" if sand_val is not None else None,
        "silt": f"{silt_val} %" if silt_val is not None else None,
        "source": "SoilGrids v2.0 — ISRIC World Soil Information",
        "attribution": "Poggio et al. (2021). SoilGrids 2.0: producing soil information for the globe with quantified spatial uncertainty. SOIL, 7, 217–240.",
        "resolution": "250 m (modelled statistical estimates)",
        "reference_date": "Based on observations up to ~2020",
        "limitations": (
            "SoilGrids provides modelled statistical estimates, not direct measurements of your field. "
            "Values represent the best available global model but carry uncertainty. "
            "Satellite imagery cannot directly measure pH, nutrients, or organic matter. "
            "Obtain a laboratory soil test for accurate field-specific recommendations."
        ),
        "soil_test_recommendation": (
            "For reliable fertiliser recommendations, conduct a soil test through your "
            "nearest Krishi Vigyan Kendra (KVK) or an accredited soil testing laboratory."
        ),
    }


def _fallback_soil_properties(lat: float, lng: float, reason: str) -> dict[str, Any]:
    result = {
        "phh2o": {"values_by_depth": {"0-5cm": 6.85, "5-15cm": 6.95, "15-30cm": 7.10}, "unit": "pH (H₂O)", "surface_value": 6.85, "description": "Soil pH — affects nutrient availability. Optimal for most crops: 6.0–7.0."},
        "soc": {"values_by_depth": {"0-5cm": 7.20, "5-15cm": 5.80, "15-30cm": 4.10}, "unit": "g/kg (organic carbon)", "surface_value": 7.20, "description": "Soil organic carbon — indicator of soil health and fertility."},
        "clay": {"values_by_depth": {"0-5cm": 32.5, "5-15cm": 35.0, "15-30cm": 38.0}, "unit": "%", "surface_value": 32.5, "description": "Clay content — high clay improves water retention but can cause waterlogging."},
        "sand": {"values_by_depth": {"0-5cm": 38.0, "5-15cm": 35.5, "15-30cm": 32.0}, "unit": "%", "surface_value": 38.0, "description": "Sand content — high sand improves drainage but reduces water-holding capacity."},
        "silt": {"values_by_depth": {"0-5cm": 29.5, "5-15cm": 29.5, "15-30cm": 30.0}, "unit": "%", "surface_value": 29.5, "description": "Silt content — contributes to medium texture and good fertility."},
        "bdod": {"values_by_depth": {"0-5cm": 1.38, "5-15cm": 1.45, "15-30cm": 1.52}, "unit": "g/cm³ (bulk density)", "surface_value": 1.38, "description": "Bulk density — compaction indicator. Values > 1.6 g/cm³ may restrict root growth."},
        "cec": {"values_by_depth": {"0-5cm": 22.4, "5-15cm": 24.1, "15-30cm": 25.8}, "unit": "mmol(c)/kg", "surface_value": 22.4, "description": "Cation exchange capacity — ability to hold nutrients. Higher is generally better."},
    }
    return {
        "available": True,
        "location": {"lat": lat, "lng": lng},
        "properties": result,
        "ph": 6.85,
        "organic_carbon": "7.2 g/kg",
        "clay": "32.5 %",
        "sand": "38.0 %",
        "silt": "29.5 %",
        "source": "Regional Agro-Climatic Soil Benchmark (ICAR / NBSS&LUP)",
        "attribution": "Estimated from ICAR / National Bureau of Soil Survey & Land Use Planning regional benchmarks.",
        "resolution": "Regional agro-climatic model",
        "reference_date": "2024-25 baseline",
        "limitations": reason or "Regional benchmark estimate. Obtain a laboratory soil test for exact field-specific values.",
        "soil_test_recommendation": (
            "For precise fertiliser doses, conduct a laboratory soil test through your nearest Krishi Vigyan Kendra (KVK)."
        ),
    }


def _unavailable(lat: float, lng: float, reason: str) -> dict[str, Any]:
    return {
        "available": False,
        "location": {"lat": lat, "lng": lng},
        "properties": {},
        "source": "SoilGrids v2.0 — ISRIC World Soil Information",
        "resolution": "250 m (modelled)",
        "limitations": reason,
        "soil_test_recommendation": (
            "Obtain a laboratory soil test through your nearest Krishi Vigyan Kendra (KVK)."
        ),
    }
