# scripts/check_endpoints.py
with open('backend/health_api.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'@app\.(get|post)\("/api/(pearl|cashflow|recommend)', text)]
for idx in matches:
    print(text[idx:idx+300])
    print('='*50)

