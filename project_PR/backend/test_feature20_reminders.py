import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from app.core.database import get_db
from app.models.medicine import PatientMedication
from app.models.schedule import MedicationSchedule, MedicationScheduleTime, MedicationDoseEvent
from app.schemas.dose import DoseStatusEnum
from app.schemas.reminder import compute_time_of_day, ReminderTimeOfDay
from app.schemas.notification import NotificationType
from app.services.dose_service import auto_transition_missed_doses
from app.services.notification_service import create_notification

client = TestClient(app)


def _register_and_login_patient(prefix: str):
    rand_suffix = uuid.uuid4().hex[:6]
    email = f"{prefix}_{rand_suffix}@example.com"
    res_reg = client.post("/api/auth/register", json={
        "first_name": "Test",
        "last_name": prefix.capitalize(),
        "email": email,
        "password": "Password123!",
        "role": "PATIENT",
        "phone_number": "+1234567890"
    })
    assert res_reg.status_code == 201

    res_login = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_01_reminder_generated_for_active_medication_schedule():
    headers = _register_and_login_patient("f20_test1")
    # Create medicine
    med_res = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Paracetamol 500mg",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "initial_quantity": "50.0",
        "current_quantity": "50.0",
        "quantity_per_dose": "1.0",
        "stock_unit": "tablet",
    })
    assert med_res.status_code == 201
    med_id = med_res.json()["id"]

    # Create schedule at 08:00
    sched_res = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "08:00:00", "time_of_day_type": "MORNING"}]
    })
    assert sched_res.status_code == 201

    # Query today's reminders with ref time 2026-09-04 09:00:00
    today_res = client.get("/api/patients/me/reminders/today?reference_time=2026-09-04T09:00:00", headers=headers)
    assert today_res.status_code == 200
    reminders = today_res.json()
    assert len(reminders) >= 1
    assert any(r["medicine_name"] == "Paracetamol 500mg" for r in reminders)


def test_02_morning_reminder():
    assert compute_time_of_day("08:00:00") == ReminderTimeOfDay.MORNING.value
    assert compute_time_of_day("05:00:00") == ReminderTimeOfDay.MORNING.value
    assert compute_time_of_day("11:59:00") == ReminderTimeOfDay.MORNING.value


def test_03_afternoon_reminder():
    assert compute_time_of_day("12:00:00") == ReminderTimeOfDay.AFTERNOON.value
    assert compute_time_of_day("14:30:00") == ReminderTimeOfDay.AFTERNOON.value
    assert compute_time_of_day("16:59:00") == ReminderTimeOfDay.AFTERNOON.value


def test_04_night_reminder():
    assert compute_time_of_day("21:00:00") == ReminderTimeOfDay.NIGHT.value
    assert compute_time_of_day("23:30:00") == ReminderTimeOfDay.NIGHT.value
    assert compute_time_of_day("02:00:00") == ReminderTimeOfDay.NIGHT.value


def test_05_repeated_schedule():
    headers = _register_and_login_patient("f20_test5")
    med_res = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Multivitamin",
        "dosage_amount": "1.0",
        "dosage_unit": "capsule",
        "start_date": "2026-09-01",
    })
    assert med_res.status_code == 201
    med_id = med_res.json()["id"]

    sched_res = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "start_date": "2026-09-01",
        "times": [
            {"scheduled_time": "08:00:00", "time_of_day_type": "MORNING"},
            {"scheduled_time": "14:00:00", "time_of_day_type": "AFTERNOON"},
            {"scheduled_time": "20:00:00", "time_of_day_type": "EVENING"},
        ]
    })
    assert sched_res.status_code == 201

    today_res = client.get("/api/patients/me/reminders/today?reference_time=2026-09-04T07:00:00", headers=headers)
    assert today_res.status_code == 200
    reminders = today_res.json()
    assert len(reminders) == 3


def test_06_reminder_status_pending():
    headers = _register_and_login_patient("f20_test6")
    med_res = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Amoxicillin",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
    })
    med_id = med_res.json()["id"]

    sched_res = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "08:00:00"}]
    })
    sched_id = sched_res.json()["id"]

    # 1. Unrecorded upcoming reminder has status UPCOMING
    today_res_early = client.get("/api/patients/me/reminders/today?reference_time=2026-09-04T07:00:00", headers=headers)
    assert today_res_early.status_code == 200
    assert today_res_early.json()[0]["status"] == "UPCOMING"

    # 2. Due reminder has status DUE
    today_res_due = client.get("/api/patients/me/reminders/today?reference_time=2026-09-04T08:30:00", headers=headers)
    assert today_res_due.status_code == 200
    assert today_res_due.json()[0]["status"] == "DUE"

    # 3. Recorded pending dose has status PENDING
    dose_res = client.post("/api/patients/me/doses", headers=headers, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": "2026-09-04T08:00:00",
        "status": "PENDING",
    })
    assert dose_res.status_code == 201
    assert dose_res.json()["status"] == "PENDING"


def test_07_take_action():
    headers = _register_and_login_patient("f20_test7")
    med_res = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Metformin",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "initial_quantity": "60.0",
        "current_quantity": "60.0",
        "quantity_per_dose": "1.0",
        "stock_unit": "tablet",
    })
    med_id = med_res.json()["id"]

    sched_res = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "08:00:00"}]
    })
    sched_id = sched_res.json()["id"]

    # Record dose as TAKEN
    dose_res = client.post("/api/patients/me/doses", headers=headers, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": "2026-09-04T08:00:00",
        "status": "TAKEN",
        "dose_quantity_taken": "1.0",
        "notes": "Taken with breakfast"
    })
    assert dose_res.status_code == 201
    assert dose_res.json()["status"] == "TAKEN"

    # Verify reminder reflects TAKEN
    today_res = client.get("/api/patients/me/reminders/today?reference_time=2026-09-04T09:00:00", headers=headers)
    reminders = today_res.json()
    assert any(r["status"] == "TAKEN" for r in reminders)


def test_08_skip_action():
    headers = _register_and_login_patient("f20_test8")
    med_res = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Ibuprofen",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "initial_quantity": "30.0",
        "current_quantity": "30.0",
        "quantity_per_dose": "1.0",
        "stock_unit": "tablet",
    })
    med_id = med_res.json()["id"]

    sched_res = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "08:00:00"}]
    })
    sched_id = sched_res.json()["id"]

    # Record dose as SKIPPED
    dose_res = client.post("/api/patients/me/doses", headers=headers, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": "2026-09-04T08:00:00",
        "status": "SKIPPED",
        "notes": "Stomach upset"
    })
    assert dose_res.status_code == 201
    assert dose_res.json()["status"] == "SKIPPED"

    # Check stock was NOT deducted
    med_check = client.get("/api/patients/me/medicines", headers=headers)
    med_data = [m for m in med_check.json() if m["id"] == med_id][0]
    assert float(med_data["current_quantity"]) == 30.0


def test_09_snooze_action():
    headers = _register_and_login_patient("f20_test9")
    med_res = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Lisinopril",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
    })
    med_id = med_res.json()["id"]

    sched_res = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "08:00:00"}]
    })
    sched_id = sched_res.json()["id"]

    # Record dose with SNOOZE (e.g. 15 minutes)
    dose_res = client.post("/api/patients/me/doses", headers=headers, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": "2026-09-04T08:00:00",
        "status": "SNOOZED",
        "snooze_minutes": 15,
        "action_timestamp": "2026-09-04T08:05:00",
    })
    assert dose_res.status_code == 201
    dose_data = dose_res.json()
    assert dose_data["status"] == "SNOOZED"
    assert dose_data["snoozed_until_timestamp"] is not None

    # Alternatively test PATCH /snooze endpoint
    dose_id = dose_data["id"]
    patch_res = client.patch(f"/api/patients/me/doses/{dose_id}/snooze", headers=headers, json={
        "snooze_minutes": 20,
        "action_timestamp": "2026-09-04T08:10:00"
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "SNOOZED"


def test_10_automatic_missed_transition():
    # Test auto_transition_missed_doses directly on DB session
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        # Create a test patient user
        headers = _register_and_login_patient("f20_test10")
        med_res = client.post("/api/patients/me/medicines", headers=headers, json={
            "name": "Atorvastatin",
            "dosage_amount": "1.0",
            "dosage_unit": "tablet",
            "start_date": "2026-09-01",
        })
        med_id = med_res.json()["id"]

        sched_res = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
            "frequency_type": "DAILY",
            "dose_quantity": "1.0",
            "start_date": "2026-09-01",
            "times": [{"scheduled_time": "08:00:00"}]
        })
        sched_id = uuid.UUID(sched_res.json()["id"])
        sched_obj = db.query(MedicationSchedule).filter(MedicationSchedule.id == sched_id).first()
        patient_med_id = sched_obj.patient_medication_id
        patient_id = sched_obj.patient_medication.patient_id

        # Insert a pending dose in the past (e.g. 5 hours ago, outside default 4h window)
        old_time = datetime(2026, 9, 4, 2, 0, 0)
        past_dose = MedicationDoseEvent(
            schedule_id=sched_id,
            patient_medication_id=patient_med_id,
            patient_id=patient_id,
            scheduled_timestamp=old_time,
            status=DoseStatusEnum.PENDING.value
        )
        db.add(past_dose)

        # Also insert a taken dose in the past
        taken_dose = MedicationDoseEvent(
            schedule_id=sched_id,
            patient_medication_id=patient_med_id,
            patient_id=patient_id,
            scheduled_timestamp=datetime(2026, 9, 4, 1, 0, 0),
            status=DoseStatusEnum.TAKEN.value
        )
        db.add(taken_dose)
        db.commit()

        # Run auto transition with ref time at 08:00 (old dose at 02:00 is 6h overdue > 60m)
        ref_dt = datetime(2026, 9, 4, 8, 0, 0)
        updated = auto_transition_missed_doses(db, reference_datetime=ref_dt, grace_minutes=60)

        db.refresh(past_dose)
        db.refresh(taken_dose)

        assert past_dose.status == DoseStatusEnum.MISSED.value
        # TAKEN must NEVER be changed to MISSED
        assert taken_dose.status == DoseStatusEnum.TAKEN.value
    finally:
        db.close()


def test_11_snoozed_reminder_generated_correctly():
    headers = _register_and_login_patient("f20_test11")
    med_res = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Omeprazole",
        "dosage_amount": "1.0",
        "dosage_unit": "capsule",
        "start_date": "2026-09-01",
    })
    med_id = med_res.json()["id"]

    sched_res = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "08:00:00"}]
    })
    sched_id = sched_res.json()["id"]

    # Snooze at 08:00 for 10 minutes (snoozed until 08:10)
    client.post("/api/patients/me/doses", headers=headers, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": "2026-09-04T08:00:00",
        "status": "SNOOZED",
        "snooze_minutes": 10,
        "action_timestamp": "2026-09-04T08:00:00"
    })

    # At 08:05, it is SNOOZED and not yet due
    due_0805 = client.get("/api/patients/me/reminders/due?reference_time=2026-09-04T08:05:00", headers=headers)
    assert due_0805.status_code == 200
    assert len(due_0805.json()) == 0

    # At 08:15, the snooze expired and it is due now
    due_0815 = client.get("/api/patients/me/reminders/due?reference_time=2026-09-04T08:15:00", headers=headers)
    assert due_0815.status_code == 200
    assert len(due_0815.json()) >= 1


def test_12_duplicate_reminder_prevention():
    headers = _register_and_login_patient("f20_test12")
    med_res = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Levothyroxine",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
    })
    med_id = med_res.json()["id"]

    sched_res = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "08:00:00"}]
    })
    sched_id = sched_res.json()["id"]

    # Record dose 1
    res1 = client.post("/api/patients/me/doses", headers=headers, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": "2026-09-04T08:00:00",
        "status": "TAKEN",
    })
    assert res1.status_code == 201
    dose1_id = res1.json()["id"]

    # Calling again updates existing record, does NOT create duplicate
    res2 = client.post("/api/patients/me/doses", headers=headers, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": "2026-09-04T08:00:00",
        "status": "TAKEN",
    })
    assert res2.status_code == 200 or res2.status_code == 201
    assert res2.json()["id"] == dose1_id


def test_13_duplicate_notification_prevention():
    from app.core.database import SessionLocal
    from app.models.user import User, PatientProfile
    db = SessionLocal()
    try:
        headers = _register_and_login_patient("f20_test13")
        med_res = client.post("/api/patients/me/medicines", headers=headers, json={
            "name": "Zinc",
            "dosage_amount": "1.0",
            "dosage_unit": "tablet",
            "start_date": "2026-09-01",
        })
        med_id = uuid.UUID(med_res.json()["id"])

        sched_res = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
            "frequency_type": "DAILY",
            "dose_quantity": "1.0",
            "start_date": "2026-09-01",
            "times": [{"scheduled_time": "08:00:00"}]
        })
        sched_id = uuid.UUID(sched_res.json()["id"])

        # Record a dose
        dose_res = client.post("/api/patients/me/doses", headers=headers, json={
            "schedule_id": str(sched_id),
            "scheduled_timestamp": "2026-09-04T08:00:00",
            "status": "PENDING",
        })
        dose_id = uuid.UUID(dose_res.json()["id"])

        # Get patient profile
        dose_obj = db.query(MedicationDoseEvent).filter(MedicationDoseEvent.id == dose_id).first()
        patient_id = dose_obj.patient_id

        # Create first notification
        n1 = create_notification(
            db=db,
            patient_id=patient_id,
            notification_type=NotificationType.MEDICATION_DUE,
            title="Medication Reminder",
            message="Time to take Zinc — 1 tablet.",
            related_dose_event_id=dose_id,
            related_medicine_id=med_id,
        )
        assert n1 is not None

        # Create second notification for the same dose event and type
        n2 = create_notification(
            db=db,
            patient_id=patient_id,
            notification_type=NotificationType.MEDICATION_DUE,
            title="Medication Reminder",
            message="Time to take Zinc — 1 tablet.",
            related_dose_event_id=dose_id,
            related_medicine_id=med_id,
        )

        # Duplicate prevention must return the existing notification without creating a new row
        assert n1.id == n2.id
    finally:
        db.close()


def test_14_inactive_medication_does_not_generate_reminder():
    headers = _register_and_login_patient("f20_test14")
    med_res = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Inactive Medicine",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
    })
    med_id = med_res.json()["id"]

    sched_res = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "08:00:00"}]
    })
    sched_id = sched_res.json()["id"]

    # Deactivate schedule via correct medicine-scoped schedule update endpoint
    patch_res = client.patch(
        f"/api/patients/me/medicines/{med_id}/schedules/{sched_id}",
        headers=headers,
        json={"is_active": False}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["is_active"] is False

    today_res = client.get("/api/patients/me/reminders/today?reference_time=2026-09-04T08:30:00", headers=headers)
    assert today_res.status_code == 200
    reminders = [r for r in today_res.json() if r["schedule_id"] == sched_id]
    assert len(reminders) == 0


def test_15_patient_cannot_access_another_patients_reminder():
    headers_a = _register_and_login_patient("f20_test15_a")
    headers_b = _register_and_login_patient("f20_test15_b")

    # Patient A creates medicine
    med_res = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Patient A Private Med",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
    })
    med_id = med_res.json()["id"]

    client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers_a, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "08:00:00"}]
    })

    # Patient B queries reminders - should NOT see Patient A's medicine
    today_b = client.get("/api/patients/me/reminders/today?reference_time=2026-09-04T08:30:00", headers=headers_b)
    assert today_b.status_code == 200
    assert not any(r["medicine_name"] == "Patient A Private Med" for r in today_b.json())


def test_16_unauthenticated_access_rejected():
    res_today = client.get("/api/patients/me/reminders/today")
    assert res_today.status_code == 401

    res_due = client.get("/api/patients/me/reminders/due")
    assert res_due.status_code == 401

    res_upcoming = client.get("/api/patients/me/reminders/upcoming")
    assert res_upcoming.status_code == 401


def test_17_reminder_integrates_with_existing_dose_tracking():
    headers = _register_and_login_patient("f20_test17")
    med_res = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Vitamin C",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
    })
    med_id = med_res.json()["id"]

    sched_res = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "08:00:00"}]
    })
    sched_id = sched_res.json()["id"]

    # Record dose
    client.post("/api/patients/me/doses", headers=headers, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": "2026-09-04T08:00:00",
        "status": "TAKEN",
    })

    # Verify dose is tracked in patient doses endpoint
    doses_res = client.get("/api/patients/me/doses", headers=headers)
    assert doses_res.status_code == 200
    assert len(doses_res.json()) >= 1
    assert doses_res.json()[0]["status"] == "TAKEN"


def test_18_take_integrates_with_existing_stock_consumption():
    headers = _register_and_login_patient("f20_test18")
    med_res = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Aspirin 81mg",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "initial_quantity": "100.0",
        "current_quantity": "100.0",
        "quantity_per_dose": "2.0",
        "stock_unit": "tablet",
    })
    med_id = med_res.json()["id"]

    sched_res = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "2.0",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "08:00:00"}]
    })
    sched_id = sched_res.json()["id"]

    # Take dose
    client.post("/api/patients/me/doses", headers=headers, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": "2026-09-04T08:00:00",
        "status": "TAKEN",
        "dose_quantity_taken": "2.0",
    })

    # Verify stock reduced by 2.0 (100.0 -> 98.0)
    med_check = client.get("/api/patients/me/medicines", headers=headers)
    med_data = [m for m in med_check.json() if m["id"] == med_id][0]
    assert float(med_data["current_quantity"]) == 98.0


if __name__ == "__main__":
    tests = [
        test_01_reminder_generated_for_active_medication_schedule,
        test_02_morning_reminder,
        test_03_afternoon_reminder,
        test_04_night_reminder,
        test_05_repeated_schedule,
        test_06_reminder_status_pending,
        test_07_take_action,
        test_08_skip_action,
        test_09_snooze_action,
        test_10_automatic_missed_transition,
        test_11_snoozed_reminder_generated_correctly,
        test_12_duplicate_reminder_prevention,
        test_13_duplicate_notification_prevention,
        test_14_inactive_medication_does_not_generate_reminder,
        test_15_patient_cannot_access_another_patients_reminder,
        test_16_unauthenticated_access_rejected,
        test_17_reminder_integrates_with_existing_dose_tracking,
        test_18_take_integrates_with_existing_stock_consumption,
    ]
    print(f"Running {len(tests)} Feature 20 tests...")
    for t in tests:
        t()
        print(f"  [PASS] {t.__name__}")
    print("All Feature 20 Smart Medication Reminder tests passed successfully!")
