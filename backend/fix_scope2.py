with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the helper function block
helper_start = None
helper_end   = None
for i, ln in enumerate(lines):
    if 'async def _resolve_flood_missing_inputs(' in ln and helper_start is None:
        helper_start = i
    if helper_start is not None and i > helper_start:
        # Helper ends at the next top-level function/class/decorator or double blank line before one
        stripped = ln.rstrip()
        if stripped and not stripped.startswith(' ') and not stripped.startswith('\t') and stripped != '':
            helper_end = i
            break

print(f'Helper: lines {helper_start+1} to {helper_end+1}')

# Extract helper text
helper_lines = lines[helper_start:helper_end]
print('First:', repr(helper_lines[0]))
print('Last:', repr(helper_lines[-1]))

# Remove helper from its current (wrong) place
del lines[helper_start:helper_end]

# Find _generate_local_reply in the modified list
insert_before = None
for i, ln in enumerate(lines):
    if 'async def _generate_local_reply(' in ln:
        insert_before = i
        break

if insert_before is None:
    print('_generate_local_reply not found, searching for chat endpoint')
    for i, ln in enumerate(lines):
        if '@app.post("/api/assistant/chat")' in ln:
            insert_before = i
            break

if insert_before is not None:
    print(f'Inserting before line {insert_before+1}')
    # Insert helper with blank lines
    lines[insert_before:insert_before] = helper_lines + ['\n']
else:
    print('ERROR: no insertion point found')

with open('voice_api.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

import py_compile
try:
    py_compile.compile('voice_api.py', doraise=True)
    print('Syntax OK')
except py_compile.PyCompileError as e:
    print('Syntax error:', e)
