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
    alertLocationName: Optional[str] = None
    alertLatitude: Optional[float] = None
    alertLongitude: Optional[float] = None
    alertRadiusKm: Optional[float] = 50.0
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
    source: Optional[str] = "MANUAL"
    external_id: Optional[str] = None
    updated_at: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

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
    source: Optional[str] = None
    external_id: Optional[str] = None
    updated_at: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    @field_validator("latitude", "longitude", mode="before")
    @classmethod
    def validate_update_coords(cls, v):
        return _coerce_float(v)


class DisasterResponse(DisasterBase):
    id: int
    reportedDate: Optional[datetime] = None

    class Config:
        from_attributes = True


class IncidentWeatherResponse(BaseModel):
    disasterId: int
    disasterName: str
    latitude: float
    longitude: float
    provider: str = "Open-Meteo"
    observationTime: Optional[str] = None
    retrievedAt: str
    temperature: Optional[float] = None
    temperatureUnit: str = "°C"
    humidity: Optional[float] = None
    humidityUnit: str = "%"
    precipitation: Optional[float] = None
    precipitationUnit: str = "mm"
    windSpeed: Optional[float] = None
    windSpeedUnit: str = "km/h"
    windGusts: Optional[float] = None
    windGustsUnit: str = "km/h"


# ==============================
# Risk Assessment Schemas (Phase 5)
# ==============================

class WeatherObservations(BaseModel):
    temperature: Optional[float] = None
    temperatureUnit: str = "°C"
    humidity: Optional[float] = None
    humidityUnit: str = "%"
    precipitation: Optional[float] = None
    precipitationUnit: str = "mm"
    windSpeed: Optional[float] = None
    windSpeedUnit: str = "km/h"
    windGusts: Optional[float] = None
    windGustsUnit: str = "km/h"
    observationTime: Optional[str] = None


class RiskAssessmentResponse(BaseModel):
    disasterId: Optional[int] = None
    disasterName: Optional[str] = None
    disasterType: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    riskCategory: str
    riskScore: Optional[int] = None
    probability: Optional[float] = None
    assessmentMethod: str = "PROVISIONAL_RULE_BASED_v1.0"
    isModelTrained: bool = False
    modelAccuracy: Optional[float] = None
    assessmentTimestamp: str
    dataFreshness: Optional[str] = None
    summary: str
    contributingFactors: List[str] = []
    weatherObservations: Optional[WeatherObservations] = None
    warnings: List[str] = []
    limitations: List[str] = []
    disclaimer: str


class RiskAssessmentRequest(BaseModel):
    disasterType: str = "Wildfire"
    latitude: float
    longitude: float
    district: Optional[str] = None



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


# ==============================
# Phase 4: Location & Notification Schemas
# ==============================

class LocationPreferenceUpdate(BaseModel):
    locationName: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radiusKm: Optional[float] = 50.0

    @field_validator("latitude", "longitude", "radiusKm", mode="before")
    @classmethod
    def validate_pref_coords(cls, v):
        return _coerce_float(v)


class LocationPreferenceResponse(BaseModel):
    locationName: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radiusKm: float = 50.0
    configured: bool = False


class ResolveLocationRequest(BaseModel):
    query: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @field_validator("latitude", "longitude", mode="before")
    @classmethod
    def validate_resolve_coords(cls, v):
        return _coerce_float(v)


class ResolveLocationResponse(BaseModel):
    resolved: bool
    locationName: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    message: Optional[str] = None


class NearbyIncidentItem(BaseModel):
    id: int
    disasterName: str
    disasterType: str
    district: str
    location: Optional[str] = None
    severity: str
    status: str
    source: str
    external_id: Optional[str] = None
    latitude: float
    longitude: float
    distanceKm: float
    reportedDate: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    description: Optional[str] = None


class NotificationItem(BaseModel):
    id: int
    disasterId: Optional[int] = None
    title: str
    message: str
    severity: str
    disasterType: Optional[str] = None
    distanceKm: Optional[float] = None
    isRead: bool
    createdAt: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationSummaryResponse(BaseModel):
    unreadCount: int
    totalCount: int
    locationConfigured: bool
    locationName: Optional[str] = None
    radiusKm: float = 50.0
    notifications: List[NotificationItem]


# ==============================
# Phase 6: Intelligent Recommendations Schemas
# ==============================

class RecommendedTrainingProgram(BaseModel):
    id: int
    programName: str
    description: Optional[str] = None
    trainerName: str
    durationDays: int
    status: str
    trainingCenterId: Optional[int] = None
    trainingCenterName: Optional[str] = None
    trainingCenterDistrict: Optional[str] = None
    distanceKm: Optional[float] = None
    matchScore: float
    recommendationReason: str
    targetSkills: List[str] = []


class RecommendedTrainingCenter(BaseModel):
    id: int
    centerName: str
    district: str
    address: Optional[str] = None
    capacity: Optional[int] = None
    contactNumber: Optional[str] = None
    coordinatorName: Optional[str] = None
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distanceKm: Optional[float] = None
    activeProgramsCount: int = 0
    recommendationReason: str


class RiskContextSummary(BaseModel):
    riskCategory: str
    riskScore: Optional[int] = None
    assessmentMethod: str = "PROVISIONAL_RULE_BASED_v1.0"
    assessmentTimestamp: Optional[str] = None
    contributingFactors: List[str] = []
    disclaimer: str


class PreparednessRecommendationResponse(BaseModel):
    disasterType: str
    userLocation: Optional[str] = None
    userCoordinates: Optional[dict] = None
    generatedAt: str
    preparednessOverview: dict
    beforeSteps: List[dict] = []
    duringSteps: List[dict] = []
    afterSteps: List[dict] = []
    emergencyKit: List[str] = []
    dos: List[str] = []
    donts: List[str] = []
    recommendedPrograms: List[RecommendedTrainingProgram] = []
    recommendedCenters: List[RecommendedTrainingCenter] = []
    riskContext: Optional[RiskContextSummary] = None
    limitations: List[str] = []


# ==============================
# Phase 7: Community Disaster Reporting & Safe-Route Guidance Schemas
# ==============================

class CommunityReportCreate(BaseModel):
    disasterType: str
    locationName: str
    district: Optional[str] = None
    latitude: float
    longitude: float
    severity: Optional[str] = "MEDIUM"
    description: str
    imageUrl: Optional[str] = None


class CommunityReportStatusUpdate(BaseModel):
    status: str  # VERIFIED, REJECTED, PENDING
    verificationNotes: Optional[str] = None


class CommunityReportResponse(BaseModel):
    id: int
    userId: int
    userName: Optional[str] = None
    disasterType: str
    locationName: str
    district: Optional[str] = None
    latitude: float
    longitude: float
    severity: str
    description: str
    imageUrl: Optional[str] = None
    status: str
    verifiedBy: Optional[int] = None
    verifierName: Optional[str] = None
    verificationNotes: Optional[str] = None
    verifiedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: Optional[datetime] = None


class CommunityReportListResponse(BaseModel):
    totalCount: int
    pendingCount: int
    verifiedCount: int
    rejectedCount: int
    reports: List[CommunityReportResponse]


class SafeRouteRequest(BaseModel):
    originLat: Optional[float] = None
    originLon: Optional[float] = None
    originName: Optional[str] = "Origin"
    originQuery: Optional[str] = None
    destinationLat: Optional[float] = None
    destinationLon: Optional[float] = None
    destinationName: Optional[str] = "Destination"
    destinationQuery: Optional[str] = None
    corridorBufferKm: Optional[float] = 20.0


class HazardNearRoute(BaseModel):
    id: int
    name: str
    hazardType: str
    severity: str
    latitude: float
    longitude: float
    distanceToRouteKm: float
    source: str  # "GDACS", "MANUAL", "COMMUNITY_VERIFIED"
    proximityCategory: str  # "CRITICAL_PROXIMITY" (<5km), "MODERATE_PROXIMITY" (5-15km), "ADVISORY" (15-25km)
    status: str


class SafeRouteResponse(BaseModel):
    origin: dict
    destination: dict
    totalDistanceKm: float
    estimatedDurationMinutes: Optional[float] = None
    routeGeometry: List[List[float]]  # List of [lat, lon] coordinates for Leaflet Polyline
    isRoutingEngineAvailable: bool
    isRoadRoute: bool = True
    routingEngine: str  # "OSRM_ROAD_NETWORK" | "DIRECT_GEODESIC"
    safetyStatus: str  # "CLEAR" | "CAUTION" | "HIGH_RISK"
    hazardsNearRoute: List[HazardNearRoute] = []
    safetyAdvisory: str
    disclaimer: str


# ============================================================
# Phase 8: RakshaBot — AI Disaster Assistance Chatbot
# ============================================================

class RakshaBotMessage(BaseModel):
    role: str  # "user" | "model" | "assistant"
    content: str


class RakshaBotRequest(BaseModel):
    message: str
    history: Optional[List[RakshaBotMessage]] = []
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class RakshaBotResponse(BaseModel):
    response: str
    suggestedQuestions: List[str] = []
    disclaimer: str
    model: str
    dataSource: Optional[str] = None
    dataTimestamp: Optional[str] = None
    liveDataIncluded: bool = False


