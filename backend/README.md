# Government Scheme Intelligence ML service

This service provides real Random Forest scheme-relevance inference for the existing React/Vite app. Relevance prediction and prototype hard-eligibility checks are separate. It does not determine official eligibility.

## Reproducible local setup (PowerShell)

From the project root:

```powershell
py -3.12 -m venv backend\.venv
backend\.venv\Scripts\python -m pip install -r backend\requirements.txt
Set-Location backend
.\.venv\Scripts\python -m ml.generate_training_data
.\.venv\Scripts\python -m ml.train_model
.\.venv\Scripts\python -m ml.evaluate_model
.\.venv\Scripts\python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

In another terminal, from the project root:

```powershell
npm install
$env:VITE_API_BASE_URL = "http://127.0.0.1:8000"
npm run dev -- --host 0.0.0.0 --port 5174 --strictPort
```

The currently configured UI port `5174` is allowed by the development CORS policy. Override the policy with a comma-separated `AGRI_ALLOWED_ORIGINS` list when necessary; production should set only its own frontend origin. CORS is not configured as an unrestricted wildcard.

Once the API is running, from `backend/`, run `python test_api.py` to exercise health, metadata, predictions, probability sums, explanations, and profile diversity. Endpoints are `/health`, `/model-info`, `/schemes`, `/schemes/{scheme_id}`, and `/predict-schemes`.

The generated CSV, model, encoder, and evaluation metrics are reproducible local artifacts and are included for this runnable prototype. Regenerate the training data and train the model after changing scheme metadata, feature engineering, or label logic.

The persisted classifier was trained with scikit-learn 1.4.2; that version is pinned in `requirements.txt` so a fresh environment can load the included model artifact compatibly.

## Interpretation and limitations

The model is a supervised `RandomForestClassifier` trained on the generated examples. Its relevance-class probability is labelled **ML Relevance Confidence**, not eligibility confidence. Per-result explanations are counterfactual model-sensitivity estimates (change in the predicted-class probability when one profile field is replaced by a documented reference value); they are neither SHAP values nor causal explanations. Reported evaluation metrics are synthetic-holdout metrics and are not evidence of real-farmer performance. Confirm every programme's current terms, deadlines, and eligibility on the official source.

The service only receives the profile fields required for this prototype. It does not persist prediction requests or log farmer profiles.

## Engine 2 — real-data crop production

Engine 2 uses a separate `backend.main:app` process on port `8001`; the scheme
service above remains on port `8000`. Follow the root `README.md` instructions to
place real ICRISAT or data.gov.in observations, optionally fetch NASA POWER climate,
process source columns/units, train with time-aware validation, and launch
`backend\.venv\Scripts\python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8001`.

The web API serves only verified-data predictions. An isolated synthetic scenario
file may be generated for offline testing with
`backend\.venv\Scripts\python ml\scripts\generate_synthetic_projection.py`. It is
not exposed through the web API and never enters real-data training or metrics.
