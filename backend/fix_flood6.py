with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_block = (
    '            return (\n'
    '                f"\\nFLOOD & WATER RISK for {loc_str} (assessed {result.get(\'assessment_date\',\'today\')}):\\n"\n'
    '                f"  RISK LEVEL: {risk_label}\\n"\n'
    '                f"  Summary: {summary_txt}\\n"\n'
    '                f"  Key evidence signals:\\n{ev_txt}\\n"\n'
    '                + sar_ctx\n'
    '                + soil_ctx\n'
    '                + (f"  Remaining missing: CWC river gauge levels — register at india-water.gov.in\\n" if miss_txt else "")\n'
    '                + (f"  Recommended actions:\\n{prec_txt}\\n" if prec_txt else "")\n'
    '                + f"  INSTRUCTION TO AI:\\n"\n'
    '                  f"  1. Start with: \'{risk_label} for {loc_str}\' — state this clearly.\\n"\n'
    '                  f"  2. Explain the rainfall readings and their meaning for the farmer\'s paddy field.\\n"\n'
    '                  f"  3. Mention Sentinel-1 SAR satellite imagery was fetched — the flood map is in the card.\\n"\n'
    '                  f"  4. Mention SoilGrids terrain data was fetched — describe drainage implications for paddy.\\n"\n'
    '                  f"  5. Note river gauge data from CWC requires registration at india-water.gov.in.\\n"\n'
    '                  f"  6. End with recommended actions in simple farmer language.\\n"\n'
    '            )\n'
)

# Replace lines 349-365 (0-indexed: 348-364)
lines[348:365] = [new_block]
with open('voice_api.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Done - flood risk summarizer return updated')
