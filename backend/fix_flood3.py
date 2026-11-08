import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

with open('voice_api.py', 'r', encoding='utf-8') as f:
    content = f.read()

old = (
    '                + f"  INSTRUCTION TO AI: Start your answer by clearly stating \'{risk_label} for {loc_str}\'. "\n'
    '                  f"Then explain the key evidence signals in plain language. "\n'
    '                  f"Warn the farmer about the 3 missing inputs and what risks they may hide. "\n'
    '                  f"End with the 3 recommended actions.\\n"\n'
    '            )\n'
)

new = (
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

if old in content:
    content = content.replace(old, new, 1)
    with open('voice_api.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Gemini flood risk instruction updated')
else:
    print('Pattern not found. Searching...')
    idx = content.find('INSTRUCTION TO AI: Start your answer')
    if idx >= 0:
        print(repr(content[idx-50:idx+300]))
    else:
        print('No match found for INSTRUCTION TO AI block')
