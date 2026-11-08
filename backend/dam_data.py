"""
Dam inventory loader and query helpers.

Source: National Dam Safety Authority — National Water Data Portal
File:   ml/data/water/dam_data.geojson  (6,644 dams, all India)

Key facts about the raw file
────────────────────────────
* geometry.coordinates are in EPSG:7755 (India projected metres) — UNUSABLE for web maps.
* lat/lng in WGS84 degrees are stored in the `latitude` and `longitude` property strings
  as DMS notation, e.g.  "11° 37' 28.000\" N"  and  "92° 39' 33.000\" E".
* This module parses those DMS strings and ignores geometry.coordinates entirely.
* All field names are taken from the actual data — never assumed.

Available property fields (verified):
    PIC           unique identifier
    dm_name       dam name
    sdso          sub-division / regional office
    state
    district      (nullable)
    river         (nullable)
    incharge      operating authority
    ht_found      height at foundation (m)
    cmp_year      completion year
    basin         river basin name
    mx_wt_lel     max water level (m)
    frl           full reservoir level (m)
    gs_st_cap     gross storage capacity (MCM)
    ds_sp_cap     dead storage / spillway capacity
    dm_length     dam length (m)
    dm_type       dam type string (nullable, sometimes bullet-prefixed)
    purpose       e.g. "Irrigation", "Hydropower", "Flood Control"
    latitude      DMS string, e.g. "11° 37' 28.000\" N"
    longitude     DMS string, e.g. "92° 39' 33.000\" E"

Caching
───────
The full GeoJSON is loaded once into memory on first access and kept in a module-level
cache.  A per-state index is built at load time for fast filtering.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DAM_FILE = ROOT / "ml" / "data" / "water" / "dam_data.geojson"

# ── Module-level cache ─────────────────────────────────────────────────────────
_dams: list[dict] | None = None          # parsed dam records
_by_state: dict[str, list[dict]] | None = None   # state-name → list[record]
_by_id: dict[str, dict] | None = None    # PIC → record


# ── DMS parsing ────────────────────────────────────────────────────────────────

_DMS_RE = re.compile(
    r"""
    (\d{1,3})       # degrees
    [°\s]+
    (\d{1,2})       # minutes
    [''\s]+
    ([\d.]+)        # seconds
    ["\s]*
    ([NSEW])        # hemisphere
    """,
    re.VERBOSE | re.IGNORECASE,
)


def _dms_to_decimal(dms_str: str) -> float | None:
    """Parse a DMS string such as '11° 37\\' 28.000\\" N' into decimal degrees."""
    if not dms_str:
        return None
    m = _DMS_RE.search(str(dms_str))
    if not m:
        return None
    deg = float(m.group(1))
    mins = float(m.group(2))
    secs = float(m.group(3))
    hemi = m.group(4).upper()
    value = deg + mins / 60.0 + secs / 3600.0
    if hemi in ("S", "W"):
        value = -value
    return round(value, 6)


def _clean_dm_type(raw: str | None) -> str | None:
    """Strip bullet characters and whitespace from dm_type strings."""
    if not raw:
        return None
    cleaned = re.sub(r"^[•·\t\s]+", "", str(raw)).strip()
    return cleaned if cleaned else None


# ── Loader ─────────────────────────────────────────────────────────────────────

def _load() -> None:
    global _dams, _by_state, _by_id
    if _dams is not None:
        return  # already loaded

    if not DAM_FILE.is_file():
        _dams = []
        _by_state = {}
        _by_id = {}
        return

    raw = json.loads(DAM_FILE.read_text(encoding="utf-8"))
    features = raw.get("features", [])

    records: list[dict] = []
    for feat in features:
        props = feat.get("properties") or {}

        lat = _dms_to_decimal(props.get("latitude"))
        lng = _dms_to_decimal(props.get("longitude"))
        if lat is None or lng is None:
            continue  # skip features with unparseable coordinates
        # Basic India bounding box sanity check
        if not (6 <= lat <= 38 and 68 <= lng <= 98):
            continue

        record: dict[str, Any] = {
            "id":          props.get("PIC") or "",
            "name":        props.get("dm_name") or "Unnamed dam",
            "state":       (props.get("state") or "").strip(),
            "district":    (props.get("district") or "").strip() or None,
            "river":       (props.get("river") or "").strip() or None,
            "basin":       (props.get("basin") or "").strip() or None,
            "incharge":    (props.get("incharge") or "").strip() or None,
            "sdso":        (props.get("sdso") or "").strip() or None,
            "dam_type":    _clean_dm_type(props.get("dm_type")),
            "purpose":     (props.get("purpose") or "").strip() or None,
            "lat":         lat,
            "lng":         lng,
            # Numeric fields — None if zero/missing where zero is ambiguous
            "height_m":          _safe_num(props.get("ht_found")),
            "completion_year":   _safe_int(props.get("cmp_year")),
            "max_water_level_m": _safe_num(props.get("mx_wt_lel")),
            "full_reservoir_level_m": _safe_num(props.get("frl")),
            "gross_storage_mcm": _safe_num(props.get("gs_st_cap")),
            "dead_storage_mcm":  _safe_num(props.get("ds_sp_cap")),
            "dam_length_m":      _safe_num(props.get("dm_length")),
            # Flood relevance flag
            "flood_control": "flood" in (props.get("purpose") or "").lower(),
            # Data source
            "source": "National Dam Safety Authority — National Water Data Portal (nwdp.nwic.gov.in)",
        }
        records.append(record)

    _dams = records
    _by_state = {}
    _by_id = {}
    for r in records:
        state_key = r["state"].lower()
        _by_state.setdefault(state_key, []).append(r)
        if r["id"]:
            _by_id[r["id"]] = r


def _safe_num(value: Any) -> float | None:
    try:
        v = float(value)
        return v if v != 0.0 else None   # treat 0.0 as missing (ambiguous in this dataset)
    except (TypeError, ValueError):
        return None


def _safe_int(value: Any) -> int | None:
    try:
        v = int(value)
        return v if v > 0 else None
    except (TypeError, ValueError):
        return None


# ── Haversine ──────────────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(max(0.0, a)))


# ── Public query functions ─────────────────────────────────────────────────────

def total_count() -> int:
    _load()
    return len(_dams)


def list_states() -> list[str]:
    _load()
    return sorted({r["state"] for r in _dams if r["state"]})


def list_basins() -> list[str]:
    _load()
    return sorted({r["basin"] for r in _dams if r["basin"]})


def get_by_id(pic: str) -> dict | None:
    _load()
    return _by_id.get(pic)


def search_dams(
    state: str | None = None,
    district: str | None = None,
    basin: str | None = None,
    name_query: str | None = None,
    purpose: str | None = None,
    bbox: tuple[float, float, float, float] | None = None,  # (west, south, east, north)
    limit: int = 200,
    offset: int = 0,
) -> dict[str, Any]:
    """
    Filter dams by any combination of state, district, basin, name, purpose, bbox.
    Returns paginated results with total count.
    """
    _load()
    results = _dams

    if state:
        s = state.lower()
        results = [r for r in results if s in r["state"].lower()]
    if district:
        d = district.lower()
        results = [r for r in results if r["district"] and d in r["district"].lower()]
    if basin:
        b = basin.lower()
        results = [r for r in results if r["basin"] and b in r["basin"].lower()]
    if name_query:
        nq = name_query.lower()
        results = [r for r in results if nq in r["name"].lower()]
    if purpose:
        p = purpose.lower()
        results = [r for r in results if r["purpose"] and p in r["purpose"].lower()]
    if bbox:
        west, south, east, north = bbox
        results = [
            r for r in results
            if west <= r["lng"] <= east and south <= r["lat"] <= north
        ]

    total = len(results)
    page = results[offset: offset + limit]
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "dams": page,
    }


def dams_near(lat: float, lng: float, radius_km: float = 50.0, limit: int = 20) -> list[dict]:
    """Return dams within radius_km of a point, sorted by distance, with distance_km field."""
    _load()
    nearby = []
    for r in _dams:
        d = _haversine_km(lat, lng, r["lat"], r["lng"])
        if d <= radius_km:
            nearby.append({**r, "distance_km": round(d, 2)})
    nearby.sort(key=lambda x: x["distance_km"])
    return nearby[:limit]


def dataset_info() -> dict[str, Any]:
    _load()
    return {
        "total_dams": len(_dams),
        "total_states": len(list_states()),
        "total_basins": len(list_basins()),
        "source": "National Dam Safety Authority — National Water Data Portal",
        "url": "https://nwdp.nwic.gov.in/en/dataset/dam/resource/0d3a7101-81b4-450e-a3dd-c2bfa0b589e3",
        "data_type": "Static inventory — geographic location, design parameters, purpose. NO live water levels.",
        "coordinate_note": (
            "WGS84 coordinates are parsed from the DMS latitude/longitude property fields. "
            "geometry.coordinates in the source file are in EPSG:7755 (projected metres) and are not used."
        ),
        "live_data": False,
        "live_data_note": (
            "This dataset contains no live reservoir levels, current storage, inflow, outflow, "
            "or dam discharge. For live CWC data see india-water.gov.in (requires registration)."
        ),
    }
