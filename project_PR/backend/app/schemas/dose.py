import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class DoseStatusEnum(str, Enum):
    PENDING = "PENDING"
    TAKEN = "TAKEN"
    SKIPPED = "SKIPPED"
    MISSED = "MISSED"
    SNOOZED = "SNOOZED"


class RecordDoseEventRequest(BaseModel):
    schedule_id: uuid.UUID = Field(
        ...,
        description="ID of the medication schedule for which this dose occurrence is being recorded"
    )
    scheduled_timestamp: datetime = Field(
        ...,
        description="The scheduled timestamp occurrence (e.g. '2026-09-01T08:00:00+05:30')"
    )
    status: DoseStatusEnum = Field(
        default=DoseStatusEnum.TAKEN,
        description="Recorded status for the dose event (TAKEN, SKIPPED, PENDING, SNOOZED, or MISSED)"
    )
    action_timestamp: Optional[datetime] = Field(
        None,
        description="Timestamp when the action occurred (defaults to current time if TAKEN/SKIPPED/SNOOZED)"
    )
    snooze_minutes: Optional[int] = Field(
        None,
        ge=1,
        le=1440,
        description="Minutes to snooze if status is SNOOZED (defaults to 10 minutes)"
    )
    dose_quantity_taken: Optional[Decimal] = Field(
        None,
        gt=0,
        description="Actual amount taken (defaults to schedule dose quantity if TAKEN)"
    )
    notes: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional patient intake notes or symptoms"
    )


class DoseActionRequest(BaseModel):
    action_timestamp: Optional[datetime] = Field(
        None,
        description="Timestamp when the dose action occurred (defaults to current server time)"
    )
    dose_quantity_taken: Optional[Decimal] = Field(
        None,
        gt=0,
        description="Optional dose quantity taken"
    )
    snooze_minutes: Optional[int] = Field(
        10,
        ge=1,
        le=1440,
        description="Minutes to postpone reminder if snoozing (defaults to 10)"
    )
    notes: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional notes"
    )


class SnoozeDoseRequest(BaseModel):
    snooze_minutes: int = Field(
        default=10,
        ge=1,
        le=1440,
        description="Minutes to postpone reminder (e.g. 10, 15, 30)"
    )
    action_timestamp: Optional[datetime] = Field(
        None,
        description="Optional reference action timestamp"
    )
    notes: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional notes"
    )


class DoseEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    patient_medication_id: uuid.UUID
    medicine_name: str
    generic_name: Optional[str] = None
    schedule_id: Optional[uuid.UUID] = None
    scheduled_timestamp: datetime
    status: str
    actual_taken_timestamp: Optional[datetime] = None
    snoozed_until_timestamp: Optional[datetime] = None
    dose_quantity_taken: Optional[Decimal] = None
    dosage_unit: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
