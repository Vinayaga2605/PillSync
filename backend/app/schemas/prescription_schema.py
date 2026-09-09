from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class PrescriptionItemOut(BaseModel):
    id: int
    scan_id: int
    medicine_id: Optional[int] = None
    detected_name: str
    matched_name: Optional[str] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None
    confidence: float
    confidence_level: str
    selected: bool

    class Config:
        from_attributes = True


class PrescriptionScanOut(BaseModel):
    id: int
    patient_id: int
    image_path: Optional[str] = None
    raw_ocr_text: Optional[str] = None
    status: str
    created_at: datetime
    items: List[PrescriptionItemOut] = []

    class Config:
        from_attributes = True


class ScanItemUpdate(BaseModel):
    selected: Optional[bool] = None
    medicine_id: Optional[int] = None
    matched_name: Optional[str] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None


class ConfirmItemPayload(BaseModel):
    scan_item_id: int
    selected: bool
    medicine_id: int
    dosage: Optional[str] = "500 mg"
    time_of_day: Optional[str] = "morning"  # morning, afternoon, evening, night
    notes: Optional[str] = None


class ConfirmPrescriptionRequest(BaseModel):
    items: List[ConfirmItemPayload]
