"""
CLEAN REPAIR of voice_api.py:
1. Find _resolve_flood_missing_inputs function (lines 796-876)
2. Find the dangling elif module_id == "flood_risk" block after it
3. The elif belongs inside _dispatch_module — figure out where that function is
4. Move the dangling code back into _dispatch_module
5. Verify syntax
"""
import py_compile, sys

with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# Find the helper function (should be at line 796, 0-indexed 795)
helper_def_line = None
for i, ln in enumerate(lines):
    if 'async def _resolve_flood_missing_inputs(' in ln:
        helper_def_line = i
        break

print(f'Helper def at line: {helper_def_line+1}')

# Find the helper's return (end of function)
helper_return_line = None
for i in range(helper_def_line, len(lines)):
    if lines[i].strip() == 'return module_result' and lines[i].startswith('    '):
        helper_return_line = i
        # Check if next non-blank line is the dangling elif
        for j in range(i+1, len(lines)):
            if lines[j].strip():
                print(f'After helper return (line {i+1}), next line {j+1}: {repr(lines[j][:80])}')
                break
        break

print(f'Helper return at: {helper_return_line+1}')

# Find the dangling code that belongs inside _dispatch_module
# It starts with the elif module_id == "flood_risk": after the helper
dangling_start = None
for i in range(helper_return_line + 1, len(lines)):
    if lines[i].strip():
        if '    elif module_id ==' in lines[i] or lines[i].strip().startswith('elif module_id'):
            dangling_start = i
            print(f'Dangling elif starts at line {i+1}: {repr(lines[i][:80])}')
        break

# Find _dispatch_module function to know where to insert the dangling code
dispatch_func_line = None
for i, ln in enumerate(lines):
    if 'async def _dispatch_module(' in ln:
        dispatch_func_line = i
        print(f'_dispatch_module at line: {i+1}')
        break

# The dangling elif probably came right before a "    elif module_id == 'lac_history':"
# Let's find the "elif module_id == 'lac_history'" in the dangling section to understand scope
# For now, find where the dangling block ends
if dangling_start:
    dangling_end = None
    for i in range(dangling_start + 1, len(lines)):
        ln = lines[i]
        # Look for a line that is NOT part of the elif block (back at 4-space indent with elif/if at module func body)
        # The elif block ends when we find the next top-level statement or the next function
        stripped = ln.strip()
        if stripped and not stripped.startswith('#'):
            cur_indent = len(ln) - len(ln.lstrip())
            # If we reach another elif at the same level that seems to be another module_id check
            if cur_indent == 4 and stripped.startswith('elif module_id ==') and i > dangling_start + 5:
                # This is still the same elif chain — continue
                pass
            elif cur_indent == 0 and (stripped.startswith('async def ') or stripped.startswith('def ') 
                                       or stripped.startswith('@') or stripped.startswith('class ')):
                dangling_end = i
                print(f'Dangling block ends at line {i+1}: {repr(ln[:80])}')
                break
    
    if dangling_end is None:
        dangling_end = len(lines)
        print(f'Dangling block goes to EOF')
    
    dangling_lines = lines[dangling_start:dangling_end]
    print(f'Dangling block: {len(dangling_lines)} lines')
    print(f'First: {repr(dangling_lines[0][:80])}')
    print(f'Last: {repr(dangling_lines[-1][:80])}')
