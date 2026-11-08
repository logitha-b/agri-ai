"""Train, evaluate, and persist the supervised scheme-relevance classifier."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from ml.feature_engineering import (
    CATEGORICAL_COLUMNS,
    FEATURE_COLUMNS,
    NUMERIC_COLUMNS,
    RELEVANCE_CLASSES,
)

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "scheme_training_data.csv"
MODEL_DIR = ROOT / "models"
CLASSIFIER_PATH = MODEL_DIR / "scheme_recommender.joblib"
ENCODER_PATH = MODEL_DIR / "feature_encoder.joblib"
METRICS_PATH = MODEL_DIR / "evaluation.json"
RANDOM_STATE = 42


def make_preprocessor() -> ColumnTransformer:
    # Random forests split on thresholds, so scaling the numeric inputs is unnecessary.
    return ColumnTransformer(
        [
            ("categorical", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_COLUMNS),
            ("numeric", "passthrough", NUMERIC_COLUMNS),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )


def evaluation_metrics(y_true, y_pred) -> dict:
    labels = sorted(RELEVANCE_CLASSES)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "macro_precision": float(precision_score(y_true, y_pred, labels=labels, average="macro", zero_division=0)),
        "macro_recall": float(recall_score(y_true, y_pred, labels=labels, average="macro", zero_division=0)),
        "macro_f1": float(f1_score(y_true, y_pred, labels=labels, average="macro", zero_division=0)),
        "labels": labels,
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist(),
        "classification_report": classification_report(
            y_true,
            y_pred,
            labels=labels,
            target_names=[RELEVANCE_CLASSES[label] for label in labels],
            output_dict=True,
            zero_division=0,
        ),
    }


def print_metrics(metrics: dict) -> None:
    print(f"Accuracy:         {metrics['accuracy']:.4f}")
    print(f"Macro precision:  {metrics['macro_precision']:.4f}")
    print(f"Macro recall:     {metrics['macro_recall']:.4f}")
    print(f"Macro F1:         {metrics['macro_f1']:.4f}")
    print("Confusion matrix (rows=true, columns=predicted; classes 0..3):")
    print(pd.DataFrame(metrics["confusion_matrix"], index=range(4), columns=range(4)).to_string())
    report = metrics["classification_report"]
    print("Per-class precision / recall / F1 / support:")
    for class_id, label in RELEVANCE_CLASSES.items():
        row = report[label]
        print(
            f"  {label:<22} "
            f"P={row['precision']:.4f} R={row['recall']:.4f} "
            f"F1={row['f1-score']:.4f} n={int(row['support'])}"
        )


def train() -> dict:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Training data not found at {DATA_PATH}. Run python -m ml.generate_training_data first.")
    dataset = pd.read_csv(DATA_PATH)
    missing = set(FEATURE_COLUMNS + ["relevance_class"]) - set(dataset.columns)
    if missing:
        raise ValueError(f"Training data is missing columns: {sorted(missing)}")
    # Keep every scheme row for a synthetic farmer in only one split.
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=RANDOM_STATE)
    train_indices, test_indices = next(splitter.split(dataset, groups=dataset["profile_id"]))
    x_train, x_test = dataset.iloc[train_indices][FEATURE_COLUMNS], dataset.iloc[test_indices][FEATURE_COLUMNS]
    y_train, y_test = dataset.iloc[train_indices]["relevance_class"], dataset.iloc[test_indices]["relevance_class"]
    preprocessor = make_preprocessor()
    pipeline = Pipeline(
        [
            ("preprocessor", preprocessor),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=240,
                    max_depth=18,
                    min_samples_leaf=2,
                    class_weight="balanced_subsample",
                    random_state=RANDOM_STATE,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    pipeline.fit(x_train, y_train)
    classifier = pipeline.named_steps["classifier"]
    encoder = pipeline.named_steps["preprocessor"]
    y_pred = pipeline.predict(x_test)
    metrics = evaluation_metrics(y_test, y_pred)
    metrics.update(
        {
            "model": "RandomForestClassifier",
            "task": "scheme relevance classification",
            "random_state": RANDOM_STATE,
            "training_rows": int(len(x_train)),
            "test_rows": int(len(x_test)),
            "feature_columns": FEATURE_COLUMNS,
            "data_note": "Metrics measure agreement with a synthetic rule-derived holdout, not real farmer outcomes.",
        }
    )
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(classifier, CLASSIFIER_PATH)
    joblib.dump(encoder, ENCODER_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print_metrics(metrics)
    print(f"Saved classifier: {CLASSIFIER_PATH}")
    print(f"Saved feature encoder: {ENCODER_PATH}")
    print(f"Saved evaluation metrics: {METRICS_PATH}")
    return metrics


if __name__ == "__main__":
    train()
