import uuid
import logging
from datetime import date, time, datetime, timedelta
from typing import List, Optional, Tuple
from zoneinfo import ZoneInfo
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status as http_status

from app.models.schedule import MedicationDoseEvent, MedicationSchedule
from app.models.medicine import PatientMedication, Medicine
from app.schemas.adherence import (
    AdherenceSummaryResponse,
    MedicationAdherenceItem,
    MedicationAdherenceResponse,
    MedicationHistoryItemResponse,
    MedicationHistoryResponse,
)
from app.services.reminder_service import get_app_timezone, normalize_reference_datetime

logger = logging.getLogger("pillsync.adherence")


def _get_period_date_bounds(
    target_date: date,
    tz: ZoneInfo
) -> Tuple[datetime, datetime]:
    """Returns timezone-aware start and end datetimes for a single calendar day."""
    start_dt = datetime.combine(target_date, time.min).replace(tzinfo=tz)
    end_dt = datetime.combine(target_date, time.max).replace(tzinfo=tz)
    return start_dt, end_dt


def _get_range_date_bounds(
    start_date: date,
    end_date: date,
    tz: ZoneInfo
) -> Tuple[datetime, datetime]:
    """Returns timezone-aware start and end datetimes for a date range."""
    start_dt = datetime.combine(start_date, time.min).replace(tzinfo=tz)
    end_dt = datetime.combine(end_date, time.max).replace(tzinfo=tz)
    return start_dt, end_dt


def calculate_adherence(
    db: Session,
    patient_id: uuid.UUID,
    start_dt: datetime,
    end_dt: datetime,
    period_start: date,
    period_end: date,
    medicine_id: Optional[uuid.UUID] = None,
) -> AdherenceSummaryResponse:
    """
    Calculates adherence statistics for a patient over a specific datetime window.
    Uses efficient SQL aggregate filtering on existing MedicationDoseEvent records.
    
    Adherence formula:
    - TAKEN doses / completed trackable doses (TAKEN + SKIPPED) * 100
    - PENDING doses are not counted as completed.
    - If completed doses == 0, returns 0.0 to prevent division-by-zero.
    """
    query = (
        select(
            func.count(MedicationDoseEvent.id).label("total_doses"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "TAKEN").label("taken_doses"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "SKIPPED").label("skipped_doses"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "PENDING").label("pending_doses"),
        )
        .where(
            MedicationDoseEvent.patient_id == patient_id,
            MedicationDoseEvent.scheduled_timestamp >= start_dt,
            MedicationDoseEvent.scheduled_timestamp <= end_dt,
        )
    )

    if medicine_id is not None:
        query = query.join(
            PatientMedication,
            MedicationDoseEvent.patient_medication_id == PatientMedication.id
        ).where(
            or_(
                MedicationDoseEvent.patient_medication_id == medicine_id,
                PatientMedication.medicine_id == medicine_id,
            )
        )

    row = db.execute(query).one()
    total = row.total_doses or 0
    taken = row.taken_doses or 0
    skipped = row.skipped_doses or 0
    pending = row.pending_doses or 0

    completed_trackable = taken + skipped
    if completed_trackable > 0:
        adherence_pct = round((taken / completed_trackable) * 100.0, 2)
    else:
        adherence_pct = 0.0

    return AdherenceSummaryResponse(
        period_start=period_start,
        period_end=period_end,
        total_doses=total,
        taken_doses=taken,
        skipped_doses=skipped,
        pending_doses=pending,
        adherence_percentage=adherence_pct,
    )


def calculate_today_adherence(
    db: Session,
    patient_id: uuid.UUID,
    medicine_id: Optional[uuid.UUID] = None,
) -> AdherenceSummaryResponse:
    """Calculates adherence for today in the application timezone."""
    tz = get_app_timezone()
    now = normalize_reference_datetime()
    today = now.date()
    start_dt, end_dt = _get_period_date_bounds(today, tz)

    return calculate_adherence(
        db,
        patient_id=patient_id,
        start_dt=start_dt,
        end_dt=end_dt,
        period_start=today,
        period_end=today,
        medicine_id=medicine_id,
    )


def calculate_week_adherence(
    db: Session,
    patient_id: uuid.UUID,
    medicine_id: Optional[uuid.UUID] = None,
) -> AdherenceSummaryResponse:
    """Calculates adherence for the current week (Monday to Sunday) in the application timezone."""
    tz = get_app_timezone()
    now = normalize_reference_datetime()
    today = now.date()
    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    start_dt, end_dt = _get_range_date_bounds(start_of_week, end_of_week, tz)

    return calculate_adherence(
        db,
        patient_id=patient_id,
        start_dt=start_dt,
        end_dt=end_dt,
        period_start=start_of_week,
        period_end=end_of_week,
        medicine_id=medicine_id,
    )


def calculate_month_adherence(
    db: Session,
    patient_id: uuid.UUID,
    medicine_id: Optional[uuid.UUID] = None,
) -> AdherenceSummaryResponse:
    """Calculates adherence for the current calendar month in the application timezone."""
    tz = get_app_timezone()
    now = normalize_reference_datetime()
    today = now.date()
    start_of_month = today.replace(day=1)
    if today.month == 12:
        end_of_month = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        end_of_month = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

    start_dt, end_dt = _get_range_date_bounds(start_of_month, end_of_month, tz)

    return calculate_adherence(
        db,
        patient_id=patient_id,
        start_dt=start_dt,
        end_dt=end_dt,
        period_start=start_of_month,
        period_end=end_of_month,
        medicine_id=medicine_id,
    )


def calculate_custom_range_adherence(
    db: Session,
    patient_id: uuid.UUID,
    start_date: date,
    end_date: date,
    medicine_id: Optional[uuid.UUID] = None,
) -> AdherenceSummaryResponse:
    """
    Calculates adherence over a validated custom date range.
    Rejects inverted date ranges and queries exceeding 365 days.
    """
    if start_date > end_date:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be less than or equal to end_date",
        )

    if (end_date - start_date).days > 365:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Date range cannot exceed 365 days",
        )

    tz = get_app_timezone()
    start_dt, end_dt = _get_range_date_bounds(start_date, end_date, tz)

    return calculate_adherence(
        db,
        patient_id=patient_id,
        start_dt=start_dt,
        end_dt=end_dt,
        period_start=start_date,
        period_end=end_date,
        medicine_id=medicine_id,
    )


def calculate_medication_adherence(
    db: Session,
    patient_id: uuid.UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    medicine_id: Optional[uuid.UUID] = None,
) -> MedicationAdherenceResponse:
    """
    Calculates adherence grouped by each of the patient's medications within a period.
    If dates are omitted, defaults to the current calendar month.
    """
    tz = get_app_timezone()
    now = normalize_reference_datetime()
    today = now.date()

    if start_date is None and end_date is None:
        period_start = today.replace(day=1)
        if today.month == 12:
            period_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            period_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    elif start_date is not None and end_date is not None:
        if start_date > end_date:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="start_date must be less than or equal to end_date",
            )
        if (end_date - start_date).days > 365:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Date range cannot exceed 365 days",
            )
        period_start = start_date
        period_end = end_date
    elif start_date is not None:
        period_start = start_date
        period_end = start_date
    else:
        period_start = end_date
        period_end = end_date

    start_dt, end_dt = _get_range_date_bounds(period_start, period_end, tz)

    # 1. Fetch patient medications
    med_query = (
        select(PatientMedication)
        .options(joinedload(PatientMedication.medicine))
        .where(PatientMedication.patient_id == patient_id)
    )
    if medicine_id is not None:
        med_query = med_query.where(
            or_(
                PatientMedication.id == medicine_id,
                PatientMedication.medicine_id == medicine_id,
            )
        )

    patient_meds = db.execute(med_query).scalars().unique().all()

    # 2. Query aggregate dose events grouped by patient_medication_id
    stats_query = (
        select(
            MedicationDoseEvent.patient_medication_id,
            func.count(MedicationDoseEvent.id).label("total_doses"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "TAKEN").label("taken_doses"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "SKIPPED").label("skipped_doses"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "PENDING").label("pending_doses"),
        )
        .where(
            MedicationDoseEvent.patient_id == patient_id,
            MedicationDoseEvent.scheduled_timestamp >= start_dt,
            MedicationDoseEvent.scheduled_timestamp <= end_dt,
        )
        .group_by(MedicationDoseEvent.patient_medication_id)
    )

    stats_rows = db.execute(stats_query).all()
    stats_map = {row.patient_medication_id: row for row in stats_rows}

    medication_items: List[MedicationAdherenceItem] = []
    total_all_taken = 0
    total_all_completed = 0

    for pm in patient_meds:
        med_name = pm.custom_medicine_name or (pm.medicine.name if pm.medicine else "Medication")
        generic_name = pm.medicine.generic_name if pm.medicine else None

        stat = stats_map.get(pm.id)
        if stat:
            total = stat.total_doses or 0
            taken = stat.taken_doses or 0
            skipped = stat.skipped_doses or 0
            pending = stat.pending_doses or 0
        else:
            total = taken = skipped = pending = 0

        completed = taken + skipped
        adherence_pct = round((taken / completed) * 100.0, 2) if completed > 0 else 0.0

        total_all_taken += taken
        total_all_completed += completed

        medication_items.append(
            MedicationAdherenceItem(
                patient_medication_id=pm.id,
                medicine_name=med_name,
                generic_name=generic_name,
                total_doses=total,
                taken_doses=taken,
                skipped_doses=skipped,
                pending_doses=pending,
                adherence_percentage=adherence_pct,
            )
        )

    overall_pct = (
        round((total_all_taken / total_all_completed) * 100.0, 2)
        if total_all_completed > 0
        else 0.0
    )

    return MedicationAdherenceResponse(
        period_start=period_start,
        period_end=period_end,
        overall_adherence_percentage=overall_pct,
        medications=medication_items,
    )


def get_medication_history(
    db: Session,
    patient_id: uuid.UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    medicine_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> MedicationHistoryResponse:
    """
    Retrieves chronological medication dose history for the authenticated patient.
    Supports filtering by date range, medicine, and status.
    """
    tz = get_app_timezone()

    conditions = [MedicationDoseEvent.patient_id == patient_id]

    if start_date is not None and end_date is not None:
        if start_date > end_date:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="start_date must be less than or equal to end_date",
            )
        if (end_date - start_date).days > 365:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Date range cannot exceed 365 days",
            )
        start_dt, _ = _get_range_date_bounds(start_date, start_date, tz)
        _, end_dt = _get_range_date_bounds(end_date, end_date, tz)
        conditions.append(MedicationDoseEvent.scheduled_timestamp >= start_dt)
        conditions.append(MedicationDoseEvent.scheduled_timestamp <= end_dt)
    elif start_date is not None:
        start_dt, _ = _get_period_date_bounds(start_date, tz)
        conditions.append(MedicationDoseEvent.scheduled_timestamp >= start_dt)
    elif end_date is not None:
        _, end_dt = _get_period_date_bounds(end_date, tz)
        conditions.append(MedicationDoseEvent.scheduled_timestamp <= end_dt)

    if status_filter:
        conditions.append(MedicationDoseEvent.status == status_filter.upper())

    # Count total matching rows
    count_query = select(func.count(MedicationDoseEvent.id)).where(and_(*conditions))
    if medicine_id is not None:
        count_query = count_query.join(
            PatientMedication,
            MedicationDoseEvent.patient_medication_id == PatientMedication.id
        ).where(
            or_(
                MedicationDoseEvent.patient_medication_id == medicine_id,
                PatientMedication.medicine_id == medicine_id,
            )
        )
    total_count = db.execute(count_query).scalar_one() or 0

    # Query items
    items_query = (
        select(MedicationDoseEvent)
        .options(
            joinedload(MedicationDoseEvent.patient_medication).joinedload(PatientMedication.medicine),
            joinedload(MedicationDoseEvent.schedule),
        )
        .where(and_(*conditions))
    )

    if medicine_id is not None:
        items_query = items_query.join(
            PatientMedication,
            MedicationDoseEvent.patient_medication_id == PatientMedication.id
        ).where(
            or_(
                MedicationDoseEvent.patient_medication_id == medicine_id,
                PatientMedication.medicine_id == medicine_id,
            )
        )

    items_query = (
        items_query.order_by(MedicationDoseEvent.scheduled_timestamp.desc())
        .offset(offset)
        .limit(min(limit, 500))
    )

    doses = db.execute(items_query).scalars().unique().all()

    items = []
    for dose in doses:
        med = dose.patient_medication
        med_name = med.custom_medicine_name or (med.medicine.name if med and med.medicine else "Medication")
        generic_name = med.medicine.generic_name if med and med.medicine else None
        dosage_unit = (dose.schedule.dosage_unit if dose.schedule else None) or (med.dosage_unit if med else None)

        items.append(
            MedicationHistoryItemResponse(
                id=dose.id,
                patient_medication_id=dose.patient_medication_id,
                medicine_name=med_name,
                generic_name=generic_name,
                dosage_unit=dosage_unit,
                scheduled_timestamp=dose.scheduled_timestamp,
                status=dose.status,
                actual_taken_timestamp=dose.actual_taken_timestamp,
                dose_quantity_taken=dose.dose_quantity_taken,
                notes=dose.notes,
                created_at=dose.created_at,
                updated_at=dose.updated_at,
            )
        )

    return MedicationHistoryResponse(
        total_count=total_count,
        items=items,
    )
