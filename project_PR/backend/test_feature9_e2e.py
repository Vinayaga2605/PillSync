import uuid
from decimal import Decimal
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

def test_feature9_frontend_backend_e2e():
    print("==================================================")
    print("PILLSYNC — FEATURE 9: E2E INTEGRATION TEST SUITE")
    print("==================================================")

    # 1. Register & Login Patient
    rand_suffix = uuid.uuid4().hex[:6]
    email = f"schedule_user_{rand_suffix}@example.com"
    reg_res = client.post("/api/auth/register", json={
        "first_name": "Schedule",
        "last_name": "Tester",
        "email": email,
        "password": "Password123!",
        "role": "PATIENT",
        "phone_number": "+1234567890"
    })
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"

    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"PASS: Patient logged in successfully ({email})")

    # 2. Open / Create Medicine
    med_res = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Ibuprofen 400mg",
        "generic_name": "Ibuprofen",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "instructions": "Take after meals",
        "start_date": "2026-09-01",
        "end_date": "2026-09-15",
        "is_active": True
    })
    assert med_res.status_code == 201
    medicine_id = med_res.json()["id"]
    print(f"PASS: Created medicine '{med_res.json()['name']}' (id={medicine_id})")

    # 3. Step: Open schedules for medicine (Initial Empty State)
    list_res_empty = client.get(f"/api/patients/me/medicines/{medicine_id}/schedules", headers=headers)
    assert list_res_empty.status_code == 200
    assert len(list_res_empty.json()) == 0
    print("PASS: Verified initial empty schedules list (0 items)")

    # 4. Step: Add Schedule with 3 times (08:00, 14:00, 20:00)
    create_payload = {
        "frequency_type": "DAILY",
        "dose_quantity": 1.0,
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
    create_res = client.post(f"/api/patients/me/medicines/{medicine_id}/schedules", headers=headers, json=create_payload)
    assert create_res.status_code == 201, f"Create schedule failed: {create_res.text}"
    created_schedule = create_res.json()
    schedule_id = created_schedule["id"]
    assert len(created_schedule["times"]) == 3
    print(f"PASS: Added schedule (id={schedule_id}) with 3 scheduled times")

    # 5. Step: Verify Schedule Persists (Simulate page refresh)
    get_res = client.get(f"/api/patients/me/medicines/{medicine_id}/schedules", headers=headers)
    assert get_res.status_code == 200
    schedules_list = get_res.json()
    assert len(schedules_list) == 1
    assert schedules_list[0]["id"] == schedule_id
    assert schedules_list[0]["frequency_type"] == "DAILY"
    assert Decimal(str(schedules_list[0]["dose_quantity"])) == Decimal("1.0")
    print("PASS: Verified schedule persistence across simulated page refresh")

    # 6. Step: Edit Schedule (Update dosage to 2.0 and times to 09:00 & 21:00)
    update_payload = {
        "frequency_type": "DAILY",
        "dose_quantity": 2.0,
        "instructions": "Take 2 tablets after lunch & dinner",
        "times": [
            {"scheduled_time": "09:00:00", "time_of_day_type": "MORNING"},
            {"scheduled_time": "21:00:00", "time_of_day_type": "NIGHT"}
        ],
        "is_active": True
    }
    update_res = client.patch(f"/api/patients/me/medicines/{medicine_id}/schedules/{schedule_id}", headers=headers, json=update_payload)
    assert update_res.status_code == 200, f"Update schedule failed: {update_res.text}"
    updated_schedule = update_res.json()
    assert Decimal(str(updated_schedule["dose_quantity"])) == Decimal("2.0")
    assert len(updated_schedule["times"]) == 2
    assert updated_schedule["instructions"] == "Take 2 tablets after lunch & dinner"
    print("PASS: Successfully updated schedule dosage and times")

    # 7. Step: Verify Edit Persists
    get_single_res = client.get(f"/api/patients/me/medicines/{medicine_id}/schedules/{schedule_id}", headers=headers)
    assert get_single_res.status_code == 200
    saved_sched = get_single_res.json()
    assert Decimal(str(saved_sched["dose_quantity"])) == Decimal("2.0")
    assert len(saved_sched["times"]) == 2
    assert saved_sched["times"][0]["scheduled_time"] == "09:00:00"
    assert saved_sched["times"][1]["scheduled_time"] == "21:00:00"
    print("PASS: Verified edited schedule persists on single fetch")

    # 8. Step: Delete Schedule
    del_res = client.delete(f"/api/patients/me/medicines/{medicine_id}/schedules/{schedule_id}", headers=headers)
    assert del_res.status_code == 204
    print("PASS: Deleted schedule with 204 No Content")

    # 9. Step: Verify Deletion Persists
    list_after_del = client.get(f"/api/patients/me/medicines/{medicine_id}/schedules", headers=headers)
    assert list_after_del.status_code == 200
    assert len(list_after_del.json()) == 0
    print("PASS: Verified schedule is completely removed from list (0 items)")

    # 10. Step: Validation checks
    # Invalid date range
    bad_date_res = client.post(f"/api/patients/me/medicines/{medicine_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": 1.0,
        "times": [{"scheduled_time": "08:00:00"}],
        "start_date": "2026-09-10",
        "end_date": "2026-09-01"
    })
    assert bad_date_res.status_code == 422
    print("PASS: Invalid date range (end_date < start_date) rejected with 422")

    # Invalid empty times for Daily
    bad_times_res = client.post(f"/api/patients/me/medicines/{medicine_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": 1.0,
        "times": [],
        "start_date": "2026-09-01"
    })
    assert bad_times_res.status_code == 422
    print("PASS: Missing times for DAILY rejected with 422")

    # 11. Regression Check
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/health/db").status_code == 200
    assert client.get("/api/auth/me", headers=headers).status_code == 200
    assert client.get("/api/patients/me/profile", headers=headers).status_code == 200
    assert client.get("/api/patients/me/medicines", headers=headers).status_code == 200
    print("PASS: All regression health, auth, profile, and medicines endpoints verified")

    print("\n==================================================")
    print("ALL FEATURE 9 E2E TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_feature9_frontend_backend_e2e()
