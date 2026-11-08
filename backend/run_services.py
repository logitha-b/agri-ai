"""
Process Manager for Agri-Economic Intelligence Platform.
Starts and monitors all 4 microservice processes plus the unified gateway:
  1. Schemes API (Port 8000)
  2. Production Engine (Port 8002)
  3. Crop Health / Soil / Water / Lac / Pearl (Port 8003)
  4. Voice & Multimodal Assistant (Port 8004)
  5. Gateway Reverse Proxy (Port 7860 or PORT env var)
"""

import os
import sys
import time
import signal
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"

PORT_GATEWAY = int(os.getenv("PORT", "7860"))
PYTHON_BIN = sys.executable

SERVICES = [
    {
        "name": "Schemes API",
        "port": 8000,
        "cmd": [PYTHON_BIN, "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8000"],
    },
    {
        "name": "Production Engine",
        "port": 8002,
        "cmd": [PYTHON_BIN, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8002"],
    },
    {
        "name": "Crop Health & Water API",
        "port": 8003,
        "cmd": [PYTHON_BIN, "-m", "uvicorn", "health_api:app", "--host", "127.0.0.1", "--port", "8003"],
    },
    {
        "name": "Voice & Assistant API",
        "port": 8004,
        "cmd": [PYTHON_BIN, "-m", "uvicorn", "voice_api:app", "--host", "127.0.0.1", "--port", "8004"],
    },
]

processes = []

def stop_all(signum=None, frame=None):
    print("\n[Manager] Shutting down all services...")
    for p in processes:
        if p.poll() is None:
            p.terminate()
    time.sleep(1)
    for p in processes:
        if p.poll() is None:
            p.kill()
    print("[Manager] All services stopped.")
    sys.exit(0)

def main():
    signal.signal(signal.SIGINT, stop_all)
    signal.signal(signal.SIGTERM, stop_all)

    env = os.environ.copy()
    env["PYTHONPATH"] = f"{str(ROOT)}{os.pathsep}{str(BACKEND_DIR)}{os.pathsep}{env.get('PYTHONPATH', '')}"

    print("==================================================")
    print("  Agri Intelligence — Unified Process Manager     ")
    print("==================================================")

    for svc in SERVICES:
        print(f"[*] Starting {svc['name']} on 127.0.0.1:{svc['port']}...")
        p = subprocess.Popen(svc["cmd"], cwd=str(BACKEND_DIR), env=env)
        processes.append(p)
        time.sleep(1)

    print(f"[*] Starting Production Gateway on 0.0.0.0:{PORT_GATEWAY}...")
    gateway_cmd = [
        PYTHON_BIN, "-m", "uvicorn", "gateway:app",
        "--host", "0.0.0.0",
        "--port", str(PORT_GATEWAY)
    ]
    gateway_proc = subprocess.Popen(gateway_cmd, cwd=str(BACKEND_DIR), env=env)
    processes.append(gateway_proc)

    print(f"\n[SUCCESS] Gateway is active at http://0.0.0.0:{PORT_GATEWAY}")
    print("Press Ctrl+C to stop all services.\n")

    try:
        while True:
            for i, p in enumerate(processes):
                if p.poll() is not None:
                    # If one process died, log error
                    name = SERVICES[i]["name"] if i < len(SERVICES) else "Gateway"
                    print(f"[WARNING] {name} exited unexpectedly with code {p.returncode}")
            time.sleep(5)
    except KeyboardInterrupt:
        stop_all()

if __name__ == "__main__":
    main()

