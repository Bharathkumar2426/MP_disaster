from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas
from security import get_current_user, require_roles
from disaster_upsert import upsert_external_disaster

router = APIRouter(prefix="/api/disasters", tags=["Disasters"])


@router.get("", response_model=List[schemas.DisasterResponse])
def get_all_disasters(
    search: Optional[str] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    district: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Disaster)

    if search:
        s = f"%{search}%"
        query = query.filter(
            (models.Disaster.disasterName.ilike(s))
            | (models.Disaster.district.ilike(s))
            | (models.Disaster.disasterType.ilike(s))
            | (models.Disaster.location.ilike(s))
        )
    if severity and severity.upper() != "ALL":
        query = query.filter(models.Disaster.severity.ilike(severity))
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(models.Disaster.status.ilike(status_filter))
    if district and district.upper() != "ALL":
        query = query.filter(models.Disaster.district.ilike(f"%{district}%"))

    return query.order_by(models.Disaster.id.desc()).all()


@router.get("/gdacs/status", summary="Get GDACS collector telemetry")
def get_gdacs_status(
    current_user: models.User = Depends(get_current_user),
):
    from gdacs_collector import get_gdacs_collector
    return get_gdacs_collector().get_status()


@router.post("/gdacs/sync", summary="Trigger manual GDACS synchronization")
async def trigger_gdacs_sync(
    current_user: models.User = Depends(require_roles(["ADMIN", "TRAINER"])),
):
    from gdacs_collector import get_gdacs_collector
    return await get_gdacs_collector().sync_now()


@router.get("/{id}", response_model=schemas.DisasterResponse)
def get_disaster_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    disaster = db.query(models.Disaster).filter(models.Disaster.id == id).first()
    if not disaster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Disaster not found"
        )
    return disaster


@router.get("/{id}/weather", response_model=schemas.IncidentWeatherResponse, summary="Retrieve real-time Open-Meteo weather for disaster coordinates")
def get_disaster_weather(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    disaster = db.query(models.Disaster).filter(models.Disaster.id == id).first()
    if not disaster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Disaster incident not found"
        )

    if disaster.latitude is None or disaster.longitude is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disaster incident has no geographical coordinates; weather telemetry unavailable",
        )

    from weather_service import fetch_weather_for_coordinates

    try:
        weather_data = fetch_weather_for_coordinates(
            latitude=disaster.latitude,
            longitude=disaster.longitude,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Meteorological telemetry currently unavailable from Open-Meteo: {e}",
        )

    return schemas.IncidentWeatherResponse(
        disasterId=disaster.id,
        disasterName=disaster.disasterName,
        latitude=float(disaster.latitude),
        longitude=float(disaster.longitude),
        **weather_data,
    )


@router.get("/{id}/risk-assessment", response_model=schemas.RiskAssessmentResponse, summary="Explainable disaster risk assessment (Phase 5)")
def get_disaster_risk_assessment(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Retrieves an explainable provisional risk assessment for the specified disaster incident.
    Non-destructive: Does not mutate incident severity or status.
    Uses PROVISIONAL_RULE_BASED_v1.0 based on real-time atmospheric telemetry.
    """
    disaster = db.query(models.Disaster).filter(models.Disaster.id == id).first()
    if not disaster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Disaster incident not found"
        )

    from risk_service import evaluate_risk

    result = evaluate_risk(
        disaster_type=disaster.disasterType,
        latitude=disaster.latitude,
        longitude=disaster.longitude,
        disaster_id=disaster.id,
        disaster_name=disaster.disasterName,
    )

    return schemas.RiskAssessmentResponse(**result)


@router.post("", response_model=schemas.DisasterResponse, status_code=status.HTTP_201_CREATED)
def create_disaster(
    disaster_in: schemas.DisasterCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "TRAINER"])),
):
    data = (
        disaster_in.model_dump()
        if hasattr(disaster_in, "model_dump")
        else disaster_in.dict()
    )
    data.pop("updatedAt", None)
    if not data.get("updated_at"):
        data["updated_at"] = models.utc_now()

    # Auto-resolve coordinates if not manually specified
    if not data.get("latitude") or not data.get("longitude"):
        from geo_resolver import resolve_coordinates
        coords = resolve_coordinates(
            district=data.get("district"),
            location=data.get("location"),
            name=data.get("disasterName"),
            description=data.get("description"),
        )
        if coords:
            data["latitude"] = coords[0]
            data["longitude"] = coords[1]

    disaster = models.Disaster(**data)
    db.add(disaster)
    db.commit()
    db.refresh(disaster)
    return disaster


@router.put("/{id}", response_model=schemas.DisasterResponse)
def update_disaster(
    id: int,
    disaster_in: schemas.DisasterUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "TRAINER"])),
):
    disaster = db.query(models.Disaster).filter(models.Disaster.id == id).first()
    if not disaster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Disaster not found"
        )

    data = (
        disaster_in.model_dump(exclude_unset=True)
        if hasattr(disaster_in, "model_dump")
        else disaster_in.dict(exclude_unset=True)
    )
    data.pop("updatedAt", None)
    for key, value in data.items():
        if value is not None:
            setattr(disaster, key, value)

    disaster.updated_at = models.utc_now()

    # Re-resolve if coordinates remain missing
    if not disaster.latitude or not disaster.longitude:
        from geo_resolver import resolve_coordinates
        coords = resolve_coordinates(
            district=disaster.district,
            location=disaster.location,
            name=disaster.disasterName,
            description=disaster.description,
        )
        if coords:
            disaster.latitude = coords[0]
            disaster.longitude = coords[1]

    db.commit()
    db.refresh(disaster)
    return disaster


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_disaster(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN"])),
):
    disaster = db.query(models.Disaster).filter(models.Disaster.id == id).first()
    if not disaster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Disaster not found"
        )
    db.delete(disaster)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

