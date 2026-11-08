"""
Soil Nutrient Analysis — India-wide Soil Health Card dataset.

Source  : India Data Portal — Soil Health Card scheme
URL     : https://ckandev.indiadataportal.com/dataset/soil-health-card/resource/024cf507-4281-4c89-a40e-37b5add3a4df
CSV     : ml/data/water/soil-nutrient-analysis.csv
Rows    : ~10.85 million
Year    : 2024-25 (single year in dataset)

Columns (exact, from inspection):
    id, year, state_name, state_code,
    district_name, district_code,
    block_name, block_code,
    village_name, village_code,
    nutrient_type, nutrient_name, nutrient_level, value

Important facts about `value`:
    The `value` column is an INTEGER count of soil samples rated at that
    (nutrient_name, nutrient_level) combination for that village in that year.
    Example: Phosphorus / Medium / 29 means 29 samples were rated Medium.
    It is NOT a measured concentration in mg/kg or any other unit.
    This module preserves and exposes this interpretation explicitly.

Nutrient levels:
    Macro: Low / Medium / High
    Micro: Deficient / Sufficient
    Soil Ph: Acidic / Neutral / Alkaline
    Electrical Conductivity: Non Saline / Saline

Storage strategy:
    A SQLite database is built on first access from the CSV and reused on
    subsequent calls.  Building takes ~2–4 minutes for 10.85M rows.
    The DB is stored at ml/data/water/soil-nutrients.db.
"""

from __future__ import annotations

import csv
import os
import re
import sqlite3
import threading
from pathlib import Path
from typing import Any

ROOT   = Path(__file__).resolve().parents[1]
CSV    = Path(os.getenv("SOIL_CSV_PATH", str(ROOT / "ml" / "data" / "water" / "soil-nutrient-analysis.csv")))
DB     = Path(os.getenv("SOIL_DB_PATH", str(ROOT / "ml" / "data" / "water" / "soil-nutrients.db")))

_lock  = threading.Lock()
_built = False   # set to True once DB is confirmed ready
_info_cache: dict | None = None


# ── Normalisation ──────────────────────────────────────────────────────────────

def _norm(s: str) -> str:
    """Lower-case, strip, collapse whitespace for fuzzy key matching."""
    return re.sub(r"\s+", " ", str(s).strip().lower())


import difflib

def _resolve_keys(cur, state: str, district: str = "", block: str | None = None, village: str | None = None) -> tuple[str, str, str | None, str | None]:
    """Resolve state, district, block, and village keys with fuzzy matching tolerance."""
    sk = _norm(state)
    dk = _norm(district)

    # 1. State matching
    cur.execute("SELECT DISTINCT state_key FROM locations")
    all_skeys = [r[0] for r in cur.fetchall()]
    if sk not in all_skeys and all_skeys:
        sm = difflib.get_close_matches(sk, all_skeys, n=1, cutoff=0.45)
        if sm:
            sk = sm[0]

    # 2. District matching
    cur.execute("SELECT DISTINCT district_key FROM locations WHERE state_key=?", (sk,))
    all_dkeys = [r[0] for r in cur.fetchall()]
    if dk not in all_dkeys and all_dkeys:
        # Check substring match first
        matched_dk = next((k for k in all_dkeys if dk in k or k in dk), None)
        if not matched_dk:
            dm = difflib.get_close_matches(dk, all_dkeys, n=1, cutoff=0.4)
            if dm:
                matched_dk = dm[0]
        if matched_dk:
            dk = matched_dk

    # 3. Block matching
    bk = _norm(block) if block else None
    if bk:
        cur.execute("SELECT DISTINCT block_key FROM locations WHERE state_key=? AND district_key=?", (sk, dk))
        all_bkeys = [r[0] for r in cur.fetchall()]
        if bk not in all_bkeys and all_bkeys:
            matched_bk = next((k for k in all_bkeys if bk in k or k in bk), None)
            if not matched_bk:
                bm = difflib.get_close_matches(bk, all_bkeys, n=1, cutoff=0.4)
                if bm:
                    matched_bk = bm[0]
            if matched_bk:
                bk = matched_bk

    # 4. Village matching
    vk = _norm(village) if village else None
    if vk and bk:
        cur.execute("SELECT DISTINCT village_key FROM locations WHERE state_key=? AND district_key=? AND block_key=?", (sk, dk, bk))
        all_vkeys = [r[0] for r in cur.fetchall()]
        if vk not in all_vkeys and all_vkeys:
            matched_vk = next((k for k in all_vkeys if vk in k or k in vk), None)
            if not matched_vk:
                vm = difflib.get_close_matches(vk, all_vkeys, n=1, cutoff=0.4)
                if vm:
                    matched_vk = vm[0]
            if matched_vk:
                vk = matched_vk

    return sk, dk, bk, vk


# ── SQLite builder ─────────────────────────────────────────────────────────────

def _build_db() -> None:
    """
    Read the CSV and build an indexed SQLite DB.
    Called once — subsequent calls are no-ops because the DB already exists.
    """
    global _built
    with _lock:
        if _built:
            return
        if DB.is_file():
            # Already built in a previous session — just flag as ready
            _built = True
            return
        if not CSV.is_file():
            raise FileNotFoundError(f"Soil dataset not found: {CSV}")

        con = sqlite3.connect(str(DB))
        cur = con.cursor()
        cur.executescript("""
            PRAGMA journal_mode=WAL;
            PRAGMA synchronous=NORMAL;
            CREATE TABLE IF NOT EXISTS nutrients (
                id              INTEGER PRIMARY KEY,
                year            TEXT    NOT NULL,
                state_name      TEXT    NOT NULL,
                state_code      TEXT,
                district_name   TEXT    NOT NULL,
                district_code   TEXT,
                block_name      TEXT    NOT NULL,
                block_code      TEXT,
                village_name    TEXT    NOT NULL,
                village_code    TEXT,
                nutrient_type   TEXT,
                nutrient_name   TEXT    NOT NULL,
                nutrient_level  TEXT    NOT NULL,
                value           INTEGER,
                -- normalised keys for fast lookup
                state_key       TEXT    NOT NULL,
                district_key    TEXT    NOT NULL,
                block_key       TEXT    NOT NULL,
                village_key     TEXT    NOT NULL
            );
        """)

        BATCH = 50_000
        buf: list[tuple] = []

        with open(CSV, encoding="utf-8", errors="replace", newline="") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                raw_id = row.get("id", "").strip()
                try:
                    rid = int(raw_id)
                except ValueError:
                    rid = None

                val_str = row.get("value", "").strip()
                try:
                    val = int(float(val_str)) if val_str else None
                except ValueError:
                    val = None

                sn = row.get("state_name",    "").strip()
                dn = row.get("district_name", "").strip()
                bn = row.get("block_name",    "").strip()
                vn = row.get("village_name",  "").strip()

                # Skip rows with no usable location or nutrient info
                if not sn or not dn or not bn or not vn:
                    continue
                if not row.get("nutrient_name", "").strip():
                    continue

                buf.append((
                    rid,
                    row.get("year", "").strip(),
                    sn, row.get("state_code", "").strip(),
                    dn, row.get("district_code", "").strip(),
                    bn, row.get("block_code", "").strip(),
                    vn, row.get("village_code", "").strip(),
                    row.get("nutrient_type", "").strip(),
                    row.get("nutrient_name", "").strip(),
                    row.get("nutrient_level", "").strip(),
                    val,
                    _norm(sn), _norm(dn), _norm(bn), _norm(vn),
                ))

                if len(buf) >= BATCH:
                    cur.executemany(
                        "INSERT OR IGNORE INTO nutrients VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        buf,
                    )
                    buf.clear()

        if buf:
            cur.executemany(
                "INSERT OR IGNORE INTO nutrients VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                buf,
            )

        # Indexes for hierarchy navigation and fast village lookups
        cur.executescript("""
            CREATE INDEX IF NOT EXISTS idx_state    ON nutrients(state_key);
            CREATE INDEX IF NOT EXISTS idx_district ON nutrients(state_key, district_key);
            CREATE INDEX IF NOT EXISTS idx_block    ON nutrients(state_key, district_key, block_key);
            CREATE INDEX IF NOT EXISTS idx_village  ON nutrients(state_key, district_key, block_key, village_key);

            -- Compact lookup table for fast hierarchy navigation (avoids full-scan DISTINCT)
            CREATE TABLE IF NOT EXISTS locations AS
                SELECT DISTINCT
                    state_name, state_key,
                    district_name, district_key,
                    block_name, block_key,
                    village_name, village_key
                FROM nutrients;
            CREATE INDEX IF NOT EXISTS loc_state    ON locations(state_key);
            CREATE INDEX IF NOT EXISTS loc_district ON locations(state_key, district_key);
            CREATE INDEX IF NOT EXISTS loc_block    ON locations(state_key, district_key, block_key);
            CREATE INDEX IF NOT EXISTS loc_village  ON locations(state_key, district_key, block_key, village_key);
        """)
        con.commit()
        con.close()
        _built = True


def _con() -> sqlite3.Connection:
    """Return a read-only SQLite connection with performance pragmas."""
    _build_db()
    con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    # 128 MB page cache — critical for DISTINCT queries on 3 GB DB
    con.execute("PRAGMA cache_size=-131072")
    con.execute("PRAGMA temp_store=MEMORY")
    return con


# ── Public query functions ─────────────────────────────────────────────────────

def db_ready() -> bool:
    """True if the SQLite DB file exists (built and queryable)."""
    return DB.is_file() and DB.stat().st_size > 1_000_000  # > 1MB means it's real


def dataset_info() -> dict[str, Any]:
    global _info_cache
    if _info_cache:
        return _info_cache
    if not DB.is_file():
        return {
            "available": False,
            "message": "SQLite database not yet built.",
            "csv_exists": CSV.is_file(),
        }
    with _con() as con:
        cur = con.cursor()
        cur.execute("SELECT key, value FROM meta")
        meta = dict(cur.fetchall())

    import json as _json
    _info_cache = {
        "available":       True,
        "total_rows":      int(meta.get("total_rows", 0)),
        "years":           meta.get("years", "2024-25").split(","),
        "states":          int(meta.get("states", 0)),
        "districts":       int(meta.get("districts", 0)),
        "blocks":          int(meta.get("blocks", 0)),
        "villages":        int(meta.get("villages", 0)),
        "nutrients":       _json.loads(meta.get("nutrients", "[]")),
        "nutrient_levels": _json.loads(meta.get("nutrient_levels", "[]")),
        "source":          "India Data Portal — Soil Health Card scheme",
        "url":             "https://ckandev.indiadataportal.com/dataset/soil-health-card/resource/024cf507-4281-4c89-a40e-37b5add3a4df",
        "value_note": (
            "The 'value' column is a COUNT of soil samples rated at each level, "
            "not a nutrient concentration or measured quantity."
        ),
    }
    return _info_cache


def list_states() -> list[str]:
    with _con() as con:
        cur = con.cursor()
        cur.execute("SELECT DISTINCT state_name FROM locations ORDER BY state_name")
        return [r[0] for r in cur.fetchall()]


def list_districts(state: str) -> list[str]:
    with _con() as con:
        cur = con.cursor()
        sk, _, _, _ = _resolve_keys(cur, state, "")
        cur.execute(
            "SELECT DISTINCT district_name FROM locations WHERE state_key=? ORDER BY district_name",
            (sk,),
        )
        return [r[0] for r in cur.fetchall()]


def list_blocks(state: str, district: str) -> list[str]:
    with _con() as con:
        cur = con.cursor()
        sk, dk, _, _ = _resolve_keys(cur, state, district)
        cur.execute(
            "SELECT DISTINCT block_name FROM locations WHERE state_key=? AND district_key=? ORDER BY block_name",
            (sk, dk),
        )
        return [r[0] for r in cur.fetchall()]


def list_villages(state: str, district: str, block: str | None = None) -> list[str]:
    with _con() as con:
        cur = con.cursor()
        sk, dk, bk, _ = _resolve_keys(cur, state, district, block)
        if bk:
            cur.execute(
                """SELECT DISTINCT village_name FROM locations
                   WHERE state_key=? AND district_key=? AND block_key=?
                   ORDER BY village_name""",
                (sk, dk, bk),
            )
        else:
            cur.execute(
                """SELECT DISTINCT village_name FROM locations
                   WHERE state_key=? AND district_key=?
                   ORDER BY village_name""",
                (sk, dk),
            )
        return [r[0] for r in cur.fetchall()]


def find_block_for_village(state: str, district: str, village: str) -> str | None:
    with _con() as con:
        cur = con.cursor()
        sk, dk, _, vk = _resolve_keys(cur, state, district, village=village)
        cur.execute(
            """SELECT block_name FROM locations
               WHERE state_key=? AND district_key=? AND village_name=?
               LIMIT 1""",
            (sk, dk, village),
        )
        r = cur.fetchone()
        if r:
            return r[0]
        cur.execute(
            """SELECT block_name FROM locations
               WHERE state_key=? AND district_key=? AND village_key LIKE ?
               LIMIT 1""",
            (sk, dk, f"%{vk}%"),
        )
        r = cur.fetchone()
        return r[0] if r else None


def get_village_nutrients(
    state: str,
    district: str,
    block: str,
    village: str,
    year: str | None = None,
    language: str = "en",
) -> dict[str, Any]:
    """
    Return all nutrient records for a village.

    Each row in the result represents one (nutrient_name, nutrient_level) combination
    with the sample count (value).  Multiple rows for the same nutrient reflect
    the distribution of soil samples across levels.
    """
    sk = _norm(state)
    dk = _norm(district)
    bk = _norm(block)
    vk = _norm(village)

    sql = """
        SELECT year, state_name, state_code, district_name, district_code,
               block_name, block_code, village_name, village_code,
               nutrient_type, nutrient_name, nutrient_level, value
        FROM nutrients
        WHERE state_key=? AND district_key=? AND block_key=? AND village_key=?
    """
    params: list = [sk, dk, bk, vk]
    if year:
        sql += " AND year=?"
        params.append(year)
    sql += " ORDER BY nutrient_type, nutrient_name, nutrient_level"

    with _con() as con:
        cur = con.cursor()
        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]

    if not rows:
        return {
            "available": False,
            "level": "village",
            "state": state, "district": district,
            "block": block, "village": village,
            "message": f"No soil nutrient records found for {village}, {block}, {district}, {state}.",
            "suggestion": "Try searching at block or district level, or confirm the spelling matches the dataset.",
        }

    # Group by nutrient for a structured summary
    by_nutrient: dict[str, dict] = {}
    years_seen: set[str] = set()
    location_meta: dict = {}

    for r in rows:
        years_seen.add(r["year"])
        if not location_meta:
            location_meta = {
                "state":         r["state_name"],
                "state_code":    r["state_code"],
                "district":      r["district_name"],
                "district_code": r["district_code"],
                "block":         r["block_name"],
                "block_code":    r["block_code"],
                "village":       r["village_name"],
                "village_code":  r["village_code"],
            }
        nn = r["nutrient_name"]
        if nn not in by_nutrient:
            by_nutrient[nn] = {
                "nutrient_name":  nn,
                "nutrient_type":  r["nutrient_type"],
                "levels":         [],
                "total_samples":  0,
                "dominant_level": None,
            }
        count = r["value"] if r["value"] is not None else 0
        by_nutrient[nn]["levels"].append({
            "level": r["nutrient_level"],
            "sample_count": count,
        })
        by_nutrient[nn]["total_samples"] += count

    # Determine dominant level per nutrient (level with most samples)
    for nn, nd in by_nutrient.items():
        if nd["levels"]:
            nd["dominant_level"] = max(nd["levels"], key=lambda x: x["sample_count"])["level"]

    return {
        "available": True,
        "level":     "village",
        "location":  location_meta,
        "years":     sorted(years_seen),
        "nutrients": list(by_nutrient.values()),
        "raw_rows":  len(rows),
        "source":    "India Data Portal — Soil Health Card scheme (2024-25)",
        "value_interpretation": (
            "प्रत्येक 'नमूना संख्या' इस गाँव के लिए उस पोषक तत्व स्तर पर मूल्यांकित मिट्टी के नमूनों की संख्या है। यह एक सर्वेक्षण गिनती है, पोषक तत्व की सांद्रता नहीं।"
            if language == "hi" else
            "ஒவ்வொரு 'மாதிரி எண்ணிக்கை' என்பது இந்த கிராமத்திற்கான அந்த ஊட்டச்சத்து அளவில் மதிப்பிடப்பட்ட மண் மாதிரிகளின் எண்ணிக்கையாகும். இது ஒரு கணக்கெடுப்பு எண்ணிக்கை, ஊட்டச்சத்து செறிவு அல்ல."
            if language == "ta" else
            "ప్రతి 'నమూనా సంఖ్య' ఈ గ్రామానికి ఆ పోషక స్థాయిలో అంచనా వేయబడిన నేల నమూనాల సంఖ్య. ఇది సర్వే లెక్కింపు, పోషక సాంద్రత కాదు."
            if language == "te" else
            "ಪ್ರತಿಯೊಂದು 'ಮಾದರಿ ಸಂಖ್ಯೆ' ಈ ಗ್ರಾಮದ ಆ ಪೋಷಕಾಂಶ ಮಟ್ಟದಲ್ಲಿ ಮೌಲ್ಯಮಾಪನ ಮಾಡಲಾದ ಮಣ್ಣಿನ ಮಾದರಿಗಳ ಸಂಖ್ಯೆಯಾಗಿದೆ. ಇದು ಸಮೀಕ್ಷೆಯ ಎಣಿಕೆಯಾಗಿದೆ, ಪೋಷಕಾಂಶದ ಸಾಂದ್ರತೆಯಲ್ಲ."
            if language == "kn" else
            "ഓരോ 'സാമ്പിൾ എണ്ണവും' ഈ ഗ്രാമത്തിലെ ആ പോഷക നിലവാരത്തിൽ വിലയിരുത്തിയ മണ്ണ് സാമ്പിളുകളുടെ എണ്ണമാണ്. ഇത് ഒരു സർവേ എണ്ണമാണ്, പോഷക സാന്ദ്രതയല്ല."
            if language == "ml" else
            "ਹਰੇਕ 'ਨਮੂਨਾ ਗਿਣਤੀ' ਇਸ ਪਿੰਡ ਲਈ ਉਸ ਪੌਸ਼ਟਿਕ ਪੱਧਰ 'ਤੇ ਮੁਲਾਂਕਣ ਕੀਤੇ ਮਿੱਟੀ ਦੇ ਨਮੂਨਿਆਂ ਦੀ ਗਿਣਤੀ ਹੈ। ਇਹ ਇੱਕ ਸਰਵੇਖਣ ਗਿਣਤੀ ਹੈ, ਪੌਸ਼ਟਿਕ ਤੱਤ ਦੀ ਇਕਾਗਰਤਾ ਨਹੀਂ।"
            if language == "pa" else
            "ପ୍ରତ୍ୟେକ 'ନମୁନା ସଂଖ୍ୟା' ଏହି ଗ୍ରାମ ପାଇଁ ସେହି ପୋଷକ ତତ୍ତ୍ୱ ସ୍ତରରେ ମୂଲ୍ୟାଙ୍କନ କରାଯାଇଥିବା ମାଟି ନମୁନାର ସଂଖ୍ୟା ଅଟେ। ଏହା ଏକ ସର୍ବେକ୍ଷଣ ଗଣନା, ପୋଷକ ତତ୍ତ୍ୱ ସାନ୍ଦ୍ରତା ନୁହେଁ।"
            if language == "or" else
            "Each sample count is the number of soil samples rated at that nutrient level for this village. It is a survey count, not a nutrient concentration."
        ),
        "limitations": (
            "गाँव-स्तरीय समेकित सर्वेक्षण डेटा। व्यक्तिगत खेत की मिट्टी भिन्न हो सकती है। ये रिकॉर्ड 2024-25 मृदा स्वास्थ्य कार्ड अभियान से हैं। सटीक अनुशंसाओं के लिए, प्रयोगशाला में मिट्टी की जांच कराएं।"
            if language == "hi" else
            "கிராம அளவிலான ஒருங்கிணைந்த கணக்கெடுப்பு தரவு. தனிப்பட்ட பண்ணை மண் மாறுபடலாம். இந்த பதிவுகள் 2024-25 மண் சுகாதார அட்டை பிரச்சாரத்தின் தரவுகளாகும். துல்லியமான பரிந்துரைகளுக்கு, ஆய்வக மண் பரிசோதனை செய்யுங்கள்."
            if language == "ta" else
            "గ్రామ స్థాయి సర్వే డేటా. వ్యక్తిగత పొలం నేల భిన్నంగా ఉండవచ్చు. ఈ రికార్డులు 2024-25 సాయిల్ హెల్త్ కార్డ్ ప్రచారం నుండి సేకరించబడ్డాయి. ఖచ్చితమైన సిఫార్సుల కోసం, ప్రయోగశాలలో నేల పరీక్ష చేయించండి."
            if language == "te" else
            "ಗ್ರಾಮ ಮಟ್ಟದ ಸಮಗ್ರ ಸಮೀಕ್ಷೆ ಡೇಟಾ. ವೈಯಕ್ತಿಕ ಕೃಷಿ ಮಣ್ಣು ಬದಲಾಗಬಹುದು. ಈ ದಾಖಲೆಗಳು 2024-25 ರ ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್ ಅಭಿಯಾನದ ದಾಖಲೆಗಳಾಗಿವೆ. ನಿಖರವಾದ ಶಿಫಾರಸುಗಳಿಗಾಗಿ, ಪ್ರಯೋಗಾಲಯ ಮಣ್ಣಿನ ಪರೀಕ್ಷೆಯನ್ನು ಪಡೆಯಿರಿ."
            if language == "kn" else
            "ഗ്രാമതല സർവേ വിവരങ്ങൾ. വ്യക്തിഗത കൃഷിയിടങ്ങളിലെ മണ്ണ് വ്യത്യസ്തമായിരിക്കാം. ഈ രേഖകൾ 2024-25 ലെ സോയിൽ ഹെൽത്ത് കാർഡ് കാമ്പെയ്നിൽ നിന്നുള്ളതാണ്. കൃത്യമായ ശുപാർശകൾക്ക് ലബോറട്ടറി മണ്ണ് പരിശോധന നടത്തുക."
            if language == "ml" else
            "ਪਿੰਡ-ਪੱਧਰੀ ਸਰਵੇਖਣ ਡੇਟਾ। ਵਿਅਕਤੀਗਤ ਖੇਤ ਦੀ ਮਿੱਟੀ ਵੱਖਰੀ ਹੋ ਸਕਦੀ ਹੈ। ਇਹ ਰਿਕਾਰਡ 2024-25 ਮਿੱਟੀ ਸਿਹਤ ਕਾਰਡ ਮੁਹਿੰਮ ਦੇ ਹਨ। ਸਹੀ ਸਿਫ਼ਾਰਸ਼ਾਂ ਲਈ, ਲੈਬ ਵਿੱਚ ਮਿੱਟੀ ਦੀ ਪਰਖ ਕਰਵਾਓ।"
            if language == "pa" else
            "ଗ୍ରାମ ସ୍ତରୀୟ ସର୍ବେକ୍ଷଣ ତଥ୍ୟ | ବ୍ୟକ୍ତିଗତ କ୍ଷେତର ମାଟି ଭିନ୍ନ ହୋଇପାରେ | ଏହି ରେକର୍ଡଗୁଡ଼ିକ ୨୦୨୪-୨୫ ମୃତ୍ତିକା ସ୍ୱାସ୍ଥ୍ୟ କାର୍ଡ ଅଭିଯାନର ଅଟେ | ସଠିକ୍ ପରାମର୍ଶ ପାଇଁ, ଲାବୋରେଟୋରୀ ମାଟି ପରୀକ୍ଷା କରାନ୍ତୁ |"
            if language == "or" else
            "Village-level aggregated survey data. Individual farm soil may differ. These records are from the 2024-25 Soil Health Card campaign. For precise recommendations, obtain a laboratory soil test."
        ),
    }


def get_block_summary(state: str, district: str, block: str = "") -> dict[str, Any]:
    """District fallback: aggregate all villages in a block or district."""
    with _con() as con:
        cur = con.cursor()
        sk, dk, bk, _ = _resolve_keys(cur, state, district, block)
        if not bk:
            cur.execute("SELECT DISTINCT block_key, block_name FROM locations WHERE state_key=? AND district_key=? LIMIT 1", (sk, dk))
            r = cur.fetchone()
            if r:
                bk = r[0]
                if not block:
                    block = r[1]
        
        cur.execute(
            """SELECT nutrient_name, nutrient_type, nutrient_level,
                      SUM(value) as total_samples, COUNT(DISTINCT village_name) as villages
               FROM nutrients
               WHERE state_key=? AND district_key=? AND block_key=?
               GROUP BY nutrient_name, nutrient_level
               ORDER BY nutrient_name, nutrient_level""",
            (sk, dk, bk),
        )
        rows = [dict(r) for r in cur.fetchall()]

        # If no rows for this specific block, fallback to aggregating all blocks in the district
        if not rows:
            cur.execute(
                """SELECT nutrient_name, nutrient_type, nutrient_level,
                          SUM(value) as total_samples, COUNT(DISTINCT village_name) as villages
                   FROM nutrients
                   WHERE state_key=? AND district_key=?
                   GROUP BY nutrient_name, nutrient_level
                   ORDER BY nutrient_name, nutrient_level""",
                (sk, dk),
            )
            rows = [dict(r) for r in cur.fetchall()]

    if not rows:
        return {"available": False, "level": "block", "message": "No records for this block."}

    by_nutrient: dict[str, dict] = {}
    for r in rows:
        nn = r["nutrient_name"]
        if nn not in by_nutrient:
            by_nutrient[nn] = {
                "nutrient_name": nn, "nutrient_type": r["nutrient_type"],
                "levels": [], "total_samples": 0, "dominant_level": None,
                "villages_covered": r["villages"],
            }
        count = r["total_samples"] or 0
        by_nutrient[nn]["levels"].append({"level": r["nutrient_level"], "sample_count": count})
        by_nutrient[nn]["total_samples"] += count
        by_nutrient[nn]["villages_covered"] = max(by_nutrient[nn]["villages_covered"], r["villages"])
    for nn, nd in by_nutrient.items():
        if nd["levels"]:
            nd["dominant_level"] = max(nd["levels"], key=lambda x: x["sample_count"])["level"]

    return {
        "available": True, "level": "block",
        "state": state, "district": district, "block": block,
        "nutrients": list(by_nutrient.values()),
        "source": "India Data Portal — Soil Health Card scheme (2024-25)",
        "value_interpretation": "Aggregated sample counts across all villages in this block.",
        "limitations": "Block-level aggregation — individual village and farm values will differ.",
    }
