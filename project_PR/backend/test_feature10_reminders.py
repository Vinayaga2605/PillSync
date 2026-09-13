import uuid
from datetime import datetime
from decimal import Decimal
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

def run_tests():
    print("==================================================")
    print("RUNNING PILLSYNC FEATURE 10: REMINDER ENGINE TESTS")
    print("==================================================")

    # 1. Health checks
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/health/db").status_code == 200
    print("PASS: Health checks verified (200 OK)")

    # 2. Register & Login Patient A
    rand_a = uuid.uuid4().hex[:6]
    email_a = f"patient_rem_a_{rand_a}@example.com"
    client.post("/api/auth/register", json={
        "first_name": "Reminder",
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
    email_b = f"patient_rem_b_{rand_b}@example.com"
    client.post("/api/auth/register", json={
        "first_name": "Reminder",
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
    email_cg = f"caregiver_rem_{rand_cg}@example.com"
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
    print("PASS: Users registered and authenticated (Patient A, Patient B, Caregiver)")

    # 3. Create Medications for Patient A
    # Med 1: Paracetamol (Daily, 3 times: 08:00, 14:00, 20:00)
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
        "instructions": "Take with water",
        "is_active": True,
        "times": [
            {"scheduled_time": "08:00:00", "time_of_day_type": "MORNING"},
            {"scheduled_time": "14:00:00", "time_of_day_type": "AFTERNOON"},
            {"scheduled_time": "20:00:00", "time_of_day_type": "EVENING"}
        ]
    })
    assert sched1_res.status_code == 201

    # Med 2: Amoxicillin (Weekly: Mon, Wed, Fri at 10:00)
    # Note: 2026-09-01 is Tuesday (isoweekday 2), 2026-09-02 is Wednesday (isoweekday 3), 2026-09-07 is Monday (isoweekday 1)
    res_m2 = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Amoxicillin 250mg",
        "dosage_amount": 1.0,
        "dosage_unit": "capsule",
        "start_date": "2026-09-01",
        "is_active": True
    })
    med2_id = res_m2.json()["id"]

    sched2_res = client.post(f"/api/patients/me/medicines/{med2_id}/schedules", headers=headers_a, json={
        "frequency_type": "WEEKLY",
        "dose_quantity": 1.0,
        "dosage_unit": "capsule",
        "days_of_week": [1, 3, 5], # Mon, Wed, Fri
        "start_date": "2026-09-01",
        "is_active": True,
        "times": [{"scheduled_time": "10:00:00", "time_of_day_type": "MORNING"}]
    })
    assert sched2_res.status_code == 201

    # Med 3: Vitamin C (Interval: Every 2 days from 2026-09-01, at 07:00)
    res_m3 = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Vitamin C 1000mg",
        "dosage_amount": 1.0,
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "is_active": True
    })
    med3_id = res_m3.json()["id"]

    sched3_res = client.post(f"/api/patients/me/medicines/{med3_id}/schedules", headers=headers_a, json={
        "frequency_type": "INTERVAL_DAYS",
        "interval_days": 2,
        "dose_quantity": 1.0,
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "is_active": True,
        "times": [{"scheduled_time": "07:00:00", "time_of_day_type": "MORNING"}]
    })
    assert sched3_res.status_code == 201

    # Med 4: Inactive Medicine Schedule
    res_m4 = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Inactive Medicine",
        "dosage_amount": 1.0,
        "dosage_unit": "pill",
        "start_date": "2026-09-01",
        "is_active": True
    })
    med4_id = res_m4.json()["id"]
    client.post(f"/api/patients/me/medicines/{med4_id}/schedules", headers=headers_a, json={
        "frequency_type": "DAILY",
        "dose_quantity": 1.0,
        "start_date": "2026-09-01",
        "is_active": False, # INACTIVE
        "times": [{"scheduled_time": "08:00:00"}]
    })

    # Med 5: Future Schedule (start_date in future: 2026-10-01)
    res_m5 = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Future Medicine",
        "dosage_amount": 1.0,
        "dosage_unit": "pill",
        "start_date": "2026-10-01",
        "is_active": True
    })
    med5_id = res_m5.json()["id"]
    client.post(f"/api/patients/me/medicines/{med5_id}/schedules", headers=headers_a, json={
        "frequency_type": "DAILY",
        "dose_quantity": 1.0,
        "start_date": "2026-10-01",
        "is_active": True,
        "times": [{"scheduled_time": "08:00:00"}]
    })

    # Med 6: AS_NEEDED Medicine (PRN)
    res_m6 = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Aspirin PRN",
        "dosage_amount": 1.0,
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "is_active": True
    })
    med6_id = res_m6.json()["id"]
    client.post(f"/api/patients/me/medicines/{med6_id}/schedules", headers=headers_a, json={
        "frequency_type": "AS_NEEDED",
        "dose_quantity": 1.0,
        "start_date": "2026-09-01",
        "is_active": True,
        "times": []
    })

    print("PASS: Setup test medications and diverse schedules for Patient A")

    # =========================================================================
    # SCENARIO 1: Evaluate on 2026-09-01 at 09:00:00 (Tuesday)
    # =========================================================================
    ref_time_1 = "2026-09-01T09:00:00+05:30"

    # Test 1 & 2: GET /api/patients/me/reminders/due
    due_res_1 = client.get(
        "/api/patients/me/reminders/due",
        params={"reference_time": ref_time_1},
        headers=headers_a
    )
    assert due_res_1.status_code == 200, f"Due failed: {due_res_1.text}"
    due_items_1 = due_res_1.json()
    assert len(due_items_1) == 2 # Paracetamol 08:00 and Vitamin C 07:00
    due_names = [d["medicine_name"] for d in due_items_1]
    assert "Paracetamol 500mg" in due_names
    assert "Vitamin C 1000mg" in due_names
    for item in due_items_1:
        assert item["status"] == "DUE"
    print("PASS [1 & 2]: Evaluated DUE doses at 09:00 on Sep 1 (Paracetamol 08:00 and Vitamin C 07:00)")

    # Test GET /api/patients/me/reminders/upcoming
    upcoming_res_1 = client.get(
        "/api/patients/me/reminders/upcoming",
        params={"reference_time": ref_time_1, "hours": 24},
        headers=headers_a
    )
    assert upcoming_res_1.status_code == 200
    upcoming_items_1 = upcoming_res_1.json()
    assert len(upcoming_items_1) >= 2
    upcoming_times = [(u["medicine_name"], u["scheduled_time"]) for u in upcoming_items_1]
    assert ("Paracetamol 500mg", "14:00:00") in upcoming_times
    assert ("Paracetamol 500mg", "20:00:00") in upcoming_times
    # Verify chronological sorting
    for i in range(len(upcoming_items_1) - 1):
        assert upcoming_items_1[i]["due_at"] <= upcoming_items_1[i+1]["due_at"]
    print("PASS [10]: Verified UPCOMING doses sorted chronologically (14:00, 20:00, next morning)")

    # Test GET /api/patients/me/reminders/summary
    summary_res_1 = client.get(
        "/api/patients/me/reminders/summary",
        params={"reference_time": ref_time_1},
        headers=headers_a
    )
    assert summary_res_1.status_code == 200
    sum_data = summary_res_1.json()
    assert sum_data["due_count"] == len(due_items_1)
    assert sum_data["upcoming_count"] == len(upcoming_items_1)
    print("PASS: Verified /summary endpoint consistency")

    # =========================================================================
    # SCENARIO 2: Weekly Schedule Evaluation on Wednesday (2026-09-02 at 09:00)
    # =========================================================================
    ref_time_wed = "2026-09-02T09:00:00+05:30"
    up_wed_res = client.get(
        "/api/patients/me/reminders/upcoming",
        params={"reference_time": ref_time_wed, "hours": 12},
        headers=headers_a
    )
    assert up_wed_res.status_code == 200
    up_wed_items = up_wed_res.json()
    wed_amox = [u for u in up_wed_items if u["medicine_name"] == "Amoxicillin 250mg"]
    assert len(wed_amox) == 1
    assert wed_amox[0]["scheduled_time"] == "10:00:00"
    print("PASS [5 & 6]: Weekly schedule evaluated correctly on matching weekday (Wednesday)")

    # =========================================================================
    # SCENARIO 3: Interval Day Schedule Evaluation
    # =========================================================================
    # Check Sep 2 (Non-eligible interval day)
    due_sep2 = client.get(
        "/api/patients/me/reminders/due",
        params={"reference_time": "2026-09-02T08:00:00+05:30"},
        headers=headers_a
    ).json()
    assert not any(d["medicine_name"] == "Vitamin C 1000mg" for d in due_sep2)

    # Check Sep 3 (Eligible interval day)
    due_sep3 = client.get(
        "/api/patients/me/reminders/due",
        params={"reference_time": "2026-09-03T08:00:00+05:30"},
        headers=headers_a
    ).json()
    assert any(d["medicine_name"] == "Vitamin C 1000mg" for d in due_sep3)
    print("PASS [8]: Interval-day recurrence evaluated correctly across alternating days")

    # =========================================================================
    # SCENARIO 4: Security & Cross-Patient Isolation
    # =========================================================================
    due_b_res = client.get(
        "/api/patients/me/reminders/due",
        params={"reference_time": ref_time_1},
        headers=headers_b
    )
    assert due_b_res.status_code == 200
    assert len(due_b_res.json()) == 0
    print("PASS [11 & 12]: Cross-patient isolation verified (Patient B sees 0 of Patient A's events)")

    # =========================================================================
    # SCENARIO 5: Authentication & Role Authorization Checks
    # =========================================================================
    # Unauthenticated request -> 401
    unauth_res = client.get("/api/patients/me/reminders/due")
    assert unauth_res.status_code == 401
    print("PASS [13]: Unauthenticated request blocked with 401 Unauthorized")

    # Caregiver access -> 403 Forbidden
    cg_res = client.get("/api/patients/me/reminders/due", headers=headers_cg)
    assert cg_res.status_code == 403
    print("PASS [14]: Caregiver role blocked with 403 Forbidden")

    # AS_NEEDED check -> 0 timed events
    all_due = client.get(
        "/api/patients/me/reminders/due",
        params={"reference_time": ref_time_1, "due_window_hours": 24},
        headers=headers_a
    ).json()
    assert not any(d["medicine_name"] == "Aspirin PRN" for d in all_due)
    all_upcoming = client.get(
        "/api/patients/me/reminders/upcoming",
        params={"reference_time": ref_time_1, "hours": 72},
        headers=headers_a
    ).json()
    assert not any(u["medicine_name"] == "Aspirin PRN" for u in all_upcoming)
    print("PASS [15]: AS_NEEDED medications do not generate automatic scheduled reminders")

    # =========================================================================
    # SCENARIO 6: Regressions check
    # =========================================================================
    assert client.get("/api/patients/me/profile", headers=headers_a).status_code == 200
    assert client.get("/api/patients/me/medicines", headers=headers_a).status_code == 200
    assert client.get(f"/api/patients/me/medicines/{med1_id}/schedules", headers=headers_a).status_code == 200
    print("PASS: Existing profile, medicines, and schedules regressions verified")

    print("\n==================================================")
    print("ALL FEATURE 10 REMINDER ENGINE TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
