with open('src/components/ModuleResultRenderer.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, l in enumerate(lines):
    if "schemes" in l:
        print(f"{i}: {l.strip()[:100]}")

