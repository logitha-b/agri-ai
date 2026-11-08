"""Generate reproducible profile/scheme pairs with documented synthetic labels."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from ml.feature_engineering import FEATURE_COLUMNS, build_feature_row, label_relevance

ROOT = Path(__file__).resolve().parents[1]
SCHEMES_PATH = ROOT / "data" / "schemes.json"
OUTPUT_PATH = ROOT / "data" / "scheme_training_data.csv"
SEED = 42
FARMER_COUNT = 2400

DISTRICTS = {
    "Tamil Nadu": ["Thiruvallur", "Chennai", "Salem", "Madurai", "Coimbatore"],
    "Andhra Pradesh": ["Chittoor", "Guntur", "Krishna", "Nellore"],
    "Karnataka": ["Bengaluru Rural", "Mysuru", "Mandya", "Dharwad"],
    "Maharashtra": ["Pune", "Nashik", "Nagpur", "Kolhapur"],
    "Jharkhand": ["Ranchi", "Khunti", "Gumla", "Lohardaga"],
    "Uttar Pradesh": ["Lucknow", "Varanasi", "Agra", "Gorakhpur"],
    "Odisha": ["Cuttack", "Puri", "Ganjam", "Balasore"],
    "Assam": ["Guwahati", "Nagaon", "Jorhat", "Dibrugarh"],
}
ACTIVITY_CROPS = [
    ("Crop Cultivation", "Paddy"),
    ("Crop Cultivation", "Groundnut"),
    ("Crop Cultivation", "Maize"),
    ("Crop Cultivation", "Millet"),
    ("Horticulture", "Tomato"),
    ("Horticulture", "Horticulture"),
    ("Fisheries", "Fish"),
    ("Aquaculture", "Shrimp"),
    ("Pearl Culture", "Pearl Mussel"),
    ("Livestock", "Livestock"),
    ("Farm Machinery", "Paddy"),
    ("Irrigation", "Groundnut"),
    ("Agri Infrastructure", "Paddy"),
]
FARMER_CATEGORIES = ["Small Farmer", "Marginal Farmer", "Other"]
IRRIGATION_TYPES = ["Borewell", "Canal", "Drip", "Sprinkler", "Rain-fed"]


def make_profiles(rng: np.random.Generator) -> list[dict]:
    profiles = []
    for index in range(FARMER_COUNT):
        state = str(rng.choice(list(DISTRICTS)))
        activity, crop = ACTIVITY_CROPS[int(rng.integers(0, len(ACTIVITY_CROPS)))]
        category = str(rng.choice(FARMER_CATEGORIES, p=[0.48, 0.29, 0.23]))
        if category == "Marginal Farmer":
            land = float(np.round(rng.uniform(0.2, 2.0), 1))
        elif category == "Small Farmer":
            land = float(np.round(rng.uniform(1.0, 5.0), 1))
        else:
            land = float(np.round(rng.uniform(1.0, 30.0), 1))
        profiles.append(
            {
                "state": state,
                "district": str(rng.choice(DISTRICTS[state])),
                "crop": crop,
                "land_area": land,
                "farmer_category": category,
                "irrigation": str(rng.choice(IRRIGATION_TYPES)),
                "activity": activity,
                "annual_income": int(rng.integers(30000, 1200001, endpoint=True)),
                "age": int(rng.integers(18, 76)),
                "_profile_index": index,
            }
        )
    return profiles


def main() -> None:
    rng = np.random.default_rng(SEED)
    schemes = json.loads(SCHEMES_PATH.read_text(encoding="utf-8"))
    rows = []
    for profile in make_profiles(rng):
        for scheme in schemes:
            row = build_feature_row(profile, scheme)
            row["relevance_class"] = label_relevance(profile, scheme)
            row["profile_id"] = profile["_profile_index"]
            rows.append(row)

    dataset = pd.DataFrame(rows)
    dataset = dataset[["profile_id", *FEATURE_COLUMNS, "relevance_class"]]
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    dataset.to_csv(OUTPUT_PATH, index=False)
    print(f"Generated {len(dataset):,} labelled profile/scheme records")
    print(f"Distinct synthetic farmer profiles: {FARMER_COUNT:,}")
    print("Class counts:")
    print(dataset["relevance_class"].value_counts().sort_index().to_string())
    print(f"Saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
