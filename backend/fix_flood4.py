import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

with open('voice_api.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the secondary dispatch flood_risk (in _dispatch_module)
old_secondary = '''                if mid == "flood_risk":
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

new_secondary = '''                if mid == "flood_risk":
                    # Fetch ALL flood inputs in parallel — including SAR satellite + soil terrain
                    import asyncio as _afl
                    flood_url    = f"{HEALTH_API}/api/water/flood-risk?lat={lat}&lng={lng}&state={state}&district={district}"
                    rainfall_url = f"{HEALTH_API}/api/water/rainfall?state={state}&district={district}&days=30"
                    dams_url     = f"{HEALTH_API}/api/water/dams/near?lat={lat}&lng={lng}&radius_km=100&limit=50"
                    res_url      = f"{HEALTH_API}/api/water/reservoirs/near?lat={lat}&lng={lng}&radius_km=100&limit=50"
                    sar_url      = f"{HEALTH_API}/api/health/flood?lat={lat}&lng={lng}&days_back=14"
                    soil_url     = f"{HEALTH_API}/api/health/soil?lat={lat}&lng={lng}"
                    flood_res, rain_res, dams_res, reservoirs_res, sar_res, soil_res = await _afl.gather(
                        _get(flood_url), _get(rainfall_url),
                        _get(dams_url),  _get(res_url),
                        _get(sar_url),   _get(soil_url),
                        return_exceptions=True,
                    )
                    if isinstance(flood_res, Exception):      flood_res      = None
                    if isinstance(rain_res, Exception):       rain_res       = None
                    if isinstance(dams_res, Exception):       dams_res       = None
                    if isinstance(reservoirs_res, Exception): reservoirs_res = None
                    if isinstance(sar_res, Exception):        sar_res        = None
                    if isinstance(soil_res, Exception):       soil_res       = None
                    if flood_res:
                        flood_res["rainfall"]       = rain_res
                        flood_res["dams"]           = (dams_res or {}).get("dams", [])
                        flood_res["reservoirs"]     = (reservoirs_res or {}).get("reservoirs", [])
                        flood_res["sentinel_sar"]   = sar_res   # Sentinel-1 SAR flood image
                        flood_res["soil_terrain"]   = soil_res  # SoilGrids terrain/elevation context
                    return flood_res'''

if old_secondary in content:
    content = content.replace(old_secondary, new_secondary, 1)
    print('Secondary dispatch updated')
else:
    print('ERROR: secondary dispatch pattern not found')

# Fix the primary dispatch flood_risk
old_primary = '''    elif module_id == "flood_risk":
        import asyncio as _afl_primary
        _flood_url    = f"{HEALTH_API}/api/water/flood-risk?lat={lat}&lng={lng}&state={state}&district={district}"
        _rainfall_url = f"{HEALTH_API}/api/water/rainfall?state={state}&district={district}&days=30"
        _dams_url     = f"{HEALTH_API}/api/water/dams/near?lat={lat}&lng={lng}&radius_km=100&limit=50"
        _res_url      = f"{HEALTH_API}/api/water/reservoirs/near?lat={lat}&lng={lng}&radius_km=100&limit=50"
        _fr, _rr, _dr, _rr2 = await _afl_primary.gather(
            _get(_flood_url), _get(_rainfall_url), _get(_dams_url), _get(_res_url),
            return_exceptions=True,
        )
        if isinstance(_fr,  Exception): _fr  = None
        if isinstance(_rr,  Exception): _rr  = None
        if isinstance(_dr,  Exception): _dr  = None
        if isinstance(_rr2, Exception): _rr2 = None
        module_result = _fr
        if module_result:
            module_result["rainfall"]   = _rr
            module_result["dams"]       = (_dr  or {}).get("dams", [])
            module_result["reservoirs"] = (_rr2 or {}).get("reservoirs", [])'''

new_primary = '''    elif module_id == "flood_risk":
        # Fetch ALL flood inputs in parallel including SAR satellite imagery + soil terrain
        import asyncio as _afl_primary
        _flood_url    = f"{HEALTH_API}/api/water/flood-risk?lat={lat}&lng={lng}&state={state}&district={district}"
        _rainfall_url = f"{HEALTH_API}/api/water/rainfall?state={state}&district={district}&days=30"
        _dams_url     = f"{HEALTH_API}/api/water/dams/near?lat={lat}&lng={lng}&radius_km=100&limit=50"
        _res_url      = f"{HEALTH_API}/api/water/reservoirs/near?lat={lat}&lng={lng}&radius_km=100&limit=50"
        _sar_url      = f"{HEALTH_API}/api/health/flood?lat={lat}&lng={lng}&days_back=14"
        _soil_url     = f"{HEALTH_API}/api/health/soil?lat={lat}&lng={lng}"
        _fr, _rr, _dr, _rr2, _sar, _soil = await _afl_primary.gather(
            _get(_flood_url), _get(_rainfall_url),
            _get(_dams_url),  _get(_res_url),
            _get(_sar_url),   _get(_soil_url),
            return_exceptions=True,
        )
        for _v, _n in [(_fr,'_fr'),(_rr,'_rr'),(_dr,'_dr'),(_rr2,'_rr2'),(_sar,'_sar'),(_soil,'_soil')]:
            if isinstance(_v, Exception): locals()[_n] = None
        if isinstance(_fr,   Exception): _fr   = None
        if isinstance(_rr,   Exception): _rr   = None
        if isinstance(_dr,   Exception): _dr   = None
        if isinstance(_rr2,  Exception): _rr2  = None
        if isinstance(_sar,  Exception): _sar  = None
        if isinstance(_soil, Exception): _soil = None
        module_result = _fr
        if module_result:
            module_result["rainfall"]     = _rr
            module_result["dams"]         = (_dr   or {}).get("dams", [])
            module_result["reservoirs"]   = (_rr2  or {}).get("reservoirs", [])
            module_result["sentinel_sar"] = _sar   # Sentinel-1 SAR flood image
            module_result["soil_terrain"] = _soil  # SoilGrids terrain/elevation context'''

if old_primary in content:
    content = content.replace(old_primary, new_primary, 1)
    print('Primary dispatch updated')
else:
    print('ERROR: primary dispatch pattern not found')

with open('voice_api.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done.')
