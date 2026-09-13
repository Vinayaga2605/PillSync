import uuid
import logging
from datetime import date, time, datetime
from typing import List, Optional
from zoneinfo import ZoneInfo
from sqlalchemy import select, and_
from sqlalchemy.orm import Session, joinedload, selectinload
from fastapi import HTTPException, status

from app.models.user import User, PatientProfile, CaregiverProfile, CaregiverPatientAssignment
from app.models.medicine import PatientMedication
from app.models.schedule import MedicationSchedule, MedicationDoseEvent
from app.models.notification import Notification
from app.schemas.caregiver import (
    CaregiverPatientSummaryResponse,
    CaregiverPatientDetailResponse,
    CaregiverDashboardSummaryResponse,
    CaregiverNotificationResponse,
    CaregiverPatientAttentionOverview,
)
from app.schemas.medication_intelligence import (
    PatientMedicationIntelligenceResponse,
    PatientMedicationHistoryResponse,
)
from app.schemas.medication_suggestions import PatientMedicationSuggestionsResponse
from app.schemas.medicine import MedicineResponse
from app.schemas.schedule import MedicationScheduleResponse
from app.schemas.reminder import DueMedicationEventResponse, UpcomingMedicationEventResponse
from app.schemas.dose import DoseEventResponse, DoseStatusEnum
from app.schemas.adherence import AdherenceSummaryResponse
from app.services import (
    medicine_service,
    reminder_service,
    dose_service,
    adherence_service,
    medication_intelligence_service,
    medication_suggestion_service,
)
from app.services.reminder_service import get_app_timezone, normalize_reference_datetime

logger = logging.getLogger("pillsync.caregiver")


def get_current_caregiver_profile(db: Session, user: User) -> CaregiverProfile:
    """
    Retrieves or initializes the CaregiverProfile for an authenticated caregiver user.
    """
    profile = db.execute(
        select(CaregiverProfile).where(CaregiverProfile.user_id == user.id)
    ).scalar_one_or_none()

    if not profile:
        profile = CaregiverProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile


def verify_caregiver_patient_link(
    db: Session, caregiver_id: uuid.UUID, patient_id: uuid.UUID
) -> CaregiverPatientAssignment:
    """
    Verifies that an active caregiver-patient link exists.
    Raises HTTP 404 if not found or inactive to prevent patient existence enumeration.
    """
    assignment = db.execute(
        select(CaregiverPatientAssignment)
        .options(
            joinedload(CaregiverPatientAssignment.patient).joinedload(PatientProfile.user)
        )
        .where(
            CaregiverPatientAssignment.caregiver_id == caregiver_id,
            CaregiverPatientAssignment.patient_id == patient_id,
            CaregiverPatientAssignment.is_active == True,
        )
    ).scalar_one_or_none()

    if not assignment or not assignment.patient:
        logger.warning(
            f"Caregiver access denied / unlinked patient: caregiver_id={caregiver_id}, patient_id={patient_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found or not linked to your caregiver account",
        )

    return assignment


def get_linked_patients(
    db: Session, caregiver_id: uuid.UUID
) -> List[CaregiverPatientSummaryResponse]:
    """
    Returns the list of active patients linked to the authenticated caregiver.
    """
    assignments = db.execute(
        select(CaregiverPatientAssignment)
        .options(
            joinedload(CaregiverPatientAssignment.patient).joinedload(PatientProfile.user)
        )
        .where(
            CaregiverPatientAssignment.caregiver_id == caregiver_id,
            CaregiverPatientAssignment.is_active == True,
        )
        .order_by(CaregiverPatientAssignment.created_at.desc())
    ).scalars().all()

    patient_summaries: List[CaregiverPatientSummaryResponse] = []
    for a in assignments:
        patient = a.patient
        if not patient or not patient.user:
            continue
        patient_summaries.append(
            CaregiverPatientSummaryResponse(
                id=patient.id,
                user_id=patient.user.id,
                first_name=patient.user.first_name,
                last_name=patient.user.last_name,
                email=patient.user.email,
                phone_number=patient.user.phone_number,
                relationship_type=a.relationship_type,
                permission_level=a.permission_level,
                is_active=a.is_active,
                assigned_at=a.assigned_at,
                created_at=a.created_at,
            )
        )

    return patient_summaries


def get_linked_patient_by_id(
    db: Session, caregiver_id: uuid.UUID, patient_id: uuid.UUID
) -> CaregiverPatientDetailResponse:
    """
    Returns detailed caregiver-safe information for a linked patient.
    """
    assignment = verify_caregiver_patient_link(db, caregiver_id, patient_id)
    patient = assignment.patient
    user = patient.user

    return CaregiverPatientDetailResponse(
        id=patient.id,
        user_id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        phone_number=user.phone_number,
        relationship_type=assignment.relationship_type,
        permission_level=assignment.permission_level,
        is_active=assignment.is_active,
        date_of_birth=patient.date_of_birth,
        gender=patient.gender,
        blood_group=patient.blood_group,
        allergies=patient.allergies,
        medical_conditions=patient.medical_conditions,
        emergency_contact_name=patient.emergency_contact_name,
        emergency_contact_phone=patient.emergency_contact_phone,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
    )


def get_patient_medications(
    db: Session, caregiver_id: uuid.UUID, patient_id: uuid.UUID
) -> List[MedicineResponse]:
    """
    Lists active and historical medications belonging to the linked patient.
    """
    verify_caregiver_patient_link(db, caregiver_id, patient_id)
    return medicine_service.get_patient_medicines(db, patient_id)


def get_patient_schedules(
    db: Session, caregiver_id: uuid.UUID, patient_id: uuid.UUID
) -> List[MedicationScheduleResponse]:
    """
    Lists all medication schedules across all medications belonging to the linked patient.
    """
    verify_caregiver_patient_link(db, caregiver_id, patient_id)

    schedules = db.execute(
        select(MedicationSchedule)
        .join(PatientMedication, MedicationSchedule.patient_medication_id == PatientMedication.id)
        .options(selectinload(MedicationSchedule.schedule_times))
        .where(PatientMedication.patient_id == patient_id)
        .order_by(MedicationSchedule.created_at.desc())
    ).scalars().all()

    return [MedicationScheduleResponse.model_validate(s) for s in schedules]


def get_patient_reminders_due(
    db: Session,
    caregiver_id: uuid.UUID,
    patient_id: uuid.UUID,
    reference_datetime: Optional[datetime] = None,
) -> List[DueMedicationEventResponse]:
    """
    Returns currently due doses for the linked patient.
    """
    verify_caregiver_patient_link(db, caregiver_id, patient_id)
    return reminder_service.get_due_doses(db, patient_id, reference_datetime)


def get_patient_reminders_upcoming(
    db: Session,
    caregiver_id: uuid.UUID,
    patient_id: uuid.UUID,
    reference_datetime: Optional[datetime] = None,
    hours_ahead: int = 24,
) -> List[UpcomingMedicationEventResponse]:
    """
    Returns upcoming doses for the linked patient.
    """
    verify_caregiver_patient_link(db, caregiver_id, patient_id)
    return reminder_service.get_upcoming_doses(
        db, patient_id, reference_datetime, hours_ahead=hours_ahead
    )


def get_patient_doses(
    db: Session,
    caregiver_id: uuid.UUID,
    patient_id: uuid.UUID,
    target_date: Optional[date] = None,
    status_filter: Optional[str] = None,
) -> List[DoseEventResponse]:
    """
    Returns recorded dose events for the linked patient.
    """
    verify_caregiver_patient_link(db, caregiver_id, patient_id)
    return dose_service.get_patient_doses(
        db, patient_id, target_date=target_date, status_filter=status_filter
    )


def get_patient_adherence_today(
    db: Session,
    caregiver_id: uuid.UUID,
    patient_id: uuid.UUID,
    medicine_id: Optional[uuid.UUID] = None,
) -> AdherenceSummaryResponse:
    """
    Calculates today's adherence for the linked patient.
    """
    verify_caregiver_patient_link(db, caregiver_id, patient_id)
    return adherence_service.calculate_today_adherence(db, patient_id, medicine_id)


def get_patient_adherence_week(
    db: Session,
    caregiver_id: uuid.UUID,
    patient_id: uuid.UUID,
    medicine_id: Optional[uuid.UUID] = None,
) -> AdherenceSummaryResponse:
    """
    Calculates current week's adherence for the linked patient.
    """
    verify_caregiver_patient_link(db, caregiver_id, patient_id)
    return adherence_service.calculate_week_adherence(db, patient_id, medicine_id)


def get_patient_adherence_month(
    db: Session,
    caregiver_id: uuid.UUID,
    patient_id: uuid.UUID,
    medicine_id: Optional[uuid.UUID] = None,
) -> AdherenceSummaryResponse:
    """
    Calculates current month's adherence for the linked patient.
    """
    verify_caregiver_patient_link(db, caregiver_id, patient_id)
    return adherence_service.calculate_month_adherence(db, patient_id, medicine_id)


def get_patient_adherence(
    db: Session,
    caregiver_id: uuid.UUID,
    patient_id: uuid.UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    medicine_id: Optional[uuid.UUID] = None,
) -> AdherenceSummaryResponse:
    """
    Calculates adherence over a date range or defaults to today for the linked patient.
    """
    verify_caregiver_patient_link(db, caregiver_id, patient_id)
    if start_date is not None or end_date is not None:
        s_date = start_date or date.today()
        e_date = end_date or date.today()
        return adherence_service.calculate_custom_range_adherence(
            db, patient_id, start_date=s_date, end_date=e_date, medicine_id=medicine_id
        )
    return adherence_service.calculate_today_adherence(db, patient_id, medicine_id)


def get_caregiver_dashboard_summary(
    db: Session, caregiver_id: uuid.UUID
) -> CaregiverDashboardSummaryResponse:
    """
    Aggregates statistics across all active patients linked to the caregiver.
    """
    linked_patients = get_linked_patients(db, caregiver_id)
    total_patients = len(linked_patients)

    if total_patients == 0:
        return CaregiverDashboardSummaryResponse(
            total_patients=0,
            patients_with_due_medications=0,
            due_doses=0,
            upcoming_doses=0,
            taken_doses_today=0,
            skipped_doses_today=0,
        )

    tz = get_app_timezone()
    now = normalize_reference_datetime()
    today = now.date()
    start_of_today = datetime.combine(today, time.min).replace(tzinfo=tz)
    end_of_today = datetime.combine(today, time.max).replace(tzinfo=tz)

    patients_with_due = 0
    total_due_doses = 0
    total_upcoming_doses = 0
    total_taken_today = 0
    total_skipped_today = 0

    patient_ids = [p.id for p in linked_patients]

    for p_id in patient_ids:
        # Due doses
        due_list = reminder_service.get_due_doses(db, p_id, now)
        if len(due_list) > 0:
            patients_with_due += 1
            total_due_doses += len(due_list)

        # Upcoming doses (24h)
        upcoming_list = reminder_service.get_upcoming_doses(db, p_id, now, hours_ahead=24)
        total_upcoming_doses += len(upcoming_list)

    # Taken today & skipped today across all linked patients
    today_doses = db.execute(
        select(MedicationDoseEvent)
        .where(
            MedicationDoseEvent.patient_id.in_(patient_ids),
            MedicationDoseEvent.scheduled_timestamp >= start_of_today,
            MedicationDoseEvent.scheduled_timestamp <= end_of_today,
        )
    ).scalars().all()

    for d in today_doses:
        if d.status == DoseStatusEnum.TAKEN.value:
            total_taken_today += 1
        elif d.status == DoseStatusEnum.SKIPPED.value:
            total_skipped_today += 1

    return CaregiverDashboardSummaryResponse(
        total_patients=total_patients,
        patients_with_due_medications=patients_with_due,
        due_doses=total_due_doses,
        upcoming_doses=total_upcoming_doses,
        taken_doses_today=total_taken_today,
        skipped_doses_today=total_skipped_today,
    )


def get_caregiver_notifications(
    db: Session,
    caregiver_id: uuid.UUID,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> tuple[List[CaregiverNotificationResponse], int, int]:
    """
    Returns paginated notifications across all active patients linked to the caregiver.
    """
    assignments = db.execute(
        select(CaregiverPatientAssignment)
        .options(
            joinedload(CaregiverPatientAssignment.patient).joinedload(PatientProfile.user)
        )
        .where(
            CaregiverPatientAssignment.caregiver_id == caregiver_id,
            CaregiverPatientAssignment.is_active == True,
        )
    ).scalars().all()

    patient_map = {}
    for a in assignments:
        if a.patient and a.patient.user:
            patient_map[a.patient_id] = f"{a.patient.user.first_name} {a.patient.user.last_name}"

    linked_patient_ids = list(patient_map.keys())

    if not linked_patient_ids:
        return [], 0, 0

    base_query = select(Notification).where(Notification.patient_id.in_(linked_patient_ids))

    total_count = len(db.execute(base_query).scalars().all())
    unread_count = len(
        db.execute(base_query.where(Notification.is_read == False)).scalars().all()
    )

    query = base_query
    if unread_only:
        query = query.where(Notification.is_read == False)

    query = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
    items = db.execute(query).scalars().all()

    response_items = []
    for notif in items:
        p_name = patient_map.get(notif.patient_id, "Linked Patient")
        response_items.append(
            CaregiverNotificationResponse(
                id=notif.id,
                patient_id=notif.patient_id,
                patient_name=p_name,
                type=notif.type,
                title=notif.title,
                message=notif.message,
                related_dose_event_id=notif.related_dose_event_id,
                related_medicine_id=notif.related_medicine_id,
                is_read=notif.is_read,
                created_at=notif.created_at,
                read_at=notif.read_at,
            )
        )

    return response_items, total_count, unread_count


def get_caregiver_unread_notification_count(
    db: Session, caregiver_id: uuid.UUID
) -> int:
    """
    Returns total unread notifications for all active linked patients.
    """
    linked_patient_ids = db.execute(
        select(CaregiverPatientAssignment.patient_id).where(
            CaregiverPatientAssignment.caregiver_id == caregiver_id,
            CaregiverPatientAssignment.is_active == True,
        )
    ).scalars().all()

    if not linked_patient_ids:
        return 0

    return len(
        db.execute(
            select(Notification).where(
                Notification.patient_id.in_(linked_patient_ids),
                Notification.is_read == False,
            )
        ).scalars().all()
    )


def mark_caregiver_notification_as_read(
    db: Session, caregiver_id: uuid.UUID, notification_id: uuid.UUID
) -> CaregiverNotificationResponse:
    """
    Marks a single notification as read if it belongs to one of the caregiver's active linked patients.
    """
    linked_patient_ids = db.execute(
        select(CaregiverPatientAssignment.patient_id).where(
            CaregiverPatientAssignment.caregiver_id == caregiver_id,
            CaregiverPatientAssignment.is_active == True,
        )
    ).scalars().all()

    notif = db.execute(
        select(Notification)
        .options(joinedload(Notification.patient).joinedload(PatientProfile.user))
        .where(
            Notification.id == notification_id,
            Notification.patient_id.in_(linked_patient_ids),
        )
    ).scalar_one_or_none()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access denied",
        )

    if not notif.is_read:
        notif.is_read = True
        notif.read_at = datetime.now(get_app_timezone())
        db.commit()
        db.refresh(notif)

    p_name = "Linked Patient"
    if notif.patient and notif.patient.user:
        p_name = f"{notif.patient.user.first_name} {notif.patient.user.last_name}"

    return CaregiverNotificationResponse(
        id=notif.id,
        patient_id=notif.patient_id,
        patient_name=p_name,
        type=notif.type,
        title=notif.title,
        message=notif.message,
        related_dose_event_id=notif.related_dose_event_id,
        related_medicine_id=notif.related_medicine_id,
        is_read=notif.is_read,
        created_at=notif.created_at,
        read_at=notif.read_at,
    )


def mark_all_caregiver_notifications_as_read(
    db: Session, caregiver_id: uuid.UUID
) -> None:
    """
    Marks all unread notifications across the caregiver's linked patients as read.
    """
    linked_patient_ids = db.execute(
        select(CaregiverPatientAssignment.patient_id).where(
            CaregiverPatientAssignment.caregiver_id == caregiver_id,
            CaregiverPatientAssignment.is_active == True,
        )
    ).scalars().all()

    if not linked_patient_ids:
        return

    unread_notifications = db.execute(
        select(Notification).where(
            Notification.patient_id.in_(linked_patient_ids),
            Notification.is_read == False,
        )
    ).scalars().all()

    now = datetime.now(get_app_timezone())
    for notif in unread_notifications:
        notif.is_read = True
        notif.read_at = now

    db.commit()


# ==========================================
# Feature 17F: Caregiver Intelligence & Trend Monitoring
# ==========================================

def get_patient_intelligence_summary(
    db: Session, caregiver_id: uuid.UUID, patient_id: uuid.UUID
) -> PatientMedicationIntelligenceResponse:
    """
    Retrieves the medication intelligence summary for an actively linked patient.
    Verifies active caregiver-patient relationship (raises 404 if unlinked or inactive).
    """
    verify_caregiver_patient_link(db, caregiver_id, patient_id)
    return medication_intelligence_service.get_patient_intelligence_summary(db, patient_id)


def get_patient_intelligence_history(
    db: Session, caregiver_id: uuid.UUID, patient_id: uuid.UUID, days: int = 30
) -> PatientMedicationHistoryResponse:
    """
    Retrieves historical adherence trends and timelines for an actively linked patient over 7, 30, or 90 days.
    Verifies active caregiver-patient relationship (raises 404 if unlinked or inactive).
    """
    verify_caregiver_patient_link(db, caregiver_id, patient_id)
    return medication_intelligence_service.get_patient_intelligence_history(db, patient_id, days=days)


def get_patient_intelligence_suggestions(
    db: Session, caregiver_id: uuid.UUID, patient_id: uuid.UUID
) -> PatientMedicationSuggestionsResponse:
    """
    Retrieves deterministic, non-clinical medication management suggestions for an actively linked patient.
    Verifies active caregiver-patient relationship (raises 404 if unlinked or inactive).
    """
    verify_caregiver_patient_link(db, caregiver_id, patient_id)
    return medication_suggestion_service.get_patient_medication_suggestions(db, patient_id)


def get_caregiver_patients_intelligence_overview(
    db: Session, caregiver_id: uuid.UUID
) -> List[CaregiverPatientAttentionOverview]:
    """
    Computes a lightweight medication attention and adherence overview across all actively linked patients
    for the caregiver dashboard overview.
    """
    linked_patients = get_linked_patients(db, caregiver_id)
    overview_list: List[CaregiverPatientAttentionOverview] = []

    for pt in linked_patients:
        try:
            intel = medication_intelligence_service.get_patient_intelligence_summary(db, pt.id)
            overview_list.append(
                CaregiverPatientAttentionOverview(
                    patient_id=pt.id,
                    patient_name=f"{pt.first_name} {pt.last_name}",
                    adherence_30d=intel.summary.overall_adherence_30d,
                    trend_direction=intel.trend.trend_direction,
                    attention_level=intel.attention_score.level,
                    attention_score=intel.attention_score.score,
                    insight_count=len(intel.insights),
                )
            )
        except Exception as e:
            logger.warning(f"Error computing intelligence overview for patient {pt.id}: {e}")
            overview_list.append(
                CaregiverPatientAttentionOverview(
                    patient_id=pt.id,
                    patient_name=f"{pt.first_name} {pt.last_name}",
                    adherence_30d=0.0,
                    trend_direction="INSUFFICIENT_DATA",
                    attention_level="LOW",
                    attention_score=0,
                    insight_count=0,
                )
            )

    return overview_list


