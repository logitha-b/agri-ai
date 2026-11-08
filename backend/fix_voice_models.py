import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
import py_compile

with open('voice_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find GEMINI_MODEL and GEMINI_FALLBACKS
for i, ln in enumerate(lines[:60]):
    if 'GEMINI_MODEL' in ln or 'GEMINI_FALLBACKS' in ln or 'gemini-' in ln:
        print(f'{i+1}: {repr(ln[:100])}')

# Find the GEMINI_FALLBACKS block
start = None
end = None
for i, ln in enumerate(lines[:70]):
    if 'GEMINI_FALLBACKS = [' in ln:
        start = i
    if start and ']' in ln and i > start:
        end = i
        break

print(f'FALLBACKS block: {start+1}-{end+1}')

new_default = 'GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()\n'
new_fallbacks = (
    '# Fallback models tried in order if primary is overloaded / unavailable\n'
    'GEMINI_FALLBACKS = [\n'
    '    "gemini-3.8-flash",\n'
    '    "gemini-3.5-flash",\n'
    '    "gemini-flash-latest",\n'
    '    "gemini-3.1-flash-lite",\n'
    '    "gemini-2.5-flash",\n'
    ']\n'
)

# Replace GEMINI_MODEL line
for i, ln in enumerate(lines[:60]):
    if ln.startswith('GEMINI_MODEL = '):
        lines[i] = new_default
        print(f'Replaced GEMINI_MODEL at line {i+1}')
        break

# Replace GEMINI_FALLBACKS block
lines[start:end+1] = [new_fallbacks]

with open('voice_api.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

try:
    py_compile.compile('voice_api.py', doraise=True)
    print('Syntax OK')
except py_compile.PyCompileError as e:
    print('Syntax error:', e)
print('Done')
