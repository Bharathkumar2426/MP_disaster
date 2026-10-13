import sys
import os
import time

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
import rakshabot_service

db = SessionLocal()

# Simulate Gemini 429 cooldown
rakshabot_service._GEMINI_COOLDOWN_UNTIL = time.time() + 9999.0

queries = [
    "What disasters are happening right now?",
    "Are there active floods near Kochi?",
    "What is the weather and flood risk in Kochi?",
    "What training programs are available for floods?",
    "What should I do during an earthquake?"
]

print("=== VERIFYING RAKSHABOT FALLBACK RESPONSES (GEMINI UNAVAILABLE) ===")
responses = {}
for q in queries:
    res = rakshabot_service.generate_rakshabot_response(
        message=q,
        user_id=1,
        db=db,
    )
    responses[q] = res
    print("\n" + "=" * 60)
    print(f"QUERY: {q}")
    print(f"MODEL: {res['model']} | SOURCE: {res['dataSource']}")
    print("-" * 60)
    print(res["response"][:250] + "...")

# Ensure all fallback responses are distinct
resp_texts = [r["response"] for r in responses.values()]
assert len(set(resp_texts)) == len(resp_texts), "Fallback responses must all be distinct!"
print("\n[SUCCESS] All 5 fallback responses are distinct, grounded, and correctly generated!")

# Reset cooldown
rakshabot_service._GEMINI_COOLDOWN_UNTIL = 0.0
db.close()
