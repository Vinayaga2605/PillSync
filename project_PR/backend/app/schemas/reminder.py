import uuid
from datetime import time, datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class MedicationDoseEventStatus(str, Enum):
    DUE = "DUE"
    UPCOMING = "UPCOMING"
    PENDING = "PENDING"
    TAKEN = "TAKEN"
    SKIPPED = "SKIPPED"
    MISSED = "MISSED"
    SNOOZED = "SNOOZED"


class ReminderTimeOfDay(str, Enum):
    MORNING = "MORNING"
    AFTERNOON = "AFTERNOON"
    EVENING = "EVENING"
    NIGHT = "NIGHT"
    CUSTOM = "CUSTOM"


def compute_time_of_day(scheduled_time: Union[time, datetime, str], explicit_type: Optional[str] = None) -> str:
    """
    Deterministically computes time of day categorization:
    - MORNING: 05:00 to 11:59
    - AFTERNOON: 12:00 to 16:59
    - EVENING: 17:00 to 20:59
    - NIGHT: 21:00 to 04:59
    """
    if explicit_type and explicit_type.upper() in ReminderTimeOfDay.__members__:
        return explicit_type.upper()
    if isinstance(scheduled_time, str):
        parts = scheduled_time.split(":")
        hour = int(parts[0])
    elif isinstance(scheduled_time, (time, datetime)):
        hour = scheduled_time.hour
    else:
        hour = int(scheduled_time)

    if 5 <= hour < 12:
        return ReminderTimeOfDay.MORNING.value
    elif 12 <= hour < 17:
        return ReminderTimeOfDay.AFTERNOON.value
    elif 17 <= hour < 21:
        return ReminderTimeOfDay.EVENING.value
    else:
        return ReminderTimeOfDay.NIGHT.value


class DueMedicationEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dose_event_id: Optional[uuid.UUID] = None
    medicine_id: uuid.UUID
    medicine_name: str
    generic_name: Optional[str] = None
    schedule_id: uuid.UUID
    frequency_type: str
    dose_quantity: Decimal
    dosage_unit: Optional[str] = None
    scheduled_time: time
    time_of_day_type: Optional[str] = None
    due_at: datetime
    instructions: Optional[str] = None
    status: str = MedicationDoseEventStatus.DUE.value
    snoozed_until: Optional[datetime] = None


class UpcomingMedicationEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dose_event_id: Optional[uuid.UUID] = None
    medicine_id: uuid.UUID
    medicine_name: str
    generic_name: Optional[str] = None
    schedule_id: uuid.UUID
    frequency_type: str
    dose_quantity: Decimal
    dosage_unit: Optional[str] = None
    scheduled_time: time
    time_of_day_type: Optional[str] = None
    due_at: datetime
    instructions: Optional[str] = None
    status: str = MedicationDoseEventStatus.UPCOMING.value
    snoozed_until: Optional[datetime] = None


class TodayMedicationReminder(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dose_event_id: Optional[uuid.UUID] = None
    medicine_id: uuid.UUID
    medicine_name: str
    generic_name: Optional[str] = None
    schedule_id: uuid.UUID
    frequency_type: str
    dose_quantity: Decimal
    dosage_unit: Optional[str] = None
    scheduled_time: time
    time_of_day_type: str
    due_at: datetime
    instructions: Optional[str] = None
    status: str  # UPCOMING, DUE, TAKEN, SKIPPED, MISSED, SNOOZED
    actual_taken_at: Optional[datetime] = None
    snoozed_until: Optional[datetime] = None


class ReminderSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    reference_time: datetime
    timezone: str
    due_count: int
    upcoming_count: int
    taken_count: int = 0
    missed_count: int = 0
    snoozed_count: int = 0
    due_doses: List[DueMedicationEventResponse]
    upcoming_doses: List[UpcomingMedicationEventResponse]
    today_reminders: List[TodayMedicationReminder] = []
