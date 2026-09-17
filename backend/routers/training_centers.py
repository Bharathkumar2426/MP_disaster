from fastapi import APIRouter, Depends, HTTPException, status
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
    current_user: models.User = Depends(require_roles(["ADMIN"])),
):
    center = models.TrainingCenter(**center_in.dict())
    db.add(center)
    db.commit()
    db.refresh(center)
    return center


@router.put("/{id}", response_model=schemas.TrainingCenterResponse)
def update_training_center(
    id: int,
    center_in: schemas.TrainingCenterUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN"])),
):
    center = db.query(models.TrainingCenter).filter(models.TrainingCenter.id == id).first()
    if not center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Training Center not found"
        )

    for key, value in center_in.dict(exclude_unset=True).items():
        if value is not None:
            setattr(center, key, value)

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
    return None
