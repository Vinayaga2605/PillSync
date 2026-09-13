import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import User, PatientProfile
from app.schemas.user import UserRole
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    NotificationUnreadCountResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
)
from app.services.notification_service import (
    get_patient_notifications,
    get_unread_notification_count,
    mark_notification_as_read,
    mark_all_notifications_as_read,
    get_notification_preferences,
    update_notification_preferences,
)
from app.services.notification_generator import generate_patient_notifications

router = APIRouter(prefix="/patients/me/notifications", tags=["In-App Notifications"])


def get_current_patient(
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
    db: Session = Depends(get_db)
) -> tuple[uuid.UUID, uuid.UUID]:
    """
    Returns (patient_profile_id, user_id) for the authenticated patient session.
    """
    if current_user.patient_profile:
        return current_user.patient_profile.id, current_user.id

    profile = db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user.id)
    ).scalar_one_or_none()

    if not profile:
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile.id, current_user.id


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="Get patient notifications",
    description="Retrieve paginated in-app notifications for the authenticated patient with optional unread filter.",
)
def list_notifications(
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    limit: int = Query(50, ge=1, le=100, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    patient_info: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    patient_id, _ = patient_info
    items, total_count, unread_count = get_patient_notifications(
        db=db,
        patient_id=patient_id,
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )
    return NotificationListResponse(
        total_count=total_count,
        unread_count=unread_count,
        items=[NotificationResponse.model_validate(item) for item in items],
    )


@router.get(
    "/unread-count",
    response_model=NotificationUnreadCountResponse,
    summary="Get unread notification count",
    description="Get the total number of unread in-app notifications for the authenticated patient.",
)
def get_unread_count(
    patient_info: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    patient_id, _ = patient_info
    count = get_unread_notification_count(db=db, patient_id=patient_id)
    return NotificationUnreadCountResponse(unread_count=count)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark single notification as read",
    description="Mark a specific notification as read. Enforces patient ownership and is idempotent.",
)
def mark_read(
    notification_id: uuid.UUID,
    patient_info: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    patient_id, _ = patient_info
    notification = mark_notification_as_read(
        db=db,
        patient_id=patient_id,
        notification_id=notification_id,
    )
    return NotificationResponse.model_validate(notification)


@router.patch(
    "/read-all",
    response_model=NotificationUnreadCountResponse,
    summary="Mark all notifications as read",
    description="Mark all unread in-app notifications as read for the authenticated patient.",
)
def mark_all_read(
    patient_info: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    patient_id, _ = patient_info
    mark_all_notifications_as_read(db=db, patient_id=patient_id)
    return NotificationUnreadCountResponse(unread_count=0)


@router.post(
    "/generate",
    summary="Generate in-app notifications for due and missed doses",
    description="Evaluates active schedules for the authenticated patient and generates MEDICATION_DUE and MISSED_DOSE in-app alerts safely without duplicates.",
)
def trigger_generation(
    grace_minutes: int = Query(60, ge=0, description="Grace period in minutes before generating missed dose alert"),
    patient_info: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    patient_id, _ = patient_info
    result = generate_patient_notifications(
        db=db,
        patient_id=patient_id,
        grace_minutes=grace_minutes,
    )
    return result


@router.get(
    "/preferences",
    response_model=NotificationPreferenceResponse,
    summary="Get in-app notification preferences",
    description="Retrieve the current in-app notification preferences for the authenticated patient.",
)
def get_preferences(
    patient_info: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    patient_id, _ = patient_info
    prefs = get_notification_preferences(db=db, patient_id=patient_id)
    return NotificationPreferenceResponse.model_validate(prefs)


@router.patch(
    "/preferences",
    response_model=NotificationPreferenceResponse,
    summary="Update in-app notification preferences",
    description="Update one or more in-app notification preferences for the authenticated patient.",
)
def update_preferences(
    updates: NotificationPreferenceUpdate,
    patient_info: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    patient_id, _ = patient_info
    prefs = update_notification_preferences(db=db, patient_id=patient_id, updates=updates)
    return NotificationPreferenceResponse.model_validate(prefs)


