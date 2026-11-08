# scripts/build_offline_dictionaries.py
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCALES_DIR = ROOT / "src" / "i18n" / "locales"
CACHE_FILE = ROOT / "scripts" / "new_translations_cache.json"
NEW_STRINGS_FILE = ROOT / "scripts" / "new_strings.json"

LANGS = ["hi", "ta", "te", "kn", "ml", "pa", "or"]

def fetch_translation(text: str, target_lang: str, retries: int = 3) -> str:
    cleaned = text.strip()
    if not cleaned:
        return text

    url = f"https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl={target_lang}&q={urllib.parse.quote(cleaned)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=8) as res:
                data = json.loads(res.read().decode("utf-8"))
                if isinstance(data, list) and len(data) > 0:
                    val = data[0]
                    if isinstance(val, list) and len(val) > 0:
                        return str(val[0])
                    return str(val)
                return cleaned
        except Exception:
            if attempt == retries - 1:
                return cleaned
            time.sleep(0.5 * (attempt + 1))
    return cleaned

def translate_phrase_all_langs(phrase: str, existing_cache: dict) -> tuple[str, dict]:
    if phrase in existing_cache:
        cached = existing_cache[phrase]
        if all(l in cached for l in LANGS):
            return phrase, cached

    result = existing_cache.get(phrase, {"en": phrase})
    result["en"] = phrase
    for lang in LANGS:
        if lang not in result or not result[lang]:
            result[lang] = fetch_translation(phrase, lang)
            time.sleep(0.04) # polite pacing
    return phrase, result

def main():
    if not NEW_STRINGS_FILE.exists():
        print(f"Error: {NEW_STRINGS_FILE} not found.")
        sys.exit(1)

    with open(NEW_STRINGS_FILE, "r", encoding="utf-8") as f:
        new_strings = json.load(f)

    print(f"Loaded {len(new_strings)} total strings.")

    cache = {}
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                cache = json.load(f)
            print(f"Loaded {len(cache)} existing cached translations.")
        except Exception:
            cache = {}

    to_process = [s for s in new_strings if s not in cache or not all(l in cache.get(s, {}) for l in LANGS)]
    print(f"Strings requiring translation: {len(to_process)}")

    if to_process:
        completed = 0
        total = len(to_process)
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_phrase = {
                executor.submit(translate_phrase_all_langs, phrase, cache): phrase
                for phrase in to_process
            }

            for future in as_completed(future_to_phrase):
                phrase = future_to_phrase[future]
                try:
                    p, res = future.result()
                    cache[p] = res
                    completed += 1
                    if completed % 20 == 0 or completed == total:
                        print(f"Progress: {completed}/{total} ({completed/total*100:.1f}%)")
                        with open(CACHE_FILE, "w", encoding="utf-8") as f:
                            json.dump(cache, f, ensure_ascii=False, indent=2)
                except Exception as e:
                    print(f"Error translating '{phrase}': {e}")

    # Final cache save
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    # Now merge into each locale's translation.json
    all_langs = ["en"] + LANGS
    for lang in all_langs:
        loc_file = LOCALES_DIR / lang / "translation.json"
        existing_dict = {}
        if loc_file.exists():
            with open(loc_file, "r", encoding="utf-8") as f:
                existing_dict = json.load(f)

        added = 0
        for phrase, trans_map in cache.items():
            if phrase not in existing_dict or not existing_dict[phrase]:
                existing_dict[phrase] = trans_map.get(lang, phrase if lang == "en" else "")
                added += 1

        with open(loc_file, "w", encoding="utf-8") as f:
            json.dump(existing_dict, f, ensure_ascii=False, indent=2)
        print(f"Updated {lang}/translation.json: added {added} entries (total: {len(existing_dict)} keys)")

    print("\nTranslation generation complete! Next step: compile bundles and update DOM translator.")

if __name__ == "__main__":
    main()
