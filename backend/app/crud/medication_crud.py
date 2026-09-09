from sqlalchemy.orm import Session

from app.models.medicine import Medicine
from app.models.medication_log import MedicationLog
from app.models.medication_schedule import MedicationSchedule


def get_schedules_for_patient(
    db: Session,
    patient_id: int
):
    return (
        db.query(MedicationSchedule)
        .filter(
            MedicationSchedule.patient_id == patient_id,
            MedicationSchedule.is_active == True  # noqa: E712
        )
        .all()
    )


def create_schedule(
    db: Session,
    patient_id: int,
    medicine_id: int,
    dosage: str,
    time_of_day: str,
    notes: str
):
    schedule = MedicationSchedule(
        patient_id=patient_id,
        medicine_id=medicine_id,
        dosage=dosage,
        time_of_day=time_of_day,
        notes=notes,
        is_active=True
    )

    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    return schedule


def get_log_for_today(
    db: Session,
    schedule_id: int,
    patient_id: int,
    log_date
):
    return (
        db.query(MedicationLog)
        .filter(
            MedicationLog.schedule_id == schedule_id,
            MedicationLog.patient_id == patient_id,
            MedicationLog.log_date == log_date
        )
        .first()
    )


def create_log(
    db: Session,
    schedule_id: int,
    patient_id: int,
    log_date,
    time_of_day: str
):
    log = MedicationLog(
        schedule_id=schedule_id,
        patient_id=patient_id,
        taken=True,
        log_date=log_date,
        time_of_day=time_of_day
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    return log


def get_today_logs(
    db: Session,
    patient_id: int,
    log_date
):
    return (
        db.query(MedicationLog)
        .filter(
            MedicationLog.patient_id == patient_id,
            MedicationLog.log_date == log_date,
            MedicationLog.taken == True  # noqa: E712
        )
        .all()
    )


def get_medicine(
    db: Session,
    medicine_id: int
):
    return (
        db.query(Medicine)
        .filter(Medicine.id == medicine_id)
        .first()
    )
