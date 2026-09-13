import uuid
from datetime import datetime, timezone
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, PatientProfile, CaregiverPatientAssignment
from app.models.medicine import PatientMedication
from app.models.schedule import MedicationSchedule, MedicationScheduleTime, MedicationDoseEvent
from app.models.inventory import MedicineInventory, InventoryTransaction
from app.models.notification import Notification, NotificationPreference
from app.models.prescription import Prescription

def clone_patient_data():
    db = SessionLocal()
    try:
        source_email = "patient@pillsync.com"
        target_email = "reddycharanappayyagari@gmail.com"
        target_password = "Reddy@2007"

        print(f"Transferring all data from {source_email} to {target_email}...")

        # 1. Fetch source user & profile
        source_user = db.query(User).filter(User.email == source_email).first()
        if not source_user:
            raise RuntimeError(f"Source user {source_email} not found!")

        source_profile = db.query(PatientProfile).filter(PatientProfile.user_id == source_user.id).first()
        if not source_profile:
            raise RuntimeError(f"Source patient profile for {source_email} not found!")

        # 2. Get or create target user
        target_user = db.query(User).filter(User.email == target_email).first()
        if not target_user:
            target_user = User(
                id=uuid.uuid4(),
                email=target_email,
                password_hash=hash_password(target_password),
                role="PATIENT",
                first_name="Charan",
                last_name="Reddy",
                phone_number=source_user.phone_number or "+91-9876543210",
                is_active=True,
            )
            db.add(target_user)
            db.flush()
            print(f"Created new user: {target_email} ({target_user.id})")
        else:
            target_user.password_hash = hash_password(target_password)
            target_user.is_active = True
            target_user.role = "PATIENT"
            target_user.first_name = "Charan"
            target_user.last_name = "Reddy"
            db.flush()
            print(f"Updated existing user: {target_email} ({target_user.id}) with new password")

        # 3. Get or create target patient profile
        target_profile = db.query(PatientProfile).filter(PatientProfile.user_id == target_user.id).first()
        if not target_profile:
            target_profile = PatientProfile(
                id=uuid.uuid4(),
                user_id=target_user.id,
                date_of_birth=source_profile.date_of_birth,
                gender=source_profile.gender,
                blood_group=source_profile.blood_group,
                allergies=source_profile.allergies,
                medical_conditions=source_profile.medical_conditions,
                emergency_contact_name=source_profile.emergency_contact_name,
                emergency_contact_phone=source_profile.emergency_contact_phone,
            )
            db.add(target_profile)
            db.flush()
            print(f"Created patient profile for {target_email} ({target_profile.id})")
        else:
            # Clean up existing data for target profile to avoid duplicates
            print(f"Cleaning existing records for target profile {target_profile.id}...")
            db.query(MedicationDoseEvent).filter(MedicationDoseEvent.patient_id == target_profile.id).delete()
            db.query(Notification).filter(Notification.patient_id == target_profile.id).delete()
            db.query(NotificationPreference).filter(NotificationPreference.patient_id == target_profile.id).delete()
            db.query(CaregiverPatientAssignment).filter(CaregiverPatientAssignment.patient_id == target_profile.id).delete()
            db.query(InventoryTransaction).filter(
                InventoryTransaction.inventory_id.in_(
                    db.query(MedicineInventory.id).filter(MedicineInventory.patient_id == target_profile.id)
                )
            ).delete(synchronize_session=False)
            db.query(MedicineInventory).filter(MedicineInventory.patient_id == target_profile.id).delete()
            db.query(PatientMedication).filter(PatientMedication.patient_id == target_profile.id).delete()
            db.flush()

            # Update profile info
            target_profile.date_of_birth = source_profile.date_of_birth
            target_profile.gender = source_profile.gender
            target_profile.blood_group = source_profile.blood_group
            target_profile.allergies = source_profile.allergies
            target_profile.medical_conditions = source_profile.medical_conditions
            target_profile.emergency_contact_name = source_profile.emergency_contact_name
            target_profile.emergency_contact_phone = source_profile.emergency_contact_phone
            db.flush()

        # 4. Clone Caregiver assignments
        cg_links = db.query(CaregiverPatientAssignment).filter(CaregiverPatientAssignment.patient_id == source_profile.id).all()
        for link in cg_links:
            db.add(CaregiverPatientAssignment(
                id=uuid.uuid4(),
                caregiver_id=link.caregiver_id,
                patient_id=target_profile.id,
                relationship_type=link.relationship_type,
                permission_level=link.permission_level,
                is_active=link.is_active,
            ))
        db.flush()
        print(f"Cloned {len(cg_links)} caregiver assignment(s)")

        # 5. Clone Patient Medications, Schedules, Inventories
        source_meds = db.query(PatientMedication).filter(PatientMedication.patient_id == source_profile.id).all()
        pm_map = {} # old_id -> new_id
        sched_map = {} # old_id -> new_id
        inv_map = {} # old_id -> new_id

        for sm in source_meds:
            new_pm_id = uuid.uuid4()
            pm_map[sm.id] = new_pm_id

            new_pm = PatientMedication(
                id=new_pm_id,
                patient_id=target_profile.id,
                medicine_id=sm.medicine_id,
                prescription_id=sm.prescription_id,
                custom_medicine_name=sm.custom_medicine_name,
                dosage_amount=sm.dosage_amount,
                dosage_unit=sm.dosage_unit,
                instructions=sm.instructions,
                start_date=sm.start_date,
                end_date=sm.end_date,
                is_active=sm.is_active,
                initial_quantity=sm.initial_quantity,
                current_quantity=sm.current_quantity,
                quantity_per_dose=sm.quantity_per_dose,
                stock_unit=sm.stock_unit,
                low_stock_threshold=sm.low_stock_threshold,
                created_at=sm.created_at,
            )
            db.add(new_pm)
            db.flush()

            # Check for MedicineInventory
            source_inv = db.query(MedicineInventory).filter(MedicineInventory.patient_medication_id == sm.id).first()
            if source_inv:
                new_inv_id = uuid.uuid4()
                inv_map[source_inv.id] = new_inv_id
                db.add(MedicineInventory(
                    id=new_inv_id,
                    patient_medication_id=new_pm_id,
                    patient_id=target_profile.id,
                    current_quantity=source_inv.current_quantity,
                    minimum_threshold=source_inv.minimum_threshold,
                    unit=source_inv.unit,
                    last_refill_date=source_inv.last_refill_date,
                    estimated_depletion_date=source_inv.estimated_depletion_date,
                    recommended_refill_date=source_inv.recommended_refill_date,
                    low_stock_alert_sent=source_inv.low_stock_alert_sent,
                ))
                db.flush()

            # Clone schedules
            schedules = db.query(MedicationSchedule).filter(MedicationSchedule.patient_medication_id == sm.id).all()
            for sched in schedules:
                new_sched_id = uuid.uuid4()
                sched_map[sched.id] = new_sched_id

                new_sched = MedicationSchedule(
                    id=new_sched_id,
                    patient_medication_id=new_pm_id,
                    frequency_type=sched.frequency_type,
                    dose_quantity=sched.dose_quantity,
                    dosage_unit=sched.dosage_unit,
                    days_of_week=sched.days_of_week,
                    interval_days=sched.interval_days,
                    start_date=sched.start_date,
                    end_date=sched.end_date,
                    instructions=sched.instructions,
                    is_active=sched.is_active,
                    time_of_day_type=sched.time_of_day_type,
                    scheduled_time=sched.scheduled_time,
                    created_at=sched.created_at,
                    updated_at=sched.updated_at,
                )
                db.add(new_sched)
                db.flush()

                # Clone schedule times
                sched_times = db.query(MedicationScheduleTime).filter(MedicationScheduleTime.schedule_id == sched.id).all()
                for st in sched_times:
                    db.add(MedicationScheduleTime(
                        id=uuid.uuid4(),
                        schedule_id=new_sched_id,
                        scheduled_time=st.scheduled_time,
                        time_of_day_type=st.time_of_day_type,
                        dose_quantity=st.dose_quantity,
                        created_at=st.created_at,
                    ))
                db.flush()

        print(f"Cloned {len(source_meds)} medications and schedules")

        # 6. Clone Medication Dose Events
        source_doses = db.query(MedicationDoseEvent).filter(MedicationDoseEvent.patient_id == source_profile.id).all()
        dose_map = {} # old_id -> new_id
        for sd in source_doses:
            new_dose_id = uuid.uuid4()
            dose_map[sd.id] = new_dose_id

            new_pm_id = pm_map.get(sd.patient_medication_id)
            if not new_pm_id:
                continue

            new_sched_id = sched_map.get(sd.schedule_id)

            db.add(MedicationDoseEvent(
                id=new_dose_id,
                patient_id=target_profile.id,
                patient_medication_id=new_pm_id,
                schedule_id=new_sched_id,
                scheduled_timestamp=sd.scheduled_timestamp,
                status=sd.status,
                actual_taken_timestamp=sd.actual_taken_timestamp,
                snoozed_until_timestamp=sd.snoozed_until_timestamp,
                dose_quantity_taken=sd.dose_quantity_taken,
                recorded_by_user_id=target_user.id if sd.recorded_by_user_id == source_user.id else sd.recorded_by_user_id,
                notes=sd.notes,
                created_at=sd.created_at,
                updated_at=sd.updated_at,
            ))
        db.flush()
        print(f"Cloned {len(source_doses)} medication dose events")

        # 7. Clone Inventory Transactions
        source_txs = db.query(InventoryTransaction).filter(
            InventoryTransaction.inventory_id.in_(list(inv_map.keys()))
        ).all()
        for tx in source_txs:
            new_inv_id = inv_map.get(tx.inventory_id)
            if not new_inv_id:
                continue
            new_dose_id = dose_map.get(tx.dose_event_id)

            db.add(InventoryTransaction(
                id=uuid.uuid4(),
                inventory_id=new_inv_id,
                dose_event_id=new_dose_id,
                transaction_type=tx.transaction_type,
                quantity_change=tx.quantity_change,
                balance_after=tx.balance_after,
                notes=tx.notes,
                created_at=tx.created_at,
            ))
        db.flush()
        print(f"Cloned {len(source_txs)} inventory transactions")

        # 8. Clone Notifications & Preferences
        source_notifs = db.query(Notification).filter(Notification.patient_id == source_profile.id).all()
        for sn in source_notifs:
            new_pm_id = pm_map.get(sn.related_medicine_id)
            new_dose_id = dose_map.get(sn.related_dose_event_id)

            db.add(Notification(
                id=uuid.uuid4(),
                patient_id=target_profile.id,
                recipient_user_id=target_user.id if sn.recipient_user_id == source_user.id else sn.recipient_user_id,
                type=sn.type,
                related_dose_event_id=new_dose_id,
                related_medicine_id=new_pm_id,
                title=sn.title,
                message=sn.message,
                is_read=sn.is_read,
                read_at=sn.read_at,
                created_at=sn.created_at,
            ))
        db.flush()

        source_prefs = db.query(NotificationPreference).filter(NotificationPreference.patient_id == source_profile.id).all()
        for sp in source_prefs:
            db.add(NotificationPreference(
                id=uuid.uuid4(),
                patient_id=target_profile.id,
                medication_due_enabled=sp.medication_due_enabled,
                missed_dose_enabled=sp.missed_dose_enabled,
                medication_upcoming_enabled=sp.medication_upcoming_enabled,
                system_enabled=sp.system_enabled,
            ))
        db.flush()
        print(f"Cloned {len(source_notifs)} notifications and {len(source_prefs)} preferences")

        # Commit everything
        db.commit()
        print("\n==================================================")
        print("SUCCESSFULLY TRANSFERRED ALL DATA TO REDDY ACCOUNT!")
        print(f"Email:    {target_email}")
        print(f"Password: {target_password}")
        print(f"User ID:  {target_user.id}")
        print(f"Profile:  {target_profile.id}")
        print("==================================================")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    clone_patient_data()
