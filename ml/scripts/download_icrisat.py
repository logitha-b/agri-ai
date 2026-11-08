"""Download only a direct, verified ICRISAT data file; never scrape third parties."""

from __future__ import annotations

import argparse
import json
from html.parser import HTMLParser
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


SOURCE_PAGE = "https://www.icrisat.org/resources/data/district-level-data"
ALLOWED_HOST = "www.icrisat.org"
ALLOWED_SUFFIXES = {".csv", ".xlsx", ".xls"}
ROOT = Path(__file__).resolve().parents[2]
DESTINATION = ROOT / "ml" / "data" / "raw"


class FileLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self.links.append(href)


def is_official_file(url: str) -> bool:
    parsed = urlparse(url)
    return (
        parsed.scheme == "https"
        and parsed.hostname == ALLOWED_HOST
        and Path(parsed.path).suffix.lower() in ALLOWED_SUFFIXES
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download an official ICRISAT district data file when a direct file URL is available."
    )
    parser.add_argument(
        "--url",
        help="Optional direct file URL copied from the official ICRISAT page. Must be an HTTPS www.icrisat.org CSV/XLS/XLSX.",
    )
    args = parser.parse_args()
    DESTINATION.mkdir(parents=True, exist_ok=True)

    if args.url:
        candidate = args.url
    else:
        request = Request(SOURCE_PAGE, headers={"User-Agent": "Agri-Economic-Intelligence/1.0"})
        with urlopen(request, timeout=30) as response:
            page_url = response.geturl()
            if urlparse(page_url).hostname != ALLOWED_HOST:
                raise RuntimeError("ICRISAT page redirected outside the official ICRISAT host.")
            markup = response.read().decode("utf-8", errors="replace")
        links = FileLinkParser()
        links.feed(markup)
        candidates = {
            urljoin(SOURCE_PAGE, href)
            for href in links.links
            if is_official_file(urljoin(SOURCE_PAGE, href))
        }
        if len(candidates) != 1:
            raise RuntimeError(
                "No unique direct ICRISAT CSV/XLS/XLSX link is exposed by the official page. "
                "Download the District Level Database from "
                f"{SOURCE_PAGE} and place the unmodified export at "
                "ml/data/raw/icrisat_crop_production.csv or "
                "ml/data/raw/icrisat_crop_production.xlsx. Do not use third-party mirrors."
            )
        candidate = candidates.pop()

    if not is_official_file(candidate):
        raise ValueError("The file URL must be HTTPS and hosted directly on www.icrisat.org.")
    suffix = Path(urlparse(candidate).path).suffix.lower()
    output = DESTINATION / f"icrisat_crop_production{suffix}"
    request = Request(candidate, headers={"User-Agent": "Agri-Economic-Intelligence/1.0"})
    with urlopen(request, timeout=60) as response, output.open("wb") as target:
        final_host = urlparse(response.geturl()).hostname
        if final_host != ALLOWED_HOST:
            raise RuntimeError("ICRISAT file redirected outside the official ICRISAT host.")
        target.write(response.read())
    output.with_suffix(".metadata.json").write_text(
        json.dumps(
            {
                "source": "ICRISAT District Level Database",
                "url": candidate,
                "downloaded_at_utc": datetime.now(timezone.utc).isoformat(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Saved official-source file to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
