"""Validate and standardize the supplied DES/DACNET area-production workbook."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.scripts.process_data import normalize_crop, normalize_district, normalize_state, parse_year


DEFAULT_INPUT = ROOT / "ml" / "data" / "raw" / "des_area_production_1997_2019.xlsx"
DEFAULT_OUTPUT = ROOT / "ml" / "data" / "processed" / "des_area_production_1997_2019.csv"
GRAIN = ["state", "district", "crop", "season", "year"]
OUTPUT_COLUMNS = [
    *GRAIN,
    "area_ha",
    "production_tonnes",
    "yield_t_ha",
    "yield_from_area_production_t_ha",
    "yield_area_production_abs_difference_t_ha",
    "yield_matches_area_production_1pct",
    "yield_source_value",
    "yield_source_unit",
    "production_source_value",
    "production_source_unit",
    "source",
    "source_row",
]
SOURCE_LABEL = "DES/DACNET workbook (source attribution as stated in workbook)"
DES_COLUMNS_END = " Icrisat District Code"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _number(value: object) -> float:
    text = str(value).strip()
    if not text or text in {".", "-", "NA", "N/A"}:
        return math.nan
    try:
        number = float(text.replace(",", ""))
    except ValueError:
        return math.nan
    return number if math.isfinite(number) else math.nan


def _code_prefix(code: object) -> str:
    match = re.match(r"^\s*([A-Za-z0-9]+)_", str(code))
    return match.group(1).upper() if match else ""


def _load_workbook(path: Path) -> tuple[pd.DataFrame, pd.DataFrame, str]:
    header = pd.read_excel(path, header=None, nrows=10)
    if header.shape[0] < 10 or header.shape[1] < 6:
        raise ValueError("The workbook does not contain the expected multi-row DES header.")
    title = str(header.iat[0, 0] or "").strip()
    units_note = str(header.iat[1, 0] or "").strip()
    if "district wise" not in title.casefold() or "1997" not in title or "2019" not in title:
        raise ValueError("Workbook title does not identify the expected district/year dataset (1997–2019).")
    if "000 ha" not in units_note.casefold() or "yield (kg/ha)" not in units_note.casefold():
        raise ValueError("Workbook unit note is missing the expected area and yield units.")

    source_note = str(header.iat[3, 1] or header.iat[3, 0] or "").strip()
    if not source_note:
        raise ValueError("Workbook does not identify a source in its source row.")

    frame = pd.read_excel(path, header=9)
    required = {"STNAME", "DISTNAME", "YEAR"}
    if not required.issubset(frame.columns):
        raise ValueError("Workbook data header must include STNAME, DISTNAME, and YEAR.")
    return header, frame, source_note


def _descriptor(header: pd.DataFrame, position: int, frame: pd.DataFrame) -> dict[str, Any] | None:
    crop, season, metric, code = (header.iat[row, position] for row in (6, 7, 8, 9))
    if pd.isna(crop) or pd.isna(metric) or pd.isna(code):
        return None
    return {
        "position": position,
        "column": frame.columns[position],
        "crop": re.sub(r"\s+", " ", str(crop).strip()),
        "season": re.sub(r"\s+", " ", str(season).strip()).title(),
        "metric": re.sub(r"\s+", " ", str(metric).strip()).casefold(),
        "code": str(code).strip(),
        "prefix": _code_prefix(code),
    }


def _paired_metric(
    descriptors: list[dict[str, Any]],
    frame: pd.DataFrame,
    prefix: str,
    metric: str,
) -> tuple[pd.Series, str | None]:
    candidates = [
        item for item in descriptors
        if item["prefix"] == prefix and item["season"].casefold() == "total"
        and (
            item["metric"] == metric
            or (metric == "production" and item["metric"].startswith("production "))
        )
    ]
    if not candidates:
        return pd.Series(np.nan, index=frame.index), None
    parsed = [
        pd.to_numeric(frame[item["column"]].map(_number), errors="coerce")
        for item in candidates
    ]
    if len(parsed) > 1 and any(
        not parsed[0].equals(other) for other in parsed[1:]
    ):
        return pd.Series(np.nan, index=frame.index), None
    return parsed[0], candidates[0]["metric"]


def standardize_workbook(path: Path, crop_map: dict[str, str] | None = None) -> pd.DataFrame:
    if not path.is_file():
        raise FileNotFoundError(f"DES area-production workbook not found: {path}")
    header, frame, _source_note = _load_workbook(path)
    crop_map = crop_map or {}

    try:
        measurement_end = list(frame.columns).index(DES_COLUMNS_END)
    except ValueError:
        measurement_end = len(frame.columns)
    descriptors = [
        item
        for position in range(5, measurement_end)
        if (item := _descriptor(header, position, frame)) is not None
    ]
    yields = [
        item for item in descriptors
        if item["metric"] == "yield" and item["season"].casefold() == "total"
    ]
    if not yields:
        raise ValueError("No Total yield columns were found in the workbook's crop headers.")

    state = frame["STNAME"].map(normalize_state)
    district = frame["DISTNAME"].map(normalize_district)
    year = frame["YEAR"].map(parse_year)
    observations = []
    for item in yields:
        crop = normalize_crop(item["crop"], crop_map)
        values = pd.to_numeric(frame[item["column"]].map(_number), errors="coerce")
        area_values, _ = _paired_metric(descriptors, frame, item["prefix"], "area")
        production_descriptor = next(
            (
                candidate for candidate in descriptors
                if candidate["prefix"] == item["prefix"]
                and candidate["season"].casefold() == "total"
                and candidate["metric"].startswith("production")
            ),
            None,
        )
        if production_descriptor is None and crop.casefold() == "sugarcane":
            production_descriptor = next(
                (
                    candidate for candidate in descriptors
                    if candidate["season"].casefold() == "total"
                    and candidate["metric"].startswith("production")
                    and "gur" in candidate["metric"]
                ),
                None,
            )
        production_values = (
            pd.to_numeric(frame[production_descriptor["column"]].map(_number), errors="coerce")
            if production_descriptor is not None
            else pd.Series(np.nan, index=frame.index)
        )

        area = area_values * 1000.0
        # The source distinguishes crop quantities measured in bales, gur, and nuts.
        # Keep those source values/units, but don't mislabel them as tonnes of crop.
        special_production = (
            crop.casefold() in {"cotton(lint)", "jute", "mesta"}
            or crop.casefold() == "coconut"
            or (
                production_descriptor is not None
                and "gur" in production_descriptor["metric"]
            )
        )
        production_tonnes = (
            production_values * 1000.0
            if not special_production
            else pd.Series(np.nan, index=frame.index)
        )
        yield_from_area_production = (
            production_tonnes / area.where(area > 0)
        ).where(production_tonnes.notna())
        yield_unit = "nuts/ha" if crop.casefold() == "coconut" else "kg/ha"
        yield_tonnes_per_hectare = (
            values / 1000.0 if yield_unit == "kg/ha"
            else pd.Series(np.nan, index=frame.index)
        )
        absolute_yield_difference = (
            yield_tonnes_per_hectare - yield_from_area_production
        ).abs()
        matches_area_production = pd.Series(pd.NA, index=frame.index, dtype="boolean")
        comparable = yield_tonnes_per_hectare.notna() & yield_from_area_production.notna()
        matches_area_production.loc[comparable] = (
            absolute_yield_difference.loc[comparable]
            <= yield_tonnes_per_hectare.loc[comparable].abs().clip(lower=1e-12) * 0.01
        )
        if production_descriptor is None:
            production_unit = ""
        elif "gur" in production_descriptor["metric"]:
            production_unit = "1000 tonnes of gur"
        elif crop.casefold() in {"cotton(lint)", "jute", "mesta"}:
            production_unit = "bales"
        elif crop.casefold() == "coconut":
            production_unit = "1000 nuts"
        else:
            production_unit = "1000 tonnes"

        output = pd.DataFrame(
            {
                "state": state,
                "district": district,
                "crop": crop,
                "season": "Annual",
                "year": year,
                "area_ha": area.where(area >= 0),
                "production_tonnes": production_tonnes.where(production_tonnes >= 0),
                "yield_t_ha": yield_tonnes_per_hectare.where(yield_tonnes_per_hectare > 0),
                "yield_from_area_production_t_ha": yield_from_area_production,
                "yield_area_production_abs_difference_t_ha": absolute_yield_difference,
                "yield_matches_area_production_1pct": matches_area_production,
                "yield_source_value": values,
                "yield_source_unit": yield_unit,
                "production_source_value": production_values,
                "production_source_unit": production_unit,
                "source": SOURCE_LABEL,
                "source_row": np.arange(len(frame), dtype=int) + 11,
            },
            index=frame.index,
        )
        valid = (
            output[GRAIN].notna().all(axis=1)
            & output["state"].ne("")
            & output["district"].ne("")
            & output["year"].between(1997, 2019)
            & output["yield_source_value"].gt(0)
            & np.isfinite(output["yield_source_value"])
        )
        observations.append(output.loc[valid])

    result = pd.concat(observations, ignore_index=True)[OUTPUT_COLUMNS]
    if result.empty:
        raise ValueError("No valid positive crop-yield observations were found in the workbook.")
    return result


def compare_icrisat(des: pd.DataFrame, icrisat_path: Path) -> dict[str, Any]:
    report: dict[str, Any] = {
        "comparison_source": "ICRISAT District Level Database",
        "policy": (
            "Kept separate: overlapping source yields are not merged or silently "
            "overridden. Crop names and district names are compared as standardized "
            "by the existing processors; no additional equivalence mappings are guessed."
        ),
        "comparison_available": False,
        "ambiguous_duplicate_keys_excluded": {"des": 0, "icrisat": 0},
        "overlapping_keys": 0,
        "within_1e-9_tonnes_per_hectare": 0,
        "different_yields": 0,
        "median_absolute_difference_tonnes_per_hectare": None,
    }
    if not icrisat_path.is_file():
        report["note"] = f"ICRISAT source not found for comparison: {icrisat_path.name}"
        return report

    from ml.scripts.process_data import standardize_source

    icrisat = standardize_source(icrisat_path, None, None, None, {})
    left = des.loc[des["yield_t_ha"].notna(), GRAIN + ["yield_t_ha"]]
    left_duplicate_keys = int(
        left.loc[left.duplicated(GRAIN, keep=False), GRAIN].drop_duplicates().shape[0]
    )
    left = left.loc[~left.duplicated(GRAIN, keep=False)].rename(
        columns={"yield_t_ha": "des_yield_t_ha"}
    )
    right = icrisat[GRAIN + ["yield_t_ha"]]
    right_duplicate_keys = int(
        right.loc[right.duplicated(GRAIN, keep=False), GRAIN].drop_duplicates().shape[0]
    )
    right = right.loc[~right.duplicated(GRAIN, keep=False)].rename(
        columns={"yield_t_ha": "icrisat_yield_t_ha"}
    )
    merged = left.merge(right, on=GRAIN, how="inner", validate="one_to_one")
    if merged.empty:
        report["comparison_available"] = True
        report["ambiguous_duplicate_keys_excluded"] = {
            "des": left_duplicate_keys,
            "icrisat": right_duplicate_keys,
        }
        return report
    difference = (merged["des_yield_t_ha"] - merged["icrisat_yield_t_ha"]).abs()
    relative_difference_pct = (
        difference / merged["icrisat_yield_t_ha"].abs().clip(lower=1e-12) * 100.0
    )
    report.update(
        {
            "comparison_available": True,
            "ambiguous_duplicate_keys_excluded": {
                "des": left_duplicate_keys,
                "icrisat": right_duplicate_keys,
            },
            "overlapping_keys": int(len(merged)),
            "within_1e-9_tonnes_per_hectare": int((difference <= 1e-9).sum()),
            "different_yields": int((difference > 1e-9).sum()),
            "median_absolute_difference_tonnes_per_hectare": float(difference.median()),
            "absolute_difference_percentiles_tonnes_per_hectare": {
                str(percentile): float(difference.quantile(percentile / 100))
                for percentile in (50, 90, 95, 99, 100)
            },
            "absolute_difference_threshold_counts_tonnes_per_hectare": {
                str(threshold): int((difference > threshold).sum())
                for threshold in (0.01, 0.05, 0.1, 0.5)
            },
            "relative_difference_threshold_counts_pct": {
                str(threshold): int((relative_difference_pct > threshold).sum())
                for threshold in (1, 5, 10, 25)
            },
            "differing_yield_examples": [
                {
                    **{column: row[column] for column in GRAIN},
                    "des_yield_t_ha": float(row["des_yield_t_ha"]),
                    "icrisat_yield_t_ha": float(row["icrisat_yield_t_ha"]),
                }
                for _, row in merged.loc[difference > 1e-9].head(10).iterrows()
            ],
        }
    )
    return report


def process(input_path: Path, output_path: Path, icrisat_path: Path) -> dict[str, Any]:
    header, _frame, source_note = _load_workbook(input_path)
    standardized = standardize_workbook(input_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(output_path.suffix + ".tmp")
    standardized.to_csv(temporary, index=False)
    temporary.replace(output_path)

    comparison = compare_icrisat(standardized, icrisat_path)
    convertible_yields = standardized["yield_t_ha"].dropna()
    consistency = standardized.loc[
        standardized["yield_matches_area_production_1pct"].notna(),
        "yield_matches_area_production_1pct",
    ]
    outlier_counts = {}
    for crop, group in standardized.groupby("crop"):
        values = group["yield_t_ha"].dropna()
        if values.empty:
            continue
        lower_quartile, upper_quartile = values.quantile([0.25, 0.75])
        spread = upper_quartile - lower_quartile
        low, high = lower_quartile - 1.5 * spread, upper_quartile + 1.5 * spread
        count = int(((values < low) | (values > high)).sum())
        if count:
            outlier_counts[crop] = count
    metadata = {
        "source": SOURCE_LABEL,
        "source_note_in_workbook": source_note,
        "workbook_title": str(header.iat[0, 0]).strip(),
        "source_file": input_path.name,
        "source_sha256": sha256_file(input_path),
        "sheet": "all crops-season wise",
        "period": {
            "start_year": int(standardized["year"].min()),
            "end_year": int(standardized["year"].max()),
        },
        "record_count": int(len(standardized)),
        "duplicate_district_crop_year_keys": int(
            standardized.loc[
                standardized.duplicated(GRAIN, keep=False), GRAIN
            ].drop_duplicates().shape[0]
        ),
        "records_in_duplicate_keys": int(
            standardized.duplicated(GRAIN, keep=False).sum()
        ),
        "state_count": int(standardized["state"].nunique()),
        "district_count": int(standardized[["state", "district"]].drop_duplicates().shape[0]),
        "crop_count": int(standardized["crop"].nunique()),
        "yield_unit_standardized": "tonnes per hectare",
        "yield_summary_tonnes_per_hectare": {
            "observations": int(len(convertible_yields)),
            "minimum": float(convertible_yields.min()) if not convertible_yields.empty else None,
            "median": float(convertible_yields.median()) if not convertible_yields.empty else None,
            "maximum": float(convertible_yields.max()) if not convertible_yields.empty else None,
        },
        "yield_area_production_consistency": {
            "comparable_observations": int(len(consistency)),
            "within_1_percent": int(consistency.sum()),
            "outside_1_percent": int((~consistency).sum()),
            "tolerance_note": (
                "A diagnostic only: reported yield is compared with production_tonnes / area_ha; "
                "it does not remove or alter source observations."
            ),
        },
        "outlier_counts_iqr_review_only": outlier_counts,
        "outlier_observation_count_iqr_review_only": int(sum(outlier_counts.values())),
        "source_yield_units": {
            "default": "kg/ha, converted to tonnes/ha",
            "Coconut": "nuts/ha; retained in source columns, excluded from tonnes/ha observations",
        },
        "source_production_unit_note": (
            "Area is reported in 1000 ha and converted to ha. Standard production is "
            "reported in 1000 tonnes and converted to tonnes; bales, gur, and nuts are "
            "retained as source values and not mislabeled as crop tonnes."
        ),
        "comparison": comparison,
        "model_training_status": "not integrated; overlapping yields conflict with ICRISAT",
        "quality_review_required": True,
        "quality_notes": [
            "Source values outside the interquartile range are flagged for review, not removed.",
            "The maximum converted yield should be reviewed before using this dataset for modeling.",
            "Duplicate source rows are preserved with their original worksheet row numbers.",
        ],
        "processed_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    metadata_path = output_path.with_suffix(".metadata.json")
    comparison_path = output_path.with_suffix(".comparison.json")
    metadata_path.write_text(json.dumps(metadata, indent=2, allow_nan=False), encoding="utf-8")
    comparison_path.write_text(json.dumps(comparison, indent=2, allow_nan=False), encoding="utf-8")
    return metadata


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate the supplied multi-row DES/DACNET workbook without mixing it into ICRISAT."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--icrisat",
        type=Path,
        default=ROOT / "ml" / "data" / "raw" / "icrisat_crop_production.csv",
    )
    args = parser.parse_args()
    metadata = process(args.input, args.output, args.icrisat)
    comparison = metadata["comparison"]
    overlap = comparison["overlapping_keys"]
    different = comparison["different_yields"]
    print(
        f"Saved {metadata['record_count']:,} validated DES observations "
        f"({metadata['crop_count']} crops, {metadata['district_count']} state/district "
        f"labels, {metadata['period']['start_year']}–{metadata['period']['end_year']})."
    )
    median_difference = comparison["median_absolute_difference_tonnes_per_hectare"]
    if median_difference is None:
        print("ICRISAT comparison unavailable; the DES dataset remains separate.")
    else:
        print(
            f"Not merged with ICRISAT: {different:,}/{overlap:,} exact yield values differ; "
            f"median absolute difference {median_difference:.5f} t/ha."
        )
    print(
        f"Quality review flags: {metadata['duplicate_district_crop_year_keys']:,} duplicate "
        f"district/crop/year keys, {metadata['outlier_observation_count_iqr_review_only']:,} "
        f"IQR outlier observations; none are silently discarded."
    )
    print(f"Output: {args.output}")
    print(f"Comparison report: {args.output.with_suffix('.comparison.json')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
