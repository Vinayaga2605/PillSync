import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict, field_validator


class StockStatusEnum(str, Enum):
    AVAILABLE = "AVAILABLE"
    LOW = "LOW"
    OUT_OF_STOCK = "OUT_OF_STOCK"


def compute_stock_status(current_quantity: Optional[Decimal], low_stock_threshold: Optional[Decimal] = None) -> str:
    """
    Computes deterministic stock status:
    - OUT_OF_STOCK: current_quantity <= 0
    - LOW: current_quantity > 0 and current_quantity <= low_stock_threshold
    - AVAILABLE: current_quantity > low_stock_threshold
    """
    if current_quantity is None or current_quantity <= Decimal("0.0"):
        return StockStatusEnum.OUT_OF_STOCK.value
    thresh = low_stock_threshold if low_stock_threshold is not None else Decimal("5.0")
    if current_quantity <= thresh:
        return StockStatusEnum.LOW.value
    return StockStatusEnum.AVAILABLE.value


class MedicineCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Medicine or brand name")
    generic_name: Optional[str] = Field(None, max_length=200, description="Generic pharmacological name")
    dosage_amount: Decimal = Field(default=Decimal("1.0"), gt=0, description="Dosage quantity per intake")
    dosage_unit: str = Field(..., min_length=1, max_length=30, description="Unit e.g. tablet, capsule, mg, ml, puff")
    instructions: Optional[str] = Field(None, max_length=255, description="Intake instructions e.g. After food")
    start_date: Optional[date] = Field(None, description="Start date for taking the medication")
    end_date: Optional[date] = Field(None, description="Optional end date for taking the medication")
    is_active: bool = Field(default=True, description="Whether the medication is actively being taken")

    # Stock / Inventory Fields (Feature 18)
    initial_quantity: Optional[Decimal] = Field(default=None, ge=0, description="Initial stock quantity")
    current_quantity: Optional[Decimal] = Field(default=None, ge=0, description="Current stock quantity")
    quantity_per_dose: Optional[Decimal] = Field(default=Decimal("1.0"), gt=0, description="Quantity consumed per dose")
    stock_unit: Optional[str] = Field(default=None, max_length=30, description="Unit for stock tracking (e.g. tablet, capsule, ml, bottle, strip)")
    low_stock_threshold: Optional[Decimal] = Field(default=Decimal("5.0"), ge=0, description="Low stock threshold")

    @field_validator("name", "generic_name", "dosage_unit", "stock_unit", "instructions", mode="before")
    @classmethod
    def strip_strings(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v if v else None
        return v

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, v, info):
        start = info.data.get("start_date") or date.today()
        if v and v < start:
            raise ValueError("End date must be greater than or equal to start date")
        return v


class MedicineUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    generic_name: Optional[str] = Field(None, max_length=200)
    dosage_amount: Optional[Decimal] = Field(None, gt=0)
    dosage_unit: Optional[str] = Field(None, min_length=1, max_length=30)
    instructions: Optional[str] = Field(None, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None

    # Stock / Inventory Fields (Feature 18)
    initial_quantity: Optional[Decimal] = Field(None, ge=0)
    current_quantity: Optional[Decimal] = Field(None, ge=0)
    quantity_per_dose: Optional[Decimal] = Field(None, gt=0)
    stock_unit: Optional[str] = Field(None, max_length=30)
    low_stock_threshold: Optional[Decimal] = Field(None, ge=0)

    @field_validator("name", "generic_name", "dosage_unit", "stock_unit", "instructions", mode="before")
    @classmethod
    def strip_strings(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v if v else None
        return v


class MedicineResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    medicine_id: Optional[uuid.UUID] = None
    name: str
    generic_name: Optional[str] = None
    dosage_amount: Decimal
    dosage_unit: str
    instructions: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    is_active: bool

    # Stock / Inventory Fields (Feature 18)
    initial_quantity: Optional[Decimal] = Decimal("0.0")
    current_quantity: Optional[Decimal] = Decimal("0.0")
    quantity_per_dose: Optional[Decimal] = Decimal("1.0")
    stock_unit: Optional[str] = None
    low_stock_threshold: Optional[Decimal] = Decimal("5.0")
    stock_status: str = StockStatusEnum.OUT_OF_STOCK.value

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================================================================
# Feature 18: Dedicated Stock Operation Schemas
# =========================================================================

class StockUpdateRequest(BaseModel):
    current_quantity: Optional[Decimal] = Field(None, ge=0, description="Updated current stock quantity")
    initial_quantity: Optional[Decimal] = Field(None, ge=0, description="Updated initial stock quantity")
    quantity_per_dose: Optional[Decimal] = Field(None, gt=0, description="Quantity deducted per dose")
    stock_unit: Optional[str] = Field(None, min_length=1, max_length=30, description="Stock unit e.g. tablet, ml")
    low_stock_threshold: Optional[Decimal] = Field(None, ge=0, description="Threshold for low stock alert")

    @field_validator("stock_unit", mode="before")
    @classmethod
    def strip_stock_unit(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v if v else None
        return v


class StockAddRequest(BaseModel):
    quantity: Decimal = Field(..., gt=0, description="Positive quantity to add to existing stock")


class StockConsumeRequest(BaseModel):
    quantity: Optional[Decimal] = Field(None, gt=0, description="Positive quantity to consume (defaults to quantity_per_dose)")


class StockResponse(BaseModel):
    medication_id: uuid.UUID
    patient_id: uuid.UUID
    medicine_name: str
    initial_quantity: Decimal
    current_quantity: Decimal
    quantity_per_dose: Decimal
    stock_unit: str
    low_stock_threshold: Decimal
    stock_status: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
