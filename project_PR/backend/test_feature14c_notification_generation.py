import uuid
from datetime import datetime, date, time, timedelta
from zoneinfo import ZoneInfo
from fastapi.testclient import TestClient
from sqlalchemy import select

from main import app
from app.core.database import SessionLocal
from app.models.user import User, PatientProfile
from app.models.medicine import PatientMedication
from app.models.schedule import MedicationSchedule, MedicationScheduleTime, MedicationDoseEvent
from app.models.notification import Notification
from app.schemas.notification import NotificationType
from app.services.reminder_service import get_app_timezone
from app.services.notification_generator import (
    generate_due_notifications,
    generate_missed_notifications,
    generate_patient_notifications,
)

client = TestClient(app)


def run_tests():
    print("==================================================")
    print("RUNNING PILLSYNC FEATURE 14C: NOTIFICATION GENERATION TESTS")
    print("==================================================")

    tz = get_app_timezone()
    today = date(2026, 9, 1)

    # 1. Health checks
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/health/db").status_code == 200
    print("PASS 1/16: Health checks verified (200 OK)")

    # 2. Setup Patient A, Patient B, and Caregiver
    rand_a = uuid.uuid4().hex[:6]
    email_a = f"gen_patient_a_{rand_a}@example.com"
    reg_a = client.post("/api/auth/register", json={
        "first_name": "GenPatient",
        "last_name": "Alpha",
        "email": email_a,
        "password": "Password123!",
        "role": "PATIENT"
    })
    assert reg_a.status_code == 201
    login_a = client.post("/api/auth/login", json={"email": email_a, "password": "Password123!"})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    rand_b = uuid.uuid4().hex[:6]
    email_b = f"gen_patient_b_{rand_b}@example.com"
    reg_b = client.post("/api/auth/register", json={
        "first_name": "GenPatient",
        "last_name": "Beta",
        "email": email_b,
        "password": "Password123!",
        "role": "PATIENT"
    })
    assert reg_b.status_code == 201
    login_b = client.post("/api/auth/login", json={"email": email_b, "password": "Password123!"})
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Caregiver
    rand_cg = uuid.uuid4().hex[:6]
    email_cg = f"caregiver_gen_{rand_cg}@example.com"
    reg_cg = client.post("/api/auth/register", json={
        "first_name": "Caregiver",
        "last_name": "Gen",
        "email": email_cg,
        "password": "Password123!",
        "role": "CAREGIVER"
    })
    assert reg_cg.status_code == 201
    login_cg = client.post("/api/auth/login", json={"email": email_cg, "password": "Password123!"})
    token_cg = login_cg.json()["access_token"]
    headers_cg = {"Authorization": f"Bearer {token_cg}"}

    # Get DB profiles
    db = SessionLocal()
    try:
        user_a = db.execute(select(User).where(User.email == email_a)).scalar_one()
        patient_a = db.execute(select(PatientProfile).where(PatientProfile.user_id == user_a.id)).scalar_one_or_none()
        if not patient_a:
            patient_a = PatientProfile(user_id=user_a.id)
            db.add(patient_a)
            db.commit()
            db.refresh(patient_a)
        patient_a_id = patient_a.id

        user_b = db.execute(select(User).where(User.email == email_b)).scalar_one()
        patient_b = db.execute(select(PatientProfile).where(PatientProfile.user_id == user_b.id)).scalar_one_or_none()
        if not patient_b:
            patient_b = PatientProfile(user_id=user_b.id)
            db.add(patient_b)
            db.commit()
            db.refresh(patient_b)
        patient_b_id = patient_b.id
    finally:
        db.close()

    print("PASS 2/16: Setup Patient A, Patient B, and Caregiver")

    # 3. Create active and inactive medicines + schedules for Patient A
    db = SessionLocal()
    try:
        # Active Med 1: Metformin (Daily 08:00 and 20:00)
        med_metformin = PatientMedication(
            patient_id=patient_a_id,
            custom_medicine_name="Metformin 500mg",
            dosage_amount=500.0,
            dosage_unit="mg",
            start_date=today - timedelta(days=10),
            is_active=True,
        )
        db.add(med_metformin)
        db.commit()
        db.refresh(med_metformin)

        sched_metformin = MedicationSchedule(
            patient_medication_id=med_metformin.id,
            frequency_type="DAILY",
            dose_quantity=1.0,
            dosage_unit="tablet",
            start_date=today - timedelta(days=5),
            is_active=True,
        )
        db.add(sched_metformin)
        db.commit()
        db.refresh(sched_metformin)

        t1 = MedicationScheduleTime(
            schedule_id=sched_metformin.id,
            scheduled_time=time(8, 0),
            time_of_day_type="MORNING",
        )
        t2 = MedicationScheduleTime(
            schedule_id=sched_metformin.id,
            scheduled_time=time(20, 0),
            time_of_day_type="NIGHT",
        )
        db.add_all([t1, t2])
        db.commit()

        # Inactive Schedule: Lisinopril
        med_lisinopril = PatientMedication(
            patient_id=patient_a_id,
            custom_medicine_name="Lisinopril 10mg",
            dosage_amount=10.0,
            dosage_unit="mg",
            start_date=today - timedelta(days=10),
            is_active=True,
        )
        db.add(med_lisinopril)
        db.commit()
        db.refresh(med_lisinopril)

        sched_inactive = MedicationSchedule(
            patient_medication_id=med_lisinopril.id,
            frequency_type="DAILY",
            dose_quantity=1.0,
            dosage_unit="tablet",
            start_date=today - timedelta(days=5),
            is_active=False,  # INACTIVE SCHEDULE
        )
        db.add(sched_inactive)
        db.commit()
        db.refresh(sched_inactive)

        t_inactive = MedicationScheduleTime(
            schedule_id=sched_inactive.id,
            scheduled_time=time(8, 0),
            time_of_day_type="MORNING",
        )
        db.add(t_inactive)
        db.commit()

        sched_metformin_id = sched_metformin.id
        med_metformin_id = med_metformin.id
        sched_inactive_id = sched_inactive.id
    finally:
        db.close()

    print("PASS 3/16: Setup active and inactive schedules")

    # 4. Test 1: Due dose generates MEDICATION_DUE (evaluated at 09:00, 08:00 is due)
    ref_0900 = datetime.combine(today, time(9, 0)).replace(tzinfo=tz)
    db = SessionLocal()
    try:
        due_notifs = generate_due_notifications(
            db=db,
            patient_id=patient_a_id,
            reference_datetime=ref_0900,
        )
        assert len(due_notifs) == 1
        notif = due_notifs[0]
        assert notif.type == "MEDICATION_DUE"
        assert notif.title == "Medication Due"
        assert "Metformin 500mg" in notif.message
        assert notif.patient_id == patient_a_id
        assert notif.related_dose_event_id is not None
        assert notif.related_medicine_id == med_metformin_id
        first_notif_id = notif.id
    finally:
        db.close()

    print("PASS 4/16: Due dose generates MEDICATION_DUE notification with dose event link")

    # 5. Test 2: Running generator twice at 09:01 produces NO duplicate
    ref_0901 = datetime.combine(today, time(9, 1)).replace(tzinfo=tz)
    db = SessionLocal()
    try:
        due_notifs_second = generate_due_notifications(
            db=db,
            patient_id=patient_a_id,
            reference_datetime=ref_0901,
        )
        assert len(due_notifs_second) == 0, f"Expected 0 new notifications, got {len(due_notifs_second)}"

        # Total notifications in DB for patient A is still 1
        all_notifs = db.execute(
            select(Notification).where(
                Notification.patient_id == patient_a_id,
                Notification.type == "MEDICATION_DUE",
            )
        ).scalars().all()
        assert len(all_notifs) == 1
        assert all_notifs[0].id == first_notif_id
    finally:
        db.close()

    print("PASS 5/16: Duplicate prevention verified (running generator again creates 0 duplicates)")

    # 6. Test 3: Future dose (e.g. 20:00 evaluated at 09:00) does NOT generate due notification
    db = SessionLocal()
    try:
        all_due = db.execute(
            select(Notification).where(
                Notification.patient_id == patient_a_id,
                Notification.message.like("%20:00%"),
            )
        ).scalars().all()
        assert len(all_due) == 0
    finally:
        db.close()

    print("PASS 6/16: Future doses do not generate due notifications ahead of time")

    # 7. Test 4 & 5: TAKEN and SKIPPED doses do not generate MISSED_DOSE notifications
    db = SessionLocal()
    try:
        # Create a dose event that is already TAKEN 2 hours ago
        dose_taken = MedicationDoseEvent(
            patient_id=patient_a_id,
            patient_medication_id=med_metformin_id,
            schedule_id=sched_metformin_id,
            scheduled_timestamp=datetime.combine(today - timedelta(days=1), time(8, 0)).replace(tzinfo=tz),
            status="TAKEN",
            actual_taken_timestamp=datetime.combine(today - timedelta(days=1), time(8, 5)).replace(tzinfo=tz),
            dose_quantity_taken=1.0,
        )
        # Create a dose event that is already SKIPPED 2 hours ago
        dose_skipped = MedicationDoseEvent(
            patient_id=patient_a_id,
            patient_medication_id=med_metformin_id,
            schedule_id=sched_metformin_id,
            scheduled_timestamp=datetime.combine(today - timedelta(days=1), time(20, 0)).replace(tzinfo=tz),
            status="SKIPPED",
        )
        db.add_all([dose_taken, dose_skipped])
        db.commit()

        # Run missed notification generator at 08:30
        ref_0830 = datetime.combine(today, time(8, 30)).replace(tzinfo=tz)
        missed = generate_missed_notifications(
            db=db,
            patient_id=patient_a_id,
            reference_datetime=ref_0830,
            grace_minutes=60,
        )
        missed_dose_ids = [m.related_dose_event_id for m in missed]
        assert dose_taken.id not in missed_dose_ids
        assert dose_skipped.id not in missed_dose_ids
        assert len(missed) == 0
    finally:
        db.close()

    print("PASS 7/16: TAKEN and SKIPPED doses do not generate MISSED_DOSE notifications")

    # 8. Test 6 & 7: Pending dose inside grace period vs after grace period
    # Case A: 08:00 evaluated at 08:30 (30 mins overdue, grace is 60 mins) -> NO missed dose
    db = SessionLocal()
    try:
        missed_early = generate_missed_notifications(
            db=db,
            patient_id=patient_a_id,
            reference_datetime=ref_0830,
            grace_minutes=60,
        )
        assert len(missed_early) == 0, f"Expected 0 missed doses at 08:30 (inside grace period), got {len(missed_early)}"
    finally:
        db.close()
    print("PASS 8/16: Pending dose inside grace period (08:30 vs 08:00) does NOT generate MISSED_DOSE")

    # Case B: 08:00 evaluated at 09:30 (90 mins overdue, grace is 60 mins) -> GENERATES MISSED_DOSE
    ref_0930 = datetime.combine(today, time(9, 30)).replace(tzinfo=tz)
    db = SessionLocal()
    try:
        missed_overdue = generate_missed_notifications(
            db=db,
            patient_id=patient_a_id,
            reference_datetime=ref_0930,
            grace_minutes=60,
        )
        assert len(missed_overdue) == 1, f"Expected 1 missed dose at 09:30, got {len(missed_overdue)}"
        assert missed_overdue[0].type == "MISSED_DOSE"
        assert missed_overdue[0].title == "Missed Dose"
        assert "Metformin 500mg" in missed_overdue[0].message

        # Verify dose status in DB was NOT changed to SKIPPED
        dose_event = db.execute(
            select(MedicationDoseEvent).where(MedicationDoseEvent.id == missed_overdue[0].related_dose_event_id)
        ).scalar_one()
        assert dose_event.status == "PENDING", "Dose event status must remain PENDING"

        # Verify running generator again at 09:35 produces 0 duplicate missed notifications
        ref_0935 = datetime.combine(today, time(9, 35)).replace(tzinfo=tz)
        missed_repeat = generate_missed_notifications(
            db=db,
            patient_id=patient_a_id,
            reference_datetime=ref_0935,
            grace_minutes=60,
        )
        assert len(missed_repeat) == 0, "Duplicate MISSED_DOSE notification should be prevented"
    finally:
        db.close()
    print("PASS 9/16: Overdue pending dose after grace period generates MISSED_DOSE (status remains PENDING, duplicates prevented)")

    # 9. Test 8: Inactive schedule does not generate notification
    db = SessionLocal()
    try:
        inactive_notifs = db.execute(
            select(Notification).where(
                Notification.patient_id == patient_a_id,
                Notification.message.like("%Lisinopril%"),
            )
        ).scalars().all()
        assert len(inactive_notifs) == 0, "Inactive schedule should never generate notifications"
    finally:
        db.close()
    print("PASS 10/16: Inactive schedules do not generate notifications")

    # 10. Test 9 & 10: Patient isolation & manual trigger endpoint
    res_gen = client.post("/api/patients/me/notifications/generate", headers=headers_a)
    assert res_gen.status_code == 200
    gen_data = res_gen.json()
    assert "due_notifications_created" in gen_data
    assert "missed_notifications_created" in gen_data
    assert "total_created" in gen_data
    print("PASS 11/16: POST /api/patients/me/notifications/generate works for authenticated patient")

    # Verify Patient B has 0 notifications generated from Patient A's triggers
    res_b = client.get("/api/patients/me/notifications", headers=headers_b)
    assert res_b.status_code == 200
    assert res_b.json()["total_count"] == 0
    print("PASS 12/16: Patient A generation does not affect Patient B (Strict isolation)")

    # 11. Test 11: Security - unauthenticated returns 401, caregiver returns 403
    res_unauth = client.post("/api/patients/me/notifications/generate")
    assert res_unauth.status_code == 401
    res_cg = client.post("/api/patients/me/notifications/generate", headers=headers_cg)
    assert res_cg.status_code == 403
    print("PASS 13/16: Role protection and auth enforcement verified (401 / 403)")

    # 12. Existing notification API functions seamlessly
    res_list = client.get("/api/patients/me/notifications", headers=headers_a)
    assert res_list.status_code == 200
    assert res_list.json()["total_count"] >= 2  # Has DUE and MISSED notifications
    print("PASS 14/16: Existing notification list API correctly reflects generated notifications")

    # 13. Existing reminder, dose, and adherence endpoints have no regressions
    assert client.get("/api/patients/me/reminders/due", headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/reminders/upcoming", headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/reminders/summary", headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/adherence/today", headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/adherence/week", headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/adherence/month", headers=headers_a).status_code == 200
    print("PASS 15/16: Existing reminder and adherence APIs verified (0 regressions)")

    # 14. Mark-all-read on generated notifications
    res_read_all = client.patch("/api/patients/me/notifications/read-all", headers=headers_a)
    assert res_read_all.status_code == 200
    res_count = client.get("/api/patients/me/notifications/unread-count", headers=headers_a)
    assert res_count.json()["unread_count"] == 0
    print("PASS 16/16: Mark-all-read clears all generated unread notifications")

    print("==================================================")
    print("ALL 16 PILLSYNC FEATURE 14C TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
