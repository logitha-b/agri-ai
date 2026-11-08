"""
Patches voice_api.py to:
1. Remove resolved missing_inputs when SAR/terrain data was successfully fetched
2. Call Gemini API to estimate river gauge conditions
3. Ask user conversationally for any field-specific missing inputs
"""
import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

with open('voice_api.py', 'r', encoding='utf-8') as f:
    content = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 1 — helper function _resolve_flood_missing_inputs
# Insert right before the primary flood_risk elif block (line ~1555)
# ─────────────────────────────────────────────────────────────────────────────
helper_fn = '''
async def _resolve_flood_missing_inputs(module_result: dict, genai_client) -> dict:
    """
    After fetching flood data:
    1. Remove 'Satellite' from missing_inputs if SAR was fetched successfully.
    2. Remove 'Elevation/DEM' from missing_inputs if soil/terrain data was fetched.
    3. Call Gemini to estimate river gauge conditions for the district (replaces CWC gap).
    4. Tag remaining items as 'needs_user_input' if they require farmer-provided data.
    Returns the mutated module_result.
    """
    if not module_result:
        return module_result

    sar_ok   = bool(module_result.get("sentinel_sar") and
                    module_result["sentinel_sar"].get("available") is not False and
                    module_result["sentinel_sar"].get("image_b64"))
    soil_ok  = bool(module_result.get("soil_terrain") and
                    module_result["soil_terrain"].get("available"))
    loc      = module_result.get("location", {})
    district = loc.get("district", "")
    state    = loc.get("state", "")

    # Filter missing_inputs — remove what we've now resolved
    original_missing = module_result.get("missing_inputs", [])
    remaining_missing = []
    needs_user_input  = []

    for item in original_missing:
        item_lower = item.lower()
        if sar_ok and ("satellite" in item_lower or "sentinel" in item_lower or "sar" in item_lower):
            pass  # Resolved — SAR image was fetched
        elif soil_ok and ("elevation" in item_lower or "dem" in item_lower or "terrain" in item_lower):
            pass  # Resolved — SoilGrids terrain data was fetched
        elif "gauge" in item_lower or "cwc" in item_lower or "river" in item_lower:
            # Try Gemini estimation for river gauge / river conditions
            river_estimate = None
            if genai_client and district:
                try:
                    import google.genai as _genai
                    prompt = (
                        f"You are a hydrology expert. Based on your knowledge of {district}, {state}, India:\\n"
                        f"1. Name the 2-3 major rivers or water channels that flow through or near {district}.\\n"
                        f"2. Describe their typical flood risk behaviour during Kharif season (July-October).\\n"
                        f"3. Based on the current time of year (October 2026), estimate whether river levels are likely HIGH, MODERATE, or LOW.\\n"
                        f"4. Mention any historically flood-prone areas near rivers in {district}.\\n"
                        f"Keep the answer to 4-5 sentences, factual and farmer-friendly."
                    )
                    resp = await genai_client.aio.models.generate_content(
                        model="gemini-2.0-flash",
                        contents=prompt,
                    )
                    river_estimate = resp.text.strip() if resp and resp.text else None
                except Exception:
                    pass
            if river_estimate:
                module_result["river_gauge_gemini"] = {
                    "available": True,
                    "source": "Gemini AI — expert hydrological knowledge",
                    "district": district,
                    "state": state,
                    "estimate": river_estimate,
                    "note": "This is an AI-estimated condition based on expert knowledge. For live CWC data, register at india-water.gov.in.",
                }
                # Don't add to missing — we've covered it with Gemini
            else:
                needs_user_input.append({
                    "field": "river_gauge",
                    "label": "River gauge / water level",
                    "question": f"Do you know the current water level in the rivers or canals near your farm in {district}? (e.g. 'high', 'normal', 'overflow')",
                })
        elif ("observation" in item_lower or "field" in item_lower or "farmer" in item_lower):
            needs_user_input.append({
                "field": "field_observation",
                "label": "Field observation",
                "question": "Can you describe what you observe in your field? (e.g. 'water logging', 'dry', 'normal')",
            })
        else:
            remaining_missing.append(item)

    module_result["missing_inputs"]  = remaining_missing
    module_result["needs_user_input"] = needs_user_input
    return module_result

'''

# Find insertion point — before the "elif module_id == 'flood_risk':" block in primary dispatch
# which is around line 1555
insert_marker = '    elif module_id == "flood_risk":\n        # Fetch ALL flood inputs in parallel including SAR satellite imagery + soil terrain\n        import asyncio as _afl_primary'
if insert_marker in content:
    content = content.replace(insert_marker, helper_fn + '\n' + insert_marker, 1)
    print('PATCH 1: helper function inserted')
else:
    print('ERROR: insert marker not found for patch 1')

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 2 — call _resolve_flood_missing_inputs after primary dispatch bundling
# ─────────────────────────────────────────────────────────────────────────────
old_primary_end = (
    '        module_result = _fr\n'
    '        if module_result:\n'
    '            module_result["rainfall"]     = _rr\n'
    '            module_result["dams"]         = (_dr   or {}).get("dams", [])\n'
    '            module_result["reservoirs"]   = (_rr2  or {}).get("reservoirs", [])\n'
    '            module_result["sentinel_sar"] = _sar   # Sentinel-1 SAR flood image\n'
    '            module_result["soil_terrain"] = _soil  # SoilGrids terrain/elevation context\n'
)
new_primary_end = (
    '        module_result = _fr\n'
    '        if module_result:\n'
    '            module_result["rainfall"]     = _rr\n'
    '            module_result["dams"]         = (_dr   or {}).get("dams", [])\n'
    '            module_result["reservoirs"]   = (_rr2  or {}).get("reservoirs", [])\n'
    '            module_result["sentinel_sar"] = _sar   # Sentinel-1 SAR flood image\n'
    '            module_result["soil_terrain"] = _soil  # SoilGrids terrain/elevation context\n'
    '            # Resolve missing inputs: remove fetched ones, use Gemini for river gauges\n'
    '            module_result = await _resolve_flood_missing_inputs(module_result, genai_client)\n'
)
if old_primary_end in content:
    content = content.replace(old_primary_end, new_primary_end, 1)
    print('PATCH 2: primary dispatch resolution call added')
else:
    print('ERROR: primary dispatch end not found')

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 3 — call _resolve_flood_missing_inputs after secondary dispatch bundling
# ─────────────────────────────────────────────────────────────────────────────
old_secondary_end = (
    '                    if flood_res:\n'
    '                        flood_res["rainfall"]       = rain_res\n'
    '                        flood_res["dams"]           = (dams_res or {}).get("dams", [])   # dam markers\n'
    '                        flood_res["reservoirs"]     = (reservoirs_res or {}).get("reservoirs", [])  # reservoir markers\n'
    '                        flood_res["sentinel_sar"]   = sar_res   # Sentinel-1 SAR flood image\n'
    '                        flood_res["soil_terrain"]   = soil_res  # SoilGrids terrain/elevation context\n'
    '                    return flood_res\n'
)
new_secondary_end = (
    '                    if flood_res:\n'
    '                        flood_res["rainfall"]       = rain_res\n'
    '                        flood_res["dams"]           = (dams_res or {}).get("dams", [])   # dam markers\n'
    '                        flood_res["reservoirs"]     = (reservoirs_res or {}).get("reservoirs", [])  # reservoir markers\n'
    '                        flood_res["sentinel_sar"]   = sar_res   # Sentinel-1 SAR flood image\n'
    '                        flood_res["soil_terrain"]   = soil_res  # SoilGrids terrain/elevation context\n'
    '                        # Resolve missing inputs: remove fetched, use Gemini for the rest\n'
    '                        flood_res = await _resolve_flood_missing_inputs(flood_res, genai_client)\n'
    '                    return flood_res\n'
)
if old_secondary_end in content:
    content = content.replace(old_secondary_end, new_secondary_end, 1)
    print('PATCH 3: secondary dispatch resolution call added')
else:
    print('ERROR: secondary dispatch end not found')

with open('voice_api.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('All patches applied.')
