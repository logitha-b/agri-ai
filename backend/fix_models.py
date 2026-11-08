import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
import py_compile

with open('health_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the MODELS_TO_TRY block  
start = None
end = None
for i, ln in enumerate(lines):
    if 'MODELS_TO_TRY = [' in ln and start is None:
        start = i
    if start is not None and ']' in ln and i > start:
        end = i
        break

print(f'MODELS_TO_TRY: lines {start+1}-{end+1}')
for i in range(start, end+1):
    print(f'  {i+1}: {repr(lines[i][:100])}')

# Replace with actual available models
new_block = (
    '    MODELS_TO_TRY = [\n'
    '        os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),\n'
    '        "gemini-3.8-flash",        # Latest — supports vision\n'
    '        "gemini-3.5-flash",        # Confirmed available\n'
    '        "gemini-3.1-flash-image",  # Image-specific model\n'
    '        "gemini-2.5-flash-image",  # Image-specific model\n'
    '        "gemini-flash-latest",     # Alias for latest flash\n'
    '        "gemini-3.1-flash-lite",   # Lite fallback\n'
    '        "gemini-2.5-flash",        # Older flash with vision\n'
    '    ]\n'
)

lines[start:end+1] = [new_block]

with open('health_api.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

try:
    py_compile.compile('health_api.py', doraise=True)
    print('Syntax OK')
except py_compile.PyCompileError as e:
    print('Syntax error:', e)
print('Done')
