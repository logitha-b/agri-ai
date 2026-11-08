import re
from pathlib import Path

target_file = Path("c:/Users/nemol/OneDrive/Desktop/agri/backend/voice_api.py")
code = target_file.read_text(encoding="utf-8")

# 1. Update MODULE_REGISTRY
old_registry = '''    "lac_suitability": {
        "description": "Lac cultivation suitability for a location",
        "route": "/lac",
        "api":   "/api/lac/env-risk",
        "keywords": ["lac","lac culture","lac suitability","lac cultivation","host tree","lac zone","rangeeni","kusmi","flemingia","ber","kusum"],
    },
    "lac_forecast": {
        "description": "Lac production forecast for a state",
        "route": "/lac",
        "api":   "/api/lac/forecast",
        "keywords": ["lac forecast","lac production","lac output","lac yield"],
    },
    "lac_history": {
        "description": "Historical lac production data",
        "route": "/lac",
        "api":   "/api/lac/historical",
        "keywords": ["lac history","lac data","past lac","historical lac","lac statistics","lac 2012","lac 2013"],
    },'''

new_registry = '''    "lac_suitability": {
        "description": "Lac cultivation suitability and host scoring for a location",
        "route": "/lac",
        "api":   "/api/lac/env-risk",
        "keywords": ["lac","lac culture","lac suitability","lac cultivation","host tree","host plant","kusum","ber","flemingia","palas","palash","schleichera","ziziphus","suitability map","agroforestry","tree suitability"],
    },
    "lac_forecast": {
        "description": "Lac production forecast for a state using ERA5 and ML",
        "route": "/lac",
        "api":   "/api/lac/forecast",
        "keywords": ["lac forecast","lac production","lac output","lac yield","predicted lac","expected lac","how much lac"],
    },
    "lac_risk": {
        "description": "Lac environmental risk assessment using ICAR thresholds and weather",
        "route": "/lac",
        "api":   "/api/lac/env-risk",
        "keywords": ["lac risk","environmental risk lac","weather suitable for lac","rainfall wash lac","temperature lac","heat stress lac","frost lac","lac crop loss"],
    },
    "lac_calendar": {
        "description": "Lac crop calendar and seasonal activity schedule",
        "route": "/lac",
        "api":   "/api/lac/calendar",
        "keywords": ["lac calendar","when to inoculate","lac season","when to harvest lac","baisakhi","katki","jethwi","aghani","cultivation schedule lac","inoculation schedule"],
    },
    "lac_market": {
        "description": "Lac market prices and profitability analysis",
        "route": "/lac",
        "api":   "/api/lac/market",
        "keywords": ["lac profit","lac price","sticklac price","seedlac","shellac","lac income","lac investment","lac market","cost of lac","profit from lac","lac revenue"],
    },
    "lac_history": {
        "description": "Historical lac production trends and climate data",
        "route": "/lac",
        "api":   "/api/lac/historical",
        "keywords": ["lac history","lac data","past lac","historical lac","lac statistics","lac 2012","lac 2018","production trend lac"],
    },
    "lac_guidance": {
        "description": "Lac culture expert knowledge base and scientific guidance",
        "route": "/lac",
        "api":   "/api/lac/guidance",
        "keywords": ["how to start lac","broodlac","crawlers","lac insect","kerria lacca","how to inoculate","pruning lac","lac protection","pest lac","predator lac","kusmi vs rangeeni","lac strains"],
    },'''

assert old_registry in code, "old_registry not found!"
code = code.replace(old_registry, new_registry, 1)

# 2. Add Lac helper functions before MODULE_REGISTRY
lac_helpers = '''# ─────────────────────────────────────────────────────────────────────────────
# LAC CULTURE INTELLIGENCE ENGINE (Dataset-First + ICAR-IINRG published sources)
# ─────────────────────────────────────────────────────────────────────────────
import json as _lac_json

def _load_lac_file(filename: str):
    try:
        p = Path(__file__).resolve().parent / filename
        if p.exists():
            with open(p, encoding='utf-8') as f:
                return _lac_json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load {filename}: {e}")
    return {}

_LAC_KB = _load_lac_file("lac_kb.json") or []
_LAC_CALENDAR = _load_lac_file("lac_calendar.json") or {}
_LAC_MARKET = _load_lac_file("lac_market_data.json") or {}
_LAC_AGRO = _load_lac_file("lac_agroforestry.json") or {}

def _search_lac_kb(query: str) -> dict | None:
    if not _LAC_KB:
        return None
    q_low = query.lower()
    best_item = None
    best_score = 0
    for item in _LAC_KB:
        score = sum(1 for k in item.get("keys", []) if k.lower() in q_low)
        if score > best_score:
            best_score = score
            best_item = item
    if best_score > 0 and best_item:
        return {
            "available": True,
            "source_type": "dataset",
            "source": best_item.get("source", "ICAR-IINRG Published Guidelines"),
            "answer": best_item.get("answer"),
            "topic": best_item.get("keys", ["Lac Culture"])[0].title(),
            "confidence": "Verified dataset record",
        }
    return None

def _calc_lac_market(area_acres: float = 1.0, host: str = "Ber", price_type: str = "sticklac", price_scen: str = "modal") -> dict:
    prices = _LAC_MARKET.get("published_prices", {})
    costs_ref = _LAC_MARKET.get("ref_costs", {})
    p_info = prices.get(price_type, {
        "min": 120, "modal": 165, "max": 220, "unit": "₹/kg", "year": "2017-18", "source": "ICAR-IINRG Statistics 2018"
    })
    rate = p_info.get(price_scen, 165)
    
    h_low = (host or "Ber").lower()
    if "kusum" in h_low:
        yield_per_acre = 500
    elif "flemingia" in h_low or "semialata" in h_low:
        yield_per_acre = 350
    elif "palas" in h_low or "butea" in h_low:
        yield_per_acre = 300
    else:
        yield_per_acre = 400
        
    production_kg = round(yield_per_acre * area_acres, 1)
    revenue = round(production_kg * rate)
    base_cost_per_acre = sum(costs_ref.values()) if costs_ref else 17000
    total_cost = round(base_cost_per_acre * area_acres)
    net_profit = revenue - total_cost
    margin_pct = round((net_profit / revenue * 100), 1) if revenue > 0 else 0
    
    return {
        "available": True,
        "source_type": "dataset",
        "area_acres": area_acres,
        "host": host or "Ber",
        "price_type": price_type,
        "price_scenario": price_scen,
        "rate_per_kg": rate,
        "price_unit": p_info.get("unit", "₹/kg"),
        "price_source": p_info.get("source", "ICAR-IINRG Statistics 2018"),
        "expected_yield_kg_per_acre": yield_per_acre,
        "total_production_kg": production_kg,
        "gross_revenue_inr": revenue,
        "cultivation_cost_inr": total_cost,
        "net_profit_inr": net_profit,
        "profit_margin_pct": margin_pct,
        "cost_breakdown": costs_ref,
        "note": "Reference estimate from ICAR-IINRG published economics. Local mandi rates and tree densities may vary."
    }

def _get_lac_calendar(host: str = "", season_query: str = "") -> dict:
    cal = _LAC_CALENDAR
    selected_key = None
    q = (host + " " + season_query).lower()
    
    if "kusum" in q or "aghani" in q or "winter" in q:
        selected_key = "Kusmi · Aghani" if "aghani" in q or "kusum" in q else "Kusmi · Jethwi"
    elif "jethwi" in q or "summer kusmi" in q:
        selected_key = "Kusmi · Jethwi"
    elif "katki" in q or "rainy" in q or "monsoon" in q:
        selected_key = "Rangeeni · Katki"
    elif "baisakhi" in q or "summer rangeeni" in q:
        selected_key = "Rangeeni · Baisakhi"
    else:
        selected_key = "Kusmi · Aghani"
        
    season_data = cal.get(selected_key)
    if not season_data and cal:
        selected_key = list(cal.keys())[0]
        season_data = cal[selected_key]
        
    return {
        "available": True,
        "source_type": "dataset",
        "selected_season": selected_key,
        "season_data": season_data,
        "all_seasons": cal,
        "source": "ICAR-IINRG Cultivation Calendar & Published Guidelines",
    }

'''

marker_reg = "# Maps intent keywords"
assert marker_reg in code, "marker_reg not found!"
code = code.replace(marker_reg, lac_helpers + marker_reg, 1)

# 3. Update _summarize_for_gemini for new lac modules
old_sum_lac = '''        if module_id == "lac_history" and result.get("available"):
            nat = result.get("national_by_year", [])
            lines = [f"{r['year_label']}: {round(r.get('total_t',0))} t" for r in nat[-4:]]
            return f"\\nLAC PRODUCTION (ICAR-IINRG): {', '.join(lines)}\\n"

        if module_id == "lac_forecast" and result.get("forecast_tonnes"):
            return (f"\\nLAC FORECAST: {result['forecast_tonnes']} t "
                    f"(range {result.get('low_estimate',0)}–{result.get('high_estimate',0)} t, "
                    f"MAE ±{result.get('model_mae_t',0)} t)\\n")

        if module_id in ("lac_suitability", "pearl_risk") and result.get("overall_risk_level"):
            signals = [s.get("signal","") for s in result.get("risk_signals", [])[:3]]
            return (f"\\nENV RISK: {result['overall_risk_level']} "
                    f"(score {result.get('overall_risk_score',0)}/100)\\n"
                    + "\\n".join(signals) + "\\n")'''

new_sum_lac = '''        if module_id == "lac_history" and result.get("available"):
            nat = result.get("national_by_year", [])
            lines = [f"{r['year_label']}: {round(r.get('total_t',0))} t" for r in nat[-4:]]
            return f"\\nLAC PRODUCTION (ICAR-IINRG): {', '.join(lines)}\\n"

        if module_id == "lac_forecast" and result.get("forecast_tonnes"):
            return (f"\\nLAC PRODUCTION FORECAST: {result['forecast_tonnes']} t "
                    f"(range {result.get('low_estimate',0)}–{result.get('high_estimate',0)} t, "
                    f"MAE ±{result.get('model_mae_t',0)} t, State: {result.get('state','?')})\\n")

        if module_id in ("lac_suitability", "lac_risk") and result.get("overall_risk_level"):
            signals = [s.get("signal","") for s in result.get("risk_signals", [])[:3]]
            return (f"\\nLAC ENVIRONMENTAL RISK: {result['overall_risk_level']} "
                    f"(score {result.get('overall_risk_score',0)}/100)\\n"
                    + "\\n".join(signals) + "\\n")

        if module_id == "lac_calendar" and result.get("available"):
            s_data = result.get("season_data", {})
            return (f"\\nLAC CROP CALENDAR ({result.get('selected_season')}):\\n"
                    f"  Inoculation: {s_data.get('inoculation','?')}\\n"
                    f"  Development: {s_data.get('development','?')}\\n"
                    f"  Harvest: {s_data.get('harvest','?')}\\n"
                    f"  Host trees: {', '.join(s_data.get('hosts',[]))}\\n"
                    f"  Source: {result.get('source','')}\\n")

        if module_id == "lac_market" and result.get("available"):
            return (f"\\nLAC MARKET & PROFITABILITY ANALYSIS:\\n"
                    f"  Area: {result.get('area_acres')} acres | Host: {result.get('host')}\\n"
                    f"  Expected Production: {result.get('total_production_kg')} kg ({result.get('price_type')})\\n"
                    f"  Rate: ₹{result.get('rate_per_kg')}/kg ({result.get('price_source')})\\n"
                    f"  Gross Revenue: ₹{result.get('gross_revenue_inr'):,}\\n"
                    f"  Cultivation Cost: ₹{result.get('cultivation_cost_inr'):,}\\n"
                    f"  Net Profit: ₹{result.get('net_profit_inr'):,} (Margin: {result.get('profit_margin_pct')} %)\\n")

        if module_id == "lac_guidance" and result.get("available"):
            return (f"\\nLAC CULTURE DATASET GUIDANCE ({result.get('topic')}):\\n"
                    f"  {result.get('answer')}\\n"
                    f"  Source: {result.get('source')} (Dataset-verified record)\\n")

        if module_id == "pearl_risk" and result.get("overall_risk_level"):
            signals = [s.get("signal","") for s in result.get("risk_signals", [])[:3]]
            return (f"\\nPEARL ENV RISK: {result['overall_risk_level']} "
                    f"(score {result.get('overall_risk_score',0)}/100)\\n"
                    + "\\n".join(signals) + "\\n")'''

assert old_sum_lac in code, "old_sum_lac not found!"
code = code.replace(old_sum_lac, new_sum_lac, 1)

# 4. Update Gemini Intent Classification Prompt with all lac modules
old_prompt_modules = '''- crop_loss: crop damage, insurance claim, damage assessment
- lac_suitability: lac cultivation, lac culture
- pearl_suitability: pearl culture, mussel, oyster'''

new_prompt_modules = '''- crop_loss: crop damage, insurance claim, damage assessment
- lac_suitability: lac cultivation, lac culture, host tree suitability (Kusum, Ber, Flemingia, Palas)
- lac_forecast: lac production prediction, expected yield, forecast tonnes
- lac_risk: environmental risk for lac, rainfall/temperature impact on lac insects, heat/frost risk
- lac_calendar: lac crop calendar, inoculation timing, seasons (Baisakhi, Katki, Jethwi, Aghani), harvest period
- lac_market: lac prices, sticklac/seedlac/shellac market rate, profitability calculation, investment and return
- lac_history: historical lac production trends, past climate analysis (2012-2018)
- lac_guidance: how to start lac, broodlac inoculation methods, crawlers, pest protection, Kusmi vs Rangeeni biology
- pearl_suitability: pearl culture, mussel, oyster'''

assert old_prompt_modules in code, "old_prompt_modules not found!"
code = code.replace(old_prompt_modules, new_prompt_modules, 1)

# 5. Update _build_system_prompt rules to emphasize DATASET FIRST + GEMINI FALLBACK
old_prompt_rules = '''8. **Knowledge-first**: Always lead with what you know about the farmer's region. Use your training knowledge of local agriculture, soil, and climate to give specific, confident numbers.
9. **Actionable advice**: Always end with 1–2 specific things the farmer should do next based on the data.'''

new_prompt_rules = '''8. **Lac Culture Intelligence (DATASET FIRST, GEMINI FALLBACK SECOND)**:
   - For lac culture queries, if module data or dataset results are provided, lead with that verified ICAR-IINRG data.
   - If the user asks a question where the dataset has no specific record (e.g. detailed biology, life cycle, specific pest chemistry), seamlessly invoke your Gemini agricultural knowledge to give a comprehensive, practical answer.
   - Clearly identify the source: cite ICAR-IINRG when using dataset figures, and provide practical agronomic advice for general guidance. Never say "data not available" when you can answer.
   - For lac calculations (profit, production, calendar, risk), reference the actual numbers from the cards.
9. **Actionable advice**: Always end with 1–2 specific things the farmer should do next based on the data.'''

assert old_prompt_rules in code, "old_prompt_rules not found!"
code = code.replace(old_prompt_rules, new_prompt_rules, 1)

# 6. Update module execution in assistant_chat
old_exec_lac = '''    elif module_id == "lac_history":
        module_result = await _get(f"{HEALTH_API}/api/lac/historical")

    elif module_id == "lac_suitability":
        module_result = await _get(f"{HEALTH_API}/api/lac/env-risk?lat={lat}&lng={lng}&state={state}&district={district}")

    elif module_id == "lac_forecast":
        module_result = await _post(f"{HEALTH_API}/api/lac/forecast", {"state": state, "season": "Kharif"})'''

new_exec_lac = '''    elif module_id == "lac_history":
        module_result = await _get(f"{HEALTH_API}/api/lac/historical")

    elif module_id in ("lac_suitability", "lac_risk"):
        lac_state = state if state in ("Jharkhand","Chhattisgarh","Madhya Pradesh","Maharashtra","West Bengal","Odisha","Assam","Andhra Pradesh","Uttar Pradesh","Gujarat","Meghalaya") else (ctx.get("lac_state") or "Jharkhand")
        module_result = await _get(f"{HEALTH_API}/api/lac/env-risk?lat={lat}&lng={lng}&state={lac_state}&district={district}")
        if module_result and module_result.get("available"):
            module_result["host_trees"] = ctx.get("lac_host", "All suitable hosts")

    elif module_id == "lac_forecast":
        lac_state = state if state in ("Jharkhand","Chhattisgarh","Madhya Pradesh","Maharashtra","West Bengal","Odisha","Assam","Andhra Pradesh","Uttar Pradesh","Gujarat","Meghalaya") else (ctx.get("lac_state") or "Jharkhand")
        module_result = await _post(f"{HEALTH_API}/api/lac/forecast", {"state": lac_state, "season": "Kharif"})

    elif module_id == "lac_calendar":
        host_tree = extracted.get("lac_host") or ctx.get("lac_host") or ("Kusum" if "kusum" in req.message.lower() else "Ber" if "ber" in req.message.lower() else "All")
        module_result = _get_lac_calendar(host=host_tree, season_query=req.message)

    elif module_id == "lac_market":
        host_tree = extracted.get("lac_host") or ctx.get("lac_host") or ("Kusum" if "kusum" in req.message.lower() else "Ber" if "ber" in req.message.lower() else "Ber")
        area_ac = float(extracted.get("land_area_acres") or ctx.get("land_area_acres") or 2.0)
        p_scen = "modal"
        if "high" in req.message.lower() or "maximum" in req.message.lower(): p_scen = "max"
        elif "low" in req.message.lower() or "minimum" in req.message.lower(): p_scen = "min"
        p_type = "shellac" if "shellac" in req.message.lower() else "seedlac" if "seedlac" in req.message.lower() else "sticklac"
        module_result = _calc_lac_market(area_acres=area_ac, host=host_tree, price_type=p_type, price_scen=p_scen)

    elif module_id == "lac_guidance":
        kb_hit = _search_lac_kb(req.message)
        if kb_hit:
            module_result = kb_hit
        else:
            module_result = {
                "available": True,
                "source_type": "gemini_fallback",
                "source": "Gemini AI Agricultural Guidance (ICAR Scientific Baseline)",
                "topic": "Lac Cultivation & Management",
                "is_fallback": True,
                "note": "Information synthesized by AI based on agricultural research. Confirm with local KVK / ICAR-NISA Ranchi."
            }'''

assert old_exec_lac in code, "old_exec_lac not found!"
code = code.replace(old_exec_lac, new_exec_lac, 1)

# 7. Update _dispatch_module for parallel/secondary multi-module dispatch
old_disp_marker = '                if mid == "crop_loss":'
new_disp_lac = '''                if mid in ("lac_suitability", "lac_risk"):
                    lac_st = state if state in ("Jharkhand","Chhattisgarh","Madhya Pradesh","Maharashtra","West Bengal","Odisha","Assam") else "Jharkhand"
                    return await _get(f"{HEALTH_API}/api/lac/env-risk?lat={lat}&lng={lng}&state={lac_st}&district={district}")
                if mid == "lac_forecast":
                    lac_st = state if state in ("Jharkhand","Chhattisgarh","Madhya Pradesh","Maharashtra","West Bengal","Odisha","Assam") else "Jharkhand"
                    return await _post(f"{HEALTH_API}/api/lac/forecast", {"state": lac_st, "season": "Kharif"})
                if mid == "lac_calendar":
                    h = "Kusum" if "kusum" in req.message.lower() else "Ber" if "ber" in req.message.lower() else ""
                    return _get_lac_calendar(host=h, season_query=req.message)
                if mid == "lac_market":
                    h = "Kusum" if "kusum" in req.message.lower() else "Ber"
                    a = float(extracted.get("land_area_acres") or ctx.get("land_area_acres") or 2.0)
                    return _calc_lac_market(area_acres=a, host=h)
                if mid == "lac_history":
                    return await _get(f"{HEALTH_API}/api/lac/historical")
                if mid == "lac_guidance":
                    hit = _search_lac_kb(req.message)
                    return hit or {"available": True, "source_type": "gemini_fallback", "source": "Gemini AI Agricultural Guidance", "topic": "Lac Cultivation"}
'''
assert old_disp_marker in code, "old_disp_marker not found!"
code = code.replace(old_disp_marker, new_disp_lac + old_disp_marker, 1)

# 8. Update fast_extract to capture lac parameters (host trees, number of trees, lac strain, lac state)
old_fast_crop = '    for alias, canonical in _CROP_PAT:'
lac_extract_code = '''    # ── Lac parameters extraction ─────────────────────────────
    _LAC_HOSTS = [("kusum", "Kusum"), ("schleichera", "Kusum"), ("ber", "Ber"), ("ziziphus", "Ber"),
                  ("flemingia", "Flemingia"), ("semialata", "Flemingia"), ("palas", "Palas"), ("palash", "Palas"), ("butea", "Palas")]
    for alias, canonical in _LAC_HOSTS:
        if _re.search(r'\\b' + _re.escape(alias) + r'\\b', combined):
            result["lac_host"] = canonical
            break

    _LAC_STRAINS = [("kusmi", "Kusmi"), ("rangeeni", "Rangeeni")]
    for alias, canonical in _LAC_STRAINS:
        if _re.search(r'\\b' + _re.escape(alias) + r'\\b', combined):
            result["lac_strain"] = canonical
            break

    # Number of host trees
    m_trees = _re.search(r'(\\d+)\\s*(?:host\\s*)?trees?\\b', combined)
    if m_trees:
        result["num_trees"] = int(m_trees.group(1))

'''
assert old_fast_crop in code, "old_fast_crop not found!"
code = code.replace(old_fast_crop, lac_extract_code + old_fast_crop, 1)

# 9. Update context persistence keys
old_ctx_keys = 'for k in ("state","district","block","village","crop","commodity",\n               "land_area_acres","land_area_hectares","culture_type","quantity_kg","sowing_date","lat","lng"):'
new_ctx_keys = 'for k in ("state","district","block","village","crop","commodity",\n               "land_area_acres","land_area_hectares","culture_type","quantity_kg","sowing_date","lat","lng",\n               "lac_host","lac_strain","num_trees","lac_state"):'

if old_ctx_keys in code:
    code = code.replace(old_ctx_keys, new_ctx_keys, 1)
else:
    # Try normalized
    code = code.replace(old_ctx_keys.replace('\\n', '\\r\\n'), new_ctx_keys.replace('\\n', '\\r\\n'), 1)

target_file.write_text(code, encoding="utf-8")
print("Successfully patched backend/voice_api.py with full Lac Culture integration!")

