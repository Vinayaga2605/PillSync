import uuid
from datetime import datetime, date
from decimal import Decimal
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_feature18_stock_inventory_suite():
    print("==================================================")
    print("RUNNING PILLSYNC FEATURE 18: STOCK & INVENTORY MANAGEMENT TESTS")
    print("==================================================")

    # ----------------------------------------------------
    # Setup: Register & Login Patient A & Patient B
    # ----------------------------------------------------
    rand_a = uuid.uuid4().hex[:6]
    email_a = f"stock_patient_a_{rand_a}@example.com"
    reg_a = client.post("/api/auth/register", json={
        "first_name": "Stock",
        "last_name": "PatientA",
        "email": email_a,
        "password": "Password123!",
        "role": "PATIENT"
    })
    assert reg_a.status_code == 201, f"Failed to register Patient A: {reg_a.text}"

    login_a = client.post("/api/auth/login", json={"email": email_a, "password": "Password123!"})
    assert login_a.status_code == 200
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    rand_b = uuid.uuid4().hex[:6]
    email_b = f"stock_patient_b_{rand_b}@example.com"
    reg_b = client.post("/api/auth/register", json={
        "first_name": "Stock",
        "last_name": "PatientB",
        "email": email_b,
        "password": "Password123!",
        "role": "PATIENT"
    })
    assert reg_b.status_code == 201, f"Failed to register Patient B: {reg_b.text}"

    login_b = client.post("/api/auth/login", json={"email": email_b, "password": "Password123!"})
    assert login_b.status_code == 200
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # ----------------------------------------------------
    # Test 4, 5, 6: Initial, current stock & quantity per dose stored correctly
    # ----------------------------------------------------
    res_m1 = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Amoxicillin 500mg",
        "generic_name": "Amoxicillin",
        "dosage_amount": 500.0,
        "dosage_unit": "mg",
        "initial_quantity": 60.0,
        "current_quantity": 60.0,
        "quantity_per_dose": 2.0,
        "stock_unit": "capsule",
        "low_stock_threshold": 10.0,
        "instructions": "Take after meals",
        "start_date": "2026-09-01",
        "is_active": True
    })
    assert res_m1.status_code == 201, f"Create medicine failed: {res_m1.text}"
    med1 = res_m1.json()
    med1_id = med1["id"]
    assert Decimal(str(med1["initial_quantity"])) == Decimal("60.0")
    assert Decimal(str(med1["current_quantity"])) == Decimal("60.0")
    assert Decimal(str(med1["quantity_per_dose"])) == Decimal("2.0")
    assert med1["stock_unit"] == "capsule"
    assert med1["stock_status"] == "AVAILABLE"
    print("PASS 4, 5, 6: Initial stock, current stock, and quantity per dose stored correctly")

    # ----------------------------------------------------
    # Test 1: Authenticated patient can view stock
    # ----------------------------------------------------
    res_stock = client.get(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a)
    assert res_stock.status_code == 200
    stock_data = res_stock.json()
    assert stock_data["medication_id"] == med1_id
    assert Decimal(str(stock_data["current_quantity"])) == Decimal("60.0")
    assert stock_data["stock_unit"] == "capsule"
    assert stock_data["stock_status"] == "AVAILABLE"

    # Also test via route alias /api/medications/{id}/stock
    res_alias_stock = client.get(f"/api/medications/{med1_id}/stock", headers=headers_a)
    assert res_alias_stock.status_code == 200
    assert Decimal(str(res_alias_stock.json()["current_quantity"])) == Decimal("60.0")
    print("PASS 1: Authenticated patient can view stock via standard and alias endpoints")

    # ----------------------------------------------------
    # Test 2: Unauthenticated request rejected
    # ----------------------------------------------------
    res_unauth = client.get(f"/api/patients/me/medicines/{med1_id}/stock")
    assert res_unauth.status_code == 401
    res_unauth_patch = client.patch(f"/api/patients/me/medicines/{med1_id}/stock", json={"current_quantity": 50.0})
    assert res_unauth_patch.status_code == 401
    print("PASS 2: Unauthenticated requests rejected with 401")

    # ----------------------------------------------------
    # Test 3: Patient cannot modify or view another patient's medication
    # ----------------------------------------------------
    res_b_view = client.get(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_b)
    assert res_b_view.status_code == 404
    res_b_patch = client.patch(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_b, json={"current_quantity": 10.0})
    assert res_b_patch.status_code == 404
    res_b_add = client.post(f"/api/patients/me/medicines/{med1_id}/stock/add", headers=headers_b, json={"quantity": 10.0})
    assert res_b_add.status_code == 404
    print("PASS 3: Patient cannot view or modify another patient's medication stock (strict 404 isolation)")

    # ----------------------------------------------------
    # Test 7: Manual stock update
    # ----------------------------------------------------
    res_update = client.patch(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a, json={
        "current_quantity": 50.0
    })
    assert res_update.status_code == 200
    assert Decimal(str(res_update.json()["current_quantity"])) == Decimal("50.0")
    print("PASS 7: Manual stock update to 50.0 verified")

    # ----------------------------------------------------
    # Test 8: Add stock
    # ----------------------------------------------------
    res_add = client.post(f"/api/patients/me/medicines/{med1_id}/stock/add", headers=headers_a, json={
        "quantity": 30.0
    })
    assert res_add.status_code == 200
    assert Decimal(str(res_add.json()["current_quantity"])) == Decimal("80.0")
    print("PASS 8: Add stock (50 + 30 = 80.0) verified")

    # ----------------------------------------------------
    # Test 9: Consume stock
    # ----------------------------------------------------
    res_consume = client.post(f"/api/patients/me/medicines/{med1_id}/stock/consume", headers=headers_a, json={
        "quantity": 10.0
    })
    assert res_consume.status_code == 200
    assert Decimal(str(res_consume.json()["current_quantity"])) == Decimal("70.0")

    # Consume without explicit quantity (defaults to quantity_per_dose=2.0)
    res_consume_default = client.post(f"/api/patients/me/medicines/{med1_id}/stock/consume", headers=headers_a, json={})
    assert res_consume_default.status_code == 200
    assert Decimal(str(res_consume_default.json()["current_quantity"])) == Decimal("68.0")
    print("PASS 9: Manual consume stock verified")

    # ----------------------------------------------------
    # Test 10: Stock cannot become negative
    # ----------------------------------------------------
    # Consume more than available stock (e.g. 500 units from 68) -> clamps to 0.0
    res_consume_excess = client.post(f"/api/patients/me/medicines/{med1_id}/stock/consume", headers=headers_a, json={
        "quantity": 500.0
    })
    assert res_consume_excess.status_code == 200
    assert Decimal(str(res_consume_excess.json()["current_quantity"])) == Decimal("0.0")
    print("PASS 10: Stock cannot become negative (safely clamped at 0.0)")

    # ----------------------------------------------------
    # Setup Schedule for Dose Tracking Tests
    # ----------------------------------------------------
    # Reset stock of med1 to 20.0
    client.patch(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a, json={
        "current_quantity": 20.0,
        "quantity_per_dose": 2.0,
        "low_stock_threshold": 10.0
    })

    sched_res = client.post(f"/api/patients/me/medicines/{med1_id}/schedules", headers=headers_a, json={
        "frequency_type": "DAILY",
        "dose_quantity": 2.0,
        "dosage_unit": "capsule",
        "times": [{"scheduled_time": "08:00:00"}],
        "start_date": "2026-09-01",
        "is_active": True
    })
    assert sched_res.status_code == 201
    sched_id = sched_res.json()["id"]

    # ----------------------------------------------------
    # Test 14: PENDING dose does not deduct stock
    # ----------------------------------------------------
    ts_dose1 = "2026-09-01T08:00:00Z"
    res_pending = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": ts_dose1,
        "status": "PENDING"
    })
    assert res_pending.status_code == 201
    dose1_id = res_pending.json()["id"]

    res_stock_check = client.get(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a)
    assert Decimal(str(res_stock_check.json()["current_quantity"])) == Decimal("20.0")
    print("PASS 14: PENDING dose does not deduct stock")

    # ----------------------------------------------------
    # Test 11: TAKEN dose deducts stock
    # ----------------------------------------------------
    res_taken = client.patch(f"/api/patients/me/doses/{dose1_id}/taken", headers=headers_a, json={
        "action_timestamp": "2026-09-01T08:05:00Z"
    })
    assert res_taken.status_code == 200
    res_stock_after_taken = client.get(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a)
    assert Decimal(str(res_stock_after_taken.json()["current_quantity"])) == Decimal("18.0")
    print("PASS 11: TAKEN dose deducted stock by quantity_per_dose (20.0 - 2.0 = 18.0)")

    # ----------------------------------------------------
    # Test 15: Duplicate TAKEN operation does not double-deduct
    # ----------------------------------------------------
    res_taken_dup = client.patch(f"/api/patients/me/doses/{dose1_id}/taken", headers=headers_a, json={
        "action_timestamp": "2026-09-01T08:06:00Z"
    })
    assert res_taken_dup.status_code == 200
    res_stock_after_dup = client.get(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a)
    assert Decimal(str(res_stock_after_dup.json()["current_quantity"])) == Decimal("18.0")

    # Also test record_dose with already TAKEN timestamp
    res_rec_dup = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": ts_dose1,
        "status": "TAKEN"
    })
    assert res_rec_dup.status_code == 201
    res_stock_after_dup2 = client.get(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a)
    assert Decimal(str(res_stock_after_dup2.json()["current_quantity"])) == Decimal("18.0")
    print("PASS 15: Duplicate TAKEN operations do not double-deduct stock")

    # ----------------------------------------------------
    # Test 12: SKIPPED dose does not deduct stock
    # ----------------------------------------------------
    ts_dose2 = "2026-09-02T08:00:00Z"
    res_skipped = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": ts_dose2,
        "status": "SKIPPED",
        "notes": "Felt nauseous"
    })
    assert res_skipped.status_code == 201
    res_stock_after_skip = client.get(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a)
    assert Decimal(str(res_stock_after_skip.json()["current_quantity"])) == Decimal("18.0")
    print("PASS 12: SKIPPED dose does not deduct stock")

    # ----------------------------------------------------
    # Test 13: MISSED dose does not deduct stock
    # ----------------------------------------------------
    ts_dose3 = "2026-09-03T08:00:00Z"
    res_missed = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": sched_id,
        "scheduled_timestamp": ts_dose3,
        "status": "MISSED"
    })
    assert res_missed.status_code == 201
    res_stock_after_miss = client.get(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a)
    assert Decimal(str(res_stock_after_miss.json()["current_quantity"])) == Decimal("18.0")
    print("PASS 13: MISSED dose does not deduct stock")

    # ----------------------------------------------------
    # Test 16, 17, 18: Deterministic stock statuses (AVAILABLE, LOW, OUT_OF_STOCK)
    # ----------------------------------------------------
    # 17: Available stock status (current=18.0, threshold=10.0 -> AVAILABLE)
    res_status_avail = client.get(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a)
    assert res_status_avail.json()["stock_status"] == "AVAILABLE"
    print("PASS 17: AVAILABLE stock status verified (18.0 > 10.0 threshold)")

    # 16: Low stock status (current=8.0, threshold=10.0 -> LOW)
    client.patch(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a, json={"current_quantity": 8.0})
    res_status_low = client.get(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a)
    assert res_status_low.json()["stock_status"] == "LOW"
    print("PASS 16: LOW stock status verified (0 < 8.0 <= 10.0 threshold)")

    # 18: Out of stock status (current=0.0 -> OUT_OF_STOCK)
    client.patch(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a, json={"current_quantity": 0.0})
    res_status_oos = client.get(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a)
    assert res_status_oos.json()["stock_status"] == "OUT_OF_STOCK"
    print("PASS 18: OUT_OF_STOCK status verified (current <= 0)")

    # ----------------------------------------------------
    # Test 19: Invalid negative quantity rejected
    # ----------------------------------------------------
    res_neg_patch = client.patch(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a, json={
        "current_quantity": -5.0
    })
    assert res_neg_patch.status_code == 422

    res_neg_add = client.post(f"/api/patients/me/medicines/{med1_id}/stock/add", headers=headers_a, json={
        "quantity": -10.0
    })
    assert res_neg_add.status_code == 422
    print("PASS 19: Invalid negative quantities rejected with 422")

    # ----------------------------------------------------
    # Test 20: Invalid quantity-per-dose rejected
    # ----------------------------------------------------
    res_zero_qpd = client.patch(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a, json={
        "quantity_per_dose": 0.0
    })
    assert res_zero_qpd.status_code == 422

    res_neg_qpd = client.patch(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a, json={
        "quantity_per_dose": -2.0
    })
    assert res_neg_qpd.status_code == 422
    print("PASS 20: Invalid quantity-per-dose (<= 0) rejected with 422")

    # ----------------------------------------------------
    # Test 21: Multiple medications maintain independent stock
    # ----------------------------------------------------
    res_m2 = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Ibuprofen 400mg",
        "dosage_amount": 400.0,
        "dosage_unit": "mg",
        "initial_quantity": 30.0,
        "current_quantity": 30.0,
        "quantity_per_dose": 1.0,
        "stock_unit": "tablet",
        "instructions": "With water",
        "start_date": "2026-09-01",
        "is_active": True
    })
    assert res_m2.status_code == 201
    med2_id = res_m2.json()["id"]

    # Consume from med2
    client.post(f"/api/patients/me/medicines/{med2_id}/stock/consume", headers=headers_a, json={"quantity": 5.0})

    # Verify med2 has 25.0, while med1 remains unchanged at 0.0
    s1 = client.get(f"/api/patients/me/medicines/{med1_id}/stock", headers=headers_a).json()
    s2 = client.get(f"/api/patients/me/medicines/{med2_id}/stock", headers=headers_a).json()
    assert Decimal(str(s1["current_quantity"])) == Decimal("0.0")
    assert Decimal(str(s2["current_quantity"])) == Decimal("25.0")
    print("PASS 21: Multiple medications maintain strictly independent stock balances")

    # ----------------------------------------------------
    # Test 22: Existing medication functionality remains working
    # ----------------------------------------------------
    # List medicines
    list_res = client.get("/api/patients/me/medicines", headers=headers_a)
    assert list_res.status_code == 200
    med_list = list_res.json()
    assert len(med_list) >= 2

    # Update non-stock field (instructions)
    update_m2 = client.patch(f"/api/patients/me/medicines/{med2_id}", headers=headers_a, json={
        "instructions": "Take with full glass of water after breakfast"
    })
    assert update_m2.status_code == 200
    assert update_m2.json()["instructions"] == "Take with full glass of water after breakfast"

    # Delete medicine
    del_res = client.delete(f"/api/patients/me/medicines/{med2_id}", headers=headers_a)
    assert del_res.status_code == 204
    get_del_res = client.get(f"/api/patients/me/medicines/{med2_id}", headers=headers_a)
    assert get_del_res.status_code == 404
    print("PASS 22: Existing medication CRUD operations continue working seamlessly")

    print("==================================================")
    print("ALL 22 FEATURE 18 TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    test_feature18_stock_inventory_suite()
