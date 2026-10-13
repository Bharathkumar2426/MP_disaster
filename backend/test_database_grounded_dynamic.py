import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
import models
import rakshabot_service

db = SessionLocal()

print("=== TESTING DYNAMIC DATABASE GROUNDING ===")

# 1. Insert a temporary training program
temp_prog = models.TrainingProgram(
    programName="Dynamic Drone Wildfire Reconnaissance",
    description="Hands-on thermal drone tracking for forest wildfire detection.",
    trainerName="Dr. Ananya Sharma",
    durationDays=3,
    maxParticipants=25,
    status="ACTIVE"
)
db.add(temp_prog)
db.commit()
db.refresh(temp_prog)
prog_id = temp_prog.id
print(f"Created temporary test training program #{prog_id}: {temp_prog.programName}")

try:
    # Query RakshaBot in fallback mode to inspect retrieved DB data directly
    import time
    rakshabot_service._GEMINI_COOLDOWN_UNTIL = time.time() + 9999.0
    res = rakshabot_service.generate_rakshabot_response(
        message="What training programs are available for wildfires?",
        user_id=1,
        db=db,
    )
    print("\nRakshaBot Response:")
    print(res["response"])
    assert "Dynamic Drone Wildfire Reconnaissance" in res["response"], "Newly inserted program must be immediately visible in chatbot response!"
    print("\n[SUCCESS] New record was dynamically retrieved and included in RakshaBot response!")
finally:
    # Clean up test record
    prog_to_delete = db.query(models.TrainingProgram).filter(models.TrainingProgram.id == prog_id).first()
    if prog_to_delete:
        db.delete(prog_to_delete)
        db.commit()
        print(f"Cleaned up temporary test program #{prog_id}")
    rakshabot_service._GEMINI_COOLDOWN_UNTIL = 0.0
    db.close()
