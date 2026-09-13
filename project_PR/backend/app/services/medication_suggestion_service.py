import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.schemas.medication_suggestions import (
    MedicationSuggestion,
    PatientMedicationSuggestionsResponse,
)
from app.services.medication_intelligence_service import (
    get_patient_intelligence_summary,
)

DISCLAIMER_TEXT = (
    "These suggestions describe medication-taking patterns recorded in PillSync. "
    "They are not medical advice and do not replace guidance from a healthcare professional."
)

PRIORITY_MAP = {
    "HIGH": 3,
    "MEDIUM": 2,
    "LOW": 1,
}

CATEGORY_ORDER = {
    "ADHERENCE": 1,
    "MISSED_DOSES": 2,
    "TIMING_PATTERN": 3,
    "CAREGIVER_DISCUSSION": 4,
    "REMINDER_REVIEW": 5,
    "POSITIVE_PROGRESS": 6,
}


def get_patient_medication_suggestions(
    db: Session,
    patient_id: uuid.UUID
) -> PatientMedicationSuggestionsResponse:
    """
    Generates deterministic, non-clinical medication-management suggestions
    based on the patient's existing recorded adherence and intelligence patterns.
    """
    intel = get_patient_intelligence_summary(db, patient_id)
    suggestions: List[MedicationSuggestion] = []

    total_completed_30d = 0
    for med in intel.medications:
        total_completed_30d += (med.taken_doses + med.skipped_doses)

    # -------------------------------------------------------------
    # Rule G: Insufficient Data Handling
    # -------------------------------------------------------------
    if total_completed_30d < 3 or intel.trend.trend_direction == "INSUFFICIENT_DATA":
        suggestions.append(
            MedicationSuggestion(
                id="sug_insufficient_data",
                category="ADHERENCE",
                priority="LOW",
                title="Not enough medication history yet",
                message="More completed dose history is needed before a meaningful medication pattern can be identified.",
                reason="Only a few completed doses have been recorded in your dose history so far.",
                supporting_metrics={
                    "completed_doses_30d": total_completed_30d,
                    "minimum_doses_needed": 3,
                },
                action_type="CONTINUE_CURRENT_PLAN",
                action_label="Record daily doses",
                action_url="/app/dashboard",
                disclaimer=DISCLAIMER_TEXT,
            )
        )
        return PatientMedicationSuggestionsResponse(
            suggestions=suggestions,
            generated_at=datetime.now(timezone.utc),
            disclaimer=DISCLAIMER_TEXT,
        )

    # -------------------------------------------------------------
    # Rule A & D: Adherence Routine Review (Low Adherence / Declining)
    # -------------------------------------------------------------
    curr_7d_completed = intel.trend.current_7d_taken + intel.trend.current_7d_skipped
    is_low_adherence = (
        curr_7d_completed >= 3 and intel.trend.current_7d_adherence < 70.0
    )
    is_declining = intel.trend.trend_direction == "DECLINING"

    if is_low_adherence and is_declining:
        # Combined rule for low adherence + declining trend to avoid duplicate alerts
        suggestions.append(
            MedicationSuggestion(
                id="sug_adherence_low_declining",
                category="ADHERENCE",
                priority="HIGH" if intel.trend.current_7d_adherence < 50.0 else "MEDIUM",
                title="Review your recent medication routine",
                message=(
                    "Your recorded adherence has decreased compared with the previous period "
                    "and is currently below target. Consider reviewing your reminder setup and daily routine."
                ),
                reason=(
                    f"7-day adherence is {intel.trend.current_7d_adherence}% "
                    f"({intel.trend.change_percentage}% vs prior 7-day period of {intel.trend.previous_7d_adherence}%)."
                ),
                supporting_metrics={
                    "current_7d_adherence": intel.trend.current_7d_adherence,
                    "previous_7d_adherence": intel.trend.previous_7d_adherence,
                    "change_percentage": intel.trend.change_percentage,
                    "current_7d_taken": intel.trend.current_7d_taken,
                    "current_7d_skipped": intel.trend.current_7d_skipped,
                },
                action_type="REVIEW_REMINDERS",
                action_label="Review reminder settings",
                action_url="/app/medications",
                disclaimer=DISCLAIMER_TEXT,
            )
        )
    elif is_low_adherence:
        suggestions.append(
            MedicationSuggestion(
                id="sug_adherence_low",
                category="ADHERENCE",
                priority="HIGH" if intel.trend.current_7d_adherence < 50.0 else "MEDIUM",
                title="Review your recent medication routine",
                message=(
                    "Your recorded adherence has been below your usual target range recently. "
                    "Consider reviewing your reminder and medication-taking routine."
                ),
                reason=f"7-day adherence is {intel.trend.current_7d_adherence}% with {intel.trend.current_7d_skipped} skipped doses.",
                supporting_metrics={
                    "current_7d_adherence": intel.trend.current_7d_adherence,
                    "current_7d_taken": intel.trend.current_7d_taken,
                    "current_7d_skipped": intel.trend.current_7d_skipped,
                },
                action_type="REVIEW_REMINDERS",
                action_label="Review reminder settings",
                action_url="/app/medications",
                disclaimer=DISCLAIMER_TEXT,
            )
        )
    elif is_declining:
        suggestions.append(
            MedicationSuggestion(
                id="sug_adherence_declining",
                category="ADHERENCE",
                priority="MEDIUM",
                title="Adherence has decreased recently",
                message=(
                    "Your recorded adherence is lower than in the previous period. "
                    "Consider reviewing your medication-taking routine."
                ),
                reason=(
                    f"7-day adherence shifted from {intel.trend.previous_7d_adherence}% "
                    f"to {intel.trend.current_7d_adherence}% ({intel.trend.change_percentage}% change)."
                ),
                supporting_metrics={
                    "current_7d_adherence": intel.trend.current_7d_adherence,
                    "previous_7d_adherence": intel.trend.previous_7d_adherence,
                    "change_percentage": intel.trend.change_percentage,
                    "current_7d_taken": intel.trend.current_7d_taken,
                    "current_7d_skipped": intel.trend.current_7d_skipped,
                },
                action_type="REVIEW_HISTORY",
                action_label="View medication history",
                action_url="/app/insights/history",
                disclaimer=DISCLAIMER_TEXT,
            )
        )

    # -------------------------------------------------------------
    # Rule B: Repeated Skipped Doses on Specific Medications
    # -------------------------------------------------------------
    for med in intel.medications:
        completed = med.taken_doses + med.skipped_doses
        if completed >= 3 and (med.status == "NEEDS_ATTENTION" or (med.skipped_doses >= 2 and med.adherence_percentage < 75.0)):
            suggestions.append(
                MedicationSuggestion(
                    id=f"sug_med_skips_{med.patient_medication_id}",
                    category="MISSED_DOSES",
                    priority="HIGH" if med.skipped_doses >= 3 else "MEDIUM",
                    title=f"Repeated skipped doses for {med.medicine_name}",
                    message=(
                        f"Several skipped doses have been recorded for {med.medicine_name}. "
                        "Consider reviewing your reminder setup or discussing the pattern with your caregiver or healthcare professional."
                    ),
                    reason=f"{med.skipped_doses} doses were recorded as skipped out of {completed} completed doses ({med.adherence_percentage}% adherence).",
                    supporting_metrics={
                        "medication_id": str(med.patient_medication_id),
                        "medication_name": med.medicine_name,
                        "skipped_count": med.skipped_doses,
                        "taken_count": med.taken_doses,
                        "medication_adherence": med.adherence_percentage,
                    },
                    action_type="DISCUSS_WITH_CAREGIVER",
                    action_label="Discuss pattern with caregiver",
                    action_url="/app/insights/history",
                    disclaimer=DISCLAIMER_TEXT,
                )
            )

    # -------------------------------------------------------------
    # Rule C: Missed Time-of-Day Pattern
    # -------------------------------------------------------------
    for ins in intel.insights:
        if ins.type in ["MISSED_DOSE_TIME_PATTERN", "MISSED_TIME_OF_DAY"]:
            ev_night = ins.metrics.get("evening_and_night_skips", 0)
            morning = ins.metrics.get("morning_skips", 0)
            if ev_night > morning or "evening" in ins.title.lower():
                tod = "EVENING"
                skipped_count = ev_night or ins.metrics.get("skipped_in_time_of_day", 0)
            else:
                tod = "MORNING"
                skipped_count = morning or ins.metrics.get("skipped_in_time_of_day", 0)

            suggestions.append(
                MedicationSuggestion(
                    id=f"sug_timing_{tod.lower()}",
                    category="TIMING_PATTERN",
                    priority="MEDIUM",
                    title=f"{tod.capitalize()} doses are being missed more often",
                    message=(
                        f"Your recent dose history shows more skipped {tod.lower()} doses than other times of day. "
                        "Consider reviewing your reminder setup for this period."
                    ),
                    reason=f"{skipped_count} skipped doses occurred during {tod.lower()} scheduled times.",
                    supporting_metrics={
                        "time_of_day": tod,
                        "skipped_count": skipped_count,
                        "total_skips_30d": ins.metrics.get("total_skips_30d", skipped_count),
                    },
                    action_type="REVIEW_REMINDERS",
                    action_label="Review reminder times",
                    action_url="/app/medications",
                    disclaimer=DISCLAIMER_TEXT,
                )
            )

    # -------------------------------------------------------------
    # Rule E: Positive Improvement
    # -------------------------------------------------------------
    if intel.trend.trend_direction == "IMPROVING" and intel.trend.current_7d_adherence >= 75.0:
        suggestions.append(
            MedicationSuggestion(
                id="sug_improving_adherence",
                category="POSITIVE_PROGRESS",
                priority="LOW",
                title="Your adherence is improving",
                message=(
                    "Your recent recorded adherence is higher than the previous period. "
                    "Keep following your existing medication plan."
                ),
                reason=(
                    f"7-day adherence increased by +{abs(intel.trend.change_percentage)}% "
                    f"(from {intel.trend.previous_7d_adherence}% to {intel.trend.current_7d_adherence}%)."
                ),
                supporting_metrics={
                    "current_7d_adherence": intel.trend.current_7d_adherence,
                    "previous_7d_adherence": intel.trend.previous_7d_adherence,
                    "change_percentage": intel.trend.change_percentage,
                },
                action_type="CONTINUE_CURRENT_PLAN",
                action_label="View progress history",
                action_url="/app/insights/history",
                disclaimer=DISCLAIMER_TEXT,
            )
        )

    # -------------------------------------------------------------
    # Rule F: Stable Good Adherence
    # -------------------------------------------------------------
    has_needs_attention = any(m.status == "NEEDS_ATTENTION" for m in intel.medications)
    if (
        (intel.trend.trend_direction == "STABLE" or (not is_declining and not is_low_adherence and intel.trend.trend_direction != "IMPROVING"))
        and intel.trend.current_7d_adherence >= 80.0
        and not has_needs_attention
    ):
        suggestions.append(
            MedicationSuggestion(
                id="sug_stable_good_adherence",
                category="POSITIVE_PROGRESS",
                priority="LOW",
                title="Your medication-taking pattern is consistent",
                message="Your recent recorded dose history shows consistent medication-taking behavior.",
                reason=f"7-day adherence is {intel.trend.current_7d_adherence}% with regular logged intake.",
                supporting_metrics={
                    "current_7d_adherence": intel.trend.current_7d_adherence,
                    "current_7d_taken": intel.trend.current_7d_taken,
                },
                action_type="CONTINUE_CURRENT_PLAN",
                action_label="Keep following routine",
                action_url="/app/insights",
                disclaimer=DISCLAIMER_TEXT,
            )
        )

    # -------------------------------------------------------------
    # Step 6: Deduplication & Deterministic Sorting (Limit to Max 5)
    # -------------------------------------------------------------
    # Deduplicate by suggestion ID
    seen_ids = set()
    unique_suggestions: List[MedicationSuggestion] = []
    for s in suggestions:
        if s.id not in seen_ids:
            seen_ids.add(s.id)
            unique_suggestions.append(s)

    # Sort deterministically: Priority (HIGH > MEDIUM > LOW), Category order, ID
    unique_suggestions.sort(
        key=lambda s: (
            -PRIORITY_MAP.get(s.priority, 0),
            CATEGORY_ORDER.get(s.category, 99),
            s.id,
        )
    )

    # Respect maximum 5 suggestions
    final_suggestions = unique_suggestions[:5]

    return PatientMedicationSuggestionsResponse(
        suggestions=final_suggestions,
        generated_at=datetime.now(timezone.utc),
        disclaimer=DISCLAIMER_TEXT,
    )
