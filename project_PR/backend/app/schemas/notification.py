import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class NotificationType(str, Enum):
    MEDICATION_DUE = "MEDICATION_DUE"
    MEDICATION_UPCOMING = "MEDICATION_UPCOMING"
    MISSED_DOSE = "MISSED_DOSE"
    SYSTEM = "SYSTEM"


class NotificationResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    type: NotificationType
    title: str
    message: str
    related_dose_event_id: Optional[uuid.UUID] = None
    related_medicine_id: Optional[uuid.UUID] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    total_count: int
    unread_count: int
    items: List[NotificationResponse]


class NotificationUnreadCountResponse(BaseModel):
    unread_count: int


class NotificationPreferenceResponse(BaseModel):
    medication_due_enabled: bool = True
    missed_dose_enabled: bool = True
    medication_upcoming_enabled: bool = True
    system_enabled: bool = True

    model_config = ConfigDict(from_attributes=True)


class NotificationPreferenceUpdate(BaseModel):
    medication_due_enabled: Optional[bool] = None
    missed_dose_enabled: Optional[bool] = None
    medication_upcoming_enabled: Optional[bool] = None
    system_enabled: Optional[bool] = None

