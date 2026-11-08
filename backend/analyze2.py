import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print('=== Module-level functions before line 877 ===')
for i, ln in enumerate(lines[:877]):
    if ln.startswith('async def ') or (ln.startswith('def ') and not ln.startswith('def _')):
        print(f'{i+1}: {repr(ln[:80])}')

print()
print('=== Lines 786-796 ===')
for i in range(785, 796):
    print(f'{i+1}: {repr(lines[i][:100])}')
