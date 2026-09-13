import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


class RefillPredictionStatus(str, Enum):
    ON_TRACK = "ON_TRACK"                     # More than 10 days of supply remaining
    REFILL_SOON = "REFILL_SOON"               # 4 to 10 days of supply or stock <= low threshold
    REFILL_RECOMMENDED = "REFILL_RECOMMENDED" # 1 to 3 days of supply remaining
    OUT_OF_STOCK = "OUT_OF_STOCK"             # 0 or negative remaining stock
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"   # Cannot reliably compute consumption


# Backward compatibility alias
RefillUrgencyEnum = RefillPredictionStatus


class MedicineRefillPrediction(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    medication_id: uuid.UUID
    medication_name: str
    generic_name: Optional[str] = None
    current_quantity: float
    stock_unit: str = "units"
    quantity_per_dose: float = 1.0
    average_daily_consumption: Optional[float] = None
    scheduled_daily_consumption: Optional[float] = None
    historical_daily_consumption: Optional[float] = None
    estimated_days_remaining: Optional[float] = None
    estimated_depletion_date: Optional[date] = None
    recommended_refill_date: Optional[date] = None
    prediction_status: RefillPredictionStatus
    urgency_level: Optional[str] = None
    low_stock_threshold: float = 5.0
    is_active: bool = True
    confidence_score: float = Field(default=0.95, description="Confidence score of prediction (0.0 to 1.0)")
    data_quality: str = Field(default="MODERATE", description="Quality of source data used: HIGH, MODERATE, SCHEDULE_FALLBACK, INSUFFICIENT_DATA")
    explanation: str
    prediction_explanation: Optional[str] = None
    disclaimer: str = "Refill estimates are based on recorded medication usage and are for planning purposes only."


class PatientRefillSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    patient_id: uuid.UUID
    generated_at: datetime
    total_active_medications: int
    on_track_count: int = 0
    refill_soon_count: int = 0
    refill_recommended_count: int = 0
    out_of_stock_count: int = 0
    insufficient_data_count: int = 0

    # Backward compatibility counters
    safe_count: int = 0
    urgent_refill_count: int = 0
    depleted_count: int = 0

    items: List[MedicineRefillPrediction]
    disclaimer: str = "Refill estimates are based on recorded medication usage and are for planning purposes only."
