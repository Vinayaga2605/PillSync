from datetime import date
from datetime import datetime
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query

from pydantic import BaseModel

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth_dependency import require_role

from app.models.user import User
from app.models.medicine import Medicine
from app.models.patient import PatientProfile
from app.models.caregiver import CaregiverPatient
from app.models.medication_schedule import MedicationSchedule
from app.models.medication_log import MedicationLog
from app.models.notification import Notification
from app.models.module7 import SystemLog
from app.models.module7 import LoginHistory
from app.models.module7 import NotificationLog
from app.models.module7 import AdherenceReport
from app.models.module7 import RefillPrediction
from app.models.module7 import OCRUpload
from app.models.module7 import MedicalCondition

from app.services.medication_service import get_patient_schedule
from app.services.medication_service import TIME_LABELS

from app.services.admin_service import dashboard_stats
from app.services.admin_service import system_status
from app.services.admin_service import recent_activity
from app.services.admin_service import refill_engine
from app.services.admin_service import adherence_series
from app.services.admin_service import adherence_series_by_period
from app.services.admin_service import medicine_usage
from app.services.admin_service import notification_trend
from app.services.admin_service import missed_dose_trend
from app.services.admin_service import refill_prediction_trend
from app.services.admin_service import reminder_success_rate
from app.services.admin_service import patients_by_disease

from app.services.report_service import generate_report
from app.services.report_service import REPORT_TYPES

from app.crud.module7_crud import log_action
from app.crud.module7_crud import get_system_logs
from app.crud.module7_crud import get_ocr_uploads
from app.crud.module7_crud import get_refill_predictions
from app.crud.module7_crud import get_conditions_for_patient
from app.crud.module7_crud import get_notification_logs

from app.utils.exporters import export_response
from app.utils.password import hash_password
from app.utils.adherence import calculate_adherence

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin Panel"],
    dependencies=[Depends(require_role("admin"))]
)


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserEdit(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None


class CaregiverAssign(BaseModel):
    caregiver_id: int


class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: str = "patient"


def serialize_user(user: User):
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": str(user.created_at) if user.created_at else None,
    }


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    stats = dashboard_stats(db)
    status = system_status(db)
    activity = recent_activity(db)

    daily_series = adherence_series(db, "daily", 7)
    valid = [p["adherence"] for p in daily_series if p["adherence"] is not None]
    avg_7d = round(sum(valid) / len(valid)) if valid else None

    return {
        "stats": stats,
        "status": status,
        "recent_activity": activity,
        "adherence_7d": avg_7d,
    }


@router.get("/users")
def list_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    gender: Optional[str] = None,
    blood_group: Optional[str] = None,
    min_age: Optional[int] = Query(None, ge=0, le=130),
    max_age: Optional[int] = Query(None, ge=0, le=130),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    query = db.query(User)

    if search:
        pattern = f"%{search.lower()}%"
        query = query.filter(
            (
                func.lower(User.full_name).like(pattern)
                | func.lower(User.email).like(pattern)
            )
        )

    if role:
        query = query.filter(User.role == role)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if gender or blood_group or min_age is not None or max_age is not None:
        query = query.join(PatientProfile, PatientProfile.user_id == User.id)
        if gender:
            query = query.filter(PatientProfile.gender == gender)
        if blood_group:
            query = query.filter(PatientProfile.blood_group == blood_group)
        if min_age is not None or max_age is not None:
            today = date.today()
            if min_age is not None:
                oldest = today.replace(year=today.year - min_age)
                query = query.filter(PatientProfile.dob <= oldest)
            if max_age is not None:
                youngest = today.replace(year=today.year - max_age)
                query = query.filter(PatientProfile.dob >= youngest)

    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "users": [serialize_user(u) for u in users],
    }


@router.get("/users/export")
def export_users(
    fmt: str = Query("csv", pattern="^(csv|xlsx)$"),
    search: Optional[str] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    query = db.query(User)

    if search:
        pattern = f"%{search.lower()}%"
        query = query.filter(func.lower(User.full_name).like(pattern))

    if role:
        query = query.filter(User.role == role)

    users = query.order_by(User.full_name.asc()).all()

    headers = ["ID", "Full Name", "Email", "Phone", "Role", "Status"]
    rows = [
        [
            u.id,
            u.full_name,
            u.email,
            u.phone or "",
            u.role,
            "Active" if u.is_active else "Inactive",
        ]
        for u in users
    ]

    return export_response(fmt, headers, rows, "pillsync_users")


@router.get("/users/{user_id}")
def user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    data = serialize_user(user)

    if user.role != "patient":
        return data

    profile = db.query(PatientProfile).filter(
        PatientProfile.user_id == user.id
    ).first()

    assignment = (
        db.query(CaregiverPatient, User)
        .join(User, User.id == CaregiverPatient.caregiver_id)
        .filter(CaregiverPatient.patient_id == user.id)
        .first()
    )

    caregiver = None
    if assignment:
        assigned, caregiver_user = assignment
        caregiver = {
            "id": caregiver_user.id,
            "full_name": caregiver_user.full_name,
            "email": caregiver_user.email,
            "phone": caregiver_user.phone,
            "assigned_at": str(assigned.created_at) if assigned.created_at else None,
        }

    schedule = get_patient_schedule(db, user.id)

    taken = sum(1 for item in schedule if item["taken"])
    total = len(schedule)
    stats = calculate_adherence(total, taken)

    # 14-day adherence history
    history = []
    since = date.today()
    for offset in range(13, -1, -1):
        day = since - timedelta(days=offset)
        taken_day = (
            db.query(MedicationLog)
            .filter(
                MedicationLog.patient_id == user.id,
                MedicationLog.log_date == day,
                MedicationLog.taken == True,  # noqa: E712
            )
            .count()
        )
        total_day = (
            db.query(MedicationSchedule)
            .filter(
                MedicationSchedule.patient_id == user.id,
                MedicationSchedule.is_active == True,  # noqa: E712
            )
            .count()
        )
        day_stats = calculate_adherence(total_day, taken_day)
        history.append({
            "date": str(day),
            "taken": day_stats["taken"],
            "scheduled": day_stats["scheduled"],
            "adherence": day_stats["adherence_percentage"],
        })

    conditions = get_conditions_for_patient(db, user.id)
    predictions = (
        db.query(RefillPrediction)
        .filter(RefillPrediction.patient_id == user.id)
        .order_by(RefillPrediction.predicted_refill_date.asc())
        .all()
    )

    data["profile"] = {
        "dob": str(profile.dob) if profile and profile.dob else None,
        "gender": profile.gender if profile else None,
        "blood_group": profile.blood_group if profile else None,
        "emergency_contact": profile.emergency_contact if profile else None,
    }

    data["stats"] = {
        "total_scheduled": stats["scheduled"],
        "taken": stats["taken"],
        "missed": stats["missed"],
        "adherence_percent": stats["adherence_percentage"],
        "status": (
            "Good" if stats["adherence_percentage"] is not None and stats["adherence_percentage"] >= 80
            else "Warning" if stats["adherence_percentage"] is not None and stats["adherence_percentage"] >= 50
            else "Critical"
        ),
    }

    data["caregiver"] = caregiver
    data["medications"] = schedule
    data["history_14d"] = history
    data["conditions"] = [
        {"condition": c.condition, "severity": c.severity}
        for c in conditions
    ]
    data["refill_predictions"] = [
        {
            "id": p.id,
            "medicine_id": p.medicine_id,
            "remaining_qty": p.remaining_qty,
            "remaining_days": p.remaining_days,
            "predicted_refill_date": str(p.predicted_refill_date)[:10],
            "status": p.status,
        }
        for p in predictions
    ]

    return data


@router.post("/users")
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if data.role not in ("admin", "caregiver", "patient"):
        raise HTTPException(status_code=400, detail="Invalid role")

    user = User(
        full_name=data.full_name,
        email=data.email,
        password_hash=hash_password(data.password),
        phone=data.phone,
        role=data.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_action(
        db,
        user_id=admin.id,
        action="user_created",
        entity="User",
        entity_id=user.id,
        details=f"Admin created {data.role} {data.full_name}",
    )

    return serialize_user(user)


@router.patch("/users/{user_id}")
def edit_user(
    user_id: int,
    data: UserEdit,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if data.full_name is not None:
        if not data.full_name.strip():
            raise HTTPException(status_code=400, detail="Full name is required")
        user.full_name = data.full_name.strip()

    if data.email is not None and data.email != user.email:
        conflict = db.query(User).filter(User.email == data.email).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = data.email

    if data.phone is not None:
        user.phone = data.phone.strip() or None

    if data.role is not None:
        if data.role not in ("admin", "caregiver", "patient"):
            raise HTTPException(status_code=400, detail="Invalid role")
        old_role = user.role
        user.role = data.role
        log_action(
            db,
            user_id=admin.id,
            action="role_changed",
            entity="User",
            entity_id=user.id,
            details=f"{user.full_name} role changed {old_role} -> {data.role}",
        )

    db.commit()
    db.refresh(user)

    log_action(
        db,
        user_id=admin.id,
        action="user_updated",
        entity="User",
        entity_id=user.id,
        details=f"Admin updated {user.full_name}",
    )

    return serialize_user(user)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    db.delete(user)
    db.commit()

    log_action(
        db,
        user_id=admin.id,
        action="user_deleted",
        entity="User",
        entity_id=user_id,
        details=f"Admin deleted {user.full_name}",
    )

    return {"message": "User deleted successfully"}


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = data.is_active
    db.commit()

    log_action(
        db,
        user_id=admin.id,
        action="user_status",
        entity="User",
        entity_id=user.id,
        details=f"{user.full_name} {'enabled' if data.is_active else 'disabled'}",
    )

    return {
        "id": user.id,
        "is_active": user.is_active,
        "message": "User status updated"
    }


@router.post("/users/{patient_id}/assign-caregiver")
def assign_caregiver(
    patient_id: int,
    data: CaregiverAssign,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    patient = db.query(User).filter(User.id == patient_id).first()
    caregiver = db.query(User).filter(User.id == data.caregiver_id).first()

    if not patient or patient.role != "patient":
        raise HTTPException(status_code=404, detail="Patient not found")

    if not caregiver or caregiver.role != "caregiver":
        raise HTTPException(status_code=404, detail="Caregiver not found")

    existing = (
        db.query(CaregiverPatient)
        .filter(
            CaregiverPatient.caregiver_id == caregiver.id,
            CaregiverPatient.patient_id == patient.id,
        )
        .first()
    )

    if existing is None:
        db.add(CaregiverPatient(
            caregiver_id=caregiver.id,
            patient_id=patient.id,
        ))
        db.commit()

    log_action(
        db,
        user_id=admin.id,
        action="caregiver_assigned",
        entity="CaregiverPatient",
        details=f"{caregiver.full_name} assigned to {patient.full_name}",
    )

    return {"message": "Caregiver assigned successfully"}


@router.delete("/users/{patient_id}/assign-caregiver")
def remove_caregiver(
    patient_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    assignment = (
        db.query(CaregiverPatient)
        .filter(CaregiverPatient.patient_id == patient_id)
        .all()
    )

    for item in assignment:
        db.delete(item)

    db.commit()

    log_action(
        db,
        user_id=admin.id,
        action="caregiver_removed",
        entity="CaregiverPatient",
        entity_id=patient_id,
        details=f"Caregiver removed from patient #{patient_id}",
    )

    return {"message": "Caregiver removed successfully"}


@router.get("/reports")
def reports_list(
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    return {"report_types": REPORT_TYPES}


@router.get("/reports/{report_type}")
def get_report(
    report_type: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    try:
        start = date.fromisoformat(start_date) if start_date else None
        end = date.fromisoformat(end_date) if end_date else None
        headers, rows = generate_report(db, report_type, start, end)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "report_type": report_type,
        "start_date": str(start) if start else None,
        "end_date": str(end) if end else None,
        "headers": headers,
        "rows": rows,
    }


@router.get("/reports/{report_type}/export")
def export_report(
    report_type: str,
    fmt: str = Query("csv", pattern="^(csv|xlsx|pdf)$"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    try:
        start = date.fromisoformat(start_date) if start_date else None
        end = date.fromisoformat(end_date) if end_date else None
        headers, rows = generate_report(db, report_type, start, end)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return export_response(fmt, headers, rows, f"pillsync_{report_type}_report")


@router.get("/analytics")
def system_analytics(
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    user_count = db.query(User).count()
    patient_count = db.query(User).filter(User.role == "patient").count()
    caregiver_count = db.query(User).filter(User.role == "caregiver").count()
    admin_count = db.query(User).filter(User.role == "admin").count()

    medicine_count = db.query(Medicine).count()
    schedule_count = db.query(MedicationSchedule).filter(
        MedicationSchedule.is_active == True  # noqa: E712
    ).count()

    today = date.today()

    logs_today = db.query(MedicationLog).filter(
        MedicationLog.log_date == today
    ).count()

    taken_today = db.query(MedicationLog).filter(
        MedicationLog.log_date == today,
        MedicationLog.taken == True  # noqa: E712
    ).count()

    missed_today = schedule_count - logs_today

    notification_count = db.query(Notification).count()
    unread_count = db.query(Notification).filter(
        Notification.is_read == False  # noqa: E712
    ).count()

    by_role = [
        {"role": "patients", "count": patient_count},
        {"role": "caregivers", "count": caregiver_count},
        {"role": "admins", "count": admin_count},
    ]

    return {
        "users": user_count,
        "patients": patient_count,
        "caregivers": caregiver_count,
        "admins": admin_count,
        "medicines": medicine_count,
        "schedules": schedule_count,
        "doses_today": logs_today,
        "taken_today": taken_today,
        "missed_today": max(missed_today, 0),
        "notifications": notification_count,
        "unread_notifications": unread_count,
        "by_role": by_role,
        "time_labels": TIME_LABELS,
        "adherence_daily": adherence_series(db, "daily", 7),
        "adherence_weekly": adherence_series_by_period(db, "weekly", 7),
        "adherence_monthly": adherence_series_by_period(db, "monthly", 4),
        "medicine_usage": medicine_usage(db),
        "notification_trend": notification_trend(db, 7),
        "missed_dose_trend": missed_dose_trend(db, 7),
        "refill_prediction_trend": refill_prediction_trend(db, 7),
        "reminder_success_rate": reminder_success_rate(db, 7),
        "patients_by_disease": patients_by_disease(db),
    }


@router.get("/refills")
def refills(
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    return refill_engine(db)


@router.get("/system-logs")
def system_logs(
    action: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    logs = get_system_logs(db, limit=limit, action=action)

    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        result.append({
            "id": log.id,
            "action": log.action,
            "entity": log.entity,
            "entity_id": log.entity_id,
            "details": log.details,
            "user_name": user.full_name if user else None,
            "created_at": str(log.created_at),
        })

    return result


@router.get("/login-history")
def login_history(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    history = (
        db.query(LoginHistory)
        .order_by(LoginHistory.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": h.id,
            "email": h.email,
            "role": h.role,
            "success": bool(h.success),
            "ip_address": h.ip_address,
            "created_at": str(h.created_at),
        }
        for h in history
    ]


@router.get("/notification-logs")
def notification_logs(
    channel: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    logs = get_notification_logs(db, limit=limit, channel=channel, status=status)

    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "channel": log.channel,
            "type": log.type,
            "status": log.status,
            "message": log.message,
            "created_at": str(log.created_at),
        }
        for log in logs
    ]


@router.get("/ocr")
def ocr_analytics(
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    uploads = get_ocr_uploads(db, limit=100)

    total = len(uploads)
    success = sum(1 for u in uploads if u.status == "success")
    failed = total - success
    avg_time = (
        round(sum(u.processing_time_ms for u in uploads) / total)
        if total
        else 0
    )

    return {
        "total_uploads": total,
        "successful": success,
        "failed": failed,
        "avg_processing_time_ms": avg_time,
        "recent": [
            {
                "id": u.id,
                "filename": u.filename,
                "status": u.status,
                "items_detected": u.items_detected,
                "processing_time_ms": u.processing_time_ms,
                "created_at": str(u.created_at),
            }
            for u in uploads[:10]
        ],
    }


@router.get("/search")
def global_search(
    q: str = Query("", min_length=1),
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    pattern = f"%{q.lower()}%"

    users = (
        db.query(User)
        .filter(
            func.lower(User.full_name).like(pattern)
            | func.lower(User.email).like(pattern)
        )
        .limit(5)
        .all()
    )
    medicines = (
        db.query(Medicine)
        .filter(func.lower(Medicine.name).like(pattern))
        .limit(5)
        .all()
    )
    notifications = (
        db.query(Notification)
        .filter(func.lower(Notification.message).like(pattern))
        .limit(5)
        .all()
    )

    return {
        "query": q,
        "users": [serialize_user(u) for u in users],
        "medicines": [
            {
                "id": m.id,
                "name": m.name,
                "brand": m.brand,
                "stock_quantity": m.stock_quantity,
            }
            for m in medicines
        ],
        "notifications": [
            {
                "id": n.id,
                "message": n.message,
                "type": n.type,
                "is_read": n.is_read,
                "created_at": str(n.created_at),
            }
            for n in notifications
        ],
    }
