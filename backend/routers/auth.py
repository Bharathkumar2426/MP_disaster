from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(req: schemas.UserRegisterRequest, db: Session = Depends(get_db)):
    # Check if email exists
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    # Valid roles: ADMIN, TRAINER, PARTICIPANT
    role = (req.role or "PARTICIPANT").upper()
    if role not in ["ADMIN", "TRAINER", "PARTICIPANT"]:
        role = "PARTICIPANT"

    user = models.User(
        fullName=req.fullName,
        email=req.email,
        password=hash_password(req.password),
        phoneNumber=req.phoneNumber,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post("/login", response_model=schemas.LoginResponse)
def login_user(req: schemas.UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email.strip()).first()
    if not user or not verify_password(req.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({"sub": user.email, "role": user.role, "id": user.id})
    return schemas.LoginResponse(
        id=user.id,
        fullName=user.fullName,
        email=user.email,
        role=user.role,
        token=token,
        tokenType="Bearer",
        message="Login successful",
    )


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user
