import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
import py_compile

with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# The structure should be:
# ... (lines 1-795)
# async def _resolve_flood_missing_inputs(...)  <- lines 796-876, at indent=0
# [blank lines]
# DANGLING BLOCK: lines 879-1842 (4-space indent, belongs inside chat handler)
# @app.post("/api/voice/transcribe")   <- line 1843

# Step 1: Extract the helper function (lines 796-876, 0-indexed 795-875)
helper = lines[795:876]  # includes the 'return module_result' at line 876
print(f'Helper: lines 796-876, {len(helper)} lines')

# Step 2: Extract the dangling block (lines 879-1842, 0-indexed 878-1841)
dangling = lines[878:1842]
print(f'Dangling: lines 879-1842, {len(dangling)} lines')
print(f'  First: {repr(dangling[0][:80])}')
print(f'  Last:  {repr(dangling[-1][:80])}')

# Step 3: Everything before helper (lines 1-795, 0-indexed 0-794)
before = lines[:795]
print(f'Before: {len(before)} lines, last: {repr(before[-1][:80])}')

# Step 4: Everything after dangling (lines 1843+, 0-indexed 1842+)
after = lines[1842:]
print(f'After: {len(after)} lines, first: {repr(after[0][:80])}')

# Now we need to find where in the CHAT HANDLER the dangling block belongs.
# The chat handler should be in 'after'. Let's find the chat handler.
# The dangling block starts with '    elif module_id == "flood_risk":'
# which means the 'if module_id == "weather":' check must come before it.

# Let's look at 'after' to find the chat handler
chat_handler_start = None
weather_check_line = None
for i, ln in enumerate(after):
    if 'async def chat(' in ln or '@app.post("/api/assistant/chat")' in ln:
        chat_handler_start = i
    if '    if module_id == "weather":' in ln and chat_handler_start is not None:
        weather_check_line = i
        print(f'Weather check found in after[] at index {i} (line {1842+i+1})')
        break

if weather_check_line is None:
    print('Weather check NOT found in after[] -- searching for insertion point differently')
    # The weather check was in the dangling block!
    for i, ln in enumerate(dangling):
        if '    if module_id == "weather":' in ln:
            print(f'Weather check found in dangling[] at index {i}: {repr(ln[:80])}')
            break
    # In this case: the dangling block IS the entire dispatch body
    # We need to put it inside the chat handler in 'after'
    # Find the chat handler
    for i, ln in enumerate(after):
        if '@app.post("/api/assistant/chat")' in ln:
            chat_handler_start = i
            print(f'Chat handler @app.post at after[{i}] (line {1842+i+1})')
            # Now find inside the chat handler where to insert
            # Look for 'module_result = None' or similar setup
            for j in range(i, min(i+100, len(after))):
                if '    module_result = None' in after[j] or '    module_result = await' in after[j]:
                    print(f'Module result init at after[{j}]: {repr(after[j][:80])}')
                    break
            break
else:
    print('Found weather check - can insert dangling AFTER it')

# For now, just show what 'after' starts with
print()
print('=== after[0:10] ===')
for i in range(min(10, len(after))):
    print(f'after[{i}] (line {1842+i+1}): {repr(after[i][:100])}')
