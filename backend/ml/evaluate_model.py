"""Reproduce the held-out metrics for the persisted scheme classifier."""

from __future__ import annotations

import json

import joblib
import pandas as pd
from sklearn.metrics import classification_report
from sklearn.model_selection import GroupShuffleSplit

from ml.feature_engineering import FEATURE_COLUMNS, RELEVANCE_CLASSES
from ml.train_model import (
    CLASSIFIER_PATH,
    DATA_PATH,
    ENCODER_PATH,
    RANDOM_STATE,
    evaluation_metrics,
    print_metrics,
)


def main() -> None:
    if not DATA_PATH.exists() or not CLASSIFIER_PATH.exists() or not ENCODER_PATH.exists():
        raise FileNotFoundError("Training data/model artifacts missing; generate the data and run python -m ml.train_model.")
    data = pd.read_csv(DATA_PATH)
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=RANDOM_STATE)
    _, test_indices = next(splitter.split(data, groups=data["profile_id"]))
    x_test = data.iloc[test_indices][FEATURE_COLUMNS]
    y_test = data.iloc[test_indices]["relevance_class"]
    classifier = joblib.load(CLASSIFIER_PATH)
    encoder = joblib.load(ENCODER_PATH)
    predictions = classifier.predict(encoder.transform(x_test))
    metrics = evaluation_metrics(y_test, predictions)
    print_metrics(metrics)
    print("Per-class metrics:")
    print(classification_report(
        y_test,
        predictions,
        labels=sorted(RELEVANCE_CLASSES),
        target_names=[RELEVANCE_CLASSES[key] for key in sorted(RELEVANCE_CLASSES)],
        zero_division=0,
    ))
    print("Metrics are for a synthetic rule-derived holdout, not real-world farmer outcomes.")


if __name__ == "__main__":
    main()
