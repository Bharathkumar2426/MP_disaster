from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime, date


# ==============================
# Helpers for Empty-String Coercion
# ==============================

def _coerce_float(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def _coerce_int(v, default=None):
    if v is None or v == "":
        return default
    try:
        return int(v)
    except (ValueError, TypeError):
        return default


def _coerce_date(v):
    if v is None or v == "":
        return None
    if isinstance(v, (date, datetime)):
        return v
    if isinstance(v, str):
        try:
            return date.fromisoformat(v[:10])
        except (ValueError, TypeError):
            return None
    return None


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


class UserUpdate(BaseModel):
    fullName: str
    email: str
    password: Optional[str] = None
    phoneNumber: Optional[str] = None
    role: Optional[str] = None


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

    @field_validator("latitude", "longitude", mode="before")
    @classmethod
    def validate_coords(cls, v):
        return _coerce_float(v)


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

    @field_validator("latitude", "longitude", mode="before")
    @classmethod
    def validate_update_coords(cls, v):
        return _coerce_float(v)


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

    @field_validator("latitude", "longitude", mode="before")
    @classmethod
    def validate_center_coords(cls, v):
        return _coerce_float(v)

    @field_validator("capacity", mode="before")
    @classmethod
    def validate_capacity(cls, v):
        return _coerce_int(v, default=50)


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

    @field_validator("latitude", "longitude", mode="before")
    @classmethod
    def validate_center_update_coords(cls, v):
        return _coerce_float(v)

    @field_validator("capacity", mode="before")
    @classmethod
    def validate_center_update_capacity(cls, v):
        return _coerce_int(v, default=None)


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

    @field_validator("durationDays", mode="before")
    @classmethod
    def validate_duration(cls, v):
        return _coerce_int(v, default=3)

    @field_validator("maxParticipants", mode="before")
    @classmethod
    def validate_max_parts(cls, v):
        return _coerce_int(v, default=30)

    @field_validator("trainingCenterId", mode="before")
    @classmethod
    def validate_center_id(cls, v):
        return _coerce_int(v, default=None)

    @field_validator("startDate", "endDate", mode="before")
    @classmethod
    def validate_dates(cls, v):
        return _coerce_date(v)


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

    @field_validator("durationDays", "maxParticipants", "trainingCenterId", mode="before")
    @classmethod
    def validate_update_ints(cls, v):
        return _coerce_int(v, default=None)

    @field_validator("startDate", "endDate", mode="before")
    @classmethod
    def validate_update_dates(cls, v):
        return _coerce_date(v)


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
