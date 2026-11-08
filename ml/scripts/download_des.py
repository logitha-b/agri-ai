"""Fetch paginated records from the official data.gov.in resource API."""

from __future__ import annotations

import argparse
import csv
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[2]
BASE_URL = "https://api.data.gov.in/resource/"


def fetch_page(resource_id: str, api_key: str, offset: int, limit: int) -> dict:
    query = urlencode(
        {
            "api-key": api_key,
            "format": "json",
            "limit": limit,
            "offset": offset,
        }
    )
    request = Request(
        f"{BASE_URL}{resource_id}?{query}",
        headers={"User-Agent": "Agri-Economic-Intelligence/1.0"},
    )
    try:
        with urlopen(request, timeout=60) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(
            "Could not retrieve the Government of India resource. Verify network access, "
            "API key and resource identifier; no data was substituted."
        ) from exc
    if not isinstance(payload, dict) or not isinstance(payload.get("records"), list):
        raise RuntimeError(f"Unexpected data.gov.in response: {payload!r}")
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download the official data.gov.in district-wise crop production records."
    )
    parser.add_argument(
        "--resource-id",
        default=os.environ.get("DATA_GOV_IN_RESOURCE_ID"),
        help="Actual data.gov.in API resource identifier (not the catalog/node identifier).",
    )
    parser.add_argument("--limit", type=int, default=1000)
    args = parser.parse_args()
    api_key = os.environ.get("DATA_GOV_IN_API_KEY")
    if not args.resource_id or not api_key:
        parser.error(
            "Set DATA_GOV_IN_RESOURCE_ID and DATA_GOV_IN_API_KEY using the values "
            "provided by the official data.gov.in resource/API page."
        )
    if args.limit < 1 or args.limit > 10000:
        parser.error("--limit must be between 1 and 10000.")

    rows: list[dict] = []
    offset = 0
    while True:
        page = fetch_page(args.resource_id, api_key, offset, args.limit)
        page_rows = page["records"]
        if not page_rows:
            break
        rows.extend(page_rows)
        offset += len(page_rows)
        total = int(page.get("total", offset))
        print(f"Retrieved {len(rows)} of {total} records")
        if offset >= total or len(page_rows) < args.limit:
            break

    if not rows:
        raise RuntimeError("The official data.gov.in resource returned no records.")
    output_dir = ROOT / "ml" / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / "des_crop_production.csv"
    with output.open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    metadata = {
        "source": "data.gov.in",
        "resource_id": args.resource_id,
        "url": "https://data.gov.in/resource/district-wise-season-wise-crop-production-statistics-1997",
        "downloaded_at_utc": datetime.now(timezone.utc).isoformat(),
        "rows_downloaded": len(rows),
    }
    output.with_suffix(".metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )
    print(f"Saved {len(rows)} source records to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
