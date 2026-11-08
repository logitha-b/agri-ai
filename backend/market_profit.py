"""
Market & Profit Intelligence — backend engine.

Data source:
    src/data/agmarknetMarketPrices.json  (5,975 records, single snapshot 2026-10-13)
    Fields: state, district, market, commodity, variety, grade,
            arrival_date, min_price_rs_per_quintal,
            max_price_rs_per_quintal, modal_price_rs_per_quintal

NO lat/lng in the dataset.  Market coordinates are resolved on demand via
Nominatim geocoding and cached in-memory for the server lifetime.

Distance: straight-line (Haversine), clearly labelled.  No road-routing API.

Transportation cost model (configurable):
    Mini-truck (≤ 2 t)  — ₹12 / km (base) + ₹8 / km / tonne
    Tractor-trolley     — ₹10 / km + ₹6  / km / tonne
    Tempo/three-wheeler — ₹8  / km + ₹5  / km / tonne
    Own vehicle         — ₹6  / km (fuel only estimate)
    Custom rate         — user-supplied ₹ / km

MANDI COMMISSION (APMC regulated):
    Default 2 % of gross sale value (configurable by state, hardcoded estimates here).
    Actual rates vary — clearly disclosed.

All financial values are estimates.  Actual sale price depends on quality,
demand, buyer negotiation, and market-day conditions.
"""

from __future__ import annotations

import json
import math
import re
import statistics
import time
from pathlib import Path
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parents[1]
AGMARKNET_JSON = ROOT / "src" / "data" / "agmarknetMarketPrices.json"

# ── Module-level cache ─────────────────────────────────────────────────────────
_records: list[dict] | None = None
_geo_cache: dict[str, dict] = {}          # "market|district|state" → {lat, lng, ...}
NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
NOMINATIM_UA   = "agri-economic-intelligence/1.0"
GEO_TIMEOUT    = 8.0

# ── Transport vehicle config ───────────────────────────────────────────────────
VEHICLE_TYPES = {
    "Mini-truck (≤ 2 t)":     {"base_per_km": 12, "per_km_per_tonne": 8},
    "Tractor-trolley":         {"base_per_km": 10, "per_km_per_tonne": 6},
    "Tempo / three-wheeler":   {"base_per_km":  8, "per_km_per_tonne": 5},
    "Own vehicle (fuel only)": {"base_per_km":  6, "per_km_per_tonne": 0},
}

# Default APMC commission rates (% of gross) — rough state-level estimates
APMC_COMMISSION_PCT = {
    "default":         2.0,
    "Andhra Pradesh":  1.0,
    "Telangana":       1.0,
    "Tamil Nadu":      1.0,   # Uzhavar Sandhai = 0, APMC ≈ 1 %
    "Karnataka":       1.5,
    "Maharashtra":     2.0,
    "Gujarat":         2.0,
    "Punjab":          2.5,
    "Haryana":         2.5,
    "Uttar Pradesh":   2.5,
    "Madhya Pradesh":  2.0,
}

LOADING_UNLOADING_PER_TONNE = 150   # ₹ — rough estimate


# ── Unit conversion ────────────────────────────────────────────────────────────

def to_kg(quantity: float, unit: str) -> float:
    if unit == "kg":      return quantity
    if unit == "quintal": return quantity * 100
    if unit == "tonne":   return quantity * 1000
    raise ValueError(f"Unknown unit: {unit}")


def to_tonnes(quantity_kg: float) -> float:
    return quantity_kg / 1000


# ── Data loader ────────────────────────────────────────────────────────────────

def _load() -> list[dict]:
    global _records
    if _records is None:
        if not AGMARKNET_JSON.is_file():
            raise FileNotFoundError(f"AGMARKNET JSON not found: {AGMARKNET_JSON}")
        data = json.loads(AGMARKNET_JSON.read_text(encoding="utf-8"))
        _records = data.get("records", [])
    return _records


# ── Haversine distance ─────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2)**2
    return R * 2 * math.asin(math.sqrt(max(0.0, a)))


# ── Geocoding with cache ───────────────────────────────────────────────────────

# ── Precomputed APMC, District & State Geocodes for Zero-Latency Lookup ────────
KNOWN_GEO_COORDS = {
    # Mandi level coordinates
    "Avalurpet APMC": {"lat": 11.9398, "lng": 79.4946, "display_name": "Avalurpet APMC, Villupuram, Tamil Nadu"},
    "Rompicherla APMC": {"lat": 13.6701, "lng": 79.0458, "display_name": "Rompicherla APMC, Chittoor, Andhra Pradesh"},
    "Chirala APMC": {"lat": 15.8309, "lng": 80.3544, "display_name": "Chirala APMC, Bapatla, Andhra Pradesh"},
    "Maddipadu APMC": {"lat": 15.5642, "lng": 80.0067, "display_name": "Maddipadu APMC, Prakasam, Andhra Pradesh"},
    "Kamalapuram APMC": {"lat": 14.5963, "lng": 78.6704, "display_name": "Kamalapuram APMC, YSR Kadapa, Andhra Pradesh"},
    "Mandapeta APMC": {"lat": 16.8687, "lng": 81.9272, "display_name": "Mandapeta APMC, East Godavari, Andhra Pradesh"},
    "Santhamaguluru APMC": {"lat": 16.1190, "lng": 79.9563, "display_name": "Santhamaguluru APMC, Prakasam, Andhra Pradesh"},
    "Srikalahasti APMC": {"lat": 13.7498, "lng": 79.6984, "display_name": "Srikalahasti APMC, Tirupathi, Andhra Pradesh"},
    "Badvel APMC": {"lat": 14.7431, "lng": 79.0586, "display_name": "Badvel APMC, YSR Kadapa, Andhra Pradesh"},
    "Budalur APMC": {"lat": 10.7967, "lng": 78.9890, "display_name": "Budalur APMC, Thanjavur, Tamil Nadu"},
    "Darsi APMC": {"lat": 15.7667, "lng": 79.6833, "display_name": "Darsi APMC, Prakasam, Andhra Pradesh"},
    "Macharla APMC": {"lat": 16.4800, "lng": 79.3000, "display_name": "Macharla APMC, Palnadu, Andhra Pradesh"},
    "Narasaraopet APMC": {"lat": 16.2360, "lng": 80.0540, "display_name": "Narasaraopet APMC, Palnadu, Andhra Pradesh"},
    "Atmakur (Nandyal District) APMC": {"lat": 15.8833, "lng": 78.5833, "display_name": "Atmakur APMC, Nandyal, Andhra Pradesh"},
    "Amalapuram APMC": {"lat": 16.5787, "lng": 82.0061, "display_name": "Amalapuram APMC, Dr.B.R.A.Konaseema, Andhra Pradesh"},
    "Ramachandrapuram APMC": {"lat": 16.8500, "lng": 82.0167, "display_name": "Ramachandrapuram APMC, Dr.B.R.A.Konaseema, Andhra Pradesh"},
    "Nidadavolu APMC": {"lat": 16.9167, "lng": 81.6667, "display_name": "Nidadavolu APMC, East Godavari, Andhra Pradesh"},
    "Kaikaluru APMC": {"lat": 16.5667, "lng": 81.2167, "display_name": "Kaikaluru APMC, Eluru, Andhra Pradesh"},
    "Polavaram APMC": {"lat": 17.2500, "lng": 81.6333, "display_name": "Polavaram APMC, Eluru, Andhra Pradesh"},
    "Jaggampet APMC": {"lat": 17.1667, "lng": 82.0500, "display_name": "Jaggampet APMC, Kakinada, Andhra Pradesh"},
    "Kakinada (Urban) APMC": {"lat": 16.9891, "lng": 82.2475, "display_name": "Kakinada APMC, Kakinada, Andhra Pradesh"},
    "Peddapuram APMC": {"lat": 17.0833, "lng": 82.1333, "display_name": "Peddapuram APMC, Kakinada, Andhra Pradesh"},
    "Pithapuram APMC": {"lat": 17.1167, "lng": 82.2500, "display_name": "Pithapuram APMC, Kakinada, Andhra Pradesh"},
    "Samalkot APMC": {"lat": 17.0500, "lng": 82.1667, "display_name": "Samalkot APMC, Kakinada, Andhra Pradesh"},
    "Narsapuram APMC": {"lat": 16.4333, "lng": 81.7000, "display_name": "Narsapuram APMC, West Godavari, Andhra Pradesh"},
    "Penugonda APMC": {"lat": 16.6500, "lng": 81.7333, "display_name": "Penugonda APMC, West Godavari, Andhra Pradesh"},

    # ── Tamil Nadu (All 36 Districts & spellings in AGMARKNET) ──
    "Ariyalur": {"lat": 11.1401, "lng": 79.0786, "display_name": "Ariyalur, Tamil Nadu"},
    "Chengalpattu": {"lat": 12.6841, "lng": 79.9836, "display_name": "Chengalpattu, Tamil Nadu"},
    "Coimbatore": {"lat": 11.0168, "lng": 76.9558, "display_name": "Coimbatore, Tamil Nadu"},
    "Cuddalore": {"lat": 11.7480, "lng": 79.7714, "display_name": "Cuddalore, Tamil Nadu"},
    "Dharmapuri": {"lat": 12.1211, "lng": 78.1582, "display_name": "Dharmapuri, Tamil Nadu"},
    "Dindigul": {"lat": 10.3673, "lng": 77.9803, "display_name": "Dindigul, Tamil Nadu"},
    "Erode": {"lat": 11.3410, "lng": 77.7172, "display_name": "Erode, Tamil Nadu"},
    "Kallakuruchi": {"lat": 11.7383, "lng": 78.9639, "display_name": "Kallakurichi, Tamil Nadu"},
    "Kallakurichi": {"lat": 11.7383, "lng": 78.9639, "display_name": "Kallakurichi, Tamil Nadu"},
    "Kancheepuram": {"lat": 12.8342, "lng": 79.7036, "display_name": "Kancheepuram, Tamil Nadu"},
    "Kanchipuram": {"lat": 12.8342, "lng": 79.7036, "display_name": "Kanchipuram, Tamil Nadu"},
    "Karur": {"lat": 10.9601, "lng": 78.0766, "display_name": "Karur, Tamil Nadu"},
    "Krishnagiri": {"lat": 12.5186, "lng": 78.2137, "display_name": "Krishnagiri, Tamil Nadu"},
    "Madurai": {"lat": 9.9252, "lng": 78.1198, "display_name": "Madurai, Tamil Nadu"},
    "Nagapattinam": {"lat": 10.7672, "lng": 79.8449, "display_name": "Nagapattinam, Tamil Nadu"},
    "Nagercoil (Kannyiakumari)": {"lat": 8.1833, "lng": 77.4119, "display_name": "Kanyakumari, Tamil Nadu"},
    "Kanyakumari": {"lat": 8.0883, "lng": 77.5385, "display_name": "Kanyakumari, Tamil Nadu"},
    "Namakkal": {"lat": 11.2189, "lng": 78.1674, "display_name": "Namakkal, Tamil Nadu"},
    "Perambalur": {"lat": 11.2342, "lng": 78.8820, "display_name": "Perambalur, Tamil Nadu"},
    "Pudukkottai": {"lat": 10.3797, "lng": 78.8208, "display_name": "Pudukkottai, Tamil Nadu"},
    "Ramanathapuram": {"lat": 9.3639, "lng": 78.8395, "display_name": "Ramanathapuram, Tamil Nadu"},
    "Ranipet": {"lat": 12.9272, "lng": 79.3331, "display_name": "Ranipet, Tamil Nadu"},
    "Salem": {"lat": 11.6643, "lng": 78.1460, "display_name": "Salem, Tamil Nadu"},
    "Sivaganga": {"lat": 9.8433, "lng": 78.4809, "display_name": "Sivaganga, Tamil Nadu"},
    "Tenkasi": {"lat": 8.9594, "lng": 77.3161, "display_name": "Tenkasi, Tamil Nadu"},
    "Thanjavur": {"lat": 10.7870, "lng": 79.1378, "display_name": "Thanjavur, Tamil Nadu"},
    "The Nilgiris": {"lat": 11.4102, "lng": 76.6950, "display_name": "Nilgiris, Tamil Nadu"},
    "Nilgiris": {"lat": 11.4102, "lng": 76.6950, "display_name": "Nilgiris, Tamil Nadu"},
    "Theni": {"lat": 10.0104, "lng": 77.4768, "display_name": "Theni, Tamil Nadu"},
    "Thiruchirappalli": {"lat": 10.7905, "lng": 78.7047, "display_name": "Tiruchirappalli, Tamil Nadu"},
    "Tiruchirappalli": {"lat": 10.7905, "lng": 78.7047, "display_name": "Tiruchirappalli, Tamil Nadu"},
    "Thirunelveli": {"lat": 8.7139, "lng": 77.7567, "display_name": "Tirunelveli, Tamil Nadu"},
    "Tirunelveli": {"lat": 8.7139, "lng": 77.7567, "display_name": "Tirunelveli, Tamil Nadu"},
    "Thirupathur": {"lat": 12.4925, "lng": 78.5678, "display_name": "Tirupattur, Tamil Nadu"},
    "Tirupathur": {"lat": 12.4925, "lng": 78.5678, "display_name": "Tirupattur, Tamil Nadu"},
    "Thirupur": {"lat": 11.1085, "lng": 77.3411, "display_name": "Tiruppur, Tamil Nadu"},
    "Tiruppur": {"lat": 11.1085, "lng": 77.3411, "display_name": "Tiruppur, Tamil Nadu"},
    "Thiruvannamalai": {"lat": 12.2253, "lng": 79.0747, "display_name": "Tiruvannamalai, Tamil Nadu"},
    "Tiruvannamalai": {"lat": 12.2253, "lng": 79.0747, "display_name": "Tiruvannamalai, Tamil Nadu"},
    "Thiruvarur": {"lat": 10.7725, "lng": 79.6365, "display_name": "Thiruvarur, Tamil Nadu"},
    "Thiruvellore": {"lat": 13.1437, "lng": 79.9073, "display_name": "Thiruvallur, Tamil Nadu"},
    "Thiruvallur": {"lat": 13.1437, "lng": 79.9073, "display_name": "Thiruvallur, Tamil Nadu"},
    "Tiruvallur": {"lat": 13.1437, "lng": 79.9073, "display_name": "Tiruvallur, Tamil Nadu"},
    "Tuticorin": {"lat": 8.7642, "lng": 78.1348, "display_name": "Thoothukudi, Tamil Nadu"},
    "Thoothukudi": {"lat": 8.7642, "lng": 78.1348, "display_name": "Thoothukudi, Tamil Nadu"},
    "Vellore": {"lat": 12.9165, "lng": 79.1325, "display_name": "Vellore, Tamil Nadu"},
    "Villupuram": {"lat": 11.9398, "lng": 79.4946, "display_name": "Villupuram, Tamil Nadu"},
    "Virudhunagar": {"lat": 9.5872, "lng": 77.9514, "display_name": "Virudhunagar, Tamil Nadu"},

    # ── Andhra Pradesh (All 24 Districts) ──
    "Alluri Sitharama Raju": {"lat": 18.0667, "lng": 82.5333, "display_name": "Alluri Sitharama Raju, Andhra Pradesh"},
    "Ananthapuramu": {"lat": 14.6819, "lng": 77.6006, "display_name": "Anantapur, Andhra Pradesh"},
    "Anantapur": {"lat": 14.6819, "lng": 77.6006, "display_name": "Anantapur, Andhra Pradesh"},
    "Annamayya": {"lat": 14.0500, "lng": 78.7500, "display_name": "Annamayya, Andhra Pradesh"},
    "Bapatla": {"lat": 15.9053, "lng": 80.4681, "display_name": "Bapatla, Andhra Pradesh"},
    "Chittor": {"lat": 13.2161, "lng": 79.0973, "display_name": "Chittoor, Andhra Pradesh"},
    "Chittoor": {"lat": 13.2161, "lng": 79.0973, "display_name": "Chittoor, Andhra Pradesh"},
    "Dr.B.R.A.Konaseema": {"lat": 16.5787, "lng": 81.9961, "display_name": "Dr.B.R.A.Konaseema, Andhra Pradesh"},
    "Konaseema": {"lat": 16.5787, "lng": 81.9961, "display_name": "Konaseema, Andhra Pradesh"},
    "East Godavari": {"lat": 17.0005, "lng": 81.8040, "display_name": "East Godavari, Andhra Pradesh"},
    "Eluru": {"lat": 16.7107, "lng": 81.0952, "display_name": "Eluru, Andhra Pradesh"},
    "Guntur": {"lat": 16.3067, "lng": 80.4365, "display_name": "Guntur, Andhra Pradesh"},
    "Kakinada": {"lat": 16.9891, "lng": 82.2475, "display_name": "Kakinada, Andhra Pradesh"},
    "Krishna": {"lat": 16.1809, "lng": 81.1303, "display_name": "Krishna, Andhra Pradesh"},
    "Markapuram": {"lat": 15.7333, "lng": 79.2833, "display_name": "Markapuram, Andhra Pradesh"},
    "Nandyal": {"lat": 15.4886, "lng": 78.4836, "display_name": "Nandyal, Andhra Pradesh"},
    "Palnadu": {"lat": 16.2372, "lng": 80.0499, "display_name": "Palnadu, Andhra Pradesh"},
    "Parvathipuram Manyam": {"lat": 18.7833, "lng": 83.4333, "display_name": "Parvathipuram Manyam, Andhra Pradesh"},
    "Polavaram": {"lat": 17.2500, "lng": 81.6333, "display_name": "Polavaram, Andhra Pradesh"},
    "Prakasam": {"lat": 15.5057, "lng": 80.0499, "display_name": "Prakasam, Andhra Pradesh"},
    "Sri Sathya Sai": {"lat": 14.1667, "lng": 77.8167, "display_name": "Sri Sathya Sai, Andhra Pradesh"},
    "Srikakulam": {"lat": 18.2949, "lng": 83.8938, "display_name": "Srikakulam, Andhra Pradesh"},
    "Tirupathi": {"lat": 13.6288, "lng": 79.4192, "display_name": "Tirupati, Andhra Pradesh"},
    "Tirupati": {"lat": 13.6288, "lng": 79.4192, "display_name": "Tirupati, Andhra Pradesh"},
    "Vijayanagaram": {"lat": 18.1167, "lng": 83.4167, "display_name": "Vizianagaram, Andhra Pradesh"},
    "Vizianagaram": {"lat": 18.1167, "lng": 83.4167, "display_name": "Vizianagaram, Andhra Pradesh"},
    "Visakhapatnam": {"lat": 17.6868, "lng": 83.2185, "display_name": "Visakhapatnam, Andhra Pradesh"},
    "West Godavari": {"lat": 16.7107, "lng": 81.0952, "display_name": "West Godavari, Andhra Pradesh"},
    "YSR Kadapa": {"lat": 14.4753, "lng": 78.8217, "display_name": "YSR Kadapa, Andhra Pradesh"},
    "Kadapa": {"lat": 14.4753, "lng": 78.8217, "display_name": "Kadapa, Andhra Pradesh"},

    # ── Kerala / Keralam ──
    "Alappuzha": {"lat": 9.4981, "lng": 76.3388, "display_name": "Alappuzha, Kerala"},
    "Ernakulam": {"lat": 9.9816, "lng": 76.2999, "display_name": "Ernakulam, Kerala"},
    "Idukki": {"lat": 9.9189, "lng": 77.1025, "display_name": "Idukki, Kerala"},
    "Kozhikode(Calicut)": {"lat": 11.2588, "lng": 75.7804, "display_name": "Kozhikode, Kerala"},
    "Kozhikode": {"lat": 11.2588, "lng": 75.7804, "display_name": "Kozhikode, Kerala"},
    "Malappuram": {"lat": 11.0510, "lng": 76.0711, "display_name": "Malappuram, Kerala"},
    "Palakad": {"lat": 10.7867, "lng": 76.6548, "display_name": "Palakkad, Kerala"},
    "Palakkad": {"lat": 10.7867, "lng": 76.6548, "display_name": "Palakkad, Kerala"},
    "Wayanad": {"lat": 11.6854, "lng": 76.1320, "display_name": "Wayanad, Kerala"},

    # ── Telangana ──
    "Adilabad": {"lat": 19.6641, "lng": 78.5320, "display_name": "Adilabad, Telangana"},
    "Karimnagar": {"lat": 18.4386, "lng": 79.1288, "display_name": "Karimnagar, Telangana"},
    "Nalgonda": {"lat": 17.0575, "lng": 79.2684, "display_name": "Nalgonda, Telangana"},
    "Siddipet": {"lat": 18.1018, "lng": 78.8520, "display_name": "Siddipet, Telangana"},

    # ── Karnataka ──
    "Bangalore": {"lat": 12.9716, "lng": 77.5946, "display_name": "Bengaluru, Karnataka"},
    "Mysore": {"lat": 12.2958, "lng": 76.6394, "display_name": "Mysuru, Karnataka"},
    "Kolar": {"lat": 13.1367, "lng": 78.1292, "display_name": "Kolar, Karnataka"},
    "Chikkaballapura": {"lat": 13.4355, "lng": 77.7315, "display_name": "Chikkaballapura, Karnataka"},
    "Tumkur": {"lat": 13.3379, "lng": 77.1017, "display_name": "Tumakuru, Karnataka"},

    # ── Madhya Pradesh ──
    "Bhind": {"lat": 26.5652, "lng": 78.7844, "display_name": "Bhind, Madhya Pradesh"},
    "Chhindwara": {"lat": 22.0574, "lng": 78.9382, "display_name": "Chhindwara, Madhya Pradesh"},
    "Dhar": {"lat": 22.5976, "lng": 75.3023, "display_name": "Dhar, Madhya Pradesh"},
    "Harda": {"lat": 22.3444, "lng": 77.0933, "display_name": "Harda, Madhya Pradesh"},
    "Khandwa": {"lat": 21.8314, "lng": 76.3498, "display_name": "Khandwa, Madhya Pradesh"},
    "Khargone": {"lat": 21.8236, "lng": 75.6189, "display_name": "Khargone, Madhya Pradesh"},
    "Mandsaur": {"lat": 24.0728, "lng": 75.0683, "display_name": "Mandsaur, Madhya Pradesh"},
    "Ratlam": {"lat": 23.3315, "lng": 75.0367, "display_name": "Ratlam, Madhya Pradesh"},
    "Seoni": {"lat": 22.0869, "lng": 79.5435, "display_name": "Seoni, Madhya Pradesh"},
    "Shivpuri": {"lat": 25.4320, "lng": 77.6650, "display_name": "Shivpuri, Madhya Pradesh"},
    "Vidisha": {"lat": 23.5251, "lng": 77.8081, "display_name": "Vidisha, Madhya Pradesh"},

    # ── Punjab ──
    "Amritsar": {"lat": 31.6340, "lng": 74.8723, "display_name": "Amritsar, Punjab"},
    "Hoshiarpur": {"lat": 31.5273, "lng": 75.9149, "display_name": "Hoshiarpur, Punjab"},
    "Jalandhar": {"lat": 31.3260, "lng": 75.5762, "display_name": "Jalandhar, Punjab"},
    "Ludhiana": {"lat": 30.9010, "lng": 75.8573, "display_name": "Ludhiana, Punjab"},
    "Mohali": {"lat": 30.7046, "lng": 76.7179, "display_name": "Mohali, Punjab"},
    "Ropar (Rupnagar)": {"lat": 30.9664, "lng": 76.5331, "display_name": "Rupnagar, Punjab"},
    "Tarntaran": {"lat": 31.4519, "lng": 74.9274, "display_name": "Tarn Taran, Punjab"},

    # ── West Bengal ──
    "Bankura": {"lat": 23.2324, "lng": 87.0715, "display_name": "Bankura, West Bengal"},
    "Darjeeling": {"lat": 27.0410, "lng": 88.2663, "display_name": "Darjeeling, West Bengal"},
    "Medinipur(E)": {"lat": 22.4257, "lng": 87.3199, "display_name": "Medinipur, West Bengal"},
    "Murshidabad": {"lat": 24.1759, "lng": 88.2802, "display_name": "Murshidabad, West Bengal"},
    "Paschim Bardhaman": {"lat": 23.6889, "lng": 86.9661, "display_name": "Paschim Bardhaman, West Bengal"},
    "Uttar Dinajpur": {"lat": 25.6154, "lng": 88.1252, "display_name": "Uttar Dinajpur, West Bengal"},

    # ── Bihar ──
    "Banka": {"lat": 24.8876, "lng": 86.9221, "display_name": "Banka, Bihar"},
    "Begusarai": {"lat": 25.4182, "lng": 86.1272, "display_name": "Begusarai, Bihar"},
    "East Champaran/ Motihari": {"lat": 26.6469, "lng": 84.9089, "display_name": "East Champaran, Bihar"},
    "Gopalgang": {"lat": 26.4673, "lng": 84.4449, "display_name": "Gopalganj, Bihar"},
    "Madhubani": {"lat": 26.3541, "lng": 86.0717, "display_name": "Madhubani, Bihar"},
    "Siwan": {"lat": 26.2196, "lng": 84.3567, "display_name": "Siwan, Bihar"},

    # ── Odisha ──
    "Angul": {"lat": 20.8398, "lng": 85.1012, "display_name": "Angul, Odisha"},
    "Bargarh": {"lat": 21.3333, "lng": 83.6167, "display_name": "Bargarh, Odisha"},
    "Dhenkanal": {"lat": 20.6672, "lng": 85.5969, "display_name": "Dhenkanal, Odisha"},
    "Kalahandi": {"lat": 19.9075, "lng": 83.1643, "display_name": "Kalahandi, Odisha"},

    # ── Others ──
    "Kanker": {"lat": 20.2719, "lng": 81.4931, "display_name": "Kanker, Chhattisgarh"},
    "Amreli": {"lat": 21.6032, "lng": 71.2221, "display_name": "Amreli, Gujarat"},
    "Kurukshetra": {"lat": 29.9695, "lng": 76.8783, "display_name": "Kurukshetra, Haryana"},
    "Rewari": {"lat": 28.1920, "lng": 76.6186, "display_name": "Rewari, Haryana"},
    "Baramulla": {"lat": 34.2095, "lng": 74.3436, "display_name": "Baramulla, Jammu & Kashmir"},
    "Buldhana": {"lat": 20.5292, "lng": 76.1843, "display_name": "Buldhana, Maharashtra"},
    "Ratnagiri": {"lat": 16.9902, "lng": 73.3120, "display_name": "Ratnagiri, Maharashtra"},
    "Wokha": {"lat": 26.1025, "lng": 94.2635, "display_name": "Wokha, Nagaland"},
    "South Tripura": {"lat": 23.1625, "lng": 91.4578, "display_name": "South Tripura, Tripura"},
    "Badaun": {"lat": 28.0340, "lng": 79.1245, "display_name": "Badaun, Uttar Pradesh"},
    "Bulandshahar": {"lat": 28.4069, "lng": 77.8498, "display_name": "Bulandshahr, Uttar Pradesh"},
    "Dehradoon": {"lat": 30.3165, "lng": 78.0322, "display_name": "Dehradun, Uttarakhand"},
}

STATE_CENTROIDS = {
    "Tamil Nadu": {"lat": 11.1271, "lng": 78.6569, "display_name": "Tamil Nadu, India"},
    "Andhra Pradesh": {"lat": 15.9129, "lng": 79.7400, "display_name": "Andhra Pradesh, India"},
    "Karnataka": {"lat": 15.3173, "lng": 75.7139, "display_name": "Karnataka, India"},
    "Kerala": {"lat": 10.8505, "lng": 76.2711, "display_name": "Kerala, India"},
    "Keralam": {"lat": 10.8505, "lng": 76.2711, "display_name": "Kerala, India"},
    "Telangana": {"lat": 18.1124, "lng": 79.0193, "display_name": "Telangana, India"},
    "Maharashtra": {"lat": 19.7515, "lng": 75.7139, "display_name": "Maharashtra, India"},
    "Madhya Pradesh": {"lat": 22.9734, "lng": 78.6569, "display_name": "Madhya Pradesh, India"},
    "Gujarat": {"lat": 22.2587, "lng": 71.1924, "display_name": "Gujarat, India"},
    "Punjab": {"lat": 31.1471, "lng": 75.3412, "display_name": "Punjab, India"},
    "Haryana": {"lat": 29.0588, "lng": 76.0856, "display_name": "Haryana, India"},
    "Uttar Pradesh": {"lat": 26.8467, "lng": 80.9462, "display_name": "Uttar Pradesh, India"},
    "Bihar": {"lat": 25.0961, "lng": 85.3131, "display_name": "Bihar, India"},
    "West Bengal": {"lat": 22.9868, "lng": 87.8550, "display_name": "West Bengal, India"},
    "Odisha": {"lat": 20.9517, "lng": 85.0985, "display_name": "Odisha, India"},
    "Chattisgarh": {"lat": 21.2787, "lng": 81.8661, "display_name": "Chhattisgarh, India"},
    "Uttarakhand": {"lat": 30.0668, "lng": 79.0193, "display_name": "Uttarakhand, India"},
    "Jammu and Kashmir": {"lat": 33.7782, "lng": 76.5762, "display_name": "Jammu and Kashmir, India"},
    "Nagaland": {"lat": 26.1584, "lng": 94.5624, "display_name": "Nagaland, India"},
    "Tripura": {"lat": 23.9408, "lng": 91.9882, "display_name": "Tripura, India"},
}

async def _geocode_market(market: str, district: str, state: str) -> dict | None:
    """
    Geocode a market instantly using precomputed coordinates for APMC mandis,
    districts, or states. Returns {lat, lng, display_name, approximate: bool}.
    Zero network latency and zero external dependency.
    """
    m_clean = (market or "").strip()
    d_clean = (district or "").strip()
    s_clean = (state or "").strip()

    cache_key = f"{m_clean}|{d_clean}|{s_clean}"
    if cache_key in _geo_cache:
        return _geo_cache[cache_key]

    # 1. Exact match on market specific coords
    if m_clean in KNOWN_GEO_COORDS:
        res = dict(KNOWN_GEO_COORDS[m_clean])
        res["approximate"] = False
        res["source"] = "APMC Mandi Coordinates"
        _geo_cache[cache_key] = res
        return res

    # 2. Match on district name
    if d_clean in KNOWN_GEO_COORDS:
        res = dict(KNOWN_GEO_COORDS[d_clean])
        res["approximate"] = True
        res["source"] = "District Centroid"
        _geo_cache[cache_key] = res
        return res

    # Case-insensitive district match
    d_lower = d_clean.lower()
    for k, v in KNOWN_GEO_COORDS.items():
        if k.lower() == d_lower:
            res = dict(v)
            res["approximate"] = True
            res["source"] = "District Centroid"
            _geo_cache[cache_key] = res
            return res

    # 3. Match on state centroid
    if s_clean in STATE_CENTROIDS:
        res = dict(STATE_CENTROIDS[s_clean])
        res["approximate"] = True
        res["source"] = "State Centroid"
        _geo_cache[cache_key] = res
        return res

    # 4. Ultra-fast fallback attempt (1.5s timeout only, never hang)
    query = f"{m_clean}, {d_clean}, {s_clean}, India"
    try:
        async with httpx.AsyncClient(timeout=1.5) as c:
            r = await c.get(
                f"{NOMINATIM_BASE}/search",
                params={"q": query, "format": "jsonv2", "limit": 1, "countrycodes": "in", "addressdetails": 0},
                headers={"User-Agent": NOMINATIM_UA, "Accept-Language": "en"},
            )
            if r.status_code == 200:
                hits = r.json()
                if hits:
                    hit = hits[0]
                    res = {
                        "lat": float(hit["lat"]),
                        "lng": float(hit["lon"]),
                        "display_name": hit.get("display_name", ""),
                        "approximate": False,
                        "source": "OpenStreetMap Nominatim",
                    }
                    _geo_cache[cache_key] = res
                    return res
    except Exception:
        pass

    # Default to South India agricultural center if state unknown
    res = {"lat": 13.0827, "lng": 80.2707, "display_name": f"{m_clean}, {s_clean}", "approximate": True, "source": "Regional Fallback"}
    _geo_cache[cache_key] = res
    return res


# ── Transport cost ─────────────────────────────────────────────────────────────

def _transport_cost(
    distance_km: float,
    quantity_kg: float,
    vehicle_type: str,
    custom_rate_per_km: float | None = None,
) -> dict[str, Any]:
    """
    Estimate one-way transport cost.
    Returns {cost_inr, rate_basis, vehicle_type, notes}.
    """
    qty_tonnes = to_tonnes(quantity_kg)

    if custom_rate_per_km is not None:
        cost = distance_km * custom_rate_per_km
        basis = f"User-supplied rate ₹{custom_rate_per_km}/km"
    elif vehicle_type in VEHICLE_TYPES:
        cfg = VEHICLE_TYPES[vehicle_type]
        cost = distance_km * (cfg["base_per_km"] + cfg["per_km_per_tonne"] * qty_tonnes)
        basis = f"₹{cfg['base_per_km']}/km base + ₹{cfg['per_km_per_tonne']}/km/tonne"
    else:
        vehicle_type = "Mini-truck (≤ 2 t)"
        cfg = VEHICLE_TYPES[vehicle_type]
        cost = distance_km * (cfg["base_per_km"] + cfg["per_km_per_tonne"] * qty_tonnes)
        basis = f"Default: {cfg['base_per_km']}/km base + {cfg['per_km_per_tonne']}/km/tonne"

    return {
        "cost_inr":    round(cost, 0),
        "vehicle":     vehicle_type,
        "rate_basis":  basis,
        "distance_km": round(distance_km, 2),
        "data_kind":   "estimated",
        "note": (
            "One-way transport estimate. Actual cost depends on vehicle availability, "
            "road conditions, loading/unloading, and negotiated rate."
        ),
    }


# ── Profit calculation ─────────────────────────────────────────────────────────

def _profit(
    quantity_kg: float,
    modal_price_rs_per_quintal: float | None,
    min_price_rs_per_quintal:   float | None,
    max_price_rs_per_quintal:   float | None,
    transport_cost_inr: float,
    state: str,
    cultivation_cost_inr: float | None,
    loading_cost_inr: float | None,
    packaging_cost_inr: float | None,
    other_costs_inr: float | None,
) -> dict[str, Any]:
    """
    Calculate gross revenue, cost breakdown, net proceeds, and optional net profit.
    All values are estimates; clearly labelled.
    """
    qty_quintals = quantity_kg / 100

    commission_pct = APMC_COMMISSION_PCT.get(state, APMC_COMMISSION_PCT["default"])

    def _scenario(price_per_quintal: float | None, label: str) -> dict | None:
        if price_per_quintal is None:
            return None
        gross = round(qty_quintals * price_per_quintal, 0)
        commission = round(gross * commission_pct / 100, 0)
        loading = round(loading_cost_inr or (LOADING_UNLOADING_PER_TONNE * to_tonnes(quantity_kg)), 0)
        packaging = round(packaging_cost_inr or 0, 0)
        other = round(other_costs_inr or 0, 0)
        total_selling_costs = transport_cost_inr + commission + loading + packaging + other
        net_proceeds = round(gross - total_selling_costs, 0)
        net_profit = round(net_proceeds - cultivation_cost_inr, 0) if cultivation_cost_inr is not None else None
        return {
            "label":                    label,
            "price_per_quintal":        price_per_quintal,
            "quantity_quintals":        round(qty_quintals, 2),
            "gross_revenue_inr":        gross,
            "transport_cost_inr":       round(transport_cost_inr, 0),
            "commission_inr":           commission,
            "commission_pct":           commission_pct,
            "loading_unloading_inr":    loading,
            "packaging_cost_inr":       packaging,
            "other_costs_inr":          other,
            "total_selling_costs_inr":  round(total_selling_costs, 0),
            "net_proceeds_inr":         net_proceeds,
            "cultivation_cost_inr":     cultivation_cost_inr,
            "net_profit_inr":           net_profit,
            "data_kind":                "estimated",
        }

    modal = _scenario(modal_price_rs_per_quintal, "modal")
    low   = _scenario(min_price_rs_per_quintal,   "minimum")
    high  = _scenario(max_price_rs_per_quintal,   "maximum")

    return {
        "quantity_kg":      quantity_kg,
        "quantity_quintals": round(qty_quintals, 2),
        "modal":            modal,
        "low":              low,
        "high":             high,
        "commission_rate":  f"{commission_pct}% (APMC regulated, {state} estimate)",
        "price_unit":       "₹ per quintal (100 kg)",
        "disclaimer": (
            "All values are estimates. Actual sale price depends on produce quality, "
            "market demand, buyer negotiation, and conditions on the day of sale. "
            "Commission and transport rates are estimates — verify locally."
        ),
    }


# ── Main: find markets and compute profit ──────────────────────────────────────

async def find_markets_and_profit(
    commodity: str,
    quantity_kg: float,
    farmer_lat: float | None,
    farmer_lng: float | None,
    farmer_state: str | None,
    farmer_district: str | None,
    variety: str | None,
    grade: str | None,
    vehicle_type: str,
    custom_rate_per_km: float | None,
    cultivation_cost_inr: float | None,
    loading_cost_inr: float | None,
    packaging_cost_inr: float | None,
    other_costs_inr: float | None,
    min_acceptable_price: float | None,
    max_distance_km: float,
    sort_by: str,         # "net_proceeds" | "distance" | "modal_price"
) -> dict[str, Any]:
    records = _load()

    # ── 1. Filter by commodity ────────────────────────────────────────────────
    commodity_lower = commodity.lower()
    commodity_records = [
        r for r in records
        if r["commodity"].lower() == commodity_lower
    ]
    if not commodity_records:
        # Partial match fallback
        commodity_records = [
            r for r in records
            if commodity_lower in r["commodity"].lower()
        ]

    if not commodity_records:
        return {
            "available": False,
            "reason":    f"No price records found for '{commodity}' in AGMARKNET dataset.",
            "commodity": commodity,
            "total_records_searched": len(records),
            "all_commodities_hint":   sorted({r["commodity"] for r in records})[:20],
        }

    # ── 2. Filter by variety/grade if specified ───────────────────────────────
    if variety:
        vf = [r for r in commodity_records if r.get("variety","").lower() == variety.lower()]
        if vf:
            commodity_records = vf
    if grade:
        gf = [r for r in commodity_records if r.get("grade","").lower() == grade.lower()]
        if gf:
            commodity_records = gf

    # ── 3. Group by (state, district, market) → aggregate prices ─────────────
    market_map: dict[str, dict] = {}
    for r in commodity_records:
        key = f"{r['state']}|{r['district']}|{r['market']}"
        if key not in market_map:
            market_map[key] = {
                "state":        r["state"],
                "district":     r["district"],
                "market":       r["market"],
                "commodity":    r["commodity"],
                "varieties":    set(),
                "grades":       set(),
                "arrival_dates": set(),
                "min_prices":   [],
                "max_prices":   [],
                "modal_prices": [],
            }
        m = market_map[key]
        m["varieties"].add(r.get("variety",""))
        m["grades"].add(r.get("grade",""))
        if r.get("arrival_date"):
            m["arrival_dates"].add(r["arrival_date"])
        if r.get("min_price_rs_per_quintal") is not None:
            m["min_prices"].append(r["min_price_rs_per_quintal"])
        if r.get("max_price_rs_per_quintal") is not None:
            m["max_prices"].append(r["max_price_rs_per_quintal"])
        if r.get("modal_price_rs_per_quintal") is not None:
            m["modal_prices"].append(r["modal_price_rs_per_quintal"])

    # ── 4. Convert sets to sorted lists; compute aggregate prices ─────────────
    for m in market_map.values():
        m["varieties"]    = sorted(v for v in m["varieties"] if v)
        m["grades"]       = sorted(g for g in m["grades"]    if g)
        m["arrival_dates"]= sorted(m["arrival_dates"])
        m["latest_date"]  = m["arrival_dates"][-1] if m["arrival_dates"] else None
        m["min_price_rs_per_quintal"]   = round(min(m["min_prices"]),   0) if m["min_prices"]   else None
        m["max_price_rs_per_quintal"]   = round(max(m["max_prices"]),   0) if m["max_prices"]   else None
        m["modal_price_rs_per_quintal"] = round(statistics.median(m["modal_prices"]), 0) if m["modal_prices"] else None
        del m["min_prices"], m["max_prices"], m["modal_prices"]

    # ── 5. Geocode each market (async, with cache) ────────────────────────────
    import asyncio
    markets = list(market_map.values())

    async def _geo(m: dict) -> None:
        geo = await _geocode_market(m["market"], m["district"], m["state"])
        m["geo"] = geo

    await asyncio.gather(*[_geo(m) for m in markets])

    # ── 6. Compute distance and filter by max_distance_km ────────────────────
    for m in markets:
        geo = m.get("geo")
        if geo and farmer_lat is not None and farmer_lng is not None:
            dist = _haversine_km(farmer_lat, farmer_lng, geo["lat"], geo["lng"])
            m["distance_km"]   = round(dist, 2)
            m["distance_type"] = "straight-line (Haversine)"
            m["map_url"] = (
                f"https://www.google.com/maps/dir/?api=1"
                f"&origin={farmer_lat:.6f}%2C{farmer_lng:.6f}"
                f"&destination={geo['lat']:.6f}%2C{geo['lng']:.6f}"
            )
            m["geo_approximate"] = geo.get("approximate", False)
        elif farmer_state and m["state"].lower() == (farmer_state or "").lower():
            # Same state — rough estimate
            m["distance_km"]   = None
            m["distance_type"] = "unknown (no coordinates)"
            m["map_url"] = (
                "https://www.google.com/maps/search/?api=1"
                f"&query={m['market'].replace(' ','+')}+{m['district'].replace(' ','+')}+{m['state'].replace(' ','+')}+India"
            )
            m["geo_approximate"] = True
        else:
            m["distance_km"]   = None
            m["distance_type"] = "unknown"
            m["map_url"] = (
                "https://www.google.com/maps/search/?api=1"
                f"&query={m['market'].replace(' ','+')}+{m['district'].replace(' ','+')}+{m['state'].replace(' ','+')}+India"
            )
            m["geo_approximate"] = True

    # Filter by max distance
    if farmer_lat is not None:
        markets = [
            m for m in markets
            if m["distance_km"] is None or m["distance_km"] <= max_distance_km
        ]

    # Filter by minimum acceptable price
    if min_acceptable_price is not None:
        markets = [
            m for m in markets
            if m.get("modal_price_rs_per_quintal") is None
            or m["modal_price_rs_per_quintal"] >= min_acceptable_price
        ]

    # ── 7. Compute transport cost and profit for each market ──────────────────
    for m in markets:
        dist = m.get("distance_km") or 0
        tc = _transport_cost(dist, quantity_kg, vehicle_type, custom_rate_per_km)
        m["transport"] = tc
        m["profit"] = _profit(
            quantity_kg=quantity_kg,
            modal_price_rs_per_quintal=m.get("modal_price_rs_per_quintal"),
            min_price_rs_per_quintal=  m.get("min_price_rs_per_quintal"),
            max_price_rs_per_quintal=  m.get("max_price_rs_per_quintal"),
            transport_cost_inr=tc["cost_inr"],
            state=m["state"],
            cultivation_cost_inr=cultivation_cost_inr,
            loading_cost_inr=loading_cost_inr,
            packaging_cost_inr=packaging_cost_inr,
            other_costs_inr=other_costs_inr,
        )
        # Remove internal geo dict from response (keep lat/lng in map_url)
        m.pop("geo", None)

    # ── 8. Sort ───────────────────────────────────────────────────────────────
    def _sort_key(m: dict):
        p = m.get("profit", {})
        modal = p.get("modal") or {}
        has_dist = m.get("distance_km") is not None
        if sort_by == "net_proceeds":
            return (0 if has_dist else 1, -(modal.get("net_proceeds_inr") or 0))
        elif sort_by == "distance":
            return (0 if has_dist else 1, (m.get("distance_km") or 9999))
        elif sort_by == "modal_price":
            return (0 if has_dist else 1, -(m.get("modal_price_rs_per_quintal") or 0))
        else:  # best_balance: net_proceeds adjusted for distance
            net = modal.get("net_proceeds_inr") or 0
            dist_penalty = (m.get("distance_km") or 500) * 50
            return (0 if has_dist else 1, -(net - dist_penalty))

    markets.sort(key=_sort_key)

    # ── 9. Build recommendation ────────────────────────────────────────────────
    recommendation = _build_recommendation(markets, quantity_kg, sort_by)

    return {
        "available":          True,
        "commodity":          commodity,
        "quantity_kg":        quantity_kg,
        "quantity_quintals":  round(quantity_kg / 100, 2),
        "markets":            markets,
        "total_markets_found": len(markets),
        "sort_by":            sort_by,
        "recommendation":     recommendation,
        "source":             "AGMARKNET Market-wise Price & Arrival Report",
        "source_date":        "2026-10-13",
        "data_kind":          "historical_snapshot",
        "distance_note":      "All distances are straight-line (Haversine). Road distance and travel time are not available.",
        "price_note":         "Prices are from the AGMARKNET snapshot dated 2026-10-13. They are historical observations, not guaranteed sale prices.",
        "disclaimer": (
            "This comparison is for planning purposes only. Actual market prices vary daily. "
            "Verify current prices at your local mandi before travelling."
        ),
    }


def _build_recommendation(markets: list[dict], quantity_kg: float, sort_by: str) -> dict[str, Any]:
    if not markets:
        return {
            "available": False,
            "message": "No markets found matching your criteria.",
        }

    best_net = max(
        (m for m in markets if m.get("profit", {}).get("modal")),
        key=lambda m: m["profit"]["modal"]["net_proceeds_inr"],
        default=None,
    )
    nearest = min(
        (m for m in markets if m.get("distance_km") is not None),
        key=lambda m: m["distance_km"],
        default=None,
    )
    best_price = max(
        (m for m in markets if m.get("modal_price_rs_per_quintal") is not None),
        key=lambda m: m["modal_price_rs_per_quintal"],
        default=None,
    )

    def _mkt_label(m: dict | None) -> str:
        if not m:
            return "Unavailable"
        return f"{m['market']}, {m['district']} ({m['state']})"

    def _net(m: dict | None) -> str:
        if not m:
            return "—"
        net = m.get("profit", {}).get("modal", {}).get("net_proceeds_inr")
        return f"₹{int(net):,}" if net is not None else "—"

    summary_parts = []
    if best_net:
        net = best_net["profit"]["modal"]["net_proceeds_inr"]
        summary_parts.append(
            f"Highest estimated net proceeds: {_mkt_label(best_net)} — {_net(best_net)} "
            f"for {round(quantity_kg/100, 2)} quintals at ₹{best_net.get('modal_price_rs_per_quintal', '?')}/qtl "
            f"after ₹{int(best_net['transport']['cost_inr']):,} transport."
        )
    if nearest:
        summary_parts.append(
            f"Nearest market: {_mkt_label(nearest)} at {nearest['distance_km']} km (straight-line), "
            f"estimated net proceeds {_net(nearest)}."
        )
    if best_price and best_price is not best_net:
        summary_parts.append(
            f"Highest reported price: {_mkt_label(best_price)} at "
            f"₹{best_price.get('modal_price_rs_per_quintal','?')}/qtl — "
            f"but transport adds ₹{int(best_price['transport']['cost_inr']):,}, "
            f"resulting in estimated net {_net(best_price)}."
        )

    return {
        "available":            True,
        "best_net_proceeds":    _mkt_label(best_net),
        "nearest_market":       _mkt_label(nearest),
        "highest_price_market": _mkt_label(best_price),
        "summary":              " ".join(summary_parts),
        "key_uncertainty": (
            "Prices are from a single snapshot date. Market prices fluctuate daily. "
            "Distance is straight-line — actual road distance and travel time may be higher. "
            "Commission and handling rates are estimates."
        ),
    }
