import sys
import os
import json

sys.path.append(r"d:\disaster-management-system-main\disaster-management-system-main\backend")
from database import SessionLocal
import models
from rakshabot_service import _extract_query_entities
from data.safety_data import get_safety_by_type
from weather_service import fetch_weather_for_coordinates
from risk_service import evaluate_risk
from location_service import resolve_location_name, haversine_distance_km

def build_fallback(query: str, db):
    ent = _extract_query_entities(query)
    q_lower = query.lower()
    
    # 1. Safety Guidance Query (e.g. What should I do during an earthquake?)
    is_guidance = any(k in q_lower for k in ["what should i do", "what to do", "how to survive", "precaution", "precautions", "safety tips", "steps during", "emergency kit", "first aid", "dos and don'ts"])
    if is_guidance or (ent["hazards"] and not ent["isLiveIncidentQuery"] and not ent["isTrainingQuery"] and not ent["isWeatherQuery"]):
        hz = ent["hazards"][0].lower() if ent["hazards"] else "earthquake"
        safety = get_safety_by_type(hz)
        during_steps = safety.get("during", {}).get("steps", [])
        during_text = "\n".join([f"• **{s['title']}**: {s['description']}" for s in during_steps[:4]])
        kit = safety.get("before", {}).get("emergencyKit", [])
        kit_text = "\n".join([f"• {item}" for item in kit[:4]])
        
        return (
            f"**Civil Defense Safety Protocol: {safety.get('disasterType', hz.title())} Action Guide**\n\n"
            f"**Immediate Actions During the Event:**\n{during_text}\n\n"
            f"**Essential Emergency Kit Checklist:**\n{kit_text}\n\n"
            f"**Emergency Helplines:** Dial **112** (All-India Emergency) or **1077** (NDRF Control Room) immediately for life-threatening emergencies.",
            "Civil Defense Safety Protocol",
            "National Disaster Management Guidelines (NDMA)"
        )
    
    # 2. Training Query (e.g. What training programs are available for floods?)
    if ent["isTrainingQuery"]:
        programs = db.query(models.TrainingProgram).filter(models.TrainingProgram.status == "ACTIVE").all()
        hz_filter = ent["hazards"][0].lower() if ent["hazards"] else ""
        matched_progs = [p for p in programs if not hz_filter or hz_filter in p.programName.lower() or hz_filter in (p.description or "").lower()]
        if not matched_progs:
            matched_progs = programs[:3]
        
        centers = db.query(models.TrainingCenter).filter(models.TrainingCenter.status == "ACTIVE").all()
        
        prog_lines = [f"• **{p.programName}** — Trainer: {p.trainerName} | Duration: {p.durationDays} days | Max Capacity: {p.maxParticipants} participants | Status: {p.status}" for p in matched_progs[:3]]
        center_lines = [f"• **{c.centerName}** ({c.district}) — Capacity: {c.capacity} occupants | Contact: {c.contactNumber or 'Station Desk'}" for c in centers[:3]]
        
        return (
            f"**Official Disaster Training Programs & Relief Centers:**\n\n"
            f"**Available Training Programs:**\n" + "\n".join(prog_lines) + "\n\n"
            f"**Registered Relief & Training Centers:**\n" + "\n".join(center_lines) + "\n\n"
            f"*(To enroll in any certified community resilience training, contact your district disaster management authority or the center coordinator directly.)*",
            "Disaster Training Registry",
            "Official Disaster Training & Relief Hub Directory"
        )
    
    # 3. Weather & Risk Query (e.g. What is the weather and flood risk in Kochi?)
    if (ent["isWeatherQuery"] or ent["isRiskQuery"]) and ent["latitude"] is not None and ent["longitude"] is not None:
        lat, lon, loc_name = ent["latitude"], ent["longitude"], ent["locationName"] or "Selected Location"
        weather = fetch_weather_for_coordinates(lat, lon)
        hz_for_risk = ent["hazards"][0] if ent["hazards"] else "Flood"
        risk = evaluate_risk(hz_for_risk, lat, lon)
        
        w_lines = [
            f"• **Temperature:** {weather.get('temperature')}{weather.get('temperatureUnit', '°C')}",
            f"• **Humidity:** {weather.get('humidity')}{weather.get('humidityUnit', '%')}",
            f"• **Precipitation:** {weather.get('precipitation')} {weather.get('precipitationUnit', 'mm')}",
            f"• **Wind Speed:** {weather.get('windSpeed')} {weather.get('windSpeedUnit', 'km/h')} (Gusts: {weather.get('windGusts')} {weather.get('windGustsUnit', 'km/h')})",
            f"• **Observation Time:** {weather.get('observationTime')}"
        ]
        
        factors = risk.get("contributingFactors", [])
        driver_str = "; ".join(factors[:3]) if factors else "Standard seasonal telemetry"
        
        return (
            f"**Real-Time Meteorological Observations & Provisional Risk Assessment for {loc_name}:**\n\n"
            f"**Current Weather Observations (Open-Meteo):**\n" + "\n".join(w_lines) + "\n\n"
            f"**Provisional {hz_for_risk.upper()} Risk Assessment ({risk.get('assessmentMethod')}):**\n"
            f"• **Risk Rating:** {risk.get('riskCategory')}\n"
            f"• **Provisional Risk Score:** {risk.get('riskScore')} / 100\n"
            f"• **Contributing Telemetry Drivers:** {driver_str}\n"
            f"• **Regulatory Notice:** {risk.get('disclaimer')}\n\n"
            f"*(Notice: Weather data represents physical atmospheric observations. Provisional risk is calculated deterministically via physical trigger thresholds; statistical probability is explicitly NULL and does not guarantee route safety.)*",
            "Open-Meteo & Risk Engine v1.0",
            "Open-Meteo Weather Observations • Provisional Risk Engine v1.0"
        )
    
    # 4. Proximity Incident Query (e.g. Are there active floods near Kochi?)
    if ent["locationName"] and ent["isLiveIncidentQuery"]:
        loc_name = ent["locationName"]
        all_active = db.query(models.Disaster).filter(models.Disaster.status == "ACTIVE").all()
        matched = []
        for d in all_active:
            dist = None
            if ent["latitude"] and ent["longitude"] and d.latitude and d.longitude:
                dist = haversine_distance_km(ent["latitude"], ent["longitude"], d.latitude, d.longitude)
            is_text = (d.district and loc_name.lower() in d.district.lower()) or (d.location and loc_name.lower() in d.location.lower()) or (d.disasterName and loc_name.lower() in d.disasterName.lower())
            if (dist is not None and dist <= 120.0) or is_text:
                matched.append((d, dist))
        
        if matched:
            inc_lines = [
                f"• **{d.disasterName}** (Severity: **{d.severity}** | Status: **{d.status}** | Proximity: {f'{dist:.1f} km' if dist is not None else 'Local Zone'} | Source: {d.source})\n  *Details: {d.description or 'No further remarks.'}*"
                for d, dist in matched[:4]
            ]
            resp = (
                f"**Active Disaster Incidents near {loc_name}:**\n\n"
                f"Currently, the platform database records **{len(matched)} active incident(s)** impacting this zone:\n\n"
                + "\n\n".join(inc_lines) + "\n\n"
                f"**Emergency Action:** Stay away from inundated roads, follow municipal evacuation advisories, and dial **112** for emergency assistance."
            )
        else:
            resp = (
                f"**Disaster Incident Status for {loc_name}:**\n\n"
                f"• There are currently **0 active official disaster incidents** logged in the platform operations database for '{loc_name}'.\n\n"
                f"Continue following local weather advisories and state emergency warnings."
            )
        
        return (resp, "Disaster Operations Database", "Disaster Operations Database • Emergency Operations Center")
    
    # 5. General Active Incidents Overview (e.g. What disasters are happening right now?)
    all_active = db.query(models.Disaster).filter(models.Disaster.status == "ACTIVE").order_by(models.Disaster.id.desc()).all()
    sample_lines = [
        f"• **{d.disasterName}** ({d.district or d.location}) — Type: {d.disasterType} | Severity: {d.severity} | Status: {d.status} | Source: {d.source}"
        for d in all_active[:5]
    ]
    return (
        f"**Real-Time Disaster Operations Overview:**\n\n"
        f"Currently, the platform is actively monitoring **{len(all_active)} live crisis incident(s)** across regional and global grids.\n\n"
        f"**Latest Monitored Incidents:**\n" + "\n".join(sample_lines) + "\n\n"
        f"*(Official emergency command center monitoring active. In case of localized emergency, dial 112.)*",
        "Disaster Operations Telemetry",
        "Disaster Operations Database • GDACS Live Feed"
    )

db = SessionLocal()
queries = [
    "What disasters are happening right now?",
    "Are there active floods near Kochi?",
    "What is the weather and flood risk in Kochi?",
    "What training programs are available for floods?",
    "What should I do during an earthquake?"
]

for q in queries:
    resp, model, src = build_fallback(q, db)
    print("=" * 60)
    print(f"QUERY: {q}")
    print(f"MODEL: {model} | SOURCE: {src}")
    print("-" * 60)
    print(resp)
    print("\n")

db.close()
