from datetime import date
from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.medicine import Medicine
from app.models.medication_schedule import MedicationSchedule
from app.models.medication_log import MedicationLog
from app.models.notification import Notification
from app.models.caregiver import CaregiverPatient
from app.models.module7 import RefillPrediction
from app.models.module7 import NotificationLog
from app.models.module7 import LoginHistory
from app.models.module7 import OCRUpload
from app.models.module7 import SystemLog

from app.services.medication_service import get_patient_schedule

from app.utils.adherence import calculate_adherence
from app.utils.adherence import adherence_label

REPORT_TYPES = [
    "patient",
    "medicine",
    "adherence",
    "missed_dose",
    "caregiver",
    "refill",
    "system_usage",
    "notification",
    "weekly",
    "monthly",
]


def _date_span(start_date=None, end_date=None):
    end = end_date or date.today()
    start = start_date or (end - timedelta(days=30))
    return start, end


def _patient_adherence_rows(db):
    patients = (
        db.query(User)
        .filter(User.role == "patient")
        .order_by(User.full_name.asc())
        .all()
    )
    rows = []
    for patient in patients:
        schedule = get_patient_schedule(db, patient.id)
        taken = sum(1 for item in schedule if item["taken"])
        total = len(schedule)
        stats = calculate_adherence(total, taken)
        rows.append([
            patient.id,
            patient.full_name,
            patient.email,
            stats["scheduled"],
            stats["taken"],
            stats["missed"],
            adherence_label(stats["adherence_percentage"]),
        ])
    return rows


def generate_report(db: Session, report_type: str, start_date=None, end_date=None):
    if report_type not in REPORT_TYPES:
        raise ValueError(f"Unsupported report type: {report_type}")

    start, end = _date_span(start_date, end_date)

    if report_type == "patient":
        headers = ["ID", "Patient", "Email", "Scheduled", "Taken", "Missed", "Adherence"]
        return headers, _patient_adherence_rows(db)

    if report_type == "medicine":
        rows = (
            db.query(Medicine.name, Medicine.brand, Medicine.category,
                    Medicine.stock_quantity, Medicine.reorder_level)
            .order_by(Medicine.name.asc())
            .all()
        )
        headers = ["Medicine", "Brand", "Category", "Stock", "Reorder Level"]
        return headers, [list(r) for r in rows]

    if report_type == "adherence":
        headers = ["ID", "Patient", "Email", "Scheduled", "Taken", "Missed", "Adherence"]
        return headers, [r for r in _patient_adherence_rows(db)]

    if report_type == "missed_dose":
        data = []
        patients = (
            db.query(User)
            .filter(User.role == "patient")
            .order_by(User.full_name.asc())
            .all()
        )
        for patient in patients:
            schedule = get_patient_schedule(db, patient.id)
            missed_items = [i for i in schedule if not i["taken"]]
            total = len(schedule)
            stats = calculate_adherence(total, sum(1 for item in schedule if item["taken"]))
            missed = stats["missed"]
            pct = round((missed / stats["scheduled"]) * 100) if stats["scheduled"] else None
            data.append([
                patient.id,
                patient.full_name,
                stats["scheduled"],
                missed,
                f"{pct}%" if pct is not None else "N/A",
                ", ".join(i["time_label"] for i in missed_items[:4]) or "-",
            ])
        headers = ["ID", "Patient", "Scheduled", "Missed", "Missed %", "Times"]
        return headers, data

    if report_type == "caregiver":
        rows = []
        caregivers = (
            db.query(User)
            .filter(User.role == "caregiver")
            .order_by(User.full_name.asc())
            .all()
        )
        for caregiver in caregivers:
            assigned = (
                db.query(CaregiverPatient)
                .filter(CaregiverPatient.caregiver_id == caregiver.id)
                .count()
            )
            rows.append([
                caregiver.id,
                caregiver.full_name,
                caregiver.email,
                caregiver.phone or "-",
                assigned,
            ])
        headers = ["ID", "Caregiver", "Email", "Phone", "Assigned Patients"]
        return headers, rows

    if report_type == "refill":
        predictions = (
            db.query(RefillPrediction)
            .join(User, User.id == RefillPrediction.patient_id)
            .join(Medicine, Medicine.id == RefillPrediction.medicine_id)
            .order_by(RefillPrediction.predicted_refill_date.asc())
            .all()
        )
        headers = [
            "Patient", "Medicine", "Remaining Qty", "Daily Consumption",
            "Remaining Days", "Predicted Refill", "Status",
        ]
        data = [
            [
                f"{p.patient_id}",
                p.medicine_id,
                p.remaining_qty,
                p.daily_consumption,
                p.remaining_days,
                str(p.predicted_refill_date)[:10],
                p.status,
            ]
            for p in predictions
        ]
        return headers, data

    if report_type == "system_usage":
        headers = ["Metric", "Value"]
        total_users = db.query(User).count()
        data = [
            ["Total Users", total_users],
            ["Total Patients", db.query(User).filter(User.role == "patient").count()],
            ["Total Caregivers", db.query(User).filter(User.role == "caregiver").count()],
            ["Total Admins", db.query(User).filter(User.role == "admin").count()],
            ["Total Medicines", db.query(Medicine).count()],
            ["Active Schedules", db.query(MedicationSchedule).filter(MedicationSchedule.is_active == True).count()],  # noqa: E712
            ["Medication Logs", db.query(MedicationLog).count()],
            ["Notifications Sent", db.query(Notification).count()],
            ["Refill Predictions", db.query(RefillPrediction).count()],
            ["OCR Uploads", db.query(OCRUpload).count()],
            ["System Logs", db.query(SystemLog).count()],
            ["Login Events", db.query(LoginHistory).count()],
        ]
        return headers, data

    if report_type == "notification":
        logs = (
            db.query(NotificationLog)
            .filter(
                func.date(NotificationLog.created_at) >= start,
                func.date(NotificationLog.created_at) <= end,
            )
            .order_by(NotificationLog.created_at.desc())
            .limit(200)
            .all()
        )
        headers = ["ID", "User", "Channel", "Type", "Status", "Message", "Created"]
        data = [
            [
                log.id,
                log.user_id or "-",
                log.channel,
                log.type,
                log.status,
                (log.message or "")[:80],
                str(log.created_at)[:19],
            ]
            for log in logs
        ]
        return headers, data

    if report_type == "weekly":
        period_start = end - timedelta(days=6)
        headers = ["Day", "Date", "Scheduled", "Taken", "Missed", "Adherence %"]
        data = []
        for offset in range(6, -1, -1):
            day = end - timedelta(days=offset)
            scheduled = db.query(MedicationSchedule).filter(MedicationSchedule.is_active == True).count()  # noqa: E712
            taken = db.query(MedicationLog).filter(
                MedicationLog.log_date == day,
                MedicationLog.taken == True,  # noqa: E712
            ).count()
            stats = calculate_adherence(scheduled, taken)
            data.append([day.strftime("%a"), str(day), stats["scheduled"], stats["taken"], stats["missed"], adherence_label(stats["adherence_percentage"])])
        return headers, data

    if report_type == "monthly":
        headers = ["Week Starting", "Scheduled", "Taken", "Missed", "Adherence %"]
        data = []
        for offset in range(4, 0, -1):
            week_start = end - timedelta(days=offset * 7)
            week_end = week_start + timedelta(days=6)
            scheduled = db.query(MedicationSchedule).filter(MedicationSchedule.is_active == True).count()  # noqa: E712
            taken = db.query(MedicationLog).filter(
                MedicationLog.log_date >= week_start,
                MedicationLog.log_date <= week_end,
                MedicationLog.taken == True,  # noqa: E712
            ).count()
            stats = calculate_adherence(scheduled, taken)
            data.append([str(week_start), stats["scheduled"], stats["taken"], stats["missed"], adherence_label(stats["adherence_percentage"])])
        return headers, data

    raise ValueError("Unsupported report type")
