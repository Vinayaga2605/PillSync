import os
import uuid
import logging
from datetime import date, time, datetime, timedelta
from typing import List, Optional
from zoneinfo import ZoneInfo
from sqlalchemy import select, and_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.medicine import PatientMedication
from app.models.schedule import MedicationSchedule, MedicationScheduleTime, MedicationDoseEvent
from app.schemas.reminder import (
    MedicationDoseEventStatus,
    DueMedicationEventResponse,
    UpcomingMedicationEventResponse,
    TodayMedicationReminder,
    ReminderSummaryResponse,
    compute_time_of_day,
)

logger = logging.getLogger("pillsync.reminder")

DEFAULT_TIMEZONE_NAME = os.getenv("APP_TIMEZONE", "Asia/Kolkata")


def get_app_timezone() -> ZoneInfo:
    """
    Returns the standard application timezone (defaults to Asia/Kolkata, UTC+5:30).
    """
    try:
        return ZoneInfo(DEFAULT_TIMEZONE_NAME)
    except Exception:
        return ZoneInfo("UTC")


def normalize_reference_datetime(dt: Optional[datetime] = None) -> datetime:
    """
    Ensures the reference datetime is timezone-aware in the application timezone.
    """
    tz = get_app_timezone()
    if dt is None:
        return datetime.now(tz)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=tz)
    return dt.astimezone(tz)


def is_schedule_eligible_on_date(schedule: MedicationSchedule, target_date: date) -> bool:
    """
    Determines whether a medication schedule should generate dose events on a specific date
    based on start_date, end_date, active status, and frequency recurrence rules.
    """
    if not schedule.is_active:
        return False
    if schedule.patient_medication and not schedule.patient_medication.is_active:
        return False

    # Date boundary checks
    if target_date < schedule.start_date:
        return False
    if schedule.end_date and target_date > schedule.end_date:
        return False

    freq = schedule.frequency_type
    if freq == "DAILY":
        return True

    if freq in ("WEEKLY", "SPECIFIC_DAYS"):
        iso_weekday = target_date.isoweekday()  # 1=Monday ... 7=Sunday
        return bool(schedule.days_of_week and iso_weekday in schedule.days_of_week)

    if freq == "INTERVAL_DAYS":
        interval = schedule.interval_days or 1
        diff_days = (target_date - schedule.start_date).days
        return diff_days >= 0 and (diff_days % interval == 0)

    if freq == "AS_NEEDED":
        return False

    if freq == "CUSTOM":
        if schedule.days_of_week:
            return target_date.isoweekday() in schedule.days_of_week
        return True

    return False


def _fetch_active_schedules_for_patient(db: Session, patient_id: uuid.UUID) -> List[MedicationSchedule]:
    """
    Efficiently queries all active schedules and parent patient medications for the authenticated patient.
    """
    stmt = (
        select(MedicationSchedule)
        .join(MedicationSchedule.patient_medication)
        .options(
            joinedload(MedicationSchedule.patient_medication).joinedload(PatientMedication.medicine),
            selectinload(MedicationSchedule.schedule_times),
        )
        .where(
            PatientMedication.patient_id == patient_id,
            PatientMedication.is_active == True,
            MedicationSchedule.is_active == True,
        )
    )
    return db.execute(stmt).scalars().all()


def get_due_doses(
    db: Session,
    patient_id: uuid.UUID,
    reference_datetime: Optional[datetime] = None,
    due_window_hours: int = 4,
) -> List[DueMedicationEventResponse]:
    """
    Calculates medication doses that are currently DUE for the authenticated patient.
    Excludes doses already marked TAKEN or SKIPPED.
    Considers SNOOZED doses due once their snooze timestamp has elapsed.
    """
    ref_dt = normalize_reference_datetime(reference_datetime)
    tz = ref_dt.tzinfo
    today = ref_dt.date()

    day_start = datetime.combine(today, time.min).replace(tzinfo=tz)
    window_start = max(day_start, ref_dt - timedelta(hours=due_window_hours))

    schedules = _fetch_active_schedules_for_patient(db, patient_id)
    due_events: List[DueMedicationEventResponse] = []

    for schedule in schedules:
        if not is_schedule_eligible_on_date(schedule, today):
            continue

        med = schedule.patient_medication
        med_name = med.custom_medicine_name or (med.medicine.name if med.medicine else "Medication")
        generic_name = med.medicine.generic_name if med.medicine else None

        for time_slot in schedule.schedule_times:
            dose_dt = datetime.combine(today, time_slot.scheduled_time).replace(tzinfo=tz)

            # Check persistent dose event
            dose_record = db.execute(
                select(MedicationDoseEvent).where(
                    MedicationDoseEvent.schedule_id == schedule.id,
                    MedicationDoseEvent.scheduled_timestamp == dose_dt,
                )
            ).scalar_one_or_none()

            # Skip if already TAKEN or SKIPPED
            if dose_record and dose_record.status in ("TAKEN", "SKIPPED"):
                continue

            is_due = False
            snoozed_until = None

            if dose_record and dose_record.status == "SNOOZED":
                snoozed_until = dose_record.snoozed_until_timestamp
                # If snoozed, becomes due once snooze time is reached
                if snoozed_until and snoozed_until <= ref_dt:
                    is_due = True
            elif window_start <= dose_dt <= ref_dt:
                is_due = True

            if is_due:
                effective_dose = time_slot.dose_quantity or schedule.dose_quantity
                effective_unit = schedule.dosage_unit or med.dosage_unit
                effective_instructions = schedule.instructions or med.instructions
                tod = compute_time_of_day(time_slot.scheduled_time, time_slot.time_of_day_type)

                due_events.append(
                    DueMedicationEventResponse(
                        dose_event_id=dose_record.id if dose_record else None,
                        medicine_id=med.id,
                        medicine_name=med_name,
                        generic_name=generic_name,
                        schedule_id=schedule.id,
                        frequency_type=schedule.frequency_type,
                        dose_quantity=effective_dose,
                        dosage_unit=effective_unit,
                        scheduled_time=time_slot.scheduled_time,
                        time_of_day_type=tod,
                        due_at=dose_dt,
                        instructions=effective_instructions,
                        status=MedicationDoseEventStatus.DUE.value,
                        snoozed_until=snoozed_until,
                    )
                )

    due_events.sort(key=lambda x: (x.due_at, x.medicine_name))
    return due_events


def get_upcoming_doses(
    db: Session,
    patient_id: uuid.UUID,
    reference_datetime: Optional[datetime] = None,
    hours_ahead: int = 24,
) -> List[UpcomingMedicationEventResponse]:
    """
    Calculates upcoming medication doses for the authenticated patient within the next `hours_ahead` window.
    Excludes doses already TAKEN or SKIPPED.
    """
    ref_dt = normalize_reference_datetime(reference_datetime)
    tz = ref_dt.tzinfo
    window_end = ref_dt + timedelta(hours=hours_ahead)

    schedules = _fetch_active_schedules_for_patient(db, patient_id)
    upcoming_events: List[UpcomingMedicationEventResponse] = []

    curr_date = ref_dt.date()
    end_date = window_end.date()

    while curr_date <= end_date:
        for schedule in schedules:
            if not is_schedule_eligible_on_date(schedule, curr_date):
                continue

            med = schedule.patient_medication
            med_name = med.custom_medicine_name or (med.medicine.name if med.medicine else "Medication")
            generic_name = med.medicine.generic_name if med.medicine else None

            for time_slot in schedule.schedule_times:
                dose_dt = datetime.combine(curr_date, time_slot.scheduled_time).replace(tzinfo=tz)

                # Check persistent dose event
                dose_record = db.execute(
                    select(MedicationDoseEvent).where(
                        MedicationDoseEvent.schedule_id == schedule.id,
                        MedicationDoseEvent.scheduled_timestamp == dose_dt,
                    )
                ).scalar_one_or_none()

                # Skip if already TAKEN or SKIPPED
                if dose_record and dose_record.status in ("TAKEN", "SKIPPED"):
                    continue

                if ref_dt < dose_dt <= window_end:
                    effective_dose = time_slot.dose_quantity or schedule.dose_quantity
                    effective_unit = schedule.dosage_unit or med.dosage_unit
                    effective_instructions = schedule.instructions or med.instructions
                    tod = compute_time_of_day(time_slot.scheduled_time, time_slot.time_of_day_type)

                    upcoming_events.append(
                        UpcomingMedicationEventResponse(
                            dose_event_id=dose_record.id if dose_record else None,
                            medicine_id=med.id,
                            medicine_name=med_name,
                            generic_name=generic_name,
                            schedule_id=schedule.id,
                            frequency_type=schedule.frequency_type,
                            dose_quantity=effective_dose,
                            dosage_unit=effective_unit,
                            scheduled_time=time_slot.scheduled_time,
                            time_of_day_type=tod,
                            due_at=dose_dt,
                            instructions=effective_instructions,
                            status=MedicationDoseEventStatus.UPCOMING.value,
                            snoozed_until=dose_record.snoozed_until_timestamp if dose_record else None,
                        )
                    )

        curr_date += timedelta(days=1)

    upcoming_events.sort(key=lambda x: (x.due_at, x.medicine_name))
    return upcoming_events


def get_today_reminders(
    db: Session,
    patient_id: uuid.UUID,
    reference_datetime: Optional[datetime] = None,
) -> List[TodayMedicationReminder]:
    """
    Returns all medication reminder occurrences for today with their current status:
    DUE, UPCOMING, TAKEN, SKIPPED, SNOOZED, or MISSED.
    Categorizes occurrences into Morning, Afternoon, Evening, Night.
    """
    ref_dt = normalize_reference_datetime(reference_datetime)
    tz = ref_dt.tzinfo
    today = ref_dt.date()

    # Query active schedules
    schedules = _fetch_active_schedules_for_patient(db, patient_id)
    reminders: List[TodayMedicationReminder] = []

    for schedule in schedules:
        if not is_schedule_eligible_on_date(schedule, today):
            continue

        med = schedule.patient_medication
        med_name = med.custom_medicine_name or (med.medicine.name if med.medicine else "Medication")
        generic_name = med.medicine.generic_name if med.medicine else None

        for time_slot in schedule.schedule_times:
            dose_dt = datetime.combine(today, time_slot.scheduled_time).replace(tzinfo=tz)

            # Check persistent dose event
            dose_record = db.execute(
                select(MedicationDoseEvent).where(
                    MedicationDoseEvent.schedule_id == schedule.id,
                    MedicationDoseEvent.scheduled_timestamp == dose_dt,
                )
            ).scalar_one_or_none()

            tod = compute_time_of_day(time_slot.scheduled_time, time_slot.time_of_day_type)
            effective_dose = time_slot.dose_quantity or schedule.dose_quantity
            effective_unit = schedule.dosage_unit or med.dosage_unit
            effective_instructions = schedule.instructions or med.instructions

            status_str = MedicationDoseEventStatus.UPCOMING.value
            actual_taken_at = None
            snoozed_until = None

            if dose_record:
                status_str = dose_record.status
                actual_taken_at = dose_record.actual_taken_timestamp
                snoozed_until = dose_record.snoozed_until_timestamp

                if status_str == "SNOOZED":
                    if snoozed_until and snoozed_until <= ref_dt:
                        status_str = MedicationDoseEventStatus.DUE.value
                elif status_str == "PENDING":
                    if dose_dt <= ref_dt:
                        status_str = MedicationDoseEventStatus.DUE.value
                    else:
                        status_str = MedicationDoseEventStatus.UPCOMING.value
            else:
                if dose_dt <= ref_dt:
                    status_str = MedicationDoseEventStatus.DUE.value
                else:
                    status_str = MedicationDoseEventStatus.UPCOMING.value

            reminders.append(
                TodayMedicationReminder(
                    dose_event_id=dose_record.id if dose_record else None,
                    medicine_id=med.id,
                    medicine_name=med_name,
                    generic_name=generic_name,
                    schedule_id=schedule.id,
                    frequency_type=schedule.frequency_type,
                    dose_quantity=effective_dose,
                    dosage_unit=effective_unit,
                    scheduled_time=time_slot.scheduled_time,
                    time_of_day_type=tod,
                    due_at=dose_dt,
                    instructions=effective_instructions,
                    status=status_str,
                    actual_taken_at=actual_taken_at,
                    snoozed_until=snoozed_until,
                )
            )

    reminders.sort(key=lambda r: (r.due_at, r.medicine_name))
    return reminders


def get_reminders_summary(
    db: Session,
    patient_id: uuid.UUID,
    reference_datetime: Optional[datetime] = None,
    hours_ahead: int = 24,
) -> ReminderSummaryResponse:
    """
    Returns a unified summary of today's reminders (due, upcoming, taken, missed, snoozed)
    for the authenticated patient.
    """
    ref_dt = normalize_reference_datetime(reference_datetime)
    due_doses = get_due_doses(db, patient_id, ref_dt)
    upcoming_doses = get_upcoming_doses(db, patient_id, ref_dt, hours_ahead=hours_ahead)
    today_reminders = get_today_reminders(db, patient_id, ref_dt)

    taken_cnt = sum(1 for r in today_reminders if r.status == "TAKEN")
    missed_cnt = sum(1 for r in today_reminders if r.status == "MISSED")
    snoozed_cnt = sum(1 for r in today_reminders if r.status == "SNOOZED")

    return ReminderSummaryResponse(
        reference_time=ref_dt,
        timezone=str(ref_dt.tzinfo or DEFAULT_TIMEZONE_NAME),
        due_count=len(due_doses),
        upcoming_count=len(upcoming_doses),
        taken_count=taken_cnt,
        missed_count=missed_cnt,
        snoozed_count=snoozed_cnt,
        due_doses=due_doses,
        upcoming_doses=upcoming_doses,
        today_reminders=today_reminders,
    )
