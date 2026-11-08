import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
import py_compile

with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extract all 4 parts
before  = lines[:795]         # lines 1-795
helper  = lines[795:876]      # lines 796-876 (helper function, 81 lines)
blank   = lines[876:878]      # lines 877-878 (blank lines)
dangling = lines[878:1842]    # lines 879-1842 (964 lines, orphaned elif block)
after   = lines[1842:]        # lines 1843+ (transcribe + chat handler)

print(f'before={len(before)}, helper={len(helper)}, dangling={len(dangling)}, after={len(after)}')

# In 'after', find where to insert dangling (right after 'if module_id == "weather":')
# We found it's at after[757]
weather_idx = None
for i, ln in enumerate(after):
    if '    if module_id == "weather":' in ln:
        weather_idx = i
        print(f'Weather at after[{i}] (orig line {1842+i+1}): {repr(ln[:80])}')
        # Show next few lines
        for j in range(i, min(i+5, len(after))):
            print(f'  after[{j}]: {repr(after[j][:100])}')
        break

if weather_idx is None:
    print('ERROR: weather not found in after[]')
    sys.exit(1)

# Find end of weather block (next elif at same indent level)
weather_block_end = None
for i in range(weather_idx + 1, min(weather_idx + 20, len(after))):
    ln = after[i]
    if '    elif module_id ==' in ln:
        weather_block_end = i
        print(f'Weather block ends at after[{i}]: {repr(ln[:80])}')
        break

if weather_block_end is None:
    # Weather block is just 1-2 lines
    weather_block_end = weather_idx + 2
    print(f'Weather block end assumed at after[{weather_block_end}]')

# Now reconstruct:
# before + [newlines] + helper + [newlines] + after_part1 + dangling + after_part2
# where after_part1 = after[0:weather_block_end]
# and after_part2 = after[weather_block_end:]

after_part1 = after[:weather_block_end]
after_part2 = after[weather_block_end:]

# But wait: after_part2 might already have 'elif module_id ==' from the DUPLICATE
# The dangling block starts with 'elif module_id == "flood_risk":' and after_part2 
# starts with whatever came after the weather block. Let's check what after_part2 starts with.
print(f'after_part2[0]: {repr(after_part2[0][:100])}')
print(f'after_part2[1]: {repr(after_part2[1][:100]) if len(after_part2) > 1 else "N/A"}')

# Check if there's already a flood_risk block in after_part2
for i, ln in enumerate(after_part2[:50]):
    if 'module_id == "flood_risk"' in ln or 'flood_risk' in ln.lower():
        print(f'after_part2[{i}]: {repr(ln[:100])}')

# Build final file
final = before + ['\n'] + helper + ['\n\n'] + after_part1 + dangling + after_part2
print(f'Final lines: {len(final)}')

with open('voice_api.py', 'w', encoding='utf-8') as f:
    f.writelines(final)

# Syntax check
try:
    py_compile.compile('voice_api.py', doraise=True)
    print('SUCCESS: Syntax OK!')
except py_compile.PyCompileError as e:
    print(f'Syntax error: {e}')
