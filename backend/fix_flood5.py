import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
with open('voice_api.py', 'r', encoding='utf-8') as f:
    content = f.read()

old = (
    '                  f"  INSTRUCTION TO AI:\\n"\n'
    '                  f"  1. Open with: \'{risk_label} for {loc_str}\' — state this clearly.\\n"\n'
    '                  f"  2. Explain in plain language why this risk level was assigned (cite the rainfall values).\\n"\n'
    '                  f"  3. IMPORTANT — For each missing input, USE YOUR EXPERT KNOWLEDGE of {loc.get(\'district\',\'\')} to fill the gap:\\n"\n'
    '                  f"     a) Satellite flood inundation: Describe historically flood-prone or low-lying areas in {loc.get(\'district\',\'\')} from your knowledge.\\n"\n'
    '                  f"     b) River gauge levels: Name the major rivers near {loc.get(\'district\',\'\')} and their typical Kharif flood behaviour.\\n"\n'
    '                  f"     c) Elevation/terrain: Describe the elevation profile and drainage of {loc.get(\'district\',\'\')} and flood risk that poses.\\n"\n'
    '                  f"  4. End with the 3 recommended actions.\\n"\n'
    '                  f"  Do NOT say \'data not available\' for missing inputs — fill them with your expert knowledge.\\n"\n'
)

new = (
    '                  f"  INSTRUCTION TO AI:\\n"\n'
    '                  f"  1. Open with: \'{risk_label} for {loc_str}\' — state this clearly.\\n"\n'
    '                  f"  2. Explain in plain language why this risk level was assigned (cite the rainfall values).\\n"\n'
)

# Also add SAR and soil context before the instruction
sar_insert = '''
            # Add SAR and soil context if available
            sar_ctx = ""
            if result.get("sentinel_sar") and result["sentinel_sar"].get("available") != False:
                sar = result["sentinel_sar"]
                sar_ctx = (
                    f"\\n  Sentinel-1 SAR satellite data: Available ({sar.get('date_from','')}"
                    f" to {sar.get('date_to','')}). {sar.get('note', '')}"
                )
            soil_ctx = ""
            if result.get("soil_terrain") and result["soil_terrain"].get("available"):
                soil = result["soil_terrain"]
                props = soil.get("properties") or []
                prop_txt = "; ".join(
                    f"{p['name']}: {p['value']} {p.get('unit','')}"
                    for p in props[:4] if p.get("value")
                ) if props else ""
                soil_ctx = f"\\n  Soil terrain data (SoilGrids): {prop_txt}" if prop_txt else ""
'''

# Find where to insert the sar_insert — right before the return statement in the flood_risk summarizer
target = '            return (\n                f"\\nFLOOD & WATER RISK for {loc_str}'
insert_after = 'prec_txt     = "\\n".join(f"  - {p}" for p in precautions[:3]) if precautions else ""\n'

if insert_after in content:
    content = content.replace(
        insert_after,
        insert_after + sar_insert + '\n',
        1
    )
    print('SAR/soil context insertion: SUCCESS')
else:
    print('INSERT AFTER pattern not found')

# Update the return to include sar_ctx and soil_ctx, and fix instruction
old_return = (
    '            return (\n'
    '                f"\\nFLOOD & WATER RISK for {loc_str} (assessed {result.get(\'assessment_date\',\'today\')}):\\n"\n'
    '                f"  RISK LEVEL: {risk_label}\\n"\n'
    '                f"  Summary: {summary_txt}\\n"\n'
    '                f"  Key evidence signals:\\n{ev_txt}\\n"\n'
    '                + (f"  Missing data inputs (system could not fetch these):\\n{miss_txt}\\n" if miss_txt else "")\n'
    '                + (f"  Recommended actions:\\n{prec_txt}\\n" if prec_txt else "")\n'
    '                + f"  INSTRUCTION TO AI:\\n"\n'
    '                  f"  1. Open with: \'{risk_label} for {loc_str}\' — state this clearly.\\n"\n'
    '                  f"  2. Explain in plain language why this risk level was assigned (cite the rainfall values).\\n"\n'
    '                  f"  3. IMPORTANT — For each missing input, USE YOUR EXPERT KNOWLEDGE of {loc.get(\'district\',\'\')} to fill the gap:\\n"\n'
    '                  f"     a) Satellite flood inundation: Describe historically flood-prone or low-lying areas in {loc.get(\'district\',\'\')} from your knowledge.\\n"\n'
    '                  f"     b) River gauge levels: Name the major rivers near {loc.get(\'district\',\'\')} and their typical Kharif flood behaviour.\\n"\n'
    '                  f"     c) Elevation/terrain: Describe the elevation profile and drainage of {loc.get(\'district\',\'\')} and flood risk that poses.\\n"\n'
    '                  f"  4. End with the 3 recommended actions.\\n"\n'
    '                  f"  Do NOT say \'data not available\' for missing inputs — fill them with your expert knowledge.\\n"\n'
    '            )\n'
)

new_return = (
    '            return (\n'
    '                f"\\nFLOOD & WATER RISK for {loc_str} (assessed {result.get(\'assessment_date\',\'today\')}):\\n"\n'
    '                f"  RISK LEVEL: {risk_label}\\n"\n'
    '                f"  Summary: {summary_txt}\\n"\n'
    '                f"  Key evidence signals:\\n{ev_txt}\\n"\n'
    '                + sar_ctx\n'
    '                + soil_ctx\n'
    '                + (f"  Remaining missing data (CWC river gauges — register at india-water.gov.in)\\n" if miss_txt else "")\n'
    '                + (f"  Recommended actions:\\n{prec_txt}\\n" if prec_txt else "")\n'
    '                + f"  INSTRUCTION TO AI:\\n"\n'
    '                  f"  1. Open with: \'{risk_label} for {loc_str}\' — state this clearly.\\n"\n'
    '                  f"  2. Explain the rainfall readings and what they mean for the farmer\'s paddy field.\\n"\n'
    '                  f"  3. Mention that Sentinel-1 SAR satellite data and soil terrain data are now available in the card.\\n"\n'
    '                  f"  4. End with the recommended actions in plain farmer-friendly language.\\n"\n'
    '            )\n'
)

if old_return in content:
    content = content.replace(old_return, new_return, 1)
    print('Return statement updated: SUCCESS')
else:
    print('ERROR: return statement pattern not found')
    # Try to find it
    idx = content.find('FLOOD & WATER RISK for {loc_str}')
    if idx >= 0:
        print('Found at:', idx)
        print(repr(content[idx-100:idx+800]))

with open('voice_api.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done.')
