"""
Explainable Disaster Risk Assessment Service (Phase 5)

Methodology:
    PROVISIONAL_RULE_BASED_v1.0

Assessment Rationale & Data Audit:
    Analysis of the operational database indicates 156 disaster records (152 GDACS, 4 MANUAL),
    exhibiting extreme class imbalance (96.8% LOW severity) and no historical weather time-series
    or logged damage outcome labels. Consequently, training a supervised ML model on this baseline
    would produce severe over-fitting or invalid synthetic generalizations.
    
    In compliance with Phase 5 requirements, this module provides an explicit, explainable,
    provisional rule-based risk assessment engine grounded in physical meteorological thresholds.
    No artificial ML model or fabricated accuracy is claimed.
    Probabilities are explicitly null because heuristic scoring does not constitute a calibrated
    statistical probability distribution.

Supported Risk Evaluations:
    - Wildfire / Fire: Hot, dry, windy atmospheric conditions accelerate fuel ignition and spread.
    - Flood / Inundation: Heavy rainfall rates and saturated humidity indicate surface pooling risk.
    - Cyclone / Storm: High sustained winds and extreme wind gusts heighten structural hazard.
    - Extreme Heat: Severe ambient temperatures and high humidity create acute thermal stress.
    - Geological / Earthquake: Explicitly flagged as NOT_APPLICABLE because meteorological telemetry
      has no physical correlation with subsurface tectonic stress.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from weather_service import fetch_weather_for_coordinates, utc_now_iso

logger = logging.getLogger("risk_service")

ASSESSMENT_METHOD = "PROVISIONAL_RULE_BASED_v1.0"
IS_MODEL_TRAINED = False
MODEL_ACCURACY = None

DISCLAIMER_TEXT = (
    "Provisional heuristic risk assessment based on atmospheric telemetry. "
    "This is an operational estimate, NOT a confirmed disaster report, and does not "
    "modify official incident status or severity."
)


def _normalize_disaster_type(dtype: Optional[str]) -> str:
    if not dtype:
        return "GENERAL"
    d = dtype.strip().upper()
    if any(k in d for k in ["WILD", "FOREST", "FIRE", "BUSH"]):
        return "WILDFIRE"
    if any(k in d for k in ["FLOOD", "INUNDATION", "RIVER", "RAIN"]):
        return "FLOOD"
    if any(k in d for k in ["CYCLONE", "STORM", "HURRICANE", "TYPHOON", "TROPICAL"]):
        return "CYCLONE"
    if any(k in d for k in ["HEAT", "TEMPERATURE", "WARMTH"]):
        return "HEATWAVE"
    if any(k in d for k in ["QUAKE", "EARTHQUAKE", "SEISMIC", "TSUNAMI"]):
        return "EARTHQUAKE"
    if any(k in d for k in ["LANDSLIDE", "MUDSLIDE", "SLOPE"]):
        return "LANDSLIDE"
    return "GENERAL"


def _assess_wildfire_risk(weather: Dict[str, Any]) -> Dict[str, Any]:
    temp = weather.get("temperature")
    humidity = weather.get("humidity")
    wind_speed = weather.get("windSpeed")
    wind_gusts = weather.get("windGusts")
    precip = weather.get("precipitation")

    score = 10  # Baseline ambient risk
    factors: List[str] = []

    # Temperature factor
    if temp is not None:
        if temp >= 38.0:
            score += 30
            factors.append(f"Extreme ambient temperature ({temp:.1f}°C) severely accelerates fuel dehydration.")
        elif temp >= 33.0:
            score += 20
            factors.append(f"Elevated temperature ({temp:.1f}°C) increases vegetation dryness.")
        elif temp >= 28.0:
            score += 10
            factors.append(f"Moderate temperature ({temp:.1f}°C) sustains warm surface conditions.")
        elif temp < 15.0:
            score -= 10
            factors.append(f"Cool ambient temperature ({temp:.1f}°C) dampens fire ignition potential.")

    # Humidity factor
    if humidity is not None:
        if humidity <= 20.0:
            score += 35
            factors.append(f"Critically dry relative humidity ({humidity:.1f}%) creates high ignition susceptibility.")
        elif humidity <= 35.0:
            score += 20
            factors.append(f"Low relative humidity ({humidity:.1f}%) favors fire spread.")
        elif humidity >= 70.0:
            score -= 15
            factors.append(f"High relative humidity ({humidity:.1f}%) retards fine fuel combustion.")

    # Wind factor
    effective_wind = wind_gusts if wind_gusts is not None else wind_speed
    if effective_wind is not None:
        if effective_wind >= 50.0:
            score += 25
            factors.append(f"Dangerous wind velocity/gusts ({effective_wind:.1f} km/h) can cause rapid fire spotting.")
        elif effective_wind >= 30.0:
            score += 15
            factors.append(f"Breezy winds ({effective_wind:.1f} km/h) can carry embers.")
        elif effective_wind <= 10.0:
            score -= 5
            factors.append(f"Light winds ({effective_wind:.1f} km/h) limit rapid fire propagation.")

    # Precipitation factor
    if precip is not None:
        if precip == 0.0:
            score += 10
            factors.append("Zero active precipitation maintains dry surface canopy.")
        elif precip >= 5.0:
            score -= 30
            factors.append(f"Active precipitation ({precip:.1f} mm) directly quenches fire hazards.")
        elif precip > 0.0:
            score -= 15
            factors.append(f"Light precipitation ({precip:.1f} mm) dampens fuel bed.")

    score = max(0, min(100, score))

    if score >= 75:
        category = "HIGH"
    elif score >= 50:
        category = "ELEVATED"
    elif score >= 25:
        category = "MODERATE"
    else:
        category = "LOW"

    return {
        "riskCategory": category,
        "riskScore": score,
        "summary": f"Wildfire atmospheric spread index evaluated at {category} ({score}/100) based on current weather.",
        "contributingFactors": factors,
        "limitations": [
            "Evaluates atmospheric surface conditions only.",
            "Does not incorporate satellite fuel moisture (NDVI/FMC), forest canopy type, or local slope gradient.",
            "Not an official fire danger rating system (such as NFDRS or CFFDRS).",
        ],
    }


def _assess_flood_risk(weather: Dict[str, Any]) -> Dict[str, Any]:
    temp = weather.get("temperature")
    humidity = weather.get("humidity")
    wind_speed = weather.get("windSpeed")
    precip = weather.get("precipitation")

    score = 10
    factors: List[str] = []

    if precip is not None:
        if precip >= 35.0:
            score += 55
            factors.append(f"Torrenial precipitation ({precip:.1f} mm) exceeds standard urban drainage capacity.")
        elif precip >= 15.0:
            score += 35
            factors.append(f"Heavy rainfall rate ({precip:.1f} mm) creates high surface runoff risk.")
        elif precip >= 5.0:
            score += 20
            factors.append(f"Moderate rainfall ({precip:.1f} mm) contributes to localized pooling.")
        elif precip > 0.0:
            score += 5
            factors.append(f"Light rainfall ({precip:.1f} mm) detected.")
        else:
            score -= 10
            factors.append("No active precipitation recorded at the coordinates.")

    if humidity is not None:
        if humidity >= 85.0:
            score += 20
            factors.append(f"Saturated atmospheric humidity ({humidity:.1f}%) prevents moisture dissipation.")
        elif humidity <= 40.0:
            score -= 10
            factors.append(f"Dry atmospheric humidity ({humidity:.1f}%) promotes evaporation.")

    if wind_speed is not None and wind_speed >= 35.0:
        score += 10
        factors.append(f"Elevated wind speed ({wind_speed:.1f} km/h) compound storm runoff hazards.")

    score = max(0, min(100, score))

    if score >= 75:
        category = "HIGH"
    elif score >= 50:
        category = "ELEVATED"
    elif score >= 25:
        category = "MODERATE"
    else:
        category = "LOW"

    return {
        "riskCategory": category,
        "riskScore": score,
        "summary": f"Inundation atmospheric risk evaluated at {category} ({score}/100) based on current precipitation.",
        "contributingFactors": factors,
        "limitations": [
            "Evaluates real-time single-point precipitation from Open-Meteo.",
            "Does not measure upstream river gauge discharge, reservoir outflow, or tidal surge.",
            "Soil saturation history and elevation contours are unmeasured in this provisional tier.",
        ],
    }


def _assess_cyclone_risk(weather: Dict[str, Any]) -> Dict[str, Any]:
    wind_speed = weather.get("windSpeed")
    wind_gusts = weather.get("windGusts")
    precip = weather.get("precipitation")

    score = 10
    factors: List[str] = []

    effective_wind = wind_speed or 0.0
    effective_gust = wind_gusts or 0.0

    if effective_gust >= 80.0:
        score += 50
        factors.append(f"Severe gale-force gusts ({effective_gust:.1f} km/h) present major structural and projectile hazards.")
    elif effective_gust >= 55.0:
        score += 30
        factors.append(f"Strong gusts ({effective_gust:.1f} km/h) capable of downing tree limbs and power lines.")
    elif effective_gust >= 35.0:
        score += 15
        factors.append(f"Moderate wind gusts ({effective_gust:.1f} km/h) detected.")

    if effective_wind >= 60.0:
        score += 35
        factors.append(f"Sustained high wind speed ({effective_wind:.1f} km/h) indicates intense storm envelope.")
    elif effective_wind >= 35.0:
        score += 20
        factors.append(f"Elevated sustained wind ({effective_wind:.1f} km/h).")

    if precip is not None and precip >= 10.0:
        score += 15
        factors.append(f"Heavy convective rainfall ({precip:.1f} mm) accompanying storm winds.")

    score = max(0, min(100, score))

    if score >= 75:
        category = "HIGH"
    elif score >= 50:
        category = "ELEVATED"
    elif score >= 25:
        category = "MODERATE"
    else:
        category = "LOW"

    return {
        "riskCategory": category,
        "riskScore": score,
        "summary": f"Cyclonic/storm wind risk evaluated at {category} ({score}/100) based on telemetry.",
        "contributingFactors": factors,
        "limitations": [
            "Evaluates ground-level anemometer measurements.",
            "Does not track barometric pressure depression (hPa), eye tracking, or sea surface temperature.",
            "Official warnings must be deferred to regional meteorological agencies (IMD/JTWC).",
        ],
    }


def _assess_heatwave_risk(weather: Dict[str, Any]) -> Dict[str, Any]:
    temp = weather.get("temperature")
    humidity = weather.get("humidity")

    score = 10
    factors: List[str] = []

    if temp is not None:
        if temp >= 42.0:
            score += 60
            factors.append(f"Severe heatwave condition: ambient temperature reaches {temp:.1f}°C.")
        elif temp >= 38.0:
            score += 40
            factors.append(f"High thermal stress: temperature at {temp:.1f}°C.")
        elif temp >= 34.0:
            score += 20
            factors.append(f"Elevated temperature ({temp:.1f}°C) warrants heat precautions.")

    if humidity is not None and temp is not None and temp >= 33.0:
        if humidity >= 55.0:
            score += 25
            factors.append(f"High relative humidity ({humidity:.1f}%) combined with heat exacerbates apparent heat index.")

    score = max(0, min(100, score))

    if score >= 75:
        category = "HIGH"
    elif score >= 50:
        category = "ELEVATED"
    elif score >= 25:
        category = "MODERATE"
    else:
        category = "LOW"

    return {
        "riskCategory": category,
        "riskScore": score,
        "summary": f"Thermal stress risk evaluated at {category} ({score}/100).",
        "contributingFactors": factors,
        "limitations": [
            "Calculated from 2-meter air temperature and relative humidity.",
            "Does not measure Wet Bulb Globe Temperature (WBGT) or urban heat island effects.",
        ],
    }


def _assess_landslide_risk(weather: Dict[str, Any]) -> Dict[str, Any]:
    precip = weather.get("precipitation")
    humidity = weather.get("humidity")

    score = 10
    factors: List[str] = []

    if precip is not None:
        if precip >= 30.0:
            score += 55
            factors.append(f"Intense torrential rain ({precip:.1f} mm) is a primary trigger for slope destabilization.")
        elif precip >= 15.0:
            score += 35
            factors.append(f"Heavy rainfall ({precip:.1f} mm) increases pore water pressure in hillside soils.")
        elif precip >= 5.0:
            score += 15
            factors.append(f"Moderate rainfall ({precip:.1f} mm) detected on terrain.")
        else:
            factors.append("No active precipitation detected; low immediate meteorological trigger.")

    if humidity is not None and humidity >= 85.0:
        score += 15
        factors.append(f"High humidity ({humidity:.1f}%) indicates persistent moisture saturation.")

    score = max(0, min(100, score))

    if score >= 75:
        category = "HIGH"
    elif score >= 50:
        category = "ELEVATED"
    elif score >= 25:
        category = "MODERATE"
    else:
        category = "LOW"

    return {
        "riskCategory": category,
        "riskScore": score,
        "summary": f"Rainfall-induced slope destabilization risk evaluated at {category} ({score}/100).",
        "contributingFactors": factors,
        "limitations": [
            "Evaluates atmospheric precipitation trigger only.",
            "Geotechnical slope stability, historical slip planes, bedrock geology, and vegetation cover are unmeasured.",
        ],
    }


def _assess_earthquake_risk() -> Dict[str, Any]:
    return {
        "riskCategory": "NOT_APPLICABLE",
        "riskScore": None,
        "summary": "Geological and tectonic seismic hazards cannot be assessed from atmospheric weather telemetry.",
        "contributingFactors": [
            "Earthquakes originate from subsurface lithospheric plate tectonic stress release.",
            "Surface temperature, humidity, wind, and precipitation have no established physical causality with seismic occurrence.",
        ],
        "limitations": [
            "Seismological monitoring requires borehole seismographs and tectonic fault strain meters.",
            "Weather intelligence cannot predict or evaluate earthquake probability.",
        ],
    }


def _assess_general_risk(weather: Dict[str, Any]) -> Dict[str, Any]:
    temp = weather.get("temperature")
    wind_gusts = weather.get("windGusts") or weather.get("windSpeed")
    precip = weather.get("precipitation")

    score = 10
    factors: List[str] = []

    if temp is not None and (temp >= 40.0 or temp <= 0.0):
        score += 25
        factors.append(f"Extreme ambient temperature ({temp:.1f}°C) presents operational environmental stress.")

    if wind_gusts is not None and wind_gusts >= 50.0:
        score += 30
        factors.append(f"High wind gusts ({wind_gusts:.1f} km/h) present physical safety hazards.")

    if precip is not None and precip >= 20.0:
        score += 30
        factors.append(f"Substantial rainfall ({precip:.1f} mm) present.")

    score = max(0, min(100, score))

    if score >= 75:
        category = "HIGH"
    elif score >= 50:
        category = "ELEVATED"
    elif score >= 25:
        category = "MODERATE"
    else:
        category = "LOW"

    return {
        "riskCategory": category,
        "riskScore": score,
        "summary": f"General environmental stress evaluated at {category} ({score}/100).",
        "contributingFactors": factors or ["Atmospheric metrics within normal operational thresholds."],
        "limitations": [
            "Generalized baseline estimate without specific hazard model parameters.",
        ],
    }


def evaluate_risk(
    disaster_type: str,
    latitude: Optional[float],
    longitude: Optional[float],
    disaster_id: Optional[int] = None,
    disaster_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Executes an explainable risk evaluation for a given disaster type and coordinates.
    
    Safe & Non-Destructive:
        - Never alters existing disaster records in the database.
        - Does not dispatch push notifications.
        - Clearly reports methodology as PROVISIONAL_RULE_BASED_v1.0.
    """
    now_iso = utc_now_iso()
    norm_type = _normalize_disaster_type(disaster_type)

    base_response: Dict[str, Any] = {
        "disasterId": disaster_id,
        "disasterName": disaster_name,
        "disasterType": disaster_type,
        "latitude": latitude,
        "longitude": longitude,
        "assessmentMethod": ASSESSMENT_METHOD,
        "isModelTrained": IS_MODEL_TRAINED,
        "modelAccuracy": MODEL_ACCURACY,
        "probability": None,  # Explicitly null per requirements
        "assessmentTimestamp": now_iso,
        "dataFreshness": None,
        "disclaimer": DISCLAIMER_TEXT,
        "warnings": [],
        "limitations": [],
    }

    # If coordinates are missing, return DATA_INSUFFICIENT
    if latitude is None or longitude is None:
        base_response.update({
            "riskCategory": "DATA_INSUFFICIENT",
            "riskScore": None,
            "summary": "Geographical coordinates are missing; localized meteorological risk assessment cannot be computed.",
            "contributingFactors": ["Missing latitude/longitude coordinates."],
            "weatherObservations": None,
            "warnings": ["Coordinates are required to retrieve atmospheric observations from Open-Meteo."],
            "limitations": [
                "Assessment requires valid latitude and longitude coordinates.",
                "Cannot perform spatial risk estimation without location telemetry.",
            ],
        })
        return base_response

    # Validate coordinate bounds
    try:
        lat = float(latitude)
        lon = float(longitude)
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            base_response.update({
                "riskCategory": "DATA_INSUFFICIENT",
                "riskScore": None,
                "summary": f"Coordinates ({latitude}, {longitude}) are outside geographical bounds (-90 to 90, -180 to 180).",
                "contributingFactors": ["Out-of-bounds geographic coordinates."],
                "weatherObservations": None,
                "warnings": ["Coordinates must be within standard geographic latitude and longitude limits."],
                "limitations": ["Invalid coordinates."],
            })
            return base_response
    except (ValueError, TypeError):
        base_response.update({
            "riskCategory": "DATA_INSUFFICIENT",
            "riskScore": None,
            "summary": "Coordinates must be valid numbers.",
            "contributingFactors": ["Malformed coordinate values."],
            "weatherObservations": None,
            "warnings": ["Non-numeric coordinates."],
            "limitations": ["Invalid coordinates."],
        })
        return base_response

    # Special case: Geological earthquakes cannot use weather data
    if norm_type == "EARTHQUAKE":
        assessment = _assess_earthquake_risk()
        base_response.update({
            "riskCategory": assessment["riskCategory"],
            "riskScore": assessment["riskScore"],
            "summary": assessment["summary"],
            "contributingFactors": assessment["contributingFactors"],
            "limitations": assessment["limitations"],
            "weatherObservations": None,
            "dataFreshness": now_iso,
        })
        return base_response

    # Fetch live weather telemetry from Open-Meteo
    weather_data: Optional[Dict[str, Any]] = None
    weather_err: Optional[str] = None
    try:
        weather_data = fetch_weather_for_coordinates(lat, lon)
    except Exception as e:
        weather_err = str(e)
        logger.warning("Risk assessment weather fetch failed for (%s, %s): %s", lat, lon, e)

    if not weather_data:
        base_response.update({
            "riskCategory": "DATA_INSUFFICIENT",
            "riskScore": None,
            "summary": "Upstream meteorological telemetry currently unavailable; risk assessment cannot be computed.",
            "contributingFactors": ["Upstream weather service (Open-Meteo) returned an error or timed out."],
            "weatherObservations": None,
            "warnings": [f"Open-Meteo telemetry fetch failed: {weather_err}"],
            "limitations": [
                "Requires real-time atmospheric observations to evaluate environmental risk triggers.",
            ],
        })
        return base_response

    # Run specific hazard rule evaluation
    if norm_type == "WILDFIRE":
        result = _assess_wildfire_risk(weather_data)
    elif norm_type == "FLOOD":
        result = _assess_flood_risk(weather_data)
    elif norm_type == "CYCLONE":
        result = _assess_cyclone_risk(weather_data)
    elif norm_type == "HEATWAVE":
        result = _assess_heatwave_risk(weather_data)
    elif norm_type == "LANDSLIDE":
        result = _assess_landslide_risk(weather_data)
    else:
        result = _assess_general_risk(weather_data)

    base_response.update({
        "riskCategory": result["riskCategory"],
        "riskScore": result["riskScore"],
        "summary": result["summary"],
        "contributingFactors": result["contributingFactors"],
        "limitations": result["limitations"],
        "weatherObservations": {
            "temperature": weather_data.get("temperature"),
            "temperatureUnit": weather_data.get("temperatureUnit", "°C"),
            "humidity": weather_data.get("humidity"),
            "humidityUnit": weather_data.get("humidityUnit", "%"),
            "precipitation": weather_data.get("precipitation"),
            "precipitationUnit": weather_data.get("precipitationUnit", "mm"),
            "windSpeed": weather_data.get("windSpeed"),
            "windSpeedUnit": weather_data.get("windSpeedUnit", "km/h"),
            "windGusts": weather_data.get("windGusts"),
            "windGustsUnit": weather_data.get("windGustsUnit", "km/h"),
            "observationTime": weather_data.get("observationTime"),
        },
        "dataFreshness": weather_data.get("observationTime") or now_iso,
    })

    return base_response
