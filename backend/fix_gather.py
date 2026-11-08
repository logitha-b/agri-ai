import sys, py_compile
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Replace lines 2237-2265 (0-indexed: 2236-2264)
# Old: _tpost with t=35.0, and gather WITHOUT report
# New: _tpost with t=70.0, and gather WITH report as 8th item

OLD_START = 2236  # 0-indexed, line 2237 "_tpost" definition
OLD_END   = 2265  # 0-indexed inclusive, line 2266 (blank after }, t=35.0)

NEW_BLOCK = '''            async def _tpost(url, body, t=70.0):
                try:
                    return await _ch_aio.wait_for(_post(url, body), timeout=t)
                except Exception:
                    return None

            # Fire ALL calls in parallel — report runs concurrently with satellite/weather
            _report_body = {
                "crop":         crop,
                "sowing_date":  sowing_date,
                "lat":          lat,
                "lng":          lng,
                "variety":      variety_hint,
                "field_area_ha": field_area_ha,
            }

            (
                _sat_res, _ndvi_res, _flood_sar_res, _soil_grids_res,
                _weather_res, _rainfall_res, _blocks_res, _report_res,
            ) = await _ch_aio.gather(
                _tget(_sat_url,      8.0),   # Copernicus sat — fast fail OK
                _tget(_ndvi_url,     8.0),   # Copernicus NDVI — fast fail OK
                _tget(_flood_url,    8.0),   # Copernicus SAR  — fast fail OK
                _tget(_soil_url,     12.0),  # SoilGrids
                _tget(_weather_url,  12.0),  # NASA POWER
                _tget(_rainfall_url, 12.0),  # IMD rainfall
                _tget(_blocks_url,   8.0),   # Soil block list
                _tpost(f"{HEALTH_API}/api/health/report", _report_body, t=70.0),
                return_exceptions=True,
            )

            # Normalise report exception → None
            if isinstance(_report_res, Exception):
                _report_res = None

'''

# Verify we're replacing the right content
old_block_sample = lines[OLD_START][:60]
print(f"OLD line {OLD_START+1}: {repr(old_block_sample)}")
print(f"Replacing lines {OLD_START+1}–{OLD_END+1}")

lines_new = lines[:OLD_START] + [NEW_BLOCK] + lines[OLD_END+1:]
print(f"Lines: {len(lines)} → {len(lines_new)}")

with open('voice_api.py', 'w', encoding='utf-8') as f:
    f.writelines(lines_new)

try:
    py_compile.compile('voice_api.py', doraise=True)
    print('SYNTAX OK')
except py_compile.PyCompileError as e:
    print(f'SYNTAX ERROR: {e}')
