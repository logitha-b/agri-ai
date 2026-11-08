"""
DEFINITIVE FIX: The dangling block (lines 879-1842) was the body of the 
primary dispatch function (chat_handler's module dispatch). It got orphaned
when the helper function was inserted inside it.

Fix: simply reattach the dangling lines to the function above by removing
the extra blank lines 877-878 and replacing with the helper properly closed.

Actually the simplest fix:
1. The block at 879 starts with '    elif module_id == "flood_risk":'
2. This was part of an if/elif chain inside an async function
3. That function's body ended at some `    return module_result` before helper
4. We need to add a wrapper to reconnect them

The REAL fix: restore the original function structure.
The dangling block starts at line 879 and ends at line 1842.
We need to put it back inside a function.

Looking at line 1838: '    )\n' — this is 4 spaces = inside a function
So the original structure was:
    async def <some_function>(...):
        ...
        if module_id == "weather": ...
        <HELPER WAS INSERTED HERE BREAKING THE FUNCTION>
        elif module_id == "flood_risk": ...
        ...
    )   <- line 1838

The parent function was cut. We need to find it.
"""
import py_compile, sys

with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The parent function should be searched backwards from line 879
# Looking for an async def with indent=0 that has NOT been closed before 879
# Check lines around 790 (where helper was inserted)
print('=== Lines 790-796 ===')
for i in range(789, 796):
    print(f'{i+1}: {repr(lines[i][:100])}')

# Look at ALL async def / def at module level between line 1 and 876
print()
print('=== Module-level functions before line 877 ===')
for i, ln in enumerate(lines[:877]):
    if ln.startswith('async def ') or ln.startswith('def '):
        print(f'{i+1}: {repr(ln[:80])}')
