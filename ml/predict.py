"""Strict inference against a persisted model and exact observed combinations."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data" / "processed" / "crop_yield_training.csv"
MODEL_FILE = ROOT / "models" / "crop_yield_model.joblib"
METADATA_FILE = ROOT / "metadata" / "model_metadata.json"
QUALITY_FILE = ROOT / "metadata" / "data_quality_report.json"


class ProductionDataUnavailable(RuntimeError):
    pass


def load_ready_artifacts():
    if not DATA_FILE.is_file() or not MODEL_FILE.is_file() or not METADATA_FILE.is_file():
        raise ProductionDataUnavailable(
            "Real dataset required. Add an official source file, process it, then train the model."
        )
    metadata = json.loads(METADATA_FILE.read_text(encoding="utf-8"))
    if metadata.get("status") != "ready":
        raise ProductionDataUnavailable(metadata.get("message", "No trained real-data model is available."))
    return pd.read_csv(DATA_FILE), joblib.load(MODEL_FILE), metadata


_OPTIONS_CACHE: dict | None = None

def available_options() -> dict:
    global _OPTIONS_CACHE
    if _OPTIONS_CACHE is not None:
        return _OPTIONS_CACHE

    # ------------------------------------------------------------------
    # Load real (observed) data
    # ------------------------------------------------------------------
    if not DATA_FILE.is_file():
        real_frame: pd.DataFrame | None = None
    else:
        real_frame = pd.read_csv(DATA_FILE)
        if "previous_observation_yield_t_ha" in real_frame.columns:
            real_frame = real_frame[real_frame["previous_observation_yield_t_ha"].notna()]
        if real_frame.empty:
            real_frame = None

    # ------------------------------------------------------------------
    # Load synthetic projection data (silently absent if not generated)
    # ------------------------------------------------------------------
    synth_frame: pd.DataFrame | None = None
    try:
        from ml.synthetic_projection import SYNTHETIC_DATA  # local import avoids circularity

        if SYNTHETIC_DATA.is_file():
            _sf = pd.read_csv(SYNTHETIC_DATA)
            required_cols = {"state", "district", "crop", "season", "year", "synthetic_yield_t_ha", "synthetic"}
            if required_cols.issubset(_sf.columns) and not _sf.empty and _sf["synthetic"].all():
                synth_frame = _sf
    except Exception:  # pragma: no cover — synthetic data is optional
        pass

    if real_frame is None and synth_frame is None:
        return {
            "available": False,
            "message": "Real dataset required. No source-backed options are loaded.",
            "states": [],
            "districts": [],
            "crops": [],
            "seasons": [],
            "years": [],
            "combinations": [],
        }

    # ------------------------------------------------------------------
    # Build per-combination year lists with kind tags
    # ------------------------------------------------------------------
    GROUP = ["state", "district", "crop", "season"]

    # Index real years per group
    real_years_by_group: dict[tuple, set[int]] = {}
    if real_frame is not None:
        for key, grp in real_frame.groupby(GROUP, sort=False):
            real_years_by_group[key] = set(int(y) for y in grp["year"].dropna().unique())

    # Index synthetic years per group
    synth_years_by_group: dict[tuple, set[int]] = {}
    if synth_frame is not None:
        for key, grp in synth_frame.groupby(GROUP, sort=False):
            synth_years_by_group[key] = set(int(y) for y in grp["year"].dropna().unique())

    all_keys = sorted(set(real_years_by_group) | set(synth_years_by_group))

    combinations = []
    for key in all_keys:
        state, district, crop, season = key
        real_yrs = real_years_by_group.get(key, set())
        synth_yrs = synth_years_by_group.get(key, set())
        all_yrs = sorted(real_yrs | synth_yrs)
        # Each year is tagged so the frontend can show the right badge/colour
        year_entries = [
            {
                "year": yr,
                "kind": "observed" if yr in real_yrs else "synthetic",
            }
            for yr in all_yrs
        ]
        combinations.append(
            {
                "state": state,
                "district": district,
                "crop": crop,
                "season": season,
                # Plain list of ints for backwards-compatible selects
                "years": all_yrs,
                # Detailed list with kind tags for the enhanced UI
                "yearEntries": year_entries,
            }
        )

    all_real = real_frame if real_frame is not None else pd.DataFrame()
    all_synth = synth_frame if synth_frame is not None else pd.DataFrame()
    all_states = sorted(
        set(all_real["state"].dropna().tolist() if not all_real.empty else [])
        | set(all_synth["state"].dropna().tolist() if not all_synth.empty else [])
    )
    all_districts = sorted(
        set(all_real["district"].dropna().tolist() if not all_real.empty else [])
        | set(all_synth["district"].dropna().tolist() if not all_synth.empty else [])
    )
    all_crops = sorted(
        set(all_real["crop"].dropna().tolist() if not all_real.empty else [])
        | set(all_synth["crop"].dropna().tolist() if not all_synth.empty else [])
    )
    all_seasons = sorted(
        set(all_real["season"].dropna().tolist() if not all_real.empty else [])
        | set(all_synth["season"].dropna().tolist() if not all_synth.empty else [])
    )
    all_years = sorted(
        set(int(y) for y in all_real["year"].dropna() if not all_real.empty)
        | set(int(y) for y in all_synth["year"].dropna() if not all_synth.empty)
    )

    res = {
        "available": True,
        "syntheticAvailable": synth_frame is not None,
        "states": all_states,
        "districts": all_districts,
        "crops": all_crops,
        "seasons": all_seasons,
        "years": all_years,
        "combinations": combinations,
    }
    _OPTIONS_CACHE = res
    return res


def empirical_percentile(value: float, quantiles: list[float] | None) -> float | None:
    if not quantiles:
        return None
    index = np.searchsorted(np.asarray(quantiles), value, side="right") - 1
    return float(np.clip(index / max(1, len(quantiles) - 1) * 100, 0, 100))


def predict(request: dict) -> dict:
    frame, model, metadata = load_ready_artifacts()
    state = str(request["state"]).strip()
    district = str(request["district"]).strip()
    crop = str(request["crop"]).strip()
    season = str(request["season"]).strip()
    year = int(request["year"])
    area = float(request["area"])
    if not np.isfinite(area) or area <= 0:
        raise ValueError("area must be a finite value greater than zero.")

    match = frame[
        frame["state"].str.casefold().eq(state.casefold())
        & frame["district"].str.casefold().eq(district.casefold())
        & frame["crop"].str.casefold().eq(crop.casefold())
        & frame["season"].str.casefold().eq(season.casefold())
        & frame["year"].eq(year)
    ]
    if match.empty:
        raise LookupError("Insufficient historical data for this state/district/crop/season/year combination.")
    features = metadata["features"]
    row = match.iloc[-1].copy()
    if pd.isna(row.get("previous_observation_yield_t_ha")):
        raise LookupError(
            "Insufficient historical data for this combination: no earlier observed yield is available."
        )
    sample = pd.DataFrame([{feature: row.get(feature, np.nan) for feature in features}])
    predicted = max(0.0, float(model.predict(sample)[0]))
    estimated_production = predicted * area

    warnings = []
    training_years = metadata.get("training_years") or []
    evaluation_years = [
        period
        for period in (
            metadata.get("validation_years"),
            metadata.get("test_years"),
        )
        if period and len(period) == 2
    ]
    in_evaluation_period = any(start <= year <= end for start, end in evaluation_years)
    outside_training_period = training_years and (
        year < training_years[0] or year > training_years[1]
    )
    if outside_training_period and not in_evaluation_period:
        warnings.append(
            "Limited model coverage: the selected year is outside the model's training and evaluation periods."
        )
    training_data = frame[frame["year"].between(*training_years)] if training_years else frame.iloc[0:0]
    same_group_train = training_data[
        training_data["state"].str.casefold().eq(state.casefold())
        & training_data["district"].str.casefold().eq(district.casefold())
        & training_data["crop"].str.casefold().eq(crop.casefold())
        & training_data["season"].str.casefold().eq(season.casefold())
    ]
    if same_group_train.empty:
        warnings.append(
            "Limited model coverage: this district/crop/season combination was not represented in the training period."
        )
    else:
        if len(same_group_train) < 3:
            warnings.append(
                f"Limited model coverage: only {len(same_group_train)} training observations represent this district/crop/season."
            )
        if "area_ha" in features:
            observed_areas = pd.to_numeric(training_data["area_ha"], errors="coerce").dropna()
            district_area = pd.to_numeric(pd.Series([row.get("area_ha")]), errors="coerce").iloc[0]
            if (
                pd.notna(district_area)
                and not observed_areas.empty
                and not (observed_areas.quantile(0.01) <= district_area <= observed_areas.quantile(0.99))
            ):
                warnings.append(
                    "Limited model coverage: the source-observed district crop area is outside the central 98% of training observations."
                )

    interval = None
    interval_meta = metadata.get("prediction_interval")
    if interval_meta:
        lower = max(0.0, predicted + interval_meta["residual_q05_t_ha"])
        upper = max(lower, predicted + interval_meta["residual_q95_t_ha"])
        interval = {
            "lower": lower,
            "upper": upper,
            "method": interval_meta["method"],
            "calibrationSamples": interval_meta["calibration_samples"],
        }
    risk = None
    risk_reference = metadata.get("risk_reference")
    history = frame[
        frame["state"].str.casefold().eq(state.casefold())
        & frame["district"].str.casefold().eq(district.casefold())
        & frame["crop"].str.casefold().eq(crop.casefold())
        & frame["season"].str.casefold().eq(season.casefold())
        & frame["year"].lt(year)
    ]["yield_t_ha"].dropna()
    if risk_reference and len(history) >= risk_reference["minimum_history_observations"]:
        mean = float(history.mean())
        cv = float(history.std(ddof=1) / abs(mean)) if mean else float("inf")
        width_ratio = (
            (interval["upper"] - interval["lower"]) / max(abs(predicted), 1e-9)
            if interval
            else None
        )
        cv_rank = empirical_percentile(cv, risk_reference.get("cv_quantiles"))
        interval_rank = (
            empirical_percentile(
                width_ratio, risk_reference.get("interval_width_ratio_quantiles")
            )
            if width_ratio is not None
            else None
        )
        if cv_rank is not None and interval_rank is not None:
            score = float(np.clip((cv_rank + interval_rank) / 2, 0, 100))
            level = "Low" if score <= 33 else "Medium" if score <= 67 else "High"
            risk = {
                "level": level,
                "score": round(score, 1),
                "method": risk_reference["method"],
                "historicalYieldCv": cv,
                "relativePredictionIntervalWidth": width_ratio,
            }

    # Fallback to Gemini AI when interval or risk cannot be calculated from validation sample
    if interval is None or risk is None:
        try:
            from ml.gemini_production import estimate_uncertainty_and_risk
            hist_yields = list(history) if not history.empty else None
            ai_metrics = estimate_uncertainty_and_risk(
                state=state,
                district=district,
                crop=crop,
                season=season,
                year=year,
                predicted_yield=predicted,
                farm_area=area,
                historical_yields=hist_yields,
                language=request.get("language", "en"),
            )
            if interval is None:
                interval = ai_metrics.get("predictionInterval")
            if risk is None:
                risk = ai_metrics.get("risk")
        except Exception:
            pass

    historical = frame[
        frame["state"].str.casefold().eq(state.casefold())
        & frame["district"].str.casefold().eq(district.casefold())
        & frame["crop"].str.casefold().eq(crop.casefold())
        & frame["season"].str.casefold().eq(season.casefold())
        & frame["year"].le(year)
    ].sort_values("year")
    comparison_source = frame[
        frame["state"].str.casefold().eq(state.casefold())
        & frame["district"].str.casefold().eq(district.casefold())
        & frame["season"].str.casefold().eq(season.casefold())
        & frame["year"].le(year)
    ]
    crop_comparison = (
        comparison_source.groupby("crop")["yield_t_ha"]
        .agg(["mean", "count"])
        .query("count >= 3")
        .sort_values("mean", ascending=False)
    )
    importance = metadata.get("global_permutation_importance", [])
    from ml.explain import explain_prediction

    individual_explanation = explain_prediction(
        {feature: row.get(feature, np.nan) for feature in features}
    )
    return {
        "predictedYield": predicted,
        "estimatedProduction": estimated_production,
        "predictionInterval": interval,
        "risk": risk,
        "historicalData": [
            {"year": int(item.year), "yield": float(item.yield_t_ha)}
            for item in historical.itertuples()
        ],
        "cropComparison": [
            {"crop": str(crop_name), "meanYield": float(row["mean"]), "observations": int(row["count"])}
            for crop_name, row in crop_comparison.iterrows()
        ],
        "featureImportance": importance[:8],
        "explanationMethod": "Global test-set permutation importance; not a local explanation.",
        "individualExplanation": individual_explanation,
        "warnings": warnings,
        "dataCoverage": {
            "startYear": int(frame["year"].min()),
            "endYear": int(frame["year"].max()),
        },
        "model": metadata["model"],
        "source": "Verified district-level agricultural observations",
    }


def metadata_response() -> dict:
    if not METADATA_FILE.is_file():
        return {"status": "dataset_required", "message": "Real dataset required.", "model": None}
    metadata = json.loads(METADATA_FILE.read_text(encoding="utf-8"))
    if metadata.get("status") == "ready" and not (
        DATA_FILE.is_file() and MODEL_FILE.is_file()
    ):
        metadata["status"] = "artifact_missing"
        metadata["message"] = (
            "A required processed dataset or trained model artifact is missing. "
            "Process the verified source data and retrain before predicting."
        )
    if QUALITY_FILE.is_file():
        metadata["dataQuality"] = json.loads(QUALITY_FILE.read_text(encoding="utf-8"))
    return metadata
