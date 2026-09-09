import sys
import os
import random
from datetime import date
from datetime import datetime
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.database import engine
from app.database import Base

import app.models

from app.models.user import User
from app.models.patient import PatientProfile
from app.models.medicine import Medicine
from app.models.medication_schedule import MedicationSchedule
from app.models.medication_log import MedicationLog
from app.models.caregiver import CaregiverPatient
from app.models.notification import Notification
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

random.seed(2026)

MEDICINES = [
    {"name": "Metformin", "brand": "Glucophage", "default_dosage": "500 mg", "category": "Diabetes", "stock": 320, "reorder": 40, "description": "Blood sugar control"},
    {"name": "Paracetamol", "brand": "Panadol", "default_dosage": "500 mg", "category": "Pain Relief", "stock": 15, "reorder": 30, "description": "Pain relief and fever"},
    {"name": "Vitamin D3", "brand": "Nature Made", "default_dosage": "1000 IU", "category": "Supplement", "stock": 180, "reorder": 25, "description": "Bone health"},
    {"name": "Aspirin", "brand": "Bayer", "default_dosage": "75 mg", "category": "Cardiology", "stock": 12, "reorder": 20, "description": "Blood thinner"},
    {"name": "Amoxicillin", "brand": "Amoxil", "default_dosage": "500 mg", "category": "Antibiotic", "stock": 90, "reorder": 15, "description": "Antibiotic"},
    {"name": "Atorvastatin", "brand": "Lipitor", "default_dosage": "10 mg", "category": "Cholesterol", "stock": 210, "reorder": 30, "description": "Cholesterol management"},
    {"name": "Losartan", "brand": "Cozaar", "default_dosage": "50 mg", "category": "Cardiology", "stock": 8, "reorder": 20, "description": "Blood pressure control"},
    {"name": "Insulin", "brand": "NovoRapid", "default_dosage": "10 units", "category": "Diabetes", "stock": 45, "reorder": 10, "description": "Insulin therapy"},
    {"name": "Amlodipine", "brand": "Norvasc", "default_dosage": "5 mg", "category": "Cardiology", "stock": 150, "reorder": 25, "description": "Blood pressure control"},
    {"name": "Omeprazole", "brand": "Prilosec", "default_dosage": "20 mg", "category": "Gastro", "stock": 130, "reorder": 20, "description": "Acid reflux relief"},
    {"name": "Cetirizine", "brand": "Zyrtec", "default_dosage": "10 mg", "category": "Allergy", "stock": 95, "reorder": 15, "description": "Allergy relief"},
    {"name": "Levothyroxine", "brand": "Synthroid", "default_dosage": "100 mcg", "category": "Thyroid", "stock": 60, "reorder": 12, "description": "Thyroid therapy"},
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


def main():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # ---- Admins (3) ----
        admins = [
            get_or_create_user(db, "Dr. Sarah Ahmed", "admin@pillsync.com", "admin123", "03001112233", "admin"),
            get_or_create_user(db, "Dr. Faisal Iqbal", "faisal.admin@gmail.com", "faisal123", "03090009999", "admin"),
            get_or_create_user(db, "Dr. Ayesha Rahim", "ayesha.admin@gmail.com", "ayesha123", "03011112233", "admin"),
        ]

        # ---- Caregivers (4) ----
        caregivers = [
            get_or_create_user(db, "Imran Ali", "caregiver@pillsync.com", "caregiver123", "03009876543", "caregiver"),
            get_or_create_user(db, "Sana Malik", "sana.caregiver@gmail.com", "sana123", "03070007777", "caregiver"),
            get_or_create_user(db, "Ali Haider", "ali.caregiver@gmail.com", "ali12345", "03080008888", "caregiver"),
            get_or_create_user(db, "Hina Khan", "hina.caregiver@gmail.com", "hina12345", "03022223333", "caregiver"),
        ]

        # ---- Patients (10) ----
        patients_data = [
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
        ]

        patients = []
        for p in patients_data:
            user = get_or_create_user(db, p["name"], p["email"], p["pass"], p["phone"], "patient")
            ensure_profile(db, user, p["dob"], p["gender"], p["blood"], p["emergency"])
            patients.append(user)

        # ---- Medicines (12) ----
        medicines = seed_medicines(db)
        med_map = {m.name: m for m in medicines}

        # ---- Schedules (~30) + History (~90) ----
        schedule_count = 0
        db.query(MedicationLog).delete()
        db.commit()
        for idx, patient in enumerate(patients):
            count = 3 if idx % 3 == 0 else 4
            slots = random.sample(TIME_SLOTS, count)
            for slot in slots:
                med = random.choice(medicines)
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
                schedule_count += 1
                create_history(db, schedule, patient, days=15)

        # ensure history for pre-existing schedules too
        all_schedules = db.query(MedicationSchedule).filter(
            MedicationSchedule.is_active == True  # noqa: E712
        ).all()
        for schedule in all_schedules:
            patient = db.query(User).filter(User.id == schedule.patient_id).first()
            if patient:
                create_history(db, schedule, patient, days=15)
        db.commit()

        # ---- Conditions ----
        for patient in patients:
            existing = db.query(MedicalCondition).filter(
                MedicalCondition.patient_id == patient.id
            ).first()
            if existing:
                continue
            for _ in range(random.randint(1, 3)):
                db.add(MedicalCondition(
                    patient_id=patient.id,
                    condition=random.choice(CONDITIONS),
                    severity=random.choice(["mild", "moderate", "severe"]),
                ))
        db.commit()

        # ---- Caregiver assignments ----
        assignment_count = 0
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
                ))
                assignment_count += 1
        db.commit()

        # ---- Notifications + NotificationLogs (50) ----
        channels = ["push", "email", "sms"]
        nlog_count = 0
        for i in range(50):
            user = random.choice(patients + caregivers)
            channel = random.choice(channels)
            ntype = random.choice(["reminder", "missed_dose", "refill", "summary"])
            status = "sent" if random.random() < 0.85 else "failed"
            db.add(NotificationLog(
                user_id=user.id,
                channel=channel,
                type=ntype,
                status=status,
                message=f"{ntype.replace('_', ' ').title()} notification for {user.full_name}",
            ))
            nlog_count += 1
        db.commit()

        # user-facing notifications
        for patient in patients:
            caregiver = caregivers[patients.index(patient) % len(caregivers)]
            db.add(Notification(
                user_id=caregiver.id,
                patient_id=patient.id,
                type="summary",
                message=f"Daily summary for {patient.full_name} generated.",
                is_read=False,
            ))
        db.commit()

        # ---- Refill Predictions (20) ----
        predictions = (
            db.query(RefillPrediction)
            .all()
        )
        existing_refill_keys = {
            (p.patient_id, p.medicine_id) for p in predictions
        }

        schedules_all = db.query(MedicationSchedule).all()
        refill_count = 0
        for schedule in schedules_all[:20]:
            if (schedule.patient_id, schedule.medicine_id) in existing_refill_keys:
                continue
            med = db.query(Medicine).filter(
                Medicine.id == schedule.medicine_id
            ).first()
            remaining = max(med.stock_quantity - random.randint(0, 40), 1)
            daily = 1
            remaining_days = remaining // daily
            status = (
                "critical" if remaining_days <= 3
                else "warning" if remaining_days <= 10
                else "healthy"
            )
            db.add(RefillPrediction(
                patient_id=schedule.patient_id,
                medicine_id=schedule.medicine_id,
                schedule_id=schedule.id,
                remaining_qty=remaining,
                daily_consumption=daily,
                remaining_days=remaining_days,
                predicted_refill_date=datetime.now() + timedelta(days=remaining_days),
                status=status,
            ))
            refill_count += 1
        db.commit()

        # ---- Adherence Reports (100) ----
        report_count = 0
        for patient in patients:
            schedules = db.query(MedicationSchedule).filter(
                MedicationSchedule.patient_id == patient.id,
                MedicationSchedule.is_active == True,  # noqa: E712
            ).all()
            if not schedules:
                continue
            schedule_ids = [s.id for s in schedules]
            for day_offset in range(10):
                day = date.today() - timedelta(days=day_offset)
                taken = (
                    db.query(MedicationLog)
                    .filter(
                        MedicationLog.patient_id == patient.id,
                        MedicationLog.log_date == day,
                        MedicationLog.taken == True,  # noqa: E712
                    )
                    .count()
                )
                scheduled = len(schedule_ids)
                stats = calculate_adherence(scheduled, taken)
                missed = stats["missed"]
                pct = stats["adherence_percentage"]
                db.add(AdherenceReport(
                    patient_id=patient.id,
                    period="daily",
                    period_start=datetime.combine(day, datetime.min.time()),
                    period_end=datetime.combine(day, datetime.max.time()),
                    scheduled=stats["scheduled"],
                    taken=stats["taken"],
                    missed=missed,
                    adherence_pct=pct if pct is not None else 0,
                ))
                report_count += 1
        db.commit()

        # ---- OCR Uploads (10) ----
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
        db.commit()

        # ---- System Logs ----
        log_count = 0
        for admin in admins:
            for _ in range(3):
                db.add(SystemLog(
                    user_id=admin.id,
                    action=random.choice(["user_created", "medicine_added", "report_generated"]),
                    entity=random.choice(["User", "Medicine", "Report"]),
                    details=f"{admin.full_name} performed admin action",
                ))
                log_count += 1
        db.commit()

        # ---- Login History ----
        for i in range(30):
            user = random.choice(admins + caregivers + patients)
            db.add(LoginHistory(
                user_id=user.id,
                email=user.email,
                role=user.role,
                success=1 if random.random() < 0.95 else 0,
                ip_address=f"192.168.{random.randint(0, 255)}.{random.randint(1, 254)}",
            ))
        db.commit()

        # ---- Roles ----
        roles_data = [
            ("admin", "Platform administrators with full control"),
            ("caregiver", "Caregivers who monitor assigned patients"),
            ("patient", "Patients who receive medication reminders"),
        ]
        for name, desc in roles_data:
            existing = db.query(Role).filter(Role.name == name).first()
            if existing is None:
                db.add(Role(name=name, description=desc))
        db.commit()

        # ---- Medicine Categories ----
        categories = sorted({m["category"] for m in MEDICINES})
        for cat in categories:
            existing = db.query(MedicineCategory).filter(MedicineCategory.name == cat).first()
            if existing is None:
                db.add(MedicineCategory(name=cat, description=f"Category: {cat}"))
        db.commit()

        # ---- User Assignments (mirror caregiver assignments) ----
        assignments = (
            db.query(CaregiverPatient)
            .all()
        )
        for assign in assignments:
            existing = (
                db.query(UserAssignment)
                .filter(
                    UserAssignment.caregiver_id == assign.caregiver_id,
                    UserAssignment.patient_id == assign.patient_id,
                )
                .first()
            )
            if existing is None:
                db.add(UserAssignment(
                    caregiver_id=assign.caregiver_id,
                    patient_id=assign.patient_id,
                    status="active",
                ))
        db.commit()

        print("=" * 60)
        print("MODULE 7 DATA SEED COMPLETE")
        print("=" * 60)
        print(f"Admins:             {len(admins)}")
        print(f"Caregivers:         {len(caregivers)}")
        print(f"Patients:           {len(patients)}")
        print(f"Medicines:          {len(medicines)}")
        print(f"Schedules:          {schedule_count}")
        print(f"Caregiver assigns:  {assignment_count}")
        print(f"Notification logs:  {nlog_count}")
        print(f"Refill predictions: {refill_count}")
        print(f"Adherence reports:  {report_count}")
        print(f"System logs:        {log_count}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
