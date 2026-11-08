"""Download and validate NASA POWER daily weather over India's land boundary."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import logging
import math
import os
import sys
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any

import pandas as pd
import requests


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "ml" / "data" / "raw" / "india_agricultural_weather_2020_2025.csv"
DEFAULT_WORK_DIR = ROOT / "ml" / "data" / "raw" / "india_weather_2020_2025"
API_URL = "https://power.larc.nasa.gov/api/temporal/daily/regional"
START_DATE = date(2020, 1, 1)
END_DATE = date(2025, 12, 31)
PARAMETERS = {
    "PRECTOTCORR": "rainfall_mm",
    "T2M": "temperature_avg_c",
    "T2M_MAX": "temperature_max_c",
    "T2M_MIN": "temperature_min_c",
}
KEY_COLUMNS = ["date", "latitude", "longitude"]
OUTPUT_COLUMNS = KEY_COLUMNS + list(PARAMETERS.values())
MISSING_VALUE = -999.0
MIN_TILE_DEGREES = 2.001
MAX_TILE_DEGREES = 10.0
LOG = logging.getLogger("india_weather")


@dataclass(frozen=True)
class Region:
    region_id: str
    latitude_min: float
    latitude_max: float
    longitude_min: float
    longitude_max: float
    include_north_edge: bool
    include_east_edge: bool


def configure_logging(log_path: Path) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    LOG.setLevel(logging.INFO)
    for handler in list(LOG.handlers):
        LOG.removeHandler(handler)
        handler.close()
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)
    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(formatter)
    LOG.addHandler(console)
    LOG.addHandler(file_handler)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def date_chunks(start: date, end: date, max_days: int = 366) -> list[tuple[date, date]]:
    """Partition an inclusive date range into API-compliant, gap-free windows."""
    if start > end or max_days < 1 or max_days > 366:
        raise ValueError("Date chunks require start <= end and a maximum size from 1 to 366 days.")
    chunks = []
    chunk_start = start
    while chunk_start <= end:
        chunk_end = min(end, chunk_start + timedelta(days=max_days - 1))
        chunks.append((chunk_start, chunk_end))
        chunk_start = chunk_end + timedelta(days=1)
    return chunks


def load_manifest(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"version": 1, "requests": {}}
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Could not read request manifest {path}: {exc}") from exc
    if manifest.get("version") != 1 or not isinstance(manifest.get("requests"), dict):
        raise RuntimeError(f"Unsupported or invalid request manifest: {path}")
    return manifest


def save_manifest(path: Path, manifest: dict[str, Any]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
    os.replace(temporary, path)


def read_regional_csv(text: str, parameter: str, start: date, end: date) -> pd.DataFrame:
    """Parse a POWER regional CSV response, validating its actual data schema."""
    marker = "-END HEADER-"
    marker_position = text.find(marker)
    if marker_position < 0:
        raise ValueError("NASA POWER response has no -END HEADER- marker.")
    csv_text = text[marker_position + len(marker):].lstrip("\r\n")
    frame = pd.read_csv(io.StringIO(csv_text))
    required = {"LAT", "LON", "YEAR", "DOY", parameter}
    if not required.issubset(frame.columns):
        raise ValueError(
            f"NASA POWER CSV columns {list(frame.columns)!r} do not include "
            f"{sorted(required)!r} for {parameter}."
        )
    if frame.empty:
        raise ValueError("NASA POWER returned a header but no regional observations.")
    if set(frame.columns) - required:
        raise ValueError(f"Unexpected columns in single-parameter response: {list(frame.columns)!r}")

    raw_parameter = frame[parameter]
    for column in ("LAT", "LON", "YEAR", "DOY"):
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    numeric_parameter = pd.to_numeric(raw_parameter, errors="coerce")
    invalid_parameter = (
        raw_parameter.notna()
        & raw_parameter.astype(str).str.strip().ne("")
        & numeric_parameter.isna()
    )
    if invalid_parameter.any():
        raise ValueError(f"NASA POWER response contains non-numeric values for {parameter}.")
    frame[parameter] = numeric_parameter
    if frame[["LAT", "LON", "YEAR", "DOY"]].isna().any().any():
        raise ValueError("NASA POWER response contains missing or non-numeric location/date keys.")
    if not frame["LAT"].between(-90, 90).all() or not frame["LON"].between(-180, 180).all():
        raise ValueError("NASA POWER response contains coordinates outside valid ranges.")
    if not frame["YEAR"].between(start.year, end.year).all():
        raise ValueError("NASA POWER response contains a year outside the requested date range.")
    if not frame["DOY"].between(1, 366).all() or not (frame["DOY"] % 1 == 0).all():
        raise ValueError("NASA POWER response contains an invalid day-of-year.")

    dates = []
    for year, day_of_year in zip(frame["YEAR"].astype(int), frame["DOY"].astype(int)):
        try:
            dates.append(date(year, 1, 1) + timedelta(days=day_of_year - 1))
        except (OverflowError, ValueError) as exc:
            raise ValueError(f"Invalid NASA POWER date fields: year={year}, doy={day_of_year}") from exc
    if any(not start <= item <= end for item in dates):
        raise ValueError("NASA POWER response contains dates outside the requested range.")

    values = frame[parameter].where(frame[parameter] != MISSING_VALUE)
    if parameter == "PRECTOTCORR":
        invalid = values.notna() & ~values.between(0, 2000)
    else:
        invalid = values.notna() & ~values.between(-100, 70)
    if invalid.any():
        raise ValueError(f"NASA POWER returned implausible {parameter} values.")

    standardized = pd.DataFrame(
        {
            "date": [item.isoformat() for item in dates],
            "latitude": frame["LAT"].astype(float),
            "longitude": frame["LON"].astype(float),
            PARAMETERS[parameter]: values.astype(float),
        }
    )
    key = KEY_COLUMNS
    duplicate_mask = standardized.duplicated(key, keep=False)
    duplicate_rows_removed = 0
    if duplicate_mask.any():
        duplicates = standardized.loc[duplicate_mask]
        conflicts = duplicates.groupby(key, dropna=False)[PARAMETERS[parameter]].nunique(dropna=False)
        if (conflicts > 1).any():
            raise ValueError(f"Conflicting duplicate observations in NASA POWER {parameter} response.")
        rows_before_deduplication = len(standardized)
        standardized = standardized.drop_duplicates(key, keep="first")
        duplicate_rows_removed = rows_before_deduplication - len(standardized)
    standardized.attrs["duplicate_rows_removed"] = duplicate_rows_removed
    return standardized


def create_regions(
    boundary_geometry: Any, tile_degrees: float = 10.0
) -> list[Region]:
    """Create non-overlapping rectangular API tiles intersecting the official polygon."""
    if not math.isfinite(tile_degrees) or not MIN_TILE_DEGREES <= tile_degrees <= MAX_TILE_DEGREES:
        raise ValueError(
            f"Tile size must be between {MIN_TILE_DEGREES} and {MAX_TILE_DEGREES} degrees "
            "for the NASA POWER regional endpoint."
        )
    min_lon, min_lat, max_lon, max_lat = boundary_geometry.bounds
    lon_start = math.floor(min_lon / tile_degrees) * tile_degrees
    lat_start = math.floor(min_lat / tile_degrees) * tile_degrees
    lon_end = math.ceil(max_lon / tile_degrees) * tile_degrees
    lat_end = math.ceil(max_lat / tile_degrees) * tile_degrees
    if lon_end <= lon_start:
        lon_end = lon_start + tile_degrees
    if lat_end <= lat_start:
        lat_end = lat_start + tile_degrees

    regions: list[Region] = []
    latitudes = [lat_start + tile_degrees * index for index in range(
        int(round((lat_end - lat_start) / tile_degrees))
    )]
    longitudes = [lon_start + tile_degrees * index for index in range(
        int(round((lon_end - lon_start) / tile_degrees))
    )]
    for latitude_min in latitudes:
        latitude_max = latitude_min + tile_degrees
        for longitude_min in longitudes:
            longitude_max = longitude_min + tile_degrees
            tile = _make_box(longitude_min, latitude_min, longitude_max, latitude_max)
            intersection = boundary_geometry.intersection(tile)
            if intersection.is_empty or intersection.area == 0:
                continue
            region_id = (
                f"lat_{latitude_min:g}_{latitude_max:g}"
                f"_lon_{longitude_min:g}_{longitude_max:g}"
            ).replace("-", "m").replace(".", "p")
            regions.append(
                Region(
                    region_id,
                    latitude_min,
                    latitude_max,
                    longitude_min,
                    longitude_max,
                    math.isclose(latitude_max, lat_end),
                    math.isclose(longitude_max, lon_end),
                )
            )
    if not regions:
        raise ValueError("No regional tiles intersect the supplied boundary geometry.")
    return regions


def _make_box(min_x: float, min_y: float, max_x: float, max_y: float) -> Any:
    from shapely.geometry import box

    return box(min_x, min_y, max_x, max_y)


def load_india_boundary(path: Path) -> tuple[Any, Any]:
    """Read the caller-supplied official India boundary and return its GeoDataFrame/union."""
    if not path.is_file():
        raise FileNotFoundError(f"India boundary dataset not found: {path}")
    try:
        import geopandas as gpd
    except ImportError as exc:
        raise RuntimeError(
            "GeoPandas is required. Install dependencies with "
            "'python -m pip install -r backend/requirements.txt'."
        ) from exc
    boundary = gpd.read_file(path)
    if boundary.empty or boundary.crs is None:
        raise ValueError("Boundary file is empty or has no CRS; provide a georeferenced official polygon.")
    boundary = boundary.to_crs("EPSG:4326")
    boundary = boundary[boundary.geometry.notna() & ~boundary.geometry.is_empty]
    if boundary.empty or not boundary.geometry.geom_type.isin(["Polygon", "MultiPolygon"]).all():
        raise ValueError("Boundary file must contain polygon or multipolygon geometries.")
    geometry = boundary.geometry.union_all()
    if not geometry.is_valid:
        raise ValueError("India boundary geometry is invalid; repair it using the source GIS software.")
    return boundary, geometry


def response_is_complete(entry: dict[str, Any], destination: Path) -> bool:
    if not destination.is_file() or entry.get("status") != "success":
        return False
    if entry.get("http_status") != 200:
        return False
    expected_hash = entry.get("sha256")
    if not expected_hash:
        return False
    try:
        return sha256_file(destination) == expected_hash
    except OSError:
        return False


def cached_response_is_valid(
    entry: dict[str, Any], destination: Path, parameter: str, start: date, end: date
) -> bool:
    if not response_is_complete(entry, destination):
        return False
    try:
        read_regional_csv(destination.read_text(encoding="utf-8"), parameter, start, end)
    except (OSError, UnicodeError, ValueError, pd.errors.ParserError) as exc:
        LOG.warning("Cached response failed validation and will be downloaded again: %s", exc)
        return False
    return True


class RequestPacer:
    def __init__(self, interval_seconds: float):
        self.interval_seconds = interval_seconds
        self.last_request: float | None = None

    def wait(self) -> None:
        if self.last_request is not None:
            remaining = self.interval_seconds - (time.monotonic() - self.last_request)
            if remaining > 0:
                time.sleep(remaining)
        self.last_request = time.monotonic()


def fetch_region_parameter(
    session: requests.Session,
    region: Region,
    parameter: str,
    start: date,
    end: date,
    destination: Path,
    manifest: dict[str, Any],
    manifest_path: Path,
    pacer: RequestPacer,
    retries: int,
    timeout: tuple[float, float],
) -> bool:
    key = f"{region.region_id}:{parameter}:{start:%Y%m%d}:{end:%Y%m%d}"
    entry = manifest["requests"].get(key, {})
    if cached_response_is_valid(entry, destination, parameter, start, end):
        LOG.info("Already verified; resume skip: region=%s parameter=%s", region.region_id, parameter)
        return True

    params = {
        "latitude-min": f"{region.latitude_min:.6f}".rstrip("0").rstrip("."),
        "latitude-max": _query_max(region.latitude_max, region.include_north_edge),
        "longitude-min": f"{region.longitude_min:.6f}".rstrip("0").rstrip("."),
        "longitude-max": _query_max(region.longitude_max, region.include_east_edge),
        "parameters": parameter,
        "community": "AG",
        "start": start.strftime("%Y%m%d"),
        "end": end.strftime("%Y%m%d"),
        "time-standard": "UTC",
        "format": "CSV",
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    failure: str | None = None
    http_status: int | None = None
    for attempt in range(1, retries + 1):
        pacer.wait()
        try:
            response = session.get(API_URL, params=params, timeout=timeout)
            http_status = response.status_code
            if response.status_code == 429 or 500 <= response.status_code <= 599:
                failure = f"HTTP {response.status_code}: {response.text[:500]}"
                if attempt < retries:
                    retry_after = response.headers.get("Retry-After", "")
                    delay = _retry_delay(retry_after, attempt)
                    LOG.warning(
                        "Retrying after HTTP %s: region=%s parameter=%s attempt=%s/%s wait=%.1fs",
                        response.status_code, region.region_id, parameter, attempt, retries, delay,
                    )
                    time.sleep(delay)
                    continue
                break
            if 400 <= response.status_code < 500:
                failure = f"HTTP {response.status_code}: {response.text[:500]}"
                break
            response.raise_for_status()
            content = response.text
            parsed = read_regional_csv(content, parameter, start, end)
            if parsed.empty:
                raise ValueError("Verified response contains no observations.")
            duplicate_rows_removed = int(parsed.attrs.get("duplicate_rows_removed", 0))
            temporary = destination.with_suffix(destination.suffix + ".tmp")
            temporary.write_text(content, encoding="utf-8")
            os.replace(temporary, destination)
            manifest["requests"][key] = {
                "status": "success",
                "http_status": response.status_code,
                "completed_at_utc": datetime.now(timezone.utc).isoformat(),
                "url": response.url,
                "parameters": params,
                "rows": len(parsed),
                "duplicate_rows_removed": duplicate_rows_removed,
                "sha256": sha256_file(destination),
                "file": str(destination),
            }
            save_manifest(manifest_path, manifest)
            LOG.info(
                "Verified HTTP %s; saved %s records (deduplicated %s): "
                "region=%s parameter=%s",
                response.status_code, len(parsed), duplicate_rows_removed,
                region.region_id, parameter,
            )
            return True
        except (requests.RequestException, ValueError, pd.errors.ParserError) as exc:
            failure = f"{type(exc).__name__}: {exc}"
            if attempt < retries:
                delay = _retry_delay("", attempt)
                LOG.warning(
                    "Retrying failed request: region=%s parameter=%s attempt=%s/%s "
                    "wait=%.1fs error=%s",
                    region.region_id, parameter, attempt, retries, delay, failure,
                )
                time.sleep(delay)

    manifest["requests"][key] = {
        "status": "failed",
        "http_status": http_status,
        "failed_at_utc": datetime.now(timezone.utc).isoformat(),
        "url": API_URL,
        "parameters": params,
        "error": failure or "Unknown request failure.",
    }
    save_manifest(manifest_path, manifest)
    LOG.error(
        "Request failed after %s attempt(s): region=%s parameter=%s HTTP=%s error=%s",
        attempt, region.region_id, parameter, http_status, failure,
    )
    return False


def _query_max(value: float, include_edge: bool) -> str:
    query_value = value if include_edge else value - 0.001
    return f"{query_value:.6f}".rstrip("0").rstrip(".")


def _retry_delay(retry_after: str, attempt: int) -> float:
    try:
        return min(60.0, max(1.0, float(retry_after)))
    except (TypeError, ValueError):
        try:
            retry_at = parsedate_to_datetime(retry_after)
            if retry_at.tzinfo is None:
                retry_at = retry_at.replace(tzinfo=timezone.utc)
            return min(60.0, max(1.0, (retry_at - datetime.now(timezone.utc)).total_seconds()))
        except (TypeError, ValueError, OverflowError):
            return min(30.0, 2.0 ** (attempt - 1))


def _owned_region_rows(frame: pd.DataFrame, region: Region) -> pd.DataFrame:
    latitude_ok = frame["latitude"].ge(region.latitude_min)
    longitude_ok = frame["longitude"].ge(region.longitude_min)
    latitude_ok &= (
        frame["latitude"].le(region.latitude_max)
        if region.include_north_edge else frame["latitude"].lt(region.latitude_max)
    )
    longitude_ok &= (
        frame["longitude"].le(region.longitude_max)
        if region.include_east_edge else frame["longitude"].lt(region.longitude_max)
    )
    return frame.loc[latitude_ok & longitude_ok].copy()


def _land_coordinates(
    locations: pd.DataFrame, boundary: Any
) -> set[tuple[float, float]]:
    """Return only grid points intersecting the provided India land polygon."""
    from shapely.geometry import Point

    keep: set[tuple[float, float]] = set()
    for latitude, longitude in locations[["latitude", "longitude"]].drop_duplicates().itertuples(
        index=False, name=None
    ):
        if boundary.intersects(Point(longitude, latitude)):
            keep.add((float(latitude), float(longitude)))
    return keep


def combine_region(
    region: Region,
    regional_dir: Path,
    boundary: Any,
    start: date,
    end: date,
) -> pd.DataFrame:
    merged: pd.DataFrame | None = None
    for parameter, output_column in PARAMETERS.items():
        parameter_chunks = []
        for chunk_start, chunk_end in date_chunks(start, end):
            source = (
                regional_dir
                / region.region_id
                / parameter
                / f"{chunk_start:%Y%m%d}_{chunk_end:%Y%m%d}.csv"
            )
            parameter_chunks.append(
                read_regional_csv(
                    source.read_text(encoding="utf-8"),
                    parameter,
                    chunk_start,
                    chunk_end,
                )
            )
        frame = pd.concat(parameter_chunks, ignore_index=True)
        duplicates_removed = sum(
            int(chunk.attrs.get("duplicate_rows_removed", 0))
            for chunk in parameter_chunks
        )
        frame.attrs["duplicate_rows_removed"] = duplicates_removed
        duplicate_mask = frame.duplicated(KEY_COLUMNS, keep=False)
        if duplicate_mask.any():
            duplicates = frame.loc[duplicate_mask]
            conflicts = duplicates.groupby(KEY_COLUMNS, dropna=False)[output_column].nunique(
                dropna=False
            )
            if (conflicts > 1).any():
                raise ValueError(
                    f"Conflicting duplicate {parameter} observations across date chunks."
                )
            rows_before_deduplication = len(frame)
            frame = frame.drop_duplicates(KEY_COLUMNS, keep="first")
            frame.attrs["duplicate_rows_removed"] += rows_before_deduplication - len(frame)
        frame = _owned_region_rows(frame, region).rename(columns={output_column: output_column})
        if merged is None:
            merged = frame
        else:
            merged = merged.merge(frame, on=KEY_COLUMNS, how="outer", validate="one_to_one")
    if merged is None or merged.empty:
        raise ValueError(f"No observations remain after reading regional responses for {region.region_id}.")
    keep = _land_coordinates(merged, boundary)
    location_keys = pd.MultiIndex.from_frame(merged[["latitude", "longitude"]])
    merged = merged.loc[location_keys.isin(keep)]
    if merged.empty:
        return pd.DataFrame(columns=OUTPUT_COLUMNS)
    merged = merged[OUTPUT_COLUMNS].sort_values(KEY_COLUMNS, kind="stable")
    return merged


def validate_final_data(path: Path, start: date, end: date) -> dict[str, Any]:
    rows = 0
    min_date: str | None = None
    max_date: str | None = None
    unique_locations: set[tuple[float, float]] = set()
    observed_dates: set[str] = set()
    observed_values = dict.fromkeys(PARAMETERS.values(), 0)
    missing_values = dict.fromkeys(PARAMETERS.values(), 0)
    expected = set(OUTPUT_COLUMNS)
    for chunk in pd.read_csv(path, chunksize=100_000):
        if set(chunk.columns) != expected:
            raise ValueError(f"Final dataset columns are invalid: {list(chunk.columns)}")
        chunk_dates = pd.to_datetime(chunk["date"], errors="coerce")
        if chunk_dates.isna().any() or not chunk_dates.between(
            pd.Timestamp(start), pd.Timestamp(end)
        ).all():
            raise ValueError("Final dataset contains invalid dates or dates outside the requested period.")
        if chunk[["latitude", "longitude"]].isna().any().any():
            raise ValueError("Final dataset contains missing coordinates.")
        if not chunk["latitude"].between(-90, 90).all() or not chunk["longitude"].between(-180, 180).all():
            raise ValueError("Final dataset contains invalid coordinates.")
        for column in PARAMETERS.values():
            values = pd.to_numeric(chunk[column], errors="coerce")
            if values.notna().any() and not values.dropna().map(math.isfinite).all():
                raise ValueError(f"Final dataset contains non-finite values in {column}.")
            observed_values[column] += int(values.notna().sum())
            missing_values[column] += int(values.isna().sum())
        rows += len(chunk)
        chunk_min, chunk_max = chunk_dates.min().date().isoformat(), chunk_dates.max().date().isoformat()
        min_date = min(min_date, chunk_min) if min_date else chunk_min
        max_date = max(max_date, chunk_max) if max_date else chunk_max
        observed_dates.update(chunk_dates.dt.strftime("%Y-%m-%d").unique())
        unique_locations.update(
            (float(lat), float(lon))
            for lat, lon in chunk[["latitude", "longitude"]].drop_duplicates().itertuples(
                index=False, name=None
            )
        )
    if rows == 0 or not min_date or not max_date:
        raise ValueError("Final dataset is empty.")
    if min_date != start.isoformat() or max_date != end.isoformat():
        raise ValueError(
            f"Dataset date coverage is {min_date} through {max_date}; "
            f"expected {start.isoformat()} through {end.isoformat()}."
        )
    expected_dates = set(pd.date_range(start, end, freq="D").strftime("%Y-%m-%d"))
    missing_dates = sorted(expected_dates - observed_dates)
    if missing_dates:
        raise ValueError(
            f"Final dataset is missing {len(missing_dates)} requested dates; "
            f"first missing dates: {', '.join(missing_dates[:10])}."
        )
    empty_parameters = [column for column, count in observed_values.items() if count == 0]
    if empty_parameters:
        raise ValueError(f"No valid NASA POWER readings were found for {empty_parameters}.")
    return {
        "rows": rows,
        "unique_grid_locations": len(unique_locations),
        "first_date": min_date,
        "last_date": max_date,
        "days_covered": len(observed_dates),
        "missing_values": missing_values,
    }


def create_plots(csv_path: Path, boundary_frame: Any, output_dir: Path) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    output_dir.mkdir(parents=True, exist_ok=True)
    daily_parts = []
    location_parts = []
    for chunk in pd.read_csv(csv_path, chunksize=100_000):
        chunk["date"] = pd.to_datetime(chunk["date"])
        daily_parts.append(
            chunk.groupby("date").agg(
                rainfall_sum=("rainfall_mm", "sum"),
                rainfall_count=("rainfall_mm", "count"),
                temperature_sum=("temperature_avg_c", "sum"),
                temperature_count=("temperature_avg_c", "count"),
            )
        )
        location_parts.append(
            chunk.groupby(["latitude", "longitude"]).agg(
                rainfall_sum=("rainfall_mm", "sum"),
                rainfall_count=("rainfall_mm", "count"),
                temperature_sum=("temperature_avg_c", "sum"),
                temperature_count=("temperature_avg_c", "count"),
            )
        )
    daily_totals = pd.concat(daily_parts).groupby(level=0).sum().sort_index()
    daily = pd.DataFrame(
        {
            "rainfall_mm": daily_totals["rainfall_sum"] / daily_totals["rainfall_count"],
            "temperature_avg_c": (
                daily_totals["temperature_sum"] / daily_totals["temperature_count"]
            ),
        }
    )
    location_totals = pd.concat(location_parts).groupby(level=[0, 1]).sum()
    locations = location_totals.reset_index()
    locations["rainfall_mm"] = (
        locations["rainfall_sum"] / locations["rainfall_count"]
    )
    locations["temperature_avg_c"] = (
        locations["temperature_sum"] / locations["temperature_count"]
    )

    figure, axes = plt.subplots(1, 3, figsize=(18, 6), constrained_layout=True)
    plot_fields = [
        ("rainfall_mm", "Mean daily rainfall (mm/day)", "Blues"),
        ("temperature_avg_c", "Mean daily temperature (°C)", "OrRd"),
        ("temperature_avg_c", "Grid coverage", "Greens"),
    ]
    for axis, (column, title, cmap) in zip(axes, plot_fields):
        boundary_frame.boundary.plot(ax=axis, color="#334155", linewidth=0.5)
        values = (
            locations["temperature_avg_c"].notna().astype(int)
            if title == "Grid coverage" else locations[column]
        )
        scatter = axis.scatter(
            locations["longitude"], locations["latitude"], c=values,
            s=5, cmap=cmap, alpha=0.85,
        )
        axis.set_title(title)
        axis.set_xlabel("Longitude")
        axis.set_ylabel("Latitude")
        figure.colorbar(scatter, ax=axis, shrink=0.75)
    map_path = output_dir / "india_weather_spatial_coverage.png"
    figure.savefig(map_path, dpi=160)
    plt.close(figure)

    figure, axis = plt.subplots(figsize=(13, 5), constrained_layout=True)
    daily["rainfall_mm"].rolling(30, min_periods=1).mean().plot(
        ax=axis, color="#2563eb", label="30-day mean rainfall (mm/day)"
    )
    axis.set_ylabel("Rainfall (mm/day)")
    axis.set_title("India-wide NASA POWER daily climate, 2020–2025")
    axis.grid(alpha=0.2)
    temperature_axis = axis.twinx()
    daily["temperature_avg_c"].rolling(30, min_periods=1).mean().plot(
        ax=temperature_axis, color="#ea580c", label="30-day mean temperature (°C)"
    )
    temperature_axis.set_ylabel("Temperature (°C)")
    left_lines, left_labels = axis.get_legend_handles_labels()
    right_lines, right_labels = temperature_axis.get_legend_handles_labels()
    axis.legend(left_lines + right_lines, left_labels + right_labels, loc="upper right")
    figure.savefig(output_dir / "india_weather_trends.png", dpi=160)
    plt.close(figure)
    LOG.info("Optional plots saved under %s", output_dir)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Collect NASA POWER daily precipitation and temperature on its native "
            "regional grid, filtered to a caller-supplied official India boundary."
        )
    )
    parser.add_argument(
        "--boundary", type=Path, required=True,
        help="Official India land-boundary shapefile, GeoPackage, GeoJSON, or supported GIS file.",
    )
    parser.add_argument(
        "--boundary-source", required=True,
        help="Citation/URL and version of the official boundary file, recorded in metadata.",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--work-dir", type=Path, default=DEFAULT_WORK_DIR)
    parser.add_argument("--start", type=date.fromisoformat, default=START_DATE)
    parser.add_argument("--end", type=date.fromisoformat, default=END_DATE)
    parser.add_argument(
        "--tile-degrees", type=float, default=10.0,
        help="Regional tile width/height in degrees (NASA supports 2 through 10).",
    )
    parser.add_argument("--rate-limit-seconds", type=float, default=1.0)
    parser.add_argument("--retries", type=int, default=4)
    parser.add_argument("--connect-timeout", type=float, default=20.0)
    parser.add_argument("--read-timeout", type=float, default=180.0)
    parser.add_argument("--plots", action="store_true", help="Create optional PNG maps and trend plots.")
    parser.add_argument(
        "--overwrite", action="store_true",
        help="Allow replacing an existing final CSV only after a complete new run validates.",
    )
    return parser.parse_args()


def run(args: argparse.Namespace) -> int:
    if args.start > args.end:
        raise ValueError("Start date must be on or before end date.")
    if args.start < date(1981, 1, 1):
        raise ValueError("NASA POWER Daily data begins in 1981; requested start date is too early.")
    if args.end > date.today():
        raise ValueError("End date cannot be in the future.")
    if args.retries < 1 or args.rate_limit_seconds < 0:
        raise ValueError("Retries must be at least 1 and rate limit must not be negative.")
    if args.connect_timeout <= 0 or args.read_timeout <= 0:
        raise ValueError("Request timeouts must be positive.")
    if args.output.exists() and not args.overwrite:
        raise FileExistsError(
            f"Output already exists and will not be overwritten: {args.output}. "
            "Choose another --output or explicitly pass --overwrite."
        )
    metadata_path = args.output.with_suffix(".metadata.json")
    if metadata_path.exists() and not args.overwrite:
        raise FileExistsError(
            f"Metadata already exists and will not be overwritten: {metadata_path}. "
            "Choose another --output or explicitly pass --overwrite."
        )

    work_dir = args.work_dir.resolve()
    regional_dir = work_dir / "regions"
    manifest_path = work_dir / "request_manifest.json"
    log_path = work_dir / "processing.log"
    work_dir.mkdir(parents=True, exist_ok=True)
    configure_logging(log_path)
    LOG.info("NASA POWER regional daily collection starting.")
    LOG.info("Boundary: %s (source: %s)", args.boundary, args.boundary_source)
    LOG.info("Period: %s through %s; tile size: %s degrees.", args.start, args.end, args.tile_degrees)

    boundary_frame, boundary_geometry = load_india_boundary(args.boundary)
    regions = create_regions(boundary_geometry, args.tile_degrees)
    windows = date_chunks(args.start, args.end)
    jobs = [
        (region, parameter, chunk_start, chunk_end)
        for region in regions
        for parameter in PARAMETERS
        for chunk_start, chunk_end in windows
    ]
    current_request_keys = {
        f"{region.region_id}:{parameter}:{chunk_start:%Y%m%d}:{chunk_end:%Y%m%d}"
        for region, parameter, chunk_start, chunk_end in jobs
    }
    manifest = load_manifest(manifest_path)
    manifest.update(
        {
            "source": "NASA POWER Daily Regional API",
            "api_documentation": "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
            "api_endpoint": API_URL,
            "boundary_file": str(args.boundary.resolve()),
            "boundary_source": args.boundary_source,
            "period": {"start": args.start.isoformat(), "end": args.end.isoformat()},
            "tile_degrees": args.tile_degrees,
            "parameters": PARAMETERS,
            "updated_at_utc": datetime.now(timezone.utc).isoformat(),
        }
    )
    save_manifest(manifest_path, manifest)

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Agri-Economic-Intelligence/1.0 (NASA POWER agricultural weather data client)",
            "Accept": "text/csv,text/plain;q=0.9,*/*;q=0.8",
        }
    )
    pacer = RequestPacer(args.rate_limit_seconds)
    failures = 0
    for index, (region, parameter, chunk_start, chunk_end) in enumerate(jobs, start=1):
        destination = (
            regional_dir
            / region.region_id
            / parameter
            / f"{chunk_start:%Y%m%d}_{chunk_end:%Y%m%d}.csv"
        )
        LOG.info(
            "Progress %s/%s (%.1f%%): region=%s bounds=[%.3f,%.3f]x[%.3f,%.3f] "
            "parameter=%s dates=%s..%s completed=%s failed=%s",
            index, len(jobs), index * 100 / len(jobs), region.region_id,
            region.latitude_min, region.latitude_max,
            region.longitude_min, region.longitude_max, parameter, chunk_start, chunk_end,
            index - 1 - failures, failures,
        )
        successful = fetch_region_parameter(
            session, region, parameter, chunk_start, chunk_end, destination,
            manifest, manifest_path, pacer, args.retries,
            (args.connect_timeout, args.read_timeout),
        )
        failures += int(not successful)
    session.close()

    if failures:
        LOG.error(
            "Collection incomplete: %s of %s requests failed. Successful regions remain cached; "
            "rerun the same command to retry failed requests. No final dataset was written.",
            failures, len(jobs),
        )
        return 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary_output = args.output.with_suffix(args.output.suffix + ".tmp")
    if temporary_output.exists():
        raise FileExistsError(
            f"Temporary output already exists and is preserved: {temporary_output}"
        )
    try:
        if temporary_output.exists():
            raise FileExistsError(f"Refusing to overwrite temporary output {temporary_output}")
        header_written = False
        for index, region in enumerate(regions, start=1):
            frame = combine_region(region, regional_dir, boundary_geometry, args.start, args.end)
            if frame.empty:
                LOG.warning(
                    "Region %s/%s contains no POWER grid point inside India's land boundary; "
                    "verified raw regional responses are retained.",
                    index, len(regions), region.region_id,
                )
                continue
            frame.to_csv(temporary_output, mode="a", index=False, header=not header_written)
            header_written = True
            LOG.info(
                "Combined region %s/%s: %s records after official-boundary filtering.",
                index, len(regions), len(frame),
            )
        if not header_written:
            raise RuntimeError("No regional data was available to combine.")
        validation = validate_final_data(temporary_output, args.start, args.end)
        if args.output.exists() and not args.overwrite:
            raise FileExistsError(f"Output appeared during the run; refusing to replace {args.output}")
        os.replace(temporary_output, args.output)
    except Exception:
        if temporary_output.exists():
            temporary_output.unlink()
        raise

    metadata = {
        **validation,
        "duplicate_records_removed_from_api_responses": sum(
            int(entry.get("duplicate_rows_removed", 0))
            for key, entry in manifest["requests"].items()
            if key in current_request_keys and entry.get("status") == "success"
        ),
        "source": "NASA POWER Daily Regional API",
        "endpoint": API_URL,
        "documentation": "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
        "downloaded_at_utc": datetime.now(timezone.utc).isoformat(),
        "period": {"start": args.start.isoformat(), "end": args.end.isoformat()},
        "parameters": PARAMETERS,
        "units": {
            "rainfall_mm": "mm/day",
            "temperature_avg_c": "degrees Celsius",
            "temperature_max_c": "degrees Celsius",
            "temperature_min_c": "degrees Celsius",
        },
        "time_standard": "UTC",
        "grid_resolution": "NASA POWER native regional grid (0.5 x 0.625 degree)",
        "boundary_file": str(args.boundary.resolve()),
        "boundary_source": args.boundary_source,
        "regional_request_count": len(jobs),
        "date_window_count": len(windows),
        "maximum_request_days": 366,
        "tile_degrees": args.tile_degrees,
        "missing_value_handling": (
            "NASA POWER -999 sentinel is converted to empty CSV fields; no imputation."
        ),
        "regional_responses_dir": str(regional_dir.resolve()),
        "request_manifest": str(manifest_path.resolve()),
        "log": str(log_path.resolve()),
    }
    if metadata_path.exists() and not args.overwrite:
        raise FileExistsError(
            f"Metadata already exists and will not be overwritten: {metadata_path}"
        )
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    if args.plots:
        create_plots(args.output, boundary_frame, work_dir / "plots")
    LOG.info(
        "COMPLETE: saved %s verified observations at %s (%s grid locations, %s through %s).",
        validation["rows"], args.output, validation["unique_grid_locations"],
        validation["first_date"], validation["last_date"],
    )
    return 0


def main() -> int:
    args = parse_args()
    try:
        return run(args)
    except Exception as exc:
        if LOG.handlers:
            LOG.exception("Pipeline stopped: %s", exc)
        else:
            print(f"Pipeline stopped: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
