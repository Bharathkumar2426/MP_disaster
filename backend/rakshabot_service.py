"""
Phase 8 / 8.1: RakshaBot — AI Disaster Safety Assistant & Real-Time Intelligence Engine
Grounds responses in live platform telemetry:
- Active database disaster records (GDACS & Manual incident logs)
- Verified community reports
- Live meteorological observations via Open-Meteo
- Explainable provisional risk assessments (PROVISIONAL_RULE_BASED_v1.0)
- Official disaster training programs and relief centers
- Authoritative NDMA disaster safety, evacuation, and emergency kit guidelines

Provides high-fidelity Gemini AI responses when available, and question-specific,
evidence-grounded fallback responses when Gemini is rate-limited (HTTP 429), times out,
or is unavailable.
"""
import os
import re
import time
import json
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from location_service import resolve_location_name, haversine_distance_km, is_valid_coordinate
from weather_service import fetch_weather_for_coordinates
from risk_service import evaluate_risk
from data.safety_data import get_safety_by_type
from gdacs_collector import get_gdacs_collector

logger = logging.getLogger("rakshabot_service")

# Priority model candidate list
GEMINI_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
]

# Fast bounded network timeout per model in seconds to prevent exceeding frontend timeout (25s)
GEMINI_TIMEOUT_SECONDS = 7.0

# Cooldown timestamp for HTTP 429 quota exhaustion (60 seconds)
_GEMINI_COOLDOWN_UNTIL: float = 0.0

# Rate limiter: maximum 15 queries per 60 seconds per user
_USER_RATE_LIMITS: Dict[int, List[float]] = defaultdict(list)
RATE_LIMIT_WINDOW_SECONDS = 60.0
MAX_REQUESTS_PER_WINDOW = 15

DISASTER_SAFETY_SYSTEM_PROMPT = """You are RakshaBot (रक्षाBot), the official real-time AI Disaster Safety & Emergency Assistant embedded in the Disaster Management Platform.

YOUR MISSION:
Deliver calm, accurate, actionable disaster guidance, real-time incident summaries, meteorological context, emergency preparedness advice, and first-aid essentials grounded strictly in the platform's verified telemetry.

CORE SAFETY DIRECTIVES (NON-NEGOTIABLE):
1. HUMAN LIFE & IMMEDIATE DANGER:
   - If the user is facing life-threatening danger (trapped, rising floodwaters, structural collapse, active fire, severe injury):
     Instruct them FIRST to call official emergency response immediately:
     • India All-in-One Emergency: 112
     • Police: 100 | Fire: 101 | Ambulance: 108
     • National Disaster Response Force (NDRF): 1077
     • State Disaster Management Control Room: 1070
     Instruct them to seek immediate higher ground, open spaces, or safety if possible.
2. GROUNDING & FIDELITY TO PLATFORM DATA:
   - When answering questions about current events, active incidents, locations, weather, or risk:
     BASE YOUR ANSWER STRICTLY ON THE REAL-TIME PLATFORM CONTEXT PROVIDED IN THE PROMPT.
   - Always state the specific data source (e.g., 'Official Disaster Operations Database', 'GDACS Live Feed', 'Open-Meteo Current Weather', 'Verified Community Incident Network', 'Provisional Rule-Based Risk Engine v1.0').
   - Include the observation time or last-updated timestamp from the data when provided.
   - If the user asks about a location or hazard and the data shows NO active incidents:
     Explicitly state that no active incidents are currently logged in the platform's database for that sector.
   - NEVER invent or fabricate live incidents, casualty statistics, weather values, or damage details.
3. ACCURACY & VERIFICATION SAFEGUARDS:
   - NEVER claim that an unverified road, transit route, bridge, or shelter is verified safe. Advise users to check the platform's Safe-Route Guidance and official Civil Defense advisories.
   - Clearly explain that provisional risk assessments are heuristic estimates based on atmospheric data (PROVISIONAL_RULE_BASED_v1.0) and do NOT guarantee safety or replace official civil defense orders.
4. GENERAL SAFETY & FIRST-AID ONLY:
   - Provide standard first-aid fundamentals (direct pressure on severe bleeding, cooling thermal burns with clean tap water, recovery position, CPR hand rhythms, immobilizing fractures).
   - NEVER give unsupported clinical medical diagnoses, prescription drug dosages, or invasive procedures.
5. TONE & FORMAT:
   - Clear, concise, structured with bullet points or numbered steps, and easy to read during high-stress situations. Avoid overwhelming walls of text.
"""

DEFAULT_SUGGESTIONS = [
    "What disasters are happening right now?",
    "Are there active floods near Kochi?",
    "What is the weather and flood risk in Kochi?",
    "What training programs are available for floods?",
    "What should I do during an earthquake?",
]

TOPIC_SUGGESTIONS = {
    "flood": [
        "What to do if trapped inside a building during a flash flood?",
        "Are there active floods near Kochi or Ernakulam?",
        "What training programs are available for floods?",
    ],
    "earthquake": [
        "What should I do during an earthquake?",
        "Explain 'Drop, Cover, and Hold On' during strong tremors",
        "Essential items in an earthquake survival kit",
    ],
    "fire": [
        "How to safely escape a smoke-filled room or corridor?",
        "First aid steps for minor vs severe thermal burns",
        "When should I attempt to extinguish a fire vs evacuate?",
    ],
    "cyclone": [
        "How to prepare my home and windows before a severe cyclone?",
        "Safety precautions regarding fallen power lines after a storm",
        "Emergency supplies needed during a cyclone warning",
    ],
    "weather": [
        "What is the weather and flood risk in Kochi?",
        "How do rainfall and wind impact provisional risk scores?",
        "Explain provisional rule-based disaster risk assessments",
    ],
    "training": [
        "What disaster training programs are currently available?",
        "Where are the nearest emergency relief & training centers?",
        "What training programs are available for floods?",
    ],
}


def _get_gemini_api_key() -> str:
    """
    Securely resolves GEMINI_API_KEY from environment or backend .env.
    Never exposes, logs, or returns the key in error details.
    """
    for env_var in ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GEMINI_KEY"]:
        val = os.getenv(env_var, "").strip()
        if val and val != "YOUR_GEMINI_API_KEY":
            return val

    backend_dir = os.path.dirname(os.path.abspath(__file__))
    candidate_paths = [
        os.path.join(backend_dir, ".env"),
        os.path.join(os.path.dirname(backend_dir), ".env"),
    ]
    for env_path in candidate_paths:
        if os.path.exists(env_path):
            try:
                from dotenv import load_dotenv
                load_dotenv(env_path, override=True)
            except ImportError:
                pass

            for env_var in ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GEMINI_KEY"]:
                val = os.getenv(env_var, "").strip()
                if val and val != "YOUR_GEMINI_API_KEY":
                    return val

            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'\"")
                            if k in ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GEMINI_KEY"] and v and v != "YOUR_GEMINI_API_KEY":
                                os.environ[k] = v
                                return v
            except Exception:
                pass

    return ""


def _check_rate_limit(user_id: int):
    now = time.time()
    user_timestamps = _USER_RATE_LIMITS[user_id]
    valid_timestamps = [t for t in user_timestamps if now - t < RATE_LIMIT_WINDOW_SECONDS]
    _USER_RATE_LIMITS[user_id] = valid_timestamps
    if len(valid_timestamps) >= MAX_REQUESTS_PER_WINDOW:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="RakshaBot rate limit reached: Maximum 15 requests per minute. Please pause for a moment before sending another query.",
        )
    _USER_RATE_LIMITS[user_id].append(now)


def _get_suggested_questions(user_query: str) -> List[str]:
    q_lower = user_query.lower()
    for keyword, suggestions in TOPIC_SUGGESTIONS.items():
        if keyword in q_lower:
            return suggestions
    return DEFAULT_SUGGESTIONS


def _extract_query_entities(
    query: str,
    user: Optional[models.User] = None,
    explicit_location: Optional[str] = None,
    explicit_lat: Optional[float] = None,
    explicit_lon: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Extracts locations, hazard types, and query intent from the user message.
    """
    q_lower = query.lower()

    # Hazard detection
    detected_hazards: List[str] = []
    if any(k in q_lower for k in ["flood", "inundat", "waterlogging", "submerged"]):
        detected_hazards.append("Flood")
    if any(k in q_lower for k in ["cyclone", "storm", "hurricane", "typhoon"]):
        detected_hazards.append("Cyclone")
    if any(k in q_lower for k in ["earthquake", "quake", "tremor", "seismic"]):
        detected_hazards.append("Earthquake")
    if any(k in q_lower for k in ["fire", "wildfire", "forest fire"]):
        detected_hazards.append("Fire")
    if any(k in q_lower for k in ["landslide", "mudslide"]):
        detected_hazards.append("Landslide")
    if any(k in q_lower for k in ["tsunami"]):
        detected_hazards.append("Tsunami")
    if any(k in q_lower for k in ["heat", "heatwave", "thermal"]):
        detected_hazards.append("Heatwave")

    # Location detection
    target_loc_name: Optional[str] = explicit_location
    target_lat: Optional[float] = explicit_lat
    target_lon: Optional[float] = explicit_lon

    known_cities = [
        "Kochi", "Cochin", "Ernakulam", "Chennai", "Wayanad", "Assam", "Sivasagar",
        "Dibrugarh", "Karur", "Delhi", "Mumbai", "Kolkata", "Bengaluru", "Bangalore",
        "Hyderabad", "Thrissur", "Trivandrum", "Thiruvananthapuram", "Kozhikode",
        "Coimbatore", "Madurai", "Salem", "Trichy", "Cuddalore", "Nagapattinam", "Nilgiris"
    ]

    if not target_loc_name:
        for city in known_cities:
            pattern = r"\b" + re.escape(city.lower()) + r"\b"
            if re.search(pattern, q_lower):
                target_loc_name = city
                break

    # If location still None, check if user has saved alert zone preferences
    if not target_loc_name and user is not None:
        if is_valid_coordinate(user.alertLatitude, user.alertLongitude):
            target_lat = user.alertLatitude
            target_lon = user.alertLongitude
            target_loc_name = user.alertLocationName or "Saved Alert Zone"

    # Resolve coordinates if name is known but coordinates are not
    if target_loc_name and (target_lat is None or target_lon is None):
        res = resolve_location_name(target_loc_name)
        if res:
            target_lat, target_lon, clean_name = res
            target_loc_name = clean_name

    # Intent detection with word boundary checks
    is_live_incident_query = bool(re.search(
        r"\b(happening|right now|active|latest|recent|current|ongoing|incidents|disasters|events|crisis|situation|near|around me)\b",
        q_lower
    ))
    is_weather_query = bool(re.search(
        r"\b(weather|temperature|forecast|rain|rainfall|precipitation|wind|humidity|atmospheric)\b",
        q_lower
    ))
    is_risk_query = bool(re.search(
        r"\b(risk|danger|threat|hazard level|risk score|safety assessment)\b",
        q_lower
    ))
    is_training_query = bool(re.search(
        r"\b(training|program|programs|course|workshop|center|centers|centre|centres|relief camp|relief center|relief hubs|drill)\b",
        q_lower
    ))
    is_safety_guidance_query = bool(re.search(
        r"\b(what should i do|what to do|how to survive|precaution|precautions|safety tips|survival|steps during|emergency kit|first aid|dos and don'ts|do's and don'ts|guideline|guidelines|checklist|protocol)\b",
        q_lower
    ))
    wants_india = bool(re.search(
        r"\b(india|indian|national|country|state|kerala|tamil nadu|assam|delhi|maharashtra)\b",
        q_lower
    ))

    # Categorize the primary intent cleanly
    if is_safety_guidance_query or (detected_hazards and not is_live_incident_query and not is_training_query and not is_weather_query and not is_risk_query):
        primary_intent = "SAFETY_GUIDANCE"
    elif is_training_query:
        primary_intent = "TRAINING_AND_RELIEF"
    elif is_weather_query or is_risk_query:
        primary_intent = "WEATHER_AND_RISK"
    elif target_loc_name and is_live_incident_query:
        primary_intent = "LOCATION_INCIDENTS"
    elif is_live_incident_query or wants_india:
        primary_intent = "GLOBAL_INCIDENTS_OVERVIEW"
    else:
        primary_intent = "GENERAL"

    return {
        "hazards": detected_hazards,
        "locationName": target_loc_name,
        "latitude": target_lat,
        "longitude": target_lon,
        "isLiveIncidentQuery": is_live_incident_query,
        "isWeatherQuery": is_weather_query,
        "isRiskQuery": is_risk_query,
        "isTrainingQuery": is_training_query,
        "isSafetyGuidanceQuery": is_safety_guidance_query,
        "wantsIndia": wants_india,
        "primaryIntent": primary_intent,
    }


def _retrieve_live_platform_context(
    query: str,
    db: Session,
    user: Optional[models.User] = None,
    explicit_location: Optional[str] = None,
    explicit_lat: Optional[float] = None,
    explicit_lon: Optional[float] = None,
) -> Tuple[Optional[str], Optional[str], Optional[str], bool, Dict[str, Any]]:
    """
    Safely retrieves relevant platform database records, weather observations,
    and provisional risk context based on query intent.

    Returns:
        (context_block, primary_data_source, latest_timestamp, live_data_included, retrieved_data)
    """
    entities = _extract_query_entities(query, user, explicit_location, explicit_lat, explicit_lon)

    context_lines: List[str] = []
    sources_used: List[str] = []
    latest_ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    live_data_included = False
    retrieved_data: Dict[str, Any] = {"entities": entities}

    # 1. SAFETY GUIDANCE & FIRST-AID INTENT
    if entities["primaryIntent"] == "SAFETY_GUIDANCE":
        hz_key = entities["hazards"][0].lower() if entities["hazards"] else "earthquake"
        safety_item = get_safety_by_type(hz_key)
        if safety_item:
            sources_used.append("National Disaster Management Guidelines (NDMA)")
            retrieved_data["safety"] = safety_item
            context_lines.append(f"AUTHORITATIVE DISASTER SAFETY PROTOCOL ({safety_item.get('disasterType', hz_key.title())}):")
            during_steps = safety_item.get("during", {}).get("steps", [])
            if during_steps:
                context_lines.append("Immediate Actions During Event:")
                for s in during_steps[:4]:
                    context_lines.append(f"- {s.get('title')}: {s.get('description')}")
            kit = safety_item.get("before", {}).get("emergencyKit", [])
            if kit:
                context_lines.append(f"- Recommended Emergency Kit Items: {', '.join(kit[:6])}")
            helplines = safety_item.get("helplines", [])
            if helplines:
                hl_list = [f"{h.get('name')}: {h.get('number')}" for h in helplines[:3]]
                context_lines.append(f"- Official Emergency Helplines: {', '.join(hl_list)}")

    # 2. TRAINING PROGRAMS & RELIEF CENTERS INTENT
    elif entities["primaryIntent"] == "TRAINING_AND_RELIEF":
        sources_used.append("Official Disaster Training & Relief Hub Directory")
        live_data_included = True

        programs = db.query(models.TrainingProgram).filter(models.TrainingProgram.status == "ACTIVE").all()
        hz_filter = entities["hazards"][0].lower() if entities["hazards"] else ""
        matched_progs = [p for p in programs if not hz_filter or hz_filter in p.programName.lower() or hz_filter in (p.description or "").lower()]
        if not matched_progs:
            matched_progs = programs[:4]

        centers = db.query(models.TrainingCenter).filter(models.TrainingCenter.status == "ACTIVE").all()
        retrieved_data["trainingPrograms"] = matched_progs
        retrieved_data["trainingCenters"] = centers

        context_lines.append("AUTHORITATIVE TRAINING PROGRAMS & RELIEF HUBS (DATABASE REGISTRY):")
        if matched_progs:
            context_lines.append(f"- Active Training Programs ({len(matched_progs)} available):")
            for p in matched_progs[:4]:
                context_lines.append(f"  • {p.programName} (Duration: {p.durationDays} days | Trainer: {p.trainerName} | Max Capacity: {p.maxParticipants})")
        if centers:
            context_lines.append(f"- Registered Relief & Training Centers ({len(centers)} active):")
            for c in centers[:3]:
                dist_info = ""
                if entities["latitude"] is not None and entities["longitude"] is not None and is_valid_coordinate(c.latitude, c.longitude):
                    cd = haversine_distance_km(entities["latitude"], entities["longitude"], c.latitude, c.longitude)
                    dist_info = f" [Distance: {cd:.1f} km]"
                context_lines.append(f"  • {c.centerName} ({c.district}){dist_info} - Capacity: {c.capacity} occupants (Contact: {c.contactNumber or 'Station Desk'})")

    # 3. WEATHER OBSERVATIONS & PROVISIONAL RISK ASSESSMENT INTENT
    elif entities["primaryIntent"] == "WEATHER_AND_RISK":
        lat = entities["latitude"] or 9.9312
        lon = entities["longitude"] or 76.2673
        loc_display = entities["locationName"] or "Kochi"

        try:
            weather = fetch_weather_for_coordinates(lat, lon)
            sources_used.append("Open-Meteo Weather Observations")
            live_data_included = True
            retrieved_data["weather"] = weather

            context_lines.append(f"REAL-TIME METEOROLOGICAL OBSERVATIONS FOR '{loc_display}':")
            context_lines.append(f"- Provider: {weather.get('provider', 'Open-Meteo')} (Observation Time: {weather.get('observationTime') or 'Current'})")
            context_lines.append(f"- Ambient Temperature: {weather.get('temperature')} {weather.get('temperatureUnit')}")
            context_lines.append(f"- Relative Humidity: {weather.get('humidity')} {weather.get('humidityUnit')}")
            context_lines.append(f"- Precipitation Rate: {weather.get('precipitation')} {weather.get('precipitationUnit')}")
            context_lines.append(f"- Wind Speed: {weather.get('windSpeed')} {weather.get('windSpeedUnit')} (Gusts: {weather.get('windGusts')} {weather.get('windGustsUnit')})")
            context_lines.append("- Telemetry Classification: Current physical observations, NOT a forecasted extrapolation.")
        except Exception as e:
            logger.warning("Weather fetch failed: %s", e)
            context_lines.append(f"METEOROLOGICAL TELEMETRY FOR '{loc_display}': Unavailable at this moment ({str(e)}).")

        hazard_for_risk = entities["hazards"][0] if entities["hazards"] else "Flood"
        try:
            risk_eval = evaluate_risk(hazard_for_risk, lat, lon)
            sources_used.append("Provisional Risk Engine v1.0")
            live_data_included = True
            retrieved_data["risk"] = risk_eval

            context_lines.append(f"\nPROVISIONAL RULE-BASED RISK ASSESSMENT ({hazard_for_risk.upper()} for '{loc_display}'):")
            context_lines.append(f"- Evaluated Risk Category: {risk_eval.get('riskCategory')}")
            context_lines.append(f"- Risk Score: {risk_eval.get('riskScore')} / 100")
            context_lines.append(f"- Assessment Methodology: {risk_eval.get('assessmentMethod')} (Physical atmospheric thresholds; statistical probability is explicitly NULL)")
            factors = risk_eval.get("contributingFactors", [])
            if factors:
                context_lines.append(f"- Primary Atmospheric Drivers: {'; '.join(factors[:3])}")
            context_lines.append(f"- Regulatory Notice: {risk_eval.get('disclaimer')}")
        except Exception as e:
            logger.warning("Risk eval failed: %s", e)

    # 4. LOCATION-SPECIFIC DISASTER INCIDENTS INTENT
    elif entities["primaryIntent"] == "LOCATION_INCIDENTS":
        live_data_included = True
        sources_used.append("Disaster Operations Database")
        loc_name = entities["locationName"] or "Selected Area"

        all_active_disasters = (
            db.query(models.Disaster)
            .filter(models.Disaster.status == "ACTIVE")
            .order_by(models.Disaster.reportedDate.desc())
            .all()
        )

        matched_incidents: List[Dict[str, Any]] = []
        for d in all_active_disasters:
            dist = None
            if entities["latitude"] is not None and entities["longitude"] is not None and is_valid_coordinate(d.latitude, d.longitude):
                dist = haversine_distance_km(entities["latitude"], entities["longitude"], d.latitude, d.longitude)

            is_text_match = False
            ln_lower = loc_name.lower()
            if (d.district and ln_lower in d.district.lower()) or (d.location and ln_lower in d.location.lower()) or (d.disasterName and ln_lower in d.disasterName.lower()):
                is_text_match = True

            # Match within 120km OR explicit text match
            if (dist is not None and dist <= 120.0) or is_text_match:
                # Apply hazard filter if requested
                if entities["hazards"]:
                    if not any(h.lower() in (d.disasterType or "").lower() for h in entities["hazards"]):
                        continue
                matched_incidents.append({
                    "name": d.disasterName,
                    "type": d.disasterType,
                    "severity": d.severity,
                    "district": d.district,
                    "location": d.location,
                    "source": d.source,
                    "distanceKm": round(dist, 1) if dist is not None else None,
                    "date": str(d.reportedDate or d.updated_at),
                    "description": d.description,
                })

        retrieved_data["matchedIncidents"] = matched_incidents

        if matched_incidents:
            context_lines.append(f"MATCHED ACTIVE DISASTER RECORDS FOR '{loc_name}':")
            for inc in matched_incidents:
                dist_str = f" [Distance: {inc['distanceKm']} km]" if inc['distanceKm'] is not None else ""
                context_lines.append(
                    f"• {inc['name']} (Type: {inc['type']} | Severity: {inc['severity']} | Location: {inc['district'] or inc['location']}{dist_str} | Source: {inc['source']} | Description: {inc['description']})"
                )
        else:
            context_lines.append(f"INCIDENT STATUS FOR '{loc_name}':")
            context_lines.append(f"• No active official disaster incidents are currently logged in the platform operations database for '{loc_name}'.")

    # 5. GLOBAL / NATIONAL ACTIVE INCIDENTS OVERVIEW INTENT
    elif entities["primaryIntent"] == "GLOBAL_INCIDENTS_OVERVIEW":
        live_data_included = True
        sources_used.append("Disaster Operations Database • GDACS Live Feed")

        all_active_disasters = (
            db.query(models.Disaster)
            .filter(models.Disaster.status == "ACTIVE")
            .order_by(models.Disaster.reportedDate.desc(), models.Disaster.id.desc())
            .all()
        )
        total_active_count = len(all_active_disasters)
        retrieved_data["totalActiveCount"] = total_active_count
        retrieved_data["activeDisasters"] = all_active_disasters[:8]

        context_lines.append("PLATFORM DISASTER METRICS (DATABASE & GDACS LIVE FEED):")
        context_lines.append(f"- Total active crisis incidents currently monitored: {total_active_count}")

        try:
            collector_status = get_gdacs_collector().get_status()
            if collector_status.get("last_successful_fetch"):
                context_lines.append(f"- GDACS Feed Collector: Live sync operational (last fetch: {collector_status['last_successful_fetch']})")
        except Exception:
            pass

        context_lines.append("\nRECENTLY MONITORED CRISIS INCIDENTS:")
        for d in all_active_disasters[:6]:
            context_lines.append(
                f"• {d.disasterName} ({d.district or d.location}) — Type: {d.disasterType} | Severity: {d.severity} | Status: {d.status} | Source: {d.source}"
            )

    # 6. GENERAL / UNKNOWN INTENT
    else:
        sources_used.append("National Civil Defense Knowledge Base")
        context_lines.append("CIVIL DEFENSE DISASTER MANAGEMENT BASELINE:")
        context_lines.append("- In any life-threatening emergency, call 112 immediately.")
        context_lines.append("- Prepare a 72-hour grab-and-go emergency kit with water, food, torch, radio, and first-aid supplies.")

    if not context_lines:
        return None, None, None, False, retrieved_data

    context_block = "\n".join(context_lines)
    primary_source = " • ".join(list(dict.fromkeys(sources_used))) if sources_used else "Platform Telemetry"
    return context_block, primary_source, latest_ts, live_data_included, retrieved_data


def _build_question_specific_fallback(
    query: str,
    entities: Dict[str, Any],
    retrieved_data: Dict[str, Any],
    db: Session,
) -> Tuple[str, str, str]:
    """
    Constructs an authoritative, intent-specific response grounded in database telemetry
    and civil defense guidelines when Gemini AI is rate-limited (HTTP 429), unavailable, or times out.
    """
    intent = entities.get("primaryIntent", "GENERAL")

    # 1. SAFETY GUIDANCE (e.g. "What should I do during an earthquake?")
    if intent == "SAFETY_GUIDANCE":
        hz = entities["hazards"][0].lower() if entities["hazards"] else "earthquake"
        safety = retrieved_data.get("safety") or get_safety_by_type(hz)
        if not safety:
            safety = get_safety_by_type("earthquake")

        during_steps = safety.get("during", {}).get("steps", [])
        during_text = "\n".join([f"• **{s['title']}**: {s['description']}" for s in during_steps[:4]])
        kit = safety.get("before", {}).get("emergencyKit", [])
        kit_text = "\n".join([f"• {item}" for item in kit[:4]])

        resp = (
            f"**Civil Defense Safety Protocol: {safety.get('disasterType', hz.title())} Action Guide**\n\n"
            f"**Immediate Actions During the Event:**\n{during_text}\n\n"
            f"**Essential Emergency Kit Checklist:**\n{kit_text}\n\n"
            f"**Emergency Helplines:** Dial **112** (All-India Emergency) or **1077** (NDRF Control Room) immediately for life-threatening emergencies."
        )
        return resp, "Civil Defense Safety Protocol", "National Disaster Management Guidelines (NDMA)"

    # 2. TRAINING PROGRAMS & RELIEF CENTERS (e.g. "What training programs are available for floods?")
    if intent == "TRAINING_AND_RELIEF":
        programs = retrieved_data.get("trainingPrograms") or db.query(models.TrainingProgram).filter(models.TrainingProgram.status == "ACTIVE").all()
        centers = retrieved_data.get("trainingCenters") or db.query(models.TrainingCenter).filter(models.TrainingCenter.status == "ACTIVE").all()

        prog_lines = [
            f"• **{p.programName}** — Trainer: {p.trainerName} | Duration: {p.durationDays} days | Max Capacity: {p.maxParticipants} participants | Status: {p.status}"
            for p in programs[:4]
        ]
        center_lines = [
            f"• **{c.centerName}** ({c.district}) — Capacity: {c.capacity} occupants | Contact: {c.contactNumber or 'Station Desk'}"
            for c in centers[:3]
        ]

        resp = (
            f"**Official Disaster Training Programs & Relief Centers:**\n\n"
            f"**Available Training Programs:**\n" + "\n".join(prog_lines) + "\n\n"
            f"**Registered Relief & Training Centers:**\n" + "\n".join(center_lines) + "\n\n"
            f"*(To enroll in any certified community resilience training, contact your district disaster management authority or the center coordinator directly.)*"
        )
        return resp, "Disaster Training Registry", "Official Disaster Training & Relief Hub Directory"

    # 3. WEATHER OBSERVATIONS & PROVISIONAL RISK (e.g. "What is the weather and flood risk in Kochi?")
    if intent == "WEATHER_AND_RISK":
        loc_name = entities["locationName"] or "Kochi"
        weather = retrieved_data.get("weather") or {}
        risk = retrieved_data.get("risk") or {}
        hz_for_risk = entities["hazards"][0] if entities["hazards"] else "Flood"

        w_lines = [
            f"• **Temperature:** {weather.get('temperature', 'N/A')}{weather.get('temperatureUnit', '°C')}",
            f"• **Humidity:** {weather.get('humidity', 'N/A')}{weather.get('humidityUnit', '%')}",
            f"• **Precipitation:** {weather.get('precipitation', '0.0')} {weather.get('precipitationUnit', 'mm')}",
            f"• **Wind Speed:** {weather.get('windSpeed', 'N/A')} {weather.get('windSpeedUnit', 'km/h')} (Gusts: {weather.get('windGusts', 'N/A')} {weather.get('windGustsUnit', 'km/h')})",
            f"• **Observation Time:** {weather.get('observationTime', 'Current')}"
        ]

        factors = risk.get("contributingFactors", [])
        driver_str = "; ".join(factors[:3]) if factors else "Standard seasonal telemetry"

        resp = (
            f"**Real-Time Meteorological Observations & Provisional Risk Assessment for {loc_name}:**\n\n"
            f"**Current Weather Observations (Open-Meteo):**\n" + "\n".join(w_lines) + "\n\n"
            f"**Provisional {hz_for_risk.upper()} Risk Assessment ({risk.get('assessmentMethod', 'PROVISIONAL_RULE_BASED_v1.0')}):**\n"
            f"• **Risk Rating:** {risk.get('riskCategory', 'LOW')}\n"
            f"• **Provisional Risk Score:** {risk.get('riskScore', 0)} / 100\n"
            f"• **Contributing Telemetry Drivers:** {driver_str}\n"
            f"• **Regulatory Notice:** {risk.get('disclaimer', 'Provisional heuristic calculation based on atmospheric data.')}\n\n"
            f"*(Notice: Weather data represents physical atmospheric observations. Provisional risk is calculated deterministically via physical trigger thresholds; statistical probability is explicitly NULL and does not guarantee route safety.)*"
        )
        return resp, "Open-Meteo & Risk Engine v1.0", "Open-Meteo Weather Observations • Provisional Risk Engine v1.0"

    # 4. LOCATION-SPECIFIC DISASTERS (e.g. "Are there active floods near Kochi?")
    if intent == "LOCATION_INCIDENTS":
        loc_name = entities["locationName"] or "Selected Location"
        matched = retrieved_data.get("matchedIncidents", [])

        if matched:
            inc_lines = []
            for inc in matched[:4]:
                dist_str = f"{inc['distanceKm']} km" if inc['distanceKm'] is not None else "Local Zone"
                details = inc.get('description') or 'No further remarks.'
                inc_lines.append(
                    f"• **{inc['name']}** (Severity: **{inc['severity']}** | Proximity: {dist_str} | Source: {inc['source']})\n  *Details: {details}*"
                )
            resp = (
                f"**Active Disaster Incidents near {loc_name}:**\n\n"
                f"Currently, the platform operations database records **{len(matched)} active incident(s)** impacting this zone:\n\n"
                + "\n\n".join(inc_lines) + "\n\n"
                f"**Emergency Action:** Stay away from inundated roads, follow municipal evacuation advisories, and dial **112** for emergency assistance."
            )
        else:
            hazard_text = f" {entities['hazards'][0].lower()}" if entities["hazards"] else ""
            resp = (
                f"**Disaster Incident Status for {loc_name}:**\n\n"
                f"• There are currently **0 active official{hazard_text} disaster incidents** logged in the platform operations database for '{loc_name}'.\n\n"
                f"Continue following local weather advisories and state emergency warnings. In case of emergency, dial **112**."
            )
        return resp, "Disaster Operations Database", "Disaster Operations Database • Emergency Operations Center"

    # 5. GLOBAL / NATIONAL ACTIVE INCIDENTS OVERVIEW (e.g. "What disasters are happening right now?")
    all_active = db.query(models.Disaster).filter(models.Disaster.status == "ACTIVE").order_by(models.Disaster.id.desc()).all()
    sample_lines = [
        f"• **{d.disasterName}** ({d.district or d.location}) — Type: {d.disasterType} | Severity: {d.severity} | Status: {d.status} | Source: {d.source}"
        for d in all_active[:5]
    ]
    resp = (
        f"**Real-Time Disaster Operations Overview:**\n\n"
        f"Currently, the platform is actively monitoring **{len(all_active)} live crisis incident(s)** across regional and global grids.\n\n"
        f"**Latest Monitored Incidents:**\n" + "\n".join(sample_lines) + "\n\n"
        f"*(Official emergency command center monitoring active. In case of localized emergency, dial 112.)*"
    )
    return resp, "Disaster Operations Telemetry", "Disaster Operations Database • GDACS Live Feed"


def generate_rakshabot_response(
    message: str,
    history: Optional[List[schemas.RakshaBotMessage]] = None,
    user_id: Optional[int] = None,
    user: Optional[models.User] = None,
    db: Optional[Session] = None,
    location: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Validates input, checks rate limit, retrieves real-time platform data (disasters,
    weather, risk assessments, training centers), and generates grounded responses.
    """
    global _GEMINI_COOLDOWN_UNTIL

    cleaned_message = (message or "").strip()
    if not cleaned_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty.",
        )

    if len(cleaned_message) > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message exceeds maximum allowed limit of 1000 characters.",
        )

    if user_id is not None:
        _check_rate_limit(user_id)

    # 1. Retrieve Real-Time Application Context from Database
    live_context_block: Optional[str] = None
    data_source_label: Optional[str] = None
    data_timestamp: Optional[str] = None
    is_live_data = False
    retrieved_data: Dict[str, Any] = {}
    entities: Dict[str, Any] = {}

    if db is not None:
        try:
            live_context_block, data_source_label, data_timestamp, is_live_data, retrieved_data = _retrieve_live_platform_context(
                query=cleaned_message,
                db=db,
                user=user,
                explicit_location=location,
                explicit_lat=latitude,
                explicit_lon=longitude,
            )
            entities = retrieved_data.get("entities", {})
        except Exception as e:
            logger.warning("Error gathering live platform context for RakshaBot: %s", e)
            entities = _extract_query_entities(cleaned_message, user, location, latitude, longitude)
    else:
        entities = _extract_query_entities(cleaned_message, user, location, latitude, longitude)

    # 2. Check Gemini availability and cooldown
    api_key = _get_gemini_api_key()
    now = time.time()
    is_in_cooldown = now < _GEMINI_COOLDOWN_UNTIL

    response_text = None
    successful_model = None

    if api_key and not is_in_cooldown:
        # Build contents payload for Gemini
        gemini_contents: List[Dict[str, Any]] = []
        if history:
            recent_history = history[-4:]
            for h in recent_history:
                role = "model" if h.role in ["model", "assistant"] else "user"
                h_content = (h.content or "").strip()
                if h_content:
                    gemini_contents.append({
                        "role": role,
                        "parts": [{"text": h_content[:600]}],
                    })

        # Ground prompt with retrieved platform telemetry
        augmented_user_message = cleaned_message
        if live_context_block:
            augmented_user_message = (
                f"=== VERIFIED REAL-TIME APPLICATION CONTEXT ===\n"
                f"[Source: {data_source_label} | As of: {data_timestamp}]\n\n"
                f"{live_context_block}\n"
                f"=== END OF VERIFIED APPLICATION CONTEXT ===\n\n"
                f"USER QUERY: {cleaned_message}\n\n"
                f"INSTRUCTION: Answer the query calmly and concisely using the verified platform context above. "
                f"State the data source and last-updated time. If no active incidents are reported for a queried area, state that clearly. "
                f"Explain that provisional risk is based on physical atmospheric telemetry (PROVISIONAL_RULE_BASED_v1.0) and does not verify route safety."
            )

        gemini_contents.append({
            "role": "user",
            "parts": [{"text": augmented_user_message}],
        })

        payload = {
            "system_instruction": {
                "parts": [{"text": DISASTER_SAFETY_SYSTEM_PROMPT}]
            },
            "contents": gemini_contents,
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 600,
                "topP": 0.8,
            },
        }

        # Attempt Gemini models with fast bounded timeout
        for model_name in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            try:
                with urllib.request.urlopen(req, timeout=GEMINI_TIMEOUT_SECONDS) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        candidates = data.get("candidates", [])
                        if candidates:
                            cand = candidates[0]
                            parts = cand.get("content", {}).get("parts", [])
                            if parts:
                                response_text = parts[0].get("text", "").strip()
                                if response_text:
                                    successful_model = model_name
                                    break
            except urllib.error.HTTPError as he:
                logger.warning("RakshaBot model %s error: HTTP %d", model_name, he.code)
                if he.code == 429:
                    # Rate limit / quota exhausted: set 60-second cooldown and break immediately
                    _GEMINI_COOLDOWN_UNTIL = time.time() + 60.0
                    logger.info("Gemini quota reached (HTTP 429). Setting 60s cooldown; switching to direct fallback.")
                    break
                elif he.code in [401, 403]:
                    logger.error("Gemini authorization failed: HTTP %d", he.code)
                    break
            except Exception as ex:
                logger.warning("RakshaBot model %s failed: %s", model_name, ex)
                continue

    # 3. Grounded Intent-Specific Fallback if Gemini did not produce a response
    if not response_text:
        if db is not None:
            fb_text, fb_model, fb_src = _build_question_specific_fallback(
                query=cleaned_message,
                entities=entities,
                retrieved_data=retrieved_data,
                db=db,
            )
            response_text = fb_text
            successful_model = fb_model
            data_source_label = fb_src
            is_live_data = True
        else:
            response_text = (
                "**RakshaBot Civil Defense Safety Advisory:**\n\n"
                "• In any life-threatening emergency, immediately call **112** (All-India Emergency) or **1077** (NDRF Control Room).\n"
                "• Stay tuned to official state disaster management announcements and local emergency sirens.\n"
                "• Prepare a 72-hour survival kit: 3 liters drinking water/person/day, non-perishable rations, battery radio, waterproof torch, first aid kit, whistle, and personal identification."
            )
            successful_model = "Civil Defense Core Guide"
            data_source_label = "National Disaster Management Guidelines (NDMA)"

    suggested_questions = _get_suggested_questions(cleaned_message)
    disclaimer = (
        "Civil Safety Advisory: RakshaBot provides AI-generated safety guidance and real-time platform telemetry. "
        "It does not guarantee route or shelter safety or replace emergency dispatchers. In life-threatening emergencies, dial 112 immediately."
    )

    return {
        "response": response_text,
        "suggestedQuestions": suggested_questions,
        "disclaimer": disclaimer,
        "model": successful_model or "Gemini Flash",
        "dataSource": data_source_label or "Disaster Operations Database",
        "dataTimestamp": data_timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "liveDataIncluded": is_live_data,
    }
