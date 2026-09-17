from sqlalchemy import Column, Integer, String, Float, Text, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum
from database import Base


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
    createdAt = Column(DateTime, default=datetime.utcnow)


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
    reportedDate = Column(DateTime, default=datetime.utcnow)


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
