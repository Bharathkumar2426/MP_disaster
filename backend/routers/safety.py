from fastapi import APIRouter, HTTPException, status
from typing import List
import schemas
from data.safety_data import get_all_safety_types, get_safety_by_type

router = APIRouter(prefix="/api/safety", tags=["Disaster Safety & Preparedness"])


@router.get("/types", response_model=List[schemas.SafetyTypeItem], summary="List all supported disaster safety categories")
def list_safety_types():
    """
    Returns verified disaster categories with associated risk levels, icons, and summaries.
    """
    return get_all_safety_types()


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
