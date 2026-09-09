from typing import Optional

from pydantic import BaseModel


class ScheduleCreate(BaseModel):
    patient_id: int
    medicine_id: int
    dosage: str
    time_of_day: str
    notes: Optional[str] = None


class ScheduleOut(BaseModel):
    id: int
    patient_id: int
    medicine_id: int
    medicine_name: Optional[str] = None
    medicine_brand: Optional[str] = None
    dosage: str
    time_of_day: str
    notes: Optional[str] = None
    is_active: bool
    taken: bool = False

    class Config:
        from_attributes = True


class TakeMedicineResponse(BaseModel):
    schedule_id: int
    medicine_name: str
    time_of_day: str
    taken: bool
    message: str
