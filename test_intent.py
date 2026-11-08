"""Test Gemini multilingual intent detection."""
import sys, os, json, asyncio
sys.path.insert(0, ".")
from dotenv import load_dotenv
load_dotenv(".env")
from google import genai

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
os.environ["GEMINI_MODEL"] = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

from backend.voice_api import _detect_intents_gemini

tests = [
    ("என் நெல் வயலில் வெள்ளம் வருமா?", {}, "Tamil: flood risk for paddy field"),
    ("flood risk and market price for paddy", {"crop":"Paddy"}, "Multi-intent: flood + market"),
    ("నా వ్యవసాయ రుణం గురించి చెప్పు", {}, "Telugu: farm loan (schemes+cashflow)"),
    ("soil health and crop recommendation", {"state":"Tamil Nadu"}, "Multi: soil + recommendation"),
    ("my crop is damaged by flood need insurance", {"crop":"Paddy"}, "crop_loss + schemes"),
    ("paddy yield estimate Tamil Nadu", {"state":"Tamil Nadu"}, "production"),
    ("नमस्ते", {}, "Hindi greeting — should return []"),
    ("what government schemes for paddy farmers Thiruvallur", {"crop":"Paddy"}, "schemes"),
    ("pearl culture suitability in West Bengal", {}, "pearl_suitability"),
    ("What is the weather and flood risk in Jharkhand", {}, "weather + flood"),
]

async def run():
    for msg, ctx, desc in tests:
        ids = await _detect_intents_gemini(msg, [], ctx, client)
        print(f"  [{', '.join(ids) or 'none':40}] {desc}")
        print(f"   Q: {msg[:60]}")
        print()

asyncio.run(run())
