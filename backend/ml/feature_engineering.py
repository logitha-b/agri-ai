"""Shared feature schema and scheme/profile feature construction."""

from __future__ import annotations

from typing import Any

import pandas as pd

CATEGORICAL_COLUMNS = [
    "state",
    "district",
    "crop",
    "farmer_category",
    "irrigation",
    "activity",
    "scheme_id",
]
PROFILE_NUMERIC_COLUMNS = ["land_area", "annual_income", "age"]
MATCH_COLUMNS = [
    "activity_match",
    "crop_match",
    "state_match",
    "district_match",
    "category_match",
    "irrigation_match",
    "land_match",
    "income_match",
    "age_match",
]
FEATURE_COLUMNS = CATEGORICAL_COLUMNS + PROFILE_NUMERIC_COLUMNS + MATCH_COLUMNS
RELEVANCE_CLASSES = {
    0: "Not Relevant",
    1: "Potentially Relevant",
    2: "Relevant",
    3: "Highly Relevant",
}
CLASS_WEIGHTS = {
    "activity": 0.29,
    "crop": 0.18,
    "state": 0.08,
    "district": 0.04,
    "category": 0.10,
    "irrigation": 0.08,
    "land": 0.09,
    "income": 0.07,
    "age": 0.07,
}
NUMERIC_COLUMNS = PROFILE_NUMERIC_COLUMNS + MATCH_COLUMNS


def _key(value: Any) -> str:
    return " ".join(str(value or "").strip().casefold().replace("_", " ").split())


def _in_scope(value: Any, allowed: list[str] | None) -> bool:
    if not allowed:
        return True
    normalized = {_key(option) for option in allowed}
    return _key(value) in normalized


def _within_range(value: float, lower: float | None, upper: float | None) -> bool:
    return (lower is None or value >= lower) and (upper is None or value <= upper)


def build_feature_row(profile: dict[str, Any], scheme: dict[str, Any]) -> dict[str, Any]:
    """Create the model's categorical, numeric, and scheme-match inputs."""
    land = float(profile["land_area"])
    income = float(profile.get("annual_income") or 0)
    age = float(profile.get("age") or 0)
    checks = {
        "activity_match": _in_scope(profile["activity"], scheme.get("activities")),
        "crop_match": _in_scope(profile["crop"], scheme.get("crops")),
        "state_match": _in_scope(profile["state"], scheme.get("states")),
        "district_match": _in_scope(profile["district"], scheme.get("districts")),
        "category_match": _in_scope(profile["farmer_category"], scheme.get("farmer_categories")),
        "irrigation_match": _in_scope(profile["irrigation"], scheme.get("irrigation_types")),
        "land_match": _within_range(land, scheme.get("min_land"), scheme.get("max_land")),
        "income_match": scheme.get("income_limit") is None or income <= scheme["income_limit"],
        "age_match": _within_range(age, scheme.get("min_age"), scheme.get("max_age")),
    }
    row = {
        "state": profile["state"],
        "district": profile["district"],
        "crop": profile["crop"],
        "farmer_category": profile["farmer_category"],
        "irrigation": profile["irrigation"],
        "activity": profile["activity"],
        "scheme_id": scheme["id"],
        "land_area": land,
        "annual_income": income,
        "age": age,
    }
    row.update({name: int(value) for name, value in checks.items()})
    return row


def build_feature_frame(rows: list[dict[str, Any]]) -> pd.DataFrame:
    """Apply a stable ordered schema to inference or training examples."""
    return pd.DataFrame(rows, columns=FEATURE_COLUMNS)


def label_relevance(profile: dict[str, Any], scheme: dict[str, Any]) -> int:
    """Transparent synthetic-label rubric; not an official eligibility rule."""
    feature = build_feature_row(profile, scheme)
    groups = {
        "activity": ("activities", "activity_match"),
        "crop": ("crops", "crop_match"),
        "state": ("states", "state_match"),
        "district": ("districts", "district_match"),
        "category": ("farmer_categories", "category_match"),
        "irrigation": ("irrigation_types", "irrigation_match"),
        "land": ("min_land", "land_match"),
        "income": ("income_limit", "income_match"),
        "age": ("min_age", "age_match"),
    }
    score = 0.0
    for group, weight in CLASS_WEIGHTS.items():
        scope, match_name = groups[group]
        configured = (
            bool(scheme.get(scope))
            if scope.endswith("s")
            else scheme.get(scope) is not None
        )
        match_score = 0.98 if feature[match_name] else 0.05
        score += weight * (match_score if configured else 0.68)

    if score >= 0.77:
        return 3
    if score >= 0.62:
        return 2
    if score >= 0.46:
        return 1
    return 0
