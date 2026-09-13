import uuid
from datetime import date, time, datetime, timedelta, timezone
from decimal import Decimal

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, PatientProfile, CaregiverProfile, CaregiverPatientAssignment
from app.models.medicine import Medicine, PatientMedication
from app.models.schedule import MedicationSchedule, MedicationScheduleTime, MedicationDoseEvent
from app.models.notification import Notification
from app.services.reminder_service import get_app_timezone

def seed_demo_data():
    db = SessionLocal()
    tz = get_app_timezone()
    now = datetime.now(tz)
    today = now.date()

    print("Seeding realistic demo data for PillSync...")

    try:
        # 1. Setup Patient Demo Account
        patient_user = db.query(User).filter(User.email == "patient@pillsync.com").first()
        if not patient_user:
            patient_user = User(
                email="patient@pillsync.com",
                password_hash=hash_password("Patient@123456"),
                role="PATIENT",
                first_name="Sarah",
                last_name="Jenkins",
                phone_number="+1-555-0142",
                is_active=True,
            )
            db.add(patient_user)
            db.flush()
        else:
            patient_user.password_hash = hash_password("Patient@123456")
            patient_user.first_name = "Sarah"
            patient_user.last_name = "Jenkins"
            patient_user.is_active = True
            db.flush()

        patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == patient_user.id).first()
        if not patient_profile:
            patient_profile = PatientProfile(
                user_id=patient_user.id,
                date_of_birth=date(1988, 4, 12),
                gender="FEMALE",
                blood_group="O+",
                allergies="Penicillin, Sulfa drugs",
                medical_conditions="Type 2 Diabetes, Mild Hypertension, Asthma",
                emergency_contact_name="Robert Jenkins (Spouse)",
                emergency_contact_phone="+1-555-0199",
            )
            db.add(patient_profile)
            db.flush()
        else:
            patient_profile.date_of_birth = date(1988, 4, 12)
            patient_profile.gender = "FEMALE"
            patient_profile.blood_group = "O+"
            patient_profile.allergies = "Penicillin, Sulfa drugs"
            patient_profile.medical_conditions = "Type 2 Diabetes, Mild Hypertension, Asthma"
            patient_profile.emergency_contact_name = "Robert Jenkins (Spouse)"
            patient_profile.emergency_contact_phone = "+1-555-0199"
            db.flush()

        # 2. Setup Caregiver Demo Account
        caregiver_user = db.query(User).filter(User.email == "caregiver@pillsync.com").first()
        if not caregiver_user:
            caregiver_user = User(
                email="caregiver@pillsync.com",
                password_hash=hash_password("Caregiver@123456"),
                role="CAREGIVER",
                first_name="Dr. Michael",
                last_name="Vance",
                phone_number="+1-555-0188",
                is_active=True,
            )
            db.add(caregiver_user)
            db.flush()
        else:
            caregiver_user.password_hash = hash_password("Caregiver@123456")
            caregiver_user.first_name = "Dr. Michael"
            caregiver_user.last_name = "Vance"
            caregiver_user.is_active = True
            db.flush()

        caregiver_profile = db.query(CaregiverProfile).filter(CaregiverProfile.user_id == caregiver_user.id).first()
        if not caregiver_profile:
            caregiver_profile = CaregiverProfile(
                user_id=caregiver_user.id,
                relationship_type="Primary Physician",
                organization="Metro Health Medical Clinic",
            )
            db.add(caregiver_profile)
            db.flush()

        # Link Caregiver to Patient
        link = db.query(CaregiverPatientAssignment).filter(
            CaregiverPatientAssignment.caregiver_id == caregiver_profile.id,
            CaregiverPatientAssignment.patient_id == patient_profile.id,
        ).first()
        if not link:
            link = CaregiverPatientAssignment(
                caregiver_id=caregiver_profile.id,
                patient_id=patient_profile.id,
                relationship_type="Primary Physician",
                permission_level="FULL_ACCESS",
                is_active=True,
            )
            db.add(link)
            db.flush()

        # 3. Setup Admin Account
        admin_user = db.query(User).filter(User.email == "admin@pillsync.com").first()
        if not admin_user:
            admin_user = User(
                email="admin@pillsync.com",
                password_hash=hash_password("Admin@123456"),
                role="ADMIN",
                first_name="System",
                last_name="Administrator",
                is_active=True,
            )
            db.add(admin_user)
            db.flush()
        else:
            admin_user.password_hash = hash_password("Admin@123456")
            admin_user.is_active = True
            db.flush()

        # 4. Clear existing medications for clean demo seed if desired or upsert
        existing_meds = db.query(PatientMedication).filter(PatientMedication.patient_id == patient_profile.id).all()
        for m in existing_meds:
            db.delete(m)
        db.flush()

        # 5. Seed Diverse Medications
        medications_data = [
            {
                "name": "Metformin HCL 500mg",
                "generic": "Metformin Hydrochloride",
                "dosage_amount": Decimal("500.0"),
                "dosage_unit": "mg",
                "initial_quantity": Decimal("100.0"),
                "current_quantity": Decimal("64.0"),
                "quantity_per_dose": Decimal("1.0"),
                "stock_unit": "tablet",
                "low_stock_threshold": Decimal("14.0"),
                "instructions": "Take twice daily with meals (morning and dinner) to reduce GI upset.",
                "start_date": today - timedelta(days=60),
                "times": [time(8, 0), time(20, 0)],
            },
            {
                "name": "Lisinopril 10mg",
                "generic": "Lisinopril",
                "dosage_amount": Decimal("10.0"),
                "dosage_unit": "mg",
                "initial_quantity": Decimal("60.0"),
                "current_quantity": Decimal("28.0"),
                "quantity_per_dose": Decimal("1.0"),
                "stock_unit": "tablet",
                "low_stock_threshold": Decimal("7.0"),
                "instructions": "Take once daily in the morning with a full glass of water.",
                "start_date": today - timedelta(days=90),
                "times": [time(9, 0)],
            },
            {
                "name": "Atorvastatin Calcium 20mg",
                "generic": "Atorvastatin",
                "dosage_amount": Decimal("20.0"),
                "dosage_unit": "mg",
                "initial_quantity": Decimal("30.0"),
                "current_quantity": Decimal("4.0"),  # LOW STOCK
                "quantity_per_dose": Decimal("1.0"),
                "stock_unit": "tablet",
                "low_stock_threshold": Decimal("7.0"),
                "instructions": "Take once daily in the evening at bedtime.",
                "start_date": today - timedelta(days=45),
                "times": [time(21, 0)],
            },
            {
                "name": "Ventolin HFA (Albuterol Inhaler)",
                "generic": "Albuterol Sulfate",
                "dosage_amount": Decimal("90.0"),
                "dosage_unit": "mcg",
                "initial_quantity": Decimal("200.0"),
                "current_quantity": Decimal("0.0"),  # OUT OF STOCK
                "quantity_per_dose": Decimal("2.0"),
                "stock_unit": "puff",
                "low_stock_threshold": Decimal("20.0"),
                "instructions": "Inhale 2 puffs every 4 to 6 hours as needed or before exercise.",
                "start_date": today - timedelta(days=30),
                "times": [time(7, 30), time(18, 30)],
            },
            {
                "name": "Vitamin D3 2000 IU",
                "generic": "Cholecalciferol",
                "dosage_amount": Decimal("2000.0"),
                "dosage_unit": "IU",
                "initial_quantity": Decimal("60.0"),
                "current_quantity": Decimal("52.0"),
                "quantity_per_dose": Decimal("1.0"),
                "stock_unit": "softgel",
                "low_stock_threshold": Decimal("10.0"),
                "instructions": "Take 1 softgel daily with breakfast.",
                "start_date": today - timedelta(days=15),
                "times": [time(8, 30)],
            },
            {
                "name": "Omega-3 Fish Oil 1000mg",
                "generic": "Omega-3 Fatty Acids (EPA/DHA)",
                "dosage_amount": Decimal("1000.0"),
                "dosage_unit": "mg",
                "initial_quantity": Decimal("90.0"),
                "current_quantity": Decimal("6.0"),  # LOW STOCK
                "quantity_per_dose": Decimal("2.0"),
                "stock_unit": "capsule",
                "low_stock_threshold": Decimal("10.0"),
                "instructions": "Take 2 capsules daily after lunch.",
                "start_date": today - timedelta(days=30),
                "times": [time(13, 0)],
            },
            {
                "name": "Amoxicillin 250mg/5ml Suspension",
                "generic": "Amoxicillin",
                "dosage_amount": Decimal("250.0"),
                "dosage_unit": "mg",
                "initial_quantity": Decimal("150.0"),
                "current_quantity": Decimal("75.0"),
                "quantity_per_dose": Decimal("10.0"),
                "stock_unit": "ml",
                "low_stock_threshold": Decimal("25.0"),
                "instructions": "Shake bottle well before use. Take 10 ml three times daily for 7 days.",
                "start_date": today - timedelta(days=3),
                "end_date": today + timedelta(days=4),
                "times": [time(8, 0), time(14, 0), time(20, 0)],
            },
        ]

        created_schedules = []

        for m_data in medications_data:
            # Catalog entry
            cat_entry = db.query(Medicine).filter(Medicine.name.ilike(m_data["name"])).first()
            if not cat_entry:
                cat_entry = Medicine(
                    name=m_data["name"],
                    generic_name=m_data["generic"],
                    category="Prescription/OTC",
                    is_active=True,
                )
                db.add(cat_entry)
                db.flush()

            # Patient Medication
            p_med = PatientMedication(
                patient_id=patient_profile.id,
                medicine_id=cat_entry.id,
                custom_medicine_name=m_data["name"],
                dosage_amount=m_data["dosage_amount"],
                dosage_unit=m_data["dosage_unit"],
                instructions=m_data["instructions"],
                start_date=m_data["start_date"],
                end_date=m_data.get("end_date"),
                is_active=True,
                initial_quantity=m_data["initial_quantity"],
                current_quantity=m_data["current_quantity"],
                quantity_per_dose=m_data["quantity_per_dose"],
                stock_unit=m_data["stock_unit"],
                low_stock_threshold=m_data["low_stock_threshold"],
            )
            db.add(p_med)
            db.flush()

            # Schedule
            sched = MedicationSchedule(
                patient_medication_id=p_med.id,
                frequency_type="DAILY",
                dose_quantity=m_data["quantity_per_dose"],
                dosage_unit=m_data["stock_unit"],
                start_date=m_data["start_date"],
                end_date=m_data.get("end_date"),
                instructions=m_data["instructions"],
                is_active=True,
            )
            db.add(sched)
            db.flush()

            for t in m_data["times"]:
                sched_time = MedicationScheduleTime(
                    schedule_id=sched.id,
                    scheduled_time=t,
                    time_of_day_type="MORNING" if t.hour < 12 else ("AFTERNOON" if t.hour < 17 else ("EVENING" if t.hour < 21 else "NIGHT")),
                )
                db.add(sched_time)

            db.flush()
            created_schedules.append((p_med, sched, m_data["times"]))

        # 6. Seed Historical Doses for the last 7 days
        for day_offset in range(7, 0, -1):
            target_date = today - timedelta(days=day_offset)
            for p_med, sched, times in created_schedules:
                # If medicine was active on that day
                if p_med.start_date <= target_date and (not p_med.end_date or p_med.end_date >= target_date):
                    for t in times:
                        dt = datetime.combine(target_date, t).replace(tzinfo=tz)
                        
                        # Simulate high compliance: 85% taken, 15% skipped
                        is_skipped = (day_offset == 3 and t.hour >= 20) or (day_offset == 5 and t.hour == 8)
                        
                        status = "SKIPPED" if is_skipped else "TAKEN"
                        taken_ts = None if is_skipped else dt + timedelta(minutes=12)
                        notes = "Felt mild stomach nausea" if is_skipped else None

                        dose_event = MedicationDoseEvent(
                            patient_medication_id=p_med.id,
                            schedule_id=sched.id,
                            patient_id=patient_profile.id,
                            scheduled_timestamp=dt,
                            status=status,
                            actual_taken_timestamp=taken_ts,
                            dose_quantity_taken=sched.dose_quantity if not is_skipped else None,
                            recorded_by_user_id=patient_user.id,
                            notes=notes,
                        )
                        db.add(dose_event)

        # 7. Seed Today's Doses (Some taken, some pending for interactive UI)
        for p_med, sched, times in created_schedules:
            if p_med.start_date <= today and (not p_med.end_date or p_med.end_date >= today):
                for t in times:
                    dt = datetime.combine(today, t).replace(tzinfo=tz)
                    if t.hour < now.hour or (t.hour == now.hour and t.minute <= now.minute):
                        status = "TAKEN"
                        taken_ts = dt + timedelta(minutes=5)
                    else:
                        status = "PENDING"
                        taken_ts = None

                    dose_event = MedicationDoseEvent(
                        patient_medication_id=p_med.id,
                        schedule_id=sched.id,
                        patient_id=patient_profile.id,
                        scheduled_timestamp=dt,
                        status=status,
                        actual_taken_timestamp=taken_ts,
                        dose_quantity_taken=sched.dose_quantity if status == "TAKEN" else None,
                        recorded_by_user_id=patient_user.id,
                    )
                    db.add(dose_event)

        # 8. Seed Realistic Notifications
        db.query(Notification).filter(Notification.patient_id == patient_profile.id).delete()

        notifications_data = [
            {
                "type": "MEDICATION_DUE",
                "title": "Upcoming Dose Reminder",
                "message": "It's time to take your Metformin HCL 500mg (1 tablet with evening meal).",
                "is_read": False,
                "created_at": now - timedelta(minutes=15),
            },
            {
                "type": "SYSTEM",
                "title": "Low Stock Warning: Atorvastatin Calcium",
                "message": "You have only 4 tablets of Atorvastatin Calcium 20mg remaining. Consider ordering a refill soon.",
                "is_read": False,
                "created_at": now - timedelta(hours=2),
            },
            {
                "type": "SYSTEM",
                "title": "Out of Stock Alert: Ventolin Inhaler",
                "message": "Ventolin HFA Inhaler is currently at 0 puffs remaining.",
                "is_read": False,
                "created_at": now - timedelta(hours=5),
            },
            {
                "type": "MEDICATION_DUE",
                "title": "Morning Medication Taken",
                "message": "Successfully recorded morning Lisinopril 10mg dose at 09:05 AM.",
                "is_read": True,
                "created_at": now - timedelta(hours=6),
            },
        ]

        for n_data in notifications_data:
            notif = Notification(
                patient_id=patient_profile.id,
                recipient_user_id=patient_user.id,
                type=n_data["type"],
                title=n_data["title"],
                message=n_data["message"],
                is_read=n_data["is_read"],
                created_at=n_data["created_at"],
            )
            db.add(notif)

        db.commit()
        print("Successfully seeded rich demo data!")
        print("   - Patient:   patient@pillsync.com  (Password: Patient@123456)")
        print("   - Caregiver: caregiver@pillsync.com (Password: Caregiver@123456)")
        print("   - Admin:     admin@pillsync.com     (Password: Admin@123456)")
        print(f"   - Added {len(medications_data)} realistic medications with stock levels, units, schedules, and past dose events.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {type(e).__name__} - {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
