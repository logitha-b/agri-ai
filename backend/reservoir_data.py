"""
Reservoir boundary loader from CWC KML file.

Source: Central Water Commission — National Water Data Portal
File:   ml/data/water/reservoir.kml  (~239 MB)

Fields available in the KML:
    res_name   — reservoir name
    river      — river (sometimes absent)
    basin      — river basin name
    PIC        — links to dam_data.geojson PIC field
    dm_name    — dam name
    area       — surface area (hectares)

Geometry: MultiGeometry → Polygon, WGS84 lon/lat coordinates.
We extract the centroid of each polygon as a representative point for
proximity searches and map markers. The full boundary is returned only
when a specific reservoir is requested (to keep list responses small).

Caching: all records loaded once on first access.
"""

from __future__ import annotations

import math
import os
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
KML_FILE = Path(os.getenv("RESERVOIR_KML_PATH", str(ROOT / "ml" / "data" / "water" / "reservoir.kml")))

KML_NS  = "http://www.opengis.net/kml/2.2"
_NS     = {"k": KML_NS}

_reservoirs: list[dict] | None = None
_by_pic: dict[str, dict] | None = None


# ── Geometry helpers ───────────────────────────────────────────────────────────

def _parse_coords(coord_str: str) -> list[tuple[float, float]]:
    """Parse a KML coordinate string into list of (lon, lat) tuples."""
    pts: list[tuple[float, float]] = []
    for token in coord_str.strip().split():
        parts = token.split(",")
        if len(parts) >= 2:
            try:
                pts.append((float(parts[0]), float(parts[1])))
            except ValueError:
                continue
    return pts


def _centroid(coords: list[tuple[float, float]]) -> tuple[float, float] | None:
    if not coords:
        return None
    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return (sum(lons) / len(lons), sum(lats) / len(lats))


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(max(0.0, a)))


# ── Loader ─────────────────────────────────────────────────────────────────────

def _get_simple_data(schema_data: ET.Element, name: str) -> str | None:
    """Extract a SimpleData element value by name attribute."""
    for sd in schema_data.findall("k:SimpleData", _NS):
        if sd.get("name") == name:
            text = (sd.text or "").strip()
            return text if text else None
    return None


def _load() -> None:
    global _reservoirs, _by_pic
    if _reservoirs is not None:
        return

    if not KML_FILE.is_file():
        _reservoirs = []
        _by_pic = {}
        return

    records: list[dict] = []
    # Parse with iterparse to handle the 239 MB file without loading all into RAM
    context = ET.iterparse(str(KML_FILE), events=("end",))
    for event, elem in context:
        tag = elem.tag.replace(f"{{{KML_NS}}}", "")
        if tag != "Placemark":
            continue

        # Extract SchemaData
        schema_data = elem.find(".//k:SchemaData", _NS)
        if schema_data is None:
            elem.clear()
            continue

        res_name = _get_simple_data(schema_data, "res_name")
        if not res_name:
            elem.clear()
            continue

        # Collect all polygon coordinate rings to find centroid
        all_coords: list[tuple[float, float]] = []
        boundary_rings: list[list[tuple[float, float]]] = []
        for coord_elem in elem.findall(".//k:coordinates", _NS):
            pts = _parse_coords(coord_elem.text or "")
            if pts:
                all_coords.extend(pts)
                boundary_rings.append(pts)

        centre = _centroid(all_coords)
        if centre is None:
            elem.clear()
            continue

        lon, lat = centre
        # Basic India bounds check
        if not (6 <= lat <= 38 and 68 <= lon <= 98):
            elem.clear()
            continue

        try:
            area = float(_get_simple_data(schema_data, "area") or 0) or None
        except ValueError:
            area = None

        record: dict[str, Any] = {
            "id":        _get_simple_data(schema_data, "PIC") or "",
            "res_name":  res_name,
            "dam_name":  _get_simple_data(schema_data, "dm_name"),
            "river":     _get_simple_data(schema_data, "river"),
            "basin":     _get_simple_data(schema_data, "basin"),
            "area_ha":   area,
            "lat":       round(lat, 6),
            "lng":       round(lon, 6),
            # Boundary for detail view: first ring only (outer boundary)
            "boundary":  boundary_rings[0] if boundary_rings else [],
            "source":    "Central Water Commission — National Water Data Portal (nwdp.nwic.gov.in)",
        }
        records.append(record)
        elem.clear()

    _reservoirs = records
    _by_pic = {r["id"]: r for r in records if r["id"]}


# ── Public API ─────────────────────────────────────────────────────────────────

def total_count() -> int:
    _load()
    return len(_reservoirs)


def dataset_info() -> dict[str, Any]:
    _load()
    basins = sorted({r["basin"] for r in _reservoirs if r["basin"]})
    return {
        "total_reservoirs": len(_reservoirs),
        "total_basins":     len(basins),
        "source":           "Central Water Commission — National Water Data Portal",
        "url":              "https://nwdp.nwic.gov.in/en/dataset/reservoir/resource/1790dd33-0e07-49d0-bc52-ca222d30543e",
        "data_type":        "Reservoir boundary polygons — centroid used for mapping and proximity search.",
        "fields":           ["res_name", "dam_name", "river", "basin", "PIC", "area_ha"],
        "live_data":        False,
        "live_data_note":   "No live water-level, storage, inflow, or outflow data in this file.",
        "geometry_note":    "Full boundary polygon available per reservoir. Centroid returned in list views.",
    }


def get_by_id(pic: str, include_boundary: bool = True) -> dict | None:
    _load()
    r = _by_pic.get(pic)
    if r is None:
        return None
    if not include_boundary:
        return {k: v for k, v in r.items() if k != "boundary"}
    return r


def list_reservoirs(
    basin: str | None = None,
    name_query: str | None = None,
    bbox: tuple[float, float, float, float] | None = None,
    limit: int = 200,
    offset: int = 0,
) -> dict[str, Any]:
    _load()
    results = _reservoirs

    if basin:
        b = basin.lower()
        results = [r for r in results if r["basin"] and b in r["basin"].lower()]
    if name_query:
        nq = name_query.lower()
        results = [r for r in results if nq in r["res_name"].lower()]
    if bbox:
        west, south, east, north = bbox
        results = [
            r for r in results
            if west <= r["lng"] <= east and south <= r["lat"] <= north
        ]

    total = len(results)
    # Strip boundary from list responses for performance
    page = [{k: v for k, v in r.items() if k != "boundary"} for r in results[offset: offset + limit]]
    return {"total": total, "offset": offset, "limit": limit, "reservoirs": page}


def reservoirs_near(
    lat: float, lng: float, radius_km: float = 50.0, limit: int = 10
) -> list[dict]:
    _load()
    nearby = []
    for r in _reservoirs:
        d = _haversine_km(lat, lng, r["lat"], r["lng"])
        if d <= radius_km:
            rec = {k: v for k, v in r.items() if k != "boundary"}
            rec["distance_km"] = round(d, 2)
            nearby.append(rec)
    nearby.sort(key=lambda x: x["distance_km"])
    return nearby[:limit]
