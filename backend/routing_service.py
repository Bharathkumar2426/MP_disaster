"""
Safe-Route Guidance Service (Phase 7):
Computes evacuation and transit routes using the Open Source Routing Machine (OSRM)
with resilient geodesic fallback, evaluates active hazard intersections and corridor
proximities, and delivers explainable safety advisories.
"""
import json
import logging
import ssl
import time
import urllib.request
import urllib.parse
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

import models
from location_service import haversine_distance_km, is_valid_coordinate

logger = logging.getLogger("routing_service")

OSRM_ROUTING_URL = "https://router.project-osrm.org/route/v1/driving"
ROUTING_TIMEOUT_SECONDS = 4


def _sample_route_points(coords: List[List[float]], max_samples: int = 50) -> List[List[float]]:
    """
    Downsamples route polyline points to at most max_samples evenly spaced points
    for fast, high-performance distance-to-hazard corridor scanning.
    """
    if not coords:
        return []
    if len(coords) <= max_samples:
        return coords
    step = len(coords) / float(max_samples)
    sampled = [coords[int(i * step)] for i in range(max_samples)]
    if coords[-1] not in sampled:
        sampled.append(coords[-1])
    return sampled


def calculate_safe_route(
    db: Session,
    origin_lat: float,
    origin_lon: float,
    origin_name: str = "Origin",
    dest_lat: float = 0.0,
    dest_lon: float = 0.0,
    dest_name: str = "Destination",
    corridor_buffer_km: float = 20.0,
) -> Dict[str, Any]:
    """
    Computes road network route (or direct geodesic corridor), scans active hazards
    along the route, and outputs clear safety advisories and disclaimers.
    """
    if not is_valid_coordinate(origin_lat, origin_lon) or not is_valid_coordinate(dest_lat, dest_lon):
        raise ValueError("Invalid geographic coordinates provided for route calculation.")

    # 1. Fetch route geometry via OSRM public API
    is_engine_available = False
    routing_engine = "DIRECT_GEODESIC"
    route_geometry: List[List[float]] = []
    total_distance_km = 0.0
    estimated_duration_min: Optional[float] = None

    try:
        # OSRM format: lon1,lat1;lon2,lat2
        url = f"{OSRM_ROUTING_URL}/{origin_lon:.5f},{origin_lat:.5f};{dest_lon:.5f},{dest_lat:.5f}?overview=full&geometries=geojson"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "DisasterManagementPlatform/2.0 (RouteGuidance)",
                "Accept": "application/json",
            },
        )
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=ROUTING_TIMEOUT_SECONDS, context=ctx) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                routes = data.get("routes")
                if routes and isinstance(routes, list) and len(routes) > 0:
                    r = routes[0]
                    # GeoJSON is [lon, lat], convert to [lat, lon] for Leaflet Polyline
                    geom = r.get("geometry")
                    raw_coords = geom.get("coordinates", []) if isinstance(geom, dict) else []
                    if raw_coords and len(raw_coords) >= 2:
                        parsed_pts = [
                            [float(pt[1]), float(pt[0])]
                            for pt in raw_coords
                            if isinstance(pt, (list, tuple)) and len(pt) >= 2 and is_valid_coordinate(pt[1], pt[0])
                        ]
                        if len(parsed_pts) >= 2:
                            route_geometry = parsed_pts
                            total_distance_km = round(float(r.get("distance", 0.0)) / 1000.0, 2)
                            estimated_duration_min = round(float(r.get("duration", 0.0)) / 60.0, 1)
                            is_engine_available = True
                            routing_engine = "OSRM_ROAD_NETWORK"
    except Exception as e:
        logger.warning("OSRM routing API query failed (%s). Falling back to geodesic path.", e)

    # Fallback to direct geodesic corridor if routing engine unavailable or empty
    if not route_geometry or len(route_geometry) < 2:
        steps = 20
        route_geometry = [
            [
                round(origin_lat + (dest_lat - origin_lat) * (i / float(steps - 1)), 5),
                round(origin_lon + (dest_lon - origin_lon) * (i / float(steps - 1)), 5),
            ]
            for i in range(steps)
        ]
        total_distance_km = haversine_distance_km(origin_lat, origin_lon, dest_lat, dest_lon)
        # Approximate straight-line corridor fallback: road duration cannot be reliably calculated
        estimated_duration_min = None
        is_engine_available = False
        routing_engine = "DIRECT_GEODESIC"

    # 2. Scan active hazards near the route corridor
    sampled_points = _sample_route_points(route_geometry, max_samples=40)
    if not sampled_points:
        sampled_points = [[origin_lat, origin_lon], [dest_lat, dest_lon]]
    hazards_near_route: List[Dict[str, Any]] = []

    # Query active official disasters
    active_disasters = (
        db.query(models.Disaster)
        .filter(models.Disaster.status != "RESOLVED")
        .all()
    )

    # Query verified community reports
    verified_reports = (
        db.query(models.CommunityReport)
        .filter(models.CommunityReport.status == "VERIFIED")
        .all()
    )

    buffer_limit = max(5.0, min(corridor_buffer_km or 20.0, 50.0))

    # Evaluate official disasters
    for d in active_disasters:
        if not is_valid_coordinate(d.latitude, d.longitude):
            continue
        min_dist = min(
            haversine_distance_km(pt[0], pt[1], d.latitude, d.longitude)
            for pt in sampled_points
        )
        if min_dist <= buffer_limit:
            prox_cat = (
                "CRITICAL_PROXIMITY" if min_dist < 5.0
                else "MODERATE_PROXIMITY" if min_dist < 15.0
                else "ADVISORY"
            )
            hazards_near_route.append({
                "id": d.id,
                "name": d.disasterName or "Active Incident",
                "hazardType": d.disasterType or "Disaster",
                "severity": (d.severity or "MEDIUM").upper(),
                "latitude": d.latitude,
                "longitude": d.longitude,
                "distanceToRouteKm": round(min_dist, 1),
                "source": (d.source or "MANUAL").upper(),
                "proximityCategory": prox_cat,
                "status": d.status or "ACTIVE",
            })

    # Evaluate verified community reports
    for r in verified_reports:
        if not is_valid_coordinate(r.latitude, r.longitude):
            continue
        min_dist = min(
            haversine_distance_km(pt[0], pt[1], r.latitude, r.longitude)
            for pt in sampled_points
        )
        if min_dist <= buffer_limit:
            prox_cat = (
                "CRITICAL_PROXIMITY" if min_dist < 5.0
                else "MODERATE_PROXIMITY" if min_dist < 15.0
                else "ADVISORY"
            )
            hazards_near_route.append({
                "id": r.id,
                "name": f"Community: {r.disasterType} at {r.locationName}",
                "hazardType": r.disasterType or "Disaster",
                "severity": (r.severity or "MEDIUM").upper(),
                "latitude": r.latitude,
                "longitude": r.longitude,
                "distanceToRouteKm": round(min_dist, 1),
                "source": "COMMUNITY_VERIFIED",
                "proximityCategory": prox_cat,
                "status": "VERIFIED",
            })

    # Sort hazards by closest proximity to route
    hazards_near_route.sort(key=lambda h: h["distanceToRouteKm"])

    # 3. Determine Overall Safety Classification & Advisory
    has_critical_proximity = any(h["distanceToRouteKm"] < 5.0 for h in hazards_near_route)
    has_severe_hazard = any(
        h["severity"] in ["HIGH", "CRITICAL"] and h["distanceToRouteKm"] < 10.0
        for h in hazards_near_route
    )

    if has_critical_proximity or has_severe_hazard:
        safety_status = "HIGH_RISK"
        safety_advisory = (
            f"HIGH RISK WARNING: {len(hazards_near_route)} active hazard(s) intersect or lie in immediate "
            f"proximity (<5-10 km) of this transit corridor. Transit through this sector is NOT advised. "
            f"Remain in secure shelters or request dispatch assistance."
        )
    elif len(hazards_near_route) > 0:
        safety_status = "CAUTION"
        closest = hazards_near_route[0]["distanceToRouteKm"]
        safety_advisory = (
            f"CAUTION ADVISED: {len(hazards_near_route)} hazard(s) detected near the corridor (closest at {closest} km). "
            f"Road accessibility may be degraded by secondary weather or runoff. Proceed with extreme caution."
        )
    else:
        safety_status = "CLEAR"
        safety_advisory = (
            f"CORRIDOR CLEAR: No active official disasters or verified community reports currently logged within "
            f"{buffer_limit:.0f} km of this path. Maintain communication and monitor regional emergency advisories."
        )

    if not is_engine_available:
        safety_advisory = (
            "[APPROXIMATE STRAIGHT-LINE CORRIDOR: Road network routing service is unavailable. "
            "Displayed path is an approximate straight-line geodesic corridor for hazard proximity evaluation only, "
            "NOT a drivable navigation route. Road travel time cannot be reliably determined.] "
            + safety_advisory
        )

    disclaimer = (
        "Advisory Guidance Only: Route computations and hazard proximity are operational estimates based on reported telemetry. "
        "Unreported road blockages, structural flooding, or sudden weather events may not be reflected. "
        "Never attempt evacuation through active hazard zones. Always follow official emergency directives."
    )

    return {
        "origin": {
            "name": origin_name,
            "latitude": origin_lat,
            "longitude": origin_lon,
        },
        "destination": {
            "name": dest_name,
            "latitude": dest_lat,
            "longitude": dest_lon,
        },
        "totalDistanceKm": total_distance_km,
        "estimatedDurationMinutes": estimated_duration_min,
        "routeGeometry": route_geometry,
        "isRoutingEngineAvailable": is_engine_available,
        "isRoadRoute": is_engine_available,
        "routingEngine": routing_engine,
        "safetyStatus": safety_status,
        "hazardsNearRoute": hazards_near_route,
        "safetyAdvisory": safety_advisory,
        "disclaimer": disclaimer,
    }
