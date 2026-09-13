import uuid
import logging
from typing import List
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException, status

from app.models.medicine import PatientMedication
from app.models.schedule import MedicationSchedule, MedicationScheduleTime
from app.schemas.schedule import (
    MedicationScheduleCreate,
    MedicationScheduleUpdate,
    MedicationScheduleResponse,
    ScheduleFrequencyType,
)

logger = logging.getLogger("pillsync.schedule")


def _verify_patient_medication(
    db: Session, patient_id: uuid.UUID, medicine_id: uuid.UUID
) -> PatientMedication:
    """
    Verifies that the PatientMedication exists and belongs strictly to the authenticated patient.
    Returns the PatientMedication or raises HTTP 404.
    """
    med = db.execute(
        select(PatientMedication).where(
            PatientMedication.id == medicine_id,
            PatientMedication.patient_id == patient_id,
        )
    ).scalars().first()

    if not med:
        logger.warning(
            f"Unauthorized access or non-existent medicine: patient_id={patient_id}, medicine_id={medicine_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine record not found",
        )
    return med


def create_medication_schedule(
    db: Session,
    patient_id: uuid.UUID,
    medicine_id: uuid.UUID,
    data: MedicationScheduleCreate,
) -> MedicationScheduleResponse:
    """
    Creates a new medication schedule with normalized scheduled times for an authenticated patient's medicine.
    """
    med = _verify_patient_medication(db, patient_id, medicine_id)

    schedule = MedicationSchedule(
        patient_medication_id=med.id,
        frequency_type=data.frequency_type.value if hasattr(data.frequency_type, "value") else str(data.frequency_type),
        dose_quantity=data.dose_quantity,
        dosage_unit=data.dosage_unit or med.dosage_unit,
        days_of_week=data.days_of_week,
        interval_days=data.interval_days,
        start_date=data.start_date,
        end_date=data.end_date,
        instructions=data.instructions or med.instructions,
        is_active=data.is_active,
    )

    db.add(schedule)
    db.flush()

    for time_entry in data.times:
        time_obj = MedicationScheduleTime(
            schedule_id=schedule.id,
            scheduled_time=time_entry.scheduled_time,
            time_of_day_type=time_entry.time_of_day_type.value if hasattr(time_entry.time_of_day_type, "value") else time_entry.time_of_day_type,
            dose_quantity=time_entry.dose_quantity,
        )
        db.add(time_obj)

    try:
        db.commit()
        db.refresh(schedule)
        logger.info(
            f"Created schedule id={schedule.id} for medicine_id={medicine_id}, patient_id={patient_id}"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating medication schedule: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save medication schedule",
        )

    # Reload with eagerly loaded times
    result = db.execute(
        select(MedicationSchedule)
        .options(selectinload(MedicationSchedule.schedule_times))
        .where(MedicationSchedule.id == schedule.id)
    ).scalar_one()

    return MedicationScheduleResponse.model_validate(result)


def get_medication_schedules(
    db: Session,
    patient_id: uuid.UUID,
    medicine_id: uuid.UUID,
) -> List[MedicationScheduleResponse]:
    """
    Lists all medication schedules belonging to a patient's medicine.
    """
    _verify_patient_medication(db, patient_id, medicine_id)

    schedules = db.execute(
        select(MedicationSchedule)
        .options(selectinload(MedicationSchedule.schedule_times))
        .where(MedicationSchedule.patient_medication_id == medicine_id)
        .order_by(MedicationSchedule.created_at.desc())
    ).scalars().all()

    return [MedicationScheduleResponse.model_validate(s) for s in schedules]


def get_medication_schedule_by_id(
    db: Session,
    patient_id: uuid.UUID,
    medicine_id: uuid.UUID,
    schedule_id: uuid.UUID,
) -> MedicationScheduleResponse:
    """
    Retrieves a single medication schedule with strict patient and medicine ownership validation.
    """
    _verify_patient_medication(db, patient_id, medicine_id)

    schedule = db.execute(
        select(MedicationSchedule)
        .options(selectinload(MedicationSchedule.schedule_times))
        .where(
            MedicationSchedule.id == schedule_id,
            MedicationSchedule.patient_medication_id == medicine_id,
        )
    ).scalars().first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication schedule not found",
        )

    return MedicationScheduleResponse.model_validate(schedule)


def update_medication_schedule(
    db: Session,
    patient_id: uuid.UUID,
    medicine_id: uuid.UUID,
    schedule_id: uuid.UUID,
    data: MedicationScheduleUpdate,
) -> MedicationScheduleResponse:
    """
    Partially updates an existing medication schedule with strict ownership validation.
    """
    _verify_patient_medication(db, patient_id, medicine_id)

    schedule = db.execute(
        select(MedicationSchedule)
        .options(selectinload(MedicationSchedule.schedule_times))
        .where(
            MedicationSchedule.id == schedule_id,
            MedicationSchedule.patient_medication_id == medicine_id,
        )
    ).scalars().first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication schedule not found",
        )

    update_dict = data.model_dump(exclude_unset=True)

    # Validate composite dates
    new_start = update_dict.get("start_date") or schedule.start_date
    new_end = update_dict["end_date"] if "end_date" in update_dict else schedule.end_date
    if new_end and new_start and new_end < new_start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="End date cannot be earlier than start date",
        )

    # Direct field updates
    if "frequency_type" in update_dict and update_dict["frequency_type"] is not None:
        val = update_dict["frequency_type"]
        schedule.frequency_type = val.value if hasattr(val, "value") else str(val)
    if "dose_quantity" in update_dict and update_dict["dose_quantity"] is not None:
        schedule.dose_quantity = update_dict["dose_quantity"]
    if "dosage_unit" in update_dict:
        schedule.dosage_unit = update_dict["dosage_unit"]
    if "days_of_week" in update_dict:
        schedule.days_of_week = update_dict["days_of_week"]
    if "interval_days" in update_dict:
        schedule.interval_days = update_dict["interval_days"]
    if "start_date" in update_dict and update_dict["start_date"] is not None:
        schedule.start_date = update_dict["start_date"]
    if "end_date" in update_dict:
        schedule.end_date = update_dict["end_date"]
    if "instructions" in update_dict:
        schedule.instructions = update_dict["instructions"]
    if "is_active" in update_dict and update_dict["is_active"] is not None:
        schedule.is_active = update_dict["is_active"]

    # If times were provided, replace scheduled times
    if "times" in update_dict and update_dict["times"] is not None:
        times_list = data.times or []
        freq = schedule.frequency_type
        if freq != ScheduleFrequencyType.AS_NEEDED.value and len(times_list) == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"At least one scheduled dose time is required for frequency '{freq}'",
            )

        # Clear existing times and add new ones
        schedule.schedule_times.clear()
        for t in times_list:
            new_time_obj = MedicationScheduleTime(
                schedule_id=schedule.id,
                scheduled_time=t.scheduled_time,
                time_of_day_type=t.time_of_day_type.value if hasattr(t.time_of_day_type, "value") else t.time_of_day_type,
                dose_quantity=t.dose_quantity,
            )
            schedule.schedule_times.append(new_time_obj)

    try:
        db.commit()
        db.refresh(schedule)
        logger.info(f"Updated schedule id={schedule_id} for patient_id={patient_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating medication schedule: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update medication schedule",
        )

    # Reload with refreshed times
    result = db.execute(
        select(MedicationSchedule)
        .options(selectinload(MedicationSchedule.schedule_times))
        .where(MedicationSchedule.id == schedule.id)
    ).scalar_one()

    return MedicationScheduleResponse.model_validate(result)


def delete_medication_schedule(
    db: Session,
    patient_id: uuid.UUID,
    medicine_id: uuid.UUID,
    schedule_id: uuid.UUID,
) -> None:
    """
    Deletes a medication schedule and associated schedule times with strict ownership validation.
    """
    _verify_patient_medication(db, patient_id, medicine_id)

    schedule = db.execute(
        select(MedicationSchedule).where(
            MedicationSchedule.id == schedule_id,
            MedicationSchedule.patient_medication_id == medicine_id,
        )
    ).scalars().first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication schedule not found",
        )

    try:
        db.delete(schedule)
        db.commit()
        logger.info(
            f"Deleted schedule id={schedule_id} for medicine_id={medicine_id}, patient_id={patient_id}"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting medication schedule: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete medication schedule",
        )
