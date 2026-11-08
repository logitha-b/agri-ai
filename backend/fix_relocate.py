"""
Carefully locate and relocate _resolve_flood_missing_inputs to module level.
Uses line-by-line indentation analysis.
"""
import py_compile, sys

with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# Step 1: Find where the helper starts
helper_start = None
for i, ln in enumerate(lines):
    if ln.strip().startswith('async def _resolve_flood_missing_inputs('):
        helper_start = i
        indent = len(ln) - len(ln.lstrip())
        print(f'Helper starts at line {i+1}, indent={indent}')
        break

if helper_start is None:
    print('Helper not found!')
    sys.exit(1)

# Step 2: Find where helper ends
# It ends when we find a line at same or lower indent level that starts a new def/class/decorator
# OR it's a module-level function (indent=0)
helper_end = None
in_body = False
for i in range(helper_start + 1, len(lines)):
    ln = lines[i]
    stripped = ln.strip()
    if not stripped:  # blank line
        continue
    cur_indent = len(ln) - len(ln.lstrip())
    # If we're back at indent=0 with a real statement
    if cur_indent == 0 and stripped and not stripped.startswith('#'):
        helper_end = i
        print(f'Helper ends at line {i+1} (next module-level statement)')
        break

if helper_end is None:
    print('Could not find helper end — assuming it goes to EOF')
    helper_end = len(lines)

# Step 3: Extract helper
helper_lines = lines[helper_start:helper_end]
print(f'Helper is {len(helper_lines)} lines')
print(f'  First: {repr(helper_lines[0][:80])}')
print(f'  Last:  {repr(helper_lines[-1][:80])}')

# Step 4: Remove helper from current location
lines_without = lines[:helper_start] + lines[helper_end:]
print(f'Lines after removal: {len(lines_without)}')

# Step 5: Find insertion point — first @app.post decorator at module level
insert_at = None
for i, ln in enumerate(lines_without):
    if ln.strip().startswith('@app.post(') and not lines_without[i-1].strip().startswith('@'):
        insert_at = i
        print(f'Inserting before line {i+1}: {repr(ln[:60])}')
        break

if insert_at is None:
    # fallback — insert before last 'async def' at module level
    for i in range(len(lines_without)-1, -1, -1):
        if lines_without[i].startswith('async def ') or lines_without[i].startswith('def '):
            insert_at = i
            break

if insert_at is None:
    print('ERROR: no insertion point found')
    sys.exit(1)

# Step 6: Build final lines
final_lines = (
    lines_without[:insert_at]
    + ['\n']
    + helper_lines
    + ['\n']
    + lines_without[insert_at:]
)

with open('voice_api.py', 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

# Step 7: Syntax check
try:
    py_compile.compile('voice_api.py', doraise=True)
    print('SUCCESS: Syntax OK')
except py_compile.PyCompileError as e:
    print(f'Syntax error: {e}')
