"""Train and time-evaluate crop-yield regressors using processed source observations."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data" / "processed" / "crop_yield_training.csv"
MODELS_DIR = ROOT / "models"
METADATA_DIR = ROOT / "metadata"
MODEL_FILE = MODELS_DIR / "crop_yield_model.joblib"
PREPROCESSOR_FILE = MODELS_DIR / "preprocessor.joblib"
METADATA_FILE = METADATA_DIR / "model_metadata.json"
EVALUATION_FILE = METADATA_DIR / "evaluation.json"
PREDICTIONS_FILE = METADATA_DIR / "test_predictions.csv"
GROUP = ["state", "district", "crop", "season"]
BASE_CATEGORICAL = ["state", "district", "crop", "season"]
BASE_NUMERIC = [
    "year",
    "area_ha",
    "previous_observation_yield_t_ha",
    "previous_3_observation_mean_t_ha",
]
OPTIONAL_CLIMATE = [
    "rainfall_mm",
    "temperature_c",
    "relative_humidity_pct",
    "solar_radiation_mj_m2_day",
]
N_JOBS = min(8, max(1, os.cpu_count() or 1))
IMPORTANCE_SAMPLE_SIZE = 5000


def mae(actual: np.ndarray, predicted: np.ndarray) -> float:
    return float(mean_absolute_error(actual, predicted))


def metric_set(actual: np.ndarray, predicted: np.ndarray) -> dict:
    r2 = float(r2_score(actual, predicted)) if len(actual) > 1 else None
    return {
        "mae_t_ha": mae(actual, predicted),
        "rmse_t_ha": float(np.sqrt(mean_squared_error(actual, predicted))),
        "r2": r2,
        "samples": int(len(actual)),
    }


def make_pipeline(features: list[str], categorical: list[str], numeric: list[str], estimator) -> Pipeline:
    preprocessor = ColumnTransformer(
        [
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical,
            ),
            (
                "numeric",
                Pipeline([("imputer", SimpleImputer(strategy="median"))]),
                numeric,
            ),
        ],
        remainder="drop",
        verbose_feature_names_out=True,
    )
    return Pipeline([("preprocessor", preprocessor), ("model", estimator)])


def choose_year_boundaries(years: list[int]) -> tuple[set[int], set[int], set[int]]:
    ordered = sorted(set(years))
    if len(ordered) < 5:
        raise ValueError(
            f"Only {len(ordered)} distinct years are available; at least 5 are required "
            "for time-aware train/validation/test evaluation."
        )
    train_end = max(1, int(len(ordered) * 0.70))
    validation_end = max(train_end + 1, int(len(ordered) * 0.85))
    validation_end = min(validation_end, len(ordered) - 1)
    return (
        set(ordered[:train_end]),
        set(ordered[train_end:validation_end]),
        set(ordered[validation_end:]),
    )


def baseline_predictions(
    train: pd.DataFrame, target: pd.DataFrame, global_mean: float
) -> np.ndarray:
    means = train.groupby(GROUP)["yield_t_ha"].mean()
    return np.asarray(
        [
            float(means.get(tuple(row[column] for column in GROUP), global_mean))
            for _, row in target.iterrows()
        ]
    )


def percentile_reference(values: np.ndarray) -> list[float] | None:
    clean = np.asarray(values, dtype=float)
    clean = clean[np.isfinite(clean)]
    if len(clean) < 10:
        return None
    return [float(value) for value in np.quantile(clean, np.linspace(0, 1, 101))]


def main() -> int:
    if not DATA_FILE.is_file():
        raise SystemExit(
            "Real dataset required. Run python ml/scripts/process_data.py after placing "
            "the official agricultural source file under ml/data/raw."
        )
    frame = pd.read_csv(DATA_FILE)
    required = set(GROUP + ["year", "yield_t_ha", "previous_observation_yield_t_ha"])
    if not required.issubset(frame.columns):
        raise ValueError(f"Processed dataset is missing columns: {sorted(required - set(frame.columns))}")

    categorical = BASE_CATEGORICAL
    numeric = [column for column in BASE_NUMERIC if column in frame.columns]
    climate_used = []
    for column in OPTIONAL_CLIMATE:
        if column not in frame.columns:
            continue
        coverage = float(frame[column].notna().mean())
        if coverage >= 0.80:
            climate_used.append(column)
    features = categorical + numeric + climate_used

    model_frame = frame.dropna(subset=["yield_t_ha", "previous_observation_yield_t_ha"]).copy()
    if "area_ha" in numeric:
        if model_frame["area_ha"].notna().mean() < 0.80:
            numeric.remove("area_ha")
            features.remove("area_ha")
    if len(model_frame) < 50:
        raise ValueError(
            f"Only {len(model_frame)} usable real observations remain after requiring "
            "prior observed yield. At least 50 are required before fitting a model."
        )
    model_frame["year"] = pd.to_numeric(model_frame["year"], errors="coerce")
    model_frame["yield_t_ha"] = pd.to_numeric(model_frame["yield_t_ha"], errors="coerce")
    model_frame = model_frame.dropna(subset=["year", "yield_t_ha"])
    train_years, validation_years, test_years = choose_year_boundaries(
        model_frame["year"].astype(int).tolist()
    )
    train = model_frame[model_frame["year"].astype(int).isin(train_years)]
    validation = model_frame[model_frame["year"].astype(int).isin(validation_years)]
    test = model_frame[model_frame["year"].astype(int).isin(test_years)]
    if min(len(train), len(validation), len(test)) < 2:
        raise ValueError(
            "Time-aware split produced fewer than two records in a partition. "
            "More verified historical observations are required."
        )
    print(f"Available years: {model_frame.year.min():.0f}–{model_frame.year.max():.0f}")
    print(f"Training years: {min(train_years)}–{max(train_years)}")
    print(f"Validation years: {min(validation_years)}–{max(validation_years)}")
    print(f"Testing years: {min(test_years)}–{max(test_years)}")

    candidates = [
        (
            "Random Forest",
            RandomForestRegressor(
                n_estimators=80,
                max_depth=18,
                min_samples_leaf=4,
                max_samples=0.75,
                n_jobs=N_JOBS,
                random_state=42,
            ),
        )
    ]
    try:
        from xgboost import XGBRegressor

        candidates.append(
            (
                "XGBoost",
                XGBRegressor(
                    n_estimators=350,
                    max_depth=7,
                    learning_rate=0.05,
                    subsample=0.85,
                    colsample_bytree=0.85,
                    objective="reg:squarederror",
                    n_jobs=-1,
                    random_state=42,
                ),
            )
        )
    except ImportError:
        print("XGBoost is not installed; only Random Forest will be evaluated.")

    validation_results = []
    for name, estimator in candidates:
        pipeline = make_pipeline(features, categorical, numeric + climate_used, estimator)
        pipeline.fit(train[features], train["yield_t_ha"])
        predicted = pipeline.predict(validation[features])
        scores = metric_set(validation["yield_t_ha"].to_numpy(), predicted)
        validation_results.append(
            {"name": name, "pipeline": pipeline, "validation_scores": scores, "predicted": predicted}
        )
        print(f"{name} validation MAE: {scores['mae_t_ha']:.4f} tonnes/ha")
    selected = min(validation_results, key=lambda result: result["validation_scores"]["mae_t_ha"])
    selected_name = selected["name"]
    chosen_candidate = next(estimator for name, estimator in candidates if name == selected_name)

    fit_data = pd.concat([train, validation]).sort_values("year")
    final_model = make_pipeline(features, categorical, numeric + climate_used, chosen_candidate)
    final_model.fit(fit_data[features], fit_data["yield_t_ha"])
    test_prediction = final_model.predict(test[features])
    test_actual = test["yield_t_ha"].to_numpy()
    test_metrics = metric_set(test_actual, test_prediction)
    baseline_prediction = baseline_predictions(fit_data, test, float(fit_data["yield_t_ha"].mean()))
    baseline_metrics = metric_set(test_actual, baseline_prediction)
    improvement = (
        float((baseline_metrics["mae_t_ha"] - test_metrics["mae_t_ha"]) / baseline_metrics["mae_t_ha"] * 100)
        if baseline_metrics["mae_t_ha"] > 0
        else None
    )

    validation_residuals = (
        validation["yield_t_ha"].to_numpy() - np.asarray(selected["predicted"])
    )
    interval = None
    if len(validation_residuals) >= 30:
        interval = {
            "method": "Approximate model-based prediction interval from validation residual 5th/95th percentiles",
            "residual_q05_t_ha": float(np.quantile(validation_residuals, 0.05)),
            "residual_q95_t_ha": float(np.quantile(validation_residuals, 0.95)),
            "calibration_samples": int(len(validation_residuals)),
        }

    train_group_stats = fit_data.groupby(GROUP)["yield_t_ha"].agg(["count", "mean", "std"])
    group_cv = (train_group_stats["std"] / train_group_stats["mean"].abs()).replace(
        [np.inf, -np.inf], np.nan
    )
    group_cv = group_cv[(train_group_stats["count"] >= 3) & group_cv.notna()]
    cv_reference = percentile_reference(group_cv.to_numpy())
    interval_width_reference = None
    if interval:
        width = interval["residual_q95_t_ha"] - interval["residual_q05_t_ha"]
        relative_widths = width / np.maximum(np.abs(np.asarray(selected["predicted"])), 1e-9)
        interval_width_reference = percentile_reference(relative_widths)
    risk_reference = (
        {
            "method": "Equal-weight mean of empirical percentile ranks for historical yield coefficient of variation and approximate prediction-interval width relative to predicted yield; tercile labels.",
            "cv_quantiles": cv_reference,
            "interval_width_ratio_quantiles": interval_width_reference,
            "minimum_history_observations": 3,
            "low_max_percentile": 33,
            "medium_max_percentile": 67,
        }
        if cv_reference and interval_width_reference
        else None
    )

    importance = []
    importance_sample_count = 0
    try:
        importance_test = test.sample(
            n=min(IMPORTANCE_SAMPLE_SIZE, len(test)),
            random_state=42,
        )
        importance_sample_count = len(importance_test)
        permutation = permutation_importance(
            final_model,
            importance_test[features],
            importance_test["yield_t_ha"],
            n_repeats=2,
            random_state=42,
            scoring="neg_mean_absolute_error",
            n_jobs=N_JOBS,
        )
        importance = [
            {"feature": name, "mae_increase_t_ha": float(value)}
            for name, value in sorted(
                zip(features, permutation.importances_mean),
                key=lambda pair: abs(pair[1]),
                reverse=True,
            )
        ]
    except (ValueError, RuntimeError) as exc:
        print(f"Global permutation importance unavailable: {exc}")

    quality = json.loads((METADATA_DIR / "data_quality_report.json").read_text(encoding="utf-8"))
    METADATA_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(final_model, MODEL_FILE)
    joblib.dump(final_model.named_steps["preprocessor"], PREPROCESSOR_FILE)
    metadata = {
        "status": "ready",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "file": "ml/data/processed/crop_yield_training.csv",
            "rows_total": int(len(frame)),
            "training_rows": int(len(train)),
            "validation_rows": int(len(validation)),
            "test_rows": int(len(test)),
            "distinct_states": int(frame["state"].nunique()),
            "distinct_districts": int(frame["district"].nunique()),
            "distinct_crops": int(frame["crop"].nunique()),
            "year_min": int(model_frame["year"].min()),
            "year_max": int(model_frame["year"].max()),
        },
        "features": features,
        "categorical_features": categorical,
        "numeric_features": numeric + climate_used,
        "target": "yield_t_ha",
        "model": selected_name,
        "model_parameters": {
            "n_estimators": 80,
            "max_depth": 18,
            "min_samples_leaf": 4,
            "max_samples": 0.75,
            "n_jobs": N_JOBS,
        },
        "training_years": [int(min(train_years)), int(max(train_years))],
        "validation_years": [int(min(validation_years)), int(max(validation_years))],
        "test_years": [int(min(test_years)), int(max(test_years))],
        "validation_candidates": [
            {"model": result["name"], **result["validation_scores"]}
            for result in validation_results
        ],
        "validation": selected["validation_scores"],
        "test": test_metrics,
        "baseline": {
            "method": "Mean observed yield in training plus validation data for the same state/district/crop/season; global training mean when that group is absent.",
            **baseline_metrics,
            "improvement_percent": improvement,
        },
        "prediction_interval": interval,
        "risk_reference": risk_reference,
        "global_permutation_importance": importance,
        "permutation_importance_samples": importance_sample_count,
        "explanation_note": "Permutation importance is global and does not explain an individual prediction. Per-prediction SHAP is unavailable unless the optional shap package is installed.",
        "imputed_columns": [
            feature
            for feature in numeric + climate_used
            if fit_data[feature].isna().any()
        ]
        + [
            feature
            for feature in categorical
            if fit_data[feature].isna().any()
        ],
        "climate_integrated": bool(quality.get("climate_integrated")),
        "climate_features_used": climate_used,
        "soil_integrated": False,
        "data_quality": {
            "total_rows": quality.get("total_rows"),
            "district_count": quality.get("district_count"),
            "crop_count": quality.get("crop_count"),
            "year_min": quality.get("year_min"),
            "year_max": quality.get("year_max"),
        },
    }
    METADATA_FILE.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    predictions = test[[*GROUP, "year", "yield_t_ha"]].copy()
    predictions["predicted_yield_t_ha"] = test_prediction
    predictions["baseline_yield_t_ha"] = baseline_prediction
    predictions.to_csv(PREDICTIONS_FILE, index=False)
    evaluation = {
        "model": selected_name,
        "test": test_metrics,
        "baseline": metadata["baseline"],
        "validation_candidates": metadata["validation_candidates"],
        "test_years": metadata["test_years"],
        "test_samples": len(test),
    }
    EVALUATION_FILE.write_text(json.dumps(evaluation, indent=2), encoding="utf-8")
    print("\nMODEL EVALUATION (future-year holdout)")
    print(f"Model: {selected_name}")
    print(f"MAE: {test_metrics['mae_t_ha']:.4f} tonnes/ha")
    print(f"RMSE: {test_metrics['rmse_t_ha']:.4f} tonnes/ha")
    print(f"R²: {test_metrics['r2'] if test_metrics['r2'] is not None else 'not available'}")
    print(f"Baseline MAE: {baseline_metrics['mae_t_ha']:.4f} tonnes/ha")
    print(f"Improvement: {improvement if improvement is not None else 'not measurable'}")
    print(f"Test samples: {len(test)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, pd.errors.ParserError) as exc:
        print(f"Model training stopped: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc
