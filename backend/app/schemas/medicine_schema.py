from typing import Optional

from pydantic import BaseModel


class MedicineCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    description: Optional[str] = None
    default_dosage: Optional[str] = None


class MedicineOut(BaseModel):
    id: int
    name: str
    brand: Optional[str] = None
    description: Optional[str] = None
    default_dosage: Optional[str] = None

    class Config:
        from_attributes = True
