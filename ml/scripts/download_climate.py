"""Aggregate actual NASA POWER daily observations for sourced crop-season periods."""

from __future__ import annotations

import argparse
import csv
import json
import math
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / "ml" / "data" / "raw" / "district_season_periods.csv"
OUTPUT = ROOT / "ml" / "data" / "raw" / "nasa_power_climate.csv"
PARAMETERS = ("PRECTOTCORR", "T2M", "RH2M", "ALLSKY_SFC_SW_DWN")


def parse_date(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d")


def fetch_daily(latitude: float, longitude: float, start: datetime, end: datetime) -> dict:
    params = {
        "parameters": ",".join(PARAMETERS),
        "community": "AG",
        "longitude": longitude,
        "latitude": latitude,
        "start": start.strftime("%Y%m%d"),
        "end": end.strftime("%Y%m%d"),
        "format": "JSON",
    }
    url = "https://power.larc.nasa.gov/api/temporal/daily/point?" + urlencode(params)
    request = Request(url, headers={"User-Agent": "Agri-Economic-Intelligence/1.0"})
    try:
        with urlopen(request, timeout=90) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(f"NASA POWER request failed for {latitude}, {longitude}.") from exc
    try:
        return payload["properties"]["parameter"]
    except (KeyError, TypeError) as exc:
        raise RuntimeError(f"NASA POWER returned an unexpected response: {payload!r}") from exc


def valid_values(parameter: dict, start: datetime, end: datetime) -> list[float]:
    values = []
    for date_key, raw in parameter.items():
        day = datetime.strptime(date_key, "%Y%m%d")
        number = float(raw)
        if start <= day <= end and math.isfinite(number) and number > -900:
            values.append(number)
    return values


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch NASA POWER climate for documented district-season periods and coordinates."
    )
    parser.add_argument("--input", type=Path, default=INPUT)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    if not args.input.is_file():
        parser.error(
            f"Required sourced calendar/coordinate file not found: {args.input}. "
            "Expected state,district,year,season,start_date,end_date,latitude,longitude."
        )
    with args.input.open(newline="", encoding="utf-8-sig") as stream:
        periods = list(csv.DictReader(stream))
    required = {
        "state", "district", "year", "season", "start_date", "end_date",
        "latitude", "longitude",
    }
    if not periods or not required.issubset(periods[0]):
        raise ValueError(f"{args.input} must have these columns: {', '.join(sorted(required))}")

    groups: dict[tuple, list[dict]] = defaultdict(list)
    for row in periods:
        start = parse_date(row["start_date"])
        end = parse_date(row["end_date"])
        latitude, longitude = float(row["latitude"]), float(row["longitude"])
        if start > end or not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            raise ValueError(f"Invalid date range or coordinates in period row: {row}")
        key = (
            row["state"].strip(),
            row["district"].strip(),
            int(row["year"]),
            latitude,
            longitude,
        )
        groups[key].append({**row, "_start": start, "_end": end})

    output_rows = []
    for index, (key, entries) in enumerate(groups.items(), start=1):
        state, district, year, latitude, longitude = key
        start = min(row["_start"] for row in entries)
        end = max(row["_end"] for row in entries)
        daily = fetch_daily(latitude, longitude, start, end)
        for row in entries:
            rain = valid_values(daily["PRECTOTCORR"], row["_start"], row["_end"])
            temperature = valid_values(daily["T2M"], row["_start"], row["_end"])
            humidity = valid_values(daily["RH2M"], row["_start"], row["_end"])
            solar = valid_values(daily["ALLSKY_SFC_SW_DWN"], row["_start"], row["_end"])
            output_rows.append(
                {
                    "state": state,
                    "district": district,
                    "year": year,
                    "season": row["season"].strip(),
                    "rainfall_mm": round(sum(rain), 4) if rain else "",
                    "temperature_c": round(sum(temperature) / len(temperature), 4) if temperature else "",
                    "relative_humidity_pct": round(sum(humidity) / len(humidity), 4) if humidity else "",
                    "solar_radiation_mj_m2_day": round(sum(solar) / len(solar), 4) if solar else "",
                    "rain_days_observed": len(rain),
                    "temperature_days_observed": len(temperature),
                    "humidity_days_observed": len(humidity),
                    "solar_days_observed": len(solar),
                    "latitude": latitude,
                    "longitude": longitude,
                }
            )
        print(f"NASA POWER location/year groups retrieved: {index}/{len(groups)}")
        time.sleep(0.1)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(output_rows[0].keys()))
        writer.writeheader()
        writer.writerows(output_rows)
    metadata = {
        "source": "NASA POWER Daily Point API",
        "url": "https://power.larc.nasa.gov/",
        "downloaded_at_utc": datetime.now(timezone.utc).isoformat(),
        "period_rows": len(output_rows),
        "coordinate_period_source": str(args.input),
        "parameters": list(PARAMETERS),
    }
    args.output.with_suffix(".metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )
    print(f"Saved observed climate summaries to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
