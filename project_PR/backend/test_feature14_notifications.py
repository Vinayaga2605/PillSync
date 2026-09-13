import uuid
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import select

from main import app
from app.core.database import SessionLocal
from app.models.user import User, PatientProfile
from app.models.notification import Notification
from app.schemas.notification import NotificationType
from app.services.notification_service import (
    create_notification,
    create_dose_notification_if_not_exists,
    get_patient_notifications,
    get_unread_notification_count,
    mark_notification_as_read,
    mark_all_notifications_as_read,
)

client = TestClient(app)


def run_tests():
    print("==================================================")
    print("RUNNING PILLSYNC FEATURE 14A: NOTIFICATION ENGINE TESTS")
    print("==================================================")

    # 1. Health checks
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    res_db = client.get("/api/health/db")
    assert res_db.status_code == 200, f"DB Health check failed: {res_db.text}"
    print("PASS 1/16: Health checks verified (200 OK)")

    # 2. Setup Patient A, Patient B, and Caregiver
    rand_a = uuid.uuid4().hex[:6]
    email_a = f"patient_notif_a_{rand_a}@example.com"
    reg_a = client.post("/api/auth/register", json={
        "first_name": "Notif",
        "last_name": "Alpha",
        "email": email_a,
        "password": "Password123!",
        "role": "PATIENT"
    })
    assert reg_a.status_code == 201
    login_a = client.post("/api/auth/login", json={"email": email_a, "password": "Password123!"})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Patient B
    rand_b = uuid.uuid4().hex[:6]
    email_b = f"patient_notif_b_{rand_b}@example.com"
    reg_b = client.post("/api/auth/register", json={
        "first_name": "Notif",
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
    email_cg = f"caregiver_notif_{rand_cg}@example.com"
    reg_cg = client.post("/api/auth/register", json={
        "first_name": "Caregiver",
        "last_name": "Gamma",
        "email": email_cg,
        "password": "Password123!",
        "role": "CAREGIVER"
    })
    assert reg_cg.status_code == 201
    login_cg = client.post("/api/auth/login", json={"email": email_cg, "password": "Password123!"})
    token_cg = login_cg.json()["access_token"]
    headers_cg = {"Authorization": f"Bearer {token_cg}"}
    print("PASS 2/16: Setup Patient A, Patient B, and Caregiver users")

    # Get patient profile IDs
    db = SessionLocal()
    try:
        user_a = db.execute(select(User).where(User.email == email_a)).scalar_one()
        patient_profile_a = db.execute(select(PatientProfile).where(PatientProfile.user_id == user_a.id)).scalar_one_or_none()
        if not patient_profile_a:
            patient_profile_a = PatientProfile(user_id=user_a.id)
            db.add(patient_profile_a)
            db.commit()
            db.refresh(patient_profile_a)
        patient_a_id = patient_profile_a.id

        user_b = db.execute(select(User).where(User.email == email_b)).scalar_one()
        patient_profile_b = db.execute(select(PatientProfile).where(PatientProfile.user_id == user_b.id)).scalar_one_or_none()
        if not patient_profile_b:
            patient_profile_b = PatientProfile(user_id=user_b.id)
            db.add(patient_profile_b)
            db.commit()
            db.refresh(patient_profile_b)
        patient_b_id = patient_profile_b.id
    finally:
        db.close()

    # 3. Empty notification list
    res = client.get("/api/patients/me/notifications", headers=headers_a)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["total_count"] == 0
    assert data["unread_count"] == 0
    assert len(data["items"]) == 0
    print("PASS 3/16: Empty notification list works (total_count=0, unread_count=0)")

    # 4. Unread count endpoint on empty
    res = client.get("/api/patients/me/notifications/unread-count", headers=headers_a)
    assert res.status_code == 200
    assert res.json()["unread_count"] == 0
    print("PASS 4/16: Unread count endpoint returns 0 initially")

    # 5. Create notifications for Patient A and verify persistence in DB
    db = SessionLocal()
    try:
        n1 = create_notification(
            db=db,
            patient_id=patient_a_id,
            notification_type=NotificationType.MEDICATION_DUE,
            title="Medication Due",
            message="Your Metformin 500mg dose is due now.",
        )
        n2 = create_notification(
            db=db,
            patient_id=patient_a_id,
            notification_type=NotificationType.MEDICATION_UPCOMING,
            title="Upcoming Medication",
            message="You have a Lisinopril dose scheduled in 1 hour.",
        )
        n3 = create_notification(
            db=db,
            patient_id=patient_a_id,
            notification_type=NotificationType.SYSTEM,
            title="Welcome to PillSync",
            message="Your notification engine is successfully configured.",
        )
        n1_id = n1.id
        n2_id = n2.id
        n3_id = n3.id

        # Notification for Patient B
        n_b = create_notification(
            db=db,
            patient_id=patient_b_id,
            notification_type=NotificationType.MEDICATION_DUE,
            title="Patient B Due",
            message="Patient B dose due.",
        )
        n_b_id = n_b.id
    finally:
        db.close()

    print("PASS 5/16: Notification creation and database persistence verified")

    # 6. Retrieve notifications via API for Patient A
    res = client.get("/api/patients/me/notifications", headers=headers_a)
    assert res.status_code == 200
    data = res.json()
    assert data["total_count"] == 3
    assert data["unread_count"] == 3
    assert len(data["items"]) == 3
    item_ids = [item["id"] for item in data["items"]]
    assert str(n1_id) in item_ids
    assert str(n2_id) in item_ids
    assert str(n3_id) in item_ids
    assert str(n_b_id) not in item_ids
    print("PASS 6/16: Patient A retrieves all 3 notifications, Patient B notifications isolated")

    # 7. Check unread count endpoint
    res = client.get("/api/patients/me/notifications/unread-count", headers=headers_a)
    assert res.status_code == 200
    assert res.json()["unread_count"] == 3
    print("PASS 7/16: Unread count endpoint accurately reflects 3 unread items")

    # 8. Mark one notification as read
    res = client.patch(f"/api/patients/me/notifications/{n1_id}/read", headers=headers_a)
    assert res.status_code == 200
    updated_n1 = res.json()
    assert updated_n1["id"] == str(n1_id)
    assert updated_n1["is_read"] is True
    assert updated_n1["read_at"] is not None

    # Verify unread count decreased to 2
    res = client.get("/api/patients/me/notifications/unread-count", headers=headers_a)
    assert res.status_code == 200
    assert res.json()["unread_count"] == 2
    print("PASS 8/16: Mark one notification as read works and decrements unread count to 2")

    # 9. Already-read notification can safely be marked read again (idempotency)
    res = client.patch(f"/api/patients/me/notifications/{n1_id}/read", headers=headers_a)
    assert res.status_code == 200
    assert res.json()["is_read"] is True
    res = client.get("/api/patients/me/notifications/unread-count", headers=headers_a)
    assert res.json()["unread_count"] == 2
    print("PASS 9/16: Idempotent mark-read on already-read notification verified")

    # 10. Filter unread_only=True
    res = client.get("/api/patients/me/notifications?unread_only=true", headers=headers_a)
    assert res.status_code == 200
    data = res.json()
    assert data["total_count"] == 2
    assert len(data["items"]) == 2
    assert str(n1_id) not in [item["id"] for item in data["items"]]
    print("PASS 10/16: Filter unread_only=True returns only remaining unread notifications")

    # 11. Patient A cannot mark read or access Patient B notification (Cross-patient isolation returns 404)
    res = client.patch(f"/api/patients/me/notifications/{n_b_id}/read", headers=headers_a)
    assert res.status_code == 404, f"Expected 404 for cross-patient access, got {res.status_code}"
    print("PASS 11/16: Cross-patient notification access returns 404 Not Found")

    # 12. Mark all as read
    res = client.patch("/api/patients/me/notifications/read-all", headers=headers_a)
    assert res.status_code == 200
    assert res.json()["unread_count"] == 0

    res = client.get("/api/patients/me/notifications/unread-count", headers=headers_a)
    assert res.json()["unread_count"] == 0

    # Ensure Patient B's notification is still unread
    res_b = client.get("/api/patients/me/notifications/unread-count", headers=headers_b)
    assert res_b.json()["unread_count"] == 1
    print("PASS 12/16: Mark-all-read clears Patient A unread count without affecting Patient B")

    # 13. Security checks: Unauthenticated (401) and Caregiver (403)
    res_unauth = client.get("/api/patients/me/notifications")
    assert res_unauth.status_code == 401, f"Expected 401 for unauthenticated request, got {res_unauth.status_code}"

    res_cg = client.get("/api/patients/me/notifications", headers=headers_cg)
    assert res_cg.status_code == 403, f"Expected 403 for caregiver role, got {res_cg.status_code}"
    print("PASS 13/16: Role protection and auth enforcement verified (401 / 403)")

    # 14. Verify existing reminder, dose, and adherence endpoints have no regressions
    # Create a patient medicine + schedule for Patient A
    med_res = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Atorvastatin",
        "generic_name": "Lipitor",
        "dosage_amount": "20.0",
        "dosage_unit": "mg",
        "form": "TABLET"
    })
    assert med_res.status_code == 201
    created_med_id = uuid.UUID(med_res.json()["id"])

    sched_res = client.post(f"/api/patients/me/medicines/{created_med_id}/schedules", headers=headers_a, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "dosage_unit": "tablet",
        "start_date": str(date.today()),
        "times": [{"scheduled_time": "08:00:00", "time_of_day_type": "MORNING"}]
    })
    assert sched_res.status_code == 201
    created_sched_id = sched_res.json()["id"]

    # Reminder endpoints
    assert client.get("/api/patients/me/reminders/due", headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/reminders/upcoming", headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/reminders/summary", headers=headers_a).status_code == 200

    # Adherence endpoints
    assert client.get("/api/patients/me/adherence/today", headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/adherence/week", headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/adherence/month", headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/adherence/medications", headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/medication-history", headers=headers_a).status_code == 200

    # Dose record endpoint
    dose_res = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": created_sched_id,
        "scheduled_timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "TAKEN",
        "dose_quantity_taken": 1.0,
        "notes": "Feature 14 regression test dose"
    })
    assert dose_res.status_code == 201
    recorded_dose_event_id = uuid.UUID(dose_res.json()["id"])
    print("PASS 14/16: Existing reminder, dose, adherence, and history endpoints verified")

    # 15. Duplicate notification prevention for dose event
    db = SessionLocal()
    try:
        # First creation
        notif_first = create_dose_notification_if_not_exists(
            db=db,
            patient_id=patient_a_id,
            dose_event_id=recorded_dose_event_id,
            medicine_id=created_med_id,
            medicine_name="Atorvastatin 20mg",
            notification_type=NotificationType.MEDICATION_DUE,
        )
        assert notif_first is not None
        first_id = notif_first.id

        # Second creation with identical dose_event_id and notification_type
        notif_second = create_dose_notification_if_not_exists(
            db=db,
            patient_id=patient_a_id,
            dose_event_id=recorded_dose_event_id,
            medicine_id=created_med_id,
            medicine_name="Atorvastatin 20mg",
            notification_type=NotificationType.MEDICATION_DUE,
        )
        assert notif_second is not None
        assert notif_second.id == first_id, "Duplicate notification should return existing notification record"

        # Verify in DB only 1 record exists for this dose event
        count = db.execute(
            select(Notification).where(
                Notification.related_dose_event_id == recorded_dose_event_id,
                Notification.type == "MEDICATION_DUE",
            )
        ).scalars().all()
        assert len(count) == 1, f"Expected 1 record, got {len(count)}"
    finally:
        db.close()

    print("PASS 15/16: Duplicate notification prevention verified for dose event and type")

    # 16. Pagination support in notifications
    res_page = client.get("/api/patients/me/notifications?limit=2&offset=0", headers=headers_a)
    assert res_page.status_code == 200
    assert len(res_page.json()["items"]) <= 2
    assert res_page.json()["total_count"] >= 3
    print("PASS 16/16: Notification pagination (limit & offset) verified")

    print("==================================================")
    print("ALL 16 PILLSYNC FEATURE 14A NOTIFICATION TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
