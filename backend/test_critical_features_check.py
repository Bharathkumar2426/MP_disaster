import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
import models
from weather_service import fetch_weather_for_coordinates
from risk_service import evaluate_risk
from location_service import resolve_location_name, haversine_distance_km
from routing_service import calculate_safe_route
from data.safety_data import get_safety_by_type

db = SessionLocal()

print("=== VERIFYING CRITICAL EXISTING PLATFORM SERVICES ===")

# 1. Database models & records preservation
user_count = db.query(models.User).count()
disaster_count = db.query(models.Disaster).count()
prog_count = db.query(models.TrainingProgram).count()
center_count = db.query(models.TrainingCenter).count()
report_count = db.query(models.CommunityReport).count()
notif_count = db.query(models.Notification).count()

print(f"[PASS] 1. Database Integrity: {user_count} users, {disaster_count} disasters, {prog_count} programs, {center_count} centers, {report_count} reports, {notif_count} notifications.")
assert user_count > 0 and disaster_count > 0 and prog_count > 0 and center_count > 0

# 2. Location & Haversine Distance
dist = haversine_distance_km(9.9312, 76.2673, 9.9816, 76.2999)
print(f"[PASS] 2. Haversine Distance: {dist:.2f} km")
assert 0 < dist < 20

# 3. Weather Service (Open-Meteo)
w = fetch_weather_for_coordinates(9.9312, 76.2673)
print(f"[PASS] 3. Open-Meteo Weather: Temp={w.get('temperature')}°C, Humidity={w.get('humidity')}%")
assert "temperature" in w

# 4. Provisional Risk Engine
r = evaluate_risk("Flood", 9.9312, 76.2673)
print(f"[PASS] 4. Risk Engine: Score={r.get('riskScore')}/100, Category={r.get('riskCategory')}")
assert "riskScore" in r

# 5. Routing Engine
route = calculate_safe_route(
    db=db,
    origin_lat=9.9312,
    origin_lon=76.2673,
    dest_lat=9.9816,
    dest_lon=76.2999,
)
print(f"[PASS] 5. Routing Service: Status={route.get('safetyStatus')}, Distance={route.get('totalDistanceKm')}km")
assert "routeGeometry" in route

# 6. Safety Knowledge Catalog
s = get_safety_by_type("flood")
print(f"[PASS] 6. Safety Catalog: Found guide for {s.get('disasterType')}")
assert s is not None and "during" in s

print("\n=== ALL CRITICAL EXISTING PLATFORM SERVICES VERIFIED 100% OPERATIONAL ===")
db.close()
