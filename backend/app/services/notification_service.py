from datetime import date
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.crud import notification_crud
from app.crud import medication_crud
from app.crud import module7_crud
from app.models.notification import Notification
from app.services.medication_service import TIME_WINDOW_END
from app.services.medication_service import TIME_LABELS


def _already_sent(
    db: Session,
    user_id: int,
    message: str
):
    return (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.message == message,
            func.date(Notification.created_at) == date.today(),
        )
        .first()
        is not None
    )


def check_missed_doses(
    db: Session,
    caregiver_id: int
):
    from app.crud.patient_crud import get_caregiver_patients

    patients = get_caregiver_patients(db, caregiver_id)

    now_hour = datetime.now().hour
    today = date.today()

    created = []

    for patient in patients:
        schedules = medication_crud.get_schedules_for_patient(
            db,
            patient.id
        )

        taken_logs = medication_crud.get_today_logs(
            db,
            patient.id,
            today
        )

        taken_ids = {log.schedule_id for log in taken_logs}

        for schedule in schedules:
            window_end = TIME_WINDOW_END.get(schedule.time_of_day)

            if window_end is None or schedule.id in taken_ids:
                continue

            if now_hour >= window_end:
                medicine = medication_crud.get_medicine(
                    db,
                    schedule.medicine_id
                )
                time_label = TIME_LABELS.get(schedule.time_of_day, schedule.time_of_day)
                medicine_name = medicine.name if medicine else "medicine"

                caregiver_message = (
                    f"Missed dose: {patient.full_name} did not mark "
                    f"{medicine_name} ({schedule.dosage}) for {time_label}"
                )

                if not _already_sent(db, caregiver_id, caregiver_message):
                    notification_crud.create_notification(
                        db,
                        user_id=caregiver_id,
                        patient_id=patient.id,
                        type="missed_dose",
                        message=caregiver_message
                    )
                    module7_crud.log_notification(
                        db,
                        user_id=caregiver_id,
                        channel="push",
                        type="missed_dose",
                        message=caregiver_message,
                    )
                    created.append(caregiver_message)

                patient_message = (
                    f"You missed your {medicine_name} ({schedule.dosage}) "
                    f"dose for {time_label}. Please take it now."
                )

                if not _already_sent(db, patient.id, patient_message):
                    notification_crud.create_notification(
                        db,
                        user_id=patient.id,
                        patient_id=patient.id,
                        type="missed_dose",
                        message=patient_message
                    )
                    module7_crud.log_notification(
                        db,
                        user_id=patient.id,
                        channel="push",
                        type="missed_dose",
                        message=patient_message,
                    )

    return created
