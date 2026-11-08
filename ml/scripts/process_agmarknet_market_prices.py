"""Validate a supplied AGMARKNET market-wise export for the frontend."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = ROOT / "ml" / "data" / "raw" / "agmarknet_market_prices_2026-10-13.csv"
DEFAULT_OUTPUT = ROOT / "src" / "data" / "agmarknetMarketPrices.json"
REQUIRED_COLUMNS = [
    "State",
    "District",
    "Market",
    "Commodity",
    "Variety",
    "Grade",
    "Arrival_Date",
    "Min_x0020_Price",
    "Max_x0020_Price",
    "Modal_x0020_Price",
]
PRICE_COLUMNS = {
    "Min_x0020_Price": "min_price_rs_per_quintal",
    "Max_x0020_Price": "max_price_rs_per_quintal",
    "Modal_x0020_Price": "modal_price_rs_per_quintal",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _parse_price(value: object, column: str, row_number: int) -> float | None:
    text = str(value).strip()
    if not text or text.casefold() in {"-", "na", "n/a", "null", "none"}:
        return None
    try:
        price = float(text.replace(",", ""))
    except ValueError as exc:
        raise ValueError(
            f"Invalid price at source row {row_number}, column {column}: {value!r}"
        ) from exc
    if not math.isfinite(price) or price < 0:
        raise ValueError(
            f"Invalid negative or non-finite price at source row {row_number}, "
            f"column {column}: {value!r}"
        )
    return price


def standardize_source(frame: pd.DataFrame) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    missing = sorted(set(REQUIRED_COLUMNS) - set(frame.columns))
    if missing:
        raise ValueError(f"AGMARKNET export is missing required columns: {', '.join(missing)}")
    if frame.empty:
        raise ValueError("AGMARKNET export has no market records.")

    records: list[dict[str, Any]] = []
    invalid_text = {"", "-", "na", "n/a", "null", "none"}
    for index, row in frame.iterrows():
        row_number = int(index) + 2
        fields = {
            "state": row["State"],
            "district": row["District"],
            "market": row["Market"],
            "commodity": row["Commodity"],
            "variety": row["Variety"],
            "grade": row["Grade"],
        }
        for field, value in fields.items():
            text = "" if pd.isna(value) else re.sub(r"\s+", " ", str(value).strip())
            if text.casefold() in invalid_text:
                raise ValueError(f"Missing {field} at AGMARKNET source row {row_number}.")
            fields[field] = text

        raw_date = str(row["Arrival_Date"]).strip()
        parsed_date = pd.to_datetime(raw_date, dayfirst=True, errors="coerce")
        if pd.isna(parsed_date):
            raise ValueError(f"Invalid Arrival_Date at AGMARKNET source row {row_number}: {raw_date!r}")
        standardized: dict[str, Any] = {
            **fields,
            "arrival_date": parsed_date.date().isoformat(),
        }
        for source_column, target_column in PRICE_COLUMNS.items():
            standardized[target_column] = _parse_price(
                row[source_column], source_column, row_number
            )
        minimum = standardized["min_price_rs_per_quintal"]
        maximum = standardized["max_price_rs_per_quintal"]
        modal = standardized["modal_price_rs_per_quintal"]
        if minimum is not None and maximum is not None and minimum > maximum:
            raise ValueError(f"Minimum price exceeds maximum at source row {row_number}.")
        if modal is not None and minimum is not None and modal < minimum:
            raise ValueError(f"Modal price is below minimum at source row {row_number}.")
        if modal is not None and maximum is not None and modal > maximum:
            raise ValueError(f"Modal price exceeds maximum at source row {row_number}.")
        if all(standardized[column] is None for column in PRICE_COLUMNS.values()):
            raise ValueError(f"No reported price is available at source row {row_number}.")
        records.append(standardized)

    record_frame = pd.DataFrame(records)
    duplicates = int(record_frame.duplicated(keep="first").sum())
    if duplicates:
        record_frame = record_frame.drop_duplicates(keep="first")
        records = record_frame.to_dict(orient="records")
    date_values = sorted({record["arrival_date"] for record in records})
    metadata = {
        "record_count": len(records),
        "duplicate_rows_removed": duplicates,
        "date_coverage": {"start": date_values[0], "end": date_values[-1]},
        "states": len({record["state"] for record in records}),
        "districts": len({(record["state"], record["district"]) for record in records}),
        "markets": len({(record["state"], record["district"], record["market"]) for record in records}),
        "commodities": len({record["commodity"] for record in records}),
        "price_unit": "Indian rupees per quintal (100 kg)",
    }
    return records, metadata


def process(input_path: Path, output_path: Path, source_label: str) -> dict[str, Any]:
    if not input_path.is_file():
        raise FileNotFoundError(f"AGMARKNET source file not found: {input_path}")
    if output_path.exists() and output_path.resolve() == input_path.resolve():
        raise ValueError("Output must not overwrite the supplied raw source CSV.")
    frame = pd.read_csv(input_path, dtype=str, keep_default_na=False)
    records, summary = standardize_source(frame)
    metadata = {
        **summary,
        "source": source_label,
        "source_url": "https://agmarknet.gov.in/",
        "source_file": input_path.name,
        "source_sha256": sha256_file(input_path),
        "processed_at_utc": datetime.now(timezone.utc).isoformat(),
        "price_columns": {
            "minimum": "Min_x0020_Price",
            "maximum": "Max_x0020_Price",
            "modal": "Modal_x0020_Price",
        },
        "arrival_data_included": False,
        "scope_note": (
            "The supplied CSV has prices and arrival dates but no arrival quantity column. "
            "It is a report snapshot, not a live feed."
        ),
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"metadata": metadata, "records": records}
    temporary = output_path.with_suffix(output_path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False),
        encoding="utf-8",
    )
    temporary.replace(output_path)
    return metadata


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate AGMARKNET CSV and create the market page's bundled real-data file."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--source-label",
        default="AGMARKNET Market-wise Price & Arrival Report, supplied 13 Oct 2026",
    )
    args = parser.parse_args()
    metadata = process(args.input, args.output, args.source_label)
    print(
        f"Processed {metadata['record_count']} market-price rows, "
        f"{metadata['markets']} markets, {metadata['commodities']} commodities; "
        f"dates {metadata['date_coverage']['start']} to {metadata['date_coverage']['end']}."
    )
    print(f"Saved frontend data: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
