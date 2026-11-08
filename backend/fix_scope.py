with open('voice_api.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract helper from wrong location
start_marker = '\nasync def _resolve_flood_missing_inputs('
end_marker = '\n    if module_id == "weather":\n        module_result = await _get'

start = content.find(start_marker)
end   = content.find(end_marker, start)

if start < 0 or end < 0:
    print(f'MARKERS NOT FOUND: start={start}, end={end}')
    # Debug
    idx = content.find('_resolve_flood_missing_inputs')
    print('Helper found at:', idx)
    idx2 = content.find('if module_id == "weather":\n        module_result')
    print('End marker found at:', idx2)
else:
    helper_text = content[start:end]
    # Remove helper from wrong place (keep 2 newlines before next block)
    content_fixed = content[:start] + '\n\n' + content[end:]

    # Insert before _generate_local_reply
    insert_before = '\nasync def _generate_local_reply('
    if insert_before not in content_fixed:
        print('_generate_local_reply not found, trying chat endpoint')
        insert_before = '\n@app.post("/api/assistant/chat")'

    if insert_before in content_fixed:
        content_fixed = content_fixed.replace(
            insert_before,
            helper_text + '\n\n' + insert_before,
            1
        )
        with open('voice_api.py', 'w', encoding='utf-8') as f:
            f.write(content_fixed)
        print('SUCCESS: helper moved to correct location')
    else:
        print('ERROR: could not find insertion point')

# Verify syntax
import py_compile, sys
try:
    py_compile.compile('voice_api.py', doraise=True)
    print('Syntax OK')
except py_compile.PyCompileError as e:
    print('Syntax error:', e)
