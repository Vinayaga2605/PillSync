import uuid
from datetime import date, datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Dashboard Summary
# ---------------------------------------------------------------------------

class AdminDashboardSummaryResponse(BaseModel):
    """Aggregate system overview metrics for administrators."""
    total_users: int = Field(..., description="Total count of registered user accounts")
    total_patients: int = Field(..., description="Total count of patient users")
    total_caregivers: int = Field(..., description="Total count of caregiver users")
    total_admins: int = Field(..., description="Total count of administrator accounts")
    total_active_medications: int = Field(..., description="Total count of active medications")
    total_active_schedules: int = Field(..., description="Total count of active dose schedules")
    total_dose_events: int = Field(..., description="Total count of dose events recorded")
    total_notifications: int = Field(..., description="Total count of in-app notifications generated")
    active_caregiver_patient_links: int = Field(
        ..., description="Total count of active caregiver-patient links"
    )


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class AdminUserSummaryResponse(BaseModel):
    """Safe user overview item in directory listing (no passwords/secrets)."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    role: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AdminUserDetailResponse(BaseModel):
    """Detailed safe user view for administrator inspection."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    role: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    patient_profile_id: Optional[uuid.UUID] = None
    caregiver_profile_id: Optional[uuid.UUID] = None


class AdminUserListResponse(BaseModel):
    """Paginated user directory listing."""
    total_count: int
    items: List[AdminUserSummaryResponse]


# ---------------------------------------------------------------------------
# Patients
# ---------------------------------------------------------------------------

class AdminPatientSummaryResponse(BaseModel):
    """Safe patient profile overview in directory listing."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    phone_number: Optional[str] = None
    is_active: bool
    linked_caregivers_count: int = 0
    active_medications_count: int = 0
    created_at: datetime


class AdminPatientDetailResponse(BaseModel):
    """Detailed safe patient profile view for administrators."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    phone_number: Optional[str] = None
    is_active: bool
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    medical_conditions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    linked_caregivers_count: int = 0
    active_medications_count: int = 0
    created_at: datetime
    updated_at: datetime


class AdminPatientListResponse(BaseModel):
    """Paginated patient directory listing."""
    total_count: int
    items: List[AdminPatientSummaryResponse]


# ---------------------------------------------------------------------------
# Caregivers
# ---------------------------------------------------------------------------

class AdminCaregiverSummaryResponse(BaseModel):
    """Safe caregiver profile overview in directory listing."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    phone_number: Optional[str] = None
    organization: Optional[str] = None
    relationship_type: Optional[str] = None
    is_active: bool
    linked_patients_count: int = 0
    created_at: datetime


class AdminCaregiverDetailResponse(BaseModel):
    """Detailed safe caregiver profile view for administrators."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    phone_number: Optional[str] = None
    organization: Optional[str] = None
    relationship_type: Optional[str] = None
    is_active: bool
    linked_patients_count: int = 0
    created_at: datetime
    updated_at: datetime


class AdminCaregiverListResponse(BaseModel):
    """Paginated caregiver directory listing."""
    total_count: int
    items: List[AdminCaregiverSummaryResponse]


# ---------------------------------------------------------------------------
# Relationships
# ---------------------------------------------------------------------------

class AdminRelationshipSummaryResponse(BaseModel):
    """Caregiver-patient assignment link view for administrators."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    caregiver_id: uuid.UUID
    caregiver_user_id: uuid.UUID
    caregiver_name: str
    caregiver_email: str
    patient_id: uuid.UUID
    patient_user_id: uuid.UUID
    patient_name: str
    patient_email: str
    relationship_type: Optional[str] = None
    permission_level: str
    is_active: bool
    assigned_at: datetime
    created_at: datetime


class AdminRelationshipListResponse(BaseModel):
    """Paginated relationship listing."""
    total_count: int
    items: List[AdminRelationshipSummaryResponse]


# ---------------------------------------------------------------------------
# Analytics & System Monitoring
# ---------------------------------------------------------------------------

class AdminAnalyticsOverviewResponse(BaseModel):
    """High-level aggregate counts for quick status overview."""
    total_users: int
    total_patients: int
    total_caregivers: int
    total_admins: int
    total_medications: int
    total_dose_events: int
    total_notifications: int
    total_relationships: int
    active_relationships: int


class AdminUserAnalyticsResponse(BaseModel):
    """User account distribution and registration velocity metrics."""
    total_users: int
    patients: int
    caregivers: int
    admins: int
    active_users: int
    inactive_users: int
    new_users_today: int
    new_users_last_7_days: int
    new_users_last_30_days: int


class AdminMedicationAnalyticsResponse(BaseModel):
    """Medication and dosage schedule activity statistics."""
    total_medications: int
    active_medications: int
    inactive_medications: int
    total_schedules: int
    active_schedules: int
    inactive_schedules: int


class AdminDoseAnalyticsResponse(BaseModel):
    """Aggregate dose events and overall adherence rate."""
    total_doses: int
    taken_doses: int
    skipped_doses: int
    pending_doses: int
    completed_trackable_doses: int
    adherence_percentage: float


class AdminAdherenceTrendItem(BaseModel):
    """Daily intake adherence data point."""
    date: str
    taken: int
    skipped: int
    pending: int
    adherence_percentage: float


class AdminNotificationAnalyticsResponse(BaseModel):
    """System and medication notification breakdown."""
    total_notifications: int
    read_notifications: int
    unread_notifications: int
    by_type: Dict[str, int]


class AdminRelationshipAnalyticsResponse(BaseModel):
    """Caregiver network and patient link distribution."""
    total_relationships: int
    active_relationships: int
    inactive_relationships: int
    caregivers_with_patients: int
    patients_with_caregivers: int


class AdminSystemHealthResponse(BaseModel):
    """API operational and database connectivity health status."""
    api_status: str
    database_status: str


class AdminAnalyticsSummaryResponse(BaseModel):
    """Comprehensive system analytics payload for Admin workspace."""
    overview: AdminAnalyticsOverviewResponse
    users: AdminUserAnalyticsResponse
    medications: AdminMedicationAnalyticsResponse
    doses: AdminDoseAnalyticsResponse
    adherence_trend: List[AdminAdherenceTrendItem]
    notifications: AdminNotificationAnalyticsResponse
    relationships: AdminRelationshipAnalyticsResponse
    system_health: AdminSystemHealthResponse
