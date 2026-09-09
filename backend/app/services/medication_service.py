from datetime import date

from fastapi import HTTPException
from fastapi import status

from sqlalchemy.orm import Session

from app.crud import medication_crud


TIME_WINDOW_END = {
    "morning": 12,
    "afternoon": 17,
    "evening": 21,
    "night": 24,
}

TIME_LABELS = {
    "morning": "Morning",
    "afternoon": "Afternoon",
    "evening": "Evening",
    "night": "Night",
}

ORDER = ["morning", "afternoon", "evening", "night"]
TIME_SLOTS = ["morning", "afternoon", "evening", "night"]


def get_patient_schedule(
    db: Session,
    patient_id: int
):
    schedules = medication_crud.get_schedules_for_patient(
        db,
        patient_id
    )

    logs = medication_crud.get_today_logs(
        db,
        patient_id,
        date.today()
    )

    taken_schedule_ids = {log.schedule_id for log in logs}

    result = []

    for schedule in schedules:
        medicine = medication_crud.get_medicine(
            db,
            schedule.medicine_id
        )

        result.append({
            "id": schedule.id,
            "patient_id": schedule.patient_id,
            "medicine_id": schedule.medicine_id,
            "medicine_name": medicine.name if medicine else "Unknown",
            "medicine_brand": medicine.brand if medicine else "",
            "dosage": schedule.dosage,
            "time_of_day": schedule.time_of_day,
            "time_label": TIME_LABELS.get(schedule.time_of_day, schedule.time_of_day),
            "notes": schedule.notes,
            "is_active": schedule.is_active,
            "taken": schedule.id in taken_schedule_ids,
        })

    result.sort(
        key=lambda item: ORDER.index(item["time_of_day"])
        if item["time_of_day"] in ORDER
        else 99
    )

    return result


def add_schedule(
    db: Session,
    patient_id: int,
    medicine_id: int,
    dosage: str,
    time_of_day: str,
    notes: str
):
    if time_of_day not in TIME_LABELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="time_of_day must be one of: morning, afternoon, evening, night"
        )

    medicine = medication_crud.get_medicine(db, medicine_id)

    if medicine is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )

    return medication_crud.create_schedule(
        db,
        patient_id=patient_id,
        medicine_id=medicine_id,
        dosage=dosage,
        time_of_day=time_of_day,
        notes=notes
    )


def take_medicine(
    db: Session,
    schedule_id: int,
    patient_id: int
):
    schedule = (
        db.query(medication_crud.MedicationSchedule)
        .filter(medication_crud.MedicationSchedule.id == schedule_id)
        .first()
    )

    if schedule is None or schedule.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication schedule not found"
        )

    today = date.today()

    existing = medication_crud.get_log_for_today(
        db,
        schedule_id,
        patient_id,
        today
    )

    if existing:
        medicine = medication_crud.get_medicine(db, schedule.medicine_id)
        return {
            "schedule_id": schedule_id,
            "medicine_name": medicine.name if medicine else "Unknown",
            "time_of_day": schedule.time_of_day,
            "taken": True,
            "message": "Already marked as taken",
        }

    medication_crud.create_log(
        db,
        schedule_id=schedule_id,
        patient_id=patient_id,
        log_date=today,
        time_of_day=schedule.time_of_day
    )

    medicine = medication_crud.get_medicine(db, schedule.medicine_id)

    return {
        "schedule_id": schedule_id,
        "medicine_name": medicine.name if medicine else "Unknown",
        "time_of_day": schedule.time_of_day,
        "taken": True,
        "message": "Marked as taken",
    }
