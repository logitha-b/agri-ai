"""Optional per-record TreeSHAP explanation; never invent contributions."""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd


ROOT = Path(__file__).resolve().parent
MODEL_FILE = ROOT / "models" / "crop_yield_model.joblib"
METADATA_FILE = ROOT / "metadata" / "model_metadata.json"


def explain_prediction(features: dict) -> dict:
    if not MODEL_FILE.is_file() or not METADATA_FILE.is_file():
        return {"available": False, "reason": "No trained real-data model is available.", "values": []}
    try:
        import shap
    except ImportError:
        return {
            "available": False,
            "reason": "Optional SHAP dependency is not installed; no individual explanation is shown.",
            "values": [],
        }
    import json

    metadata = json.loads(METADATA_FILE.read_text(encoding="utf-8"))
    pipeline = joblib.load(MODEL_FILE)
    preprocessor = pipeline.named_steps["preprocessor"]
    estimator = pipeline.named_steps["model"]
    columns = metadata["features"]
    transformed = preprocessor.transform(pd.DataFrame([{key: features.get(key) for key in columns}]))
    try:
        explanation = shap.TreeExplainer(estimator)(transformed)
    except (ValueError, RuntimeError, TypeError, ImportError) as exc:
        return {
            "available": False,
            "reason": f"TreeSHAP could not be computed for the selected model: {exc}",
            "values": [],
        }
    values = explanation.values[0]
    feature_names = preprocessor.get_feature_names_out()
    contributions = []
    for name, value in zip(feature_names, values):
        contributions.append({"feature": str(name), "shapValue": float(value)})
    contributions.sort(key=lambda item: abs(item["shapValue"]), reverse=True)
    return {
        "available": True,
        "method": "TreeSHAP",
        "baseline": float(explanation.base_values[0]),
        "values": contributions[:10],
    }
