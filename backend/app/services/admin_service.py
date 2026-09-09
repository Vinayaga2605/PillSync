from datetime import date
from datetime import datetime
from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.medicine import Medicine
from app.models.medication_schedule import MedicationSchedule
from app.models.medication_log import MedicationLog
from app.models.notification import Notification
from app.models.caregiver import CaregiverPatient
from app.models.module7 import SystemLog
from app.models.module7 import LoginHistory
from app.models.module7 import NotificationLog
from app.models.module7 import AdherenceReport
from app.models.module7 import RefillPrediction
from app.models.module7 import OCRUpload
from app.models.module7 import MedicalCondition

from app.services.medication_service import get_patient_schedule
from app.services.medication_service import TIME_LABELS

from app.crud.module7_crud import get_system_logs
from app.crud.module7_crud import get_login_history

from app.utils.adherence import calculate_adherence


def count_users(db, role=None):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.count()


def dashboard_stats(db):
    today = date.today()

    users = count_users(db)
    patients = count_users(db, "patient")
    caregivers = count_users(db, "caregiver")
    admins = count_users(db, "admin")

    medicines = db.query(Medicine).count()

    active_schedules = (
        db.query(MedicationSchedule)
        .filter(MedicationSchedule.is_active == True)  # noqa: E712
        .all()
    )
    scheduled = len(active_schedules)

    taken_today = (
        db.query(MedicationLog)
        .filter(
            MedicationLog.log_date == today,
            MedicationLog.taken == True,  # noqa: E712
        )
        .count()
    )

    missed = max(scheduled - taken_today, 0)

    low_stock = (
        db.query(Medicine)
        .filter(Medicine.stock_quantity <= Medicine.reorder_level)
        .all()
    )

    upcoming_refills = (
        db.query(RefillPrediction)
        .filter(
            RefillPrediction.predicted_refill_date >= datetime.now()
        )
        .order_by(RefillPrediction.predicted_refill_date.asc())
        .limit(10)
        .all()
    )

    notifications_today = (
        db.query(Notification)
        .filter(
            func.date(Notification.created_at) == today
        )
        .count()
    )

    return {
        "users": users,
        "patients": patients,
        "caregivers": caregivers,
        "admins": admins,
        "medicines": medicines,
        "scheduled_doses": scheduled,
        "taken_today": taken_today,
        "missed_today": missed,
        "low_stock_medicines": [
            {
                "id": m.id,
                "name": m.name,
                "stock_quantity": m.stock_quantity,
                "reorder_level": m.reorder_level,
            }
            for m in low_stock
        ],
        "upcoming_refills": [
            {
                "id": r.id,
                "patient_id": r.patient_id,
                "medicine_id": r.medicine_id,
                "remaining_qty": r.remaining_qty,
                "remaining_days": r.remaining_days,
                "predicted_refill_date": str(r.predicted_refill_date)[:10],
                "status": r.status,
            }
            for r in upcoming_refills
        ],
        "notifications_today": notifications_today,
    }


def system_status(db):
    stats = dashboard_stats(db)

    scheduled = stats["scheduled_doses"]
    missed = stats["missed_today"]
    missed_pct = round((missed / scheduled) * 100) if scheduled else 0

    pending = (
        db.query(Notification)
        .filter(Notification.is_read == False)  # noqa: E712
        .count()
    )

    # DB connectivity check
    db_ok = True
    try:
        db.execute(func.current_date())
    except Exception:
        db_ok = False

    api_ok = True

    score = 0
    reasons = []

    if not db_ok:
        score += 3
        reasons.append("Database connectivity failed")
    if not api_ok:
        score += 2
        reasons.append("API availability degraded")
    if pending > 20:
        score += 1
        reasons.append(f"{pending} pending notifications")
    if missed_pct >= 50:
        score += 2
        reasons.append(f"Missed dose rate {missed_pct}%")
    elif missed_pct >= 25:
        score += 1
        reasons.append(f"Missed dose rate {missed_pct}%")

    if score >= 4:
        status = "Critical"
    elif score >= 2:
        status = "Warning"
    else:
        status = "Healthy"

    return {
        "status": status,
        "db_connected": db_ok,
        "api_available": api_ok,
        "pending_notifications": pending,
        "missed_dose_pct": missed_pct,
        "missed_dose_count": missed,
        "scheduled_doses": scheduled,
        "score": score,
        "reasons": reasons,
    }


def recent_activity(db, limit=12):
    events = []

    logs = (
        db.query(SystemLog)
        .order_by(SystemLog.created_at.desc())
        .limit(limit)
        .all()
    )
    for log in logs:
        events.append({
            "type": log.action,
            "entity": log.entity,
            "details": log.details,
            "timestamp": str(log.created_at),
        })

    logins = get_login_history(db, limit)
    for login in logins:
        events.append({
            "type": "login",
            "entity": "User",
            "details": f"{login.email} ({login.role}) logged in",
            "timestamp": str(login.created_at),
        })

    ocr = (
        db.query(OCRUpload)
        .order_by(OCRUpload.created_at.desc())
        .limit(limit)
        .all()
    )
    for item in ocr:
        events.append({
            "type": "ocr_upload",
            "entity": "Prescription",
            "details": f"{item.filename} processed in {item.processing_time_ms}ms",
            "timestamp": str(item.created_at),
        })

    meds = (
        db.query(Medicine)
        .order_by(Medicine.created_at.desc())
        .limit(limit)
        .all()
    )
    for med in meds:
        events.append({
            "type": "medicine_added",
            "entity": "Medicine",
            "details": f"{med.name} ({med.brand}) added to database",
            "timestamp": str(med.created_at),
        })

    assignments = (
        db.query(CaregiverPatient)
        .order_by(CaregiverPatient.created_at.desc())
        .limit(limit)
        .all()
    )
    for assign in assignments:
        caregiver = db.query(User).filter(User.id == assign.caregiver_id).first()
        patient = db.query(User).filter(User.id == assign.patient_id).first()
        events.append({
            "type": "caregiver_assignment",
            "entity": "Assignment",
            "details": (
                f"{caregiver.full_name if caregiver else 'Caregiver'} assigned "
                f"to {patient.full_name if patient else 'patient'}"
            ),
            "timestamp": str(assign.created_at),
        })

    events.sort(key=lambda e: e["timestamp"], reverse=True)

    return events[:limit]


def refill_engine(db, medicine_id=None):
    query = db.query(Medicine)
    if medicine_id:
        query = query.filter(Medicine.id == medicine_id)
    medicines = query.order_by(Medicine.name.asc()).all()

    since = date.today() - timedelta(days=14)
    results = []

    for med in medicines:
        schedule_ids = [
            s.id for s in db.query(MedicationSchedule).filter(
                MedicationSchedule.medicine_id == med.id,
                MedicationSchedule.is_active == True,  # noqa: E712
            ).all()
        ]

        consumed_14d = 0
        if schedule_ids:
            consumed_14d = db.query(MedicationLog).filter(
                MedicationLog.schedule_id.in_(schedule_ids),
                MedicationLog.log_date >= since,
                MedicationLog.taken == True,  # noqa: E712
            ).count()

        daily_consumption = max(round(consumed_14d / 14.0), 0) or 1
        available_qty = med.stock_quantity or 0
        remaining_days = max(available_qty // daily_consumption, 0)
        predicted_date = datetime.now() + timedelta(days=remaining_days)

        if remaining_days <= 3:
            status = "critical"
        elif remaining_days <= 10:
            status = "warning"
        else:
            status = "healthy"

        results.append({
            "medicine_id": med.id,
            "medicine_name": med.name,
            "brand": med.brand,
            "category": med.category,
            "available_qty": available_qty,
            "reorder_level": med.reorder_level or 0,
            "daily_consumption": daily_consumption,
            "remaining_days": remaining_days,
            "predicted_refill_date": predicted_date.strftime("%Y-%m-%d"),
            "status": status,
        })

    return results


def adherence_series(db, period="daily", days=7):
    today = date.today()
    points = []

    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        scheduled = (
            db.query(MedicationSchedule)
            .filter(MedicationSchedule.is_active == True)  # noqa: E712
            .count()
        )
        taken = (
            db.query(MedicationLog)
            .filter(
                MedicationLog.log_date == day,
                MedicationLog.taken == True,  # noqa: E712
            )
            .count()
        )
        stats = calculate_adherence(scheduled, taken)
        points.append({
            "label": day.strftime("%a"),
            "date": str(day),
            "scheduled": stats["scheduled"],
            "taken": stats["taken"],
            "missed": stats["missed"],
            "adherence": stats["adherence_percentage"],
        })

    return points


def medicine_usage(db):
    rows = (
        db.query(
            Medicine.name,
            func.count(MedicationLog.id).label("uses")
        )
        .join(MedicationSchedule, MedicationSchedule.medicine_id == Medicine.id)
        .join(MedicationLog, MedicationLog.schedule_id == MedicationSchedule.id)
        .group_by(Medicine.name)
        .order_by(func.count(MedicationLog.id).desc())
        .all()
    )

    return [{"medicine": name, "uses": uses} for name, uses in rows]


def notification_trend(db, days=7):
    today = date.today()
    points = []

    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        sent = (
            db.query(Notification)
            .filter(func.date(Notification.created_at) == day)
            .count()
        )
        log_sent = (
            db.query(NotificationLog)
            .filter(
                func.date(NotificationLog.created_at) == day,
                NotificationLog.status == "sent",
            )
            .count()
        )
        log_failed = (
            db.query(NotificationLog)
            .filter(
                func.date(NotificationLog.created_at) == day,
                NotificationLog.status == "failed",
            )
            .count()
        )
        points.append({
            "label": day.strftime("%a"),
            "date": str(day),
            "sent": sent + log_sent,
            "failed": log_failed,
        })

    return points


def adherence_series_by_period(db, period="daily", days=7):
    today = date.today()
    points = []
    step = timedelta(days=1)
    total_days = days
    label_fmt = "%a"

    if period == "weekly":
        total_days = 6
        label_fmt = "%d %b"
    elif period == "monthly":
        total_days = 4
        label_fmt = "%b"

    for offset in range(total_days - 1, -1, -1):
        if period == "daily":
            start = today - timedelta(days=offset)
            end = start + step
            label = start.strftime("%a")
        elif period == "weekly":
            start = today - timedelta(days=offset * 7)
            end = min(start + timedelta(days=7), today + step)
            label = start.strftime(label_fmt)
        else:
            start = today - timedelta(days=offset * 30)
            end = min(start + timedelta(days=30), today + step)
            label = start.strftime(label_fmt)

        scheduled = (
            db.query(MedicationSchedule)
            .filter(MedicationSchedule.is_active == True)  # noqa: E712
            .count()
        )
        taken = (
            db.query(MedicationLog)
            .filter(
                MedicationLog.log_date >= start,
                MedicationLog.log_date < end,
                MedicationLog.taken == True,  # noqa: E712
            )
            .count()
        )
        stats = calculate_adherence(scheduled, taken)
        points.append({
            "label": label,
            "date": str(start),
            "scheduled": stats["scheduled"],
            "taken": stats["taken"],
            "missed": stats["missed"],
            "adherence": stats["adherence_percentage"],
        })

    return points


def missed_dose_trend(db, days=7):
    today = date.today()
    points = []

    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        scheduled = (
            db.query(MedicationSchedule)
            .filter(MedicationSchedule.is_active == True)  # noqa: E712
            .count()
        )
        taken = (
            db.query(MedicationLog)
            .filter(
                MedicationLog.log_date == day,
                MedicationLog.taken == True,  # noqa: E712
            )
            .count()
        )
        missed = max(scheduled - taken, 0)
        pct = round((missed / scheduled) * 100) if scheduled else 0
        points.append({
            "label": day.strftime("%a"),
            "date": str(day),
            "missed": missed,
            "missed_pct": pct,
        })

    return points


def refill_prediction_trend(db, days=7):
    today = date.today()
    points = []

    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        created = (
            db.query(RefillPrediction)
            .filter(func.date(RefillPrediction.created_at) == day)
            .count()
        )
        critical = (
            db.query(RefillPrediction)
            .filter(
                func.date(RefillPrediction.created_at) == day,
                RefillPrediction.status == "critical",
            )
            .count()
        )
        points.append({
            "label": day.strftime("%a"),
            "date": str(day),
            "predictions": created,
            "critical": critical,
        })

    return points


def reminder_success_rate(db, days=7):
    today = date.today()
    points = []

    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        sent = (
            db.query(NotificationLog)
            .filter(
                func.date(NotificationLog.created_at) == day,
                NotificationLog.status == "sent",
            )
            .count()
        )
        failed = (
            db.query(NotificationLog)
            .filter(
                func.date(NotificationLog.created_at) == day,
                NotificationLog.status == "failed",
            )
            .count()
        )
        total = sent + failed
        rate = round((sent / total) * 100) if total else 0
        points.append({
            "label": day.strftime("%a"),
            "date": str(day),
            "sent": sent,
            "failed": failed,
            "success_rate": rate,
        })

    return points


def patients_by_disease(db):
    rows = (
        db.query(
            MedicalCondition.condition,
            func.count(MedicalCondition.id).label("total"),
        )
        .group_by(MedicalCondition.condition)
        .order_by(func.count(MedicalCondition.id).desc())
        .all()
    )

    return [{"disease": condition, "patients": total} for condition, total in rows]
