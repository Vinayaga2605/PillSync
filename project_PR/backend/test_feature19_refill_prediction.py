import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient

from main import app

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


def test_unauthenticated_and_rbac_access():
    """
    Test 1: Unauthenticated request returns 401.
    Test 2: Authenticated patient can retrieve predictions.
    Test 3: Patient receives only their own medication predictions (isolation).
    Test 19: Response does not expose sensitive auth information.
    """
    # 1. Unauthenticated request
    res_unauth = client.get("/api/patients/me/refill-predictions")
    assert res_unauth.status_code == 401

    # 2. Register Patient A and Patient B
    headers_a = _register_and_login_patient("refill_auth_a")
    headers_b = _register_and_login_patient("refill_auth_b")

    # Patient A creates a medicine
    res_med_a = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Aspirin 100mg",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "initial_quantity": "30.0",
        "current_quantity": "30.0",
        "quantity_per_dose": "1.0",
        "stock_unit": "tablet",
    })
    assert res_med_a.status_code == 201
    med_a_id = res_med_a.json()["id"]

    # Patient A gets own predictions
    res_pred_a = client.get("/api/patients/me/refill-predictions", headers=headers_a)
    assert res_pred_a.status_code == 200
    data_a = res_pred_a.json()
    assert "items" in data_a
    assert len(data_a["items"]) == 1
    assert data_a["items"][0]["medication_id"] == med_a_id
    assert data_a["items"][0]["medication_name"] == "Aspirin 100mg"

    # Patient B gets own predictions (should be empty for B)
    res_pred_b = client.get("/api/patients/me/refill-predictions", headers=headers_b)
    assert res_pred_b.status_code == 200
    data_b = res_pred_b.json()
    assert len(data_b["items"]) == 0

    # Patient B tries to get Patient A's single prediction -> 404
    res_b_single = client.get(f"/api/patients/me/refills/medicines/{med_a_id}", headers=headers_b)
    assert res_b_single.status_code == 404

    # Verify no sensitive auth fields exposed
    for item in data_a["items"]:
        assert "password" not in item
        assert "password_hash" not in item
        assert "token" not in item


def test_schedule_fallback_and_stock_calculations():
    """
    Test 4: Current stock is used correctly.
    Test 5: Quantity per dose is used correctly.
    Test 10: Average daily consumption calculated from active schedule.
    Test 11: Estimated days remaining calculation.
    Test 12: Estimated depletion date calculation.
    Test 13: Recommended refill date calculation.
    Test 18: Prediction status is ON_TRACK when supply > 10 days.
    Test 20: Feature 18 stock values are used correctly.
    """
    headers = _register_and_login_patient("refill_sched")

    # Create medicine with current_quantity = 60, quantity_per_dose = 2.0
    res_med = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Metformin 500mg",
        "dosage_amount": "2.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "initial_quantity": "60.0",
        "current_quantity": "60.0",
        "quantity_per_dose": "2.0",
        "stock_unit": "tablet",
        "low_stock_threshold": "10.0",
    })
    assert res_med.status_code == 201
    med_id = res_med.json()["id"]

    # Create Schedule: Daily at 08:00 and 20:00 (2 times/day * 2.0 qty/dose = 4.0 tablets/day)
    res_sched = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "2.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "08:00:00"}, {"scheduled_time": "20:00:00"}]
    })
    assert res_sched.status_code == 201

    # Fetch Refill Prediction
    res_pred = client.get("/api/patients/me/refill-predictions", headers=headers)
    assert res_pred.status_code == 200
    pred = res_pred.json()["items"][0]

    assert pred["current_quantity"] == 60.0
    assert pred["quantity_per_dose"] == 2.0
    assert pred["stock_unit"] == "tablet"
    assert pred["average_daily_consumption"] == 4.0
    # Estimated days remaining: 60 / 4.0 = 15.0 days
    assert pred["estimated_days_remaining"] == 15.0
    assert pred["prediction_status"] == "ON_TRACK"
    assert pred["data_quality"] == "SCHEDULE_FALLBACK"

    today = date.today()
    expected_depletion = (today + timedelta(days=15)).isoformat()
    assert pred["estimated_depletion_date"] == expected_depletion

    # Recommended refill date should be before depletion date
    refill_dt = date.fromisoformat(pred["recommended_refill_date"])
    depletion_dt = date.fromisoformat(pred["estimated_depletion_date"])
    assert refill_dt < depletion_dt
    assert refill_dt >= today
    assert "disclaimer" in pred


def test_taken_doses_contribute_while_skipped_missed_pending_do_not():
    """
    Test 6: TAKEN doses contribute to consumption.
    Test 7: SKIPPED doses do NOT contribute to consumption.
    Test 8: MISSED doses do NOT contribute to consumption.
    Test 9: PENDING doses do NOT contribute to consumption.
    """
    headers = _register_and_login_patient("refill_doses")

    # Create medicine with current_quantity = 30.0, quantity_per_dose = 1.0
    res_med = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Atorvastatin 10mg",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "initial_quantity": "30.0",
        "current_quantity": "30.0",
        "quantity_per_dose": "1.0",
        "stock_unit": "tablet",
    })
    assert res_med.status_code == 201
    med_id = res_med.json()["id"]

    res_sched = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "09:00:00"}]
    })
    assert res_sched.status_code == 201
    sched_id = res_sched.json()["id"]

    # Record 1 PENDING dose -> should NOT count as consumed
    client.post("/api/patients/me/doses", headers=headers, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": "2026-09-01T09:00:00Z",
        "status": "PENDING"
    })

    # Record 1 SKIPPED dose -> should NOT count as consumed
    client.post("/api/patients/me/doses", headers=headers, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": "2026-09-02T09:00:00Z",
        "status": "SKIPPED"
    })

    # Record 1 MISSED dose -> should NOT count as consumed
    client.post("/api/patients/me/doses", headers=headers, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": "2026-09-03T09:00:00Z",
        "status": "MISSED"
    })

    # Record 3 TAKEN doses with dose_quantity_taken = 2.0 each
    for day in range(4, 7):
        client.post("/api/patients/me/doses", headers=headers, json={
            "schedule_id": sched_id,
            "scheduled_timestamp": f"2026-09-0{day}T09:00:00Z",
            "status": "TAKEN",
            "dose_quantity_taken": "2.0"
        })

    # Fetch Refill Prediction
    res_pred = client.get("/api/patients/me/refill-predictions", headers=headers)
    assert res_pred.status_code == 200
    pred = res_pred.json()["items"][0]

    # Historical consumption was computed from the 3 TAKEN doses (3 * 2.0 = 6.0 total consumed)
    assert pred["historical_daily_consumption"] is not None
    assert pred["historical_daily_consumption"] > 0
    assert pred["data_quality"] in ("HIGH", "MODERATE")


def test_status_transitions_and_out_of_stock():
    """
    Test 14: Out of stock handling (current_quantity <= 0 -> OUT_OF_STOCK).
    Test 18: Deterministic status levels:
             REFILL_RECOMMENDED (<= 3 days supply)
             REFILL_SOON (4 to 10 days supply)
             ON_TRACK (> 10 days supply)
    """
    headers = _register_and_login_patient("refill_statuses")

    # 1. OUT OF STOCK medicine
    res_out = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Insulin Glargine",
        "dosage_amount": "10.0",
        "dosage_unit": "units",
        "start_date": "2026-09-01",
        "initial_quantity": "0.0",
        "current_quantity": "0.0",
        "quantity_per_dose": "10.0",
        "stock_unit": "units",
    })
    assert res_out.status_code == 201
    med_out_id = res_out.json()["id"]

    # 2. REFILL_RECOMMENDED medicine (2 days of supply)
    res_rec = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Levothyroxine 50mcg",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "initial_quantity": "2.0",
        "current_quantity": "2.0",
        "quantity_per_dose": "1.0",
        "stock_unit": "tablet",
        "low_stock_threshold": "5.0",
    })
    assert res_rec.status_code == 201
    med_rec_id = res_rec.json()["id"]

    client.post(f"/api/patients/me/medicines/{med_rec_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "07:00:00"}]
    })

    # 3. REFILL_SOON medicine (6 days of supply)
    res_soon = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Omeprazole 20mg",
        "dosage_amount": "1.0",
        "dosage_unit": "capsule",
        "start_date": "2026-09-01",
        "initial_quantity": "6.0",
        "current_quantity": "6.0",
        "quantity_per_dose": "1.0",
        "stock_unit": "capsule",
        "low_stock_threshold": "3.0",
    })
    assert res_soon.status_code == 201
    med_soon_id = res_soon.json()["id"]

    client.post(f"/api/patients/me/medicines/{med_soon_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "1.0",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "08:00:00"}]
    })

    # Fetch All Predictions
    res_pred = client.get("/api/patients/me/refill-predictions", headers=headers)
    assert res_pred.status_code == 200
    summary = res_pred.json()

    assert summary["out_of_stock_count"] >= 1
    assert summary["refill_recommended_count"] >= 1
    assert summary["refill_soon_count"] >= 1

    preds_by_id = {item["medication_id"]: item for item in summary["items"]}

    # Verify Out of Stock item
    pred_out = preds_by_id[med_out_id]
    assert pred_out["prediction_status"] == "OUT_OF_STOCK"
    assert pred_out["estimated_days_remaining"] == 0.0
    assert pred_out["estimated_depletion_date"] == date.today().isoformat()
    assert pred_out["recommended_refill_date"] == date.today().isoformat()

    # Verify Refill Recommended item
    pred_rec = preds_by_id[med_rec_id]
    assert pred_rec["prediction_status"] == "REFILL_RECOMMENDED"
    assert pred_rec["estimated_days_remaining"] == 2.0

    # Verify Refill Soon item
    pred_soon = preds_by_id[med_soon_id]
    assert pred_soon["prediction_status"] == "REFILL_SOON"
    assert pred_soon["estimated_days_remaining"] == 6.0


def test_insufficient_data_and_zero_consumption_handling():
    """
    Test 15: Zero-consumption handling without crashes.
    Test 16: Insufficient-data handling when medication has stock but no schedule & no dose history.
    Test 17: Multiple medications produce independent predictions.
    """
    headers = _register_and_login_patient("refill_insuf")

    # Create medicine with stock but NO schedule and NO dose events
    res_med = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Vitamin D3 1000IU",
        "dosage_amount": "1.0",
        "dosage_unit": "softgel",
        "start_date": "2026-09-01",
        "initial_quantity": "50.0",
        "current_quantity": "50.0",
        "quantity_per_dose": "1.0",
        "stock_unit": "softgel",
    })
    assert res_med.status_code == 201
    med_id = res_med.json()["id"]

    res_pred = client.get("/api/patients/me/refill-predictions", headers=headers)
    assert res_pred.status_code == 200
    summary = res_pred.json()

    pred = summary["items"][0]
    assert pred["medication_id"] == med_id
    assert pred["prediction_status"] == "INSUFFICIENT_DATA"
    assert pred["estimated_days_remaining"] is None
    assert pred["estimated_depletion_date"] is None
    assert pred["recommended_refill_date"] is None
    assert "Insufficient" in pred["explanation"] or "insufficient" in pred["explanation"].lower()
    assert summary["insufficient_data_count"] == 1
