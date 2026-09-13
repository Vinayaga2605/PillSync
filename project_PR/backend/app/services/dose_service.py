import uuid
import logging
from datetime import date, time, datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.schedule import MedicationSchedule, MedicationDoseEvent
from app.models.medicine import PatientMedication
from app.schemas.dose import (
    DoseStatusEnum,
    RecordDoseEventRequest,
    DoseActionRequest,
    DoseEventResponse,
)
from app.services.reminder_service import get_app_timezone, normalize_reference_datetime

logger = logging.getLogger("pillsync.dose")


def _deduct_medication_stock(med: Optional[PatientMedication], quantity_taken: Optional[Decimal] = None) -> None:
    """
    Safely deducts medication stock for a taken dose without allowing negative stock.
    Only called when a dose successfully transitions to TAKEN.
    """
    if not med:
        return
    qty = quantity_taken or med.quantity_per_dose or Decimal("1.0")
    current_qty = med.current_quantity if med.current_quantity is not None else Decimal("0.0")
    new_qty = max(Decimal("0.0"), current_qty - qty)
    med.current_quantity = new_qty
    logger.info(f"Deducted {qty} from medication id={med.id} stock upon TAKEN dose. Remaining: {new_qty}")


def _to_dose_response(dose: MedicationDoseEvent) -> DoseEventResponse:
    """
    Converts a MedicationDoseEvent ORM model to a clean DoseEventResponse schema.
    """
    med = dose.patient_medication
    med_name = med.custom_medicine_name or (med.medicine.name if med and med.medicine else "Medication")
    generic_name = med.medicine.generic_name if med and med.medicine else None
    dosage_unit = (dose.schedule.dosage_unit if dose.schedule else None) or (med.dosage_unit if med else None)

    return DoseEventResponse(
        id=dose.id,
        patient_id=dose.patient_id,
        patient_medication_id=dose.patient_medication_id,
        medicine_name=med_name,
        generic_name=generic_name,
        schedule_id=dose.schedule_id,
        scheduled_timestamp=dose.scheduled_timestamp,
        status=dose.status,
        actual_taken_timestamp=dose.actual_taken_timestamp,
        snoozed_until_timestamp=dose.snoozed_until_timestamp,
        dose_quantity_taken=dose.dose_quantity_taken,
        dosage_unit=dosage_unit,
        notes=dose.notes,
        created_at=dose.created_at,
        updated_at=dose.updated_at,
    )


def record_dose_event(
    db: Session,
    patient_id: uuid.UUID,
    user_id: uuid.UUID,
    data: RecordDoseEventRequest,
) -> DoseEventResponse:
    """
    Records or claims a persistent dose event for a specific scheduled occurrence.
    Prevents duplicates through unique lookup on (schedule_id, scheduled_timestamp).
    Integrates stock deduction on transitioning to TAKEN.
    Handles TAKEN, SKIPPED, SNOOZED, and PENDING states safely.
    """
    # 1. Verify schedule ownership through patient_medications
    schedule = db.execute(
        select(MedicationSchedule)
        .join(MedicationSchedule.patient_medication)
        .options(
            joinedload(MedicationSchedule.patient_medication).joinedload(PatientMedication.medicine)
        )
        .where(
            MedicationSchedule.id == data.schedule_id,
            PatientMedication.patient_id == patient_id,
        )
    ).scalars().first()

    if not schedule:
        logger.warning(
            f"Unauthorized or non-existent schedule access: patient_id={patient_id}, schedule_id={data.schedule_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication schedule not found",
        )

    # 2. Normalize scheduled timestamp
    norm_scheduled_ts = normalize_reference_datetime(data.scheduled_timestamp)
    tz = norm_scheduled_ts.tzinfo

    # 3. Check for existing dose event (idempotency check)
    existing_dose = db.execute(
        select(MedicationDoseEvent)
        .options(
            joinedload(MedicationDoseEvent.patient_medication).joinedload(PatientMedication.medicine),
            joinedload(MedicationDoseEvent.schedule),
        )
        .where(
            MedicationDoseEvent.schedule_id == data.schedule_id,
            MedicationDoseEvent.scheduled_timestamp == norm_scheduled_ts,
        )
    ).scalars().first()

    if existing_dose:
        # If transitioning from non-TAKEN (e.g. PENDING/SNOOZED) to TAKEN, deduct stock once
        if existing_dose.status != DoseStatusEnum.TAKEN.value and data.status == DoseStatusEnum.TAKEN:
            qty_taken = (
                data.dose_quantity_taken
                or (existing_dose.schedule.dose_quantity if existing_dose.schedule else None)
                or (existing_dose.patient_medication.quantity_per_dose if existing_dose.patient_medication else None)
            )
            _deduct_medication_stock(existing_dose.patient_medication, qty_taken)

        # Update status
        if existing_dose.status in (DoseStatusEnum.PENDING.value, DoseStatusEnum.SNOOZED.value, DoseStatusEnum.MISSED.value):
            existing_dose.status = data.status.value
            if data.status == DoseStatusEnum.TAKEN:
                existing_dose.actual_taken_timestamp = data.action_timestamp or datetime.now(tz)
                existing_dose.snoozed_until_timestamp = None
                existing_dose.dose_quantity_taken = data.dose_quantity_taken or (
                    existing_dose.schedule.dose_quantity if existing_dose.schedule else None
                )
            elif data.status == DoseStatusEnum.SKIPPED:
                existing_dose.actual_taken_timestamp = None
                existing_dose.snoozed_until_timestamp = None
            elif data.status == DoseStatusEnum.SNOOZED:
                snooze_mins = data.snooze_minutes or 10
                action_ts = data.action_timestamp or datetime.now(tz)
                existing_dose.snoozed_until_timestamp = action_ts + timedelta(minutes=snooze_mins)
                existing_dose.actual_taken_timestamp = None

            if data.notes:
                existing_dose.notes = data.notes
            existing_dose.recorded_by_user_id = user_id
            db.commit()
            db.refresh(existing_dose)

        return _to_dose_response(existing_dose)

    # 4. Create new MedicationDoseEvent
    actual_taken_ts = None
    snoozed_until_ts = None
    qty_taken = None

    if data.status == DoseStatusEnum.TAKEN:
        actual_taken_ts = data.action_timestamp or datetime.now(tz)
        qty_taken = data.dose_quantity_taken or schedule.dose_quantity
        # Deduct stock for newly recorded TAKEN dose
        _deduct_medication_stock(schedule.patient_medication, qty_taken)
    elif data.status == DoseStatusEnum.SNOOZED:
        snooze_mins = data.snooze_minutes or 10
        action_ts = data.action_timestamp or datetime.now(tz)
        snoozed_until_ts = action_ts + timedelta(minutes=snooze_mins)

    new_dose = MedicationDoseEvent(
        patient_medication_id=schedule.patient_medication_id,
        schedule_id=schedule.id,
        patient_id=patient_id,
        scheduled_timestamp=norm_scheduled_ts,
        status=data.status.value,
        actual_taken_timestamp=actual_taken_ts,
        snoozed_until_timestamp=snoozed_until_ts,
        dose_quantity_taken=qty_taken,
        recorded_by_user_id=user_id,
        notes=data.notes,
    )

    db.add(new_dose)
    try:
        db.commit()
        db.refresh(new_dose)
        logger.info(f"Recorded dose event id={new_dose.id} status={new_dose.status} for patient_id={patient_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error persisting dose event: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record dose event",
        )

    # Reload with relationships
    persisted = db.execute(
        select(MedicationDoseEvent)
        .options(
            joinedload(MedicationDoseEvent.patient_medication).joinedload(PatientMedication.medicine),
            joinedload(MedicationDoseEvent.schedule),
        )
        .where(MedicationDoseEvent.id == new_dose.id)
    ).scalar_one()

    return _to_dose_response(persisted)


def mark_dose_taken(
    db: Session,
    patient_id: uuid.UUID,
    user_id: uuid.UUID,
    dose_id: uuid.UUID,
    data: DoseActionRequest,
) -> DoseEventResponse:
    """
    Marks an existing dose event as TAKEN with accurate action timestamp.
    Safely deducts medication stock only if the dose was not already TAKEN.
    """
    dose = db.execute(
        select(MedicationDoseEvent)
        .options(
            joinedload(MedicationDoseEvent.patient_medication).joinedload(PatientMedication.medicine),
            joinedload(MedicationDoseEvent.schedule),
        )
        .where(
            MedicationDoseEvent.id == dose_id,
            MedicationDoseEvent.patient_id == patient_id,
        )
    ).scalars().first()

    if not dose:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dose event record not found",
        )

    # Only deduct stock if transitioning from a non-TAKEN state
    if dose.status != DoseStatusEnum.TAKEN.value:
        qty_to_deduct = (
            data.dose_quantity_taken
            or (dose.schedule.dose_quantity if dose.schedule else None)
            or (dose.patient_medication.quantity_per_dose if dose.patient_medication else None)
        )
        _deduct_medication_stock(dose.patient_medication, qty_to_deduct)

    tz = get_app_timezone()
    dose.status = DoseStatusEnum.TAKEN.value
    dose.actual_taken_timestamp = data.action_timestamp or datetime.now(tz)
    dose.snoozed_until_timestamp = None

    if data.dose_quantity_taken:
        dose.dose_quantity_taken = data.dose_quantity_taken
    elif not dose.dose_quantity_taken and dose.schedule:
        dose.dose_quantity_taken = dose.schedule.dose_quantity

    if data.notes:
        dose.notes = data.notes
    dose.recorded_by_user_id = user_id

    try:
        db.commit()
        db.refresh(dose)
        logger.info(f"Marked dose id={dose_id} as TAKEN at {dose.actual_taken_timestamp}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error marking dose taken: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update dose status",
        )

    return _to_dose_response(dose)


def mark_dose_skipped(
    db: Session,
    patient_id: uuid.UUID,
    user_id: uuid.UUID,
    dose_id: uuid.UUID,
    data: DoseActionRequest,
) -> DoseEventResponse:
    """
    Marks an existing dose event as SKIPPED. Does NOT deduct stock.
    """
    dose = db.execute(
        select(MedicationDoseEvent)
        .options(
            joinedload(MedicationDoseEvent.patient_medication).joinedload(PatientMedication.medicine),
            joinedload(MedicationDoseEvent.schedule),
        )
        .where(
            MedicationDoseEvent.id == dose_id,
            MedicationDoseEvent.patient_id == patient_id,
        )
    ).scalars().first()

    if not dose:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dose event record not found",
        )

    dose.status = DoseStatusEnum.SKIPPED.value
    dose.actual_taken_timestamp = None
    dose.snoozed_until_timestamp = None

    if data.notes:
        dose.notes = data.notes
    dose.recorded_by_user_id = user_id

    try:
        db.commit()
        db.refresh(dose)
        logger.info(f"Marked dose id={dose_id} as SKIPPED")
    except Exception as e:
        db.rollback()
        logger.error(f"Error marking dose skipped: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update dose status",
        )

    return _to_dose_response(dose)


def mark_dose_snoozed(
    db: Session,
    patient_id: uuid.UUID,
    user_id: uuid.UUID,
    dose_id: uuid.UUID,
    data: DoseActionRequest,
) -> DoseEventResponse:
    """
    Postpones an active/due dose reminder by a specified interval (e.g. 10 or 15 minutes).
    Updates snoozed_until_timestamp without consuming stock or altering completed states.
    """
    dose = db.execute(
        select(MedicationDoseEvent)
        .options(
            joinedload(MedicationDoseEvent.patient_medication).joinedload(PatientMedication.medicine),
            joinedload(MedicationDoseEvent.schedule),
        )
        .where(
            MedicationDoseEvent.id == dose_id,
            MedicationDoseEvent.patient_id == patient_id,
        )
    ).scalars().first()

    if not dose:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dose event record not found",
        )

    # Never change already taken or skipped doses to snoozed
    if dose.status in (DoseStatusEnum.TAKEN.value, DoseStatusEnum.SKIPPED.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot snooze a dose that is already {dose.status}",
        )

    tz = get_app_timezone()
    action_ts = data.action_timestamp or datetime.now(tz)
    snooze_mins = data.snooze_minutes or 10

    dose.status = DoseStatusEnum.SNOOZED.value
    dose.snoozed_until_timestamp = action_ts + timedelta(minutes=snooze_mins)
    dose.actual_taken_timestamp = None

    if data.notes:
        dose.notes = data.notes
    dose.recorded_by_user_id = user_id

    try:
        db.commit()
        db.refresh(dose)
        logger.info(f"Snoozed dose id={dose_id} until {dose.snoozed_until_timestamp} (+{snooze_mins} min)")
    except Exception as e:
        db.rollback()
        logger.error(f"Error snoozing dose: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to snooze dose",
        )

    return _to_dose_response(dose)


def auto_transition_missed_doses(
    db: Session,
    patient_id: Optional[uuid.UUID] = None,
    reference_datetime: Optional[datetime] = None,
    grace_minutes: int = 60,
) -> int:
    """
    Automatically transitions PENDING and overdue SNOOZED doses to MISSED
    once their scheduled time + grace period has expired without action.
    NEVER modifies TAKEN or SKIPPED doses.
    """
    ref_dt = normalize_reference_datetime(reference_datetime)
    cutoff_time = ref_dt - timedelta(minutes=grace_minutes)

    conditions = [
        MedicationDoseEvent.status.in_([DoseStatusEnum.PENDING.value, DoseStatusEnum.SNOOZED.value]),
        or_(
            and_(
                MedicationDoseEvent.status == DoseStatusEnum.PENDING.value,
                MedicationDoseEvent.scheduled_timestamp <= cutoff_time,
            ),
            and_(
                MedicationDoseEvent.status == DoseStatusEnum.SNOOZED.value,
                MedicationDoseEvent.snoozed_until_timestamp != None,
                MedicationDoseEvent.snoozed_until_timestamp <= cutoff_time,
            ),
        ),
    ]

    if patient_id:
        conditions.append(MedicationDoseEvent.patient_id == patient_id)

    stmt = select(MedicationDoseEvent).where(*conditions)
    overdue_doses = db.execute(stmt).scalars().all()

    count = 0
    for dose in overdue_doses:
        dose.status = DoseStatusEnum.MISSED.value
        count += 1

    if count > 0:
        try:
            db.commit()
            logger.info(f"Auto-transitioned {count} overdue doses to MISSED status.")
        except Exception as e:
            db.rollback()
            logger.error(f"Error auto-transitioning missed doses: {type(e).__name__} - {e}")

    return count


def get_patient_doses(
    db: Session,
    patient_id: uuid.UUID,
    target_date: Optional[date] = None,
    status_filter: Optional[str] = None,
) -> List[DoseEventResponse]:
    """
    Retrieves recorded dose events for the authenticated patient, optionally filtered by date and status.
    Auto-evaluates missed doses first to keep states consistent.
    """
    # Run auto-missed transition pass
    auto_transition_missed_doses(db, patient_id=patient_id)

    tz = get_app_timezone()
    conditions = [MedicationDoseEvent.patient_id == patient_id]

    if target_date:
        start_of_day = datetime.combine(target_date, time.min).replace(tzinfo=tz)
        end_of_day = datetime.combine(target_date, time.max).replace(tzinfo=tz)
        conditions.append(
            and_(
                MedicationDoseEvent.scheduled_timestamp >= start_of_day,
                MedicationDoseEvent.scheduled_timestamp <= end_of_day,
            )
        )

    if status_filter:
        conditions.append(MedicationDoseEvent.status == status_filter.upper())

    stmt = (
        select(MedicationDoseEvent)
        .options(
            joinedload(MedicationDoseEvent.patient_medication).joinedload(PatientMedication.medicine),
            joinedload(MedicationDoseEvent.schedule),
        )
        .where(*conditions)
        .order_by(MedicationDoseEvent.scheduled_timestamp.asc())
    )

    doses = db.execute(stmt).scalars().all()
    return [_to_dose_response(d) for d in doses]


def get_patient_dose_by_id(
    db: Session,
    patient_id: uuid.UUID,
    dose_id: uuid.UUID,
) -> DoseEventResponse:
    """
    Retrieves a single dose event with strict patient ownership check.
    """
    dose = db.execute(
        select(MedicationDoseEvent)
        .options(
            joinedload(MedicationDoseEvent.patient_medication).joinedload(PatientMedication.medicine),
            joinedload(MedicationDoseEvent.schedule),
        )
        .where(
            MedicationDoseEvent.id == dose_id,
            MedicationDoseEvent.patient_id == patient_id,
        )
    ).scalars().first()

    if not dose:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dose event record not found",
        )

    return _to_dose_response(dose)
