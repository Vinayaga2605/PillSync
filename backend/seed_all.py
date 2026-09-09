"""Consolidated, idempotent seeding for the PillSync database.

Covers every table so the admin/patient/caregiver dashboards and module-7
analytics pages all render with realistic, consistent data.

Run standalone to seed (non-destructive, skips existing rows):
    python seed_all.py

reset_db.py imports seed_all() after dropping all tables.
"""

import os
import random
import sys
from datetime import date
from datetime import datetime
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.database import Base
from app.database import engine

import app.models  # noqa: F401  (register all tables on Base.metadata)

from app.models.user import User
from app.models.patient import PatientProfile
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
from app.models.module7 import Role
from app.models.module7 import UserAssignment
from app.models.module7 import MedicineCategory
from app.models.module7 import AnalyticsCache

from app.utils.password import hash_password
from app.utils.adherence import calculate_adherence
from app.services.medication_service import TIME_LABELS

from sqlalchemy import func

random.seed(2026)

MEDICINES = [
    {"name": "Metformin", "brand": "Glucophage", "default_dosage": "500 mg", "category": "Diabetes", "stock": 320, "reorder": 40, "description": "Blood sugar control"},
    {"name": "Paracetamol", "brand": "Panadol", "default_dosage": "500 mg", "category": "Pain Relief", "stock": 3, "reorder": 30, "description": "Pain relief and fever"},
    {"name": "Vitamin D3", "brand": "Nature Made", "default_dosage": "1000 IU", "category": "Supplement", "stock": 180, "reorder": 25, "description": "Bone health"},
    {"name": "Aspirin", "brand": "Bayer", "default_dosage": "75 mg", "category": "Cardiology", "stock": 6, "reorder": 20, "description": "Blood thinner"},
    {"name": "Amoxicillin", "brand": "Amoxil", "default_dosage": "500 mg", "category": "Antibiotic", "stock": 90, "reorder": 15, "description": "Antibiotic"},
    {"name": "Atorvastatin", "brand": "Lipitor", "default_dosage": "10 mg", "category": "Cholesterol", "stock": 210, "reorder": 30, "description": "Cholesterol management"},
    {"name": "Losartan", "brand": "Cozaar", "default_dosage": "50 mg", "category": "Cardiology", "stock": 2, "reorder": 20, "description": "Blood pressure control"},
    {"name": "Insulin", "brand": "NovoRapid", "default_dosage": "10 units", "category": "Diabetes", "stock": 45, "reorder": 10, "description": "Insulin therapy"},
    {"name": "Amlodipine", "brand": "Norvasc", "default_dosage": "5 mg", "category": "Cardiology", "stock": 150, "reorder": 25, "description": "Blood pressure control"},
    {"name": "Omeprazole", "brand": "Prilosec", "default_dosage": "20 mg", "category": "Gastro", "stock": 130, "reorder": 20, "description": "Acid reflux relief"},
    {"name": "Cetirizine", "brand": "Zyrtec", "default_dosage": "10 mg", "category": "Allergy", "stock": 95, "reorder": 15, "description": "Allergy relief"},
    {"name": "Levothyroxine", "brand": "Synthroid", "default_dosage": "100 mcg", "category": "Thyroid", "stock": 60, "reorder": 12, "description": "Thyroid therapy"},
]

ADMINS = [
    {"name": "Dr. Sarah Ahmed", "email": "admin@pillsync.com", "pass": "admin123", "phone": "03001112233"},
    {"name": "Dr. Faisal Iqbal", "email": "faisal.admin@gmail.com", "pass": "faisal123", "phone": "03090009999"},
    {"name": "Dr. Ayesha Rahim", "email": "ayesha.admin@gmail.com", "pass": "ayesha123", "phone": "03011112233"},
]

CAREGIVERS = [
    {"name": "Imran Ali", "email": "caregiver@pillsync.com", "pass": "caregiver123", "phone": "03009876543"},
    {"name": "Sana Malik", "email": "sana.caregiver@gmail.com", "pass": "sana123", "phone": "03070007777"},
    {"name": "Ali Haider", "email": "ali.caregiver@gmail.com", "pass": "ali12345", "phone": "03080008888"},
    {"name": "Hina Khan", "email": "hina.caregiver@gmail.com", "pass": "hina12345", "phone": "03022223333"},
]

PATIENTS = [
    {"name": "Muhammad Bilal", "email": "bilal.patient@gmail.com", "pass": "bilal123", "phone": "03010001111",
     "dob": "1988-04-12", "gender": "Male", "blood": "O+", "emergency": "03010009999"},
    {"name": "Fatima Noor", "email": "fatima.patient@gmail.com", "pass": "fatima123", "phone": "03020002222",
     "dob": "1992-09-03", "gender": "Female", "blood": "A+", "emergency": "03020008888"},
    {"name": "Hassan Raza", "email": "hassan.patient@gmail.com", "pass": "hassan123", "phone": "03030003333",
     "dob": "1965-01-25", "gender": "Male", "blood": "B+", "emergency": "03030007777"},
    {"name": "Ayesha Siddiqui", "email": "ayesha.patient@gmail.com", "pass": "ayesha123", "phone": "03040004444",
     "dob": "1978-11-17", "gender": "Female", "blood": "AB+", "emergency": "03040006666"},
    {"name": "Usman Tariq", "email": "usman.patient@gmail.com", "pass": "usman123", "phone": "03050005555",
     "dob": "1959-06-30", "gender": "Male", "blood": "O-", "emergency": "03050005550"},
    {"name": "Zainab Akhtar", "email": "zainab.patient@gmail.com", "pass": "zainab123", "phone": "03060006666",
     "dob": "1996-02-08", "gender": "Female", "blood": "A-", "emergency": "03060004444"},
    {"name": "Ayesha Khan", "email": "patient@pillsync.com", "pass": "patient123", "phone": "03001234567",
     "dob": "1985-05-20", "gender": "Female", "blood": "B-", "emergency": "03001234000"},
    {"name": "Ahmed Nawaz", "email": "ahmed.patient@gmail.com", "pass": "ahmed123", "phone": "03033334444",
     "dob": "1970-12-01", "gender": "Male", "blood": "A+", "emergency": "03033335555"},
    {"name": "Sara Yousaf", "email": "sara.patient@gmail.com", "pass": "sara1234", "phone": "03044445555",
     "dob": "2000-07-15", "gender": "Female", "blood": "O+", "emergency": "03044446666"},
    {"name": "Kashif Mehmood", "email": "kashif.patient@gmail.com", "pass": "kashif123", "phone": "03055556666",
     "dob": "1953-03-22", "gender": "Male", "blood": "AB-", "emergency": "03055557777"},
    {"name": "Tariq Mahmood", "email": "tariq.patient@gmail.com", "pass": "tariq123", "phone": "03071112222",
     "dob": "1980-08-14", "gender": "Male", "blood": "A+", "emergency": "03071119999"},
    {"name": "Nadia Pervez", "email": "nadia.patient@gmail.com", "pass": "nadia123", "phone": "03073334444",
     "dob": "1990-03-25", "gender": "Female", "blood": "B+", "emergency": "03073339999"},
    {"name": "Hamza Sheikh", "email": "hamza.patient@gmail.com", "pass": "hamza123", "phone": "03075556666",
     "dob": "1975-11-10", "gender": "Male", "blood": "O+", "emergency": "03075559999"},
]

CONDITIONS = [
    "Type 2 Diabetes", "Hypertension", "Hyperlipidemia", "Asthma",
    "Arthritis", "Hypothyroidism", "Acid Reflux", "Allergic Rhinitis",
    "Chronic Kidney Disease", "Cardiovascular Disease",
]

TIME_SLOTS = ["morning", "afternoon", "evening", "night"]
TIME_NOTES = {
    "morning": "After breakfast",
    "afternoon": "After lunch",
    "evening": "After dinner",
    "night": "Before sleep",
}


def get_or_create_user(db, full_name, email, password, phone, role):
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user
    user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(password),
        phone=phone,
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def ensure_profile(db, user, dob, gender, blood_group, emergency):
    profile = db.query(PatientProfile).filter(
        PatientProfile.user_id == user.id
    ).first()
    if profile:
        return profile
    profile = PatientProfile(
        user_id=user.id,
        dob=date.fromisoformat(dob),
        gender=gender,
        blood_group=blood_group,
        emergency_contact=emergency,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def seed_medicines(db):
    created = []
    for item in MEDICINES:
        med = db.query(Medicine).filter(Medicine.name == item["name"]).first()
        if med is None:
            med = Medicine(
                name=item["name"],
                brand=item["brand"],
                default_dosage=item["default_dosage"],
                description=item["description"],
                category=item["category"],
                stock_quantity=item["stock"],
                reorder_level=item["reorder"],
            )
            db.add(med)
            db.commit()
            db.refresh(med)
        created.append(med)
    return created


def create_history(db, schedule, patient, days):
    today = date.today()
    for offset in range(0, days + 1):
        day = today - timedelta(days=offset)
        exists = db.query(MedicationLog).filter(
            MedicationLog.schedule_id == schedule.id,
            MedicationLog.log_date == day,
        ).first()
        if exists:
            continue
        take_rate = random.uniform(0.55, 0.98)
        if random.random() < take_rate:
            db.add(MedicationLog(
                schedule_id=schedule.id,
                patient_id=patient.id,
                taken=True,
                log_date=day,
                time_of_day=schedule.time_of_day,
            ))


def seed_schedules(db, patients, medicines):
    existing = set(
        (s.patient_id, s.medicine_id, s.time_of_day)
        for s in db.query(MedicationSchedule).all()
    )
    count = 0
    for idx, patient in enumerate(patients):
        # deterministic per-patient plan (no RNG) so re-runs are stable
        num = 3 if idx % 3 == 0 else 4
        for slot_idx in range(num):
            slot = TIME_SLOTS[slot_idx]
            med = medicines[(idx + slot_idx) % len(medicines)]
            key = (patient.id, med.id, slot)
            if key in existing:
                continue
            schedule = MedicationSchedule(
                patient_id=patient.id,
                medicine_id=med.id,
                dosage=med.default_dosage,
                time_of_day=slot,
                notes=TIME_NOTES[slot],
                is_active=True,
            )
            db.add(schedule)
            db.commit()
            db.refresh(schedule)
            existing.add(key)
            count += 1
            create_history(db, schedule, patient, days=15)
    return count


def seed_conditions(db, patients):
    count = 0
    for patient in patients:
        existing = db.query(MedicalCondition).filter(
            MedicalCondition.patient_id == patient.id
        ).count()
        if existing:
            continue
        for _ in range(random.randint(1, 3)):
            db.add(MedicalCondition(
                patient_id=patient.id,
                condition=random.choice(CONDITIONS),
                severity=random.choice(["mild", "moderate", "severe"]),
            ))
            count += 1
    db.commit()
    return count


def seed_assignments(db, patients, caregivers):
    count = 0
    for idx, patient in enumerate(patients):
        caregiver = caregivers[idx % len(caregivers)]
        exists = db.query(CaregiverPatient).filter(
            CaregiverPatient.caregiver_id == caregiver.id,
            CaregiverPatient.patient_id == patient.id,
        ).first()
        if not exists:
            db.add(CaregiverPatient(
                caregiver_id=caregiver.id,
                patient_id=patient.id,
                status="active",
            ))
            count += 1
    db.commit()
    return count


def seed_caregiver_requests(db, patients, caregivers):
    count = 0
    for idx, patient in enumerate(patients):
        target = caregivers[(idx + 1) % len(caregivers)]
        exists = db.query(CaregiverPatient).filter(
            CaregiverPatient.caregiver_id == target.id,
            CaregiverPatient.patient_id == patient.id,
        ).first()
        if not exists:
            db.add(CaregiverPatient(
                caregiver_id=target.id,
                patient_id=patient.id,
                status="pending",
            ))
            db.add(UserAssignment(
                caregiver_id=target.id,
                patient_id=patient.id,
                status="pending",
            ))
            msg = (
                f"New request: {patient.full_name} would like you "
                f"to be their caregiver."
            )
            db.add(Notification(
                user_id=target.id,
                patient_id=patient.id,
                type="summary",
                message=msg,
                is_read=False,
            ))
            count += 1
    db.commit()
    return count


def notification_exists(db, user_id, ntype, message, day):
    return (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.type == ntype,
            Notification.message == message,
            func.date(Notification.created_at) == day,
        )
        .first()
        is not None
    )


def patient_missed_meds(db, patient, day):
    schedules = db.query(MedicationSchedule).filter(
        MedicationSchedule.patient_id == patient.id,
        MedicationSchedule.is_active == True,  # noqa: E712
    ).all()
    taken_ids = {
        log.schedule_id
        for log in db.query(MedicationLog).filter(
            MedicationLog.patient_id == patient.id,
            MedicationLog.log_date == day,
            MedicationLog.taken == True,  # noqa: E712
        ).all()
    }
    missed = []
    for s in schedules:
        if s.id in taken_ids:
            continue
        med = db.query(Medicine).filter(Medicine.id == s.medicine_id).first()
        missed.append({
            "medicine": med.name if med else "medicine",
            "dosage": s.dosage,
            "time_label": TIME_LABELS.get(s.time_of_day, s.time_of_day),
        })
    return missed


def patient_refills(db, patient):
    return db.query(RefillPrediction).filter(
        RefillPrediction.patient_id == patient.id,
    ).all()


def medicine_name(db, medicine_id):
    med = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    return med.name if med else "medicine"


def seed_notifications(db, patients, caregivers, admins, medicines):
    today = date.today()
    count = 0

    # ---- Patient notifications (reminder + summary + confirmation + missed + refill) ----
    for idx, patient in enumerate(patients):
        msg = f"Reminder: don't forget your medicines today, {patient.full_name}."
        if not notification_exists(db, patient.id, "reminder", msg, today):
            db.add(Notification(
                user_id=patient.id,
                type="reminder",
                message=msg,
                is_read=False,
            ))
            count += 1

        schedule_count = db.query(MedicationSchedule).filter(
            MedicationSchedule.patient_id == patient.id,
            MedicationSchedule.is_active == True,  # noqa: E712
        ).count()
        taken_today = db.query(MedicationLog).filter(
            MedicationLog.patient_id == patient.id,
            MedicationLog.log_date == today,
            MedicationLog.taken == True,  # noqa: E712
        ).count()

        msg = (
            f"Your daily medication summary: {taken_today} of "
            f"{schedule_count} doses taken today."
        )
        if not notification_exists(db, patient.id, "summary", msg, today):
            db.add(Notification(
                user_id=patient.id,
                type="summary",
                message=msg,
                is_read=idx % 3 == 0,
            ))
            count += 1

        for missed in patient_missed_meds(db, patient, today):
            msg = (
                f"You missed your {missed['medicine']} ({missed['dosage']}) "
                f"dose for {missed['time_label']}. Please take it now."
            )
            if not notification_exists(db, patient.id, "missed_dose", msg, today):
                db.add(Notification(
                    user_id=patient.id,
                    type="missed_dose",
                    message=msg,
                    is_read=False,
                ))
                count += 1

        for pred in patient_refills(db, patient):
            med = medicine_name(db, pred.medicine_id)
            msg = (
                f"Refill needed: your {med} has {pred.remaining_qty} unit(s) "
                f"left — about {pred.remaining_days} day(s) worth. "
                f"Refill by {pred.predicted_refill_date.strftime('%b %d')}."
            )
            if not notification_exists(db, patient.id, "refill", msg, today):
                db.add(Notification(
                    user_id=patient.id,
                    patient_id=patient.id,
                    type="refill",
                    message=msg,
                    is_read=False,
                ))
                count += 1

        for days_ago in [1, 3, 5]:
            day = today - timedelta(days=days_ago)
            msg = f"Great job! You completed all your doses on {day.strftime('%b %d')}."
            if not notification_exists(db, patient.id, "confirmation", msg, day):
                db.add(Notification(
                    user_id=patient.id,
                    type="confirmation",
                    message=msg,
                    is_read=True,
                    created_at=datetime.combine(day, datetime.min.time()),
                ))
                count += 1

    # ---- Caregiver notifications (summary + detailed missed dose + reminder + refill) ----
    slot_order = {slot: i for i, slot in enumerate(TIME_SLOTS)}
    for idx, patient in enumerate(patients):
        caregiver = caregivers[idx % len(caregivers)]
        schedule_count = db.query(MedicationSchedule).filter(
            MedicationSchedule.patient_id == patient.id,
            MedicationSchedule.is_active == True,  # noqa: E712
        ).count()
        taken_today = db.query(MedicationLog).filter(
            MedicationLog.patient_id == patient.id,
            MedicationLog.log_date == today,
            MedicationLog.taken == True,  # noqa: E712
        ).count()
        missed = max(schedule_count - taken_today, 0)

        msg = (
            f"Daily summary for {patient.full_name}: "
            f"{taken_today} of {schedule_count} doses taken today."
        )
        if not notification_exists(db, caregiver.id, "summary", msg, today):
            db.add(Notification(
                user_id=caregiver.id,
                patient_id=patient.id,
                type="summary",
                message=msg,
                is_read=False,
            ))
            count += 1

        for missed_one in patient_missed_meds(db, patient, today):
            msg = (
                f"Missed dose: {patient.full_name} did not mark "
                f"{missed_one['medicine']} ({missed_one['dosage']}) "
                f"for {missed_one['time_label']} today."
            )
            if not notification_exists(db, caregiver.id, "missed_dose", msg, today):
                db.add(Notification(
                    user_id=caregiver.id,
                    patient_id=patient.id,
                    type="missed_dose",
                    message=msg,
                    is_read=False,
                ))
                count += 1

        next_sched = db.query(MedicationSchedule).filter(
            MedicationSchedule.patient_id == patient.id,
            MedicationSchedule.is_active == True,  # noqa: E712
        ).all()
        next_sched.sort(
            key=lambda s: slot_order.get(s.time_of_day, 99)
        )
        if next_sched:
            s = next_sched[0]
            msg = (
                f"Reminder: {patient.full_name} should take "
                f"{medicine_name(db, s.medicine_id)} ({s.dosage}) "
                f"for {TIME_LABELS.get(s.time_of_day, s.time_of_day)}."
            )
            if not notification_exists(db, caregiver.id, "reminder", msg, today):
                db.add(Notification(
                    user_id=caregiver.id,
                    patient_id=patient.id,
                    type="reminder",
                    message=msg,
                    is_read=False,
                ))
                count += 1

        for pred in patient_refills(db, patient):
            med = medicine_name(db, pred.medicine_id)
            msg = (
                f"Refill alert: {patient.full_name} is low on {med} — "
                f"{pred.remaining_qty} unit(s), ~{pred.remaining_days} day(s) left. "
                f"Refill by {pred.predicted_refill_date.strftime('%b %d')}."
            )
            if not notification_exists(db, caregiver.id, "refill", msg, today):
                db.add(Notification(
                    user_id=caregiver.id,
                    patient_id=patient.id,
                    type="refill",
                    message=msg,
                    is_read=False,
                ))
                count += 1

        for days_ago in [1, 2, 4, 6]:
            day = today - timedelta(days=days_ago)
            msg = f"Daily summary for {patient.full_name} on {day.strftime('%b %d')}: doses on track."
            if not notification_exists(db, caregiver.id, "summary", msg, day):
                db.add(Notification(
                    user_id=caregiver.id,
                    patient_id=patient.id,
                    type="summary",
                    message=msg,
                    is_read=True,
                    created_at=datetime.combine(day, datetime.min.time()),
                ))
                count += 1

    # ---- Admin system notifications (admin-level detail only) ----
    for admin in admins:
        msg = f"System report generated by {admin.full_name}."
        if not notification_exists(db, admin.id, "system", msg, today):
            db.add(Notification(
                user_id=admin.id,
                type="system",
                message=msg,
                is_read=False,
            ))
            count += 1

        msg = (
            f"Platform summary: {len(patients)} patients, "
            f"{len(caregivers)} caregivers, {len(medicines)} medicines tracked."
        )
        if not notification_exists(db, admin.id, "system", msg, today):
            db.add(Notification(
                user_id=admin.id,
                type="system",
                message=msg,
                is_read=False,
            ))
            count += 1

        for med in medicines:
            if (med.stock_quantity or 0) < (med.reorder_level or 0):
                msg = (
                    f"Low stock alert: {med.name} has {med.stock_quantity} "
                    f"unit(s) — reorder level is {med.reorder_level}."
                )
                if not notification_exists(db, admin.id, "system", msg, today):
                    db.add(Notification(
                        user_id=admin.id,
                        type="system",
                        message=msg,
                        is_read=False,
                    ))
                    count += 1

        for days_ago in [1, 2, 3, 5]:
            day = today - timedelta(days=days_ago)
            msg = f"Weekly system report available for {day.strftime('%b %d')}."
            if not notification_exists(db, admin.id, "system", msg, day):
                db.add(Notification(
                    user_id=admin.id,
                    type="system",
                    message=msg,
                    is_read=True,
                    created_at=datetime.combine(day, datetime.min.time()),
                ))
                count += 1

    # ---- Broadcast to everyone ----
    broadcast_msg = "PillSync maintenance scheduled this Sunday 2:00 AM - 4:00 AM."
    for user in patients + caregivers + admins:
        if not notification_exists(db, user.id, "broadcast", broadcast_msg, today):
            db.add(Notification(
                user_id=user.id,
                type="broadcast",
                message=broadcast_msg,
                is_read=True,
            ))
            count += 1

    db.commit()
    return count


def seed_notification_logs(db, users):
    existing = db.query(NotificationLog).count()
    if existing:
        return existing
    channels = ["push", "email", "sms"]
    types = ["reminder", "missed_dose", "refill", "summary", "broadcast"]
    count = 0
    for i in range(70):
        user = random.choice(users)
        channel = random.choice(channels)
        ntype = random.choice(types)
        status = "sent" if random.random() < 0.85 else "failed"
        entry_time = datetime.now() - timedelta(
            days=random.randint(0, 6),
            hours=random.randint(0, 12),
        )
        db.add(NotificationLog(
            user_id=user.id,
            channel=channel,
            type=ntype,
            status=status,
            message=f"{ntype.replace('_', ' ').title()} notification for {user.full_name}",
            created_at=entry_time,
        ))
        count += 1
    db.commit()
    return count


def seed_refills(db, medicines):
    existing_keys = {
        (p.patient_id, p.medicine_id)
        for p in db.query(RefillPrediction).all()
    }
    schedules = db.query(MedicationSchedule).all()
    count = 0
    for idx, schedule in enumerate(schedules):
        if (schedule.patient_id, schedule.medicine_id) in existing_keys:
            continue
        med = db.query(Medicine).filter(
            Medicine.id == schedule.medicine_id
        ).first()
        if med is None:
            continue
        remaining = max(med.stock_quantity - random.randint(0, 40), 1)
        remaining_days = remaining // 1
        status = (
            "critical" if remaining_days <= 3
            else "warning" if remaining_days <= 10
            else "healthy"
        )
        # backdate some predictions so the trend graph spans several days
        created_at = datetime.now() - timedelta(days=idx % 6)
        db.add(RefillPrediction(
            patient_id=schedule.patient_id,
            medicine_id=schedule.medicine_id,
            schedule_id=schedule.id,
            remaining_qty=remaining,
            daily_consumption=1,
            remaining_days=remaining_days,
            predicted_refill_date=datetime.now() + timedelta(days=remaining_days),
            status=status,
            created_at=created_at,
        ))
        existing_keys.add((schedule.patient_id, schedule.medicine_id))
        count += 1
    db.commit()
    return count


def seed_adherence_reports(db, patients):
    existing = db.query(AdherenceReport).count()
    if existing:
        return existing
    count = 0
    for patient in patients:
        schedule_ids = [
            s.id for s in db.query(MedicationSchedule).filter(
                MedicationSchedule.patient_id == patient.id,
                MedicationSchedule.is_active == True,  # noqa: E712
            ).all()
        ]
        if not schedule_ids:
            continue
        for day_offset in range(10):
            day = date.today() - timedelta(days=day_offset)
            taken = db.query(MedicationLog).filter(
                MedicationLog.patient_id == patient.id,
                MedicationLog.log_date == day,
                MedicationLog.taken == True,  # noqa: E712
            ).count()
            stats = calculate_adherence(len(schedule_ids), taken)
            db.add(AdherenceReport(
                patient_id=patient.id,
                period="daily",
                period_start=datetime.combine(day, datetime.min.time()),
                period_end=datetime.combine(day, datetime.max.time()),
                scheduled=stats["scheduled"],
                taken=stats["taken"],
                missed=stats["missed"],
                adherence_pct=stats["adherence_percentage"] or 0,
            ))
            count += 1
    db.commit()
    return count


def seed_ocr_uploads(db, patients):
    existing = db.query(OCRUpload).count()
    if existing:
        return existing
    count = 0
    for i in range(10):
        patient = random.choice(patients)
        db.add(OCRUpload(
            patient_id=patient.id,
            user_id=patient.id,
            filename=f"prescription_{patient.full_name.replace(' ', '_').lower()}_{i + 1}.jpg",
            status="success" if random.random() < 0.9 else "failed",
            items_detected=random.randint(1, 6),
            processing_time_ms=random.randint(400, 2200),
        ))
        count += 1
    db.commit()
    return count


def seed_system_logs(db, admins):
    existing = db.query(SystemLog).count()
    if existing:
        return existing
    actions = ["user_created", "medicine_added", "report_generated", "caregiver_assigned"]
    entities = ["User", "Medicine", "Report", "CaregiverPatient"]
    count = 0
    for admin in admins:
        for i in range(3):
            day = date.today() - timedelta(days=i)
            db.add(SystemLog(
                user_id=admin.id,
                action=random.choice(actions),
                entity=random.choice(entities),
                details=f"{admin.full_name} performed admin action",
                created_at=datetime.combine(day, datetime.min.time()),
            ))
            count += 1
    db.commit()
    return count


def seed_login_history(db, users):
    existing = db.query(LoginHistory).count()
    if existing:
        return existing
    count = 0
    for i in range(40):
        user = random.choice(users)
        created_at = datetime.now() - timedelta(
            days=random.randint(0, 6),
            hours=random.randint(0, 20),
            minutes=random.randint(0, 59),
        )
        db.add(LoginHistory(
            user_id=user.id,
            email=user.email,
            role=user.role,
            success=1 if random.random() < 0.95 else 0,
            ip_address=f"192.168.{random.randint(0, 255)}.{random.randint(1, 254)}",
            created_at=created_at,
        ))
        count += 1
    db.commit()
    return count


def seed_roles(db):
    roles = [
        ("admin", "Platform administrators with full control"),
        ("caregiver", "Caregivers who monitor assigned patients"),
        ("patient", "Patients who receive medication reminders"),
    ]
    count = 0
    for name, desc in roles:
        if db.query(Role).filter(Role.name == name).first() is None:
            db.add(Role(name=name, description=desc))
            count += 1
    db.commit()
    return count


def seed_categories(db):
    count = 0
    for cat in sorted({m["category"] for m in MEDICINES}):
        if db.query(MedicineCategory).filter(MedicineCategory.name == cat).first() is None:
            db.add(MedicineCategory(name=cat, description=f"Category: {cat}"))
            count += 1
    db.commit()
    return count


def seed_user_assignments(db):
    count = 0
    for assign in db.query(CaregiverPatient).all():
        exists = db.query(UserAssignment).filter(
            UserAssignment.caregiver_id == assign.caregiver_id,
            UserAssignment.patient_id == assign.patient_id,
        ).first()
        if exists is None:
            db.add(UserAssignment(
                caregiver_id=assign.caregiver_id,
                patient_id=assign.patient_id,
                status="active",
            ))
            count += 1
    db.commit()
    return count


def seed_analytics_cache(db):
    existing = db.query(AnalyticsCache).count()
    if existing:
        return existing
    payloads = [
        ("dashboard:summary", '{"patients": 10, "caregivers": 4, "medicines": 12}'),
        ("refill:critical", '{"count": 3}'),
        ("adherence:weekly", '{"avg": 82}'),
    ]
    for key, payload in payloads:
        db.add(AnalyticsCache(cache_key=key, payload=payload))
    db.commit()
    return len(payloads)


def seed_all():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        admins = [
            get_or_create_user(db, a["name"], a["email"], a["pass"], a["phone"], "admin")
            for a in ADMINS
        ]
        caregivers = [
            get_or_create_user(db, c["name"], c["email"], c["pass"], c["phone"], "caregiver")
            for c in CAREGIVERS
        ]
        patients = []
        for p in PATIENTS:
            user = get_or_create_user(db, p["name"], p["email"], p["pass"], p["phone"], "patient")
            ensure_profile(db, user, p["dob"], p["gender"], p["blood"], p["emergency"])
            patients.append(user)

        medicines = seed_medicines(db)
        users = admins + caregivers + patients

        schedule_count = seed_schedules(db, patients, medicines)
        condition_count = seed_conditions(db, patients)
        assignment_count = seed_assignments(db, patients, caregivers)
        request_count = seed_caregiver_requests(db, patients, caregivers)
        refill_count = seed_refills(db, medicines)
        notification_count = seed_notifications(db, patients, caregivers, admins, medicines)
        nlog_count = seed_notification_logs(db, users)
        report_count = seed_adherence_reports(db, patients)
        ocr_count = seed_ocr_uploads(db, patients)
        log_count = seed_system_logs(db, admins)
        login_count = seed_login_history(db, users)
        role_count = seed_roles(db)
        cat_count = seed_categories(db)
        ua_count = seed_user_assignments(db)
        cache_count = seed_analytics_cache(db)

        counts = {
            "users": db.query(User).count(),
            "patients": db.query(PatientProfile).count(),
            "medicines": db.query(Medicine).count(),
            "schedules": db.query(MedicationSchedule).count(),
            "logs": db.query(MedicationLog).count(),
            "notifications": db.query(Notification).count(),
            "caregiver_patients": db.query(CaregiverPatient).count(),
            "refills": db.query(RefillPrediction).count(),
            "adherence": db.query(AdherenceReport).count(),
            "ocr": db.query(OCRUpload).count(),
            "system_logs": db.query(SystemLog).count(),
            "login_history": db.query(LoginHistory).count(),
            "notification_logs": db.query(NotificationLog).count(),
            "conditions": db.query(MedicalCondition).count(),
            "roles": db.query(Role).count(),
            "categories": db.query(MedicineCategory).count(),
            "user_assignments": db.query(UserAssignment).count(),
            "analytics_cache": db.query(AnalyticsCache).count(),
        }
    finally:
        db.close()

    print("=" * 56)
    print("SEED COMPLETE — data is consistent and synced across tables")
    print("=" * 56)
    print(f"New schedules created:     {schedule_count}")
    print(f"New conditions:            {condition_count}")
    print(f"New caregiver assigns:     {assignment_count}")
    print(f"New patient requests:      {request_count}")
    print(f"New notifications:         {notification_count}")
    for name, total in counts.items():
        print(f"  {name:<20} {total}")
    print("=" * 56)
    print("Demo accounts:")
    print("  admin      admin@pillsync.com      / admin123")
    print("  caregiver  caregiver@pillsync.com  / caregiver123")
    print("  patient    patient@pillsync.com    / patient123")


if __name__ == "__main__":
    seed_all()
