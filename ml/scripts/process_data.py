"""Validate real source files and create a leakage-safe district-yield table."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "ml" / "data" / "raw"
PROCESSED = ROOT / "ml" / "data" / "processed" / "crop_yield_training.csv"
SOURCES_FILE = ROOT / "ml" / "metadata" / "data_sources.json"
QUALITY_FILE = ROOT / "ml" / "metadata" / "data_quality_report.json"
MODEL_METADATA_FILE = ROOT / "ml" / "metadata" / "model_metadata.json"
GRAIN = ["state", "district", "crop", "season", "year"]
CLIMATE_COLUMNS = [
    "rainfall_mm",
    "temperature_c",
    "relative_humidity_pct",
    "solar_radiation_mj_m2_day",
]

DISTRICT_ALIASES = {
    "thiruvallur": "Thiruvallur",
    "tiruvallur": "Thiruvallur",
}
AREA_FACTORS_TO_HECTARES = {
    "ha": 1.0,
    "hectare": 1.0,
    "hectares": 1.0,
    "1000 ha": 1000.0,
    "thousand ha": 1000.0,
    "acre": 0.40468564224,
    "acres": 0.40468564224,
}
PRODUCTION_FACTORS_TO_TONNES = {
    "t": 1.0,
    "tonne": 1.0,
    "tonnes": 1.0,
    "metric tonne": 1.0,
    "metric tonnes": 1.0,
    "1000 tonnes": 1000.0,
    "thousand tonnes": 1000.0,
    "kg": 0.001,
    "kilogram": 0.001,
    "kilograms": 0.001,
    "quintal": 0.1,
    "quintals": 0.1,
}
YIELD_FACTORS_TO_TONNES_PER_HECTARE = {
    "t/ha": 1.0,
    "tonne/ha": 1.0,
    "tonnes/ha": 1.0,
    "kg/ha": 0.001,
    "quintal/ha": 0.1,
}
COLUMN_ALIASES = {
    "state": {"state", "state_name", "state_ut", "state_ut_name"},
    "district": {"district", "district_name", "dist_name"},
    "crop": {"crop", "crop_name", "commodity"},
    "season": {"season", "crop_season"},
    "year": {"year", "crop_year", "year_name"},
    "area": {"area", "crop_area", "area_ha", "area_hectares", "area_1000_ha"},
    "production": {
        "production", "crop_production", "production_tonnes", "production_1000_tonnes"
    },
    "yield": {
        "yield", "crop_yield", "yield_t_ha", "yield_tonnes_ha",
        "productivity", "productivity_t_ha", "yield_kg_ha",
    },
}


def normalized_header(value: object) -> str:
    text = str(value).strip().lower().replace("₹", "")
    text = text.replace("hectares", "ha").replace("hectare", "ha")
    text = text.replace("tonnes", "tonnes").replace("tonne", "tonnes")
    text = re.sub(r"\(.*?\)", "", text)
    text = re.sub(r"[^a-z0-9]+", "_", text).strip("_")
    return text


def find_column(frame: pd.DataFrame, canonical: str) -> str | None:
    normalized = {normalized_header(column): column for column in frame.columns}
    for candidate in COLUMN_ALIASES[canonical]:
        if candidate in normalized:
            return normalized[candidate]
    return None


def infer_unit(header: object, kind: str) -> str | None:
    text = str(header).lower().replace(",", " ")
    text = re.sub(r"[\[\]()]", " ", text)
    compact = re.sub(r"\s+", " ", text).strip()
    normalized = normalized_header(header)
    if kind == "yield":
        if normalized in {"yield_t_ha", "yield_tonnes_ha", "productivity_t_ha"}:
            return "tonnes/ha"
        if normalized == "yield_kg_ha":
            return "kg/ha"
    if kind == "area":
        if "1000" in compact or "thousand" in compact:
            return "1000 ha"
        if "acre" in compact:
            return "acres"
        if "ha" in compact or "hectare" in compact:
            return "ha"
    if kind == "production":
        if "1000" in compact or "thousand" in compact:
            return "1000 tonnes"
        if "kg" in compact:
            return "kg"
        if "quintal" in compact:
            return "quintals"
        if "tonne" in compact or re.search(r"\bt\b", compact):
            return "tonnes"
    if kind == "yield":
        if "kg" in compact and "ha" in compact:
            return "kg/ha"
        if "quintal" in compact and "ha" in compact:
            return "quintal/ha"
        if ("tonne" in compact or re.search(r"\bt\b", compact)) and "ha" in compact:
            return "tonnes/ha"
    return None


def resolve_unit(header: object, override: str | None, kind: str) -> str | None:
    value = infer_unit(header, kind) or (override.strip().lower() if override else None)
    factors = {
        "area": AREA_FACTORS_TO_HECTARES,
        "production": PRODUCTION_FACTORS_TO_TONNES,
        "yield": YIELD_FACTORS_TO_TONNES_PER_HECTARE,
    }[kind]
    if value is not None and value not in factors:
        raise ValueError(
            f"Unsupported {kind} unit {value!r}; supported units: {', '.join(factors)}"
        )
    return value


def load_source(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return pd.read_csv(path)
    if suffix in {".xls", ".xlsx"}:
        try:
            return pd.read_excel(path)
        except ImportError as exc:
            raise RuntimeError(
                "Excel input requires the openpyxl dependency. Install backend/requirements.txt."
            ) from exc
    raise ValueError(f"Unsupported source file type: {path}")


def load_crop_map(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    mappings = pd.read_csv(path).fillna("")
    required = {"source_name", "canonical_name", "source", "source_documentation"}
    if not required.issubset(mappings.columns):
        raise ValueError(
            f"{path} must contain: {', '.join(sorted(required))}. "
            "Only documented crop equivalences are applied."
        )
    result: dict[str, str] = {}
    for row in mappings.to_dict("records"):
        source_name = str(row["source_name"]).strip()
        canonical_name = str(row["canonical_name"]).strip()
        if source_name and canonical_name:
            if not str(row["source"]).strip() or not str(row["source_documentation"]).strip():
                raise ValueError(f"Crop mapping {source_name!r} lacks source documentation.")
            result[source_name.casefold()] = canonical_name
    return result


def normalize_state(value: object) -> str:
    if pd.isna(value):
        return ""
    return re.sub(r"\s+", " ", str(value).strip()).title()


def normalize_district(value: object) -> str:
    if pd.isna(value):
        return ""
    text = re.sub(r"\s+", " ", str(value).strip())
    text = re.sub(r"\s+district$", "", text, flags=re.IGNORECASE).strip()
    return DISTRICT_ALIASES.get(text.casefold(), text.title())


def normalize_crop(value: object, crop_map: dict[str, str]) -> str:
    if pd.isna(value):
        return ""
    text = re.sub(r"\s+", " ", str(value).strip())
    return crop_map.get(text.casefold(), text)


def normalize_season(value: object) -> str:
    if pd.isna(value):
        return ""
    return re.sub(r"\s+", " ", str(value).strip()).title()


def parse_year(value: object) -> int | None:
    match = re.search(r"\b(19|20)\d{2}\b", str(value))
    return int(match.group(0)) if match else None


def standardize_icrisat_wide(
    frame: pd.DataFrame, crop_map: dict[str, str]
) -> pd.DataFrame:
    state_source = find_column(frame, "state")
    district_source = find_column(frame, "district")
    year_source = find_column(frame, "year")
    if not state_source or not district_source or not year_source:
        raise ValueError(
            "ICRISAT wide-format data needs State Name, Dist Name, and Year columns."
        )

    columns = {normalized_header(column): column for column in frame.columns}
    yield_pattern = re.compile(
        r"^(?P<crop>.+?)\s+yield\s*\(\s*kg\s+per\s+ha\s*\)$",
        re.IGNORECASE,
    )
    observations = []
    for yield_column in frame.columns:
        match = yield_pattern.match(str(yield_column).strip())
        if not match:
            continue

        source_crop = re.sub(r"\s+", " ", match.group("crop").strip())
        season = "Annual"
        crop_name = source_crop
        seasonal_match = re.match(r"^(Kharif|Rabi)\s+(.+)$", source_crop, re.IGNORECASE)
        if seasonal_match:
            season = seasonal_match.group(1).title()
            crop_name = seasonal_match.group(2).strip()
        crop = normalize_crop(crop_name.title(), crop_map)

        area_column = columns.get(
            normalized_header(f"{source_crop} AREA (1000 ha)")
        )
        production_column = columns.get(
            normalized_header(f"{source_crop} PRODUCTION (1000 tons)")
        )
        yields = pd.to_numeric(
            frame[yield_column].astype(str).str.replace(",", "", regex=False),
            errors="coerce",
        ) / 1000.0
        areas = (
            pd.to_numeric(
                frame[area_column].astype(str).str.replace(",", "", regex=False),
                errors="coerce",
            ) * 1000.0
            if area_column
            else pd.Series(np.nan, index=frame.index)
        )
        production = (
            pd.to_numeric(
                frame[production_column].astype(str).str.replace(",", "", regex=False),
                errors="coerce",
            ) * 1000.0
            if production_column
            else pd.Series(np.nan, index=frame.index)
        )
        observations.append(
            pd.DataFrame(
                {
                    "state": frame[state_source].map(normalize_state),
                    "district": frame[district_source].map(normalize_district),
                    "crop": crop,
                    "season": season,
                    "year": frame[year_source].map(parse_year),
                    "area_ha": areas,
                    "production_tonnes": production,
                    "yield_t_ha": yields.where(yields > 0),
                    "source": "ICRISAT DLD",
                },
                index=frame.index,
            )
        )

    if not observations:
        raise ValueError(
            "No ICRISAT yield columns with documented '(Kg per ha)' units were found."
        )
    return pd.concat(observations, ignore_index=True)


def standardize_source(
    path: Path,
    area_unit: str | None,
    production_unit: str | None,
    yield_unit: str | None,
    crop_map: dict[str, str],
) -> pd.DataFrame:
    frame = load_source(path)
    resolved = {key: find_column(frame, key) for key in COLUMN_ALIASES}
    icrisat_wide = (
        not resolved["crop"]
        and not resolved["season"]
        and any(
            re.match(
                r"^.+?\s+yield\s*\(\s*kg\s+per\s+ha\s*\)$",
                str(column).strip(),
                re.IGNORECASE,
            )
            for column in frame.columns
        )
    )
    if icrisat_wide:
        result = standardize_icrisat_wide(frame, crop_map)
        result["source"] = (
            "data.gov.in DES" if path.name.lower().startswith("des_") else "ICRISAT DLD"
        )
    else:
        missing = [
            key for key in ("state", "district", "crop", "season", "year")
            if not resolved[key]
        ]
        if missing:
            raise ValueError(
                f"{path.name} lacks required columns {missing}. Found: {list(frame.columns)}"
            )
        if not resolved["yield"] and not (resolved["area"] and resolved["production"]):
            raise ValueError(
                f"{path.name} must contain a documented yield column, or both area and production."
            )

    if not icrisat_wide:
        area_source = resolved["area"]
        production_source = resolved["production"]
        yield_source = resolved["yield"]
        units = {
            "area": resolve_unit(area_source, area_unit, "area") if area_source else None,
            "production": (
                resolve_unit(production_source, production_unit, "production")
                if production_source
                else None
            ),
            "yield": resolve_unit(yield_source, yield_unit, "yield") if yield_source else None,
        }
        for kind, source_column in (("area", area_source), ("production", production_source)):
            if source_column and not units[kind]:
                raise ValueError(
                    f"{path.name} has a generic {kind} column without a documented unit. "
                    f"Check the source documentation, then pass --{kind}-unit explicitly."
                )
        if not yield_source and (not units["area"] or not units["production"]):
            raise ValueError(
                f"{path.name} needs documented units for area and production before yield can be derived. "
                "Pass --area-unit and --production-unit only after checking the source documentation."
            )
        if yield_source and not units["yield"]:
            raise ValueError(
                f"{path.name} has a generic yield column with no explicit unit. Pass --yield-unit "
                "only after checking the source documentation."
            )

        original_fields = {
            "state": frame[resolved["state"]].astype(str).str.strip(),
            "district": frame[resolved["district"]].astype(str).str.strip(),
            "crop": frame[resolved["crop"]].astype(str).str.strip(),
            "season": frame[resolved["season"]].astype(str).str.strip(),
        }
        result = pd.DataFrame(
            {
                "state": frame[resolved["state"]].map(normalize_state),
                "district": frame[resolved["district"]].map(normalize_district),
                "crop": frame[resolved["crop"]].map(
                    lambda value: normalize_crop(value, crop_map)
                ),
                "season": frame[resolved["season"]].map(normalize_season),
                "year": frame[resolved["year"]].map(parse_year),
            }
        )
        area_values = (
            pd.to_numeric(
                frame[area_source].astype(str).str.replace(",", "", regex=False),
                errors="coerce",
            ) * AREA_FACTORS_TO_HECTARES[units["area"]]
            if area_source and units["area"]
            else pd.Series(np.nan, index=frame.index)
        )
        production_values = (
            pd.to_numeric(
                frame[production_source].astype(str).str.replace(",", "", regex=False),
                errors="coerce",
            ) * PRODUCTION_FACTORS_TO_TONNES[units["production"]]
            if production_source and units["production"]
            else pd.Series(np.nan, index=frame.index)
        )
        if yield_source:
            yield_values = (
                pd.to_numeric(
                    frame[yield_source].astype(str).str.replace(",", "", regex=False),
                    errors="coerce",
                ) * YIELD_FACTORS_TO_TONNES_PER_HECTARE[units["yield"]]
            )
        else:
            yield_values = production_values / area_values
            yield_values = yield_values.where(area_values > 0)

        result["area_ha"] = area_values
        result["production_tonnes"] = production_values
        result["yield_t_ha"] = yield_values
        result["source"] = (
            "data.gov.in DES" if path.name.lower().startswith("des_") else "ICRISAT DLD"
        )
    invalid = (
        result[GRAIN].isna().any(axis=1)
        | result["state"].eq("")
        | result["district"].eq("")
        | result["crop"].eq("")
        | result["season"].eq("")
        | result["yield_t_ha"].isna()
        | ~np.isfinite(result["yield_t_ha"])
        | result["yield_t_ha"].lt(0)
        | (result["area_ha"].notna() & result["area_ha"].le(0))
        | (result["production_tonnes"].notna() & result["production_tonnes"].lt(0))
        | (result["area_ha"].notna() & ~np.isfinite(result["area_ha"]))
        | (result["production_tonnes"].notna() & ~np.isfinite(result["production_tonnes"]))
    )
    result.attrs["invalid_rows_removed"] = int(invalid.sum())
    result.attrs["normalization_log"] = (
        {
            key: {
                source: target
                for source, target in zip(original_fields[key], result[key])
                if source != target
            }
            for key in original_fields
        }
        if not icrisat_wide
        else {}
    )
    result = result.loc[~invalid].copy()
    return result


def attach_climate(frame: pd.DataFrame, climate_path: Path) -> tuple[pd.DataFrame, bool]:
    for column in CLIMATE_COLUMNS:
        frame[column] = np.nan
    if not climate_path.exists():
        return frame, False
    climate = pd.read_csv(climate_path)
    required = set(GRAIN) - {"crop"}
    required.add("district")
    if not required.issubset(climate.columns):
        raise ValueError(
            f"{climate_path.name} must include state,district,year,season and climate measures."
        )
    climate["state"] = climate["state"].map(normalize_state)
    climate["district"] = climate["district"].map(normalize_district)
    climate["season"] = climate["season"].map(normalize_season)
    climate["year"] = climate["year"].map(parse_year)
    missing_measures = [column for column in CLIMATE_COLUMNS if column not in climate.columns]
    if missing_measures:
        raise ValueError(f"Climate file lacks supported NASA variables: {missing_measures}")
    climate = climate[[*required, *CLIMATE_COLUMNS]].copy()
    climate = climate.dropna(subset=list(required))
    if climate.duplicated(list(required)).any():
        raise ValueError("NASA climate file has duplicate state/district/year/season rows.")
    for column in CLIMATE_COLUMNS:
        climate[column] = pd.to_numeric(climate[column], errors="coerce").replace(
            [np.inf, -np.inf], np.nan
        )
    frame = frame.drop(columns=CLIMATE_COLUMNS).merge(
        climate, how="left", on=list(required), validate="many_to_one"
    )
    integrated = any(frame[column].notna().any() for column in CLIMATE_COLUMNS)
    return frame, integrated


def update_source_registry(
    used_sources: set[str],
    processed: pd.DataFrame,
    climate_path: Path,
    climate_integrated: bool,
) -> None:
    registry = json.loads(SOURCES_FILE.read_text(encoding="utf-8"))
    for source in registry["sources"]:
        source["integrated"] = source["name"] in used_sources
        source["dataset_version"] = None
        source["rows_used"] = None
        source["district_count"] = None
        source["crop_count"] = None
        source["year_range"] = None
        if source["integrated"]:
            sidecars = list(RAW.glob("*.metadata.json"))
            dates = []
            versions = []
            for sidecar in sidecars:
                try:
                    metadata = json.loads(sidecar.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError):
                    continue
                if source["name"].startswith("NASA") and metadata.get("source", "").startswith("NASA"):
                    dates.append(metadata.get("downloaded_at_utc"))
                    versions.append(metadata.get("dataset_version"))
                elif source["organization"].startswith("Ministry") and metadata.get("source") == "data.gov.in":
                    dates.append(metadata.get("downloaded_at_utc"))
                    versions.append(metadata.get("resource_id"))
                elif source["name"].startswith("ICRISAT") and metadata.get("source") == "ICRISAT District Level Database":
                    dates.append(metadata.get("downloaded_at_utc"))
                    versions.append(metadata.get("dataset_version"))
            source["download_date"] = next((date for date in dates if date), None)
            source["dataset_version"] = next((version for version in versions if version), None)
            if source["name"] == "ICRISAT District Level Database":
                subset = processed[processed["source"].eq("ICRISAT DLD")]
                source["rows_used"] = int(len(subset))
                source["district_count"] = int(subset["district"].nunique())
                source["crop_count"] = int(subset["crop"].nunique())
                if not subset.empty:
                    source["year_range"] = [int(subset["year"].min()), int(subset["year"].max())]
            elif source["organization"].startswith("Ministry"):
                subset = processed[processed["source"].eq("data.gov.in DES")]
                source["rows_used"] = int(len(subset))
                source["district_count"] = int(subset["district"].nunique())
                source["crop_count"] = int(subset["crop"].nunique())
                if not subset.empty:
                    source["year_range"] = [int(subset["year"].min()), int(subset["year"].max())]
            elif source["name"].startswith("NASA"):
                climate_rows = pd.read_csv(climate_path)
                source["rows_used"] = int(len(climate_rows))
                source["district_count"] = int(climate_rows["district"].nunique())
                if "year" in climate_rows:
                    source["year_range"] = [
                        int(climate_rows["year"].min()),
                        int(climate_rows["year"].max()),
                    ]
        else:
            source["download_date"] = None
    registry["status"] = "integrated" if used_sources else "real dataset required"
    SOURCES_FILE.write_text(json.dumps(registry, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Clean and validate only real ICRISAT or data.gov.in agricultural data."
    )
    parser.add_argument("--raw-dir", type=Path, default=RAW)
    parser.add_argument("--output", type=Path, default=PROCESSED)
    parser.add_argument("--area-unit", help="Documented unit for a generic source area column.")
    parser.add_argument(
        "--production-unit", help="Documented unit for a generic source production column."
    )
    parser.add_argument(
        "--yield-unit", help="Documented unit for a generic source yield column, e.g. tonnes/ha."
    )
    parser.add_argument("--climate-file", type=Path, help="Optional NASA POWER climate summary CSV.")
    args = parser.parse_args()
    files = []
    for filename in (
        "des_crop_production.csv",
        "icrisat_crop_production.csv",
        "icrisat_crop_production.xlsx",
        "icrisat_crop_production.xls",
    ):
        candidate = args.raw_dir / filename
        if candidate.is_file():
            files.append(candidate)
    if not files:
        raise SystemExit(
            "Real dataset required. Place the official DES export at "
            "ml/data/raw/des_crop_production.csv or the actual ICRISAT export at "
            "ml/data/raw/icrisat_crop_production.csv/.xlsx, then run this command again."
        )

    crop_map = load_crop_map(args.raw_dir / "crop_mapping.csv")
    observations = []
    invalid_rows_removed = 0
    normalization_log = {}
    for source_path in files:
        print(f"Inspecting real source columns in {source_path.name}")
        standardized = standardize_source(
            source_path, args.area_unit, args.production_unit, args.yield_unit, crop_map
        )
        invalid_rows_removed += standardized.attrs.get("invalid_rows_removed", 0)
        for field, transformations in standardized.attrs.get("normalization_log", {}).items():
            normalization_log.setdefault(field, {}).update(transformations)
        observations.append(standardized)
    frame = pd.concat(observations, ignore_index=True)
    frame["_priority"] = frame["source"].map({"data.gov.in DES": 0, "ICRISAT DLD": 1})
    frame = frame.sort_values("_priority")

    duplicate_keys = frame[frame.duplicated(GRAIN, keep=False)]
    conflict_keys = []
    for key, group in duplicate_keys.groupby(GRAIN, dropna=False):
        if group["yield_t_ha"].max() - group["yield_t_ha"].min() > 1e-9:
            conflict_keys.append(key)
    if conflict_keys:
        raise ValueError(
            "Conflicting real-source yields exist for the same district/crop/season/year. "
            f"Review source overlap before choosing one source. Examples: {conflict_keys[:5]}"
        )
    duplicate_count = int(frame.duplicated(GRAIN, keep="first").sum())
    frame = frame.drop_duplicates(GRAIN, keep="first").drop(columns="_priority")

    climate_path = args.climate_file or (args.raw_dir / "nasa_power_climate.csv")
    frame, climate_integrated = attach_climate(frame, climate_path)
    frame = frame.sort_values(GRAIN).reset_index(drop=True)
    groups = frame.groupby(["state", "district", "crop", "season"], sort=False)
    frame["previous_observation_yield_t_ha"] = groups["yield_t_ha"].shift(1)
    frame["previous_3_observation_mean_t_ha"] = groups["yield_t_ha"].transform(
        lambda values: values.shift(1).rolling(window=3, min_periods=1).mean()
    )
    frame.insert(0, "observation_id", np.arange(1, len(frame) + 1))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(args.output, index=False)

    metrics = ["yield_t_ha", "area_ha", "production_tonnes", *CLIMATE_COLUMNS]
    outliers = {}
    for column in metrics:
        values = pd.to_numeric(frame[column], errors="coerce").dropna()
        if values.empty:
            outliers[column] = 0
            continue
        q1, q3 = values.quantile([0.25, 0.75])
        spread = q3 - q1
        outliers[column] = int(((values < q1 - 1.5 * spread) | (values > q3 + 1.5 * spread)).sum())
    quality = {
        "status": "processed",
        "processed_at_utc": datetime.now(timezone.utc).isoformat(),
        "total_rows": int(len(frame)),
        "missing_values": {key: int(value) for key, value in frame.isna().sum().items()},
        "duplicate_rows": duplicate_count,
        "invalid_rows_removed": invalid_rows_removed,
        "district_count": int(frame["district"].nunique()),
        "state_count": int(frame["state"].nunique()),
        "crop_count": int(frame["crop"].nunique()),
        "year_min": int(frame["year"].min()),
        "year_max": int(frame["year"].max()),
        "outlier_counts_iqr_review_only": outliers,
        "source_files": [path.name for path in files]
        + ([climate_path.name] if climate_integrated else []),
        "normalization_transformations": normalization_log,
        "climate_integrated": climate_integrated,
        "soil_integrated": False,
    }
    QUALITY_FILE.write_text(json.dumps(quality, indent=2), encoding="utf-8")
    used_sources = {
        "District-wise, season-wise crop production statistics"
        if value == "data.gov.in DES"
        else "ICRISAT District Level Database"
        for value in frame["source"].unique()
    }
    if climate_integrated:
        used_sources.add("NASA POWER Daily Point")
    update_source_registry(used_sources, frame, climate_path, climate_integrated)
    MODEL_METADATA_FILE.write_text(
        json.dumps(
            {
                "status": "training_required",
                "message": "The processed real dataset changed; retrain before requesting predictions.",
                "trained_at_utc": None,
                "dataset": {
                    "file": "ml/data/processed/crop_yield_training.csv",
                    "rows": int(len(frame)),
                    "year_min": quality["year_min"],
                    "year_max": quality["year_max"],
                },
                "features": [],
                "target": "yield_t_ha",
                "model": None,
                "test": None,
                "baseline": None,
                "prediction_interval": None,
                "risk_reference": None,
                "climate_integrated": climate_integrated,
                "soil_integrated": False,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Processed rows: {len(frame):,}")
    print(f"States: {quality['state_count']:,} | districts: {quality['district_count']:,} | crops: {quality['crop_count']:,}")
    print(f"Available years: {quality['year_min']}–{quality['year_max']}")
    print(f"Climate integrated: {climate_integrated}; soil integrated: False")
    print(f"Saved validated data to {args.output}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, pd.errors.ParserError) as exc:
        print(f"Data processing stopped: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc
