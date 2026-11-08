import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
with open('voice_api.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the return statement more carefully
idx = content.find('terrain data (SoilGrids): {prop_txt}\" if prop_txt else \"\"\n\n            return (')
if idx < 0:
    print('Not found with double newline')
    idx = content.find('terrain data (SoilGrids): {prop_txt}\" if prop_txt else \"\"\n            return (')
    print('Found with single newline:', idx >= 0)

# Find the full return block and replace
import re
# Find the return block starting from the flood risk section
pattern = r'(            return \(\n                f"\\\\nFLOOD & WATER RISK for \{loc_str\}.*?            \)\n)'
matches = list(re.finditer(pattern, content, re.DOTALL))
print(f'Found {len(matches)} matches')
if matches:
    m = matches[0]
    print('Match preview:', repr(content[m.start():m.start()+200]))
