# Agri-Economic Intelligence

React/Vite frontend for the Agri-Economic Intelligence prototype. Engine 2,
**AI Crop Production & Yield Intelligence**, is deliberately real-data-only. No
synthetic yield records, mock production charts, placeholder predictions, confidence
percentages, or evaluation metrics are included.

## Market & Profit data

The Market & Profit page uses the supplied AGMARKNET market-wise report snapshot,
bundled at `src/data/agmarknetMarketPrices.json`. The raw CSV is preserved at
`ml/data/raw/agmarknet_market_prices_2026-10-13.csv`; regenerate the validated
frontend bundle with:

```powershell
python ml/scripts/process_agmarknet_market_prices.py
python -m unittest ml.scripts.test_process_agmarknet_market_prices -v
```

Reported minimum, maximum, and modal prices are in rupees per quintal. The page
converts the selected modal price to an indicative gross for the entered quantity;
it does not subtract costs because the export provides no cost data. The dated
export has no arrival quantities and is not a live market quote. Missing prices
and commodity/location combinations remain unavailable rather than being filled
with illustrative values.

## Engine 2 data status

An ICRISAT District Level Data CSV supplied for this project is now integrated.
The source is wide-format (one row per district/year with crop-specific columns);
the processor reshapes documented yield columns and converts `Kg per ha` to
tonnes/hectare. Annual crop series remain annual; the explicitly labeled Kharif
and Rabi sorghum series retain those seasons. Model predictions and metrics are
available only after training and future-year evaluation complete successfully.

The file is retained as `ml/data/raw/icrisat_crop_production.csv`, with a SHA-256
provenance sidecar. No NASA POWER climate or SoilGrids layer is integrated, and no
values from those sources are synthesized.

### Offline synthetic extension

The verified ICRISAT series ends in 2017. To demonstrate later-year interactions
in offline development, a separate synthetic scenario dataset can be generated
for 2018 through the current calendar year:

```powershell
backend\.venv\Scripts\python ml\scripts\generate_synthetic_projection.py
```

This rolls the trained real-data model forward and bootstraps residuals from its
held-out real test predictions. Generated rows are saved separately under
`ml/data/synthetic/`; they are never appended to the ICRISAT training table, used
to calculate real-data evaluation metrics, or included in real-data predictions.
The web app and its API do not expose this synthetic dataset; Crop Production
offers verified source observations only. Synthetic values are hypothetical
scenarios, not observed records, official statistics, current agricultural facts,
or validated forecasts. Do not use them for farm planning or claims about actual
production.

The validated processor output currently contains 179,489 observations across
20 states, 311 district labels, and 21 crop categories for 1978–2017. Invalid or
zero-yield source rows were excluded; the raw source file remains unchanged.

### Additional DES/DACNET workbook (kept separate)

The supplied `area-production.xlsx` is preserved as
`ml/data/raw/des_area_production_1997_2019.xlsx`. Its worksheet describes
district crop area and production from 1997–2019, reports source attribution as
DACNET, and documents area in 000 ha, production in 000 tonnes, and yield in
kg/ha (with coconut yields in nuts/ha and special production units for coconut,
cotton, jute, mesta, and sugarcane).

Run the separate standardizer and comparison report with:

```powershell
python ml/scripts/process_des_area_production.py
python -m unittest ml.scripts.test_process_des_area_production -v
```

The derived table and provenance are saved under
`ml/data/processed/des_area_production_1997_2019.*`. It contains 237,088
positive source-yield observations across 52 crop labels, 598 state/district
labels, and 1997–2019. There are 234,396 yields convertible to tonnes/hectare;
coconut's 2,692 native nuts/hectare observations are preserved separately.
The comparison found 39,553 unambiguous matching district/crop/year keys with
ICRISAT. 35,900 exact values differ, but the median absolute difference is
0.00465 t/ha; 12,681 differ by more than 0.05 t/ha and 2,605 by more than
0.5 t/ha. Among 217,758 observations where area and production can independently
reconstruct yield, 494 differ from the reported yield by more than 1%. The
workbook also contains 132 duplicate DES district/crop/year keys (264 source
rows), and the processor flags 8,438 IQR outlier observations, including a
maximum converted yield of 4,070 t/ha. These are retained and reported—not
silently deleted. Therefore this workbook remains a separate validation dataset
and is not merged into model training until its duplicate records, outliers, and
source differences are reviewed.

## Exact agricultural file and required columns

Download the actual source export from one of these official pages and place the
unmodified file here:

```text
ml/data/raw/des_crop_production.csv
```

Official source: [data.gov.in — District-wise, season-wise crop production
statistics](https://data.gov.in/resource/district-wise-season-wise-crop-production-statistics-1997).

Alternatively:

```text
ml/data/raw/icrisat_crop_production.csv
ml/data/raw/icrisat_crop_production.xlsx
```

Official source: [ICRISAT District Level
Database](https://www.icrisat.org/resources/data/district-level-data).

For ICRISAT, the wide-format District Level Data export is also supported. Its
`State Name`, `Dist Name`, `Year`, and crop-specific `... YIELD (Kg per ha)`
columns are reshaped into crop observations. Crop-area columns in `1000 ha` and
production columns in `1000 tons` are converted using those documented units.
The ICRISAT file has annual series; the explicitly named Kharif/Rabi sorghum
series retain those seasons and other series are labeled Annual.

Other files must contain columns representing **State, District, Crop, Season,
and Year**, plus either:

- a source-documented yield field in tonnes/hectare (or another explicitly
  documented convertible unit), or
- Area and Production fields with compatible, source-documented units.

The processor recognizes common DES-style headers such as `State_Name`,
`District_Name`, `Crop_Year`, `Season`, `Crop`, `Area`, and `Production`. It does
not guess generic column units. After checking the official file's metadata, pass
the verified units if needed; for example:

```powershell
python ml/scripts/process_data.py --area-unit "1000 ha" --production-unit "1000 tonnes"
```

Do **not** copy those sample unit flags without confirming the source documentation.
The processor rejects invalid area/production, ambiguous units, conflicting source
records, and unverified crop-name mappings. It writes
`ml/data/processed/crop_yield_training.csv` and measured quality/provenance reports.

The data.gov.in downloader requires credentials and the API resource identifier
issued by that official resource page. Store these in your shell environment; do
not put API keys in source files:

```powershell
$env:DATA_GOV_IN_API_KEY = "<your official data.gov.in API key>"
$env:DATA_GOV_IN_RESOURCE_ID = "<actual API resource identifier>"
python ml/scripts/download_des.py
```

The ICRISAT helper downloads only a direct file hosted by the official ICRISAT
domain. If the official page has no direct downloadable link, download the dataset
through that page and save it under the filename above; the helper will explain
this case instead of guessing a URL.

## NASA POWER climate (optional)

Climate download requires a documented calendar/coordinate file at
`ml/data/raw/district_season_periods.csv` with exact columns:

```text
state,district,year,season,start_date,end_date,latitude,longitude
```

Coordinates and agricultural periods must come from documented sources. The
downloader fetches NASA POWER daily precipitation, temperature, humidity, and solar
radiation, leaves missing API readings missing, and aggregates only the listed
periods:

```powershell
python ml/scripts/download_climate.py
```

The model includes a climate feature only if it has at least 80% coverage in the
real processed dataset. Soil data remains modular and excluded. The UI will say
**“Soil layer not available for this prediction.”**

### India-wide historical weather export

`ml/scripts/download_india_weather.py` downloads the NASA POWER Daily Regional
API's native 0.5° × 0.625° grid, one parameter per request, for each rectangular
tile intersecting the supplied India land polygon. Tiles default to 10° × 10°;
the regional API requires at least 2° and cannot exceed 10° on either axis.
The requested window defaults to 2020-01-01
through 2025-12-31. Regional responses, HTTP status, checksums, retry failures,
and progress are retained in `ml/data/raw/india_weather_2020_2025/`; incomplete
runs do not emit the final CSV and can be resumed without re-downloading verified
responses. Because NASA limits a Daily API request to 366 days, each
region/parameter is partitioned into gap-free windows of at most 366 days and
merged only after every window succeeds.

First obtain an **official, georeferenced India national land-boundary polygon**
from the [Survey of India Administrative Boundary Data Base](https://surveyofindia.gov.in/pages/administrative-boundary-data-base-abdb-),
subject to its current access and use terms. Keep its original files intact; the script accepts a shapefile, GeoPackage,
GeoJSON, or another format supported by GeoPandas. The boundary is required:
the script never substitutes a rectangular India bounding box. Record its exact
source and version with `--boundary-source`. Tile sizes accepted by the script
are 2.001°–10°; the slight margin above NASA's 2° minimum avoids requesting
shared edge cells twice.

Install pipeline dependencies and run from the repository root:

```powershell
python -m pip install -r backend/requirements.txt
python ml/scripts/download_india_weather.py `
  --boundary "C:\data\india_boundary.shp" `
  --boundary-source "Survey of India, dataset name/version and source URL"
```

The final data is written to
`ml/data/raw/india_agricultural_weather_2020_2025.csv`. Columns are
`date,latitude,longitude,rainfall_mm,temperature_avg_c,temperature_max_c,
temperature_min_c`; temperatures are °C, rainfall is mm/day, and NASA POWER's
`-999` missing sentinel becomes an empty field without imputation. A sidecar
`.metadata.json` records boundary/API provenance, coverage, and units. Use
`--plots` for optional spatial coverage/rainfall/temperature maps and 30-day
climate trend charts. Existing final files are preserved unless `--overwrite`
is explicitly provided.

This is NASA POWER gridded data, not station measurements or a field-level
forecast. See the [official POWER Daily API documentation](https://power.larc.nasa.gov/docs/services/api/temporal/daily/).

## Process, train, evaluate

Create a Python 3.12 environment and install backend dependencies:

```powershell
py -3.12 -m venv backend\.venv
backend\.venv\Scripts\python -m pip install -r backend\requirements.txt
```

From the project root, the exact pipeline commands are:

```powershell
backend\.venv\Scripts\python ml\scripts\process_data.py
backend\.venv\Scripts\python ml\train_model.py
backend\.venv\Scripts\python ml\evaluate_model.py
```

Processing reports observed row/district/crop counts, year coverage, missing
values, duplicates and review-only IQR outlier counts. Training requires at least
five distinct observed years and 50 usable real rows with prior observed yield.
It selects Random Forest or XGBoost (when available) by validation MAE, reserves
the latest years as an untouched future test set, and compares against a
training-history-mean baseline. A prediction year in the held-out validation or
test period was not used to fit the model, but is not described as outside model
coverage; performance for those periods is measured in aggregate, not guaranteed
for an individual district/crop estimate. Prediction intervals are omitted unless at least
30 real validation residuals are available. Risk is an empirical percentile based
on measured historical yield variability and interval width, not a probability.
The Random Forest uses bounded tree depth/sample size and at most eight workers
to keep the district-level dataset trainable on typical development machines.
Global permutation importance is measured on a deterministic sample of up to
5,000 held-out records; test metrics are still evaluated on the full test split.

Model artifacts and actual metrics are written under `ml/models/` and
`ml/metadata/`. They are created only after real observations pass processing and
training requirements. `ml/explain.py` uses TreeSHAP only if the optional `shap`
package is installed; otherwise the app shows measured global permutation
importance without claiming individual feature direction.

## Run the backend and frontend

Engine 1 remains on port 8000. Engine 2 uses a separate FastAPI process on 8001:

```powershell
backend\.venv\Scripts\python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8001
```

In a second terminal:

```powershell
npm install
$env:VITE_PRODUCTION_API_BASE_URL = "http://127.0.0.1:8001"
npm run dev -- --host 0.0.0.0 --port 5174 --strictPort
```

The frontend may load while the backend is unavailable, but `/production` will
display the service/data-unavailable state and will not invent a result.

Run the Engine 2 no-data regression checks from the project root:

```powershell
backend\.venv\Scripts\python -m unittest ml.scripts.test_process_data backend.test_production_api
```
