import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Union
from sqlalchemy.orm import Session
from sqlalchemy import select, func, update
from fastapi import HTTPException, status

from app.models.notification import Notification, NotificationPreference
from app.models.schedule import MedicationDoseEvent
from app.schemas.notification import NotificationType, NotificationPreferenceUpdate


def create_notification(
    db: Session,
    patient_id: uuid.UUID,
    notification_type: Union[NotificationType, str],
    title: str,
    message: str,
    related_dose_event_id: Optional[uuid.UUID] = None,
    related_medicine_id: Optional[uuid.UUID] = None,
    recipient_user_id: Optional[uuid.UUID] = None,
) -> Notification:
    """
    Create an in-app notification for a patient.
    Safely handles duplicate notifications for the same dose event and notification type.
    """
    type_str = notification_type.value if isinstance(notification_type, NotificationType) else str(notification_type)

    # Check if notification already exists for the given dose event and type
    if related_dose_event_id:
        existing = db.execute(
            select(Notification).where(
                Notification.related_dose_event_id == related_dose_event_id,
                Notification.type == type_str,
            )
        ).scalar_one_or_none()
        if existing:
            return existing

    notification = Notification(
        patient_id=patient_id,
        recipient_user_id=recipient_user_id,
        type=type_str,
        title=title,
        message=message,
        related_dose_event_id=related_dose_event_id,
        related_medicine_id=related_medicine_id,
        is_read=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_patient_notifications(
    db: Session,
    patient_id: uuid.UUID,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[Notification], int, int]:
    """
    Retrieve paginated notifications for the authenticated patient.
    Returns: (items, total_count, unread_count)
    """
    # Total count for the patient
    base_query = select(Notification).where(Notification.patient_id == patient_id)

    if unread_only:
        filtered_query = base_query.where(Notification.is_read.is_(False))
    else:
        filtered_query = base_query

    # Count filtered items
    total_count_query = select(func.count()).select_from(filtered_query.subquery())
    total_count = db.execute(total_count_query).scalar() or 0

    # Unread count (always total unread for the patient)
    unread_count_query = select(func.count()).where(
        Notification.patient_id == patient_id,
        Notification.is_read.is_(False),
    )
    unread_count = db.execute(unread_count_query).scalar() or 0

    # Fetch paginated items
    items_query = (
        filtered_query
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    items = db.execute(items_query).scalars().all()

    return list(items), total_count, unread_count


def get_unread_notification_count(
    db: Session,
    patient_id: uuid.UUID,
) -> int:
    """
    Get the total number of unread notifications for a patient.
    """
    query = select(func.count()).where(
        Notification.patient_id == patient_id,
        Notification.is_read.is_(False),
    )
    count = db.execute(query).scalar()
    return count or 0


def mark_notification_as_read(
    db: Session,
    patient_id: uuid.UUID,
    notification_id: uuid.UUID,
) -> Notification:
    """
    Mark a single notification as read for the authenticated patient.
    Enforces strict ownership: returns 404 if notification belongs to another patient or does not exist.
    Idempotent: safe if already read.
    """
    notification = db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.patient_id == patient_id,
        )
    ).scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)

    return notification


def mark_all_notifications_as_read(
    db: Session,
    patient_id: uuid.UUID,
) -> int:
    """
    Mark all unread notifications as read for the authenticated patient.
    Returns the number of notifications updated.
    """
    now = datetime.now(timezone.utc)
    stmt = (
        update(Notification)
        .where(
            Notification.patient_id == patient_id,
            Notification.is_read.is_(False),
        )
        .values(
            is_read=True,
            read_at=now,
        )
    )
    result = db.execute(stmt)
    db.commit()
    return result.rowcount or 0


def create_dose_notification_if_not_exists(
    db: Session,
    patient_id: uuid.UUID,
    dose_event_id: uuid.UUID,
    medicine_id: Optional[uuid.UUID],
    medicine_name: str,
    notification_type: NotificationType = NotificationType.MEDICATION_DUE,
) -> Optional[Notification]:
    """
    Helper integration to generate an in-app notification from a medication dose event.
    Guarantees no duplicates for the same dose event.
    """
    if notification_type == NotificationType.MEDICATION_DUE:
        title = "Medication Due"
        message = f"Your {medicine_name} dose is due now."
    elif notification_type == NotificationType.MISSED_DOSE:
        title = "Missed Dose"
        message = f"You missed your scheduled dose for {medicine_name}."
    elif notification_type == NotificationType.MEDICATION_UPCOMING:
        title = "Upcoming Medication"
        message = f"You have an upcoming dose for {medicine_name}."
    else:
        title = "Medication Alert"
        message = f"Notification for {medicine_name}."

    return create_notification(
        db=db,
        patient_id=patient_id,
        notification_type=notification_type,
        title=title,
        message=message,
        related_dose_event_id=dose_event_id,
        related_medicine_id=medicine_id,
    )


def get_notification_preferences(
    db: Session,
    patient_id: uuid.UUID,
) -> NotificationPreference:
    """
    Retrieves the notification preferences for the authenticated patient.
    If no preference record exists yet, creates and persists a default preference record (all True).
    """
    pref = db.execute(
        select(NotificationPreference).where(
            NotificationPreference.patient_id == patient_id
        )
    ).scalar_one_or_none()

    if not pref:
        pref = NotificationPreference(
            patient_id=patient_id,
            medication_due_enabled=True,
            missed_dose_enabled=True,
            medication_upcoming_enabled=True,
            system_enabled=True,
        )
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return pref


def update_notification_preferences(
    db: Session,
    patient_id: uuid.UUID,
    updates: NotificationPreferenceUpdate,
) -> NotificationPreference:
    """
    Updates one or more notification preferences for the authenticated patient.
    Idempotent and does not overwrite untouched fields.
    """
    pref = get_notification_preferences(db, patient_id)

    if updates.medication_due_enabled is not None:
        pref.medication_due_enabled = updates.medication_due_enabled
    if updates.missed_dose_enabled is not None:
        pref.missed_dose_enabled = updates.missed_dose_enabled
    if updates.medication_upcoming_enabled is not None:
        pref.medication_upcoming_enabled = updates.medication_upcoming_enabled
    if updates.system_enabled is not None:
        pref.system_enabled = updates.system_enabled

    db.commit()
    db.refresh(pref)
    return pref

