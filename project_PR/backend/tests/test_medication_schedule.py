import uuid
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app if hasattr(sys.modules.get('app.main'), 'app') else None
from main import app

client = TestClient(app)


def test_health_endpoints():
    res = client.get("/api/health")
    assert res.status_code == 200

    res_db = client.get("/api/health/db")
    assert res_db.status_code == 200


def test_schedule_lifecycle_and_security():
    # 1. Register Patient A
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
    assert res_reg_a.status_code == 201

    res_login_a = client.post("/api/auth/login", json={
        "email": email_a,
        "password": "Password123!"
    })
    assert res_login_a.status_code == 200
    token_a = res_login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

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

    # Create Medicine for Patient A
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
    assert res_med_a.status_code == 201
    med_a_id = res_med_a.json()["id"]

    # Create Medicine for Patient B
    res_med_b = client.post("/api/patients/me/medicines", headers=headers_b, json={
        "name": "Amoxicillin 250mg",
        "generic_name": "Amoxicillin",
        "dosage_amount": "1.0",
        "dosage_unit": "capsule",
        "instructions": "Take with water",
        "start_date": "2026-09-01",
        "end_date": "2026-09-10",
        "is_active": True
    })
    assert res_med_b.status_code == 201
    med_b_id = res_med_b.json()["id"]

    # 1. Patient creates schedule for own medicine
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
    assert res_sched_a.status_code == 201
    sched_a_data = res_sched_a.json()
    sched_a_id = sched_a_data["id"]
    assert len(sched_a_data["times"]) == 3

    # 2. Patient lists own schedules
    res_list_a = client.get(f"/api/patients/me/medicines/{med_a_id}/schedules", headers=headers_a)
    assert res_list_a.status_code == 200
    assert any(s["id"] == sched_a_id for s in res_list_a.json())

    # 3. Patient retrieves single schedule
    res_get_a = client.get(
        f"/api/patients/me/medicines/{med_a_id}/schedules/{sched_a_id}",
        headers=headers_a
    )
    assert res_get_a.status_code == 200
    assert res_get_a.json()["id"] == sched_a_id

    # 4. Patient updates own schedule
    res_update_a = client.patch(
        f"/api/patients/me/medicines/{med_a_id}/schedules/{sched_a_id}",
        headers=headers_a,
        json={
            "dose_quantity": "2.0",
            "instructions": "Take 2 tablets with meals",
            "times": [
                {"scheduled_time": "09:00:00", "time_of_day_type": "MORNING"},
                {"scheduled_time": "21:00:00", "time_of_day_type": "NIGHT"}
            ]
        }
    )
    assert res_update_a.status_code == 200
    assert Decimal(str(res_update_a.json()["dose_quantity"])) == Decimal("2.0")
    assert len(res_update_a.json()["times"]) == 2

    # Patient B creates schedule
    res_sched_b = client.post(
        f"/api/patients/me/medicines/{med_b_id}/schedules",
        headers=headers_b,
        json={
            "frequency_type": "DAILY",
            "dose_quantity": "1.0",
            "times": [{"scheduled_time": "12:00:00"}],
            "start_date": "2026-09-01"
        }
    )
    assert res_sched_b.status_code == 201
    sched_b_id = res_sched_b.json()["id"]

    # 6. IDOR Protection: Patient A cannot list or get Patient B's schedules
    res_idor_list = client.get(f"/api/patients/me/medicines/{med_b_id}/schedules", headers=headers_a)
    assert res_idor_list.status_code == 404

    res_idor_get = client.get(f"/api/patients/me/medicines/{med_b_id}/schedules/{sched_b_id}", headers=headers_a)
    assert res_idor_get.status_code == 404

    # 7. IDOR Protection: Patient A cannot update Patient B's schedule
    res_idor_patch = client.patch(
        f"/api/patients/me/medicines/{med_b_id}/schedules/{sched_b_id}",
        headers=headers_a,
        json={"dose_quantity": "5.0"}
    )
    assert res_idor_patch.status_code == 404

    # 8. IDOR Protection: Patient A cannot delete Patient B's schedule
    res_idor_del = client.delete(
        f"/api/patients/me/medicines/{med_b_id}/schedules/{sched_b_id}",
        headers=headers_a
    )
    assert res_idor_del.status_code == 404

    # 9. Unauthenticated request -> 401
    res_unauth = client.get(f"/api/patients/me/medicines/{med_a_id}/schedules")
    assert res_unauth.status_code == 401

    # 10. Caregiver role -> 403 Forbidden
    res_cg_blocked = client.get(f"/api/patients/me/medicines/{med_a_id}/schedules", headers=headers_cg)
    assert res_cg_blocked.status_code == 403

    # 11. Missing times for DAILY -> 422
    res_inv_data = client.post(
        f"/api/patients/me/medicines/{med_a_id}/schedules",
        headers=headers_a,
        json={"frequency_type": "DAILY", "times": [], "start_date": "2026-09-01"}
    )
    assert res_inv_data.status_code == 422

    # 12. Invalid date range -> 422
    res_inv_dates = client.post(
        f"/api/patients/me/medicines/{med_a_id}/schedules",
        headers=headers_a,
        json={
            "frequency_type": "DAILY",
            "times": [{"scheduled_time": "08:00:00"}],
            "start_date": "2026-09-10",
            "end_date": "2026-09-01"
        }
    )
    assert res_inv_dates.status_code == 422

    # 13. Non-existent medicine -> 404
    fake_id = str(uuid.uuid4())
    res_non_med = client.get(f"/api/patients/me/medicines/{fake_id}/schedules", headers=headers_a)
    assert res_non_med.status_code == 404

    # 14. Non-existent schedule -> 404
    res_non_sched = client.get(f"/api/patients/me/medicines/{med_a_id}/schedules/{fake_id}", headers=headers_a)
    assert res_non_sched.status_code == 404

    # 5. Patient A deletes own schedule -> 204
    res_del = client.delete(
        f"/api/patients/me/medicines/{med_a_id}/schedules/{sched_a_id}",
        headers=headers_a
    )
    assert res_del.status_code == 204

    # Verify deleted
    res_verify = client.get(
        f"/api/patients/me/medicines/{med_a_id}/schedules/{sched_a_id}",
        headers=headers_a
    )
    assert res_verify.status_code == 404
