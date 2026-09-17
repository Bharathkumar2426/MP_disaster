from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas
from security import get_current_user, require_roles

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
        query = query.filter(models.Disaster.severity == severity.upper())
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(models.Disaster.status == status_filter.upper())
    if district and district.upper() != "ALL":
        query = query.filter(models.Disaster.district.ilike(f"%{district}%"))

    return query.order_by(models.Disaster.id.desc()).all()


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


@router.post("", response_model=schemas.DisasterResponse, status_code=status.HTTP_201_CREATED)
def create_disaster(
    disaster_in: schemas.DisasterCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "TRAINER"])),
):
    disaster = models.Disaster(**disaster_in.dict())
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

    for key, value in disaster_in.dict(exclude_unset=True).items():
        if value is not None:
            setattr(disaster, key, value)

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
    return None
