import sys
import os

sys.path.append(r"d:\disaster-management-system-main\disaster-management-system-main\backend")
from database import SessionLocal
import models
from data.safety_data import get_safety_by_type
from weather_service import fetch_weather_for_coordinates
from risk_service import evaluate_risk
from location_service import resolve_location_name, haversine_distance_km

db = SessionLocal()

queries = [
    "What disasters are happening right now?",
    "Are there active floods near Kochi?",
    "What is the weather and flood risk in Kochi?",
    "What training programs are available for floods?",
    "What should I do during an earthquake?"
]

print("=== CHECKING LOGIC FOR 5 DISTINCT QUERIES ===")
for q in queries:
    print(f"\n==========================================")
    print(f"QUERY: {q}")
    print(f"==========================================")
    q_lower = q.lower()
    
    # 1. Earthquakes
    if "earthquake" in q_lower:
        eq = get_safety_by_type("earthquake")
        print("Intent: Safety Guidance (Earthquake)")
        print("During Actions:", [s["title"] for s in eq["during"]["steps"]])
        print("Emergency Kit:", eq["before"]["emergencyKit"][:3])
    
    # 2. Training for floods
    elif "training" in q_lower:
        progs = db.query(models.TrainingProgram).filter(models.TrainingProgram.status == "ACTIVE").all()
        flood_progs = [p for p in progs if "water" in p.programName.lower() or "flood" in p.programName.lower()]
        print("Intent: Training Programs (Floods)")
        print("Matching Programs:", [(p.programName, p.trainerName, p.durationDays) for p in flood_progs])
    
    # 3. Weather and risk in Kochi
    elif "weather" in q_lower and "kochi" in q_lower:
        w = fetch_weather_for_coordinates(9.9312, 76.2673)
        r = evaluate_risk("Flood", 9.9312, 76.2673)
        print("Intent: Weather & Risk (Kochi)")
        print(f"Weather: {w['temperature']}°C, Precip: {w['precipitation']}mm, Wind: {w['windSpeed']}km/h")
        print(f"Provisional Risk: Category={r['riskCategory']}, Score={r['riskScore']}/100, Method={r['assessmentMethod']}")
    
    # 4. Active floods near Kochi
    elif "kochi" in q_lower and "flood" in q_lower:
        disasters = db.query(models.Disaster).filter(models.Disaster.status == "ACTIVE").all()
        kochi_disasters = [d for d in disasters if "ernakulam" in (d.district or "").lower() or "kochi" in (d.location or "").lower()]
        print("Intent: Active Disasters Proximity (Kochi)")
        print("Kochi Incidents:", [(d.disasterName, d.severity, d.status) for d in kochi_disasters])
    
    # 5. General active disasters
    elif "happening" in q_lower or "right now" in q_lower:
        disasters = db.query(models.Disaster).filter(models.Disaster.status == "ACTIVE").all()
        print("Intent: Global/National Active Disasters Overview")
        print(f"Total Active: {len(disasters)}")
        print("Sample Active:", [(d.disasterName, d.district or d.location, d.severity) for d in disasters[:3]])

db.close()
