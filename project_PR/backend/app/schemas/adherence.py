import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field


class AdherenceSummaryResponse(BaseModel):
    period_start: date = Field(..., description="Start date of the evaluated period")
    period_end: date = Field(..., description="End date of the evaluated period")
    total_doses: int = Field(..., description="Total doses scheduled in the period")
    taken_doses: int = Field(..., description="Total doses marked as TAKEN")
    skipped_doses: int = Field(..., description="Total doses marked as SKIPPED")
    pending_doses: int = Field(..., description="Total doses currently PENDING")
    adherence_percentage: float = Field(..., description="Adherence percentage (0.0 to 100.0)")

    class Config:
        from_attributes = True


class MedicationAdherenceItem(BaseModel):
    patient_medication_id: uuid.UUID = Field(..., description="Patient medication ID")
    medicine_name: str = Field(..., description="Medicine name")
    generic_name: Optional[str] = Field(None, description="Generic medication name")
    total_doses: int = Field(..., description="Total doses scheduled for this medication")
    taken_doses: int = Field(..., description="Total doses TAKEN")
    skipped_doses: int = Field(..., description="Total doses SKIPPED")
    pending_doses: int = Field(..., description="Total doses PENDING")
    adherence_percentage: float = Field(..., description="Adherence percentage for this medication")

    class Config:
        from_attributes = True


class MedicationAdherenceResponse(BaseModel):
    period_start: date = Field(..., description="Start date of the evaluated period")
    period_end: date = Field(..., description="End date of the evaluated period")
    overall_adherence_percentage: float = Field(..., description="Overall adherence percentage across all medications")
    medications: List[MedicationAdherenceItem] = Field(default_factory=list, description="Adherence breakdown per medication")

    class Config:
        from_attributes = True


class MedicationHistoryItemResponse(BaseModel):
    id: uuid.UUID = Field(..., description="Dose event ID")
    patient_medication_id: uuid.UUID = Field(..., description="Patient medication ID")
    medicine_name: str = Field(..., description="Name of the medication")
    generic_name: Optional[str] = Field(None, description="Generic name")
    dosage_unit: Optional[str] = Field(None, description="Unit of measurement")
    scheduled_timestamp: datetime = Field(..., description="Scheduled time for this dose")
    status: str = Field(..., description="Dose status (TAKEN, SKIPPED, PENDING, etc.)")
    actual_taken_timestamp: Optional[datetime] = Field(None, description="Timestamp when the dose was actually taken")
    dose_quantity_taken: Optional[Decimal] = Field(None, description="Quantity taken")
    notes: Optional[str] = Field(None, description="Notes recorded with the dose event")
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: datetime = Field(..., description="Record last update timestamp")

    class Config:
        from_attributes = True


class MedicationHistoryResponse(BaseModel):
    total_count: int = Field(..., description="Total number of matching history records")
    items: List[MedicationHistoryItemResponse] = Field(default_factory=list, description="List of medication dose events")

    class Config:
        from_attributes = True
