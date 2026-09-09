from typing import Optional

from pydantic import BaseModel
from pydantic import EmailStr


class PatientProfileCreate(BaseModel):
    dob: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None


class PatientOut(BaseModel):
    user_id: int
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None

    class Config:
        from_attributes = True
