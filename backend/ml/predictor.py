"""Model-backed relevance inference, counterfactual explanations, and rule checks."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from ml.feature_engineering import (
    CLASS_WEIGHTS,
    FEATURE_COLUMNS,
    RELEVANCE_CLASSES,
    build_feature_frame,
    build_feature_row,
)

ROOT = Path(__file__).resolve().parents[1]
SCHEMES_PATH = ROOT / "data" / "schemes.json"
MODEL_PATH = ROOT / "models" / "scheme_recommender.joblib"
ENCODER_PATH = ROOT / "models" / "feature_encoder.joblib"
EXPLANATION_PROFILES = {
    "state": "Unknown",
    "district": "Unknown",
    "crop": "Other",
    "farmer_category": "Other",
    "irrigation": "Unknown",
    "activity": "Other",
    "land_area": 2.5,
    "annual_income": 150000,
    "age": 42,
}
EXPLANATION_LABELS = {
    "state": "State compatibility",
    "district": "District compatibility",
    "crop": "Crop compatibility",
    "farmer_category": "Farmer category",
    "irrigation": "Irrigation compatibility",
    "activity": "Activity compatibility",
    "land_area": "Land area",
    "annual_income": "Annual income",
    "age": "Age",
}


@lru_cache(maxsize=1)
def load_schemes() -> list[dict[str, Any]]:
    return json.loads(SCHEMES_PATH.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_model_artifacts():
    if not MODEL_PATH.exists() or not ENCODER_PATH.exists():
        raise FileNotFoundError(
            "Trained scheme model artifacts are missing. Run "
            "`python -m ml.generate_training_data` and `python -m ml.train_model` from backend/."
        )
    return joblib.load(MODEL_PATH), joblib.load(ENCODER_PATH)


def _normal(value: Any) -> str:
    return " ".join(str(value or "").strip().casefold().replace("_", " ").split())


def _in_scope(value: Any, allowed: list[str] | None) -> bool:
    return not allowed or _normal(value) in {_normal(item) for item in allowed}


def _verify_range(value: float, lower: float | None, upper: float | None) -> bool:
    return (lower is None or value >= lower) and (upper is None or value <= upper)


def check_eligibility(profile: dict[str, Any], scheme: dict[str, Any]) -> dict[str, Any]:
    """Check only explicit hard constraints; unverified official conditions stay pending."""
    checks = {
        "state": _in_scope(profile["state"], scheme.get("states")),
        "district": _in_scope(profile["district"], scheme.get("districts")),
        "crop": _in_scope(profile["crop"], scheme.get("crops")),
        "activity": _in_scope(profile["activity"], scheme.get("activities")),
        "farmer_category": _in_scope(profile["farmer_category"], scheme.get("farmer_categories")),
        "irrigation": _in_scope(profile["irrigation"], scheme.get("irrigation_types")),
        "land_area": _verify_range(float(profile["land_area"]), scheme.get("min_land"), scheme.get("max_land")),
        "annual_income": scheme.get("income_limit") is None or float(profile.get("annual_income") or 0) <= scheme["income_limit"],
        "age": _verify_range(float(profile.get("age") or 0), scheme.get("min_age"), scheme.get("max_age")),
    }
    hard = set(scheme.get("hard_constraints") or [])
    failed = sorted(key for key in hard if key in checks and not checks[key])
    matched = sorted(key for key in hard if key in checks and checks[key])
    for key, field in (
        ("state", "state"),
        ("district", "district"),
        ("crop", "crop"),
        ("activity", "activity"),
        ("farmer_category", "farmer category"),
        ("irrigation", "irrigation"),
        ("land_area", "land area"),
        ("annual_income", "annual income"),
        ("age", "age"),
    ):
        if key not in hard:
            bounds_exist = (
                key == "land_area" and (scheme.get("min_land") is not None or scheme.get("max_land") is not None)
            ) or (
                key == "annual_income" and scheme.get("income_limit") is not None
            ) or (
                key == "age" and (scheme.get("min_age") is not None or scheme.get("max_age") is not None)
            )
            if not bounds_exist:
                continue
            hard.add(key)
            (matched if checks[key] else failed).append(field)

    if failed:
        status = "not_eligible"
        label = "Not Eligible based on prototype rules"
    else:
        status = "potentially_eligible"
        label = "Potentially Eligible · verify official rules"
    return {
        "status": status,
        "label": label,
        "eligible": status == "potentially_eligible",
        "potentially_eligible": status == "potentially_eligible",
        "not_eligible": status == "not_eligible",
        "needs_verification": True,
        "matched_conditions": [
            f"{key.replace('_', ' ').title()} matches the scheme's declared prototype scope."
            for key in matched
        ],
        "failed_conditions": [
            f"{key.replace('_', ' ').title()} conflicts with an explicit prototype hard constraint."
            for key in failed
        ],
        "verification_required": True,
        "note": scheme.get("note", "Verify the current official eligibility rules."),
    }


def _counterfactual_explanation(
    profile: dict[str, Any],
    scheme: dict[str, Any],
    classifier,
    encoder,
    predicted_class: int,
    original_probability: float,
) -> list[dict[str, Any]]:
    """Estimate local factor effects by changing one profile field at a time.

    These are model sensitivity estimates, not SHAP values or causal effects.
    """
    effects = []
    for field, replacement in EXPLANATION_PROFILES.items():
        altered = dict(profile)
        altered[field] = replacement
        feature_row = build_feature_row(altered, scheme)
        transformed = encoder.transform(build_feature_frame([feature_row]))
        probabilities = classifier.predict_proba(transformed)[0]
        class_index = list(classifier.classes_).index(predicted_class)
        delta = float(original_probability - probabilities[class_index])
        effects.append(
            {
                "factor": EXPLANATION_LABELS[field],
                "field": field,
                "delta_probability": round(delta, 6),
                "direction": "supports" if delta > 0 else "reduces" if delta < 0 else "no measurable change",
                "absolute_effect": abs(delta),
            }
        )
    effects.sort(key=lambda item: item["absolute_effect"], reverse=True)
    selected = effects[:5]
    denominator = sum(item["absolute_effect"] for item in selected)
    for item in selected:
        item["relative_importance"] = round(
            100 * item["absolute_effect"] / denominator if denominator else 0.0,
            1,
        )
        item.pop("absolute_effect")
    return selected


def predict_schemes(profile: dict[str, Any], limit: int | None = None) -> list[dict[str, Any]]:
    classifier, encoder = load_model_artifacts()
    schemes = load_schemes()
    feature_rows = [build_feature_row(profile, scheme) for scheme in schemes]
    missing_columns = set(FEATURE_COLUMNS) - set(feature_rows[0])
    if missing_columns:
        raise ValueError(f"Prediction feature schema is incomplete: {sorted(missing_columns)}")
    frame = build_feature_frame(feature_rows)
    probabilities = classifier.predict_proba(encoder.transform(frame))
    predicted = classifier.classes_[np.argmax(probabilities, axis=1)]
    results = []
    for scheme, feature_row, class_id, class_probabilities in zip(schemes, feature_rows, predicted, probabilities):
        class_id = int(class_id)
        confidence = float(class_probabilities[list(classifier.classes_).index(class_id)])
        eligibility = check_eligibility(profile, scheme)
        match_scopes = (
            ("activity_match", "activities", "Activity compatibility"),
            ("crop_match", "crops", "Crop compatibility"),
            ("state_match", "states", "State compatibility"),
            ("district_match", "districts", "District compatibility"),
            ("category_match", "farmer_categories", "Farmer category"),
            ("irrigation_match", "irrigation_types", "Irrigation compatibility"),
        )
        matched = [
            label
            for feature_name, scope_name, label in match_scopes
            if scheme.get(scope_name) and feature_row[feature_name]
        ]
        for feature_name, configured, label in (
            (
                "land_match",
                scheme.get("min_land") is not None or scheme.get("max_land") is not None,
                "Land area",
            ),
            ("income_match", scheme.get("income_limit") is not None, "Income range"),
            (
                "age_match",
                scheme.get("min_age") is not None or scheme.get("max_age") is not None,
                "Age range",
            ),
        ):
            if configured and feature_row[feature_name]:
                matched.append(label)
        results.append(
            {
                "scheme_id": scheme["id"],
                "scheme_name": scheme["name"],
                "short_name": scheme["short_name"],
                "category": scheme["category"],
                "description": scheme["description"],
                "relevance_class_id": class_id,
                "relevance_class": RELEVANCE_CLASSES[class_id],
                "ml_confidence": round(confidence, 6),
                "relevance_probabilities": {
                    RELEVANCE_CLASSES[int(class_number)]: round(float(probability), 6)
                    for class_number, probability in zip(classifier.classes_, class_probabilities)
                },
                "eligibility": eligibility,
                "eligibility_status": eligibility["status"],
                "matched_conditions": matched,
                "explanation_method": "Model counterfactual sensitivity (not SHAP)",
                "explanation": _counterfactual_explanation(
                    profile,
                    scheme,
                    classifier,
                    encoder,
                    class_id,
                    confidence,
                ),
                "benefits": scheme["benefits"],
                "required_documents": scheme["required_documents"],
                "deadline": scheme["deadline"],
                "department": scheme["department"],
                "official_link": scheme.get("official_link"),
                "source": scheme.get("source"),
                "verified": scheme.get("verified", False),
                "verification_required": True,
                "scheme_details": scheme,
            }
        )
    results.sort(key=lambda item: (item["ml_confidence"], item["relevance_class_id"]), reverse=True)
    return results[:limit] if limit is not None else results


def model_information() -> dict[str, Any]:
    metrics_path = ROOT / "models" / "evaluation.json"
    metrics = json.loads(metrics_path.read_text(encoding="utf-8")) if metrics_path.exists() else None
    return {
        "model": "Random Forest Classifier",
        "task": "Scheme Relevance Classification",
        "input": "Farmer + Agricultural Profile",
        "classes": list(RELEVANCE_CLASSES.values()),
        "explainability": "Local counterfactual sensitivity using model predictions; not SHAP",
        "training": "Curated scheme metadata + deterministic synthetic prototype profiles",
        "training_metrics": metrics,
        "limitations": "Metrics reflect a synthetic rule-derived holdout, not real farmer outcomes. Verify all eligibility decisions with the official scheme source.",
        "feature_importance": sorted(
            [
                {"feature": str(name), "importance": round(float(value), 6)}
                for name, value in zip(
                    encoder_names(load_model_artifacts()[1]),
                    load_model_artifacts()[0].feature_importances_,
                )
            ],
            key=lambda item: item["importance"],
            reverse=True,
        )[:20],
    }


def encoder_names(encoder) -> list[str]:
    return list(encoder.get_feature_names_out())
