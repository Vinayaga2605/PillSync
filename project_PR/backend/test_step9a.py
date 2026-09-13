import uuid
from decimal import Decimal
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

def run_tests():
    print("==================================================")
    print("RUNNING PILLSYNC STEP 9A TEST SUITE")
    print("==================================================")

    # 1. Health checks
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("PASS: GET /api/health (200)")

    res = client.get("/api/health/db")
    assert res.status_code == 200, f"DB Health check failed: {res.text}"
    print("PASS: GET /api/health/db (200)")

    # 2. Register Patient A
    rand_suffix_a = uuid.uuid4().hex[:6]
    email_a = f"patient_a_{rand_suffix_a}@example.com"
    res_reg_a = client.post("/api/auth/register", json={
        "first_name": "Patient",
        "last_name": "Alpha",
        "email": email_a,
        "password": "Password123!",
        "role": "PATIENT",
        "phone_number": "+1234567890"
    })
    assert res_reg_a.status_code == 201, f"Patient A register failed: {res_reg_a.text}"
    print(f"PASS: Registered Patient A ({email_a})")

    # Login Patient A
    res_login_a = client.post("/api/auth/login", json={
        "email": email_a,
        "password": "Password123!"
    })
    assert res_login_a.status_code == 200
    token_a = res_login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    print("PASS: Logged in Patient A")

    # Register Patient B
    rand_suffix_b = uuid.uuid4().hex[:6]
    email_b = f"patient_b_{rand_suffix_b}@example.com"
    res_reg_b = client.post("/api/auth/register", json={
        "first_name": "Patient",
        "last_name": "Beta",
        "email": email_b,
        "password": "Password123!",
        "role": "PATIENT",
        "phone_number": "+1987654321"
    })
    assert res_reg_b.status_code == 201
    res_login_b = client.post("/api/auth/login", json={
        "email": email_b,
        "password": "Password123!"
    })
    token_b = res_login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    print(f"PASS: Registered and logged in Patient B ({email_b})")

    # Register Caregiver
    rand_suffix_cg = uuid.uuid4().hex[:6]
    email_cg = f"caregiver_{rand_suffix_cg}@example.com"
    res_reg_cg = client.post("/api/auth/register", json={
        "first_name": "Caregiver",
        "last_name": "Charlie",
        "email": email_cg,
        "password": "Password123!",
        "role": "CAREGIVER",
        "phone_number": "+1555555555"
    })
    assert res_reg_cg.status_code == 201
    res_login_cg = client.post("/api/auth/login", json={
        "email": email_cg,
        "password": "Password123!"
    })
    token_cg = res_login_cg.json()["access_token"]
    headers_cg = {"Authorization": f"Bearer {token_cg}"}
    print(f"PASS: Registered and logged in Caregiver ({email_cg})")

    # 3. Create Medicine for Patient A
    res_med_a = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Paracetamol 500mg",
        "generic_name": "Acetaminophen",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "instructions": "Take after meals",
        "start_date": "2026-09-01",
        "end_date": "2026-09-30",
        "is_active": True
    })
    assert res_med_a.status_code == 201, f"Create med failed: {res_med_a.text}"
    med_a_id = res_med_a.json()["id"]
    print(f"PASS: Created Medicine for Patient A (id={med_a_id})")

    # Create Medicine for Patient B
    res_med_b = client.post("/api/patients/me/medicines", headers=headers_b, json={
        "name": "Amoxicillin 250mg",
        "generic_name": "Amoxicillin",
        "dosage_amount": "1.0",
        "dosage_unit": "capsule",
        "instructions": "Take with full glass of water",
        "start_date": "2026-09-01",
        "end_date": "2026-09-10",
        "is_active": True
    })
    assert res_med_b.status_code == 201
    med_b_id = res_med_b.json()["id"]
    print(f"PASS: Created Medicine for Patient B (id={med_b_id})")

    # 4. Test 1: Patient A creates schedule for own medicine
    schedule_payload = {
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "dosage_unit": "tablet",
        "times": [
            {"scheduled_time": "08:00:00", "time_of_day_type": "MORNING"},
            {"scheduled_time": "14:00:00", "time_of_day_type": "AFTERNOON"},
            {"scheduled_time": "20:00:00", "time_of_day_type": "EVENING"}
        ],
        "start_date": "2026-09-01",
        "end_date": "2026-09-07",
        "instructions": "Take 1 tablet with water",
        "is_active": True
    }
    res_sched_a = client.post(
        f"/api/patients/me/medicines/{med_a_id}/schedules",
        headers=headers_a,
        json=schedule_payload
    )
    assert res_sched_a.status_code == 201, f"Create schedule failed: {res_sched_a.text}"
    sched_a_data = res_sched_a.json()
    sched_a_id = sched_a_data["id"]
    assert len(sched_a_data["times"]) == 3
    assert sched_a_data["times"][0]["scheduled_time"] == "08:00:00"
    assert sched_a_data["times"][1]["scheduled_time"] == "14:00:00"
    assert sched_a_data["times"][2]["scheduled_time"] == "20:00:00"
    print(f"PASS [1]: Patient A created schedule with 3 times (id={sched_a_id})")

    # 5. Test 2: Patient A lists own schedules
    res_list_a = client.get(f"/api/patients/me/medicines/{med_a_id}/schedules", headers=headers_a)
    assert res_list_a.status_code == 200
    list_a = res_list_a.json()
    assert len(list_a) >= 1
    assert any(s["id"] == sched_a_id for s in list_a)
    print(f"PASS [2]: Patient A listed schedules for medicine {med_a_id} (count={len(list_a)})")

    # 6. Test 3: Patient A retrieves own single schedule
    res_get_a = client.get(
        f"/api/patients/me/medicines/{med_a_id}/schedules/{sched_a_id}",
        headers=headers_a
    )
    assert res_get_a.status_code == 200
    get_a = res_get_a.json()
    assert get_a["id"] == sched_a_id
    assert get_a["frequency_type"] == "DAILY"
    assert len(get_a["times"]) == 3
    print(f"PASS [3]: Patient A retrieved single schedule {sched_a_id}")

    # 7. Test 4: Patient A updates own schedule
    update_payload = {
        "dose_quantity": "2.0",
        "instructions": "Take 2 tablets with meals",
        "times": [
            {"scheduled_time": "09:00:00", "time_of_day_type": "MORNING"},
            {"scheduled_time": "21:00:00", "time_of_day_type": "NIGHT"}
        ]
    }
    res_update_a = client.patch(
        f"/api/patients/me/medicines/{med_a_id}/schedules/{sched_a_id}",
        headers=headers_a,
        json=update_payload
    )
    assert res_update_a.status_code == 200, f"Update failed: {res_update_a.text}"
    updated_a = res_update_a.json()
    assert Decimal(str(updated_a["dose_quantity"])) == Decimal("2.0")
    assert updated_a["instructions"] == "Take 2 tablets with meals"
    assert len(updated_a["times"]) == 2
    assert updated_a["times"][0]["scheduled_time"] == "09:00:00"
    assert updated_a["times"][1]["scheduled_time"] == "21:00:00"
    print("PASS [4]: Patient A updated schedule dosage and times successfully")

    # 8. Test Patient B creates schedule for own medicine
    res_sched_b = client.post(
        f"/api/patients/me/medicines/{med_b_id}/schedules",
        headers=headers_b,
        json={
            "frequency_type": "DAILY",
            "dose_quantity": "1.0",
            "times": [{"scheduled_time": "12:00:00", "time_of_day_type": "AFTERNOON"}],
            "start_date": "2026-09-01"
        }
    )
    assert res_sched_b.status_code == 201
    sched_b_id = res_sched_b.json()["id"]
    print(f"PASS: Patient B created schedule (id={sched_b_id})")

    # 9. Test 6: IDOR Protection — Patient A cannot access Patient B's medicine schedules
    res_idor_list = client.get(
        f"/api/patients/me/medicines/{med_b_id}/schedules",
        headers=headers_a
    )
    assert res_idor_list.status_code == 404, f"Expected 404, got {res_idor_list.status_code}"
    print("PASS [6a]: Patient A blocked from listing Patient B's schedules (404 Not Found)")

    res_idor_get = client.get(
        f"/api/patients/me/medicines/{med_b_id}/schedules/{sched_b_id}",
        headers=headers_a
    )
    assert res_idor_get.status_code == 404
    print("PASS [6b]: Patient A blocked from retrieving Patient B's schedule (404 Not Found)")

    # 10. Test 7: IDOR Protection — Patient A cannot update Patient B's schedule
    res_idor_patch = client.patch(
        f"/api/patients/me/medicines/{med_b_id}/schedules/{sched_b_id}",
        headers=headers_a,
        json={"dose_quantity": "5.0"}
    )
    assert res_idor_patch.status_code == 404
    print("PASS [7]: Patient A blocked from updating Patient B's schedule (404 Not Found)")

    # 11. Test 8: IDOR Protection — Patient A cannot delete Patient B's schedule
    res_idor_delete = client.delete(
        f"/api/patients/me/medicines/{med_b_id}/schedules/{sched_b_id}",
        headers=headers_a
    )
    assert res_idor_delete.status_code == 404
    print("PASS [8]: Patient A blocked from deleting Patient B's schedule (404 Not Found)")

    # 12. Test 9: Unauthenticated request → 401
    res_unauth = client.get(f"/api/patients/me/medicines/{med_a_id}/schedules")
    assert res_unauth.status_code == 401, f"Expected 401, got {res_unauth.status_code}"
    print("PASS [9]: Unauthenticated request blocked with 401 Unauthorized")

    # 13. Test 10: Caregiver request → 403 Forbidden
    res_cg = client.get(
        f"/api/patients/me/medicines/{med_a_id}/schedules",
        headers=headers_cg
    )
    assert res_cg.status_code == 403, f"Expected 403, got {res_cg.status_code}"
    print("PASS [10]: Caregiver role blocked from patient schedule endpoint with 403 Forbidden")

    # 14. Test 11: Validation — Invalid schedule data (missing times for DAILY) → 422
    res_inv_data = client.post(
        f"/api/patients/me/medicines/{med_a_id}/schedules",
        headers=headers_a,
        json={
            "frequency_type": "DAILY",
            "dose_quantity": "1.0",
            "times": [],
            "start_date": "2026-09-01"
        }
    )
    assert res_inv_data.status_code == 422, f"Expected 422, got {res_inv_data.status_code}"
    print("PASS [11]: Missing times for DAILY frequency rejected with 422 Unprocessable Entity")

    # 15. Test 12: Validation — Invalid date range (end_date < start_date) → 422
    res_inv_dates = client.post(
        f"/api/patients/me/medicines/{med_a_id}/schedules",
        headers=headers_a,
        json={
            "frequency_type": "DAILY",
            "dose_quantity": "1.0",
            "times": [{"scheduled_time": "08:00:00"}],
            "start_date": "2026-09-10",
            "end_date": "2026-09-01"
        }
    )
    assert res_inv_dates.status_code == 422, f"Expected 422, got {res_inv_dates.status_code}"
    print("PASS [12]: Invalid date range (end_date < start_date) rejected with 422")

    # 16. Test 13: Non-existent medicine → 404
    fake_med_id = str(uuid.uuid4())
    res_non_med = client.get(
        f"/api/patients/me/medicines/{fake_med_id}/schedules",
        headers=headers_a
    )
    assert res_non_med.status_code == 404
    print("PASS [13]: Non-existent medicine returned 404 Not Found")

    # 17. Test 14: Non-existent schedule → 404
    fake_sched_id = str(uuid.uuid4())
    res_non_sched = client.get(
        f"/api/patients/me/medicines/{med_a_id}/schedules/{fake_sched_id}",
        headers=headers_a
    )
    assert res_non_sched.status_code == 404
    print("PASS [14]: Non-existent schedule returned 404 Not Found")

    # 18. Test 5: Patient deletes own schedule
    res_delete = client.delete(
        f"/api/patients/me/medicines/{med_a_id}/schedules/{sched_a_id}",
        headers=headers_a
    )
    assert res_delete.status_code == 204, f"Expected 204, got {res_delete.status_code}"
    print(f"PASS [5]: Patient A deleted schedule {sched_a_id} (204 No Content)")

    # Verify schedule is no longer returned
    res_verify_del = client.get(
        f"/api/patients/me/medicines/{med_a_id}/schedules/{sched_a_id}",
        headers=headers_a
    )
    assert res_verify_del.status_code == 404
    print("PASS: Verified schedule is completely removed")

    # 19. Existing functionality regression checks
    # Profile check
    res_prof = client.get("/api/patients/me/profile", headers=headers_a)
    assert res_prof.status_code == 200
    print("PASS: Regression - GET /api/patients/me/profile (200)")

    # Medicines list check
    res_med_list = client.get("/api/patients/me/medicines", headers=headers_a)
    assert res_med_list.status_code == 200
    print("PASS: Regression - GET /api/patients/me/medicines (200)")

    # Auth /me check
    res_me = client.get("/api/auth/me", headers=headers_a)
    assert res_me.status_code == 200
    print("PASS: Regression - GET /api/auth/me (200)")

    print("\n==================================================")
    print("ALL TEST CASES PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
