import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.database import engine
from app.database import Base

import app.models

from app.models.user import User
from app.models.medicine import Medicine
from app.models.medication_schedule import MedicationSchedule
from app.models.caregiver import CaregiverPatient

from app.utils.password import hash_password

SEED_USERS = [
    {
        "full_name": "Ayesha Khan",
        "email": "patient@pillsync.com",
        "password": "patient123",
        "phone": "03001234567",
        "role": "patient",
    },
    {
        "full_name": "Imran Ali",
        "email": "caregiver@pillsync.com",
        "password": "caregiver123",
        "phone": "03009876543",
        "role": "caregiver",
    },
    {
        "full_name": "Dr. Sarah Ahmed",
        "email": "admin@pillsync.com",
        "password": "admin123",
        "phone": "03001112233",
        "role": "admin",
    },
]

SEED_MEDICINES = [
    {"name": "Metformin", "brand": "Glucophage", "default_dosage": "500 mg", "description": "Blood sugar control"},
    {"name": "Atorvastatin", "brand": "Lipitor", "default_dosage": "10 mg", "description": "Cholesterol management"},
    {"name": "Vitamin D3", "brand": "Nature Made", "default_dosage": "1000 IU", "description": "Bone health supplement"},
    {"name": "Amlodipine", "brand": "Norvasc", "default_dosage": "5 mg", "description": "Blood pressure control"},
    {"name": "Omeprazole", "brand": "Prilosec", "default_dosage": "20 mg", "description": "Acid reflux relief"},
]

PATIENT_SCHEDULES = [
    {"medicine": "Metformin", "dosage": "500 mg", "time_of_day": "morning", "notes": "After breakfast"},
    {"medicine": "Vitamin D3", "dosage": "1000 IU", "time_of_day": "afternoon", "notes": "After lunch"},
    {"medicine": "Amlodipine", "dosage": "5 mg", "time_of_day": "evening", "notes": "After dinner"},
    {"medicine": "Atorvastatin", "dosage": "10 mg", "time_of_day": "night", "notes": "Before sleep"},
]


def get_or_create_user(db, data):
    user = db.query(User).filter(User.email == data["email"]).first()

    if user:
        print(f"[SKIP] user {data['email']} already exists")
        return user

    user = User(
        full_name=data["full_name"],
        email=data["email"],
        password_hash=hash_password(data["password"]),
        phone=data["phone"],
        role=data["role"],
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    print(f"[OK] user {data['role']:<9} -> {data['full_name']} ({data['email']})")

    return user


def get_or_create_medicine(db, data):
    medicine = db.query(Medicine).filter(Medicine.name == data["name"]).first()

    if medicine:
        print(f"[SKIP] medicine {data['name']} already exists")
        return medicine

    medicine = Medicine(
        name=data["name"],
        brand=data["brand"],
        default_dosage=data["default_dosage"],
        description=data["description"],
    )

    db.add(medicine)
    db.commit()
    db.refresh(medicine)

    print(f"[OK] medicine -> {data['name']} ({data['brand']})")

    return medicine


def seed():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        users = {u["role"]: get_or_create_user(db, u) for u in SEED_USERS}

        patient = users["patient"]
        caregiver = users["caregiver"]

        medicines = {
            m["name"]: get_or_create_medicine(db, m)
            for m in SEED_MEDICINES
        }

        existing = {
            (s.medicine_id, s.time_of_day)
            for s in db.query(MedicationSchedule).filter(
                MedicationSchedule.patient_id == patient.id
            ).all()
        }

        for item in PATIENT_SCHEDULES:
            medicine = medicines[item["medicine"]]

            if (medicine.id, item["time_of_day"]) in existing:
                print(
                    f"[SKIP] schedule {item['medicine']} {item['time_of_day']}"
                )
                continue

            db.add(MedicationSchedule(
                patient_id=patient.id,
                medicine_id=medicine.id,
                dosage=item["dosage"],
                time_of_day=item["time_of_day"],
                notes=item["notes"],
                is_active=True,
            ))

            print(
                f"[OK] schedule -> {item['medicine']} "
                f"({item['dosage']}) {item['time_of_day']}"
            )

        db.commit()

        assignment = (
            db.query(CaregiverPatient)
            .filter(
                CaregiverPatient.caregiver_id == caregiver.id,
                CaregiverPatient.patient_id == patient.id,
            )
            .first()
        )

        if assignment is None:
            db.add(CaregiverPatient(
                caregiver_id=caregiver.id,
                patient_id=patient.id,
            ))
            db.commit()
            print("[OK] caregiver assigned to patient")
        else:
            print("[SKIP] caregiver already assigned to patient")

    finally:
        db.close()

    print("\nSeed complete. Users, medicines and schedules are ready.")


if __name__ == "__main__":
    seed()
