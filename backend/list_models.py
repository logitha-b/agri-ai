import sys, os
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
sys.path.insert(0, '.')
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path('..') / '.env')
key = os.getenv('GEMINI_API_KEY','').strip()
print('Key length:', len(key))

# Use venv's packages
try:
    from google import genai as _genai
    client = _genai.Client(api_key=key)
    models = list(client.models.list())
    print(f'Total models: {len(models)}')
    for m in models:
        n = getattr(m, 'name', str(m))
        print(' ', n)
except Exception as e:
    print('google.genai error:', e)

# Try google-generativeai
try:
    import google.generativeai as genai2
    genai2.configure(api_key=key)
    models2 = list(genai2.list_models())
    print(f'generativeai models: {len(models2)}')
    for m in models2:
        if 'generateContent' in m.supported_generation_methods:
            print(' ', m.name)
except Exception as e:
    print('generativeai error:', e)
