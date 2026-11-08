with open('voice_api.py', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''                if mid == "flood_risk":
                    # Fetch flood risk + IMD rainfall in parallel (same as the Water & Flood Risk page)
                    import asyncio as _afl
                    flood_url    = f"{HEALTH_API}/api/water/flood-risk?lat={lat}&lng={lng}&state={state}&district={district}"
                    rainfall_url = f"{HEALTH_API}/api/water/rainfall?state={state}&district={district}&days=30"
                    flood_res, rain_res = await _afl.gather(
                        _get(flood_url),
                        _get(rainfall_url),
                        return_exceptions=True,
                    )
                    if isinstance(flood_res, Exception): flood_res = None
                    if isinstance(rain_res, Exception):  rain_res  = None
                    if flood_res:
                        flood_res["rainfall"] = rain_res  # bundle together for renderer
                    return flood_res'''

new = '''                if mid == "flood_risk":
                    # Fetch flood risk + rainfall + dams + reservoirs in parallel
                    import asyncio as _afl
                    flood_url    = f"{HEALTH_API}/api/water/flood-risk?lat={lat}&lng={lng}&state={state}&district={district}"
                    rainfall_url = f"{HEALTH_API}/api/water/rainfall?state={state}&district={district}&days=30"
                    dams_url     = f"{HEALTH_API}/api/water/dams/near?lat={lat}&lng={lng}&radius_km=100&limit=50"
                    res_url      = f"{HEALTH_API}/api/water/reservoirs/near?lat={lat}&lng={lng}&radius_km=100&limit=50"
                    flood_res, rain_res, dams_res, reservoirs_res = await _afl.gather(
                        _get(flood_url), _get(rainfall_url),
                        _get(dams_url),  _get(res_url),
                        return_exceptions=True,
                    )
                    if isinstance(flood_res, Exception):      flood_res      = None
                    if isinstance(rain_res, Exception):       rain_res       = None
                    if isinstance(dams_res, Exception):       dams_res       = None
                    if isinstance(reservoirs_res, Exception): reservoirs_res = None
                    if flood_res:
                        flood_res["rainfall"]   = rain_res
                        flood_res["dams"]       = (dams_res or {}).get("dams", [])
                        flood_res["reservoirs"] = (reservoirs_res or {}).get("reservoirs", [])
                    return flood_res'''

if old in content:
    content = content.replace(old, new, 1)
    with open('voice_api.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: flood_risk dispatch updated with dams/reservoirs')
else:
    print('ERROR: pattern not found')
    idx = content.find('if mid == "flood_risk"')
    print('Found at idx:', idx)
    print(repr(content[idx:idx+600]))
