# scripts/find_all_gemini.py
with open('backend/health_api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if any(k in line for k in ['models.generate_content', 'generate_content', 'GEMINI_API_KEY']):
        print(f"Line {idx+1}: {line.strip()}")
        # print enclosing function
        for back in range(idx, max(0, idx-50), -1):
            if lines[back].startswith('def ') or lines[back].startswith('async def ') or lines[back].startswith('@app.'):
                print(f"   Enclosing: {lines[back].strip()}")
                break

