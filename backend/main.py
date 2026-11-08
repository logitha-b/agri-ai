"""FastAPI endpoints for real-data Engine 2 crop-yield intelligence."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.predict import (  # noqa: E402
    ProductionDataUnavailable,
    available_options,
    metadata_response,
    predict,
)
from ml.synthetic_projection import (  # noqa: E402
    predict_synthetic,
    synthetic_available_options,
    synthetic_metadata_response,
)

app = FastAPI(
    title="Agri-Economic Intelligence — Production Engine",
    version="1.0.0",
    description="Real-data retrospective yield estimates.",
)
origins = [
    origin.strip()
    for origin in os.environ.get(
        "AGRI_PRODUCTION_ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:5200,http://127.0.0.1:5200",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProductionRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")
    state: str = Field(min_length=1, max_length=100)
    district: str = Field(min_length=1, max_length=100)
    crop: str = Field(min_length=1, max_length=100)
    season: str = Field(min_length=1, max_length=50)
    year: int = Field(ge=1900, le=2100)
    area: float = Field(gt=0, le=1_000_000)
    language: Optional[str] = Field(default="en", max_length=20)


@app.on_event("startup")
def startup_prewarm():
    try:
        available_options()
        metadata_response()
    except Exception:
        pass

@app.get("/health")
def health() -> dict:
    metadata = metadata_response()
    ready = metadata.get("status") == "ready"
    return {
        "status": "ok" if ready else "real_dataset_required",
        "model_loaded": ready,
    }


@app.get("/api/production/metadata")
def production_metadata() -> dict:
    return metadata_response()


@app.get("/api/production/options")
def production_options() -> dict:
    return available_options()


@app.get("/api/production/sources")
def production_sources() -> dict:
    path = ROOT / "ml" / "metadata" / "data_sources.json"
    if not path.is_file():
        raise HTTPException(status_code=500, detail="Production data-source registry is missing.")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail="Production data-source registry is invalid.") from exc


@app.post("/api/production/predict")
def production_predict(request: ProductionRequest) -> dict:
    try:
        return predict(request.model_dump())
    except (ProductionDataUnavailable, LookupError, ValueError) as exc:
        try:
            from ml.gemini_production import predict_with_gemini_fallback
            req = request.model_dump()
            return predict_with_gemini_fallback(
                state=req["state"],
                district=req["district"],
                crop=req["crop"],
                season=req["season"],
                year=req["year"],
                farm_area=req["area"],
                language=req.get("language", "en"),
            )
        except Exception:
            if isinstance(exc, ProductionDataUnavailable):
                raise HTTPException(status_code=503, detail=str(exc)) from exc
            elif isinstance(exc, LookupError):
                raise HTTPException(status_code=404, detail=str(exc)) from exc
            raise HTTPException(status_code=422, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Synthetic scenario endpoints (2018-present)
# ---------------------------------------------------------------------------


@app.get("/api/production/synthetic/metadata")
def synthetic_metadata() -> dict:
    try:
        return synthetic_metadata_response()
    except ProductionDataUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/api/production/synthetic/options")
def synthetic_options() -> dict:
    try:
        return synthetic_available_options()
    except ProductionDataUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/production/synthetic/predict")
def synthetic_predict(request: ProductionRequest) -> dict:
    try:
        return predict_synthetic(request.model_dump())
    except (ProductionDataUnavailable, LookupError, ValueError) as exc:
        try:
            from ml.gemini_production import predict_with_gemini_fallback
            req = request.model_dump()
            return predict_with_gemini_fallback(
                state=req["state"],
                district=req["district"],
                crop=req["crop"],
                season=req["season"],
                year=req["year"],
                farm_area=req["area"],
                language=req.get("language", "en"),
            )
        except Exception:
            if isinstance(exc, ProductionDataUnavailable):
                raise HTTPException(status_code=503, detail=str(exc)) from exc
            elif isinstance(exc, LookupError):
                raise HTTPException(status_code=404, detail=str(exc)) from exc
            raise HTTPException(status_code=422, detail=str(exc)) from exc
