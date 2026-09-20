from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas
from security import get_current_user, require_roles

router = APIRouter(prefix="/api/training-programs", tags=["Training Programs"])


@router.get("", response_model=List[schemas.TrainingProgramResponse])
def get_all_training_programs(
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    training_center_id: Optional[int] = Query(None, alias="trainingCenterId"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.TrainingProgram)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (models.TrainingProgram.programName.ilike(s))
            | (models.TrainingProgram.trainerName.ilike(s))
            | (models.TrainingProgram.description.ilike(s))
        )
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(models.TrainingProgram.status.ilike(status_filter))
    if training_center_id:
        query = query.filter(models.TrainingProgram.trainingCenterId == training_center_id)

    programs = query.order_by(models.TrainingProgram.id.desc()).all()

    results = []
    for p in programs:
        center_name = (
            p.trainingCenter.centerName
            if p.trainingCenter
            else "Regional Relief Hub"
        )
        results.append(
            schemas.TrainingProgramResponse(
                id=p.id,
                programName=p.programName,
                trainerName=p.trainerName,
                durationDays=p.durationDays,
                startDate=p.startDate,
                endDate=p.endDate,
                maxParticipants=p.maxParticipants,
                status=p.status,
                description=p.description,
                trainingCenterId=p.trainingCenterId,
                trainingCenterName=center_name,
            )
        )
    return results


@router.get("/{id}", response_model=schemas.TrainingProgramResponse)
def get_training_program_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    p = db.query(models.TrainingProgram).filter(models.TrainingProgram.id == id).first()
    if not p:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Training Program not found"
        )
    center_name = p.trainingCenter.centerName if p.trainingCenter else "Regional Relief Hub"
    return schemas.TrainingProgramResponse(
        id=p.id,
        programName=p.programName,
        trainerName=p.trainerName,
        durationDays=p.durationDays,
        startDate=p.startDate,
        endDate=p.endDate,
        maxParticipants=p.maxParticipants,
        status=p.status,
        description=p.description,
        trainingCenterId=p.trainingCenterId,
        trainingCenterName=center_name,
    )


@router.post("", response_model=schemas.TrainingProgramResponse, status_code=status.HTTP_201_CREATED)
def create_training_program(
    prog_in: schemas.TrainingProgramCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "TRAINER"])),
):
    data = (
        prog_in.model_dump()
        if hasattr(prog_in, "model_dump")
        else prog_in.dict()
    )
    program = models.TrainingProgram(**data)
    db.add(program)
    db.commit()
    db.refresh(program)

    # Fetch center name accurately
    center = (
        db.query(models.TrainingCenter)
        .filter(models.TrainingCenter.id == program.trainingCenterId)
        .first()
        if program.trainingCenterId
        else None
    )
    center_name = center.centerName if center else "Regional Relief Hub"

    return schemas.TrainingProgramResponse(
        id=program.id,
        programName=program.programName,
        trainerName=program.trainerName,
        durationDays=program.durationDays,
        startDate=program.startDate,
        endDate=program.endDate,
        maxParticipants=program.maxParticipants,
        status=program.status,
        description=program.description,
        trainingCenterId=program.trainingCenterId,
        trainingCenterName=center_name,
    )


@router.put("/{id}", response_model=schemas.TrainingProgramResponse)
def update_training_program(
    id: int,
    prog_in: schemas.TrainingProgramUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "TRAINER"])),
):
    program = db.query(models.TrainingProgram).filter(models.TrainingProgram.id == id).first()
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Training Program not found"
        )

    data = (
        prog_in.model_dump(exclude_unset=True)
        if hasattr(prog_in, "model_dump")
        else prog_in.dict(exclude_unset=True)
    )
    for key, value in data.items():
        if value is not None:
            setattr(program, key, value)

    db.commit()
    db.refresh(program)

    # Fetch center name accurately
    center = (
        db.query(models.TrainingCenter)
        .filter(models.TrainingCenter.id == program.trainingCenterId)
        .first()
        if program.trainingCenterId
        else None
    )
    center_name = center.centerName if center else "Regional Relief Hub"

    return schemas.TrainingProgramResponse(
        id=program.id,
        programName=program.programName,
        trainerName=program.trainerName,
        durationDays=program.durationDays,
        startDate=program.startDate,
        endDate=program.endDate,
        maxParticipants=program.maxParticipants,
        status=program.status,
        description=program.description,
        trainingCenterId=program.trainingCenterId,
        trainingCenterName=center_name,
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_training_program(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "TRAINER"])),
):
    program = db.query(models.TrainingProgram).filter(models.TrainingProgram.id == id).first()
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Training Program not found"
        )
    db.delete(program)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

