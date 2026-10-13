"""
Intelligent Preparedness and Training Recommendations Service (Phase 6)

Provides:
1. Hazard-specific, practical disaster preparedness guidance (Before, During, After, Kits, Precautions).
2. Explainable training-program recommendations matching existing programs to disaster types and skills.
3. Relevant training-center matching using verified coordinates and Haversine distance calculations.
4. Supporting risk context from Phase 5 provisional rule-based assessment without treating heuristic scores as official alerts.

Safety & Integrity Guarantees:
- Read-only: Does not create, modify, or delete disaster incidents or database records.
- Does not invent fake training programs or centers.
- Clearly distinguishes general preparedness guidance from official emergency warnings.
- Does not automatically trigger notifications or alter incident severity.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

import models
from data.safety_data import get_safety_by_type, SAFETY_KNOWLEDGE_BASE
from location_service import haversine_distance_km, is_valid_coordinate
from risk_service import evaluate_risk

logger = logging.getLogger("recommendation_service")


# Keyword & Competency taxonomy for matching existing programs to disaster hazards
HAZARD_SKILL_TAXONOMY = {
    "flood": {
        "keywords": ["water", "flood", "swiftwater", "boat", "drown", "current", "inundation", "aquatic", "marine"],
        "core_skills": ["Swiftwater rescue", "Floodwater navigation", "Water purification", "High-ground evacuation"],
        "relevant_disasters": ["Flood", "Flash Flood", "River Basin Flooding", "Tsunami"],
    },
    "fire": {
        "keywords": ["fire", "wildfire", "flame", "burn", "smoke", "hazmat", "extinguisher", "forest", "bushfire"],
        "core_skills": ["Fire suppression drills", "Smoke inhalation first aid", "Defensible space creation", "Burn trauma care"],
        "relevant_disasters": ["Wildfire", "Forest Fire", "Structural Fire", "Industrial Fire"],
    },
    "cyclone": {
        "keywords": ["cyclone", "storm", "wind", "hurricane", "typhoon", "gale", "command", "ics", "evacuation"],
        "core_skills": ["Windproof shelter preparation", "Structural bracing", "Emergency radio communication", "Incident command operations"],
        "relevant_disasters": ["Cyclone", "Severe Storm", "Gale", "Hurricane"],
    },
    "earthquake": {
        "keywords": ["quake", "earthquake", "rubble", "collapse", "structural", "usar", "trauma", "extrication"],
        "core_skills": ["Drop, Cover, and Hold", "Structural collapse triage", "Urban search & rescue (USAR)", "Crush injury extrication"],
        "relevant_disasters": ["Earthquake", "Tectonic Shock", "Building Collapse"],
    },
    "heatwave": {
        "keywords": ["heat", "thermal", "heatwave", "temperature", "hydration", "trauma", "medical", "first aid"],
        "core_skills": ["Heat stroke rapid cooling", "Electrolyte management", "Vulnerable population checks", "Hydration logistics"],
        "relevant_disasters": ["Heatwave", "Extreme Heat", "Thermal Stress"],
    },
    "landslide": {
        "keywords": ["landslide", "mudslide", "slope", "mountain", "wilderness", "highland", "trauma", "rescue"],
        "core_skills": ["Slope movement detection", "High-angle litter extrication", "Wilderness trauma stabilization", "Mudflow escape"],
        "relevant_disasters": ["Landslide", "Mudslide", "Slope Failure"],
    },
    "tsunami": {
        "keywords": ["tsunami", "wave", "coastal", "water", "marine", "evacuation", "swiftwater"],
        "core_skills": ["Rapid coastal evacuation", "Vertical evacuation to reinforced structures", "Emergency siren response"],
        "relevant_disasters": ["Tsunami", "Tidal Surge"],
    },
}

# Cross-hazard universal foundational competencies (applicable across all emergencies)
UNIVERSAL_KEYWORDS = ["command", "ics", "emergency", "incident", "triage", "trauma", "first aid", "cpr", "disaster", "response"]


def _normalize_hazard_key(disaster_type: str) -> str:
    dt = (disaster_type or "").strip().lower()
    if any(k in dt for k in ["flood", "inundat", "rain"]):
        return "flood"
    if any(k in dt for k in ["fire", "wild", "forest", "burn"]):
        return "fire"
    if any(k in dt for k in ["cyclon", "storm", "hurrican", "typhoon", "wind"]):
        return "cyclone"
    if any(k in dt for k in ["earthquake", "quake", "seismic"]):
        return "earthquake"
    if any(k in dt for k in ["heat", "warmth", "thermal"]):
        return "heatwave"
    if any(k in dt for k in ["landslide", "mudslide", "slope"]):
        return "landslide"
    if any(k in dt for k in ["tsunami"]):
        return "tsunami"
    return "flood"  # Default fallback to primary hydrometeorological hazard


def rank_training_programs(
    db: Session,
    hazard_key: str,
    user_lat: Optional[float] = None,
    user_lon: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Ranks existing training programs in the database based on hazard keyword relevance
    and geographical proximity to the user. Does not invent fake programs.
    """
    programs = db.query(models.TrainingProgram).all()
    if not programs:
        return []

    taxonomy = HAZARD_SKILL_TAXONOMY.get(hazard_key, HAZARD_SKILL_TAXONOMY["flood"])
    hazard_keywords = taxonomy["keywords"]
    target_skills = taxonomy["core_skills"]

    ranked_list = []

    for prog in programs:
        # Evaluate keyword matching in program title and description
        text_corpus = f"{prog.programName} {prog.description or ''} {prog.trainerName or ''}".lower()

        # Score components
        direct_matches = [kw for kw in hazard_keywords if kw in text_corpus]
        universal_matches = [kw for kw in UNIVERSAL_KEYWORDS if kw in text_corpus]

        base_score = 0.0
        reasons = []

        if direct_matches:
            # Significant direct domain relevance
            base_score += min(55.0, len(direct_matches) * 20.0)
            reasons.append(f"Direct hazard relevance: covers {', '.join(direct_matches[:3])}.")
        elif universal_matches:
            # General emergency command / first-aid relevance
            base_score += min(35.0, len(universal_matches) * 12.0)
            reasons.append(f"Foundational emergency competency: covers {', '.join(universal_matches[:2])}.")
        else:
            base_score += 15.0
            reasons.append("General disaster response and community preparedness training.")

        # Center proximity factor if coordinates available
        distance_km = None
        center = prog.trainingCenter
        center_name = center.centerName if center else None
        center_district = center.district if center else None

        if center and is_valid_coordinate(user_lat, user_lon) and is_valid_coordinate(center.latitude, center.longitude):
            distance_km = haversine_distance_km(user_lat, user_lon, center.latitude, center.longitude)
            # Proximity adjustment: up to +25 points for nearby centers
            if distance_km <= 50.0:
                base_score += 25.0
                reasons.append(f"Locally accessible: host facility is within {distance_km:.1f} km.")
            elif distance_km <= 150.0:
                base_score += 15.0
                reasons.append(f"Regional facility: host center is {distance_km:.1f} km away.")
            else:
                base_score += 5.0

        match_score = round(min(100.0, max(10.0, base_score)), 1)
        reason_text = " ".join(reasons)

        ranked_list.append({
            "id": prog.id,
            "programName": prog.programName,
            "description": prog.description,
            "trainerName": prog.trainerName,
            "durationDays": prog.durationDays,
            "status": prog.status,
            "trainingCenterId": prog.trainingCenterId,
            "trainingCenterName": center_name,
            "trainingCenterDistrict": center_district,
            "distanceKm": distance_km,
            "matchScore": match_score,
            "recommendationReason": reason_text,
            "targetSkills": target_skills,
        })

    # Sort descending by match score, then ascending by distance if present
    ranked_list.sort(key=lambda x: (-x["matchScore"], x["distanceKm"] if x["distanceKm"] is not None else 999999.0))
    return ranked_list


def rank_training_centers(
    db: Session,
    user_lat: Optional[float] = None,
    user_lon: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Ranks verified training centers from the database.
    Calculates great-circle Haversine distances when coordinates are valid.
    Centers without coordinates are preserved but placed after coordinate-verified centers.
    """
    centers = db.query(models.TrainingCenter).all()
    if not centers:
        return []

    results = []
    has_user_coords = is_valid_coordinate(user_lat, user_lon)

    for center in centers:
        active_prog_count = len([p for p in (center.programs or []) if (p.status or "").upper() == "ACTIVE"])
        center_has_coords = is_valid_coordinate(center.latitude, center.longitude)

        distance_km = None
        if has_user_coords and center_has_coords:
            distance_km = haversine_distance_km(user_lat, user_lon, center.latitude, center.longitude)
            reason = f"Verified facility located {distance_km:.1f} km from your registered zone with {active_prog_count} active course(s)."
        elif center_has_coords:
            reason = f"Operational facility in {center.district} ({center.latitude:.4f}°, {center.longitude:.4f}°) with {active_prog_count} active course(s). Distance uncalculated (no user location provided)."
        else:
            reason = f"Operational facility in {center.district}. GPS coordinates unlisted in registry; accessible via regional directory."

        results.append({
            "id": center.id,
            "centerName": center.centerName,
            "district": center.district,
            "address": center.address,
            "capacity": center.capacity,
            "contactNumber": center.contactNumber,
            "coordinatorName": center.coordinatorName,
            "status": center.status,
            "latitude": center.latitude,
            "longitude": center.longitude,
            "distanceKm": distance_km,
            "activeProgramsCount": active_prog_count,
            "recommendationReason": reason,
        })

    if has_user_coords:
        # Sort centers with known distance first (ascending distance), then remaining centers
        results.sort(key=lambda c: (c["distanceKm"] is None, c["distanceKm"] if c["distanceKm"] is not None else 0))
    else:
        results.sort(key=lambda c: c["centerName"])

    return results


def get_intelligent_recommendations(
    db: Session,
    disaster_type: str,
    user: Optional[models.User] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_name: Optional[str] = None,
    include_risk_context: bool = True,
) -> Dict[str, Any]:
    """
    Assembles intelligent disaster preparedness recommendations, ranked training courses,
    nearby centers, and supporting Phase 5 risk assessment context.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    hazard_key = _normalize_hazard_key(disaster_type)

    # 1. Determine effective user location coordinates
    eff_lat = latitude
    eff_lon = longitude
    eff_loc_name = location_name

    if (eff_lat is None or eff_lon is None) and user is not None:
        if user.alertLatitude is not None and user.alertLongitude is not None:
            eff_lat = user.alertLatitude
            eff_lon = user.alertLongitude
            eff_loc_name = eff_loc_name or user.alertLocationName or "Saved Alert Zone"

    limitations: List[str] = []

    # 2. Retrieve authoritative hazard preparedness guidance
    safety_data = get_safety_by_type(hazard_key)
    if not safety_data:
        # Fallback to flood if unknown
        safety_data = get_safety_by_type("flood")
        limitations.append(f"Specific preparedness model unavailable for '{disaster_type}'; defaulted to hydrometeorological baseline.")

    overview = safety_data.get("overview", {})
    before = safety_data.get("before", {})
    during = safety_data.get("during", {})
    after = safety_data.get("after", {})
    precautions = safety_data.get("precautions", {})
    emergency_kit = safety_data.get("before", {}).get("emergencyKit", [])

    # 3. Training programs ranking
    recommended_programs = rank_training_programs(
        db=db,
        hazard_key=hazard_key,
        user_lat=eff_lat,
        user_lon=eff_lon,
    )
    if not recommended_programs:
        limitations.append("No active training programs currently logged in the database registry.")

    # 4. Training center matching
    recommended_centers = rank_training_centers(
        db=db,
        user_lat=eff_lat,
        user_lon=eff_lon,
    )
    if not is_valid_coordinate(eff_lat, eff_lon):
        limitations.append("User coordinates not provided. Training centers are listed alphabetically without distance ranking. Configure your Personal Alert Zone on the dashboard to enable proximity matching.")

    # 5. Supporting Phase 5 Risk Context (Optional & Strictly Supporting)
    risk_context = None
    if include_risk_context and is_valid_coordinate(eff_lat, eff_lon):
        try:
            raw_risk = evaluate_risk(
                disaster_type=safety_data.get("disasterType", disaster_type),
                latitude=eff_lat,
                longitude=eff_lon,
            )
            risk_context = {
                "riskCategory": raw_risk.get("riskCategory", "UNKNOWN"),
                "riskScore": raw_risk.get("riskScore"),
                "assessmentMethod": raw_risk.get("assessmentMethod", "PROVISIONAL_RULE_BASED_v1.0"),
                "assessmentTimestamp": raw_risk.get("assessmentTimestamp"),
                "contributingFactors": raw_risk.get("contributingFactors", []),
                "disclaimer": (
                    "Phase 5 provisional rule-based assessment based on real-time atmospheric telemetry. "
                    "This is an operational estimate, NOT a confirmed disaster report or official emergency warning. "
                    "A null probability indicates heuristic scoring, not zero risk."
                ),
            }
        except Exception as e:
            logger.warning("Could not evaluate Phase 5 risk context: %s", e)

    return {
        "disasterType": safety_data.get("disasterType", disaster_type),
        "userLocation": eff_loc_name,
        "userCoordinates": {"latitude": eff_lat, "longitude": eff_lon} if is_valid_coordinate(eff_lat, eff_lon) else None,
        "generatedAt": now_iso,
        "preparednessOverview": overview,
        "beforeSteps": before.get("steps", []),
        "duringSteps": during.get("steps", []),
        "afterSteps": after.get("steps", []),
        "emergencyKit": emergency_kit,
        "dos": precautions.get("dos", []),
        "donts": precautions.get("donts", []),
        "recommendedPrograms": recommended_programs,
        "recommendedCenters": recommended_centers,
        "riskContext": risk_context,
        "limitations": limitations,
    }
