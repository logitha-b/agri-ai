import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

with open('src/components/ModuleResultRenderer.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total before: {len(lines)}')

# Remove old stub: lines 262-306 (0-indexed 261-306 inclusive)
# Also remove the comment on line 262 (0-indexed 261)
# Lines 261 (comment), 262-306 (function), 307 (blank)
remove_start = 261  # 0-indexed: '// ── Crop Health result...'
remove_end   = 307  # 0-indexed (inclusive): blank line after }

lines_new = lines[:remove_start] + lines[remove_end+1:]
print(f'Total after: {len(lines_new)}')

# Verify no duplicate
count = sum(1 for ln in lines_new if 'function CropHealthResult' in ln)
print(f'CropHealthResult occurrences: {count}')

with open('src/components/ModuleResultRenderer.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines_new)

print('Done')
