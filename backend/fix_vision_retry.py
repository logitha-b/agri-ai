import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
import py_compile

with open('health_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines 2220-2225 (0-indexed 2219-2224)
print('Current lines 2220-2225:')
for i in range(2219, 2226):
    print(f'{i+1}: {repr(lines[i][:100])}')

# Replace lines 2220-2225
new_block = (
    '        except Exception as exc:\n'
    '            last_error = exc\n'
    '            err_str = str(exc)\n'
    '            # Retry on overloaded OR deprecated/unavailable model (404 NOT_FOUND)\n'
    '            if any(c in err_str for c in [\n'
    '                "503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "overloaded",\n'
    '                "404", "NOT_FOUND", "no longer available", "deprecated"\n'
    '            ]):\n'
    '                continue\n'
    '            break\n'
)
lines[2219:2225] = [new_block]

with open('health_api.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

try:
    py_compile.compile('health_api.py', doraise=True)
    print('Syntax OK')
except py_compile.PyCompileError as e:
    print('Syntax error:', e)
