from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth_dependency import get_current_user

from app.schemas.notification_schema import NotificationOut

from app.crud.notification_crud import get_notifications
from app.crud.notification_crud import mark_notifications_read
from app.crud.module7_crud import log_notification

from app.models.notification import Notification
from app.models.user import User

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"]
)


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return get_notifications(db, user.id)


@router.post("/read")
def read_all(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    mark_notifications_read(db, user.id)
    return {"message": "Notifications marked as read"}


@router.post("/{notification_id}/read")
def read_one(
    notification_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )

    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()

    return {"message": "Notification marked as read"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )

    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()

    return {"message": "Notification deleted"}


@router.post("/broadcast")
def broadcast(
    message: str,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not message.strip():
        raise HTTPException(status_code=400, detail="Message is required")

    recipients = db.query(User).filter(User.is_active == True).all()  # noqa: E712

    created = 0
    for recipient in recipients:
        db.add(Notification(
            user_id=recipient.id,
            type="broadcast",
            message=message.strip(),
            is_read=False,
        ))
        created += 1

    db.commit()

    log_notification(
        db,
        user_id=user.id,
        channel="push",
        type="broadcast",
        status="sent",
        message=f"Broadcast sent to {created} users: {message.strip()}",
    )

    return {"message": f"Broadcast sent to {created} user(s)"}
