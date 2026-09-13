import uuid
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.notification import NotificationType


class CaregiverPatientSummaryResponse(BaseModel):
    """Safe basic patient summary returned in caregiver patient list."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(..., description="Patient profile ID")
    user_id: uuid.UUID = Field(..., description="Patient user account ID")
    first_name: str
    last_name: str
    email: str
    phone_number: Optional[str] = None
    relationship_type: Optional[str] = None
    permission_level: Optional[str] = None
    is_active: bool = True
    assigned_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class CaregiverPatientDetailResponse(BaseModel):
    """Detailed caregiver-safe patient profile view."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(..., description="Patient profile ID")
    user_id: uuid.UUID = Field(..., description="Patient user account ID")
    first_name: str
    last_name: str
    email: str
    phone_number: Optional[str] = None
    relationship_type: Optional[str] = None
    permission_level: Optional[str] = None
    is_active: bool = True
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    medical_conditions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CaregiverDashboardSummaryResponse(BaseModel):
    """Aggregated statistics across all active patients linked to the caregiver."""
    total_patients: int = Field(..., description="Total count of active linked patients")
    patients_with_due_medications: int = Field(
        ..., description="Count of linked patients having one or more due doses"
    )
    due_doses: int = Field(..., description="Total count of due doses across all linked patients")
    upcoming_doses: int = Field(
        ..., description="Total count of upcoming doses within 24h across all linked patients"
    )
    taken_doses_today: int = Field(
        ..., description="Total count of doses recorded as TAKEN today across all linked patients"
    )
    skipped_doses_today: int = Field(
        ..., description="Total count of doses recorded as SKIPPED today across all linked patients"
    )


class CaregiverNotificationResponse(BaseModel):
    """In-app alert item for a caregiver regarding their linked patient."""
    id: uuid.UUID
    patient_id: uuid.UUID
    patient_name: Optional[str] = None
    type: NotificationType
    title: str
    message: str
    related_dose_event_id: Optional[uuid.UUID] = None
    related_medicine_id: Optional[uuid.UUID] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CaregiverNotificationListResponse(BaseModel):
    """Paginated list of caregiver in-app alert items."""
    total_count: int
    unread_count: int
    items: List[CaregiverNotificationResponse]


class CaregiverNotificationUnreadCountResponse(BaseModel):
    """Unread count across caregiver's linked patients."""
    unread_count: int


class CaregiverPatientAttentionOverview(BaseModel):
    """Brief intelligence overview of a linked patient for caregiver dashboard."""
    patient_id: uuid.UUID
    patient_name: str
    adherence_30d: float = 0.0
    trend_direction: str = "INSUFFICIENT_DATA"
    attention_level: str = "LOW"
    attention_score: int = 0
    insight_count: int = 0

