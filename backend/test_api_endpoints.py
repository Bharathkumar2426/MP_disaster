import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
import models
import schemas
from routers.ai import rakshabot_chat_endpoint
from fastapi import HTTPException

db = SessionLocal()
admin_user = db.query(models.User).filter(models.User.email == "admin@disaster.com").first()

print("=== RUNNING FOCUSED RAKSHABOT ROUTER TESTS ===")

# Test 1: Empty message validation (400)
try:
    req = schemas.RakshaBotRequest(message="   ")
    rakshabot_chat_endpoint(req=req, db=db, current_user=admin_user)
    assert False, "Should have raised 400 for empty message"
except HTTPException as e:
    assert e.status_code == 400, f"Expected 400, got {e.status_code}"
    print("[PASS] 1. Empty message correctly rejected with HTTP 400")

# Test 2: Oversized message validation (400)
try:
    req = schemas.RakshaBotRequest(message="X" * 1001)
    rakshabot_chat_endpoint(req=req, db=db, current_user=admin_user)
    assert False, "Should have raised 400 for oversized message"
except HTTPException as e:
    assert e.status_code == 400, f"Expected 400, got {e.status_code}"
    print("[PASS] 2. Oversized message correctly rejected with HTTP 400")

# Test 3: Consecutive distinct messages
req1 = schemas.RakshaBotRequest(message="What disasters are happening right now?")
res1 = rakshabot_chat_endpoint(req=req1, db=db, current_user=admin_user)

req2 = schemas.RakshaBotRequest(message="What should I do during an earthquake?")
res2 = rakshabot_chat_endpoint(req=req2, db=db, current_user=admin_user)

assert res1["response"] != res2["response"], "Responses to different questions must be distinct!"
print(f"[PASS] 3. Consecutive requests produce distinct responses (Q1: {res1['model']}, Q2: {res2['model']})")

# Test 4: Location query without matching incidents
req4 = schemas.RakshaBotRequest(message="Are there active floods near Coimbatore?")
res4 = rakshabot_chat_endpoint(req=req4, db=db, current_user=admin_user)
assert "Coimbatore" in res4["response"] or "coimbatore" in res4["response"].lower()
print(f"[PASS] 4. Location query handled with specific location feedback: {res4['response'][:80]}...")

print("\n=== ALL FOCUSED ROUTER TESTS PASSED SUCCESSFULLY ===")
db.close()
