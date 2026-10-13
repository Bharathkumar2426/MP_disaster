# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Float, Text, Date, DateTime, ForeignKey, Index, text
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from datetime import datetime, date, timezone
import enum
from database import Base


def utc_now():
    return datetime.now(timezone.utc)


class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    TRAINER = "TRAINER"
    PARTICIPANT = "PARTICIPANT"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    fullName = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    phoneNumber = Column(String(20), nullable=True)
    role = Column(String(20), default=RoleEnum.PARTICIPANT.value, nullable=False)
    alertLocationName = Column(String(150), nullable=True)
    alertLatitude = Column(Float, nullable=True)
    alertLongitude = Column(Float, nullable=True)
    alertRadiusKm = Column(Float, default=50.0, nullable=True)
    createdAt = Column(DateTime, default=utc_now)


class Disaster(Base):
    __tablename__ = "disasters"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    disasterName = Column(String(150), nullable=False)
    disasterType = Column(String(80), nullable=False)
    district = Column(String(100), nullable=False)
    location = Column(String(150), nullable=True)
    severity = Column(String(20), default="MEDIUM", nullable=False)  # HIGH, MEDIUM, LOW
    status = Column(String(30), default="ACTIVE", nullable=False)    # ACTIVE, UNDER_CONTROL, RESOLVED
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    reportedDate = Column(DateTime, default=utc_now)
    source = Column(String(50), default="MANUAL", nullable=False)
    external_id = Column(String(100), nullable=True, index=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        Index(
            "uq_disasters_source_external_id",
            "source",
            "external_id",
            unique=True,
            sqlite_where=text("external_id IS NOT NULL"),
            postgresql_where=text("external_id IS NOT NULL"),
        ),
    )

    @property
    def updatedAt(self):
        return self.updated_at



class TrainingCenter(Base):
    __tablename__ = "training_centers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    centerName = Column(String(150), nullable=False)
    district = Column(String(100), nullable=False)
    address = Column(String(255), nullable=True)
    capacity = Column(Integer, default=50)
    contactNumber = Column(String(30), nullable=True)
    coordinatorName = Column(String(100), nullable=True)
    status = Column(String(20), default="ACTIVE", nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    programs = relationship("TrainingProgram", back_populates="trainingCenter", cascade="all, delete-orphan")


class TrainingProgram(Base):
    __tablename__ = "training_programs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    programName = Column(String(150), nullable=False)
    trainerName = Column(String(100), nullable=False)
    durationDays = Column(Integer, default=3)
    startDate = Column(Date, default=date.today)
    endDate = Column(Date, default=date.today)
    maxParticipants = Column(Integer, default=30)
    status = Column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, UPCOMING, COMPLETED
    description = Column(Text, nullable=True)

    trainingCenterId = Column(Integer, ForeignKey("training_centers.id"), nullable=True)
    trainingCenter = relationship("TrainingCenter", back_populates="programs")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    userId = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    disasterId = Column(Integer, ForeignKey("disasters.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), default="INFO", nullable=False)
    disasterType = Column(String(80), nullable=True)
    distanceKm = Column(Float, nullable=True)
    isRead = Column(Integer, default=0, nullable=False)  # 0: unread, 1: read
    createdAt = Column(DateTime, default=utc_now, index=True)

    __table_args__ = (
        Index("uq_user_disaster_notification", "userId", "disasterId", unique=True),
    )


class CommunityReport(Base):
    __tablename__ = "community_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    userId = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    disasterType = Column(String(80), nullable=False)
    locationName = Column(String(150), nullable=False)
    district = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    severity = Column(String(20), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    description = Column(Text, nullable=False)
    imageUrl = Column(Text, nullable=True)
    status = Column(String(20), default="PENDING", nullable=False, index=True)  # PENDING, VERIFIED, REJECTED
    verifiedBy = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verificationNotes = Column(Text, nullable=True)
    verifiedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=utc_now, index=True)
    updatedAt = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", foreign_keys=[userId])
    verifier = relationship("User", foreign_keys=[verifiedBy])

