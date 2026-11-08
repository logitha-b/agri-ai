"""FastAPI service serving the trained scheme relevance model."""

from __future__ import annotations

import logging
import sys
import csv
from collections import Counter
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

API_DIR = Path(__file__).resolve().parent
OUTCOME_SAMPLE_PATH = API_DIR / "data" / "farmer_outcomes_sample.csv"
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from ml.predictor import load_model_artifacts, load_schemes, model_information, predict_schemes
from i18n import translate_phrase

def localize_scheme(s: dict[str, Any], lang: str) -> dict[str, Any]:
    if not s or lang == 'en':
        return s
    copy_s = dict(s)
    for field in ['name', 'category', 'description', 'benefits', 'department', 'deadline', 'note']:
        if field in copy_s and isinstance(copy_s[field], str):
            copy_s[field] = translate_phrase(copy_s[field], lang)
    for list_field in ['eligibility_criteria', 'required_documents', 'application_steps']:
        if list_field in copy_s and isinstance(copy_s[list_field], list):
            copy_s[list_field] = [translate_phrase(x, lang) for x in copy_s[list_field]]
    return copy_s

logger = logging.getLogger("scheme-intelligence")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in __import__("os").getenv(
        "AGRI_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5200,http://127.0.0.1:5200",
    ).split(",")
    if origin.strip()
]


@asynccontextmanager
async def lifespan(application: FastAPI):
    try:
        load_model_artifacts()
        application.state.model_loaded = True
        application.state.model_error = None
    except (FileNotFoundError, OSError, ValueError) as error:
        application.state.model_loaded = False
        application.state.model_error = str(error)
        logger.error("Scheme model could not be loaded: %s", error)
    yield


app = FastAPI(
    title="Agri-Economic Scheme Intelligence",
    description="Prototype ML relevance predictions with independent eligibility checks.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FarmerProfile(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    state: str = Field(min_length=2, max_length=80)
    district: str = Field(min_length=2, max_length=80)
    crop: str = Field(min_length=2, max_length=80)
    land_area: float = Field(gt=0, le=100000)
    farmer_category: str = Field(default="Small Farmer", min_length=2, max_length=80)
    irrigation: str | None = None
    irrigation_source: str | None = None
    activity: str | None = None
    farming_activity: str | None = None
    annual_income: float = Field(default=150000, ge=0, le=1000000000)
    age: int = Field(default=42, ge=18, le=120)


def _model_ready() -> None:
    if not getattr(app.state, "model_loaded", False):
        detail = getattr(app.state, "model_error", None) or "The trained scheme recommendation model is not available."
        raise HTTPException(status_code=503, detail=detail)


@app.get("/health")
def health() -> dict[str, Any]:
    loaded = bool(getattr(app.state, "model_loaded", False))
    return {"status": "ok" if loaded else "degraded", "model_loaded": loaded}


@app.get("/model-info")
def get_model_information() -> dict[str, Any]:
    _model_ready()
    return model_information()


@app.get("/outcome-sample")
def get_outcome_sample() -> dict[str, Any]:
    required_columns = {"application_status", "payment_status", "scheme_id", "outcome_source"}
    try:
        with OUTCOME_SAMPLE_PATH.open("r", newline="", encoding="utf-8-sig") as source:
            reader = csv.DictReader(source)
            if not reader.fieldnames or not required_columns.issubset(reader.fieldnames):
                raise ValueError("Outcome sample is missing required columns.")
            rows = list(reader)
        if not rows:
            raise ValueError("Outcome sample contains no records.")
        if any("synthetic" not in row["outcome_source"].casefold() for row in rows):
            raise ValueError("Outcome sample provenance is not consistently identified as synthetic.")
    except (OSError, KeyError, ValueError) as error:
        logger.exception("Outcome sample could not be read or validated")
        raise HTTPException(status_code=503, detail="Illustrative outcome sample is unavailable or failed provenance validation.") from error

    return {
        "record_count": len(rows),
        "data_kind": "synthetic_example",
        "source_note": "Every row is labeled as a generated example, not an official farmer or government record.",
        "application_status": dict(sorted(Counter(row["application_status"] for row in rows).items())),
        "payment_status": dict(sorted(Counter(row["payment_status"] for row in rows).items())),
        "schemes": dict(sorted(Counter(row["scheme_id"] for row in rows).items())),
    }


@app.get("/schemes")
def get_schemes(language: str = "en") -> list[dict[str, Any]]:
    return [localize_scheme(s, language) for s in load_schemes()]


@app.get("/schemes/{scheme_id}")
def get_scheme(scheme_id: str, language: str = "en") -> dict[str, Any]:
    for scheme in load_schemes():
        if scheme["id"] == scheme_id:
            return localize_scheme(scheme, language)
    raise HTTPException(status_code=404, detail="Scheme not found.")


@app.post("/predict-schemes")
def post_predict_schemes(profile: FarmerProfile, language: str = "en") -> dict[str, Any]:
    _model_ready()
    try:
        normalized_profile = profile.model_dump()
        if not normalized_profile.get("irrigation") and normalized_profile.get("irrigation_source"):
            normalized_profile["irrigation"] = normalized_profile["irrigation_source"]
        elif not normalized_profile.get("irrigation"):
            normalized_profile["irrigation"] = "Borewell"

        if not normalized_profile.get("activity") and normalized_profile.get("farming_activity"):
            normalized_profile["activity"] = normalized_profile["farming_activity"]
        elif not normalized_profile.get("activity"):
            normalized_profile["activity"] = "Crop Cultivation"

        recommendations = predict_schemes(normalized_profile)

        if language and language != "en":
            for item in recommendations:
                if "scheme_name" in item and isinstance(item["scheme_name"], str):
                    item["scheme_name"] = translate_phrase(item["scheme_name"], language)
                if "relevance_class" in item and isinstance(item["relevance_class"], str):
                    item["relevance_class"] = translate_phrase(item["relevance_class"], language)
                if "why" in item and isinstance(item["why"], str):
                    item["why"] = translate_phrase(item["why"], language)
                if "details" in item and isinstance(item["details"], dict):
                    item["details"] = localize_scheme(item["details"], language)

        classes = [item["relevance_class_id"] for item in recommendations]
        return {
            "profile": normalized_profile,
            "recommendations": recommendations,
            "summary": {
                "schemes_analyzed": len(recommendations),
                "highly_relevant": classes.count(3),
                "relevant": classes.count(2),
                "potential_matches": sum(class_id >= 1 for class_id in classes),
            },
            "model": {
                "name": "Random Forest Classifier",
                "task": "Scheme Relevance Classification",
                "training_data": "Curated scheme metadata and deterministic synthetic farmer profiles",
                "limitations": "Relevance confidence is not official eligibility probability. Model metrics use synthetic labels, not real farmer outcomes.",
            },
        }
    except (FileNotFoundError, OSError, ValueError, KeyError, RuntimeError) as error:
        logger.exception("Scheme inference failed")
        raise HTTPException(status_code=500, detail="Unable to generate recommendations. Check the trained model and scheme data.") from error
