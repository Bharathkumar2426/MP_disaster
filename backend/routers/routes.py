"""
Safe-Route Guidance Router (Phase 7)

Provides:
- Point-to-point road network and geodesic routing
- Active hazard corridor scanning
- Safety classification (CLEAR, CAUTION, HIGH_RISK)
- Actionable advisories and clear disclaimers
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
import models
import schemas
from security import get_current_user
from routing_service import calculate_safe_route
from location_service import is_valid_coordinate, resolve_location_name

logger = logging.getLogger("routes_router")

router = APIRouter(prefix="/api/routes", tags=["Safe-Route Guidance (Phase 7)"])


@router.get("/geocode")
def geocode_place_name(
    query: str = Query(..., min_length=2, description="City, district, or place name to resolve"),
    current_user: models.User = Depends(get_current_user),
):
    """
    Resolves a manual place or city query to geographical coordinates using local Indian
    GeoRegistry and Open-Meteo geocoding fallback.
    """
    cleaned = (query or "").strip()
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Location query cannot be empty.",
        )
    resolved = resolve_location_name(cleaned)
    if not resolved:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unable to resolve coordinates for '{cleaned}'. Please verify spelling or choose on map.",
        )
    lat, lon, display_name = resolved
    return {
        "query": cleaned,
        "latitude": lat,
        "longitude": lon,
        "displayName": display_name,
    }


@router.post("/safe-route", response_model=schemas.SafeRouteResponse)
def get_safe_route_guidance(
    req: schemas.SafeRouteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Computes an evacuation or safe transit route between origin and destination coordinates.
    Scans for intersecting or nearby active hazards within the travel corridor.
    Provides clear safety warnings without guaranteeing absolute safety.
    """
    o_lat = req.originLat
    o_lon = req.originLon
    o_name = (req.originName or "Origin").strip()

    # If origin coordinates not explicitly given, try resolving originQuery / originName
    if o_lat is None or o_lon is None:
        q = (req.originQuery or (o_name if o_name != "Origin" else "")).strip()
        if q:
            resolved = resolve_location_name(q)
            if resolved:
                o_lat, o_lon, resolved_name = resolved
                o_name = resolved_name
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unable to resolve origin location '{q}'. Please enter coordinates manually or choose on map.",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Origin coordinates or a valid origin place query are required.",
            )

    d_lat = req.destinationLat
    d_lon = req.destinationLon
    d_name = (req.destinationName or "Destination").strip()

    # If destination coordinates not explicitly given, try resolving destinationQuery / destinationName
    if d_lat is None or d_lon is None:
        q = (req.destinationQuery or (d_name if d_name != "Destination" else "")).strip()
        if q:
            resolved = resolve_location_name(q)
            if resolved:
                d_lat, d_lon, resolved_name = resolved
                d_name = resolved_name
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unable to resolve destination location '{q}'. Please enter coordinates manually or choose on map.",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Destination coordinates or a valid destination place query are required.",
            )

    if not is_valid_coordinate(o_lat, o_lon):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Origin coordinates ({o_lat}, {o_lon}) are invalid or out of bounds (-90 to 90 lat, -180 to 180 lon).",
        )

    if not is_valid_coordinate(d_lat, d_lon):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Destination coordinates ({d_lat}, {d_lon}) are invalid or out of bounds (-90 to 90 lat, -180 to 180 lon).",
        )

    try:
        route_result = calculate_safe_route(
            db=db,
            origin_lat=o_lat,
            origin_lon=o_lon,
            origin_name=o_name,
            dest_lat=d_lat,
            dest_lon=d_lon,
            dest_name=d_name,
            corridor_buffer_km=float(req.corridorBufferKm or 20.0),
        )
        return route_result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        logger.error("Safe route calculation error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to complete safe route calculation: {str(e)}",
        )
