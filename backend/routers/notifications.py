from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
import models
import schemas
from security import get_current_user
from location_service import (
    haversine_distance_km,
    is_valid_coordinate,
    resolve_location_name,
    find_nearby_incidents,
    sync_user_notifications,
)

router = APIRouter(prefix="/api/notifications", tags=["Notifications & Location Alerts"])


@router.get("/preferences", response_model=schemas.LocationPreferenceResponse)
def get_user_location_preferences(
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns the authenticated user's configured alert location and radius.
    """
    is_cfg = is_valid_coordinate(current_user.alertLatitude, current_user.alertLongitude)
    return schemas.LocationPreferenceResponse(
        locationName=current_user.alertLocationName,
        latitude=current_user.alertLatitude if is_cfg else None,
        longitude=current_user.alertLongitude if is_cfg else None,
        radiusKm=float(current_user.alertRadiusKm or 50.0),
        configured=is_cfg,
    )


@router.put("/preferences", response_model=schemas.LocationPreferenceResponse)
def update_user_location_preferences(
    pref_in: schemas.LocationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Saves or updates the user's preferred alert location and radius.
    Accepts either manual text location name (auto-geocoded) or explicit coordinates (GPS).
    Validates geographical bounds and sanitizes inputs before persistence.
    """
    target_lat = pref_in.latitude
    target_lon = pref_in.longitude
    target_name = (pref_in.locationName or "").strip()
    radius = float(pref_in.radiusKm or 50.0)

    # 1. Coordinates explicitly provided
    if target_lat is not None and target_lon is not None:
        if not is_valid_coordinate(target_lat, target_lon):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Coordinates are invalid or out of bounds (latitude must be between -90 and 90, longitude between -180 and 180).",
            )
        if not target_name or "gps" in target_name.lower():
            target_name = "Current GPS Location"
    elif target_lat is not None or target_lon is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both latitude and longitude must be provided for coordinate-based location.",
        )
    elif target_name:
        # Check if target_name is a formatted coordinate string like "GPS Location (10.9551°, 77.9548°)" or "10.9551, 77.9548"
        import re
        gps_match = re.search(r"(-?\d+(?:\.\d+)?)\s*°?\s*,\s*(-?\d+(?:\.\d+)?)\s*°?", target_name)
        if ("gps" in target_name.lower() or "location" in target_name.lower()) and gps_match:
            try:
                cand_lat = float(gps_match.group(1))
                cand_lon = float(gps_match.group(2))
                if is_valid_coordinate(cand_lat, cand_lon):
                    target_lat = cand_lat
                    target_lon = cand_lon
                    target_name = "Current GPS Location"
            except Exception:
                pass

        if target_lat is None or target_lon is None:
            # Resolve via local registry or Open-Meteo fallback
            resolved = resolve_location_name(target_name)
            if not resolved:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unable to resolve coordinates for '{target_name}'. Please verify the spelling or choose a supported city/district.",
                )
            target_lat, target_lon, target_name = resolved
    else:
        # User wants to clear location preference
        current_user.alertLocationName = None
        current_user.alertLatitude = None
        current_user.alertLongitude = None
        current_user.alertRadiusKm = 50.0
        db.commit()
        return schemas.LocationPreferenceResponse(
            locationName=None,
            latitude=None,
            longitude=None,
            radiusKm=50.0,
            configured=False,
        )

    # Validate radius
    if radius <= 0 or radius > 1000:
        radius = 50.0

    current_user.alertLocationName = target_name
    current_user.alertLatitude = round(float(target_lat), 4)
    current_user.alertLongitude = round(float(target_lon), 4)
    current_user.alertRadiusKm = radius
    db.commit()
    db.refresh(current_user)

    # Immediately synchronize nearby disaster notifications for the updated location
    try:
        sync_user_notifications(db, current_user)
    except Exception:
        # Do not fail preference update if sync encounters a transient issue
        pass

    return schemas.LocationPreferenceResponse(
        locationName=current_user.alertLocationName,
        latitude=current_user.alertLatitude,
        longitude=current_user.alertLongitude,
        radiusKm=current_user.alertRadiusKm,
        configured=True,
    )


@router.post("/resolve", response_model=schemas.ResolveLocationResponse)
def resolve_location_endpoint(
    req: schemas.ResolveLocationRequest,
    current_user: models.User = Depends(get_current_user),
):
    """
    Lightweight endpoint to validate and preview location resolution before saving.
    """
    # If explicit coordinates provided (GPS)
    if is_valid_coordinate(req.latitude, req.longitude):
        name = "Current GPS Location" if (not req.query or "gps" in req.query.lower()) else req.query.strip()
        return schemas.ResolveLocationResponse(
            resolved=True,
            locationName=name,
            latitude=round(float(req.latitude), 4),
            longitude=round(float(req.longitude), 4),
            message="GPS coordinates verified successfully",
        )

    if req.query and req.query.strip():
        clean_q = req.query.strip()
        import re
        gps_match = re.search(r"(-?\d+(?:\.\d+)?)\s*°?\s*,\s*(-?\d+(?:\.\d+)?)\s*°?", clean_q)
        if ("gps" in clean_q.lower() or "location" in clean_q.lower()) and gps_match:
            try:
                lat_c = float(gps_match.group(1))
                lon_c = float(gps_match.group(2))
                if is_valid_coordinate(lat_c, lon_c):
                    return schemas.ResolveLocationResponse(
                        resolved=True,
                        locationName="Current GPS Location",
                        latitude=round(lat_c, 4),
                        longitude=round(lon_c, 4),
                        message="GPS coordinates verified successfully",
                    )
            except Exception:
                pass

        resolved = resolve_location_name(clean_q)
        if resolved:
            lat, lon, name = resolved
            return schemas.ResolveLocationResponse(
                resolved=True,
                locationName=name,
                latitude=lat,
                longitude=lon,
                message=f"Resolved coordinates for {name}",
            )
        return schemas.ResolveLocationResponse(
            resolved=False,
            locationName=req.query.strip(),
            latitude=None,
            longitude=None,
            message="Location could not be resolved. Please try another city or district name.",
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Either query text or valid coordinates must be provided.",
    )


@router.get("/nearby", response_model=List[schemas.NearbyIncidentItem])
def get_nearby_incidents(
    radius: Optional[float] = Query(None, description="Search radius in kilometers"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Retrieves all verified incidents within the user's alert radius.
    Excludes incidents without valid coordinates from distance calculations.
    Returns empty list if user has not configured alert coordinates.
    """
    if not is_valid_coordinate(current_user.alertLatitude, current_user.alertLongitude):
        return []

    search_radius = radius if radius is not None else (current_user.alertRadiusKm or 50.0)
    incidents = find_nearby_incidents(
        db,
        user_lat=current_user.alertLatitude,
        user_lon=current_user.alertLongitude,
        radius_km=search_radius,
    )
    return incidents


@router.get("", response_model=schemas.NotificationSummaryResponse)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns stored in-app notifications for the authenticated user,
    including unread count and location configuration status.
    """
    is_cfg = is_valid_coordinate(current_user.alertLatitude, current_user.alertLongitude)

    # Sync lightweight on fetch if user has location configured
    if is_cfg:
        try:
            sync_user_notifications(db, current_user)
        except Exception:
            pass

    records = (
        db.query(models.Notification)
        .filter(models.Notification.userId == current_user.id)
        .order_by(models.Notification.createdAt.desc())
        .limit(30)
        .all()
    )

    items = []
    unread_count = 0
    for n in records:
        is_read_bool = bool(n.isRead)
        if not is_read_bool:
            unread_count += 1
        items.append(
            schemas.NotificationItem(
                id=n.id,
                disasterId=n.disasterId,
                title=n.title,
                message=n.message,
                severity=n.severity,
                disasterType=n.disasterType,
                distanceKm=n.distanceKm,
                isRead=is_read_bool,
                createdAt=n.createdAt,
            )
        )

    return schemas.NotificationSummaryResponse(
        unreadCount=unread_count,
        totalCount=len(items),
        locationConfigured=is_cfg,
        locationName=current_user.alertLocationName,
        radiusKm=float(current_user.alertRadiusKm or 50.0),
        notifications=items,
    )


@router.post("/sync", response_model=schemas.NotificationSummaryResponse)
def sync_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Trigger on-demand synchronization of nearby incidents into in-app notifications.
    Deduplicates against existing notifications to prevent duplicate items across refreshes.
    """
    if is_valid_coordinate(current_user.alertLatitude, current_user.alertLongitude):
        sync_user_notifications(db, current_user)
    return get_notifications(db, current_user)


@router.put("/{id}/read")
def mark_notification_as_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Marks a single notification as read.
    """
    notif = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == id,
            models.Notification.userId == current_user.id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notif.isRead = 1
    db.commit()
    return {"success": True, "id": id, "isRead": True}


@router.post("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Marks all notifications for the authenticated user as read.
    """
    db.query(models.Notification).filter(
        models.Notification.userId == current_user.id
    ).update({"isRead": 1})
    db.commit()
    return {"success": True, "message": "All notifications marked as read"}
