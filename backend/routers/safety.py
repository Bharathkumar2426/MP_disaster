from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from security import get_current_user
from data.safety_data import get_all_safety_types, get_safety_by_type

router = APIRouter(prefix="/api/safety", tags=["Disaster Safety & Preparedness"])


@router.get("/types", response_model=List[schemas.SafetyTypeItem], summary="List all supported disaster safety categories")
def list_safety_types():
    """
    Returns verified disaster categories with associated risk levels, icons, and summaries.
    """
    return get_all_safety_types()


@router.get("/recommendations", response_model=schemas.PreparednessRecommendationResponse, summary="Intelligent preparedness and training recommendations (Phase 6)")
def get_recommendations(
    disaster_type: str = Query("flood", description="Disaster hazard category (e.g. flood, fire, cyclone, earthquake, heatwave, landslide)"),
    latitude: Optional[float] = Query(None, description="Optional user latitude override"),
    longitude: Optional[float] = Query(None, description="Optional user longitude override"),
    location_name: Optional[str] = Query(None, description="Optional location label"),
    include_risk_context: bool = Query(True, description="Include supporting Phase 5 provisional risk context if coordinates are available"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Intelligent Preparedness & Training Recommendations:
    1. Returns structured, hazard-specific preparedness instructions (Before, During, After, Kits, Precautions).
    2. Ranks existing active training programs by hazard relevance and geographic proximity.
    3. Matches nearest operational training centers using Haversine distance.
    4. Integrates supporting Phase 5 provisional risk assessment context when coordinates are provided.
    Non-destructive: Does not mutate incident records or dispatch unverified alerts.
    """
    from recommendation_service import get_intelligent_recommendations
    return get_intelligent_recommendations(
        db=db,
        disaster_type=disaster_type,
        user=current_user,
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
        include_risk_context=include_risk_context,
    )


@router.get("/{disaster_type}", response_model=schemas.SafetyGuidanceResponse, summary="Retrieve structured disaster safety guidance")
def get_disaster_safety_guidance(disaster_type: str):
    """
    Returns comprehensive life-safety protocols across Before, During, and After phases,
    along with DOs & DON'Ts precautions, emergency kits, and readiness checklists.
    """
    data = get_safety_by_type(disaster_type)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No preparedness guidance is currently available for '{disaster_type}'."
        )
    return data
