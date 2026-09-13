import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class IntelligenceInsight(BaseModel):
    """Explainable behavioral medication insight with supporting metrics."""
    type: str = Field(..., description="Insight classification type")
    severity: str = Field(..., description="Severity level: POSITIVE, INFO, WARNING, ALERT")
    title: str = Field(..., description="Clear human-readable title")
    message: str = Field(..., description="Neutral observation statement")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="Supporting numeric data points")


class MedicationIntelligenceItem(BaseModel):
    """Medication-level adherence analysis and management status."""
    model_config = ConfigDict(from_attributes=True)

    patient_medication_id: uuid.UUID
    medicine_name: str
    dosage: Optional[str] = None
    total_doses: int = 0
    taken_doses: int = 0
    skipped_doses: int = 0
    pending_doses: int = 0
    adherence_percentage: float = 0.0
    status: str = Field(..., description="GOOD, NEEDS_ATTENTION, or INSUFFICIENT_DATA")
    last_dose_status: Optional[str] = None
    last_dose_timestamp: Optional[datetime] = None


class AdherenceTrendData(BaseModel):
    """Comparative adherence analysis across historical windows."""
    current_7d_adherence: float
    previous_7d_adherence: float
    last_30d_adherence: float
    trend_direction: str = Field(..., description="IMPROVING, DECLINING, STABLE, or INSUFFICIENT_DATA")
    change_percentage: float
    current_7d_taken: int
    current_7d_skipped: int
    previous_7d_taken: int
    previous_7d_skipped: int
    last_30d_taken: int = 0
    last_30d_skipped: int = 0


class AttentionScoreData(BaseModel):
    """Non-clinical medication-management attention indicator."""
    score: int = Field(..., ge=0, le=100, description="Attention score from 0 to 100")
    level: str = Field(..., description="LOW, MODERATE, or HIGH_ATTENTION")
    reasons: List[str] = Field(default_factory=list, description="Specific behavioral factors")
    disclaimer: str = Field(
        default="This score reflects medication-taking consistency and is not a clinical or medical risk diagnosis.",
        description="Mandatory non-clinical boundary disclaimer",
    )


class IntelligenceSummaryStats(BaseModel):
    """High-level summary of patient medication intelligence."""
    total_active_medications: int
    total_tracked_doses_30d: int
    overall_adherence_30d: float
    total_insights_count: int


class PatientMedicationIntelligenceResponse(BaseModel):
    """Complete smart medication intelligence response payload."""
    summary: IntelligenceSummaryStats
    attention_score: AttentionScoreData
    insights: List[IntelligenceInsight]
    medications: List[MedicationIntelligenceItem]
    trend: AdherenceTrendData


# ==========================================
# Feature 17D: Historical Intelligence Schemas
# ==========================================

class HistoricalAdherencePoint(BaseModel):
    """Daily historical adherence data point."""
    date: str = Field(..., description="Date formatted as YYYY-MM-DD")
    taken_count: int = 0
    skipped_count: int = 0
    completed_count: int = 0
    adherence_percentage: Optional[float] = Field(None, description="Adherence % or null if no completed doses")


class HistoricalWeeklyAdherencePoint(BaseModel):
    """Weekly aggregated adherence data point."""
    week_label: str = Field(..., description="Label such as 'Week of YYYY-MM-DD'")
    week_start: str = Field(..., description="Start date YYYY-MM-DD")
    week_end: str = Field(..., description="End date YYYY-MM-DD")
    taken_count: int = 0
    skipped_count: int = 0
    completed_count: int = 0
    adherence_percentage: Optional[float] = Field(None, description="Weekly adherence % or null if no completed doses")


class HistoricalMedicationItem(BaseModel):
    """Medication-level performance across the selected historical period."""
    patient_medication_id: uuid.UUID
    medicine_name: str
    dosage: Optional[str] = None
    taken_count: int = 0
    skipped_count: int = 0
    completed_count: int = 0
    adherence_percentage: Optional[float] = Field(None, description="Medication adherence % or null if 0 completed doses")
    status: str = Field(..., description="GOOD, NEEDS_ATTENTION, or INSUFFICIENT_DATA")
    trend: str = Field(..., description="IMPROVING, DECLINING, STABLE, or INSUFFICIENT_DATA")


class HistoricalPeriodComparison(BaseModel):
    """Comparative analysis between selected period and previous equivalent period."""
    current_period_days: int
    current_adherence: Optional[float] = None
    previous_adherence: Optional[float] = None
    change_percentage: Optional[float] = None
    trend_direction: str = Field(..., description="IMPROVING, DECLINING, STABLE, or INSUFFICIENT_DATA")
    current_taken: int = 0
    current_skipped: int = 0
    previous_taken: int = 0
    previous_skipped: int = 0


class HistoricalSummaryStats(BaseModel):
    """High-level aggregate summary of the selected historical period."""
    selected_period_days: int
    total_taken: int = 0
    total_skipped: int = 0
    total_completed: int = 0
    overall_adherence: Optional[float] = Field(None, description="Overall adherence % or null if 0 completed doses")
    active_medications_count: int = 0


class PatientMedicationHistoryResponse(BaseModel):
    """Complete historical medication intelligence response payload."""
    summary: HistoricalSummaryStats
    comparison: HistoricalPeriodComparison
    daily_timeline: List[HistoricalAdherencePoint]
    weekly_timeline: List[HistoricalWeeklyAdherencePoint]
    medications: List[HistoricalMedicationItem]
    available_periods: List[int] = Field(default=[7, 30, 90])

