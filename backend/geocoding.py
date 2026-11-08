"""
Geocoding helpers using the free Nominatim API (OpenStreetMap).

No API key required.  A descriptive User-Agent string is mandatory per
Nominatim's usage policy: https://operations.osmfoundation.org/policies/nominatim/
"""

from __future__ import annotations

import os
from typing import Any

import httpx

NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "agri-economic-intelligence/1.0")
TIMEOUT = 10.0


async def geocode_address(address: str) -> dict[str, Any]:
    """
    Convert a free-text address to geographic coordinates.

    Returns a dict with keys:
        lat, lng        — float coordinates (WGS-84)
        display_name    — full resolved address string
        confidence      — 'high' | 'medium' | 'low' based on result rank
        bounding_box    — [south, north, west, east] floats
        found           — bool

    Raises httpx.HTTPError on network failure.
    """
    params = {
        "q": address,
        "format": "jsonv2",
        "limit": 1,
        "addressdetails": 1,
        "countrycodes": "in",   # restrict to India; remove if international
    }
    headers = {"User-Agent": USER_AGENT, "Accept-Language": "en"}

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(f"{NOMINATIM_BASE}/search", params=params, headers=headers)
        response.raise_for_status()
        results = response.json()

    if not results:
        return {
            "found": False,
            "lat": None,
            "lng": None,
            "display_name": None,
            "confidence": None,
            "bounding_box": None,
        }

    hit = results[0]
    rank = int(hit.get("place_rank", 30))
    confidence = "high" if rank <= 18 else "medium" if rank <= 25 else "low"

    bb = hit.get("boundingbox", [])
    bounding_box = [float(bb[0]), float(bb[1]), float(bb[2]), float(bb[3])] if len(bb) == 4 else None
    addr = hit.get("address", {})

    return {
        "found": True,
        "lat": float(hit["lat"]),
        "lng": float(hit["lon"]),
        "display_name": hit.get("display_name", ""),
        "confidence": confidence,
        "bounding_box": bounding_box,
        "place_type": hit.get("type", ""),
        "address": addr,
        "state": addr.get("state", ""),
        "district": addr.get("state_district") or addr.get("district") or addr.get("county") or "",
        "village": addr.get("village") or addr.get("town") or addr.get("suburb") or addr.get("hamlet") or addr.get("city_district") or "",
        "pincode": addr.get("postcode", ""),
    }


async def reverse_geocode(lat: float, lng: float) -> dict[str, Any]:
    """
    Convert coordinates to a human-readable address.
    Useful for confirming a farmer-moved map pin.
    """
    params = {"lat": lat, "lon": lng, "format": "jsonv2", "addressdetails": 1}
    headers = {"User-Agent": USER_AGENT, "Accept-Language": "en"}

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(f"{NOMINATIM_BASE}/reverse", params=params, headers=headers)
        response.raise_for_status()
        hit = response.json()

    if "error" in hit:
        return {"found": False, "display_name": None, "address": {}}

    addr = hit.get("address", {})
    return {
        "found": True,
        "lat": float(hit["lat"]) if "lat" in hit else lat,
        "lng": float(hit["lon"]) if "lon" in hit else lng,
        "display_name": hit.get("display_name", ""),
        "address": addr,
        "state": addr.get("state", ""),
        "district": addr.get("state_district") or addr.get("district") or addr.get("county") or "",
        "village": addr.get("village") or addr.get("town") or addr.get("suburb") or addr.get("hamlet") or addr.get("city_district") or "",
        "pincode": addr.get("postcode", ""),
    }
