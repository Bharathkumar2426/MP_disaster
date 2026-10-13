"""
Community Disaster Reporting & Response Coordination Router (Phase 7)

Provides:
- Authenticated citizen incident reporting with GPS or manual location
- Persistent tracking under PENDING, VERIFIED, or REJECTED states
- Role-based response coordination for authorized responders & administrators
- Isolated storage that never mutates official GDACS disaster tables
"""
import logging
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from security import get_current_user
from location_service import is_valid_coordinate

logger = logging.getLogger("community_reports")

router = APIRouter(prefix="/api/community-reports", tags=["Community Disaster Reports (Phase 7)"])


def _serialize_report(report: models.CommunityReport, db: Session) -> schemas.CommunityReportResponse:
    # Resolve author and verifier names cleanly
    author_name = report.user.fullName if report.user else f"User #{report.userId}"
    verifier_name = report.verifier.fullName if report.verifier else None

    return schemas.CommunityReportResponse(
        id=report.id,
        userId=report.userId,
        userName=author_name,
        disasterType=report.disasterType,
        locationName=report.locationName,
        district=report.district,
        latitude=report.latitude,
        longitude=report.longitude,
        severity=report.severity,
        description=report.description,
        imageUrl=report.imageUrl,
        status=report.status,
        verifiedBy=report.verifiedBy,
        verifierName=verifier_name,
        verificationNotes=report.verificationNotes,
        verifiedAt=report.verifiedAt,
        createdAt=report.createdAt,
        updatedAt=report.updatedAt,
    )


@router.post("", response_model=schemas.CommunityReportResponse, status_code=status.HTTP_201_CREATED)
def create_community_report(
    report_in: schemas.CommunityReportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Submits a new community disaster incident report.
    Validates geographical coordinates and sets initial verification status to PENDING.
    Does NOT modify official disaster tables or dispatch unverified alerts.
    """
    if not is_valid_coordinate(report_in.latitude, report_in.longitude):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid numerical coordinates are required (latitude: -90 to 90, longitude: -180 to 180).",
        )

    clean_type = (report_in.disasterType or "").strip()
    clean_desc = (report_in.description or "").strip()
    clean_loc = (report_in.locationName or "").strip()

    if not clean_type or not clean_desc or not clean_loc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disaster hazard type, location name, and description are required fields.",
        )

    # Sanitize severity
    sev = (report_in.severity or "MEDIUM").strip().upper()
    if sev not in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
        sev = "MEDIUM"

    report = models.CommunityReport(
        userId=current_user.id,
        disasterType=clean_type,
        locationName=clean_loc,
        district=(report_in.district or "").strip() or clean_loc,
        latitude=round(float(report_in.latitude), 4),
        longitude=round(float(report_in.longitude), 4),
        severity=sev,
        description=clean_desc,
        imageUrl=(report_in.imageUrl or "").strip() or None,
        status="PENDING",
        createdAt=models.utc_now(),
        updatedAt=models.utc_now(),
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    logger.info("New community disaster report #%d submitted by user #%d (%s)", report.id, current_user.id, current_user.email)
    return _serialize_report(report, db)


@router.get("", response_model=schemas.CommunityReportListResponse)
def list_community_reports(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: PENDING, VERIFIED, REJECTED, or ALL"),
    my_reports_only: bool = Query(False, description="Filter to reports created by the requesting user"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Lists community disaster reports with role-aware scoping:
    - Responders / Admins can review all reports across all verification statuses.
    - Regular participants see verified reports plus their own submitted reports.
    """
    query = db.query(models.CommunityReport)

    is_admin_or_responder = (current_user.role or "").upper() in ["ADMIN", "TRAINER"]

    if my_reports_only or not is_admin_or_responder:
        if my_reports_only:
            query = query.filter(models.CommunityReport.userId == current_user.id)
        else:
            # Regular participants see all VERIFIED reports OR their own pending/rejected reports
            query = query.filter(
                (models.CommunityReport.status == "VERIFIED") |
                (models.CommunityReport.userId == current_user.id)
            )

    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(models.CommunityReport.status == status_filter.upper())

    # Count statistics
    all_reports = query.order_by(models.CommunityReport.createdAt.desc()).all()

    total_count = len(all_reports)
    pending_count = sum(1 for r in all_reports if r.status == "PENDING")
    verified_count = sum(1 for r in all_reports if r.status == "VERIFIED")
    rejected_count = sum(1 for r in all_reports if r.status == "REJECTED")

    return schemas.CommunityReportListResponse(
        totalCount=total_count,
        pendingCount=pending_count,
        verifiedCount=verified_count,
        rejectedCount=rejected_count,
        reports=[_serialize_report(r, db) for r in all_reports],
    )


@router.get("/verified", response_model=List[schemas.CommunityReportResponse])
def get_verified_community_reports(
    db: Session = Depends(get_db),
):
    """
    Lightweight endpoint returning verified community reports for rendering on the disaster map.
    """
    reports = (
        db.query(models.CommunityReport)
        .filter(models.CommunityReport.status == "VERIFIED")
        .order_by(models.CommunityReport.createdAt.desc())
        .limit(100)
        .all()
    )
    return [_serialize_report(r, db) for r in reports]


@router.get("/{report_id}", response_model=schemas.CommunityReportResponse)
def get_community_report_by_id(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Retrieves full details of a specific community disaster report.
    """
    report = db.query(models.CommunityReport).filter(models.CommunityReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Community disaster report #{report_id} not found.",
        )
    return _serialize_report(report, db)


@router.put("/{report_id}/status", response_model=schemas.CommunityReportResponse)
def update_report_verification_status(
    report_id: int,
    status_in: schemas.CommunityReportStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Response Coordination action:
    Updates verification status (VERIFIED or REJECTED) with optional verification notes.
    Role-enforced on backend: only ADMIN and TRAINER (responders) are authorized.
    """
    is_authorized = (current_user.role or "").upper() in ["ADMIN", "TRAINER"]
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only authorized emergency responders or administrators can verify community reports.",
        )

    target_status = (status_in.status or "").strip().upper()
    if target_status not in ["PENDING", "VERIFIED", "REJECTED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Permitted values are 'VERIFIED', 'REJECTED', or 'PENDING'.",
        )

    report = db.query(models.CommunityReport).filter(models.CommunityReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Community disaster report #{report_id} not found.",
        )

    report.status = target_status
    report.verifiedBy = current_user.id
    report.verifiedAt = models.utc_now()
    if status_in.verificationNotes is not None:
        report.verificationNotes = status_in.verificationNotes.strip()
    report.updatedAt = models.utc_now()

    db.commit()
    db.refresh(report)

    logger.info(
        "Community report #%d status updated to %s by responder %s (id: %d)",
        report.id,
        target_status,
        current_user.email,
        current_user.id,
    )
    return _serialize_report(report, db)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_community_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Deletes a community report. Only the original author or an ADMIN may delete.
    """
    report = db.query(models.CommunityReport).filter(models.CommunityReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Community report #{report_id} not found.",
        )

    is_admin = (current_user.role or "").upper() == "ADMIN"
    is_owner = report.userId == current_user.id

    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this report.",
        )

    db.delete(report)
    db.commit()
    return None
