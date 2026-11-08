"""
Agri-Economic Intelligence — Production Gateway & Reverse Proxy
Routes requests to the 4 underlying microservice processes:
  - Port 8000: Schemes Engine
  - Port 8002: Production Engine
  - Port 8003: Crop Health, Soil, Water, Lac, Pearl Engine
  - Port 8004: Voice & Multimodal Assistant Engine
"""

from __future__ import annotations

import os
import sys
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agri-gateway")

# Upstream microservice port definitions
PORT_SCHEMES = int(os.getenv("PORT_SCHEMES", "8000"))
PORT_PROD = int(os.getenv("PORT_PROD", "8002"))
PORT_HEALTH = int(os.getenv("PORT_HEALTH", "8003"))
PORT_VOICE = int(os.getenv("PORT_VOICE", "8004"))

SCHEMES_URL = f"http://127.0.0.1:{PORT_SCHEMES}"
PROD_URL = f"http://127.0.0.1:{PORT_PROD}"
HEALTH_URL = f"http://127.0.0.1:{PORT_HEALTH}"
VOICE_URL = f"http://127.0.0.1:{PORT_VOICE}"

_client: httpx.AsyncClient | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _client
    # Timeout 120s for long multimodal Gemini or Whisper audio processing
    _client = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0))
    logger.info("Gateway HTTP client initialized.")
    yield
    if _client:
        await _client.aclose()
        logger.info("Gateway HTTP client closed.")

app = FastAPI(
    title="Agri-Economic Intelligence — Production Gateway",
    version="1.0.0",
    description="Unified API entrypoint reverse-proxying requests to internal microservices.",
    lifespan=lifespan,
)

# CORS configuration allowing requests from deployed Vercel frontend and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def determine_upstream(path: str) -> tuple[str, str]:
    """
    Map request path to corresponding internal microservice URL.
    Returns (upstream_base_url, target_path).
    """
    # 1. Production Engine (Port 8002)
    if path.startswith("/api/production"):
        return PROD_URL, path

    # 2. Crop Health, Soil, Water, Lac, Pearl, Market, Loss, CashFlow (Port 8003)
    if any(path.startswith(prefix) for prefix in [
        "/api/health",
        "/api/water",
        "/api/soil",
        "/api/lac",
        "/api/pearl",
        "/api/loss",
        "/api/market",
        "/api/recommend",
        "/api/cashflow",
    ]):
        return HEALTH_URL, path

    # 3. Voice & AI Assistant (Port 8004)
    if any(path.startswith(prefix) for prefix in [
        "/api/voice",
        "/api/translate",
        "/api/assistant",
        "/api/conversations",
    ]):
        return VOICE_URL, path

    # 4. Schemes API (Port 8000)
    if path.startswith("/api/schemes"):
        target_path = path.replace("/api/schemes", "/schemes", 1)
        return SCHEMES_URL, target_path

    if any(path.startswith(prefix) for prefix in [
        "/schemes",
        "/predict-schemes",
        "/model-info",
        "/farmer-profiles",
        "/outcome-sample",
    ]):
        return SCHEMES_URL, path

    # Default to Voice API for /health or general endpoints
    return VOICE_URL, path

@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def proxy_handler(request: Request, full_path: str):
    path = f"/{full_path}"
    
    # Root status check
    if path == "/" or path == "":
        return {
            "platform": "Agri-Economic Intelligence API Gateway",
            "status": "online",
            "microservices": {
                "schemes": f"port {PORT_SCHEMES}",
                "production": f"port {PORT_PROD}",
                "health": f"port {PORT_HEALTH}",
                "voice": f"port {PORT_VOICE}",
            }
        }

    upstream_base, target_path = determine_upstream(path)
    target_url = f"{upstream_base}{target_path}"
    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"

    # Filter headers to avoid conflicts
    excluded_headers = {"host", "content-length"}
    forward_headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in excluded_headers
    }

    body = await request.body()

    try:
        req = _client.build_request(
            method=request.method,
            url=target_url,
            headers=forward_headers,
            content=body,
        )
        upstream_res = await _client.send(req, stream=True)

        async def stream_generator() -> AsyncIterator[bytes]:
            async for chunk in upstream_res.aiter_bytes():
                yield chunk

        # Strip hop-by-hop headers
        resp_headers = {
            k: v for k, v in upstream_res.headers.items()
            if k.lower() not in {"transfer-encoding", "content-encoding", "content-length"}
        }

        return StreamingResponse(
            stream_generator(),
            status_code=upstream_res.status_code,
            headers=resp_headers,
            media_type=upstream_res.headers.get("content-type"),
        )
    except httpx.ConnectError:
        return Response(
            content=f'{{"detail": "Microservice at {upstream_base} is not reachable. Ensure the service is running."}}',
            status_code=503,
            media_type="application/json",
        )
    except Exception as exc:
        logger.error(f"Proxy error for {target_url}: {exc}")
        return Response(
            content=f'{{"detail": "Gateway proxy error: {str(exc)}"}}',
            status_code=502,
            media_type="application/json",
        )

