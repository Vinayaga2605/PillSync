import os
import uuid
import logging
from datetime import date, time, datetime, timedelta
from typing import List, Optional, Dict, Any, Set
from sqlalchemy import select, and_, distinct
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.user import PatientProfile
from app.models.medicine import PatientMedication
from app.models.schedule import MedicationSchedule, MedicationScheduleTime, MedicationDoseEvent
from app.models.notification import Notification
from app.schemas.notification import NotificationType
from app.services.notification_service import create_notification, get_notification_preferences
from app.services.reminder_service import (
    get_app_timezone,
    normalize_reference_datetime,
    is_schedule_eligible_on_date,
    _fetch_active_schedules_for_patient,
)

logger = logging.getLogger("pillsync.notification_engine")

# Configurable time windows with defaults
DEFAULT_UPCOMING_MINUTES = int(os.getenv("NOTIFICATION_UPCOMING_MINUTES", "30"))
DEFAULT_MISSED_AFTER_MINUTES = int(os.getenv("NOTIFICATION_MISSED_AFTER_MINUTES", "60"))
DEFAULT_DUE_WINDOW_HOURS = int(os.getenv("NOTIFICATION_DUE_WINDOW_HOURS", "4"))


def _format_time_display(dt: datetime) -> str:
    """Formats a datetime into a friendly 12-hour string (e.g. '08:00 AM')."""
    return dt.strftime("%I:%M %p").lstrip("0")


def _get_or_create_dose_event(
    db: Session,
    patient_id: uuid.UUID,
    patient_medication_id: uuid.UUID,
    schedule_id: uuid.UUID,
    scheduled_timestamp: datetime,
) -> MedicationDoseEvent:
    """
    Safely finds or creates a persistent MedicationDoseEvent occurrence.
    Respects the unique constraint (schedule_id, scheduled_timestamp).
    """
    existing_dose = db.execute(
        select(MedicationDoseEvent).where(
            MedicationDoseEvent.schedule_id == schedule_id,
            MedicationDoseEvent.scheduled_timestamp == scheduled_timestamp,
        )
    ).scalar_one_or_none()

    if existing_dose:
        return existing_dose

    try:
        dose_event = MedicationDoseEvent(
            patient_id=patient_id,
            patient_medication_id=patient_medication_id,
            schedule_id=schedule_id,
            scheduled_timestamp=scheduled_timestamp,
            status="PENDING",
            dose_quantity_taken=None,
            actual_taken_timestamp=None,
        )
        db.add(dose_event)
        db.commit()
        db.refresh(dose_event)
        return dose_event
    except Exception as e:
        db.rollback()
        # In case of concurrent creation race, fetch existing
        fallback_dose = db.execute(
            select(MedicationDoseEvent).where(
                MedicationDoseEvent.schedule_id == schedule_id,
                MedicationDoseEvent.scheduled_timestamp == scheduled_timestamp,
            )
        ).scalar_one_or_none()
        if fallback_dose:
            return fallback_dose
        raise e


def process_patient_notifications(
    db: Session,
    patient_id: uuid.UUID,
    reference_datetime: Optional[datetime] = None,
    upcoming_minutes: int = DEFAULT_UPCOMING_MINUTES,
    missed_after_minutes: int = DEFAULT_MISSED_AFTER_MINUTES,
    due_window_hours: int = DEFAULT_DUE_WINDOW_HOURS,
) -> Dict[str, int]:
    """
    Evaluates active schedules for a single patient and creates UPCOMING, DUE, and MISSED notifications.
    Guarantees idempotency and respects patient notification preferences.
    """
    ref_dt = normalize_reference_datetime(reference_datetime)
    tz = ref_dt.tzinfo
    today = ref_dt.date()

    prefs = get_notification_preferences(db=db, patient_id=patient_id)
    schedules = _fetch_active_schedules_for_patient(db, patient_id)

    processed_doses_set: Set[uuid.UUID] = set()
    upcoming_created = 0
    due_created = 0
    missed_created = 0

    # Evaluate candidate dates: yesterday, today, tomorrow to cover windows
    candidate_dates = [today - timedelta(days=1), today, today + timedelta(days=1)]

    for schedule in schedules:
        med = schedule.patient_medication
        med_name = med.custom_medicine_name or (med.medicine.name if med.medicine else "Medication")

        for c_date in candidate_dates:
            if not is_schedule_eligible_on_date(schedule, c_date):
                continue

            for time_slot in schedule.schedule_times:
                dose_dt = datetime.combine(c_date, time_slot.scheduled_time).replace(tzinfo=tz)

                # Window boundaries
                lookback_cutoff = ref_dt - timedelta(hours=24)
                future_cutoff = ref_dt + timedelta(minutes=upcoming_minutes + 15)

                if not (lookback_cutoff <= dose_dt <= future_cutoff):
                    continue

                # Ensure persistent dose event exists
                dose_event = _get_or_create_dose_event(
                    db=db,
                    patient_id=patient_id,
                    patient_medication_id=med.id,
                    schedule_id=schedule.id,
                    scheduled_timestamp=dose_dt,
                )
                processed_doses_set.add(dose_event.id)

                # 1. UPCOMING NOTIFICATIONS
                # Eligible if: dose in future (ref_dt < dose_dt <= ref_dt + upcoming_minutes) and status PENDING
                if (
                    prefs.medication_upcoming_enabled
                    and dose_event.status == "PENDING"
                    and ref_dt < dose_dt <= ref_dt + timedelta(minutes=upcoming_minutes)
                ):
                    existing_upcoming = db.execute(
                        select(Notification).where(
                            Notification.related_dose_event_id == dose_event.id,
                            Notification.type == NotificationType.MEDICATION_UPCOMING.value,
                        )
                    ).scalar_one_or_none()

                    if not existing_upcoming:
                        time_str = _format_time_display(dose_dt)
                        create_notification(
                            db=db,
                            patient_id=patient_id,
                            notification_type=NotificationType.MEDICATION_UPCOMING,
                            title="Medication Upcoming",
                            message=f"{med_name} is scheduled at {time_str}.",
                            related_dose_event_id=dose_event.id,
                            related_medicine_id=med.id,
                        )
                        upcoming_created += 1

                # 2. DUE NOTIFICATIONS
                # Eligible if: dose time arrived (dose_dt <= ref_dt), within due window, and status PENDING
                if (
                    prefs.medication_due_enabled
                    and dose_event.status == "PENDING"
                    and (ref_dt - timedelta(hours=due_window_hours)) <= dose_dt <= ref_dt
                ):
                    existing_due = db.execute(
                        select(Notification).where(
                            Notification.related_dose_event_id == dose_event.id,
                            Notification.type == NotificationType.MEDICATION_DUE.value,
                        )
                    ).scalar_one_or_none()

                    if not existing_due:
                        create_notification(
                            db=db,
                            patient_id=patient_id,
                            notification_type=NotificationType.MEDICATION_DUE,
                            title="Medication Due",
                            message=f"It's time to take {med_name}.",
                            related_dose_event_id=dose_event.id,
                            related_medicine_id=med.id,
                        )
                        due_created += 1

                # 3. MISSED DOSE NOTIFICATIONS
                # Eligible if: dose passed grace window (dose_dt + missed_after_minutes <= ref_dt), within 24h, and status PENDING
                if (
                    prefs.missed_dose_enabled
                    and dose_event.status == "PENDING"
                    and (lookback_cutoff <= dose_dt)
                    and (dose_dt + timedelta(minutes=missed_after_minutes) <= ref_dt)
                ):
                    existing_missed = db.execute(
                        select(Notification).where(
                            Notification.related_dose_event_id == dose_event.id,
                            Notification.type == NotificationType.MISSED_DOSE.value,
                        )
                    ).scalar_one_or_none()

                    if not existing_missed:
                        create_notification(
                            db=db,
                            patient_id=patient_id,
                            notification_type=NotificationType.MISSED_DOSE,
                            title="Missed Medication",
                            message=f"You missed your scheduled dose of {med_name}.",
                            related_dose_event_id=dose_event.id,
                            related_medicine_id=med.id,
                        )
                        missed_created += 1

    return {
        "processed_doses": len(processed_doses_set),
        "upcoming_created": upcoming_created,
        "due_created": due_created,
        "missed_created": missed_created,
    }


def run_notification_engine(
    db: Session,
    reference_datetime: Optional[datetime] = None,
    patient_id: Optional[uuid.UUID] = None,
    upcoming_minutes: int = DEFAULT_UPCOMING_MINUTES,
    missed_after_minutes: int = DEFAULT_MISSED_AFTER_MINUTES,
    due_window_hours: int = DEFAULT_DUE_WINDOW_HOURS,
) -> Dict[str, Any]:
    """
    Main entry point for automatic notification engine execution.
    Can process a single patient or all active patients globally.
    """
    if patient_id:
        patient_ids = [patient_id]
    else:
        # Discover all patients who have active medication schedules
        stmt = (
            select(distinct(PatientMedication.patient_id))
            .join(MedicationSchedule, MedicationSchedule.patient_medication_id == PatientMedication.id)
            .where(
                PatientMedication.is_active == True,
                MedicationSchedule.is_active == True,
            )
        )
        patient_ids = [row[0] for row in db.execute(stmt).all()]

    total_processed = 0
    total_upcoming = 0
    total_due = 0
    total_missed = 0

    for pid in patient_ids:
        res = process_patient_notifications(
            db=db,
            patient_id=pid,
            reference_datetime=reference_datetime,
            upcoming_minutes=upcoming_minutes,
            missed_after_minutes=missed_after_minutes,
            due_window_hours=due_window_hours,
        )
        total_processed += res["processed_doses"]
        total_upcoming += res["upcoming_created"]
        total_due += res["due_created"]
        total_missed += res["missed_created"]

    total_created = total_upcoming + total_due + total_missed
    logger.info(
        f"Notification engine run completed: processed={total_processed}, "
        f"upcoming={total_upcoming}, due={total_due}, missed={total_missed}, total={total_created}"
    )

    return {
        "processed_doses": total_processed,
        "upcoming_created": total_upcoming,
        "due_created": total_due,
        "missed_created": total_missed,
        "total_notifications_created": total_created,
    }
