import uuid
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


def test_medicine_stock_initialization_and_status():
    """
    Test initial stock quantity, quantity per dose, stock unit,
    and initial stock status (AVAILABLE, LOW, OUT_OF_STOCK).
    """
    headers = _register_and_login_patient("stock_init")

    # 1. Create medicine with ample stock (AVAILABLE)
    res_avail = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Metformin 500mg",
        "generic_name": "Metformin",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "instructions": "Take with meals",
        "start_date": "2026-09-01",
        "initial_quantity": "50.0",
        "current_quantity": "50.0",
        "quantity_per_dose": "1.0",
        "stock_unit": "tablet",
        "low_stock_threshold": "10.0",
    })
    assert res_avail.status_code == 201
    med_avail = res_avail.json()
    assert float(med_avail["initial_quantity"]) == 50.0
    assert float(med_avail["current_quantity"]) == 50.0
    assert float(med_avail["quantity_per_dose"]) == 1.0
    assert med_avail["stock_unit"] == "tablet"
    assert float(med_avail["low_stock_threshold"]) == 10.0
    assert med_avail["stock_status"] == "AVAILABLE"

    # 2. Create medicine with low stock (LOW)
    res_low = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Lisinopril 10mg",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "initial_quantity": "8.0",
        "current_quantity": "8.0",
        "quantity_per_dose": "1.0",
        "stock_unit": "tablet",
        "low_stock_threshold": "10.0",
    })
    assert res_low.status_code == 201
    med_low = res_low.json()
    assert float(med_low["current_quantity"]) == 8.0
    assert med_low["stock_status"] == "LOW"

    # 3. Create medicine with zero stock (OUT_OF_STOCK)
    res_out = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Atorvastatin 20mg",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "initial_quantity": "0.0",
        "current_quantity": "0.0",
        "quantity_per_dose": "1.0",
        "stock_unit": "tablet",
        "low_stock_threshold": "5.0",
    })
    assert res_out.status_code == 201
    med_out = res_out.json()
    assert float(med_out["current_quantity"]) == 0.0
    assert med_out["stock_status"] == "OUT_OF_STOCK"


def test_manual_stock_update_and_add():
    """
    Test manual stock level update and stock add operations.
    """
    headers = _register_and_login_patient("stock_update")

    # Create medicine with 20 tablets
    res = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Amoxicillin 500mg",
        "dosage_amount": "1.0",
        "dosage_unit": "capsule",
        "start_date": "2026-09-01",
        "initial_quantity": "20.0",
        "current_quantity": "20.0",
        "quantity_per_dose": "2.0",
        "stock_unit": "capsule",
        "low_stock_threshold": "5.0",
    })
    assert res.status_code == 201
    med_id = res.json()["id"]

    # 1. Get stock info
    res_stock = client.get(f"/api/patients/me/medicines/{med_id}/stock", headers=headers)
    assert res_stock.status_code == 200
    assert float(res_stock.json()["current_quantity"]) == 20.0
    assert res_stock.json()["stock_status"] == "AVAILABLE"

    # 2. Add stock (+30)
    res_add = client.post(f"/api/patients/me/medicines/{med_id}/stock/add", headers=headers, json={
        "quantity": "30.0"
    })
    assert res_add.status_code == 200
    assert float(res_add.json()["current_quantity"]) == 50.0
    assert res_add.json()["stock_status"] == "AVAILABLE"

    # 3. Manual update (set current_quantity to 4.0 -> should become LOW)
    res_update = client.patch(f"/api/patients/me/medicines/{med_id}/stock", headers=headers, json={
        "current_quantity": "4.0",
        "quantity_per_dose": "1.0"
    })
    assert res_update.status_code == 200
    assert float(res_update.json()["current_quantity"]) == 4.0
    assert float(res_update.json()["quantity_per_dose"]) == 1.0
    assert res_update.json()["stock_status"] == "LOW"

    # 4. Test alias endpoint /api/medications/{id}/stock
    res_alias = client.get(f"/api/medications/{med_id}/stock", headers=headers)
    assert res_alias.status_code == 200
    assert float(res_alias.json()["current_quantity"]) == 4.0


def test_stock_consumption_and_negative_stock_prevention():
    """
    Test consuming stock and verify that stock is prevented from going negative.
    """
    headers = _register_and_login_patient("stock_consume")

    # Create medicine with 3 units
    res = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Omeprazole 20mg",
        "dosage_amount": "1.0",
        "dosage_unit": "capsule",
        "start_date": "2026-09-01",
        "initial_quantity": "3.0",
        "current_quantity": "3.0",
        "quantity_per_dose": "1.0",
        "stock_unit": "capsule",
        "low_stock_threshold": "2.0",
    })
    assert res.status_code == 201
    med_id = res.json()["id"]

    # 1. Consume 1 unit (remaining: 2 -> LOW)
    res_c1 = client.post(f"/api/patients/me/medicines/{med_id}/stock/consume", headers=headers, json={
        "quantity": "1.0"
    })
    assert res_c1.status_code == 200
    assert float(res_c1.json()["current_quantity"]) == 2.0
    assert res_c1.json()["stock_status"] == "LOW"

    # 2. Consume default dose quantity (quantity omitted -> uses quantity_per_dose=1.0)
    res_c2 = client.post(f"/api/patients/me/medicines/{med_id}/stock/consume", headers=headers, json={})
    assert res_c2.status_code == 200
    assert float(res_c2.json()["current_quantity"]) == 1.0
    assert res_c2.json()["stock_status"] == "LOW"

    # 3. Consume more than remaining (consume 10 units when only 1 unit is available)
    # Stock must clamp to 0.0 and NOT become negative
    res_c3 = client.post(f"/api/patients/me/medicines/{med_id}/stock/consume", headers=headers, json={
        "quantity": "10.0"
    })
    assert res_c3.status_code == 200
    assert float(res_c3.json()["current_quantity"]) == 0.0
    assert res_c3.json()["stock_status"] == "OUT_OF_STOCK"

    # 4. Reject negative quantity input in update
    res_neg = client.patch(f"/api/patients/me/medicines/{med_id}/stock", headers=headers, json={
        "current_quantity": "-5.0"
    })
    assert res_neg.status_code == 422


def test_dose_taken_deducts_stock_and_skipped_does_not():
    """
    Test that marking a dose as TAKEN deducts medication stock,
    while PENDING and SKIPPED do not deduct stock.
    """
    headers = _register_and_login_patient("dose_stock")

    # 1. Create medication with 10 units, quantity_per_dose = 2.0
    res_med = client.post("/api/patients/me/medicines", headers=headers, json={
        "name": "Ibuprofen 400mg",
        "dosage_amount": "2.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "initial_quantity": "10.0",
        "current_quantity": "10.0",
        "quantity_per_dose": "2.0",
        "stock_unit": "tablet",
        "low_stock_threshold": "4.0",
    })
    assert res_med.status_code == 201
    med_id = res_med.json()["id"]

    # 2. Create schedule (Daily at 08:00 and 20:00)
    res_sched = client.post(f"/api/patients/me/medicines/{med_id}/schedules", headers=headers, json={
        "frequency_type": "DAILY",
        "dose_quantity": "2.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "times": [{"scheduled_time": "08:00:00"}, {"scheduled_time": "20:00:00"}]
    })
    assert res_sched.status_code == 201
    sched_id = res_sched.json()["id"]

    # 3. Record PENDING dose event -> Stock must remain 10.0
    res_pending = client.post("/api/patients/me/doses", headers=headers, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": "2026-09-01T08:00:00Z",
        "status": "PENDING"
    })
    assert res_pending.status_code == 201
    dose_pending_id = res_pending.json()["id"]

    res_stock1 = client.get(f"/api/patients/me/medicines/{med_id}/stock", headers=headers)
    assert float(res_stock1.json()["current_quantity"]) == 10.0

    # 4. Mark dose as SKIPPED -> Stock must remain 10.0
    res_skip = client.patch(f"/api/patients/me/doses/{dose_pending_id}/skipped", headers=headers, json={
        "notes": "Patient was fasting"
    })
    assert res_skip.status_code == 200
    assert res_skip.json()["status"] == "SKIPPED"

    res_stock2 = client.get(f"/api/patients/me/medicines/{med_id}/stock", headers=headers)
    assert float(res_stock2.json()["current_quantity"]) == 10.0

    # 5. Mark dose as TAKEN -> Stock must decrease by 2.0 (10.0 -> 8.0)
    res_taken = client.patch(f"/api/patients/me/doses/{dose_pending_id}/taken", headers=headers, json={
        "notes": "Taken with glass of water"
    })
    assert res_taken.status_code == 200
    assert res_taken.json()["status"] == "TAKEN"

    res_stock3 = client.get(f"/api/patients/me/medicines/{med_id}/stock", headers=headers)
    assert float(res_stock3.json()["current_quantity"]) == 8.0

    # 6. Marking TAKEN again should NOT deduct stock twice (idempotent stock deduction)
    res_taken_repeat = client.patch(f"/api/patients/me/doses/{dose_pending_id}/taken", headers=headers, json={})
    assert res_taken_repeat.status_code == 200
    res_stock4 = client.get(f"/api/patients/me/medicines/{med_id}/stock", headers=headers)
    assert float(res_stock4.json()["current_quantity"]) == 8.0

    # 7. Record a brand new dose directly as TAKEN -> Stock decreases by 2.0 (8.0 -> 6.0)
    res_direct_taken = client.post("/api/patients/me/doses", headers=headers, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": "2026-09-01T20:00:00Z",
        "status": "TAKEN"
    })
    assert res_direct_taken.status_code == 201
    assert res_direct_taken.json()["status"] == "TAKEN"

    res_stock5 = client.get(f"/api/patients/me/medicines/{med_id}/stock", headers=headers)
    assert float(res_stock5.json()["current_quantity"]) == 6.0


def test_stock_security_and_patient_isolation():
    """
    Test that patients cannot view or mutate another patient's stock.
    """
    headers_a = _register_and_login_patient("stock_sec_a")
    headers_b = _register_and_login_patient("stock_sec_b")

    # Patient A creates medicine
    res_a = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Aspirin 81mg",
        "dosage_amount": "1.0",
        "dosage_unit": "tablet",
        "start_date": "2026-09-01",
        "initial_quantity": "100.0",
        "current_quantity": "100.0",
        "quantity_per_dose": "1.0",
        "stock_unit": "tablet",
    })
    assert res_a.status_code == 201
    med_a_id = res_a.json()["id"]

    # Patient B tries to get Patient A's stock -> 404
    res_b_get = client.get(f"/api/patients/me/medicines/{med_a_id}/stock", headers=headers_b)
    assert res_b_get.status_code == 404

    # Patient B tries to add stock to Patient A's medicine -> 404
    res_b_add = client.post(f"/api/patients/me/medicines/{med_a_id}/stock/add", headers=headers_b, json={
        "quantity": "50.0"
    })
    assert res_b_add.status_code == 404

    # Patient B tries to consume Patient A's medicine -> 404
    res_b_consume = client.post(f"/api/patients/me/medicines/{med_a_id}/stock/consume", headers=headers_b, json={
        "quantity": "1.0"
    })
    assert res_b_consume.status_code == 404
