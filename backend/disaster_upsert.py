"""
Reusable Transaction-Safe External Disaster Upsert Utility:
Inserts or updates disaster records from external feeds based on (source, external_id).
Preserves existing manual records and guarantees idempotency.
"""
from typing import Tuple, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import models
from geo_resolver import resolve_coordinates


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def upsert_external_disaster(
    db: Session,
    disaster_data: Dict[str, Any],
    resolve_missing_coordinates: bool = True,
) -> Tuple[models.Disaster, bool]:
    """
    Inserts a new external disaster record or updates an existing record matched by
    (source, external_id).

    Parameters:
        db: Active SQLAlchemy Session.
        disaster_data: Dictionary containing disaster fields.
                       Must include non-empty 'source' and 'external_id'.
        resolve_missing_coordinates: If True, resolves missing coordinates from text.
                                     If False, preserves None without inventing coordinates.

    Returns:
        (disaster_instance, is_created: bool)
        is_created is True if a new record was inserted; False if an existing record was updated.

    Raises:
        ValueError: If 'source' or 'external_id' is missing or blank.
    """
    source = (disaster_data.get("source") or "").strip()
    external_id = (disaster_data.get("external_id") or "").strip()

    if not source:
        raise ValueError("Field 'source' is required for external disaster upsert.")
    if not external_id:
        raise ValueError("Field 'external_id' is required for external disaster upsert.")

    # Check for existing record matching (source, external_id)
    existing: Optional[models.Disaster] = (
        db.query(models.Disaster)
        .filter(
            models.Disaster.source == source,
            models.Disaster.external_id == external_id,
        )
        .first()
    )

    # Clean and prepare input copy
    data = dict(disaster_data)
    data["source"] = source
    data["external_id"] = external_id

    # Auto-resolve coordinates if not specified
    lat = data.get("latitude")
    lon = data.get("longitude")
    if lat is None or lon is None or lat == "" or lon == "":
        if resolve_missing_coordinates:
            coords = resolve_coordinates(
                district=data.get("district"),
                location=data.get("location"),
                name=data.get("disasterName"),
                description=data.get("description"),
            )
            if coords:
                data["latitude"] = coords[0]
                data["longitude"] = coords[1]
            else:
                data["latitude"] = None
                data["longitude"] = None
        else:
            data["latitude"] = None
            data["longitude"] = None
    else:
        try:
            data["latitude"] = float(lat)
            data["longitude"] = float(lon)
        except (ValueError, TypeError):
            data["latitude"] = None
            data["longitude"] = None

    now = utc_now()
    updatable_fields = [
        "disasterName",
        "disasterType",
        "district",
        "location",
        "severity",
        "status",
        "description",
        "latitude",
        "longitude",
    ]

    if existing:
        # Safely update existing record fields
        for field in updatable_fields:
            if field in data and data[field] is not None:
                setattr(existing, field, data[field])

        existing.updated_at = now

        try:
            db.commit()
            db.refresh(existing)
            return existing, False
        except Exception:
            db.rollback()
            raise
    else:
        # Create new record
        new_data = {
            "disasterName": data.get("disasterName", f"{source} Incident {external_id}"),
            "disasterType": data.get("disasterType", "General Incident"),
            "district": data.get("district", "Unknown Sector"),
            "location": data.get("location"),
            "severity": (data.get("severity") or "MEDIUM").upper(),
            "status": (data.get("status") or "ACTIVE").upper(),
            "description": data.get("description"),
            "latitude": data.get("latitude"),
            "longitude": data.get("longitude"),
            "reportedDate": data.get("reportedDate") or now,
            "source": source,
            "external_id": external_id,
            "updated_at": now,
        }

        new_disaster = models.Disaster(**new_data)
        db.add(new_disaster)
        try:
            db.commit()
            db.refresh(new_disaster)
            return new_disaster, True
        except IntegrityError:
            # Handle concurrent race condition where record was created simultaneously
            db.rollback()
            existing = (
                db.query(models.Disaster)
                .filter(
                    models.Disaster.source == source,
                    models.Disaster.external_id == external_id,
                )
                .first()
            )
            if existing:
                for field in updatable_fields:
                    if field in data and data[field] is not None:
                        setattr(existing, field, data[field])
                existing.updated_at = now
                db.commit()
                db.refresh(existing)
                return existing, False
            raise
        except Exception:
            db.rollback()
            raise
