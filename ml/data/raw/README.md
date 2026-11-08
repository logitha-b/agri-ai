# Raw source files

Do not put generated/demo observations here. Supply a real export from an official
source, preserving its source documentation:

- `des_crop_production.csv` — CSV export of the official data.gov.in district-wise,
  season-wise crop production resource; or
- `icrisat_crop_production.csv` / `.xlsx` — actual ICRISAT District Level Database
  export. The wide-format district file with `State Name`, `Dist Name`, `Year`,
  and crop-specific yield columns is supported; its units must remain documented.

Optional NASA POWER climate:

- `district_season_periods.csv` with the exact columns `state,district,year,season,
  start_date,end_date,latitude,longitude`. Obtain coordinates and crop-season periods
  from documented sources; the downloader does not invent either.

Optional crop mapping:

- `crop_mapping.csv` with `source_name,canonical_name,source,source_documentation`.
  Only add equivalences confirmed by source documentation.

Optional district crop-production workbook:

- `des_area_production_1997_2019.xlsx` — the supplied multi-header district-wise,
  crop- and season-wise area/production workbook. Its worksheet states area in
  000 ha, production in 000 tonnes, and yield in kg/ha, with special units for
  coconut, cotton, jute, mesta, and sugarcane. The worksheet attributes its
  source to DACNET; retain that attribution and the original workbook.

Optional AGMARKNET market-price snapshot:

- `agmarknet_market_prices_2026-10-13.csv` — the user-supplied
  Market-wise Price & Arrival report. Preserve this export unchanged.
  The processing script validates and bundles its reported mandi prices for
  the frontend; the export has no arrival-quantity column, so it must not be
  used to claim arrival volumes or a live market feed.

`process_agmarknet_market_prices.py` writes the derived
`src/data/agmarknetMarketPrices.json` and records the source checksum, coverage,
and price unit. Re-run it after replacing the raw export with an authorized,
documented source file.

`process_data.py` accepts real CSV or XLSX source files and writes the validated
training table to `ml/data/processed/crop_yield_training.csv`. It will stop rather
than guess units or resolve conflicting records.

`process_des_area_production.py` separately standardizes the supplied DES/DACNET
workbook to `ml/data/processed/des_area_production_1997_2019.csv` and writes
source metadata and an ICRISAT comparison report. It preserves duplicate
district/crop/year records for review and does not merge its conflicting yields
into the current ICRISAT training table.
