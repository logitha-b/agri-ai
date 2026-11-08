"""
Surgical fix:
1. Extract dangling elif block (lines 879 to end of its block)
2. Find where it belongs inside _dispatch_module
3. Insert it there, removing the dangling copy
"""
import py_compile, sys

with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total: {len(lines)} lines')

# The dangling block starts at line 879 (0-indexed: 878)
# Find where dangling block ends — when we hit a module-level def/class/@
dangling_start = 878  # 0-indexed, line 879

dangling_end = None
for i in range(dangling_start + 1, len(lines)):
    ln = lines[i]
    if ln.strip() and not ln.startswith(' ') and not ln.startswith('\t') and not ln.startswith('#'):
        # Non-empty, non-indented, non-comment = module-level
        dangling_end = i
        print(f'Dangling block ends at line {i+1}: {repr(ln[:80])}')
        break

if dangling_end is None:
    dangling_end = len(lines)

dangling_block = lines[dangling_start:dangling_end]
print(f'Dangling block: lines {dangling_start+1}-{dangling_end}, {len(dangling_block)} lines')
print(f'First: {repr(dangling_block[0][:80])}')
print(f'Last:  {repr(dangling_block[-1][:80])}')

# Remove dangling block (but keep the blank lines to preserve spacing)
lines_clean = lines[:dangling_start] + lines[dangling_end:]
print(f'After removal: {len(lines_clean)} lines')

# Find _dispatch_module function in lines_clean
dispatch_start = None
for i, ln in enumerate(lines_clean):
    if 'async def _dispatch_module(' in ln:
        dispatch_start = i
        print(f'_dispatch_module at line {i+1}')
        break

if dispatch_start is None:
    print('ERROR: _dispatch_module not found')
    sys.exit(1)

# Find the "if module_id == 'weather':" line inside _dispatch_module
weather_elif = None
for i in range(dispatch_start, min(dispatch_start + 200, len(lines_clean))):
    if '    if module_id == "weather":' in lines_clean[i]:
        weather_elif = i
        print(f'weather check at line {i+1}')
        break

if weather_elif is None:
    print('ERROR: weather check not found inside _dispatch_module')
    # Show first 30 lines of _dispatch_module
    for i in range(dispatch_start, min(dispatch_start+30, len(lines_clean))):
        print(f'{i+1}: {repr(lines_clean[i][:80])}')
    sys.exit(1)

# Find the end of the weather block (next elif at same level)
insert_point = None
for i in range(weather_elif + 1, min(weather_elif + 30, len(lines_clean))):
    ln = lines_clean[i]
    if '    elif module_id ==' in ln or '    elif module_id ==' in ln:
        insert_point = i
        print(f'Insert point (after weather block): line {i+1}: {repr(ln[:80])}')
        break

if insert_point is None:
    # Fallback: insert right after the weather line + its return
    insert_point = weather_elif + 3
    print(f'Fallback insert at line {insert_point+1}')

# Insert the dangling block at insert_point
lines_final = lines_clean[:insert_point] + dangling_block + lines_clean[insert_point:]
print(f'Final file: {len(lines_final)} lines')

with open('voice_api.py', 'w', encoding='utf-8') as f:
    f.writelines(lines_final)

# Syntax check
try:
    py_compile.compile('voice_api.py', doraise=True)
    print('SUCCESS: Syntax OK')
except py_compile.PyCompileError as e:
    print(f'Syntax error: {e}')
