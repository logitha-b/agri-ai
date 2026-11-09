"""
Agri-Economic Intelligence Platform — Unified Production Cloud Server
Runs all 4 microservice domains on a single FastAPI instance:
  1. Schemes Intelligence (/predict-schemes, /schemes)
  2. Production & Yield Intelligence (/api/production/*)
  3. Crop Health, Soil, Water, Lac, Pearl (/api/health/*, /api/water/*, etc.)
  4. Multilingual Voice & AI Assistant (/api/assistant/chat, /api/voice/*)

Designed for Render Cloud Deployment (Zero Laptop Dependency, ₹0 Budget).
"""

from __future__ import annotations

import os
import sys
import logging
from contextlib import asynccontextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = Path(__file__).resolve().parent

# Ensure both ROOT and BACKEND_DIR are in sys.path
sys.path = [str(ROOT), str(BACKEND_DIR)] + [p for p in sys.path if p not in (str(ROOT), str(BACKEND_DIR), "")]

# Configure internal URL for inter-module calls
PORT = int(os.getenv("PORT", "8000"))
if not os.getenv("INTERNAL_API_URL"):
    os.environ["INTERNAL_API_URL"] = f"http://127.0.0.1:{PORT}"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app as schemes_module
import main as prod_module
import health_api as health_module
import voice_api as voice_module

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agri-unified-server")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize scheme prediction model
    try:
        schemes_module.load_model_artifacts()
        schemes_module.app.state.model_loaded = True
        schemes_module.app.state.model_error = None
        logger.info("[Startup] Scheme prediction model successfully loaded.")
    except Exception as e:
        schemes_module.app.state.model_loaded = False
        schemes_module.app.state.model_error = str(e)
        logger.warning(f"[Startup] Scheme model load warning: {e}")

    logger.info(f"[Startup] Agri-Economic Intelligence Platform active on port {PORT}")
    yield
    logger.info("[Shutdown] Cleaning up server resources.")


app = FastAPI(
    title="Agri-Economic Intelligence Platform — Cloud Backend",
    version="1.0.0",
    description="Unified API hosting all 12 intelligence modules on Render cloud.",
    lifespan=lifespan,
)

# CORS enabled for all origins (Vercel production URL, preview URLs, local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://agri-ai-blond.vercel.app",
        "https://agri-ai-jnpi.onrender.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Merge all routes from the 4 microservices
seen_paths = set()
for mod_name, mod in [
    ("Schemes", schemes_module),
    ("Production", prod_module),
    ("Health & Water", health_module),
    ("Voice & AI", voice_module),
]:
    added_count = 0
    for r in mod.app.routes:
        route_key = (getattr(r, "path", None), tuple(sorted(getattr(r, "methods", []))))
        if r.path not in ("/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc") and route_key not in seen_paths:
            app.routes.append(r)
            seen_paths.add(route_key)
            added_count += 1
    logger.info(f"Loaded {added_count} endpoints from {mod_name} module.")


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Agri-Economic Intelligence Platform — Cloud Backend",
        "deployment": "Render Free Web Service",
        "endpoints": len(app.routes),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=PORT, reload=False)

