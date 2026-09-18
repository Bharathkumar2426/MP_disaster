from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


# ==============================
# User & Auth Schemas
# ==============================

class UserBase(BaseModel):
    fullName: str
    email: str
    phoneNumber: Optional[str] = None
    role: Optional[str] = "PARTICIPANT"


class UserRegisterRequest(BaseModel):
    fullName: str
    email: str
    password: str
    phoneNumber: Optional[str] = None
    role: Optional[str] = "PARTICIPANT"


class UserLoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(UserBase):
    id: int
    createdAt: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    id: int
    fullName: str
    email: str
    role: str
    token: str
    tokenType: str = "Bearer"
    message: str = "Login successful"


# ==============================
# Disaster Schemas
# ==============================

class DisasterBase(BaseModel):
    disasterName: str
    disasterType: str
    district: str
    location: Optional[str] = None
    severity: Optional[str] = "MEDIUM"
    status: Optional[str] = "ACTIVE"
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DisasterCreate(DisasterBase):
    pass


class DisasterUpdate(BaseModel):
    disasterName: Optional[str] = None
    disasterType: Optional[str] = None
    district: Optional[str] = None
    location: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DisasterResponse(DisasterBase):
    id: int
    reportedDate: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==============================
# Training Center Schemas
# ==============================

class TrainingCenterBase(BaseModel):
    centerName: str
    district: str
    address: Optional[str] = None
    capacity: Optional[int] = 50
    contactNumber: Optional[str] = None
    coordinatorName: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class TrainingCenterCreate(TrainingCenterBase):
    pass


class TrainingCenterUpdate(BaseModel):
    centerName: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    capacity: Optional[int] = None
    contactNumber: Optional[str] = None
    coordinatorName: Optional[str] = None
    status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class TrainingCenterResponse(TrainingCenterBase):
    id: int

    class Config:
        from_attributes = True


# ==============================
# Training Program Schemas
# ==============================

class TrainingProgramBase(BaseModel):
    programName: str
    trainerName: str
    durationDays: Optional[int] = 3
    startDate: Optional[date] = None
    endDate: Optional[date] = None
    maxParticipants: Optional[int] = 30
    status: Optional[str] = "ACTIVE"
    description: Optional[str] = None
    trainingCenterId: Optional[int] = None


class TrainingProgramCreate(TrainingProgramBase):
    pass


class TrainingProgramUpdate(BaseModel):
    programName: Optional[str] = None
    trainerName: Optional[str] = None
    durationDays: Optional[int] = None
    startDate: Optional[date] = None
    endDate: Optional[date] = None
    maxParticipants: Optional[int] = None
    status: Optional[str] = None
    description: Optional[str] = None
    trainingCenterId: Optional[int] = None


class TrainingProgramResponse(TrainingProgramBase):
    id: int
    trainingCenterName: Optional[str] = None

    class Config:
        from_attributes = True


# ==============================
# Dashboard Schemas
# ==============================

class DashboardStatsResponse(BaseModel):
    totalUsers: int
    totalDisasters: int
    totalTrainingCenters: int
    totalTrainingPrograms: int


# ==============================
# Safety & Preparedness Schemas
# ==============================

class SafetyTypeItem(BaseModel):
    id: str
    name: str
    category: str
    severityRisk: str
    description: str
    icon: Optional[str] = "AlertTriangle"
    badgeColor: Optional[str] = "#38bdf8"


class SafetyStep(BaseModel):
    title: str
    description: str


class ChecklistItem(BaseModel):
    id: str
    text: str


class BeforeSection(BaseModel):
    title: str
    summary: str
    steps: List[SafetyStep]
    emergencyKit: List[str]
    checklist: List[ChecklistItem]


class DuringSection(BaseModel):
    title: str
    summary: str
    steps: List[SafetyStep]
    doNot: List[str]


class AfterSection(BaseModel):
    title: str
    summary: str
    steps: List[SafetyStep]
    precautions: List[str]


class PrecautionsSection(BaseModel):
    dos: List[str]
    donts: List[str]


class EmergencyKitSection(BaseModel):
    survivalBasics: List[str]
    medicalHygiene: List[str]
    powerComm: List[str]
    documentsCash: List[str]


class HelplineItem(BaseModel):
    name: str
    number: str
    description: str


class SafetyGuidanceResponse(BaseModel):
    disasterType: str
    category: str
    severityRisk: str
    description: str
    icon: Optional[str] = "AlertTriangle"
    badgeColor: Optional[str] = "#38bdf8"
    overview: dict
    before: BeforeSection
    during: DuringSection
    after: AfterSection
    precautions: PrecautionsSection
    emergencyKit: EmergencyKitSection
    helplines: Optional[List[HelplineItem]] = None
