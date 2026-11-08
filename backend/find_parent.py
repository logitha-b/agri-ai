"""
FINAL SURGICAL REPAIR:
The file has _resolve_flood_missing_inputs (lines 796-876) as a standalone function.
After it (lines 879-1842) there is dangling code that was supposed to be inside
a containing async function (the primary module dispatch).

Strategy:
1. Find the function that CONTAINS the `if module_id == "weather":` check BEFORE line 796
2. That function was split by the helper insertion
3. We need to: (a) close the helper function properly, (b) reattach the dangling body

Let me look for the parent function of the dangling code.
"""
import py_compile, sys

with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find where the parent function was before the helper was inserted
# Look backwards from helper (line 796) for the containing async def
for i in range(794, 0, -1):
    ln = lines[i]
    if ln.startswith('async def ') or ln.startswith('def '):
        print(f'Parent function at line {i+1}: {repr(ln[:100])}')
        # Show context
        for j in range(i, min(i+10, len(lines))):
            print(f'  {j+1}: {repr(lines[j][:100])}')
        break
