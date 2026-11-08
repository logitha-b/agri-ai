# ==============================================================================
# AGRI-ECONOMIC INTELLIGENCE PLATFORM — PRODUCTION CONTAINER
# Compatible with: Hugging Face Spaces (₹0), Render, Railway, or Linux VPS
# ==============================================================================
FROM python:3.11-slim

# System dependencies for audio (FFmpeg) and basic compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency specifications first for optimal Docker layer caching
COPY backend/requirements-prod.txt /app/backend/requirements-prod.txt
RUN pip install --no-cache-dir -r /app/backend/requirements-prod.txt

# Copy complete project files
COPY . /app

# Configure Python path to find both root and backend modules
ENV PYTHONPATH=/app:/app/backend
ENV PORT=7860
ENV WHISPER_MODEL_SIZE=small
ENV WHISPER_DEVICE=cpu
ENV WHISPER_COMPUTE_TYPE=int8

EXPOSE 7860

# Start all 4 microservices + unified gateway via process manager
CMD ["python", "backend/run_services.py"]

