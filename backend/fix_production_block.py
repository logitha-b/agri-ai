import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
import py_compile

with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines 460-462 are: '            )\n', '\n', '\n'
# Then 463 onwards is the orphaned production body.
# Insert the if-condition between 462 and 463 (0-indexed: 461 and 462)
# i.e. after line 462 (index 461), insert the missing if-line

insert_idx = 462  # 0-indexed, AFTER the two blank lines (lines 461 and 462 = indices 460 and 461)
new_line = '        if module_id == "production" and result.get("predictedYield") is not None:\n'

lines.insert(insert_idx, new_line)
print(f'Inserted at index {insert_idx} (line {insert_idx+1})')
print(f'Context:')
for i in range(insert_idx-3, insert_idx+5):
    print(f'  {i+1}: {repr(lines[i][:80])}')

with open('voice_api.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

try:
    py_compile.compile('voice_api.py', doraise=True)
    print('Syntax OK')
except py_compile.PyCompileError as e:
    print(f'Syntax error: {e}')
