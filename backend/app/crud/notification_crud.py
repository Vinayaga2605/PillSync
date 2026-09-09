from sqlalchemy.orm import Session

from app.models.notification import Notification


def create_notification(
    db: Session,
    user_id: int,
    message: str,
    type: str = "alert",
    patient_id=None
):
    notification = Notification(
        user_id=user_id,
        patient_id=patient_id,
        type=type,
        message=message,
        is_read=False
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


def get_notifications(
    db: Session,
    user_id: int
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )


def mark_notifications_read(
    db: Session,
    user_id: int
):
    db.query(Notification).filter(
        Notification.user_id == user_id
    ).update({"is_read": True})

    db.commit()
