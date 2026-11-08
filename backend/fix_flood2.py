import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

with open('voice_api.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Gemini summarizer - give full flood risk context for better TTS text
old1 = '''        if module_id == "flood_risk":
            level = result.get("flood_risk_level") or result.get("overall_risk_level", "?")
            score = result.get("flood_risk_score", result.get("overall_risk_score", "?"))
            return f"\\nFLOOD RISK: {level} (score {score}/100)\\n"'''

new1 = '''        if module_id == "flood_risk":
            risk_level = result.get("risk_level") or result.get("flood_risk_level") or result.get("overall_risk_level", "?")
            RISK_LABELS = {
                "NO_ELEVATED_RISK":  "No Elevated Risk Detected",
                "ELEVATED_RISK":     "Elevated Risk Detected",
                "OBSERVED_FLOODING": "Active Flooding Observed",
                "INSUFFICIENT_DATA": "Insufficient Data",
            }
            risk_label   = RISK_LABELS.get(risk_level, risk_level)
            summary_txt  = result.get("summary", "")
            loc          = result.get("location", {})
            loc_str      = f"{loc.get('district','')}, {loc.get('state','')}" if loc else ""
            evidence     = result.get("evidence", [])
            ev_lines     = []
            for ev in evidence[:4]:
                ev_lines.append(f"  {ev.get('signal','')}: {ev.get('value','')} (threshold: {ev.get('threshold','')})")
            ev_txt       = "\\n".join(ev_lines)
            missing      = result.get("missing_inputs", [])
            miss_txt     = "\\n".join(f"  - {m}" for m in missing[:3]) if missing else ""
            precautions  = result.get("precautions", [])
            prec_txt     = "\\n".join(f"  - {p}" for p in precautions[:3]) if precautions else ""
            return (
                f"\\nFLOOD & WATER RISK for {loc_str} (assessed {result.get('assessment_date','today')}):\\n"
                f"  RISK LEVEL: {risk_label}\\n"
                f"  Summary: {summary_txt}\\n"
                f"  Key evidence signals:\\n{ev_txt}\\n"
                + (f"  Missing data (may carry hidden risk):\\n{miss_txt}\\n" if miss_txt else "")
                + (f"  Recommended actions:\\n{prec_txt}\\n" if prec_txt else "")
                + f"  INSTRUCTION TO AI: Start your answer by clearly stating '{risk_label} for {loc_str}'. "
                  f"Then explain the key evidence signals in plain language. "
                  f"Warn the farmer about the 3 missing inputs and what risks they may hide. "
                  f"End with the 3 recommended actions.\\n"
            )'''

if old1 in content:
    content = content.replace(old1, new1, 1)
    print('Fix 1 applied: flood risk summarizer improved')
else:
    print('Fix 1 NOT FOUND')

# Fix 2: Primary dispatch for flood_risk - also fetch dams/reservoirs/rainfall
old2 = '''    elif module_id == "flood_risk":
        module_result = await _get(f"{HEALTH_API}/api/water/flood-risk?lat={lat}&lng={lng}&state={state}&district={district}")'''

new2 = '''    elif module_id == "flood_risk":
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

if old2 in content:
    content = content.replace(old2, new2, 1)
    print('Fix 2 applied: primary flood_risk dispatch now fetches dams/reservoirs/rainfall')
else:
    print('Fix 2 NOT FOUND')

with open('voice_api.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done.')
