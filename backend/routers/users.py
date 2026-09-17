from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas
from security import require_roles, hash_password

router = APIRouter(prefix="/api/users", tags=["User Management"])


@router.get("", response_model=List[schemas.UserResponse])
def get_all_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN"])),
):
    query = db.query(models.User)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (models.User.fullName.ilike(s))
            | (models.User.email.ilike(s))
            | (models.User.phoneNumber.ilike(s))
        )
    if role and role.upper() != "ALL":
        query = query.filter(models.User.role == role.upper())

    return query.order_by(models.User.id.desc()).all()


@router.get("/{id}", response_model=schemas.UserResponse)
def get_user_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN"])),
):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.post("", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: schemas.UserRegisterRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN"])),
):
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    user = models.User(
        fullName=user_in.fullName,
        email=user_in.email,
        password=hash_password(user_in.password),
        phoneNumber=user_in.phoneNumber,
        role=(user_in.role or "PARTICIPANT").upper(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{id}", response_model=schemas.UserResponse)
def update_user(
    id: int,
    user_in: schemas.UserBase,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN"])),
):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    user.fullName = user_in.fullName
    user.email = user_in.email
    user.phoneNumber = user_in.phoneNumber
    if user_in.role:
        user.role = user_in.role.upper()

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN"])),
):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own active administrator account",
        )
    db.delete(user)
    db.commit()
    return None
