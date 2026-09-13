import uuid
import logging
from datetime import date, time, datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import select, and_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.medicine import PatientMedication
from app.models.schedule import MedicationSchedule, MedicationDoseEvent
from app.models.notification import Notification
from app.schemas.notification import NotificationType
from app.services.notification_service import create_notification, get_notification_preferences
from app.services.reminder_service import (
    get_app_timezone,
    normalize_reference_datetime,
    is_schedule_eligible_on_date,
    _fetch_active_schedules_for_patient,
)

logger = logging.getLogger("pillsync.notification_generator")

DEFAULT_MISSED_DOSE_GRACE_MINUTES = 60


def generate_due_notifications(
    db: Session,
    patient_id: uuid.UUID,
    reference_datetime: Optional[datetime] = None,
    due_window_hours: int = 4,
) -> List[Notification]:
    """
    Evaluates active medication schedules for the patient and creates MEDICATION_DUE in-app notifications
    for doses that have arrived and fall within the due window.
    Guarantees duplicate prevention per dose event and respects patient notification preferences.
    """
    # Check patient notification preferences
    prefs = get_notification_preferences(db=db, patient_id=patient_id)
    if not prefs.medication_due_enabled:
        return []

    ref_dt = normalize_reference_datetime(reference_datetime)
    tz = ref_dt.tzinfo
    today = ref_dt.date()

    # Bounded window: today's start up to ref_dt (within due_window_hours)
    day_start = datetime.combine(today, time.min).replace(tzinfo=tz)
    window_start = max(day_start, ref_dt - timedelta(hours=due_window_hours))

    schedules = _fetch_active_schedules_for_patient(db, patient_id)
    created_notifications: List[Notification] = []

    for schedule in schedules:
        if not is_schedule_eligible_on_date(schedule, today):
            continue

        med = schedule.patient_medication
        med_name = med.custom_medicine_name or (med.medicine.name if med.medicine else "Medication")

        for time_slot in schedule.schedule_times:
            dose_dt = datetime.combine(today, time_slot.scheduled_time).replace(tzinfo=tz)

            # Check if scheduled time has arrived within the active due window
            if window_start <= dose_dt <= ref_dt:
                # Find or create persistent MedicationDoseEvent for this occurrence
                existing_dose = db.execute(
                    select(MedicationDoseEvent).where(
                        MedicationDoseEvent.schedule_id == schedule.id,
                        MedicationDoseEvent.scheduled_timestamp == dose_dt,
                    )
                ).scalar_one_or_none()

                if existing_dose:
                    # If dose is already TAKEN or SKIPPED, skip due notification
                    if existing_dose.status in ("TAKEN", "SKIPPED"):
                        continue
                    dose_event = existing_dose
                else:
                    # Create persistent dose event in PENDING status
                    dose_event = MedicationDoseEvent(
                        patient_id=patient_id,
                        patient_medication_id=med.id,
                        schedule_id=schedule.id,
                        scheduled_timestamp=dose_dt,
                        status="PENDING",
                        dose_quantity_taken=None,
                        actual_taken_timestamp=None,
                    )
                    db.add(dose_event)
                    db.commit()
                    db.refresh(dose_event)

                # Check if notification already exists before attempting creation
                existing_notif = db.execute(
                    select(Notification).where(
                        Notification.related_dose_event_id == dose_event.id,
                        Notification.type == NotificationType.MEDICATION_DUE.value,
                    )
                ).scalar_one_or_none()

                if not existing_notif:
                    notif = create_notification(
                        db=db,
                        patient_id=patient_id,
                        notification_type=NotificationType.MEDICATION_DUE,
                        title="Medication Due",
                        message=f"Your {med_name} dose is due now.",
                        related_dose_event_id=dose_event.id,
                        related_medicine_id=med.id,
                    )
                    created_notifications.append(notif)

    return created_notifications


def generate_missed_notifications(
    db: Session,
    patient_id: uuid.UUID,
    reference_datetime: Optional[datetime] = None,
    grace_minutes: int = DEFAULT_MISSED_DOSE_GRACE_MINUTES,
    lookback_hours: int = 24,
) -> List[Notification]:
    """
    Evaluates PENDING dose events whose scheduled time + grace period has elapsed,
    and generates MISSED_DOSE in-app notifications.
    DOES NOT change the dose status (status remains PENDING).
    Guarantees duplicate prevention per dose event and respects patient notification preferences.
    """
    # Check patient notification preferences
    prefs = get_notification_preferences(db=db, patient_id=patient_id)
    if not prefs.missed_dose_enabled:
        return []

    ref_dt = normalize_reference_datetime(reference_datetime)
    cutoff_time = ref_dt - timedelta(minutes=grace_minutes)
    window_start = ref_dt - timedelta(hours=lookback_hours)

    # Query pending dose events within the lookback window that have passed the grace cutoff
    stmt = (
        select(MedicationDoseEvent)
        .join(MedicationDoseEvent.schedule)
        .join(MedicationDoseEvent.patient_medication)
        .options(
            joinedload(MedicationDoseEvent.patient_medication).joinedload(PatientMedication.medicine),
            joinedload(MedicationDoseEvent.schedule),
        )
        .where(
            MedicationDoseEvent.patient_id == patient_id,
            MedicationDoseEvent.status == "PENDING",
            MedicationDoseEvent.scheduled_timestamp >= window_start,
            MedicationDoseEvent.scheduled_timestamp <= cutoff_time,
            MedicationSchedule.is_active == True,
            PatientMedication.is_active == True,
        )
    )
    overdue_doses = db.execute(stmt).scalars().all()
    created_notifications: List[Notification] = []

    for dose in overdue_doses:
        med = dose.patient_medication
        med_name = med.custom_medicine_name or (med.medicine.name if med and med.medicine else "Medication")

        # Check if MISSED_DOSE notification already exists
        existing_notif = db.execute(
            select(Notification).where(
                Notification.related_dose_event_id == dose.id,
                Notification.type == NotificationType.MISSED_DOSE.value,
            )
        ).scalar_one_or_none()

        if not existing_notif:
            notif = create_notification(
                db=db,
                patient_id=patient_id,
                notification_type=NotificationType.MISSED_DOSE,
                title="Missed Dose",
                message=f"You missed your scheduled dose for {med_name}.",
                related_dose_event_id=dose.id,
                related_medicine_id=dose.patient_medication_id,
            )
            created_notifications.append(notif)

    return created_notifications


def generate_patient_notifications(
    db: Session,
    patient_id: uuid.UUID,
    reference_datetime: Optional[datetime] = None,
    grace_minutes: int = DEFAULT_MISSED_DOSE_GRACE_MINUTES,
) -> Dict[str, Any]:
    """
    Runs both DUE and MISSED notification generation passes for a patient.
    Returns counts of generated notifications.
    """
    due_notifs = generate_due_notifications(
        db=db,
        patient_id=patient_id,
        reference_datetime=reference_datetime,
    )
    missed_notifs = generate_missed_notifications(
        db=db,
        patient_id=patient_id,
        reference_datetime=reference_datetime,
        grace_minutes=grace_minutes,
    )

    return {
        "due_notifications_created": len(due_notifs),
        "missed_notifications_created": len(missed_notifs),
        "total_created": len(due_notifs) + len(missed_notifs),
    }
