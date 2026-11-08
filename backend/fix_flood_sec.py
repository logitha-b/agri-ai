with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines 2315-2321 (0-indexed 2314-2320):
# 2315:                     if flood_res:
# 2316:                         flood_res["rainfall"]       = rain_res
# 2317:                         flood_res["dams"]           = (dams_res or {}).get("dams", [])
# 2318:                         flood_res["reservoirs"]     = (reservoirs_res or {}).get("reservoirs", [])
# 2319:                         flood_res["sentinel_sar"]   = sar_res   # Sentinel-1 SAR flood image
# 2320:                         flood_res["soil_terrain"]   = soil_res  # SoilGrids terrain/elevation context
# 2321:                     return flood_res

new_lines = [
    '                    if flood_res:\n',
    '                        flood_res["rainfall"]       = rain_res\n',
    '                        flood_res["dams"]           = (dams_res or {}).get("dams", [])\n',
    '                        flood_res["reservoirs"]     = (reservoirs_res or {}).get("reservoirs", [])\n',
    '                        flood_res["sentinel_sar"]   = sar_res   # Sentinel-1 SAR flood image\n',
    '                        flood_res["soil_terrain"]   = soil_res  # SoilGrids terrain/elevation context\n',
    '                        # Resolve missing inputs: remove fetched, use Gemini for river gauges\n',
    '                        flood_res = await _resolve_flood_missing_inputs(flood_res, genai_client)\n',
    '                    return flood_res\n',
]

# Verify lines 2314-2320 (0-indexed)
expected = [
    '                    if flood_res:\n',
    '                        flood_res["rainfall"]       = rain_res\n',
    '                        flood_res["dams"]           = (dams_res or {}).get("dams", [])\n',
    '                        flood_res["reservoirs"]     = (reservoirs_res or {}).get("reservoirs", [])\n',
    '                        flood_res["sentinel_sar"]   = sar_res   # Sentinel-1 SAR flood image\n',
    '                        flood_res["soil_terrain"]   = soil_res  # SoilGrids terrain/elevation context\n',
    '                    return flood_res\n',
]

# Find exact block
found = False
for i in range(len(lines)-6):
    if lines[i:i+7] == expected:
        lines[i:i+7] = new_lines
        found = True
        print(f'Patched at line {i+1}')
        break

if not found:
    print('Not found by exact match. Trying fuzzy...')
    for i, ln in enumerate(lines, 1):
        if 2314 <= i <= 2322:
            print(f'{i}: {repr(ln)}')

with open('voice_api.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Done.')
