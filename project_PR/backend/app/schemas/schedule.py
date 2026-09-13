import uuid
from datetime import date, time, datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator, field_validator


class ScheduleFrequencyType(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    SPECIFIC_DAYS = "SPECIFIC_DAYS"
    INTERVAL_DAYS = "INTERVAL_DAYS"
    AS_NEEDED = "AS_NEEDED"
    CUSTOM = "CUSTOM"


class TimeOfDayType(str, Enum):
    MORNING = "MORNING"
    AFTERNOON = "AFTERNOON"
    EVENING = "EVENING"
    NIGHT = "NIGHT"
    CUSTOM = "CUSTOM"


class ScheduleTimeCreate(BaseModel):
    scheduled_time: time = Field(
        ...,
        description="Scheduled dose time (e.g., '08:00:00' or '08:00')",
        examples=["08:00:00", "14:00:00", "20:00:00"]
    )
    time_of_day_type: Optional[TimeOfDayType] = Field(
        None,
        description="Optional tag for time of day (MORNING, AFTERNOON, EVENING, NIGHT, CUSTOM)"
    )
    dose_quantity: Optional[Decimal] = Field(
        None,
        gt=0,
        description="Optional specific dose override for this time slot"
    )


class ScheduleTimeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scheduled_time: time
    time_of_day_type: Optional[str] = None
    dose_quantity: Optional[Decimal] = None
    created_at: datetime


class MedicationScheduleCreate(BaseModel):
    frequency_type: ScheduleFrequencyType = Field(
        default=ScheduleFrequencyType.DAILY,
        description="Dosing recurrence frequency type"
    )
    dose_quantity: Decimal = Field(
        default=Decimal("1.0"),
        gt=0,
        description="Default dose amount to take per scheduled event"
    )
    dosage_unit: Optional[str] = Field(
        None,
        max_length=30,
        description="Unit of measurement (e.g. tablet, capsule, ml, mg)"
    )
    times: List[ScheduleTimeCreate] = Field(
        default=[],
        description="List of daily scheduled dose times (e.g. ['08:00', '14:00', '20:00'])"
    )
    days_of_week: Optional[List[int]] = Field(
        None,
        description="List of ISO weekdays (1=Monday, 7=Sunday) for WEEKLY or SPECIFIC_DAYS frequency"
    )
    interval_days: Optional[int] = Field(
        None,
        gt=0,
        description="Day interval recurrence count (e.g. every 2 days) for INTERVAL_DAYS frequency"
    )
    start_date: date = Field(
        default_factory=date.today,
        description="Start date when schedule becomes effective"
    )
    end_date: Optional[date] = Field(
        None,
        description="Optional end date when schedule concludes (None for ongoing)"
    )
    instructions: Optional[str] = Field(
        None,
        max_length=255,
        description="Specific timing/intake instructions (e.g., 'Take with water after food')"
    )
    is_active: bool = Field(
        default=True,
        description="Active status flag of the schedule"
    )

    @field_validator("days_of_week")
    @classmethod
    def validate_days_of_week(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        if v is not None:
            for day in v:
                if day < 1 or day > 7:
                    raise ValueError("Days of week integers must be between 1 (Monday) and 7 (Sunday)")
        return v

    @model_validator(mode="after")
    def validate_schedule_rules(self) -> "MedicationScheduleCreate":
        # Date range validation
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be earlier than start_date")

        # Non-as-needed frequencies must specify at least one time
        if self.frequency_type != ScheduleFrequencyType.AS_NEEDED and len(self.times) == 0:
            raise ValueError(f"At least one scheduled dose time is required for frequency '{self.frequency_type.value}'")

        return self


class MedicationScheduleUpdate(BaseModel):
    frequency_type: Optional[ScheduleFrequencyType] = None
    dose_quantity: Optional[Decimal] = Field(None, gt=0)
    dosage_unit: Optional[str] = Field(None, max_length=30)
    times: Optional[List[ScheduleTimeCreate]] = None
    days_of_week: Optional[List[int]] = None
    interval_days: Optional[int] = Field(None, gt=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    instructions: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None

    @field_validator("days_of_week")
    @classmethod
    def validate_days_of_week(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        if v is not None:
            for day in v:
                if day < 1 or day > 7:
                    raise ValueError("Days of week integers must be between 1 (Monday) and 7 (Sunday)")
        return v

    @model_validator(mode="after")
    def validate_schedule_update(self) -> "MedicationScheduleUpdate":
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be earlier than start_date")
        return self


class MedicationScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    patient_medication_id: uuid.UUID
    frequency_type: str
    dose_quantity: Decimal
    dosage_unit: Optional[str] = None
    days_of_week: Optional[List[int]] = None
    interval_days: Optional[int] = None
    start_date: date
    end_date: Optional[date] = None
    instructions: Optional[str] = None
    is_active: bool
    times: List[ScheduleTimeResponse] = Field(
        default=[],
        validation_alias="schedule_times",
        serialization_alias="times"
    )
    created_at: datetime
    updated_at: datetime
