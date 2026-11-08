import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
import py_compile, datetime

with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the 'elif module_id == "crop_loss":' block and what comes after to find insert point
# We want to find 'elif module_id == "disease":' and insert our crop_health block BEFORE it
# OR find where crop_health currently is and replace it

# Find the disease block (line ~2084)
disease_line = None
for i, ln in enumerate(lines):
    if 'elif module_id == "disease":' in ln:
        disease_line = i
        print(f'Disease block at line {i+1}')
        break

if disease_line is None:
    print('ERROR: disease block not found')
    exit(1)

# Show surrounding context
print(f'Line {disease_line}: {repr(lines[disease_line][:80])}')
print(f'Line {disease_line-1}: {repr(lines[disease_line-1][:80])}')

# Insert the crop_health block BEFORE the disease block
# But first check if crop_health already has a proper block
crop_health_primary = None
for i, ln in enumerate(lines):
    if 'elif module_id == "crop_health":' in ln:
        crop_health_primary = i
        print(f'crop_health primary at line {i+1}')
        break

crop_health_block = '''
    elif module_id == "crop_health":
        # ── Crop Health: collect params, call all satellite + report APIs ──────
        # Required: lat/lng + crop. Optional: sowing_date, field_area_ha, variety
        import asyncio as _ch_aio

        # Extract sowing date — accept YYYY-MM-DD or DD-MM-YYYY
        raw_sowing = (
            str(extracted.get("sowing_date", "") or "").strip()
            or str(extracted.get("planting_date", "") or "").strip()
        )
        sowing_date = None
        if raw_sowing:
            import re as _re_ch
            if _re_ch.match(r"\\d{4}-\\d{2}-\\d{2}", raw_sowing):
                sowing_date = raw_sowing[:10]
            elif _re_ch.match(r"\\d{2}[-/]\\d{2}[-/]\\d{4}", raw_sowing):
                parts = _re_ch.split(r"[-/]", raw_sowing)
                try:
                    sowing_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
                except Exception:
                    sowing_date = None

        # Default sowing date: 70 days ago (typical Kharif mid-season)
        if not sowing_date:
            _default_sow = (
                __import__("datetime").date.today()
                - __import__("datetime").timedelta(days=70)
            )
            sowing_date = _default_sow.strftime("%Y-%m-%d")

        # Field area
        field_area_ha = None
        for _fa_key in ("land_area_hectares", "field_area_ha", "land_area_acres"):
            _fa_val = extracted.get(_fa_key)
            if _fa_val:
                try:
                    _fa_f = float(_fa_val)
                    field_area_ha = _fa_f if "acre" not in _fa_key else round(_fa_f * 0.404686, 3)
                except (TypeError, ValueError):
                    pass
                break

        variety_hint = str(extracted.get("variety", "") or "").strip() or None

        # Missing required info → ask
        if not lat or not lng:
            module_result = {
                "available": False,
                "needs_clarification": True,
                "missing_params": ["location"],
                "have_params": {
                    "crop": crop or None,
                    "sowing_date": sowing_date,
                    "field_area_ha": field_area_ha,
                },
                "clarification_prompt": (
                    f"To run the Crop Health satellite analysis"
                    f"{f' for your {crop}' if crop else ''}, I need your field location. "
                    "Please provide your village/town, district, state, and PIN code."
                ),
            }
        elif not crop:
            module_result = {
                "available": False,
                "needs_clarification": True,
                "missing_params": ["crop"],
                "have_params": {
                    "lat": lat, "lng": lng,
                    "state": state, "district": district,
                    "sowing_date": sowing_date,
                },
                "clarification_prompt": (
                    "I have your field location. Which crop are you growing? "
                    "(e.g. Paddy, Maize, Cotton, Sugarcane, Groundnut)"
                ),
            }
        else:
            # Call ALL APIs in parallel
            _sat_url      = f"{HEALTH_API}/api/health/satellite?lat={lat}&lng={lng}&days_back=30"
            _ndvi_url     = f"{HEALTH_API}/api/health/ndvi?lat={lat}&lng={lng}&days_back=30"
            _flood_url    = f"{HEALTH_API}/api/health/flood?lat={lat}&lng={lng}&days_back=14"
            _soil_url     = f"{HEALTH_API}/api/health/soil?lat={lat}&lng={lng}"
            _weather_url  = f"{HEALTH_API}/api/health/weather?lat={lat}&lng={lng}&days=30"
            _rainfall_url = f"{HEALTH_API}/api/water/rainfall?state={state}&district={district}&days=30"
            _blocks_url   = f"{HEALTH_API}/api/soil/blocks?state={state}&district={district}"

            (
                _sat_res, _ndvi_res, _flood_sar_res, _soil_grids_res,
                _weather_res, _rainfall_res, _blocks_res,
            ) = await _ch_aio.gather(
                _get(_sat_url), _get(_ndvi_url), _get(_flood_url),
                _get(_soil_url), _get(_weather_url), _get(_rainfall_url),
                _get(_blocks_url),
                return_exceptions=True,
            )

            # Fetch the AI crop report (POST with sowing_date required)
            _report_res = await _post(f"{HEALTH_API}/api/health/report", {
                "crop":         crop,
                "sowing_date":  sowing_date,
                "lat":          lat,
                "lng":          lng,
                "variety":      variety_hint,
                "field_area_ha": field_area_ha,
            })

            # Fetch soil block summary if blocks available
            _soil_block_summary = None
            _blks = (_blocks_res or {}).get("blocks", []) if not isinstance(_blocks_res, Exception) else []
            if _blks:
                _sbs = await _get(
                    f"{HEALTH_API}/api/soil/block-summary"
                    f"?state={state}&district={district}&block={_blks[0]}"
                )
                if _sbs and not isinstance(_sbs, Exception) and _sbs.get("available"):
                    _soil_block_summary = _sbs

            module_result = {
                "available": True,
                "crop": crop,
                "variety": variety_hint,
                "sowing_date": sowing_date,
                "field_area_ha": field_area_ha,
                "location": {
                    "lat": lat, "lng": lng,
                    "state": state, "district": district,
                    "display": f"{district}, {state}" if district else state,
                },
                # Satellite layers
                "satellite": (
                    None if isinstance(_sat_res, Exception)
                    else _sat_res
                ),
                "ndvi": (
                    None if isinstance(_ndvi_res, Exception)
                    else _ndvi_res
                ),
                "flood_sar": (
                    None if isinstance(_flood_sar_res, Exception)
                    else _flood_sar_res
                ),
                # Soil from SoilGrids
                "soil_grids": (
                    None if isinstance(_soil_grids_res, Exception)
                    else _soil_grids_res
                ),
                # Soil Health Card nutrient data
                "soil_nutrients": _soil_block_summary,
                # Weather & water
                "weather": (
                    None if isinstance(_weather_res, Exception)
                    else _weather_res
                ),
                "rainfall": (
                    None if isinstance(_rainfall_res, Exception)
                    else _rainfall_res
                ),
                # AI crop health report
                "report": _report_res,
            }
'''

# Insert before disease block
if crop_health_primary is not None:
    print(f'WARNING: crop_health already present at line {crop_health_primary+1} — skipping insert')
else:
    lines.insert(disease_line, crop_health_block)
    print(f'Inserted crop_health block at line {disease_line+1}')

with open('voice_api.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

try:
    py_compile.compile('voice_api.py', doraise=True)
    print('Syntax OK')
except py_compile.PyCompileError as e:
    print(f'Syntax error: {e}')
