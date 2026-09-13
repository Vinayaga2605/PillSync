import uuid
from datetime import datetime, date, time, timedelta, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, or_, and_, desc

from fastapi import HTTPException
from app.models.user import PatientProfile
from app.models.medicine import PatientMedication
from app.models.schedule import MedicationSchedule, MedicationDoseEvent
from app.schemas.medication_intelligence import (
    IntelligenceInsight,
    MedicationIntelligenceItem,
    AdherenceTrendData,
    AttentionScoreData,
    IntelligenceSummaryStats,
    PatientMedicationIntelligenceResponse,
    HistoricalAdherencePoint,
    HistoricalWeeklyAdherencePoint,
    HistoricalMedicationItem,
    HistoricalPeriodComparison,
    HistoricalSummaryStats,
    PatientMedicationHistoryResponse,
)


def _categorize_time_of_day(dt: datetime) -> str:
    """Categorizes a datetime into morning, afternoon, evening, or night."""
    hour = dt.hour
    if 5 <= hour < 12:
        return "MORNING"
    elif 12 <= hour < 17:
        return "AFTERNOON"
    elif 17 <= hour < 22:
        return "EVENING"
    else:
        return "NIGHT"


def get_patient_intelligence_summary(
    db: Session,
    patient_id: uuid.UUID
) -> PatientMedicationIntelligenceResponse:
    """
    Computes explainable, deterministic smart medication intelligence for a patient.
    Analyzes adherence velocity, missed dose patterns, medication-level performance,
    and calculates a non-clinical medication-management attention score.
    """
    now_utc = datetime.now(timezone.utc)
    w_curr_start = now_utc - timedelta(days=7)
    w_prev_start = now_utc - timedelta(days=14)
    w_30d_start = now_utc - timedelta(days=30)

    # 1. Fetch active patient medications
    med_query = (
        select(PatientMedication)
        .options(joinedload(PatientMedication.medicine))
        .where(
            PatientMedication.patient_id == patient_id,
            PatientMedication.is_active == True,
        )
        .order_by(PatientMedication.created_at.desc())
    )
    patient_meds = db.execute(med_query).scalars().all()
    total_active_meds = len(patient_meds)

    # 2. Windowed Adherence Aggregates (Current 7d, Previous 7d, Last 30d)
    # Dose status filter: TAKEN / (TAKEN + SKIPPED) * 100. PENDING excluded.
    def _query_doses(start_dt: datetime, end_dt: datetime):
        row = db.execute(
            select(
                func.count(MedicationDoseEvent.id).label("total"),
                func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "TAKEN").label("taken"),
                func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "SKIPPED").label("skipped"),
                func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "PENDING").label("pending"),
            ).where(
                MedicationDoseEvent.patient_id == patient_id,
                MedicationDoseEvent.scheduled_timestamp >= start_dt,
                MedicationDoseEvent.scheduled_timestamp <= end_dt,
            )
        ).one()
        taken = row.taken or 0
        skipped = row.skipped or 0
        pending = row.pending or 0
        completed = taken + skipped
        adherence = round((taken / completed) * 100.0, 2) if completed > 0 else 0.0
        return taken, skipped, pending, completed, adherence

    c_taken, c_skipped, c_pending, c_completed, c_adh = _query_doses(w_curr_start, now_utc)
    p_taken, p_skipped, p_pending, p_completed, p_adh = _query_doses(w_prev_start, w_curr_start)
    tot_30_taken, tot_30_skipped, tot_30_pending, tot_30_completed, tot_30_adh = _query_doses(w_30d_start, now_utc)

    # 3. Adherence Trend Determination
    # Meaningful change threshold: >= 5.0%
    if c_completed == 0 and p_completed == 0:
        trend_direction = "INSUFFICIENT_DATA"
        change_pct = 0.0
    elif p_completed == 0:
        trend_direction = "STABLE"
        change_pct = 0.0
    else:
        change_pct = round(c_adh - p_adh, 2)
        if change_pct >= 5.0:
            trend_direction = "IMPROVING"
        elif change_pct <= -5.0:
            trend_direction = "DECLINING"
        else:
            trend_direction = "STABLE"

    trend_data = AdherenceTrendData(
        current_7d_adherence=c_adh,
        previous_7d_adherence=p_adh,
        last_30d_adherence=tot_30_adh,
        trend_direction=trend_direction,
        change_percentage=change_pct,
        current_7d_taken=c_taken,
        current_7d_skipped=c_skipped,
        previous_7d_taken=p_taken,
        previous_7d_skipped=p_skipped,
        last_30d_taken=tot_30_taken,
        last_30d_skipped=tot_30_skipped,
    )

    # 4. Medication-Level Intelligence Items
    medication_items: List[MedicationIntelligenceItem] = []
    med_stats_rows = db.execute(
        select(
            MedicationDoseEvent.patient_medication_id,
            func.count(MedicationDoseEvent.id).label("total"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "TAKEN").label("taken"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "SKIPPED").label("skipped"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "PENDING").label("pending"),
        )
        .where(
            MedicationDoseEvent.patient_id == patient_id,
            MedicationDoseEvent.scheduled_timestamp >= w_30d_start,
        )
        .group_by(MedicationDoseEvent.patient_medication_id)
    ).all()
    med_stats_map = {row.patient_medication_id: row for row in med_stats_rows}

    # Fetch last dose event per medication
    for pm in patient_meds:
        med_name = pm.custom_medicine_name or (pm.medicine.name if pm.medicine else "Medication")
        dosage_str = f"{pm.dosage_amount} {pm.dosage_unit}" if pm.dosage_amount and pm.dosage_unit else None

        stat = med_stats_map.get(pm.id)
        if stat:
            m_total = stat.total or 0
            m_taken = stat.taken or 0
            m_skipped = stat.skipped or 0
            m_pending = stat.pending or 0
        else:
            m_total = m_taken = m_skipped = m_pending = 0

        m_completed = m_taken + m_skipped
        m_adh = round((m_taken / m_completed) * 100.0, 2) if m_completed > 0 else 0.0

        if m_completed < 2:
            m_status = "INSUFFICIENT_DATA"
        elif m_adh >= 80.0:
            m_status = "GOOD"
        else:
            m_status = "NEEDS_ATTENTION"

        # Last dose event
        last_event = db.execute(
            select(MedicationDoseEvent)
            .where(MedicationDoseEvent.patient_medication_id == pm.id)
            .order_by(desc(MedicationDoseEvent.scheduled_timestamp))
            .limit(1)
        ).scalar_one_or_none()

        medication_items.append(
            MedicationIntelligenceItem(
                patient_medication_id=pm.id,
                medicine_name=med_name,
                dosage=dosage_str,
                total_doses=m_total,
                taken_doses=m_taken,
                skipped_doses=m_skipped,
                pending_doses=m_pending,
                adherence_percentage=m_adh,
                status=m_status,
                last_dose_status=last_event.status if last_event else None,
                last_dose_timestamp=last_event.scheduled_timestamp if last_event else None,
            )
        )

    # 5. Missed / Skipped Dose Patterns (Time-of-day and frequency)
    skipped_events = db.execute(
        select(MedicationDoseEvent)
        .where(
            MedicationDoseEvent.patient_id == patient_id,
            MedicationDoseEvent.status == "SKIPPED",
            MedicationDoseEvent.scheduled_timestamp >= w_30d_start,
        )
    ).scalars().all()

    time_of_day_counts = {"MORNING": 0, "AFTERNOON": 0, "EVENING": 0, "NIGHT": 0}
    for ev in skipped_events:
        tod = _categorize_time_of_day(ev.scheduled_timestamp)
        time_of_day_counts[tod] = time_of_day_counts.get(tod, 0) + 1

    # 6. Generate Explainable Insights
    insights: List[IntelligenceInsight] = []

    # Case A: Insufficient Data
    if tot_30_completed == 0:
        insights.append(
            IntelligenceInsight(
                type="INSUFFICIENT_DATA",
                severity="INFO",
                title="Not enough history yet",
                message="More dose history is needed before meaningful adherence patterns can be identified.",
                metrics={
                    "completed_doses": 0,
                    "total_doses": tot_30_completed + tot_30_pending,
                },
            )
        )
    else:
        # Case B: Improving Adherence
        if trend_direction == "IMPROVING" and c_completed >= 2:
            insights.append(
                IntelligenceInsight(
                    type="ADHERENCE_IMPROVEMENT",
                    severity="POSITIVE",
                    title="Adherence has improved",
                    message=f"Your adherence was {abs(change_pct)}% higher over the last 7 days compared to the prior week.",
                    metrics={
                        "current_7d_adherence": c_adh,
                        "previous_7d_adherence": p_adh,
                        "change_percentage": change_pct,
                    },
                )
            )

        # Case C: Declining Adherence
        if trend_direction == "DECLINING" and c_completed >= 2:
            insights.append(
                IntelligenceInsight(
                    type="ADHERENCE_DECLINE",
                    severity="WARNING",
                    title="Adherence has declined",
                    message=f"Your adherence was {abs(change_pct)}% lower during the last 7 days compared to the prior week.",
                    metrics={
                        "current_7d_adherence": c_adh,
                        "previous_7d_adherence": p_adh,
                        "change_percentage": change_pct,
                    },
                )
            )

        # Case D: Consistently Good Adherence
        if trend_direction == "STABLE" and tot_30_adh >= 85.0 and tot_30_completed >= 5:
            insights.append(
                IntelligenceInsight(
                    type="CONSISTENT_ADHERENCE",
                    severity="POSITIVE",
                    title="Consistent high adherence",
                    message=f"You have maintained a strong medication adherence rate of {tot_30_adh}% over the past 30 days.",
                    metrics={
                        "adherence_30d": tot_30_adh,
                        "taken_doses": tot_30_taken,
                        "completed_doses": tot_30_completed,
                    },
                )
            )

        # Case E: Repeated Skips on Specific Medications
        for m in medication_items:
            if m.skipped_doses >= 2 and m.adherence_percentage < 75.0:
                insights.append(
                    IntelligenceInsight(
                        type="REPEATED_SKIPS",
                        severity="WARNING",
                        title=f"Frequent skipped doses for {m.medicine_name}",
                        message=f"{m.medicine_name} was skipped {m.skipped_doses} times in the last 30 days ({m.adherence_percentage}% adherence).",
                        metrics={
                            "medicine_name": m.medicine_name,
                            "skipped_doses": m.skipped_doses,
                            "taken_doses": m.taken_doses,
                            "medication_adherence": m.adherence_percentage,
                        },
                    )
                )

        # Case F: Time of Day Skipped Dose Pattern
        ev_night_skips = time_of_day_counts["EVENING"] + time_of_day_counts["NIGHT"]
        morning_skips = time_of_day_counts["MORNING"]
        total_skips = len(skipped_events)

        if ev_night_skips >= 2 and (ev_night_skips >= 2 * max(1, morning_skips)):
            insights.append(
                IntelligenceInsight(
                    type="MISSED_DOSE_TIME_PATTERN",
                    severity="INFO",
                    title="Evening doses missed more frequently",
                    message="Evening and night doses have been skipped more often than morning doses.",
                    metrics={
                        "evening_and_night_skips": ev_night_skips,
                        "morning_skips": morning_skips,
                        "total_skips_30d": total_skips,
                    },
                )
            )
        elif morning_skips >= 2 and (morning_skips >= 2 * max(1, ev_night_skips)):
            insights.append(
                IntelligenceInsight(
                    type="MISSED_DOSE_TIME_PATTERN",
                    severity="INFO",
                    title="Morning doses missed more frequently",
                    message="Morning doses have been skipped more often than evening doses.",
                    metrics={
                        "evening_and_night_skips": ev_night_skips,
                        "morning_skips": morning_skips,
                        "total_skips_30d": total_skips,
                    },
                )
            )

    # 7. Attention Score Calculation (Adherence Attention Score: 0 to 100)
    # Strictly non-clinical medication-management indicator.
    attention_score_val = 0
    attention_reasons: List[str] = []

    if tot_30_completed < 2:
        attention_score_val = 0
        attention_level = "LOW"
        attention_reasons.append("Insufficient dose history to calculate an attention score.")
    else:
        # Factor 1: Recent skipped doses in last 7 days (+15 each, max 45)
        if c_skipped > 0:
            skip_points = min(45, c_skipped * 15)
            attention_score_val += skip_points
            attention_reasons.append(
                f"Several scheduled doses were skipped recently ({c_skipped} dose{'s' if c_skipped > 1 else ''} in the last 7 days)"
            )

        # Factor 2: Declining adherence (+25)
        if trend_direction == "DECLINING":
            attention_score_val += 25
            attention_reasons.append(
                f"Adherence declined by {abs(change_pct)}% compared to the previous week"
            )

        # Factor 3: Low 7-day adherence
        if c_adh < 50.0 and c_completed >= 2:
            attention_score_val += 30
            attention_reasons.append(
                f"Recent 7-day adherence ({c_adh}%) is significantly below benchmark"
            )
        elif c_adh < 75.0 and c_completed >= 2:
            attention_score_val += 15
            attention_reasons.append(
                f"Recent 7-day adherence ({c_adh}%) is below the 80% adherence benchmark"
            )

        # Factor 4: Medications with low adherence
        low_meds = [m for m in medication_items if m.status == "NEEDS_ATTENTION"]
        if low_meds:
            attention_score_val += min(20, len(low_meds) * 10)
            for lm in low_meds[:2]:
                attention_reasons.append(
                    f"Medication '{lm.medicine_name}' has low adherence ({lm.adherence_percentage}%)"
                )

        # Cap score between 0 and 100
        attention_score_val = min(100, max(0, attention_score_val))

        if attention_score_val >= 60:
            attention_level = "HIGH_ATTENTION"
        elif attention_score_val >= 30:
            attention_level = "MODERATE"
        else:
            attention_level = "LOW"

        if not attention_reasons:
            attention_reasons.append("All scheduled doses are being taken consistently.")

    attention_score_data = AttentionScoreData(
        score=attention_score_val,
        level=attention_level,
        reasons=attention_reasons,
    )

    summary_stats = IntelligenceSummaryStats(
        total_active_medications=total_active_meds,
        total_tracked_doses_30d=tot_30_completed,
        overall_adherence_30d=tot_30_adh,
        total_insights_count=len(insights),
    )

    return PatientMedicationIntelligenceResponse(
        summary=summary_stats,
        attention_score=attention_score_data,
        insights=insights,
        medications=medication_items,
        trend=trend_data,
    )


def get_patient_intelligence_history(
    db: Session,
    patient_id: uuid.UUID,
    days: int = 30,
) -> PatientMedicationHistoryResponse:
    """
    Computes historical medication-taking intelligence for a patient over 7, 30, or 90 days.
    Provides daily adherence timeline, weekly grouped aggregations, medication-level performance,
    and comparison against the previous equivalent historical period.
    """
    if days not in (7, 30, 90):
        raise HTTPException(
            status_code=422,
            detail="Invalid historical period. Allowed values: 7, 30, 90 days.",
        )

    now_utc = datetime.now(timezone.utc)
    curr_start = now_utc - timedelta(days=days)
    prev_start = now_utc - timedelta(days=2 * days)

    # 1. Fetch active patient medications
    med_query = (
        select(PatientMedication)
        .options(joinedload(PatientMedication.medicine))
        .where(
            PatientMedication.patient_id == patient_id,
            PatientMedication.is_active == True,
        )
        .order_by(PatientMedication.created_at.desc())
    )
    patient_meds = db.execute(med_query).scalars().all()
    active_meds_count = len(patient_meds)

    # 2. Fetch all dose events across current and previous periods
    dose_query = (
        select(MedicationDoseEvent)
        .where(
            MedicationDoseEvent.patient_id == patient_id,
            MedicationDoseEvent.scheduled_timestamp >= prev_start,
            MedicationDoseEvent.scheduled_timestamp <= now_utc,
        )
        .order_by(MedicationDoseEvent.scheduled_timestamp.asc())
    )
    all_doses = db.execute(dose_query).scalars().all()

    curr_doses = [d for d in all_doses if d.scheduled_timestamp >= curr_start]
    prev_doses = [d for d in all_doses if d.scheduled_timestamp < curr_start]

    # 3. Daily Timeline (from curr_start to now_utc)
    daily_timeline: List[HistoricalAdherencePoint] = []
    # Generate list of dates for the window (oldest to newest)
    start_date = curr_start.date()
    for i in range(days):
        day_date = start_date + timedelta(days=i)
        day_doses = [d for d in curr_doses if d.scheduled_timestamp.date() == day_date]

        d_taken = sum(1 for d in day_doses if d.status == "TAKEN")
        d_skipped = sum(1 for d in day_doses if d.status == "SKIPPED")
        d_completed = d_taken + d_skipped
        d_adh = round((d_taken / d_completed) * 100.0, 2) if d_completed > 0 else None

        daily_timeline.append(
            HistoricalAdherencePoint(
                date=day_date.isoformat(),
                taken_count=d_taken,
                skipped_count=d_skipped,
                completed_count=d_completed,
                adherence_percentage=d_adh,
            )
        )

    # 4. Weekly Aggregation (divide daily_timeline into 7-day slices)
    weekly_timeline: List[HistoricalWeeklyAdherencePoint] = []
    chunk_size = 7
    for idx in range(0, len(daily_timeline), chunk_size):
        chunk = daily_timeline[idx:idx + chunk_size]
        if not chunk:
            continue
        w_taken = sum(p.taken_count for p in chunk)
        w_skipped = sum(p.skipped_count for p in chunk)
        w_completed = w_taken + w_skipped
        w_adh = round((w_taken / w_completed) * 100.0, 2) if w_completed > 0 else None
        w_start = chunk[0].date
        w_end = chunk[-1].date
        w_label = f"Week of {w_start}"

        weekly_timeline.append(
            HistoricalWeeklyAdherencePoint(
                week_label=w_label,
                week_start=w_start,
                week_end=w_end,
                taken_count=w_taken,
                skipped_count=w_skipped,
                completed_count=w_completed,
                adherence_percentage=w_adh,
            )
        )

    # 5. Medication-Level Historical Breakdown
    medications_data: List[HistoricalMedicationItem] = []
    for pm in patient_meds:
        med_curr = [d for d in curr_doses if d.patient_medication_id == pm.id]
        m_taken = sum(1 for d in med_curr if d.status == "TAKEN")
        m_skipped = sum(1 for d in med_curr if d.status == "SKIPPED")
        m_completed = m_taken + m_skipped
        m_adh = round((m_taken / m_completed) * 100.0, 2) if m_completed > 0 else None

        if m_completed < 2 or m_adh is None:
            m_status = "INSUFFICIENT_DATA"
        elif m_adh >= 80.0:
            m_status = "GOOD"
        else:
            m_status = "NEEDS_ATTENTION"

        # Previous period for medication trend
        med_prev = [d for d in prev_doses if d.patient_medication_id == pm.id]
        p_taken = sum(1 for d in med_prev if d.status == "TAKEN")
        p_skipped = sum(1 for d in med_prev if d.status == "SKIPPED")
        p_completed = p_taken + p_skipped
        p_adh = round((p_taken / p_completed) * 100.0, 2) if p_completed > 0 else None

        if m_completed < 2 or p_completed < 2 or m_adh is None or p_adh is None:
            m_trend = "INSUFFICIENT_DATA"
        else:
            diff = m_adh - p_adh
            if diff >= 5.0:
                m_trend = "IMPROVING"
            elif diff <= -5.0:
                m_trend = "DECLINING"
            else:
                m_trend = "STABLE"

        med_name = pm.custom_medicine_name or (pm.medicine.name if pm.medicine else "Medication")
        dosage_str = f"{pm.dosage_amount} {pm.dosage_unit}" if pm.dosage_amount and pm.dosage_unit else None

        medications_data.append(
            HistoricalMedicationItem(
                patient_medication_id=pm.id,
                medicine_name=med_name,
                dosage=dosage_str,
                taken_count=m_taken,
                skipped_count=m_skipped,
                completed_count=m_completed,
                adherence_percentage=m_adh,
                status=m_status,
                trend=m_trend,
            )
        )

    # 6. Period Comparison
    tot_c_taken = sum(1 for d in curr_doses if d.status == "TAKEN")
    tot_c_skipped = sum(1 for d in curr_doses if d.status == "SKIPPED")
    tot_c_completed = tot_c_taken + tot_c_skipped
    c_adh = round((tot_c_taken / tot_c_completed) * 100.0, 2) if tot_c_completed > 0 else None

    tot_p_taken = sum(1 for d in prev_doses if d.status == "TAKEN")
    tot_p_skipped = sum(1 for d in prev_doses if d.status == "SKIPPED")
    tot_p_completed = tot_p_taken + tot_p_skipped
    p_adh = round((tot_p_taken / tot_p_completed) * 100.0, 2) if tot_p_completed > 0 else None

    if tot_c_completed < 2 or tot_p_completed < 2 or c_adh is None or p_adh is None:
        comp_trend = "INSUFFICIENT_DATA"
        change_pct = None
    else:
        change_pct = round(c_adh - p_adh, 2)
        if change_pct >= 5.0:
            comp_trend = "IMPROVING"
        elif change_pct <= -5.0:
            comp_trend = "DECLINING"
        else:
            comp_trend = "STABLE"

    period_comparison = HistoricalPeriodComparison(
        current_period_days=days,
        current_adherence=c_adh,
        previous_adherence=p_adh,
        change_percentage=change_pct,
        trend_direction=comp_trend,
        current_taken=tot_c_taken,
        current_skipped=tot_c_skipped,
        previous_taken=tot_p_taken,
        previous_skipped=tot_p_skipped,
    )

    # 7. Summary Stats
    summary_stats = HistoricalSummaryStats(
        selected_period_days=days,
        total_taken=tot_c_taken,
        total_skipped=tot_c_skipped,
        total_completed=tot_c_completed,
        overall_adherence=c_adh,
        active_medications_count=active_meds_count,
    )

    return PatientMedicationHistoryResponse(
        summary=summary_stats,
        comparison=period_comparison,
        daily_timeline=daily_timeline,
        weekly_timeline=weekly_timeline,
        medications=medications_data,
        available_periods=[7, 30, 90],
    )

