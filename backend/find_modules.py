import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
hits = []
for i, ln in enumerate(lines, 1):
    if any(kw in ln for kw in ['multi_result', 'secondary_ids', 'MODULE_REGISTRY', 'detect_module', 'module_ids', 'detected_module']):
        hits.append((i, ln.rstrip()))
for i, ln in hits[:60]:
    print(f'{i}: {ln}')
