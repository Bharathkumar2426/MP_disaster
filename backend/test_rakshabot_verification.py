import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
import rakshabot_service

db = SessionLocal()

queries = [
    "What disasters are happening right now?",
    "Are there active floods near Kochi?",
    "What is the weather and flood risk in Kochi?",
    "What training programs are available for floods?",
    "What should I do during an earthquake?"
]

print("=== VERIFYING RAKSHABOT RESPONSE GENERATION ===")
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
    print(res["response"][:300] + "..." if len(res["response"]) > 300 else res["response"])

# Ensure no two responses are identical
resp_texts = [r["response"] for r in responses.values()]
assert len(set(resp_texts)) == len(resp_texts), "Responses must all be distinct!"
print("\n[SUCCESS] All 5 responses are distinct and appropriately generated!")

db.close()
