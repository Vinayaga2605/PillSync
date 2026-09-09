from datetime import date
from datetime import datetime
from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.module7 import SystemLog
from app.models.module7 import LoginHistory
from app.models.module7 import NotificationLog
from app.models.module7 import AdherenceReport
from app.models.module7 import RefillPrediction
from app.models.module7 import OCRUpload
from app.models.module7 import MedicalCondition


def log_action(
    db: Session,
    user_id=None,
    action="generic",
    entity=None,
    entity_id=None,
    details=None
):
    entry = SystemLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        details=details,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def record_login(
    db: Session,
    user_id=None,
    email=None,
    role=None,
    success=True,
    ip_address=None
):
    entry = LoginHistory(
        user_id=user_id,
        email=email,
        role=role,
        success=1 if success else 0,
        ip_address=ip_address,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def log_notification(
    db: Session,
    user_id=None,
    channel="push",
    type="reminder",
    status="sent",
    message=None
):
    entry = NotificationLog(
        user_id=user_id,
        channel=channel,
        type=type,
        status=status,
        message=message,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_system_logs(db: Session, limit=200, action=None):
    query = db.query(SystemLog)
    if action:
        query = query.filter(SystemLog.action == action)
    return query.order_by(SystemLog.created_at.desc()).limit(limit).all()


def get_login_history(db: Session, limit=100):
    return (
        db.query(LoginHistory)
        .order_by(LoginHistory.created_at.desc())
        .limit(limit)
        .all()
    )


def get_notification_logs(db: Session, limit=200, channel=None, status=None):
    query = db.query(NotificationLog)
    if channel:
        query = query.filter(NotificationLog.channel == channel)
    if status:
        query = query.filter(NotificationLog.status == status)
    return query.order_by(NotificationLog.created_at.desc()).limit(limit).all()


def get_ocr_uploads(db: Session, limit=50):
    return (
        db.query(OCRUpload)
        .order_by(OCRUpload.created_at.desc())
        .limit(limit)
        .all()
    )


def create_refill_prediction(
    db: Session,
    patient_id,
    medicine_id,
    schedule_id,
    remaining_qty,
    daily_consumption,
    remaining_days,
    predicted_refill_date,
    status
):
    prediction = RefillPrediction(
        patient_id=patient_id,
        medicine_id=medicine_id,
        schedule_id=schedule_id,
        remaining_qty=remaining_qty,
        daily_consumption=daily_consumption,
        remaining_days=remaining_days,
        predicted_refill_date=predicted_refill_date,
        status=status,
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


def get_refill_predictions(db: Session, limit=100):
    return (
        db.query(RefillPrediction)
        .order_by(RefillPrediction.predicted_refill_date.asc())
        .limit(limit)
        .all()
    )


def get_conditions_for_patient(db: Session, patient_id):
    return (
        db.query(MedicalCondition)
        .filter(MedicalCondition.patient_id == patient_id)
        .all()
    )
