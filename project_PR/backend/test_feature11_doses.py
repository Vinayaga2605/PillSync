import uuid
from datetime import datetime
from decimal import Decimal
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def run_tests():
    print("==================================================")
    print("RUNNING PILLSYNC FEATURE 11: DOSE TRACKING TESTS")
    print("==================================================")

    # 1. Health checks
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/health/db").status_code == 200
    print("PASS: Health checks verified (200 OK)")

    # 2. Register & Login Patient A
    rand_a = uuid.uuid4().hex[:6]
    email_a = f"patient_dose_a_{rand_a}@example.com"
    client.post("/api/auth/register", json={
        "first_name": "Dose",
        "last_name": "Alpha",
        "email": email_a,
        "password": "Password123!",
        "role": "PATIENT"
    })
    login_a = client.post("/api/auth/login", json={"email": email_a, "password": "Password123!"})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Register & Login Patient B
    rand_b = uuid.uuid4().hex[:6]
    email_b = f"patient_dose_b_{rand_b}@example.com"
    client.post("/api/auth/register", json={
        "first_name": "Dose",
        "last_name": "Beta",
        "email": email_b,
        "password": "Password123!",
        "role": "PATIENT"
    })
    login_b = client.post("/api/auth/login", json={"email": email_b, "password": "Password123!"})
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Register Caregiver
    rand_cg = uuid.uuid4().hex[:6]
    email_cg = f"caregiver_dose_{rand_cg}@example.com"
    client.post("/api/auth/register", json={
        "first_name": "Caregiver",
        "last_name": "User",
        "email": email_cg,
        "password": "Password123!",
        "role": "CAREGIVER"
    })
    login_cg = client.post("/api/auth/login", json={"email": email_cg, "password": "Password123!"})
    token_cg = login_cg.json()["access_token"]
    headers_cg = {"Authorization": f"Bearer {token_cg}"}
    print("PASS: Setup Patient A, Patient B, and Caregiver users")

    # 3. Create Medicine and Schedules for Patient A
    res_m1 = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Paracetamol 500mg",
        "dosage_amount": 1.0,
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "is_active": True
    })
    med1_id = res_m1.json()["id"]

    sched1_res = client.post(f"/api/patients/me/medicines/{med1_id}/schedules", headers=headers_a, json={
        "frequency_type": "DAILY",
        "dose_quantity": 1.0,
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "end_date": "2026-09-30",
        "instructions": "Take with full glass of water",
        "is_active": True,
        "times": [
            {"scheduled_time": "08:00:00", "time_of_day_type": "MORNING"},
            {"scheduled_time": "14:00:00", "time_of_day_type": "AFTERNOON"},
            {"scheduled_time": "20:00:00", "time_of_day_type": "EVENING"}
        ]
    })
    sched1_id = sched1_res.json()["id"]

    # Create Medicine and Schedule for Patient B
    res_m2 = client.post("/api/patients/me/medicines", headers=headers_b, json={
        "name": "Metformin 500mg",
        "dosage_amount": 1.0,
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "is_active": True
    })
    med2_id = res_m2.json()["id"]

    sched2_res = client.post(f"/api/patients/me/medicines/{med2_id}/schedules", headers=headers_b, json={
        "frequency_type": "DAILY",
        "dose_quantity": 1.0,
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "is_active": True,
        "times": [{"scheduled_time": "09:00:00", "time_of_day_type": "MORNING"}]
    })
    sched2_id = sched2_res.json()["id"]
    print("PASS: Setup medicines and schedules for Patient A and Patient B")

    # =========================================================================
    # TEST 1 & 2: Record Dose Event (TAKEN) for Patient A
    # =========================================================================
    sched_occurrence_1 = "2026-09-01T08:00:00+05:30"
    action_time_1 = "2026-09-01T08:07:23+05:30"

    rec_res_1 = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": sched1_id,
        "scheduled_timestamp": sched_occurrence_1,
        "status": "TAKEN",
        "action_timestamp": action_time_1,
        "dose_quantity_taken": 1.0,
        "notes": "Taken after breakfast"
    })
    assert rec_res_1.status_code == 201, f"Record dose failed: {rec_res_1.text}"
    dose1 = rec_res_1.json()
    dose1_id = dose1["id"]
    assert dose1["medicine_name"] == "Paracetamol 500mg"
    assert dose1["status"] == "TAKEN"
    assert dose1["actual_taken_timestamp"] is not None
    assert dose1["notes"] == "Taken after breakfast"
    print("PASS [1 & 2]: Patient A recorded dose event (TAKEN) successfully and persisted in DB")

    # =========================================================================
    # TEST 3 & 4: Record PENDING dose and Mark TAKEN via PATCH
    # =========================================================================
    sched_occurrence_2 = "2026-09-01T14:00:00+05:30"
    rec_res_2 = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": sched1_id,
        "scheduled_timestamp": sched_occurrence_2,
        "status": "PENDING"
    })
    assert rec_res_2.status_code == 201
    dose2 = rec_res_2.json()
    dose2_id = dose2["id"]
    assert dose2["status"] == "PENDING"
    assert dose2["actual_taken_timestamp"] is None

    # Mark as TAKEN
    take_res = client.patch(f"/api/patients/me/doses/{dose2_id}/taken", headers=headers_a, json={
        "action_timestamp": "2026-09-01T14:05:00+05:30",
        "notes": "Taken with lunch"
    })
    assert take_res.status_code == 200
    take_data = take_res.json()
    assert take_data["status"] == "TAKEN"
    assert take_data["actual_taken_timestamp"] is not None
    assert take_data["notes"] == "Taken with lunch"
    print("PASS [3 & 4]: Marked PENDING dose as TAKEN with action timestamp populated")

    # =========================================================================
    # TEST 5 & 6: Record Dose as SKIPPED
    # =========================================================================
    sched_occurrence_3 = "2026-09-01T20:00:00+05:30"
    rec_res_3 = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": sched1_id,
        "scheduled_timestamp": sched_occurrence_3,
        "status": "PENDING"
    })
    assert rec_res_3.status_code == 201
    dose3_id = rec_res_3.json()["id"]

    # Mark as SKIPPED
    skip_res = client.patch(f"/api/patients/me/doses/{dose3_id}/skipped", headers=headers_a, json={
        "notes": "Patient felt nauseous"
    })
    assert skip_res.status_code == 200
    skip_data = skip_res.json()
    assert skip_data["status"] == "SKIPPED"
    assert skip_data["actual_taken_timestamp"] is None
    assert skip_data["notes"] == "Patient felt nauseous"
    print("PASS [5 & 6]: Marked dose as SKIPPED (actual_taken_timestamp remains null)")

    # =========================================================================
    # TEST 7: Duplicate Scheduled Occurrence Prevention / Idempotency
    # =========================================================================
    dup_res = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": sched1_id,
        "scheduled_timestamp": sched_occurrence_1, # Same as Dose 1
        "status": "TAKEN"
    })
    # Idempotent call should succeed and return existing dose without creating duplicate
    assert dup_res.status_code == 201 or dup_res.status_code == 200
    dup_data = dup_res.json()
    assert dup_data["id"] == dose1_id

    # Verify total doses count for Sep 1 is exactly 3 (not 4)
    doses_sep1 = client.get("/api/patients/me/doses", params={"date": "2026-09-01"}, headers=headers_a).json()
    assert len(doses_sep1) == 3
    print("PASS [7]: Duplicate scheduled occurrence prevented at DB/service level (Idempotent)")

    # =========================================================================
    # TEST 8: Patient A cannot access Patient B's dose
    # =========================================================================
    # Patient B records a dose
    rec_b = client.post("/api/patients/me/doses", headers=headers_b, json={
        "schedule_id": sched2_id,
        "scheduled_timestamp": "2026-09-01T09:00:00+05:30",
        "status": "TAKEN"
    })
    assert rec_b.status_code == 201
    dose_b_id = rec_b.json()["id"]

    # Patient A tries to GET Patient B's dose
    get_b_by_a = client.get(f"/api/patients/me/doses/{dose_b_id}", headers=headers_a)
    assert get_b_by_a.status_code == 404

    # Patient A tries to PATCH Patient B's dose
    patch_b_by_a = client.patch(f"/api/patients/me/doses/{dose_b_id}/taken", headers=headers_a, json={})
    assert patch_b_by_a.status_code == 404
    print("PASS [8]: Patient A blocked from accessing or modifying Patient B's dose (404 Not Found)")

    # =========================================================================
    # TEST 9: Patient A cannot create a dose for Patient B's schedule
    # =========================================================================
    cross_sched_res = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": sched2_id, # Patient B's schedule
        "scheduled_timestamp": "2026-09-01T09:00:00+05:30",
        "status": "TAKEN"
    })
    assert cross_sched_res.status_code == 404
    print("PASS [9]: Patient A blocked from creating dose for Patient B's schedule (404 Not Found)")

    # =========================================================================
    # TEST 10: Non-existent schedule rejected
    # =========================================================================
    fake_sched_id = str(uuid.uuid4())
    fake_res = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": fake_sched_id,
        "scheduled_timestamp": "2026-09-01T08:00:00+05:30",
        "status": "TAKEN"
    })
    assert fake_res.status_code == 404
    print("PASS [10]: Non-existent schedule rejected (404 Not Found)")

    # =========================================================================
    # TEST 11: Unauthenticated request -> 401
    # =========================================================================
    unauth_res = client.get("/api/patients/me/doses")
    assert unauth_res.status_code == 401
    print("PASS [11]: Unauthenticated request blocked with 401 Unauthorized")

    # =========================================================================
    # TEST 12: Caregiver role access -> 403 Forbidden
    # =========================================================================
    cg_res = client.get("/api/patients/me/doses", headers=headers_cg)
    assert cg_res.status_code == 403
    print("PASS [12]: Caregiver role blocked with 403 Forbidden")

    # =========================================================================
    # TEST 13: Query Today's Doses & Filter by Status
    # =========================================================================
    # All doses on Sep 1
    all_sep1 = client.get("/api/patients/me/doses", params={"date": "2026-09-01"}, headers=headers_a).json()
    assert len(all_sep1) == 3

    # Filter by TAKEN
    taken_sep1 = client.get("/api/patients/me/doses", params={"date": "2026-09-01", "status": "TAKEN"}, headers=headers_a).json()
    assert len(taken_sep1) == 2
    for d in taken_sep1:
        assert d["status"] == "TAKEN"

    # Filter by SKIPPED
    skipped_sep1 = client.get("/api/patients/me/doses", params={"date": "2026-09-01", "status": "SKIPPED"}, headers=headers_a).json()
    assert len(skipped_sep1) == 1
    assert skipped_sep1[0]["status"] == "SKIPPED"
    print("PASS [13]: Query doses with date and status filters works accurately")

    # =========================================================================
    # TEST 14: Regressions Check (Feature 9, 10, and Health/Auth/Profile)
    # =========================================================================
    assert client.get("/api/patients/me/profile", headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/medicines", headers=headers_a).status_code == 200
    assert client.get(f"/api/patients/me/medicines/{med1_id}/schedules", headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/reminders/due", params={"reference_time": "2026-09-01T09:00:00+05:30"}, headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/reminders/upcoming", params={"reference_time": "2026-09-01T09:00:00+05:30"}, headers=headers_a).status_code == 200
    print("PASS [14]: Feature 9 (Schedules) and Feature 10 (Reminders) regressions verified")

    print("\n==================================================")
    print("ALL FEATURE 11 DOSE TRACKING TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
