import uuid
from datetime import datetime, date, time, timedelta, timezone
from typing import Optional, List, Tuple, Dict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, or_
from fastapi import HTTPException, status

from app.core.database import check_db_connection
from app.models.user import User, PatientProfile, CaregiverProfile, CaregiverPatientAssignment
from app.models.medicine import PatientMedication
from app.models.schedule import MedicationSchedule, MedicationDoseEvent
from app.models.notification import Notification
from app.schemas.admin import (
    AdminDashboardSummaryResponse,
    AdminUserSummaryResponse,
    AdminUserDetailResponse,
    AdminPatientSummaryResponse,
    AdminPatientDetailResponse,
    AdminCaregiverSummaryResponse,
    AdminCaregiverDetailResponse,
    AdminRelationshipSummaryResponse,
    AdminAnalyticsOverviewResponse,
    AdminUserAnalyticsResponse,
    AdminMedicationAnalyticsResponse,
    AdminDoseAnalyticsResponse,
    AdminAdherenceTrendItem,
    AdminNotificationAnalyticsResponse,
    AdminRelationshipAnalyticsResponse,
    AdminSystemHealthResponse,
    AdminAnalyticsSummaryResponse,
)


def get_admin_dashboard_summary(db: Session) -> AdminDashboardSummaryResponse:
    """
    Computes high-level aggregate system metrics across users, patients, caregivers,
    medications, schedules, dose events, notifications, and active links.
    """
    total_users = db.execute(select(func.count(User.id))).scalar() or 0
    total_patients = db.execute(
        select(func.count(User.id)).where(User.role == "PATIENT")
    ).scalar() or 0
    total_caregivers = db.execute(
        select(func.count(User.id)).where(User.role == "CAREGIVER")
    ).scalar() or 0
    total_admins = db.execute(
        select(func.count(User.id)).where(User.role == "ADMIN")
    ).scalar() or 0

    total_active_meds = db.execute(
        select(func.count(PatientMedication.id)).where(PatientMedication.is_active == True)
    ).scalar() or 0

    total_active_schedules = db.execute(
        select(func.count(MedicationSchedule.id)).where(MedicationSchedule.is_active == True)
    ).scalar() or 0

    total_dose_events = db.execute(
        select(func.count(MedicationDoseEvent.id))
    ).scalar() or 0

    total_notifications = db.execute(
        select(func.count(Notification.id))
    ).scalar() or 0

    active_links = db.execute(
        select(func.count(CaregiverPatientAssignment.id)).where(
            CaregiverPatientAssignment.is_active == True
        )
    ).scalar() or 0

    return AdminDashboardSummaryResponse(
        total_users=total_users,
        total_patients=total_patients,
        total_caregivers=total_caregivers,
        total_admins=total_admins,
        total_active_medications=total_active_meds,
        total_active_schedules=total_active_schedules,
        total_dose_events=total_dose_events,
        total_notifications=total_notifications,
        active_caregiver_patient_links=active_links,
    )


def get_admin_users(
    db: Session,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[AdminUserSummaryResponse], int]:
    """
    Retrieves paginated safe user summaries with optional role, status, and search filters.
    """
    query = select(User)

    if role:
        query = query.where(User.role == role.upper())
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                User.email.ilike(search_pattern),
                User.first_name.ilike(search_pattern),
                User.last_name.ilike(search_pattern),
            )
        )

    total_count = db.execute(
        select(func.count()).select_from(query.subquery())
    ).scalar() or 0

    users = db.execute(
        query.order_by(User.created_at.desc()).offset(offset).limit(limit)
    ).scalars().all()

    items = [
        AdminUserSummaryResponse(
            id=u.id,
            email=u.email,
            role=u.role,
            first_name=u.first_name,
            last_name=u.last_name,
            phone_number=u.phone_number,
            is_active=u.is_active,
            created_at=u.created_at,
            updated_at=u.updated_at,
        )
        for u in users
    ]

    return items, total_count


def get_admin_user_by_id(db: Session, user_id: uuid.UUID) -> AdminUserDetailResponse:
    """
    Retrieves safe detailed user information by ID. Raises 404 if not found.
    """
    user = db.execute(
        select(User)
        .options(
            joinedload(User.patient_profile),
            joinedload(User.caregiver_profile),
        )
        .where(User.id == user_id)
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return AdminUserDetailResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        first_name=user.first_name,
        last_name=user.last_name,
        phone_number=user.phone_number,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        patient_profile_id=user.patient_profile.id if user.patient_profile else None,
        caregiver_profile_id=user.caregiver_profile.id if user.caregiver_profile else None,
    )


def get_admin_patients(
    db: Session,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[AdminPatientSummaryResponse], int]:
    """
    Retrieves paginated safe patient profile summaries.
    """
    query = (
        select(PatientProfile)
        .join(PatientProfile.user)
        .options(joinedload(PatientProfile.user))
    )

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                User.first_name.ilike(search_pattern),
                User.last_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.phone_number.ilike(search_pattern),
            )
        )

    total_count = db.execute(
        select(func.count()).select_from(query.subquery())
    ).scalar() or 0

    patients = db.execute(
        query.order_by(PatientProfile.created_at.desc()).offset(offset).limit(limit)
    ).scalars().all()

    items = []
    for p in patients:
        u = p.user
        if not u:
            continue

        linked_cg_count = db.execute(
            select(func.count(CaregiverPatientAssignment.id)).where(
                CaregiverPatientAssignment.patient_id == p.id,
                CaregiverPatientAssignment.is_active == True,
            )
        ).scalar() or 0

        active_med_count = db.execute(
            select(func.count(PatientMedication.id)).where(
                PatientMedication.patient_id == p.id,
                PatientMedication.is_active == True,
            )
        ).scalar() or 0

        items.append(
            AdminPatientSummaryResponse(
                id=p.id,
                user_id=u.id,
                first_name=u.first_name,
                last_name=u.last_name,
                email=u.email,
                phone_number=u.phone_number,
                is_active=u.is_active,
                linked_caregivers_count=linked_cg_count,
                active_medications_count=active_med_count,
                created_at=p.created_at,
            )
        )

    return items, total_count


def get_admin_patient_by_id(db: Session, patient_id: uuid.UUID) -> AdminPatientDetailResponse:
    """
    Retrieves detailed safe patient profile by profile ID.
    """
    patient = db.execute(
        select(PatientProfile)
        .options(joinedload(PatientProfile.user))
        .where(PatientProfile.id == patient_id)
    ).scalar_one_or_none()

    if not patient or not patient.user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )

    u = patient.user

    linked_cg_count = db.execute(
        select(func.count(CaregiverPatientAssignment.id)).where(
            CaregiverPatientAssignment.patient_id == patient.id,
            CaregiverPatientAssignment.is_active == True,
        )
    ).scalar() or 0

    active_med_count = db.execute(
        select(func.count(PatientMedication.id)).where(
            PatientMedication.patient_id == patient.id,
            PatientMedication.is_active == True,
        )
    ).scalar() or 0

    return AdminPatientDetailResponse(
        id=patient.id,
        user_id=u.id,
        first_name=u.first_name,
        last_name=u.last_name,
        email=u.email,
        phone_number=u.phone_number,
        is_active=u.is_active,
        date_of_birth=patient.date_of_birth,
        gender=patient.gender,
        blood_group=patient.blood_group,
        allergies=patient.allergies,
        medical_conditions=patient.medical_conditions,
        emergency_contact_name=patient.emergency_contact_name,
        emergency_contact_phone=patient.emergency_contact_phone,
        linked_caregivers_count=linked_cg_count,
        active_medications_count=active_med_count,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
    )


def get_admin_caregivers(
    db: Session,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[AdminCaregiverSummaryResponse], int]:
    """
    Retrieves paginated safe caregiver profile summaries.
    """
    query = (
        select(CaregiverProfile)
        .join(CaregiverProfile.user)
        .options(joinedload(CaregiverProfile.user))
    )

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                User.first_name.ilike(search_pattern),
                User.last_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                CaregiverProfile.organization.ilike(search_pattern),
            )
        )

    total_count = db.execute(
        select(func.count()).select_from(query.subquery())
    ).scalar() or 0

    caregivers = db.execute(
        query.order_by(CaregiverProfile.created_at.desc()).offset(offset).limit(limit)
    ).scalars().all()

    items = []
    for cg in caregivers:
        u = cg.user
        if not u:
            continue

        linked_pt_count = db.execute(
            select(func.count(CaregiverPatientAssignment.id)).where(
                CaregiverPatientAssignment.caregiver_id == cg.id,
                CaregiverPatientAssignment.is_active == True,
            )
        ).scalar() or 0

        items.append(
            AdminCaregiverSummaryResponse(
                id=cg.id,
                user_id=u.id,
                first_name=u.first_name,
                last_name=u.last_name,
                email=u.email,
                phone_number=u.phone_number,
                organization=cg.organization,
                relationship_type=cg.relationship_type,
                is_active=u.is_active,
                linked_patients_count=linked_pt_count,
                created_at=cg.created_at,
            )
        )

    return items, total_count


def get_admin_caregiver_by_id(db: Session, caregiver_id: uuid.UUID) -> AdminCaregiverDetailResponse:
    """
    Retrieves detailed safe caregiver profile by profile ID.
    """
    cg = db.execute(
        select(CaregiverProfile)
        .options(joinedload(CaregiverProfile.user))
        .where(CaregiverProfile.id == caregiver_id)
    ).scalar_one_or_none()

    if not cg or not cg.user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caregiver not found",
        )

    u = cg.user

    linked_pt_count = db.execute(
        select(func.count(CaregiverPatientAssignment.id)).where(
            CaregiverPatientAssignment.caregiver_id == cg.id,
            CaregiverPatientAssignment.is_active == True,
        )
    ).scalar() or 0

    return AdminCaregiverDetailResponse(
        id=cg.id,
        user_id=u.id,
        first_name=u.first_name,
        last_name=u.last_name,
        email=u.email,
        phone_number=u.phone_number,
        organization=cg.organization,
        relationship_type=cg.relationship_type,
        is_active=u.is_active,
        linked_patients_count=linked_pt_count,
        created_at=cg.created_at,
        updated_at=cg.updated_at,
    )


def get_admin_relationships(
    db: Session,
    caregiver_id: Optional[uuid.UUID] = None,
    patient_id: Optional[uuid.UUID] = None,
    is_active: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[AdminRelationshipSummaryResponse], int]:
    """
    Retrieves paginated caregiver-patient assignments.
    """
    query = (
        select(CaregiverPatientAssignment)
        .options(
            joinedload(CaregiverPatientAssignment.caregiver).joinedload(CaregiverProfile.user),
            joinedload(CaregiverPatientAssignment.patient).joinedload(PatientProfile.user),
        )
    )

    if caregiver_id:
        query = query.where(CaregiverPatientAssignment.caregiver_id == caregiver_id)
    if patient_id:
        query = query.where(CaregiverPatientAssignment.patient_id == patient_id)
    if is_active is not None:
        query = query.where(CaregiverPatientAssignment.is_active == is_active)

    total_count = db.execute(
        select(func.count()).select_from(query.subquery())
    ).scalar() or 0

    assignments = db.execute(
        query.order_by(CaregiverPatientAssignment.created_at.desc()).offset(offset).limit(limit)
    ).scalars().all()

    items = []
    for a in assignments:
        cg = a.caregiver
        pt = a.patient
        if not cg or not cg.user or not pt or not pt.user:
            continue

        cg_name = f"{cg.user.first_name} {cg.user.last_name}".strip()
        pt_name = f"{pt.user.first_name} {pt.user.last_name}".strip()

        items.append(
            AdminRelationshipSummaryResponse(
                id=a.id,
                caregiver_id=a.caregiver_id,
                caregiver_user_id=cg.user.id,
                caregiver_name=cg_name,
                caregiver_email=cg.user.email,
                patient_id=a.patient_id,
                patient_user_id=pt.user.id,
                patient_name=pt_name,
                patient_email=pt.user.email,
                relationship_type=a.relationship_type,
                permission_level=a.permission_level,
                is_active=a.is_active,
                assigned_at=a.assigned_at,
                created_at=a.created_at,
            )
        )

    return items, total_count


def get_admin_analytics_summary(db: Session, days: int = 30) -> AdminAnalyticsSummaryResponse:
    """
    Computes system-wide analytics and performance indicators using efficient SQL queries.
    Covers user growth, medication usage, dose performance, adherence trends, notification
    activity, caregiver network distribution, and system health status.
    """
    now_utc = datetime.now(timezone.utc)
    today_start = datetime.combine(date.today(), time.min).replace(tzinfo=timezone.utc)
    seven_days_ago = now_utc - timedelta(days=7)
    thirty_days_ago = now_utc - timedelta(days=30)

    # 1. User metrics & growth
    total_users = db.execute(select(func.count(User.id))).scalar() or 0
    total_patients = db.execute(
        select(func.count(User.id)).where(User.role == "PATIENT")
    ).scalar() or 0
    total_caregivers = db.execute(
        select(func.count(User.id)).where(User.role == "CAREGIVER")
    ).scalar() or 0
    total_admins = db.execute(
        select(func.count(User.id)).where(User.role == "ADMIN")
    ).scalar() or 0
    active_users = db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    ).scalar() or 0
    inactive_users = max(0, total_users - active_users)

    new_users_today = db.execute(
        select(func.count(User.id)).where(User.created_at >= today_start)
    ).scalar() or 0
    new_users_7d = db.execute(
        select(func.count(User.id)).where(User.created_at >= seven_days_ago)
    ).scalar() or 0
    new_users_30d = db.execute(
        select(func.count(User.id)).where(User.created_at >= thirty_days_ago)
    ).scalar() or 0

    user_analytics = AdminUserAnalyticsResponse(
        total_users=total_users,
        patients=total_patients,
        caregivers=total_caregivers,
        admins=total_admins,
        active_users=active_users,
        inactive_users=inactive_users,
        new_users_today=new_users_today,
        new_users_last_7_days=new_users_7d,
        new_users_last_30_days=new_users_30d,
    )

    # 2. Medication & schedule analytics
    total_meds = db.execute(select(func.count(PatientMedication.id))).scalar() or 0
    active_meds = db.execute(
        select(func.count(PatientMedication.id)).where(PatientMedication.is_active == True)
    ).scalar() or 0
    inactive_meds = max(0, total_meds - active_meds)

    total_schedules = db.execute(select(func.count(MedicationSchedule.id))).scalar() or 0
    active_schedules = db.execute(
        select(func.count(MedicationSchedule.id)).where(MedicationSchedule.is_active == True)
    ).scalar() or 0
    inactive_schedules = max(0, total_schedules - active_schedules)

    medication_analytics = AdminMedicationAnalyticsResponse(
        total_medications=total_meds,
        active_medications=active_meds,
        inactive_medications=inactive_meds,
        total_schedules=total_schedules,
        active_schedules=active_schedules,
        inactive_schedules=inactive_schedules,
    )

    # 3. Dose analytics & standard PillSync adherence formula: TAKEN / (TAKEN + SKIPPED) * 100
    dose_stats = db.execute(
        select(
            func.count(MedicationDoseEvent.id).label("total"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "TAKEN").label("taken"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "SKIPPED").label("skipped"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "PENDING").label("pending"),
        )
    ).one()

    total_doses = dose_stats.total or 0
    taken_doses = dose_stats.taken or 0
    skipped_doses = dose_stats.skipped or 0
    pending_doses = dose_stats.pending or 0
    completed_trackable = taken_doses + skipped_doses
    overall_adherence_pct = (
        round((taken_doses / completed_trackable) * 100.0, 2)
        if completed_trackable > 0
        else 0.0
    )

    dose_analytics = AdminDoseAnalyticsResponse(
        total_doses=total_doses,
        taken_doses=taken_doses,
        skipped_doses=skipped_doses,
        pending_doses=pending_doses,
        completed_trackable_doses=completed_trackable,
        adherence_percentage=overall_adherence_pct,
    )

    # 4. Daily adherence trend over requested timeframe (days)
    start_trend_date = date.today() - timedelta(days=days)
    start_trend_dt = datetime.combine(start_trend_date, time.min).replace(tzinfo=timezone.utc)

    trend_date_col = func.date(MedicationDoseEvent.scheduled_timestamp)
    trend_rows = db.execute(
        select(
            trend_date_col.label("d"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "TAKEN").label("taken"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "SKIPPED").label("skipped"),
            func.count(MedicationDoseEvent.id).filter(MedicationDoseEvent.status == "PENDING").label("pending"),
        )
        .where(MedicationDoseEvent.scheduled_timestamp >= start_trend_dt)
        .group_by(trend_date_col)
        .order_by(trend_date_col.asc())
    ).all()

    adherence_trend: List[AdminAdherenceTrendItem] = []
    for r in trend_rows:
        row_taken = r.taken or 0
        row_skipped = r.skipped or 0
        row_pending = r.pending or 0
        row_completed = row_taken + row_skipped
        row_adh = round((row_taken / row_completed) * 100.0, 2) if row_completed > 0 else 0.0
        adherence_trend.append(
            AdminAdherenceTrendItem(
                date=str(r.d),
                taken=row_taken,
                skipped=row_skipped,
                pending=row_pending,
                adherence_percentage=row_adh,
            )
        )

    # 5. Notification analytics
    total_notifs = db.execute(select(func.count(Notification.id))).scalar() or 0
    read_notifs = db.execute(
        select(func.count(Notification.id)).where(Notification.is_read == True)
    ).scalar() or 0
    unread_notifs = max(0, total_notifs - read_notifs)

    notif_type_rows = db.execute(
        select(Notification.type, func.count(Notification.id))
        .group_by(Notification.type)
    ).all()
    by_type: Dict[str, int] = {
        "MEDICATION_DUE": 0,
        "MEDICATION_UPCOMING": 0,
        "MISSED_DOSE": 0,
        "SYSTEM": 0,
    }
    for n_type, count in notif_type_rows:
        if n_type in by_type:
            by_type[n_type] = count
        elif n_type:
            by_type[n_type] = count

    notification_analytics = AdminNotificationAnalyticsResponse(
        total_notifications=total_notifs,
        read_notifications=read_notifs,
        unread_notifications=unread_notifs,
        by_type=by_type,
    )

    # 6. Relationship analytics
    total_rel = db.execute(select(func.count(CaregiverPatientAssignment.id))).scalar() or 0
    active_rel = db.execute(
        select(func.count(CaregiverPatientAssignment.id)).where(
            CaregiverPatientAssignment.is_active == True
        )
    ).scalar() or 0
    inactive_rel = max(0, total_rel - active_rel)

    cg_with_pt = db.execute(
        select(func.count(func.distinct(CaregiverPatientAssignment.caregiver_id))).where(
            CaregiverPatientAssignment.is_active == True
        )
    ).scalar() or 0

    pt_with_cg = db.execute(
        select(func.count(func.distinct(CaregiverPatientAssignment.patient_id))).where(
            CaregiverPatientAssignment.is_active == True
        )
    ).scalar() or 0

    relationship_analytics = AdminRelationshipAnalyticsResponse(
        total_relationships=total_rel,
        active_relationships=active_rel,
        inactive_relationships=inactive_rel,
        caregivers_with_patients=cg_with_pt,
        patients_with_caregivers=pt_with_cg,
    )

    # 7. System health
    db_status = "connected"
    try:
        check_db_connection()
    except Exception:
        db_status = "disconnected"
    system_health = AdminSystemHealthResponse(
        api_status="ok",
        database_status=db_status,
    )

    # 8. High level overview
    overview = AdminAnalyticsOverviewResponse(
        total_users=total_users,
        total_patients=total_patients,
        total_caregivers=total_caregivers,
        total_admins=total_admins,
        total_medications=total_meds,
        total_dose_events=total_doses,
        total_notifications=total_notifs,
        total_relationships=total_rel,
        active_relationships=active_rel,
    )

    return AdminAnalyticsSummaryResponse(
        overview=overview,
        users=user_analytics,
        medications=medication_analytics,
        doses=dose_analytics,
        adherence_trend=adherence_trend,
        notifications=notification_analytics,
        relationships=relationship_analytics,
        system_health=system_health,
    )
