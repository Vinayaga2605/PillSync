import sys
import os
import random
from datetime import date
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

from app.utils.password import hash_password

random.seed(42)

FAKE_PATIENTS = [
    {"full_name": "Muhammad Bilal", "email": "bilal.patient@gmail.com", "password": "bilal123", "phone": "03010001111",
     "gender": "Male", "dob": "1988-04-12", "blood_group": "O+", "emergency_contact": "03010009999"},
    {"full_name": "Fatima Noor", "email": "fatima.patient@gmail.com", "password": "fatima123", "phone": "03020002222",
     "gender": "Female", "dob": "1992-09-03", "blood_group": "A+", "emergency_contact": "03020008888"},
    {"full_name": "Hassan Raza", "email": "hassan.patient@gmail.com", "password": "hassan123", "phone": "03030003333",
     "gender": "Male", "dob": "1965-01-25", "blood_group": "B+", "emergency_contact": "03030007777"},
    {"full_name": "Ayesha Siddiqui", "email": "ayesha.patient@gmail.com", "password": "ayesha123", "phone": "03040004444",
     "gender": "Female", "dob": "1978-11-17", "blood_group": "AB+", "emergency_contact": "03040006666"},
    {"full_name": "Usman Tariq", "email": "usman.patient@gmail.com", "password": "usman123", "phone": "03050005555",
     "gender": "Male", "dob": "1959-06-30", "blood_group": "O-", "emergency_contact": "03050005550"},
    {"full_name": "Zainab Akhtar", "email": "zainab.patient@gmail.com", "password": "zainab123", "phone": "03060006666",
     "gender": "Female", "dob": "1996-02-08", "blood_group": "A-", "emergency_contact": "03060004444"},
]

FAKE_CAREGIVERS = [
    {"full_name": "Sana Malik", "email": "sana.caregiver@gmail.com", "password": "sana123", "phone": "03070007777"},
    {"full_name": "Ali Haider", "email": "ali.caregiver@gmail.com", "password": "ali12345", "phone": "03080008888"},
]

EXTRA_ADMINS = [
    {"full_name": "Dr. Faisal Iqbal", "email": "faisal.admin@gmail.com", "password": "faisal123", "phone": "03090009999"},
]

FAKE_MEDICINES = [
    {"name": "Paracetamol", "brand": "Panadol", "default_dosage": "500 mg", "description": "Pain relief and fever"},
    {"name": "Ibuprofen", "brand": "Advil", "default_dosage": "400 mg", "description": "Anti-inflammatory pain relief"},
    {"name": "Losartan", "brand": "Cozaar", "default_dosage": "50 mg", "description": "Blood pressure control"},
    {"name": "Levothyroxine", "brand": "Synthroid", "default_dosage": "100 mcg", "description": "Thyroid hormone therapy"},
    {"name": "Amlodipine", "brand": "Norvasc", "default_dosage": "5 mg", "description": "Blood pressure control"},
    {"name": "Metformin", "brand": "Glucophage", "default_dosage": "500 mg", "description": "Blood sugar control"},
    {"name": "Aspirin", "brand": "Bayer", "default_dosage": "75 mg", "description": "Blood thinner"},
    {"name": "Cetirizine", "brand": "Zyrtec", "default_dosage": "10 mg", "description": "Allergy relief"},
    {"name": "Prednisolone", "brand": "Deltasone", "default_dosage": "5 mg", "description": "Corticosteroid"},
    {"name": "Ciprofloxacin", "brand": "Cipro", "default_dosage": "500 mg", "description": "Antibiotic"},
]

TIME_SLOTS = ["morning", "afternoon", "evening", "night"]

DOSE_POOL = {
    "Paracetamol": "500 mg",
    "Ibuprofen": "400 mg",
    "Losartan": "50 mg",
    "Levothyroxine": "100 mcg",
    "Amlodipine": "5 mg",
    "Metformin": "500 mg",
    "Aspirin": "75 mg",
    "Cetirizine": "10 mg",
    "Prednisolone": "5 mg",
    "Ciprofloxacin": "500 mg",
}


def get_or_create_user(db, data):
    user = db.query(User).filter(User.email == data["email"]).first()
    if user:
        print(f"[SKIP] user {data['email']} exists")
        return user
    user = User(
        full_name=data["full_name"],
        email=data["email"],
        password_hash=hash_password(data["password"]),
        phone=data.get("phone"),
        role=data["role"],
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"[OK] user -> {data['email']}")
    return user


def get_or_create_medicine(db, name):
    medicine = db.query(Medicine).filter(Medicine.name == name).first()
    if medicine:
        return medicine
    item = next(m for m in FAKE_MEDICINES if m["name"] == name)
    medicine = Medicine(
        name=item["name"],
        brand=item["brand"],
        default_dosage=item["default_dosage"],
        description=item["description"],
    )
    db.add(medicine)
    db.commit()
    db.refresh(medicine)
    return medicine


def seed_profile(db, patient, data):
    profile = db.query(PatientProfile).filter(
        PatientProfile.user_id == patient.id
    ).first()
    if profile is None:
        profile = PatientProfile(
            user_id=patient.id,
            dob=date.fromisoformat(data["dob"]),
            gender=data["gender"],
            blood_group=data["blood_group"],
            emergency_contact=data["emergency_contact"],
        )
        db.add(profile)
        db.commit()
        print(f"[OK] profile -> {patient.full_name}")


def create_schedules(db, patient, medicine_pool):
    existing = {
        (s.medicine_id, s.time_of_day)
        for s in db.query(MedicationSchedule).filter(
            MedicationSchedule.patient_id == patient.id
        ).all()
    }

    count = random.randint(3, 5)
    slots = random.sample(TIME_SLOTS, min(count, len(TIME_SLOTS)))

    for slot in slots:
        med_name = random.choice(medicine_pool)
        medicine = get_or_create_medicine(db, med_name)

        if (medicine.id, slot) in existing:
            continue

        db.add(MedicationSchedule(
            patient_id=patient.id,
            medicine_id=medicine.id,
            dosage=DOSE_POOL.get(med_name, "10 mg"),
            time_of_day=slot,
            notes=random.choice([
                "After breakfast",
                "With food",
                "After lunch",
                "After dinner",
                "Before sleep",
                "Take with water",
            ]),
            is_active=True,
        ))

    db.commit()


def create_logs(db, patient):
    schedules = db.query(MedicationSchedule).filter(
        MedicationSchedule.patient_id == patient.id,
        MedicationSchedule.is_active == True,  # noqa: E712
    ).all()

    today = date.today()

    for schedule in schedules:
        for days_ago in range(1, 8):
            log_date = today - timedelta(days=days_ago)
            exists = db.query(MedicationLog).filter(
                MedicationLog.schedule_id == schedule.id,
                MedicationLog.log_date == log_date,
            ).first()
            if exists:
                continue
            if random.random() < 0.85:
                db.add(MedicationLog(
                    schedule_id=schedule.id,
                    patient_id=patient.id,
                    taken=True,
                    log_date=log_date,
                    time_of_day=schedule.time_of_day,
                ))

        exists_today = db.query(MedicationLog).filter(
            MedicationLog.schedule_id == schedule.id,
            MedicationLog.log_date == today,
        ).first()
        if not exists_today and random.random() < 0.7:
            db.add(MedicationLog(
                schedule_id=schedule.id,
                patient_id=patient.id,
                taken=True,
                log_date=today,
                time_of_day=schedule.time_of_day,
            ))

    db.commit()


def assign_caregivers(db, patients, caregivers):
    for idx, patient in enumerate(patients):
        caregiver = caregivers[idx % len(caregivers)]
        exists = db.query(CaregiverPatient).filter(
            CaregiverPatient.caregiver_id == caregiver.id,
            CaregiverPatient.patient_id == patient.id,
        ).first()
        if exists:
            continue
        db.add(CaregiverPatient(
            caregiver_id=caregiver.id,
            patient_id=patient.id,
        ))
    db.commit()
    print("[OK] caregiver assignments created")


def create_notifications(db, patients, caregivers):
    today = date.today()

    for idx, patient in enumerate(patients):
        caregiver = caregivers[idx % len(caregivers)]
        schedule_count = db.query(MedicationSchedule).filter(
            MedicationSchedule.patient_id == patient.id,
            MedicationSchedule.is_active == True,  # noqa: E712
        ).count()

        if schedule_count == 0:
            continue

        taken_today = db.query(MedicationLog).filter(
            MedicationLog.patient_id == patient.id,
            MedicationLog.log_date == today,
            MedicationLog.taken == True,  # noqa: E712
        ).count()

        missed = max(schedule_count - taken_today, 0)

        if missed > 0:
            db.add(Notification(
                user_id=caregiver.id,
                patient_id=patient.id,
                type="missed_dose",
                message=(
                    f"{patient.full_name} missed {missed} dose(s) today "
                    f"({taken_today} of {schedule_count} taken)."
                ),
                is_read=False,
            ))

        db.add(Notification(
            user_id=caregiver.id,
            patient_id=patient.id,
            type="summary",
            message=(
                f"Daily summary for {patient.full_name}: "
                f"{taken_today} of {schedule_count} doses taken today."
            ),
            is_read=False,
        ))

    db.commit()
    print("[OK] notifications created")


def seed():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        patients = [
            get_or_create_user(db, {**p, "role": "patient"})
            for p in FAKE_PATIENTS
        ]
        caregivers = [
            get_or_create_user(db, {**c, "role": "caregiver"})
            for c in FAKE_CAREGIVERS
        ]
        for a in EXTRA_ADMINS:
            get_or_create_user(db, {**a, "role": "admin"})

        for patient, data in zip(patients, FAKE_PATIENTS):
            seed_profile(db, patient, data)
            create_schedules(db, patient, [m["name"] for m in FAKE_MEDICINES])
            create_logs(db, patient)

        assign_caregivers(db, patients, caregivers)
        create_notifications(db, patients, caregivers)

    finally:
        db.close()

    print("\nFake data seeding complete.")


if __name__ == "__main__":
    seed()
