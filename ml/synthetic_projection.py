"""Read-only access to the isolated synthetic crop-yield scenario extension."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from ml.predict import DATA_FILE, ProductionDataUnavailable, get_cached_real_data


ROOT = Path(__file__).resolve().parent
SYNTHETIC_DIR = ROOT / "data" / "synthetic"
SYNTHETIC_DATA = SYNTHETIC_DIR / "crop_yield_synthetic_projection.csv"
SYNTHETIC_METADATA = SYNTHETIC_DIR / "crop_yield_synthetic_projection.metadata.json"
GROUP = ["state", "district", "crop", "season"]


_SYNTHETIC_CACHE: pd.DataFrame | None = None
_SYNTHETIC_META_CACHE: dict | None = None


def load_synthetic_artifacts() -> tuple[pd.DataFrame, dict]:
    global _SYNTHETIC_CACHE, _SYNTHETIC_META_CACHE
    if _SYNTHETIC_CACHE is not None and _SYNTHETIC_META_CACHE is not None:
        return _SYNTHETIC_CACHE, _SYNTHETIC_META_CACHE
    if not SYNTHETIC_DATA.is_file() or not SYNTHETIC_METADATA.is_file():
        raise ProductionDataUnavailable(
            "Synthetic scenario data is unavailable. Run "
            "python ml/scripts/generate_synthetic_projection.py after the real-data model is ready."
        )
    try:
        _SYNTHETIC_META_CACHE = json.loads(SYNTHETIC_METADATA.read_text(encoding="utf-8"))
        _SYNTHETIC_CACHE = pd.read_csv(SYNTHETIC_DATA)
    except (OSError, json.JSONDecodeError, pd.errors.ParserError) as error:
        raise ProductionDataUnavailable("Synthetic scenario files could not be read.") from error
    if _SYNTHETIC_META_CACHE.get("status") != "ready" or _SYNTHETIC_META_CACHE.get("dataset_kind") != "synthetic_scenario":
        raise ProductionDataUnavailable("Synthetic scenario provenance metadata is invalid.")
    required = set(GROUP + ["year", "synthetic_yield_t_ha", "synthetic"])
    if not required.issubset(_SYNTHETIC_CACHE.columns) or _SYNTHETIC_CACHE.empty or not _SYNTHETIC_CACHE["synthetic"].all():
        raise ProductionDataUnavailable("Synthetic scenario data failed provenance validation.")
    return _SYNTHETIC_CACHE, _SYNTHETIC_META_CACHE


def synthetic_metadata_response() -> dict:
    _, metadata = load_synthetic_artifacts()
    return metadata


def synthetic_available_options() -> dict:
    frame, metadata = load_synthetic_artifacts()
    combinations = [
        {
            **dict(zip(GROUP, key)),
            "years": sorted(int(year) for year in group["year"].unique()),
        }
        for key, group in frame.groupby(GROUP, sort=True)
    ]
    return {
        "available": True,
        "dataset_kind": "synthetic_scenario",
        "synthetic": True,
        "message": metadata["limitations"],
        "states": sorted(frame["state"].unique().tolist()),
        "districts": sorted(frame["district"].unique().tolist()),
        "crops": sorted(frame["crop"].unique().tolist()),
        "seasons": sorted(frame["season"].unique().tolist()),
        "years": sorted(int(year) for year in frame["year"].unique()),
        "combinations": combinations,
    }


def predict_synthetic(request: dict) -> dict:
    synthetic, metadata = load_synthetic_artifacts()
    state, district, crop, season = (str(request[key]).strip() for key in GROUP)
    year = int(request["year"])
    area = float(request["area"])
    selected = synthetic[
        synthetic["state"].eq(state)
        & synthetic["district"].eq(district)
        & synthetic["crop"].eq(crop)
        & synthetic["season"].eq(season)
        & synthetic["year"].eq(year)
    ]
    if selected.empty:
        raise LookupError("No generated scenario exists for the selected combination and year.")
    row = selected.iloc[0]

    historical = []
    if DATA_FILE.is_file():
        real = get_cached_real_data()
        real_match = real[
            real["state"].astype(str).str.lower().eq(state.lower())
            & real["district"].astype(str).str.lower().eq(district.lower())
            & real["crop"].astype(str).str.lower().eq(crop.lower())
            & real["season"].astype(str).str.lower().eq(season.lower())
            & real["year"].le(metadata["baseline_year_range"][1])
        ].sort_values("year")
        historical.extend(
            {
                "year": int(item.year),
                "yield": float(item.yield_t_ha),
                "kind": "observed",
            }
            for item in real_match.itertuples()
        )

    synthetic_match = synthetic[
        synthetic["state"].eq(state)
        & synthetic["district"].eq(district)
        & synthetic["crop"].eq(crop)
        & synthetic["season"].eq(season)
        & synthetic["year"].le(year)
    ].sort_values("year")
    historical.extend(
        {
            "year": int(item.year),
            "yield": float(item.synthetic_yield_t_ha),
            "kind": "synthetic",
        }
        for item in synthetic_match.itertuples()
    )

    crop_comparison = []
    if DATA_FILE.is_file():
        try:
            real = get_cached_real_data()
            comp_match = real[
                real["state"].astype(str).str.lower().eq(state.lower())
                & real["district"].astype(str).str.lower().eq(district.lower())
            ]
            if not comp_match.empty:
                grp = (
                    comp_match.groupby("crop")["yield_t_ha"]
                    .agg(["mean", "count"])
                    .query("count >= 2")
                    .sort_values("mean", ascending=False)
                )
                crop_comparison = [
                    {
                        "crop": str(crop_name),
                        "meanYield": float(r["mean"]),
                        "observations": int(r["count"]),
                    }
                    for crop_name, r in grp.iterrows()
                ]
        except Exception:
            pass

    # Use Gemini AI to calibrate uncertainty interval and risk assessment
    from ml.gemini_production import estimate_uncertainty_and_risk
    hist_yields = [h["yield"] for h in historical if h.get("kind") == "observed"]
    ai_metrics = estimate_uncertainty_and_risk(
        state=state,
        district=district,
        crop=crop,
        season=season,
        year=year,
        predicted_yield=float(row["synthetic_yield_t_ha"]),
        farm_area=area,
        historical_yields=hist_yields,
        language=request.get("language", "en"),
    )

    return {
        "predictedYield": float(row["synthetic_yield_t_ha"]),
        "estimatedProduction": float(row["synthetic_yield_t_ha"]) * area,
        "predictionInterval": ai_metrics.get("predictionInterval"),
        "risk": ai_metrics.get("risk"),
        "historicalData": historical,
        "cropComparison": crop_comparison,
        "warnings": [],
        "source": "Synthetic scenario generated from a real-data model + Gemini AI calibrated uncertainty",
        "datasetKind": "synthetic_scenario",
        "synthetic": True,
        "model": "Real-data model with bootstrapped historical test residual",
        "scenarioDetails": {
            "modelProjection": float(row["model_projection_t_ha"]),
            "sampledResidual": float(row["bootstrap_residual_t_ha"]),
            "baselineYear": int(row["baseline_year"]),
            "seed": metadata["seed"],
            "baselineYears": metadata["baseline_year_range"],
        },
    }
