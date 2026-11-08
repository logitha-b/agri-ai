"""
Nearby agricultural input supplier search — OpenStreetMap Overpass API.

Free, no API key required. Uses the public Overpass API with proper
URL-encoded form body (required by the server to avoid HTTP 406).

Tries multiple Overpass mirrors in order; falls back gracefully.

OSM tags searched:
    shop=agrarian                — agricultural supply shops
    shop=farm                    — farm supply stores
    shop=fertilizer              — fertiliser dealers
    shop=seeds                   — seed suppliers
    shop=agricultural_supplies   — general agricultural supplies
    craft=agrarian               — agrarian trade/craft

Coverage note: OSM tagging of agricultural shops in rural India is
incomplete. Results reflect what community volunteers have mapped —
NOT a comprehensive or government-verified directory.

Usage policy: https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
"""

from __future__ import annotations

import math
import time
from datetime import date
from typing import Any
from urllib.parse import urlencode

import httpx

# ── Constants ────────────────────────────────────────────────────────────────

# Try mirrors in order; the first one that responds wins
OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
]

TIMEOUT = 25.0

# Simple in-process cache: key → (timestamp, result)
_cache: dict[str, tuple[float, dict]] = {}
CACHE_TTL_SECONDS = 3600  # 1 hour — suppliers don't move often

# ── OSM tags to search ────────────────────────────────────────────────────────

AGRI_SHOP_TAGS = [
    ("shop", "agrarian"),
    ("shop", "farm"),
    ("shop", "fertilizer"),
    ("shop", "seeds"),
    ("shop", "agricultural_supplies"),
    ("craft", "agrarian"),
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(max(0.0, a)))


def _build_overpass_query(lat: float, lng: float, radius_m: int) -> str:
    """
    Build a single Overpass QL query that fetches all agri-supply
    nodes and ways in one round-trip.
    """
    lines = []
    for k, v in AGRI_SHOP_TAGS:
        lines.append(f'node["{k}"="{v}"](around:{radius_m},{lat},{lng});')
        lines.append(f'way["{k}"="{v}"](around:{radius_m},{lat},{lng});')
    inner = "\n".join(lines)
    return f"[out:json][timeout:25];({inner});out center tags;"


def _post_query(query: str) -> bytes:
    """
    Synchronous POST to Overpass using urllib (no async, called from thread).
    Returns raw response bytes.
    Raises httpx.HTTPError or httpx.TimeoutException on failure.
    """
    # Properly URL-encode the form body — required by Overpass to avoid 406
    body = urlencode({"data": query}).encode("utf-8")
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "agri-economic-intelligence/1.0 (github contact)",
    }
    last_exc: Exception | None = None
    for mirror in OVERPASS_MIRRORS:
        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                r = client.post(mirror, content=body, headers=headers)
            if r.status_code == 200 and r.content:
                return r.content
            if r.status_code == 429:
                # Rate-limited — don't try next mirror immediately
                raise httpx.HTTPStatusError(
                    f"Overpass rate limit (HTTP 429)", request=r.request, response=r
                )
        except httpx.TimeoutException as exc:
            last_exc = exc
            continue
        except (httpx.ConnectError, httpx.HTTPStatusError) as exc:
            last_exc = exc
            continue
    raise last_exc or RuntimeError("All Overpass mirrors failed")


def _parse_element(el: dict, ref_lat: float, ref_lng: float) -> dict | None:
    """Extract a clean supplier record from an OSM element. Returns None for unnamed entries."""
    tags = el.get("tags", {})
    name = tags.get("name") or tags.get("operator")
    if not name:
        return None

    # Coordinates: nodes have lat/lon; ways expose a computed centre
    if el.get("type") == "node":
        lat = el.get("lat")
        lng = el.get("lon")
    else:
        centre = el.get("center", {})
        lat = centre.get("lat")
        lng = centre.get("lon")

    if lat is None or lng is None:
        return None

    distance_km = round(_haversine_km(ref_lat, ref_lng, lat, lng), 2)

    # Build address only from present tags — never invent missing parts
    addr_parts = [
        tags.get("addr:housename", ""),
        tags.get("addr:housenumber", ""),
        tags.get("addr:street", ""),
        tags.get("addr:village") or tags.get("addr:suburb", ""),
        tags.get("addr:city") or tags.get("addr:town", ""),
        tags.get("addr:district", ""),
        tags.get("addr:state", ""),
        tags.get("addr:postcode", ""),
    ]
    address = ", ".join(p for p in addr_parts if p) or None

    # Category label from OSM tag
    category = (
        tags.get("shop") or tags.get("craft") or "agricultural supplier"
    ).replace("_", " ").title()

    record: dict[str, Any] = {
        "name": name,
        "category": category,
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "distance_km": distance_km,
        "osm_id": el.get("id"),
        "osm_type": el.get("type"),
        "osm_url": f"https://www.openstreetmap.org/{el.get('type')}/{el.get('id')}",
        "source": "OpenStreetMap contributors",
    }

    # Only include fields that are actually present in OSM
    if address:
        record["address"] = address
    if tags.get("phone") or tags.get("contact:phone"):
        record["phone"] = tags.get("phone") or tags.get("contact:phone")
    if tags.get("website") or tags.get("contact:website"):
        record["website"] = tags.get("website") or tags.get("contact:website")
    if tags.get("opening_hours"):
        record["opening_hours"] = tags["opening_hours"]
    if tags.get("description"):
        record["description"] = tags["description"]

    return record


# ── Public API ────────────────────────────────────────────────────────────────

def find_nearby_suppliers_sync(
    lat: float,
    lng: float,
    radius_m: int = 15000,
    max_results: int = 15,
) -> dict[str, Any]:
    """
    Synchronous supplier search with in-process caching.
    Called from the async wrapper via asyncio.to_thread.
    """
    cache_key = f"{lat:.4f},{lng:.4f},{radius_m}"
    now = time.monotonic()

    # Cache hit
    cached = _cache.get(cache_key)
    if cached and (now - cached[0]) < CACHE_TTL_SECONDS:
        return cached[1]

    query = _build_overpass_query(lat, lng, radius_m)

    try:
        raw = _post_query(query)
        elements = __import__("json").loads(raw).get("elements", [])
    except httpx.TimeoutException:
        result = _error_result(
            lat, lng, radius_m,
            "Overpass API timed out. The service may be busy — try again in a few minutes.",
            "TIMEOUT",
        )
        return result
    except httpx.HTTPStatusError as exc:
        if "429" in str(exc):
            result = _error_result(
                lat, lng, radius_m,
                "Overpass API rate limit reached. Wait a few minutes and try again.",
                "RATE_LIMIT",
            )
        else:
            result = _error_result(lat, lng, radius_m, str(exc), "HTTP_ERROR")
        return result
    except Exception as exc:
        return _error_result(lat, lng, radius_m, str(exc), "ERROR")

    # Parse, deduplicate, sort by distance
    seen: set[str] = set()
    suppliers: list[dict] = []
    for el in elements:
        record = _parse_element(el, lat, lng)
        if not record:
            continue
        key = f"{record['osm_type']}:{record['osm_id']}"
        if key not in seen:
            seen.add(key)
            suppliers.append(record)

    suppliers.sort(key=lambda s: s["distance_km"])
    suppliers = suppliers[:max_results]

    result = {
        "available": True,
        "found": len(suppliers) > 0,
        "count": len(suppliers),
        "suppliers": suppliers,
        "radius_km": round(radius_m / 1000, 1),
        "location": {"lat": lat, "lng": lng},
        "query_date": date.today().isoformat(),
        "cached": False,
        "source": "OpenStreetMap Overpass API",
        "attribution": "© OpenStreetMap contributors — data available under the Open Database Licence (ODbL).",
        "coverage_note": (
            "These are businesses that OSM community volunteers have mapped. "
            "Coverage is incomplete, especially in rural India. "
            "This is NOT a government-verified or exhaustive dealer directory. "
            "Always confirm details before visiting."
        ),
        "add_missing_note": (
            "Know a supplier that's missing? Add it at openstreetmap.org — "
            "it will appear in future searches."
        ),
    }

    _cache[cache_key] = (now, {**result, "cached": True})
    return result


async def find_nearby_suppliers(
    lat: float,
    lng: float,
    radius_m: int = 15000,
    max_results: int = 15,
) -> dict[str, Any]:
    """Async wrapper — runs the blocking Overpass call in a thread pool."""
    import asyncio
    import functools
    return await asyncio.get_event_loop().run_in_executor(
        None,
        functools.partial(find_nearby_suppliers_sync, lat, lng, radius_m, max_results),
    )


async def find_nearby_suppliers_safe(
    lat: float,
    lng: float,
    radius_m: int = 15000,
) -> dict[str, Any]:
    """Never raises. Returns a safe error dict on any exception."""
    try:
        return await find_nearby_suppliers(lat, lng, radius_m)
    except Exception as exc:
        return _error_result(lat, lng, radius_m, str(exc), "ERROR")


def _error_result(lat: float, lng: float, radius_m: int, message: str, code: str) -> dict:
    return {
        "available": False,
        "found": False,
        "count": 0,
        "suppliers": [],
        "radius_km": round(radius_m / 1000, 1),
        "location": {"lat": lat, "lng": lng},
        "error_code": code,
        "error_message": message,
        "source": "OpenStreetMap Overpass API",
        "attribution": "© OpenStreetMap contributors",
        "coverage_note": (
            "OpenStreetMap agricultural shop coverage is incomplete in rural India. "
            "If no results are shown, it means no shops have been mapped in OSM for this area — "
            "not that no shops exist."
        ),
    }
