"""Generate a clearly separated synthetic extension of the real yield series."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
REAL_DATA = ROOT / "ml" / "data" / "processed" / "crop_yield_training.csv"
MODEL_FILE = ROOT / "ml" / "models" / "crop_yield_model.joblib"
MODEL_METADATA = ROOT / "ml" / "metadata" / "model_metadata.json"
TEST_PREDICTIONS = ROOT / "ml" / "metadata" / "test_predictions.csv"
OUTPUT_DIR = ROOT / "ml" / "data" / "synthetic"
OUTPUT_FILE = OUTPUT_DIR / "crop_yield_synthetic_projection.csv"
OUTPUT_METADATA = OUTPUT_DIR / "crop_yield_synthetic_projection.metadata.json"
GROUP = ["state", "district", "crop", "season"]
SEED = 42


def generate_projection(current_year: int | None = None) -> dict:
    required_files = [REAL_DATA, MODEL_FILE, MODEL_METADATA, TEST_PREDICTIONS]
    missing = [str(path) for path in required_files if not path.is_file()]
    if missing:
        raise FileNotFoundError(
            "Generate the synthetic projection only after processing and evaluating "
            f"the real-data model. Missing: {', '.join(missing)}"
        )

    real = pd.read_csv(REAL_DATA)
    metadata = json.loads(MODEL_METADATA.read_text(encoding="utf-8"))
    if metadata.get("status") != "ready":
        raise ValueError("A ready model trained on real observations is required.")
    features = metadata.get("features")
    if not isinstance(features, list) or not features:
        raise ValueError("The real model metadata does not define its feature list.")

    real_end = int(real["year"].max())
    end_year = current_year if current_year is not None else datetime.now().year
    start_year = real_end + 1
    if end_year < start_year:
        raise ValueError(f"Projection end year {end_year} precedes {start_year}.")

    held_out = pd.read_csv(TEST_PREDICTIONS)
    residual_columns = {"yield_t_ha", "predicted_yield_t_ha"}
    if not residual_columns.issubset(held_out.columns):
        raise ValueError("Held-out predictions are missing columns needed for residual sampling.")
    residuals = (
        pd.to_numeric(held_out["yield_t_ha"], errors="coerce")
        - pd.to_numeric(held_out["predicted_yield_t_ha"], errors="coerce")
    ).dropna()
    if residuals.empty:
        raise ValueError("No measured held-out residuals are available for scenario variation.")
    lower_residual, upper_residual = residuals.quantile([0.01, 0.99]).tolist()
    residual_pool = residuals.clip(lower=lower_residual, upper=upper_residual).to_numpy()

    model = joblib.load(MODEL_FILE)
    random = np.random.default_rng(SEED)
    generated: list[dict] = []
    ordered = real.sort_values("year")
    series = []
    for key, group in ordered.groupby(GROUP, sort=True):
        group = group.dropna(subset=["yield_t_ha"])
        if group.empty:
            continue
        history = group.to_dict("records")
        last = history[-1]
        prior_yields = [float(row["yield_t_ha"]) for row in history]
        area = last.get("area_ha", np.nan)
        climate = {
            feature: last.get(feature, np.nan)
            for feature in features
            if feature not in {
                "state", "district", "crop", "season", "year", "area_ha",
                "previous_observation_yield_t_ha", "previous_3_observation_mean_t_ha",
            }
        }
        series.append(
            {
                "key": key,
                "area": area,
                "climate": climate,
                "prior_yields": prior_yields,
                "baseline_year": int(last["year"]),
            }
        )

    for year in range(start_year, end_year + 1):
        feature_rows = [
            {
                "state": item["key"][0],
                "district": item["key"][1],
                "crop": item["key"][2],
                "season": item["key"][3],
                "year": year,
                "area_ha": item["area"],
                "previous_observation_yield_t_ha": item["prior_yields"][-1],
                "previous_3_observation_mean_t_ha": float(np.mean(item["prior_yields"][-3:])),
                **item["climate"],
            }
            for item in series
        ]
        model_projections = np.maximum(
            0.0,
            model.predict(pd.DataFrame(feature_rows)[features]),
        )
        sampled_residuals = random.choice(residual_pool, size=len(series), replace=True)
        for item, model_projection, residual in zip(series, model_projections, sampled_residuals):
            key = item["key"]
            scenario_yield = max(0.0, float(model_projection + residual))
            generated.append(
                {
                    "state": key[0],
                    "district": key[1],
                    "crop": key[2],
                    "season": key[3],
                    "year": year,
                    "baseline_year": item["baseline_year"],
                    "area_ha_seed": item["area"],
                    "model_projection_t_ha": float(model_projection),
                    "bootstrap_residual_t_ha": float(residual),
                    "synthetic_yield_t_ha": scenario_yield,
                    "source": "Synthetic scenario; not an observed agricultural record",
                    "synthetic": True,
                }
            )
            item["prior_yields"].append(scenario_yield)

    if not generated:
        raise ValueError("No synthetic projection rows could be generated from the real data.")
    result = pd.DataFrame(generated)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    result.to_csv(OUTPUT_FILE, index=False)
    output_metadata = {
        "status": "ready",
        "dataset_kind": "synthetic_scenario",
        "synthetic": True,
        "file": "ml/data/synthetic/crop_yield_synthetic_projection.csv",
        "rows": int(len(result)),
        "distinct_states": int(result["state"].nunique()),
        "distinct_districts": int(result["district"].nunique()),
        "distinct_crops": int(result["crop"].nunique()),
        "year_min": int(result["year"].min()),
        "year_max": int(result["year"].max()),
        "seed": SEED,
        "source_baseline": "ICRISAT DLD real observations",
        "baseline_year_range": [int(real["year"].min()), real_end],
        "method": (
            "The real-data Random Forest is rolled forward one year at a time using "
            "the previous scenario yields. A residual is independently sampled from "
            "the held-out real test residual distribution (clipped to its 1st–99th "
            "percentiles) to create a reproducible synthetic scenario."
        ),
        "limitations": (
            "Generated values are hypothetical scenarios, not official observations, "
            "current agricultural statistics, forecasts, or validated future outcomes. "
            "They are excluded from the real-data training set and real-data metrics."
        ),
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    OUTPUT_METADATA.write_text(json.dumps(output_metadata, indent=2), encoding="utf-8")
    return output_metadata


if __name__ == "__main__":
    report = generate_projection()
    print(json.dumps(report, indent=2))
