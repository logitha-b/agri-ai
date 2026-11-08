# CDS credentials setup

import os
from pathlib import Path

def main():
    print("=== CDS API Credentials Setup ===\n")
    print("Find your key at: https://cds.climate.copernicus.eu/profile\n")

    key = input("Paste your API key here (format: UID:key-string): ").strip()

    if not key or ":" not in key:
        print("ERROR: Key should be in format  12345:abcdef-...-xxxx")
        return

    rc_path = Path.home() / ".cdsapirc"

    content = f"url: https://cds.climate.copernicus.eu/api\nkey: {key}\n"

    rc_path.write_text(content, encoding="utf-8")
    print(f"\nCredentials written to: {rc_path}")
    print("You can now run:  python download_era5_precip.py")

    # Quick test
    try:
        import cdsapi
        c = cdsapi.Client(quiet=True)
        print("Connection test: OK")
    except Exception as e:
        print(f"Connection test failed: {e}")
        print("Check that your key is correct at https://cds.climate.copernicus.eu/profile")

if __name__ == "__main__":
    main()
