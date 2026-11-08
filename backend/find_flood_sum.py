import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, ln in enumerate(lines, 1):
    if 'flood_risk' in ln and ('module_id' in ln or 'summarize' in ln.lower() or 'tts' in ln.lower()):
        print(f'{i}: {ln}', end='')
