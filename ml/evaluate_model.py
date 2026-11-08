"""Print metrics from the untouched future-year test set created during training."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "metadata" / "evaluation.json"
PREDICTIONS = ROOT / "metadata" / "test_predictions.csv"


def main() -> int:
    if not REPORT.is_file() or not PREDICTIONS.is_file():
        raise SystemExit(
            "No real-data evaluation is available. Run python ml/train_model.py after "
            "processing the official source dataset."
        )
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    test = report["test"]
    baseline = report["baseline"]
    print("MODEL EVALUATION")
    print(f"Model: {report['model']}")
    print(f"MAE: {test['mae_t_ha']:.4f} tonnes/ha")
    print(f"RMSE: {test['rmse_t_ha']:.4f} tonnes/ha")
    print(f"R²: {test['r2'] if test['r2'] is not None else 'not available'}")
    print(f"Baseline MAE: {baseline['mae_t_ha']:.4f} tonnes/ha")
    improvement = baseline.get("improvement_percent")
    print(f"Improvement: {improvement:.2f}%" if improvement is not None else "Improvement: not measurable")
    print(f"Test samples: {report['test_samples']}")
    print(f"Actual-vs-predicted observations: {PREDICTIONS}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
