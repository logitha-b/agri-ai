# Scheme metadata and synthetic training data

`schemes.json` is a curated prototype catalogue, assembled from the corresponding official programme portals and national/state department descriptions. Its crop/activity tags are recommendation taxonomy, not complete official beneficiary criteria. `null` thresholds and empty scope arrays mean that the prototype has no defensible hard restriction for that field; they do not imply that a real applicant qualifies. Eligibility must be checked against current official rules, notifications, and local implementation.

`generate_training_data.py` uses a fixed seed to generate 2,400 plausible synthetic farmer profiles spanning agricultural states, districts, crops, farming activities, land sizes, categories, irrigation, household income, and age. Each profile is paired with each scheme. The result is 21,600 profile/scheme rows when the catalogue contains nine schemes.

The four supervised relevance labels (0 Not Relevant, 1 Potentially Relevant, 2 Relevant, 3 Highly Relevant) are produced by the documented weighted relevance rubric in `ml/feature_engineering.py`. Activity and crop alignment have the largest weights; state, district, farmer category, irrigation, and available numeric scope constraints contribute as described by the code. When the catalogue has no supported constraint for a dimension, the rubric treats it as neutral rather than inventing an exclusion. Label thresholds are fixed in source. These labels train a Random Forest to generalize scheme relevance; the trained model, not the frontend or inference-time label rubric, produces recommendation classes and probabilities.

This is a prototype trained on curated metadata and generated synthetic profiles, **not real farmer application or outcome data**. Evaluation scores only measure agreement with a held-out synthetic, rule-derived test split. They must not be interpreted as real-world accuracy or a probability of government approval. The separate eligibility checker only rejects explicitly recorded hard constraints and otherwise asks the farmer to verify official criteria.

Rebuild the CSV from `backend/` with `python -m ml.generate_training_data`. The generator overwrites only its named output file, `scheme_training_data.csv`.

## Attached application-outcome example file

`farmer_outcomes_sample.csv` is the user-supplied 5,000-row example file used by the scheme page's aggregate sample panel. All rows identify their `outcome_source` as synthetic generated examples, not official records. The API validates that provenance and exposes only aggregate application/payment counts; it does not use these rows to train the scheme relevance model or represent the counts as real farmer outcomes.
