import uuid
import logging
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, and_

from app.models.medicine import PatientMedication, Medicine
from app.models.schedule import MedicationSchedule, MedicationScheduleTime, MedicationDoseEvent
from app.schemas.refill import (
    MedicineRefillPrediction,
    PatientRefillSummaryResponse,
    RefillPredictionStatus,
)

logger = logging.getLogger("pillsync.refill")


def calculate_schedule_daily_consumption(schedule: MedicationSchedule) -> float:
    """
    Calculates expected daily consumption for a single medication schedule.
    """
    if not schedule.is_active:
        return 0.0

    times_count = len(schedule.schedule_times) if schedule.schedule_times else 1
    dose_amount = float(schedule.dose_quantity or 1.0)
    freq = str(schedule.frequency_type).upper()

    if freq == "DAILY":
        return times_count * dose_amount
    elif freq in ("WEEKLY", "SPECIFIC_DAYS"):
        days_per_week = len(schedule.days_of_week) if schedule.days_of_week else 1
        return (days_per_week * times_count * dose_amount) / 7.0
    elif freq == "INTERVAL_DAYS":
        interval = max(schedule.interval_days or 1, 1)
        return (times_count * dose_amount) / float(interval)
    elif freq == "AS_NEEDED":
        return 0.5 * dose_amount  # Estimated as-needed consumption
    else:
        return times_count * dose_amount


def get_medicine_refill_prediction(
    db: Session,
    medication: PatientMedication,
    target_date: Optional[date] = None,
) -> MedicineRefillPrediction:
    """
    Deterministically computes AI refill prediction for a patient medication record
    using current stock, quantity per dose, schedules, and historical TAKEN doses.
    """
    if target_date is None:
        target_date = date.today()

    cur_qty = float(medication.current_quantity or Decimal("0.0"))
    qty_per_dose = float(medication.quantity_per_dose or Decimal("1.0"))
    threshold = float(medication.low_stock_threshold or Decimal("5.0"))
    stock_unit = medication.stock_unit or medication.dosage_unit or "units"

    resolved_name = medication.custom_medicine_name or (
        medication.medicine.name if medication.medicine else "Medication"
    )
    generic_name = medication.medicine.generic_name if medication.medicine else None

    # 1. Historical consumption from actual TAKEN doses (last 30 days)
    thirty_days_ago = datetime.combine(
        target_date - timedelta(days=30), datetime.min.time()
    ).replace(tzinfo=timezone.utc)

    doses_stmt = select(MedicationDoseEvent).where(
        MedicationDoseEvent.patient_medication_id == medication.id,
        MedicationDoseEvent.scheduled_timestamp >= thirty_days_ago,
    ).order_by(MedicationDoseEvent.scheduled_timestamp.asc())

    past_doses = db.execute(doses_stmt).scalars().all()
    taken_doses = [d for d in past_doses if d.status == "TAKEN"]

    historical_daily_consumption: Optional[float] = None
    if len(taken_doses) > 0:
        total_taken_qty = sum(
            float(d.dose_quantity_taken or qty_per_dose) for d in taken_doses
        )
        earliest_dose_date = taken_doses[0].scheduled_timestamp.date()
        observed_days = max(1, (target_date - earliest_dose_date).days + 1)
        observed_days = min(30, observed_days)
        historical_daily_consumption = round(total_taken_qty / float(observed_days), 2)

    # 2. Scheduled daily consumption (fallback / reference)
    schedules_stmt = (
        select(MedicationSchedule)
        .options(joinedload(MedicationSchedule.schedule_times))
        .where(
            MedicationSchedule.patient_medication_id == medication.id,
            MedicationSchedule.is_active == True,
        )
    )
    active_schedules = db.execute(schedules_stmt).unique().scalars().all()

    scheduled_daily_consumption: Optional[float] = None
    if active_schedules:
        total_sched = sum(
            calculate_schedule_daily_consumption(s) for s in active_schedules
        )
        if total_sched > 0:
            scheduled_daily_consumption = round(total_sched, 2)

    # 3. Determine effective average daily consumption and data quality
    average_daily_consumption: Optional[float] = None
    data_quality = "INSUFFICIENT_DATA"
    confidence_score = 0.0

    if historical_daily_consumption is not None and historical_daily_consumption > 0:
        average_daily_consumption = historical_daily_consumption
        data_quality = "HIGH" if len(taken_doses) >= 5 else "MODERATE"
        confidence_score = min(0.98, 0.85 + (0.02 * min(len(taken_doses), 6)))
    elif scheduled_daily_consumption is not None and scheduled_daily_consumption > 0:
        average_daily_consumption = scheduled_daily_consumption
        data_quality = "SCHEDULE_FALLBACK"
        confidence_score = 0.85
    else:
        average_daily_consumption = None
        data_quality = "INSUFFICIENT_DATA"
        confidence_score = 0.50

    # 4. Calculate Days of Supply, Depletion Date, Recommended Refill Date, and Status
    if cur_qty <= 0.0:
        prediction_status = RefillPredictionStatus.OUT_OF_STOCK
        estimated_days_remaining = 0.0
        estimated_depletion_date = target_date
        recommended_refill_date = target_date
        explanation = (
            f"Medication is completely out of stock (0.0 {stock_unit} remaining). "
            f"Immediate refill required to continue treatment."
        )
    elif average_daily_consumption is None or average_daily_consumption <= 0:
        prediction_status = RefillPredictionStatus.INSUFFICIENT_DATA
        estimated_days_remaining = None
        estimated_depletion_date = None
        recommended_refill_date = None
        explanation = (
            f"Current stock is {cur_qty} {stock_unit}. Insufficient dose intake history "
            f"or active schedule to calculate consumption rate."
        )
    else:
        estimated_days_remaining = round(cur_qty / average_daily_consumption, 1)
        depletion_days = int(estimated_days_remaining)
        estimated_depletion_date = target_date + timedelta(days=depletion_days)

        # Refill buffer: 5 to 7 days before depletion, or based on threshold, clamped
        lead_days = min(7, max(2, int(threshold / average_daily_consumption) if threshold > 0 else 3))
        recommended_refill_date = target_date + timedelta(
            days=max(0, depletion_days - lead_days)
        )

        if estimated_days_remaining <= 3.0:
            prediction_status = RefillPredictionStatus.REFILL_RECOMMENDED
            explanation = (
                f"Urgent refill recommended: Only {estimated_days_remaining} days of supply "
                f"remaining ({cur_qty} {stock_unit}) at an average consumption of "
                f"{average_daily_consumption} {stock_unit}/day. Expected depletion date is "
                f"{estimated_depletion_date.strftime('%B %d, %Y')}."
            )
        elif estimated_days_remaining <= 10.0 or cur_qty <= threshold:
            prediction_status = RefillPredictionStatus.REFILL_SOON
            explanation = (
                f"Refill soon: Approximately {estimated_days_remaining} days of supply "
                f"remaining ({cur_qty} {stock_unit}) at an average consumption of "
                f"{average_daily_consumption} {stock_unit}/day. Recommended refill date is "
                f"{recommended_refill_date.strftime('%B %d, %Y')}."
            )
        else:
            prediction_status = RefillPredictionStatus.ON_TRACK
            explanation = (
                f"Stock on track: Approximately {estimated_days_remaining} days of supply "
                f"remaining ({cur_qty} {stock_unit}) at an average consumption of "
                f"{average_daily_consumption} {stock_unit}/day. Expected depletion date is "
                f"{estimated_depletion_date.strftime('%B %d, %Y')}."
            )

    return MedicineRefillPrediction(
        medication_id=medication.id,
        medication_name=resolved_name,
        generic_name=generic_name,
        current_quantity=cur_qty,
        stock_unit=stock_unit,
        quantity_per_dose=qty_per_dose,
        average_daily_consumption=average_daily_consumption,
        scheduled_daily_consumption=scheduled_daily_consumption,
        historical_daily_consumption=historical_daily_consumption,
        estimated_days_remaining=estimated_days_remaining,
        estimated_depletion_date=estimated_depletion_date,
        recommended_refill_date=recommended_refill_date,
        prediction_status=prediction_status,
        urgency_level=prediction_status.value,
        low_stock_threshold=threshold,
        is_active=medication.is_active,
        confidence_score=round(confidence_score, 2),
        data_quality=data_quality,
        explanation=explanation,
        prediction_explanation=explanation,
        disclaimer="Refill estimates are based on recorded medication usage and are for planning purposes only.",
    )


def get_patient_refill_predictions(
    db: Session,
    patient_id: uuid.UUID,
) -> PatientRefillSummaryResponse:
    """
    Returns unified AI refill predictions for all active medications belonging to the authenticated patient.
    """
    meds_stmt = (
        select(PatientMedication)
        .options(joinedload(PatientMedication.medicine))
        .where(PatientMedication.patient_id == patient_id)
        .order_by(PatientMedication.created_at.desc())
    )
    medications = db.execute(meds_stmt).scalars().all()

    today = date.today()
    predictions: List[MedicineRefillPrediction] = []

    on_track_cnt = 0
    refill_soon_cnt = 0
    refill_recommended_cnt = 0
    out_of_stock_cnt = 0
    insufficient_data_cnt = 0

    for med in medications:
        pred = get_medicine_refill_prediction(db, med, target_date=today)
        predictions.append(pred)

        if pred.prediction_status == RefillPredictionStatus.OUT_OF_STOCK:
            out_of_stock_cnt += 1
        elif pred.prediction_status == RefillPredictionStatus.REFILL_RECOMMENDED:
            refill_recommended_cnt += 1
        elif pred.prediction_status == RefillPredictionStatus.REFILL_SOON:
            refill_soon_cnt += 1
        elif pred.prediction_status == RefillPredictionStatus.ON_TRACK:
            on_track_cnt += 1
        else:
            insufficient_data_cnt += 1

    # Order predictions by urgency: OUT_OF_STOCK -> REFILL_RECOMMENDED -> REFILL_SOON -> ON_TRACK -> INSUFFICIENT_DATA
    status_priority = {
        RefillPredictionStatus.OUT_OF_STOCK: 0,
        RefillPredictionStatus.REFILL_RECOMMENDED: 1,
        RefillPredictionStatus.REFILL_SOON: 2,
        RefillPredictionStatus.ON_TRACK: 3,
        RefillPredictionStatus.INSUFFICIENT_DATA: 4,
    }
    predictions.sort(
        key=lambda p: (
            status_priority.get(p.prediction_status, 99),
            p.estimated_days_remaining if p.estimated_days_remaining is not None else 9999,
        )
    )

    return PatientRefillSummaryResponse(
        patient_id=patient_id,
        generated_at=datetime.now(timezone.utc),
        total_active_medications=sum(1 for m in medications if m.is_active),
        on_track_count=on_track_cnt,
        refill_soon_count=refill_soon_cnt,
        refill_recommended_count=refill_recommended_cnt,
        out_of_stock_count=out_of_stock_cnt,
        insufficient_data_count=insufficient_data_cnt,
        # Backward compatibility aliases
        safe_count=on_track_cnt,
        urgent_refill_count=refill_recommended_cnt,
        depleted_count=out_of_stock_cnt,
        items=predictions,
        disclaimer="Refill estimates are based on recorded medication usage and are for planning purposes only.",
    )
