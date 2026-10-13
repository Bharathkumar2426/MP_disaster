"""
Location-Based Disaster Matching & Notification Service:
Calculates geographical distances using the Haversine formula, resolves location queries
via local registry and Open-Meteo geocoding fallback, filters nearby disaster incidents,
and manages persistent in-app notifications with strict deduplication.
"""
import math
import json
import logging
import urllib.request
import urllib.parse
import ssl
from typing import Optional, Tuple, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

import models
from geo_resolver import resolve_coordinates

logger = logging.getLogger("location_service")

EARTH_RADIUS_KM = 6371.0
GEOCODING_API_URL = "https://geocoding-api.open-meteo.com/v1/search"
GEOCODING_TIMEOUT_SECONDS = 4

# In-memory cache for resolved locations to eliminate redundant network roundtrips
_GEOCODING_CACHE: Dict[str, Tuple[float, float, str]] = {}


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two geographic coordinates in kilometers.
    """
    try:
        lat1_f = float(lat1)
        lon1_f = float(lon1)
        lat2_f = float(lat2)
        lon2_f = float(lon2)
    except (ValueError, TypeError):
        return float("inf")

    dlat = math.radians(lat2_f - lat1_f)
    dlon = math.radians(lon2_f - lon1_f)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1_f))
        * math.cos(math.radians(lat2_f))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return round(EARTH_RADIUS_KM * c, 2)


def is_valid_coordinate(lat: Any, lon: Any) -> bool:
    """
    Validates that latitude and longitude are valid numeric floats within Earth bounds.
    """
    if lat is None or lon is None:
        return False
    try:
        lat_f = float(lat)
        lon_f = float(lon)
        return -90.0 <= lat_f <= 90.0 and -180.0 <= lon_f <= 180.0
    except (ValueError, TypeError):
        return False


def resolve_location_name(query: str) -> Optional[Tuple[float, float, str]]:
    """
    Resolves location coordinates from query string.
    1. Checks project offline Indian GeoRegistry first.
    2. Fallback to Open-Meteo Geocoding API if not found in local registry.
    Returns (latitude, longitude, resolved_display_name) or None.
    """
    if not query or not query.strip():
        return None

    clean_q = query.strip()
    if clean_q.lower().startswith("gps") or "current gps location" in clean_q.lower():
        return None

    cache_key = clean_q.lower()
    if cache_key in _GEOCODING_CACHE:
        return _GEOCODING_CACHE[cache_key]

    # 1. Check local registry
    local_coords = resolve_coordinates(district=clean_q, location=clean_q, name=clean_q)
    if local_coords:
        res = (round(local_coords[0], 4), round(local_coords[1], 4), clean_q.title())
        _GEOCODING_CACHE[cache_key] = res
        return res

    # 2. Fallback to Open-Meteo Free Geocoding API
    try:
        params = {
            "name": clean_q,
            "count": 1,
            "language": "en",
            "format": "json",
        }
        url = f"{GEOCODING_API_URL}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "DisasterManagementPlatform/2.0 (GeocodingService)",
                "Accept": "application/json",
            },
        )
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=GEOCODING_TIMEOUT_SECONDS, context=ctx) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                results = data.get("results")
                if results and len(results) > 0:
                    top = results[0]
                    lat = float(top["latitude"])
                    lon = float(top["longitude"])
                    name = top.get("name", clean_q)
                    admin1 = top.get("admin1", "")
                    country = top.get("country", "")
                    label_parts = [p for p in [name, admin1, country] if p]
                    display_label = ", ".join(label_parts) if label_parts else name
                    res = (round(lat, 4), round(lon, 4), display_label)
                    _GEOCODING_CACHE[cache_key] = res
                    return res
    except Exception as e:
        logger.warning("Geocoding lookup for '%s' failed or timed out: %s", clean_q, e)

    return None


def find_nearby_incidents(
    db: Session,
    user_lat: float,
    user_lon: float,
    radius_km: float = 50.0,
) -> List[Dict[str, Any]]:
    """
    Finds verified disaster incidents within radius_km of the given coordinates.
    Excludes incidents with missing or non-numeric coordinates from distance calculations.
    Clearly distinguishes external GDACS incidents from manually reported ones.
    """
    if not is_valid_coordinate(user_lat, user_lon):
        return []

    try:
        max_radius = max(1.0, float(radius_km))
    except (ValueError, TypeError):
        max_radius = 50.0

    all_disasters = db.query(models.Disaster).all()
    nearby_list = []

    for d in all_disasters:
        # Exclude incidents without valid geographical coordinates
        if not is_valid_coordinate(d.latitude, d.longitude):
            continue

        dist = haversine_distance_km(user_lat, user_lon, d.latitude, d.longitude)
        if dist <= max_radius:
            source_label = "GDACS" if (d.source or "").upper() == "GDACS" else "MANUAL"
            nearby_list.append({
                "id": d.id,
                "disasterName": d.disasterName,
                "disasterType": d.disasterType,
                "district": d.district,
                "location": d.location,
                "severity": (d.severity or "MEDIUM").upper(),
                "status": (d.status or "ACTIVE").upper(),
                "source": source_label,
                "external_id": d.external_id,
                "latitude": float(d.latitude),
                "longitude": float(d.longitude),
                "distanceKm": dist,
                "reportedDate": d.reportedDate,
                "updated_at": d.updated_at,
                "description": d.description,
            })

    # Sort: HIGH severity first, then closest distance
    def sort_key(item):
        sev_rank = 0 if item["severity"] == "HIGH" else (1 if item["severity"] == "MEDIUM" else 2)
        return (sev_rank, item["distanceKm"])

    nearby_list.sort(key=sort_key)
    return nearby_list


def sync_user_notifications(db: Session, user: models.User) -> List[models.Notification]:
    """
    Evaluates nearby disaster incidents against user's saved alert preferences and
    synchronizes persistent in-app notifications without duplicates across refresh cycles.
    """
    if not user or not is_valid_coordinate(user.alertLatitude, user.alertLongitude):
        return []

    radius = user.alertRadiusKm or 50.0
    nearby_incidents = find_nearby_incidents(
        db,
        user_lat=user.alertLatitude,
        user_lon=user.alertLongitude,
        radius_km=radius,
    )

    created_or_updated = []
    location_label = user.alertLocationName or "your saved location"

    for inc in nearby_incidents:
        inc_id = inc["id"]
        # Check existing notification for this user & incident
        existing = (
            db.query(models.Notification)
            .filter(
                models.Notification.userId == user.id,
                models.Notification.disasterId == inc_id,
            )
            .first()
        )

        if existing:
            # Update distance and message if needed, but preserve existing isRead state
            existing.distanceKm = inc["distanceKm"]
            existing.severity = inc["severity"]
            existing.disasterType = inc["disasterType"]
            created_or_updated.append(existing)
        else:
            # Create new notification
            sev = inc["severity"]
            title = f"{sev} Alert: {inc['disasterName']}"
            msg = (
                f"{inc['disasterType']} in {inc['district']} is {inc['distanceKm']} km "
                f"from {location_label} (Status: {inc['status']}, Source: {inc['source']})."
            )
            new_notif = models.Notification(
                userId=user.id,
                disasterId=inc_id,
                title=title,
                message=msg,
                severity=sev,
                disasterType=inc["disasterType"],
                distanceKm=inc["distanceKm"],
                isRead=0,
                createdAt=models.utc_now(),
            )
            db.add(new_notif)
            created_or_updated.append(new_notif)

    db.commit()

    # Return all notifications for the user, newest first
    return (
        db.query(models.Notification)
        .filter(models.Notification.userId == user.id)
        .order_by(models.Notification.createdAt.desc())
        .limit(30)
        .all()
    )
