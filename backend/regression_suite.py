import sys
import os
import json
import urllib.request
import urllib.error

API_BASE = "http://127.0.0.1:8080"

results = []

def record(test_name: str, passed: bool, details: str = ""):
    results.append({
        "test": test_name,
        "passed": passed,
        "details": details
    })
    status_str = "PASS" if passed else "FAIL"
    print(f"[{status_str}] {test_name}: {details}")

def request_json(path: str, method: str = "GET", data: dict = None, token: str = None):
    url = f"{API_BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    encoded_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_content = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_content)
        except:
            parsed = {"error": err_content}
        return e.code, parsed
    except Exception as ex:
        return 500, {"error": str(ex)}

def run_tests():
    print("=== STARTING FULL REGRESSION TEST SUITE ===")
    
    # 1. Healthcheck
    code, data = request_json("/health")
    record("Health Check (/health)", code == 200 and data.get("status") == "HEALTHY", f"Code: {code}, Status: {data.get('status')}")
    
    # 2. Authentication & Roles
    # 2a. Admin Login
    code, admin_login = request_json("/api/auth/login", "POST", {"email": "admin@disaster.com", "password": "admin123"})
    admin_token = admin_login.get("token") or admin_login.get("accessToken") or admin_login.get("access_token")
    record("Admin Login", code == 200 and bool(admin_token), f"Code: {code}, Token received: {bool(admin_token)}")

    # 2b. Trainer Login
    code, trainer_login = request_json("/api/auth/login", "POST", {"email": "trainer@disaster.com", "password": "trainer123"})
    trainer_token = trainer_login.get("token") or trainer_login.get("accessToken") or trainer_login.get("access_token")
    record("Trainer Login", code == 200 and bool(trainer_token), f"Code: {code}, Token received: {bool(trainer_token)}")

    # 2c. Participant Login
    code, user_login = request_json("/api/auth/login", "POST", {"email": "user@disaster.com", "password": "user123"})
    user_token = user_login.get("token") or user_login.get("accessToken") or user_login.get("access_token")
    record("Participant Login", code == 200 and bool(user_token), f"Code: {code}, Token received: {bool(user_token)}")

    # 2d. Invalid Login Rejection
    code, bad_login = request_json("/api/auth/login", "POST", {"email": "admin@disaster.com", "password": "wrongpassword"})
    record("Invalid Credential Rejection", code in (400, 401), f"Expected 401/400, got {code}")

    # 3. Dashboard API
    code, dash_data = request_json("/api/dashboard", token=admin_token)
    record("Dashboard Metrics", code == 200 and "totalDisasters" in dash_data, f"Code: {code}, Disasters Count: {dash_data.get('totalDisasters')}")

    # 4. Disasters Querying & Filtering
    code, disasters = request_json("/api/disasters", token=admin_token)
    record("Disasters List", code == 200 and isinstance(disasters, list) and len(disasters) > 0, f"Found {len(disasters) if isinstance(disasters, list) else 0} incidents")

    # 4b. Filter by Severity
    code, high_disasters = request_json("/api/disasters?severity=HIGH", token=admin_token)
    record("Disasters Filter (Severity=HIGH)", code == 200 and all(d.get("severity") == "HIGH" for d in high_disasters), f"Found {len(high_disasters)} high-severity incidents")

    # 4c. Weather Telemetry (Open-Meteo)
    if disasters and len(disasters) > 0:
        target_d = next((d for d in disasters if d["id"] == 1), disasters[0])
        first_d_id = target_d["id"]
        code, weather = request_json(f"/api/disasters/{first_d_id}/weather", token=admin_token)
        err_msg = weather.get("detail") or weather.get("error")
        record("Open-Meteo Weather Endpoint", code == 200 and "temperature" in weather, f"Code: {code}, Disaster #{first_d_id}, Temp: {weather.get('temperature')}°C{f', Detail: {err_msg}' if err_msg else ''}")

        # 4d. Explainable Risk Assessment
        code, risk = request_json(f"/api/disasters/{first_d_id}/risk-assessment", token=admin_token)
        record("Explainable Risk Assessment Endpoint", code == 200 and "riskScore" in risk, f"Code: {code}, Score: {risk.get('riskScore')}/100, Cat: {risk.get('riskCategory')}")

    # 5. GDACS Telemetry
    code, gdacs = request_json("/api/disasters/gdacs/status", token=admin_token)
    has_gdacs_meta = gdacs.get("service") == "GDACS Disaster Data Collector" and "last_successful_fetch" in gdacs
    record("GDACS Collector Status", code == 200 and has_gdacs_meta, f"Code: {code}, State: {gdacs.get('state')}, Last Fetch: {gdacs.get('last_successful_fetch')}")

    # 6. Training Centers & Programs
    code, centers = request_json("/api/training-centers", token=admin_token)
    record("Training Centers Endpoint", code == 200 and isinstance(centers, list), f"Found {len(centers)} training centers")

    code, programs = request_json("/api/training-programs", token=admin_token)
    record("Training Programs Endpoint", code == 200 and isinstance(programs, list), f"Found {len(programs)} training programs")

    # 7. Safe-Route Corridor & Hazard Scanning
    route_req = {
        "originLat": 9.9312,
        "originLon": 76.2673,
        "destinationLat": 9.9816,
        "destinationLon": 76.2999
    }
    code, route_res = request_json("/api/routes/safe-route", "POST", route_req, token=admin_token)
    has_geom = "routeGeometry" in route_res and isinstance(route_res.get("routeGeometry"), list) and len(route_res["routeGeometry"]) > 0
    record("Safe Route Calculation & Hazard Scanning", code == 200 and has_geom, f"Code: {code}, Geometry Points: {len(route_res.get('routeGeometry', []))}, Safety: {route_res.get('safetyStatus')}, Distance: {route_res.get('totalDistanceKm')}km")

    # 7b. Safety Types & Intelligent Preparedness Recommendations
    code, safe_types = request_json("/api/safety/types")
    record("Safety Categories Catalog", code == 200 and isinstance(safe_types, list) and len(safe_types) > 0, f"Found {len(safe_types)} disaster safety categories")

    code, recs = request_json("/api/safety/recommendations?disaster_type=flood&latitude=9.9312&longitude=76.2673", token=admin_token)
    record("Intelligent Preparedness Recommendations", code == 200 and "preparednessOverview" in recs, f"Code: {code}, Matched Programs: {len(recs.get('recommendedPrograms', []))}, Matched Centers: {len(recs.get('recommendedCenters', []))}")

    # 8. Role Enforcement & Community Reports
    # 8a. Participant submits report
    report_payload = {
        "disasterType": "Flood",
        "locationName": "Palarivattom Bypass",
        "district": "Ernakulam",
        "latitude": 9.9980,
        "longitude": 76.3090,
        "severity": "MEDIUM",
        "description": "Localized waterlogging causing traffic slowing."
    }
    code, created_rep = request_json("/api/community-reports", "POST", report_payload, token=user_token)
    rep_id = created_rep.get("id")
    record("Citizen Community Report Submission", code == 201 and rep_id is not None, f"Report ID: {rep_id}, Status: {created_rep.get('status')}")

    # 8b. Participant attempts to verify report (Forbidden)
    if rep_id:
        code, forbidden_ver = request_json(f"/api/community-reports/{rep_id}/status", "PUT", {"status": "VERIFIED"}, token=user_token)
        record("Role Permission Enforcement (Participant cannot verify)", code == 403, f"Expected 403, got {code}")

        # 8c. Trainer verifies report (Allowed)
        code, verified_rep = request_json(f"/api/community-reports/{rep_id}/status", "PUT", {"status": "VERIFIED", "verificationNotes": "Verified by field responder."}, token=trainer_token)
        record("Responder Report Verification (Trainer verification)", code == 200 and verified_rep.get("status") == "VERIFIED", f"Code: {code}, Status: {verified_rep.get('status')}")

    # 9. Notifications Endpoint
    code, notifs = request_json("/api/notifications", token=admin_token)
    record("Notifications Polling Endpoint", code == 200 and "unreadCount" in notifs, f"Code: {code}, Unread: {notifs.get('unreadCount')}, Total: {len(notifs.get('notifications', []))}")

    # 10. RakshaBot Real-Time Intelligence & Grounding
    bot_req = {"message": "What disasters are happening right now?"}
    code, bot_res = request_json("/api/ai/chat", "POST", bot_req, token=admin_token)
    record("RakshaBot Live Disaster Intelligence", code == 200 and bool(bot_res.get("response")), f"Code: {code}, Source: {bot_res.get('dataSource')}, LiveDataIncluded: {bot_res.get('liveDataIncluded')}")

    # 10b. RakshaBot Location Query
    bot_req2 = {"message": "Are there active floods near Kochi?"}
    code, bot_res2 = request_json("/api/ai/chat", "POST", bot_req2, token=admin_token)
    record("RakshaBot Location-Specific Intelligence", code == 200 and bool(bot_res2.get("response")), f"Code: {code}, LiveDataIncluded: {bot_res2.get('liveDataIncluded')}")

    print("\n=== REGRESSION TEST SUITE SUMMARY ===")
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed
    print(f"Total: {total} | Passed: {passed} | Failed: {failed}")

if __name__ == "__main__":
    run_tests()
