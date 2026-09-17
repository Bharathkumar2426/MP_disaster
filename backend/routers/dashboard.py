from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("", response_model=schemas.DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    total_users = db.query(models.User).count()
    total_disasters = db.query(models.Disaster).count()
    total_centers = db.query(models.TrainingCenter).count()
    total_programs = db.query(models.TrainingProgram).count()

    return {
        "totalUsers": total_users,
        "totalDisasters": total_disasters,
        "totalTrainingCenters": total_centers,
        "totalTrainingPrograms": total_programs,
    }


@router.get("/recent-disasters", response_model=List[schemas.DisasterResponse])
def get_recent_disasters(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Disaster)
        .order_by(models.Disaster.id.desc())
        .limit(10)
        .all()
    )


@router.get("/recent-programs", response_model=List[schemas.TrainingProgramResponse])
def get_recent_programs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    programs = (
        db.query(models.TrainingProgram)
        .order_by(models.TrainingProgram.id.desc())
        .limit(10)
        .all()
    )

    results = []
    for p in programs:
        center_name = p.trainingCenter.centerName if p.trainingCenter else "Regional Center"
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
