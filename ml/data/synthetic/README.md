# Synthetic crop-yield scenario extension

This directory is intentionally separate from `ml/data/processed/` and the real
training pipeline. Generate the extension after the verified real-data model has
been processed, trained, and evaluated:

```powershell
backend\.venv\Scripts\python ml\scripts\generate_synthetic_projection.py
```

The generator starts after the final year of the real observations, rolls the
real-data model forward one year at a time, and samples held-out real test
residuals to create scenario variation. The random seed and method are recorded
in `crop_yield_synthetic_projection.metadata.json`.

Every row is marked `synthetic` and identifies its generated yield, model
projection, sampled residual, and non-observed source. These values are
hypothetical scenarios only. They are not official data, observations, validated
forecasts, or a substitute for current agricultural statistics. Never merge
these records into the real training table or real-data evaluation.
