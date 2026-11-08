


"""
NASA POWER daily climate data fetcher.

No API key required. Free public API.
Documentation: https://power.larc.nasa.gov/docs/services/api/

Parameters fetched (agroclimatology community):
    PRECTOTCORR   — precipitation corrected (mm/day)
    T2M           — temperature at 2 m, average (°C)
    T2M_MAX       — temperature at 2 m, maximum (°C)
    T2M_MIN       — temperature at 2 m, minimum (°C)
    RH2M          — relative humidity at 2 m (%)
    ALLSKY_SFC_SW_DWN — solar radiation (MJ/m²/day)

Resolution: ~0.5° × 0.625° (~55 km), daily.
This is suitable for regional-scale context, not field-level precision.
"""

from __future__ import annotations

import time
from datetime import date, timedelta
from typing import Any

import httpx

# ── Simple in-process cache (1-hour TTL) ─────────────────────────────────────
_cache: dict[str, tuple[float, Any]] = {}  # key -> (timestamp, result)
CACHE_TTL = 3600  # seconds

def _cached(key: str) -> Any | None:
    entry = _cache.get(key)
    if entry and time.monotonic() - entry[0] < CACHE_TTL:
        return entry[1]
    return None

def _store(key: str, value: Any) -> None:
    # Evict stale entries if cache grows too large
    if len(_cache) > 200:
        now = time.monotonic()
        stale = [k for k, (ts, _) in _cache.items() if now - ts >= CACHE_TTL]
        for k in stale:
            _cache.pop(k, None)
    _cache[key] = (time.monotonic(), value)

BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
TIMEOUT = 20.0
MISSING_VALUE = -999.0

PARAMETERS = ["PRECTOTCORR", "T2M", "T2M_MAX", "T2M_MIN", "RH2M", "ALLSKY_SFC_SW_DWN"]


def _clean(value: float | None) -> float | None:
    """Replace NASA POWER missing-value sentinel with None."""
    if value is None or value <= MISSING_VALUE:
        return None
    return round(value, 2)


async def fetch_weather(lat: float, lng: float, days: int = 30) -> dict[str, Any]:
    """
    Fetch the last `days` days of daily NASA POWER climate data for a point.

    Results are cached in-process for 1 hour to avoid redundant API calls.

    Returns:
        daily       — list of {date, rainfall_mm, temp_avg_c, temp_max_c,
                               temp_min_c, humidity_pct, solar_mj_m2}
        summary     — 30-day aggregate statistics
        location    — {lat, lng}
        source, resolution, limitations
    """
    today = date.today()
    start = today - timedelta(days=days)

    # Check cache first (keyed by rounded coords + days + today's date)
    cache_key = f"weather:{lat:.3f},{lng:.3f},{days},{today}"
    cached = _cached(cache_key)
    if cached is not None:
        return cached

    params = {
        "parameters": ",".join(PARAMETERS),
        "community": "AG",
        "longitude": lng,
        "latitude": lat,
        "start": start.strftime("%Y%m%d"),
        "end": today.strftime("%Y%m%d"),
        "format": "JSON",
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(BASE_URL, params=params)

    if response.status_code != 200:
        return _unavailable(lat, lng, f"NASA POWER returned HTTP {response.status_code}.")

    try:
        data = response.json()
        parameter_data = data["properties"]["parameter"]
    except (KeyError, ValueError) as exc:
        return _unavailable(lat, lng, f"Unexpected NASA POWER response format: {exc}")

    rain_raw    = parameter_data.get("PRECTOTCORR", {})
    t_avg_raw   = parameter_data.get("T2M", {})
    t_max_raw   = parameter_data.get("T2M_MAX", {})
    t_min_raw   = parameter_data.get("T2M_MIN", {})
    rh_raw      = parameter_data.get("RH2M", {})
    solar_raw   = parameter_data.get("ALLSKY_SFC_SW_DWN", {})

    daily = []
    for date_str in sorted(rain_raw.keys()):
        daily.append({
            "date": f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}",
            "rainfall_mm":    _clean(rain_raw.get(date_str)),
            "temp_avg_c":     _clean(t_avg_raw.get(date_str)),
            "temp_max_c":     _clean(t_max_raw.get(date_str)),
            "temp_min_c":     _clean(t_min_raw.get(date_str)),
            "humidity_pct":   _clean(rh_raw.get(date_str)),
            "solar_mj_m2":    _clean(solar_raw.get(date_str)),
        })

    # Summary stats (ignore None values)
    def safe_mean(vals):
        v = [x for x in vals if x is not None]
        return round(sum(v) / len(v), 2) if v else None

    rain_vals   = [d["rainfall_mm"] for d in daily]
    t_avg_vals  = [d["temp_avg_c"] for d in daily]
    t_max_vals  = [d["temp_max_c"] for d in daily]
    t_min_vals  = [d["temp_min_c"] for d in daily]
    humid_vals  = [d["humidity_pct"] for d in daily]

    summary = {
        "total_rainfall_mm":    round(sum(v for v in rain_vals if v is not None), 1),
        "avg_temperature_c":    safe_mean(t_avg_vals),
        "avg_temp_c":           safe_mean(t_avg_vals),
        "max_temperature_c":    max((v for v in t_max_vals if v is not None), default=None),
        "max_temp_c":           max((v for v in t_max_vals if v is not None), default=None),
        "min_temperature_c":    min((v for v in t_min_vals if v is not None), default=None),
        "min_temp_c":           min((v for v in t_min_vals if v is not None), default=None),
        "avg_humidity_pct":     safe_mean(humid_vals),
        "days_with_rainfall":   sum(1 for v in rain_vals if v is not None and v > 0.1),
        "period_days":          days,
        "period_start":         start.isoformat(),
        "period_end":           today.isoformat(),
    }

    result = {
        "available": True,
        "location": {"lat": lat, "lng": lng},
        "daily": daily,
        "summary": summary,
        "source": "NASA POWER Daily Point API — NASA Langley Research Center",
        "attribution": "Funded by the NASA Earth Science / Applied Sciences Program.",
        "resolution": "~0.5° × 0.625° grid (~55 km). Regional context, not field-level.",
        "parameters": {
            "PRECTOTCORR": "Precipitation corrected (mm/day)",
            "T2M": "Temperature at 2 m, average (°C)",
            "T2M_MAX": "Temperature at 2 m, maximum (°C)",
            "T2M_MIN": "Temperature at 2 m, minimum (°C)",
            "RH2M": "Relative humidity at 2 m (%)",
            "ALLSKY_SFC_SW_DWN": "Solar radiation (MJ/m²/day)",
        },
        "limitations": (
            "NASA POWER grid resolution is ~55 km — values represent regional conditions, "
            "not your specific field. Local topography, irrigation, and land cover cause "
            "field-level deviations. Use as contextual background, not precise field measurement."
        ),
    }
    _store(cache_key, result)
    return result


def _unavailable(lat: float, lng: float, reason: str) -> dict[str, Any]:
    return {
        "available": False,
        "location": {"lat": lat, "lng": lng},
        "daily": [],
        "summary": {},
        "source": "NASA POWER Daily Point API",
        "limitations": reason,
    }
