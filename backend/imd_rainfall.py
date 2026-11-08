"""
IMD district-wise daily rainfall loader and query helpers.

Source: India Meteorological Department — National Water Data Portal
File:   ml/data/water/rainfall_districtwise_daily_imd.csv  (85,837 rows)

Columns verified from actual file:
    State, District, Date,
    Daily Actual, Daily Normal, Daily Departure Per, Daily Category,
    Week Date, Weekly Actual, Weekly Normal, Weekly Departure Per, Weekly Category,
    Cumulative Date, Cumulative Actual, Cumulative Normal, Cumulative Departue Per, Cumulative Category,
    Monthly Date, Monthly Acutual, Monthly Normal, Monthly Departure Per, Monthly Category

Units: rainfall values are in mm.
Date format: YYYY-MM-DD (e.g. 2026-08-19).

Caching: entire CSV is loaded once into memory on first access and indexed by
(state_normalised, district_normalised) → list[row] for fast lookups.
"""

from __future__ import annotations

import csv
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RAINFALL_FILE = ROOT / "ml" / "data" / "water" / "rainfall_districtwise_daily_imd.csv"

# ── Module-level cache ─────────────────────────────────────────────────────────
_rows: list[dict] | None = None
_index: dict[tuple[str, str], list[dict]] | None = None   # (state_key, district_key) → rows
_state_index: dict[str, list[dict]] | None = None          # state_key → rows
_available_dates: list[str] | None = None


def _normalise(s: str) -> str:
    """Lower-case, strip, collapse whitespace for fuzzy key matching."""
    return re.sub(r"\s+", " ", s.strip().lower())


def _shared_prefix_len(a: str, b: str) -> int:
    """Count shared leading characters between two strings."""
    n = min(len(a), len(b))
    for i in range(n):
        if a[i] != b[i]:
            return i
    return n


def _fuzzy_match_district(sk: str, dk: str) -> list[dict]:
    """
    Multi-strategy fuzzy match for (state, district) pairs.
    Handles case differences, spacing, condensed forms,
    and common Tamil Nadu spelling variants (Thiru/Tiru prefix).
    """
    if _index is None:
        return []

    # Strategy 1 — exact normalised key
    exact = _index.get((sk, dk))
    if exact:
        return exact

    # Strategy 2 — state-only when no district provided
    if not dk:
        state_only = _index.get((sk, ""))
        if state_only:
            return state_only

    # Strategy 3 — generate spelling variants for the district
    # Tamil Nadu: "Thiruvallur" ↔ "Tiruvallur", "Thiruvarur" ↔ "Thiruvarur"
    dk_variants = {dk}
    if dk.startswith("thiru"):
        dk_variants.add("tiru" + dk[5:])
    elif dk.startswith("tiru"):
        dk_variants.add("thiru" + dk[4:])
    # Also try without leading "district" word
    dk_stripped = dk.replace("district", "").strip()
    if dk_stripped:
        dk_variants.add(dk_stripped)

    for variant in dk_variants:
        hit = _index.get((sk, variant))
        if hit:
            return hit

    sk_condensed = sk.replace(" ", "")
    dk_tokens = set(dk.split()) if dk else set()
    # Also build variant tokens
    all_dk_tokens = dk_tokens.copy()
    for v in dk_variants:
        all_dk_tokens.update(v.split())

    best: list[dict] = []
    best_score = 0

    for (s, d), v in _index.items():
        # State matching: exact, token overlap, or condensed form
        s_condensed = s.replace(" ", "")
        state_ok = (
            s == sk
            or bool(set(sk.split()) & set(s.split()))
            or sk_condensed == s_condensed
        )
        if not state_ok:
            continue

        # District score — use all variants
        if not dk:
            score = 0.5  # state match only
        else:
            d_tokens = set(d.split())
            token_overlap = len(all_dk_tokens & d_tokens)
            # Substring check with variants
            substring = max(
                1 if (var in d or d in var) else 0
                for var in dk_variants
            )
            # Longer shared prefix = closer match for single-word districts
            shared_prefix = max(
                _shared_prefix_len(var, d)
                for var in dk_variants
            )
            score = token_overlap + substring * 0.5 + shared_prefix * 0.05

        if score > best_score:
            best_score = score
            best = v

    return best if best_score > 0 else []


def _safe_float(val: str) -> float | None:
    try:
        v = float(str(val).replace(",", "").strip())
        return v if v >= 0 else None
    except (ValueError, TypeError):
        return None


def _load() -> None:
    global _rows, _index, _state_index, _available_dates
    if _rows is not None:
        return

    if not RAINFALL_FILE.is_file():
        _rows = []
        _index = {}
        _state_index = {}
        _available_dates = []
        return

    rows: list[dict] = []
    with open(RAINFALL_FILE, encoding="utf-8", errors="replace", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            # Clean column names (some have embedded newlines from the source)
            cleaned = {re.sub(r"\s+", " ", k).strip(): v for k, v in row.items()}
            state = cleaned.get("State", "").strip()
            district = cleaned.get("District", "").strip()
            date = cleaned.get("Date", "").strip()
            if not state or not date:
                continue
            rows.append({
                "state":                  state,
                "district":               district,
                "date":                   date,
                "daily_actual_mm":        _safe_float(cleaned.get("Daily Actual")),
                "daily_normal_mm":        _safe_float(cleaned.get("Daily Normal")),
                "daily_departure_pct":    cleaned.get("Daily Departure Per", "").strip() or None,
                "daily_category":         cleaned.get("Daily Category", "").strip() or None,
                "weekly_actual_mm":       _safe_float(cleaned.get("Weekly Actual")),
                "weekly_normal_mm":       _safe_float(cleaned.get("Weekly Normal")),
                "weekly_departure_pct":   cleaned.get("Weekly Departure Per", "").strip() or None,
                "weekly_category":        cleaned.get("Weekly Category", "").strip() or None,
                "cumulative_actual_mm":   _safe_float(cleaned.get("Cumulative Actual")),
                "cumulative_normal_mm":   _safe_float(cleaned.get("Cumulative Normal")),
                "monthly_actual_mm":      _safe_float(cleaned.get("Monthly Acutual")),  # typo in source
                "monthly_normal_mm":      _safe_float(cleaned.get("Monthly Normal")),
                "source":                 "IMD District-wise Daily Rainfall — National Water Data Portal",
            })

    _rows = rows
    _index = {}
    _state_index = {}
    dates: set[str] = set()
    for r in rows:
        sk = _normalise(r["state"])
        dk = _normalise(r["district"]) if r["district"] else ""
        _index.setdefault((sk, dk), []).append(r)
        _state_index.setdefault(sk, []).append(r)
        if r["date"]:
            dates.add(r["date"])
    _available_dates = sorted(dates)


# ── Public helpers ─────────────────────────────────────────────────────────────

def dataset_info() -> dict[str, Any]:
    _load()
    states = sorted({r["state"] for r in _rows})
    dates = _available_dates or []
    return {
        "total_rows":    len(_rows),
        "total_states":  len(states),
        "date_min":      dates[0] if dates else None,
        "date_max":      dates[-1] if dates else None,
        "source":        "India Meteorological Department — National Water Data Portal",
        "units":         "mm",
        "available":     bool(_rows),
    }


def get_district_rainfall(
    state: str,
    district: str,
    latest_n_days: int = 30,
) -> dict[str, Any]:
    """
    Return the most recent `latest_n_days` rows for a state+district.
    Uses fuzzy normalised matching so 'TAMIL NADU' == 'Tamil Nadu'.
    """
    _load()
    sk = _normalise(state)
    dk = _normalise(district)

    rows = _fuzzy_match_district(sk, dk)

    if not rows:
        return _unavailable(state, district, "No IMD rainfall records found for this state/district combination.")

    rows_sorted = sorted(rows, key=lambda r: r["date"], reverse=True)
    latest = rows_sorted[:latest_n_days]
    latest_asc = list(reversed(latest))

    # Accumulated rainfall over last 1/3/7 days from most recent date
    daily_vals = [r["daily_actual_mm"] for r in latest_asc if r["daily_actual_mm"] is not None]
    acc_1  = daily_vals[-1] if daily_vals else None
    acc_3  = sum(daily_vals[-3:]) if len(daily_vals) >= 3 else None
    acc_7  = sum(daily_vals[-7:]) if len(daily_vals) >= 7 else None

    latest_row = rows_sorted[0]
    return {
        "available":       True,
        "state":           latest_row["state"],
        "district":        latest_row["district"],
        "latest_date":     latest_row["date"],
        "daily_actual_mm":    latest_row["daily_actual_mm"],
        "daily_normal_mm":    latest_row["daily_normal_mm"],
        "daily_departure_pct": latest_row["daily_departure_pct"],
        "daily_category":     latest_row["daily_category"],
        "weekly_actual_mm":   latest_row["weekly_actual_mm"],
        "weekly_normal_mm":   latest_row["weekly_normal_mm"],
        "weekly_departure_pct": latest_row["weekly_departure_pct"],
        "weekly_category":    latest_row["weekly_category"],
        "cumulative_actual_mm": latest_row["cumulative_actual_mm"],
        "monthly_actual_mm":  latest_row["monthly_actual_mm"],
        "accumulated": {
            "last_1_day_mm":  round(acc_1,  1) if acc_1  is not None else None,
            "last_3_days_mm": round(acc_3, 1) if acc_3 is not None else None,
            "last_7_days_mm": round(acc_7, 1) if acc_7 is not None else None,
        },
        "series": latest_asc,   # chronological, up to latest_n_days rows
        "source":   "India Meteorological Department — National Water Data Portal",
        "units":    "mm",
        "note": (
            "Values represent IMD gridded/district-level estimates. "
            "Daily values are for the date shown; weekly and cumulative values "
            "are as published in the dataset for that date. "
            "These are not field-level measurements."
        ),
    }


def get_state_rainfall_latest(state: str) -> dict[str, Any]:
    """Return the most recent row for each district in a state."""
    _load()
    sk = _normalise(state)
    state_rows = _state_index.get(sk, [])
    if not state_rows:
        return {"available": False, "state": state, "districts": []}

    # Latest row per district
    by_district: dict[str, dict] = {}
    for r in state_rows:
        dk = r["district"]
        if dk not in by_district or r["date"] > by_district[dk]["date"]:
            by_district[dk] = r

    districts = sorted(by_district.values(), key=lambda r: r["district"])
    return {
        "available": True,
        "state": state,
        "latest_date": max(r["date"] for r in districts),
        "districts": districts,
        "source": "India Meteorological Department — National Water Data Portal",
    }


def list_available_states() -> list[str]:
    _load()
    return sorted({r["state"] for r in _rows})


def _unavailable(state: str, district: str, reason: str) -> dict[str, Any]:
    return {
        "available":  False,
        "state":      state,
        "district":   district,
        "reason":     reason,
        "source":     "India Meteorological Department — National Water Data Portal",
    }
