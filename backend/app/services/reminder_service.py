from datetime import date

from sqlalchemy.orm import Session

from app.crud import medication_crud
from app.services.medication_service import TIME_LABELS


def get_today_reminders(db: Session, patient_id: int):
    schedules = medication_crud.get_schedules_for_patient(
        db,
        patient_id
    )

    logs = medication_crud.get_today_logs(
        db,
        patient_id,
        date.today()
    )

    taken_ids = {log.schedule_id for log in logs}

    reminders = []

    for schedule in schedules:
        medicine = medication_crud.get_medicine(
            db,
            schedule.medicine_id
        )

        reminders.append({
            "schedule_id": schedule.id,
            "medicine_id": schedule.medicine_id,
            "medicine_name": medicine.name if medicine else "Unknown",
            "dosage": schedule.dosage,
            "time_of_day": schedule.time_of_day,
            "time_label": TIME_LABELS.get(schedule.time_of_day, schedule.time_of_day),
            "notes": schedule.notes,
            "taken": schedule.id in taken_ids,
        })

    reminders.sort(
        key=lambda item: {
            "morning": 0,
            "afternoon": 1,
            "evening": 2,
            "night": 3,
        }.get(item["time_of_day"], 99)
    )

    return reminders
