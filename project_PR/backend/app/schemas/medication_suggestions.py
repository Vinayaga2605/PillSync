import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class MedicationSuggestion(BaseModel):
    """Deterministic, non-clinical medication-management suggestion."""
    id: str = Field(..., description="Unique deterministic suggestion identifier")
    category: str = Field(..., description="ADHERENCE, MISSED_DOSES, REMINDER_REVIEW, TIMING_PATTERN, POSITIVE_PROGRESS, or CAREGIVER_DISCUSSION")
    priority: str = Field(..., description="Management attention priority: LOW, MEDIUM, or HIGH")
    title: str = Field(..., description="Clear human-readable suggestion headline")
    message: str = Field(..., description="Actionable, non-clinical guidance statement")
    reason: str = Field(..., description="Deterministic justification derived from recorded PillSync dose data")
    supporting_metrics: Dict[str, Any] = Field(default_factory=dict, description="Supporting numeric data points")
    action_type: Optional[str] = Field(
        None,
        description="Optional safe action code: REVIEW_REMINDERS, REVIEW_HISTORY, DISCUSS_WITH_CAREGIVER, DISCUSS_WITH_HEALTHCARE_PROFESSIONAL, CONTINUE_CURRENT_PLAN"
    )
    action_label: Optional[str] = Field(None, description="Human-readable button or link text for safe navigation")
    action_url: Optional[str] = Field(None, description="Internal frontend route corresponding to action")
    disclaimer: str = Field(
        default="These suggestions describe medication-taking patterns recorded in PillSync. They are not medical advice and do not replace guidance from a healthcare professional.",
        description="Mandatory non-clinical boundary disclaimer"
    )


class PatientMedicationSuggestionsResponse(BaseModel):
    """Complete smart suggestions response payload for patient."""
    suggestions: List[MedicationSuggestion] = Field(default_factory=list, description="List of prioritized non-clinical suggestions")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="UTC timestamp of generation")
    disclaimer: str = Field(
        default="These suggestions describe medication-taking patterns recorded in PillSync. They are not medical advice and do not replace guidance from a healthcare professional.",
        description="Mandatory non-clinical boundary disclaimer"
    )
