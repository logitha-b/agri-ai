"""Debug raw Gemini responses for intent detection."""
import sys, os, json
sys.path.insert(0, ".")
from dotenv import load_dotenv
load_dotenv(".env")
from google import genai

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = os.getenv("GEMINI_MODEL","gemini-3.5-flash")

PROMPT = """You are an intent classifier for an Indian agricultural AI assistant.
Analyze this farmer's message (in ANY language) and identify which module(s) are needed.

Available modules:
- weather, flood_risk, market, schemes, production, crop_recommendation, cashflow, soil_nutrients, disease, crop_loss, lac_suitability, lac_forecast, lac_history, pearl_suitability, pearl_risk

Return ONLY a JSON array of 1-3 module IDs, e.g. ["flood_risk"] or ["flood_risk","market"].
If unclear, return [].

Message: {msg}

Return only a JSON array."""

tests = [
    "flood risk and market price for paddy",
    "soil health and crop recommendation",
    "paddy yield estimate Tamil Nadu",
    "what government schemes for paddy farmers Thiruvallur",
]

for msg in tests:
    r = client.models.generate_content(
        model=MODEL,
        contents=[{"role":"user","parts":[{"text":PROMPT.format(msg=msg)}]}]
    )
    raw = r.text.strip()
    print(f"Q: {msg}")
    print(f"RAW: {repr(raw[:200])}")
    try:
        parsed = json.loads(raw.strip("```json").strip("```").strip())
        print(f"OK: {parsed}")
    except Exception as e:
        print(f"FAIL: {e}")
    print()
