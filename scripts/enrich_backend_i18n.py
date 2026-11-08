# -*- coding: utf-8 -*-
import json
from pathlib import Path

# Load static translations
static_path = Path("backend/data/translations_static.json")
static_data = json.loads(static_path.read_text(encoding="utf-8"))

# Load current backend/i18n.py
i18n_path = Path("backend/i18n.py")
content = i18n_path.read_text(encoding="utf-8")

# Let's inspect the translation dictionary in backend/i18n.py
# We can enhance translate_phrase to consult translations_static.json if not in TRANSLATIONS
old_translate_phrase = '''def translate_phrase(phrase: str, lang: str = "en") -> str:
    """Translates a phrase if available, otherwise returns the original phrase."""
    if not phrase or lang == "en":
        return phrase
    p_dict = TRANSLATIONS.get(lang, {})
    if phrase in p_dict:
        return p_dict[phrase]
    # Check lowercase
    p_lower = phrase.strip().lower()
    for k, v in p_dict.items():
        if k.lower() == p_lower:
            return v
    return phrase'''

new_translate_phrase = '''_STATIC_CACHE: dict[str, dict[str, str]] | None = None

def _get_static_translations() -> dict[str, dict[str, str]]:
    global _STATIC_CACHE
    if _STATIC_CACHE is None:
        try:
            from pathlib import Path
            import json
            sp = Path(__file__).resolve().parent / "data" / "translations_static.json"
            if sp.is_file():
                _STATIC_CACHE = json.loads(sp.read_text(encoding="utf-8"))
            else:
                _STATIC_CACHE = {}
        except Exception:
            _STATIC_CACHE = {}
    return _STATIC_CACHE

def translate_phrase(phrase: str, lang: str = "en") -> str:
    """Translates a phrase if available, otherwise returns the original phrase."""
    if not phrase or lang == "en":
        return phrase
    p_dict = TRANSLATIONS.get(lang, {})
    if phrase in p_dict:
        return p_dict[phrase]
    p_lower = phrase.strip().lower()
    for k, v in p_dict.items():
        if k.lower() == p_lower:
            return v
    # Check static cache (1591 keys across all 8 languages)
    static_dict = _get_static_translations().get(lang, {})
    if phrase in static_dict:
        return static_dict[phrase]
    if phrase.strip() in static_dict:
        return static_dict[phrase.strip()]
    for k, v in static_dict.items():
        if k.lower() == p_lower:
            return v
    return phrase'''

if old_translate_phrase in content:
    content = content.replace(old_translate_phrase, new_translate_phrase)
    i18n_path.write_text(content, encoding="utf-8")
    print("Successfully enhanced translate_phrase in backend/i18n.py!")
else:
    print("Warning: old_translate_phrase pattern not matched.")
