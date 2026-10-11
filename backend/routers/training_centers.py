from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas
from security import get_current_user, require_roles

router = APIRouter(prefix="/api/training-centers", tags=["Training Centers"])


@router.get("", response_model=List[schemas.TrainingCenterResponse])
def get_all_training_centers(
    search: Optional[str] = None,
    district: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.TrainingCenter)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (models.TrainingCenter.centerName.ilike(s))
            | (models.TrainingCenter.district.ilike(s))
            | (models.TrainingCenter.coordinatorName.ilike(s))
        )
    if district and district.upper() != "ALL":
        query = query.filter(models.TrainingCenter.district.ilike(f"%{district}%"))
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(models.TrainingCenter.status.ilike(status_filter))

    return query.order_by(models.TrainingCenter.id.desc()).all()


@router.get("/{id}", response_model=schemas.TrainingCenterResponse)
def get_training_center_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    center = db.query(models.TrainingCenter).filter(models.TrainingCenter.id == id).first()
    if not center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Training Center not found"
        )
    return center


@router.post("", response_model=schemas.TrainingCenterResponse, status_code=status.HTTP_201_CREATED)
def create_training_center(
    center_in: schemas.TrainingCenterCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "TRAINER"])),
):
    data = (
        center_in.model_dump()
        if hasattr(center_in, "model_dump")
        else center_in.dict()
    )
    if not data.get("latitude") or not data.get("longitude"):
        from geo_resolver import resolve_coordinates
        coords = resolve_coordinates(
            district=data.get("district"),
            location=data.get("address"),
            name=data.get("centerName")
        )
        if coords:
            data["latitude"] = coords[0]
            data["longitude"] = coords[1]

    center = models.TrainingCenter(**data)
    db.add(center)
    db.commit()
    db.refresh(center)
    return center


@router.put("/{id}", response_model=schemas.TrainingCenterResponse)
def update_training_center(
    id: int,
    center_in: schemas.TrainingCenterUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "TRAINER"])),
):
    center = db.query(models.TrainingCenter).filter(models.TrainingCenter.id == id).first()
    if not center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Training Center not found"
        )

    data = (
        center_in.model_dump(exclude_unset=True)
        if hasattr(center_in, "model_dump")
        else center_in.dict(exclude_unset=True)
    )
    for key, value in data.items():
        if value is not None:
            setattr(center, key, value)

    if not center.latitude or not center.longitude:
        from geo_resolver import resolve_coordinates
        coords = resolve_coordinates(
            district=center.district,
            location=center.address,
            name=center.centerName
        )
        if coords:
            center.latitude = coords[0]
            center.longitude = coords[1]

    db.commit()
    db.refresh(center)
    return center


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_training_center(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN"])),
):
    center = db.query(models.TrainingCenter).filter(models.TrainingCenter.id == id).first()
    if not center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Training Center not found"
        )
    db.delete(center)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

