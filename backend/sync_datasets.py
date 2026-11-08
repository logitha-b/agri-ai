"""
Dataset Synchronizer for Agri-Economic Intelligence Platform.
Ensures large production datasets (soil-nutrients.db and reservoir.kml)
are available at runtime on the container/host before microservices start.
"""

import os
import sys
import hashlib
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
WATER_DATA_DIR = ROOT / "ml" / "data" / "water"
WATER_DATA_DIR.mkdir(parents=True, exist_ok=True)

SOIL_DB_PATH = Path(os.getenv("SOIL_DB_PATH", str(WATER_DATA_DIR / "soil-nutrients.db")))
RESERVOIR_KML_PATH = Path(os.getenv("RESERVOIR_KML_PATH", str(WATER_DATA_DIR / "reservoir.kml")))

SOIL_DB_URL = os.getenv("SOIL_DB_DOWNLOAD_URL", "")
RESERVOIR_KML_URL = os.getenv("RESERVOIR_KML_DOWNLOAD_URL", "")

def download_file(url: str, dest_path: Path, label: str):
    print(f"[*] Downloading {label} from {url}...")
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_suffix(dest_path.suffix + ".download")
    
    def report_hook(count, block_size, total_size):
        if total_size > 0:
            percent = int(count * block_size * 100 / total_size)
            if count % 1000 == 0 or percent == 100:
                mb = (count * block_size) / (1024 * 1024)
                total_mb = total_size / (1024 * 1024)
                sys.stdout.write(f"\r    -> {percent}% ({mb:.1f} MB / {total_mb:.1f} MB)")
                sys.stdout.flush()

    urllib.request.urlretrieve(url, str(temp_path), reporthook=report_hook)
    print("\n    -> Download complete. Finalizing...")
    temp_path.replace(dest_path)

def verify_datasets():
    print("=== CHECKING PRODUCTION LARGE DATASETS ===")

    # 1. Soil Nutrients SQLite DB
    if SOIL_DB_PATH.is_file():
        sz_mb = SOIL_DB_PATH.stat().st_size / (1024 * 1024)
        print(f"[OK] soil-nutrients.db verified ({sz_mb:.2f} MB) at {SOIL_DB_PATH}")
    elif SOIL_DB_URL:
        download_file(SOIL_DB_URL, SOIL_DB_PATH, "soil-nutrients.db")
    else:
        print(f"[NOTE] soil-nutrients.db not found at {SOIL_DB_PATH}.")
        print("       Set SOIL_DB_DOWNLOAD_URL or mount persistent volume to enable live soil analytics.")

    # 2. Reservoir KML
    if RESERVOIR_KML_PATH.is_file():
        sz_mb = RESERVOIR_KML_PATH.stat().st_size / (1024 * 1024)
        print(f"[OK] reservoir.kml verified ({sz_mb:.2f} MB) at {RESERVOIR_KML_PATH}")
    elif RESERVOIR_KML_URL:
        download_file(RESERVOIR_KML_URL, RESERVOIR_KML_PATH, "reservoir.kml")
    else:
        print(f"[NOTE] reservoir.kml not found at {RESERVOIR_KML_PATH}.")
        print("       Set RESERVOIR_KML_DOWNLOAD_URL or mount persistent volume to enable live reservoir boundaries.")

if __name__ == "__main__":
    verify_datasets()

