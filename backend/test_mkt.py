import asyncio, os
from dotenv import load_dotenv
load_dotenv('c:/agri/.env')
from voice_api import _detect_module, _detect_intents_gemini, genai_client

msg = 'I am a farmer from Dhruvallu, Tamil Nadu. I cultivate paddy on 2.5 acres of land. Calculate my cultivation expenses, expected yield, estimated selling price, total revenue, and net profit. Also, suggest the best nearby market to sell my produce.'
print('kw:', _detect_module(msg, {}))
loop = asyncio.get_event_loop()
intents = loop.run_until_complete(_detect_intents_gemini(msg, [], {}, genai_client))
print('gemini intents:', intents)

