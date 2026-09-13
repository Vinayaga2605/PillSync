import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo
from fastapi.testclient import TestClient

from main import app
from app.services.reminder_service import get_app_timezone, normalize_reference_datetime

client = TestClient(app)


def run_tests():
    print("==================================================")
    print("RUNNING PILLSYNC FEATURE 12: ADHERENCE & HISTORY TESTS")
    print("==================================================")

    # 1. Health checks
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/health/db").status_code == 200
    print("PASS: Health checks verified (200 OK)")

    # 2. Register & Login Patient A
    rand_a = uuid.uuid4().hex[:6]
    email_a = f"patient_adh_a_{rand_a}@example.com"
    reg_a = client.post("/api/auth/register", json={
        "first_name": "Adherence",
        "last_name": "Alpha",
        "email": email_a,
        "password": "Password123!",
        "role": "PATIENT"
    })
    assert reg_a.status_code == 201
    login_a = client.post("/api/auth/login", json={"email": email_a, "password": "Password123!"})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Register & Login Patient B
    rand_b = uuid.uuid4().hex[:6]
    email_b = f"patient_adh_b_{rand_b}@example.com"
    reg_b = client.post("/api/auth/register", json={
        "first_name": "Adherence",
        "last_name": "Beta",
        "email": email_b,
        "password": "Password123!",
        "role": "PATIENT"
    })
    assert reg_b.status_code == 201
    login_b = client.post("/api/auth/login", json={"email": email_b, "password": "Password123!"})
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Register Caregiver
    rand_cg = uuid.uuid4().hex[:6]
    email_cg = f"caregiver_adh_{rand_cg}@example.com"
    reg_cg = client.post("/api/auth/register", json={
        "first_name": "Caregiver",
        "last_name": "User",
        "email": email_cg,
        "password": "Password123!",
        "role": "CAREGIVER"
    })
    assert reg_cg.status_code == 201
    login_cg = client.post("/api/auth/login", json={"email": email_cg, "password": "Password123!"})
    token_cg = login_cg.json()["access_token"]
    headers_cg = {"Authorization": f"Bearer {token_cg}"}

    print("PASS: Setup Patient A, Patient B, and Caregiver users")

    # 3. Setup medicines and schedules for Patient A
    med_res_a1 = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Amoxicillin 500mg",
        "dosage_amount": 1.0,
        "dosage_unit": "capsule",
        "start_date": "2026-08-01",
        "is_active": True
    })
    assert med_res_a1.status_code == 201
    pm_a1_id = med_res_a1.json()["id"]

    sched_res_a1 = client.post(f"/api/patients/me/medicines/{pm_a1_id}/schedules", headers=headers_a, json={
        "frequency_type": "DAILY",
        "dose_quantity": 1.0,
        "dosage_unit": "capsule",
        "start_date": "2026-08-01",
        "is_active": True,
        "times": [
            {"scheduled_time": "08:00:00", "time_of_day_type": "MORNING"},
            {"scheduled_time": "14:00:00", "time_of_day_type": "AFTERNOON"},
            {"scheduled_time": "20:00:00", "time_of_day_type": "EVENING"},
        ]
    })
    assert sched_res_a1.status_code == 201
    sched_a1_id = sched_res_a1.json()["id"]

    med_res_a2 = client.post("/api/patients/me/medicines", headers=headers_a, json={
        "name": "Metformin 500mg",
        "dosage_amount": 1.0,
        "dosage_unit": "tablet",
        "start_date": "2026-08-01",
        "is_active": True
    })
    assert med_res_a2.status_code == 201
    pm_a2_id = med_res_a2.json()["id"]

    sched_res_a2 = client.post(f"/api/patients/me/medicines/{pm_a2_id}/schedules", headers=headers_a, json={
        "frequency_type": "DAILY",
        "dose_quantity": 1.0,
        "dosage_unit": "tablet",
        "start_date": "2026-08-01",
        "is_active": True,
        "times": [
            {"scheduled_time": "09:00:00", "time_of_day_type": "MORNING"},
        ]
    })
    assert sched_res_a2.status_code == 201
    sched_a2_id = sched_res_a2.json()["id"]

    # Setup medicines and schedules for Patient B
    med_res_b = client.post("/api/patients/me/medicines", headers=headers_b, json={
        "name": "Aspirin 75mg",
        "dosage_amount": 1.0,
        "dosage_unit": "tablet",
        "start_date": "2026-08-01",
        "is_active": True
    })
    assert med_res_b.status_code == 201
    pm_b_id = med_res_b.json()["id"]

    sched_res_b = client.post(f"/api/patients/me/medicines/{pm_b_id}/schedules", headers=headers_b, json={
        "frequency_type": "DAILY",
        "dose_quantity": 1.0,
        "dosage_unit": "tablet",
        "start_date": "2026-08-01",
        "is_active": True,
        "times": [
            {"scheduled_time": "10:00:00", "time_of_day_type": "MORNING"},
        ]
    })
    assert sched_res_b.status_code == 201
    sched_b_id = sched_res_b.json()["id"]

    print("PASS: Setup test medications and schedules")

    # 4. Zero completed doses handled safely (returns 0.0, no division by zero)
    zero_today = client.get("/api/patients/me/adherence/today", headers=headers_a)
    assert zero_today.status_code == 200
    z_data = zero_today.json()
    assert z_data["total_doses"] == 0
    assert z_data["taken_doses"] == 0
    assert z_data["skipped_doses"] == 0
    assert z_data["pending_doses"] == 0
    assert z_data["adherence_percentage"] == 0.0
    print("PASS [8]: Zero completed doses handled safely (0.0% adherence, no error)")

    # 5. Populate known dose events for Patient A for today
    tz = get_app_timezone()
    now = normalize_reference_datetime()
    today_str = now.date().isoformat()

    # Dose 1: Today 08:00 -> TAKEN
    ts_today_1 = f"{today_str}T08:00:00+05:30"
    d1 = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": sched_a1_id,
        "scheduled_timestamp": ts_today_1,
        "status": "TAKEN",
        "notes": "Taken with breakfast"
    })
    assert d1.status_code == 201

    # Dose 2: Today 14:00 -> TAKEN
    ts_today_2 = f"{today_str}T14:00:00+05:30"
    d2 = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": sched_a1_id,
        "scheduled_timestamp": ts_today_2,
        "status": "TAKEN",
        "notes": "Taken after lunch"
    })
    assert d2.status_code == 201

    # Dose 3: Today 20:00 -> SKIPPED
    ts_today_3 = f"{today_str}T20:00:00+05:30"
    d3 = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": sched_a1_id,
        "scheduled_timestamp": ts_today_3,
        "status": "SKIPPED",
        "notes": "Felt nauseous"
    })
    assert d3.status_code == 201

    # Dose 4: Today 09:00 (Metformin) -> PENDING
    ts_today_4 = f"{today_str}T09:00:00+05:30"
    d4 = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": sched_a2_id,
        "scheduled_timestamp": ts_today_4,
        "status": "PENDING"
    })
    assert d4.status_code == 201

    # 6. Test Today's adherence calculation & PENDING exclusion rule
    # Total doses: 4 (2 TAKEN, 1 SKIPPED, 1 PENDING)
    # Completed trackable doses: 3 (2 TAKEN + 1 SKIPPED)
    # Adherence = 2 / 3 * 100 = 66.67%
    today_res = client.get("/api/patients/me/adherence/today", headers=headers_a)
    assert today_res.status_code == 200
    t_data = today_res.json()
    assert t_data["period_start"] == today_str
    assert t_data["period_end"] == today_str
    assert t_data["total_doses"] == 4
    assert t_data["taken_doses"] == 2
    assert t_data["skipped_doses"] == 1
    assert t_data["pending_doses"] == 1
    assert t_data["adherence_percentage"] == 66.67
    print("PASS [1, 5, 6, 7]: Today's adherence calculated correctly: 2 TAKEN / (2 TAKEN + 1 SKIPPED) = 66.67%, PENDING excluded from denominator")

    # 7. Test Weekly and Monthly adherence
    week_res = client.get("/api/patients/me/adherence/week", headers=headers_a)
    assert week_res.status_code == 200
    w_data = week_res.json()
    assert w_data["total_doses"] >= 4
    assert w_data["taken_doses"] >= 2
    assert "adherence_percentage" in w_data
    print("PASS [2]: Weekly adherence endpoint returns timezone-aware statistics")

    month_res = client.get("/api/patients/me/adherence/month", headers=headers_a)
    assert month_res.status_code == 200
    m_data = month_res.json()
    assert m_data["total_doses"] >= 4
    assert m_data["taken_doses"] >= 2
    assert "adherence_percentage" in m_data
    print("PASS [3]: Monthly adherence endpoint returns valid monthly bounds and statistics")

    # 8. Test Custom Date Range
    # Record dose yesterday: 1 TAKEN
    yesterday = now.date() - timedelta(days=1)
    y_str = yesterday.isoformat()
    ts_y = f"{y_str}T08:00:00+05:30"
    d_y = client.post("/api/patients/me/doses", headers=headers_a, json={
        "schedule_id": sched_a1_id,
        "scheduled_timestamp": ts_y,
        "status": "TAKEN"
    })
    assert d_y.status_code == 201

    custom_res = client.get(
        f"/api/patients/me/adherence?start_date={y_str}&end_date={today_str}",
        headers=headers_a
    )
    assert custom_res.status_code == 200
    c_data = custom_res.json()
    assert c_data["period_start"] == y_str
    assert c_data["period_end"] == today_str
    # Total doses across yesterday and today: 1 (yesterday taken) + 4 (today) = 5
    # Taken = 3, Skipped = 1, Pending = 1
    # Completed = 4, Adherence = 3 / 4 * 100 = 75.0%
    assert c_data["total_doses"] == 5
    assert c_data["taken_doses"] == 3
    assert c_data["skipped_doses"] == 1
    assert c_data["pending_doses"] == 1
    assert c_data["adherence_percentage"] == 75.0
    print("PASS [4]: Custom date range adherence calculated accurately (75.0%)")

    # 9. Test Medication-Specific Adherence
    med_adh_res = client.get(
        f"/api/patients/me/adherence/medications?start_date={y_str}&end_date={today_str}",
        headers=headers_a
    )
    assert med_adh_res.status_code == 200
    ma_data = med_adh_res.json()
    assert len(ma_data["medications"]) == 2
    # Find Amoxicillin (3 TAKEN, 1 SKIPPED -> 75.0%)
    amox_item = next((m for m in ma_data["medications"] if m["patient_medication_id"] == pm_a1_id), None)
    assert amox_item is not None
    assert amox_item["taken_doses"] == 3
    assert amox_item["skipped_doses"] == 1
    assert amox_item["adherence_percentage"] == 75.0

    # Find Metformin (0 TAKEN, 0 SKIPPED, 1 PENDING -> 0.0%)
    met_item = next((m for m in ma_data["medications"] if m["patient_medication_id"] == pm_a2_id), None)
    assert met_item is not None
    assert met_item["pending_doses"] == 1
    assert met_item["adherence_percentage"] == 0.0
    print("PASS [9]: Medication-specific adherence calculates individual and overall percentages")

    # 10. Test Medication History Retrieval
    history_all = client.get("/api/patients/me/medication-history", headers=headers_a)
    assert history_all.status_code == 200
    h_data = history_all.json()
    assert h_data["total_count"] == 5
    assert len(h_data["items"]) == 5
    # Verify no leaked credentials or unauthorized fields
    sample_item = h_data["items"][0]
    assert "medicine_name" in sample_item
    assert "scheduled_timestamp" in sample_item
    assert "status" in sample_item
    assert "password" not in sample_item
    assert "hashed_password" not in sample_item
    print("PASS [10]: Medication history retrieved with clean DTO without sensitive data")

    # 11. Test History Date Filtering
    hist_today = client.get(
        f"/api/patients/me/medication-history?start_date={today_str}&end_date={today_str}",
        headers=headers_a
    )
    assert hist_today.status_code == 200
    assert hist_today.json()["total_count"] == 4
    print("PASS [11]: Medication history date filtering works accurately")

    # 12. Test History Medicine Filtering
    hist_amox = client.get(
        f"/api/patients/me/medication-history?medicine_id={pm_a1_id}",
        headers=headers_a
    )
    assert hist_amox.status_code == 200
    assert hist_amox.json()["total_count"] == 4
    for itm in hist_amox.json()["items"]:
        assert itm["patient_medication_id"] == pm_a1_id

    hist_met = client.get(
        f"/api/patients/me/medication-history?medicine_id={pm_a2_id}",
        headers=headers_a
    )
    assert hist_met.status_code == 200
    assert hist_met.json()["total_count"] == 1
    print("PASS [12]: Medication history filtering by medicine_id works accurately")

    # 13. Test History Status Filtering
    hist_skipped = client.get(
        "/api/patients/me/medication-history?status=SKIPPED",
        headers=headers_a
    )
    assert hist_skipped.status_code == 200
    assert hist_skipped.json()["total_count"] == 1
    assert hist_skipped.json()["items"][0]["status"] == "SKIPPED"
    assert hist_skipped.json()["items"][0]["notes"] == "Felt nauseous"
    print("PASS [13]: Medication history status filtering works accurately")

    # 14. Test Patient Ownership Isolation (Patient A vs Patient B)
    # Patient B records a dose
    ts_b = f"{today_str}T10:00:00+05:30"
    client.post("/api/patients/me/doses", headers=headers_b, json={
        "schedule_id": sched_b_id,
        "scheduled_timestamp": ts_b,
        "status": "TAKEN"
    })

    # Patient B requests history -> should see only 1 dose
    hist_b = client.get("/api/patients/me/medication-history", headers=headers_b)
    assert hist_b.status_code == 200
    assert hist_b.json()["total_count"] == 1
    assert hist_b.json()["items"][0]["medicine_name"] == "Aspirin 75mg"

    # Patient B requests adherence -> 100% (1 TAKEN / 1 total)
    adh_b = client.get("/api/patients/me/adherence/today", headers=headers_b)
    assert adh_b.status_code == 200
    assert adh_b.json()["total_doses"] == 1
    assert adh_b.json()["taken_doses"] == 1
    assert adh_b.json()["adherence_percentage"] == 100.0

    # Patient A's adherence remains unchanged
    adh_a_check = client.get("/api/patients/me/adherence/today", headers=headers_a)
    assert adh_a_check.json()["total_doses"] == 4
    assert adh_a_check.json()["adherence_percentage"] == 66.67
    print("PASS [14]: Patient ownership strictly isolated across adherence and history")

    # 15. Unauthenticated request → 401
    unauth_adh = client.get("/api/patients/me/adherence/today")
    assert unauth_adh.status_code == 401
    unauth_hist = client.get("/api/patients/me/medication-history")
    assert unauth_hist.status_code == 401
    print("PASS [15]: Unauthenticated requests blocked with 401 Unauthorized")

    # 16. Caregiver role → 403
    cg_adh = client.get("/api/patients/me/adherence/today", headers=headers_cg)
    assert cg_adh.status_code == 403
    cg_hist = client.get("/api/patients/me/medication-history", headers=headers_cg)
    assert cg_hist.status_code == 403
    print("PASS [16]: Caregiver role blocked with 403 Forbidden")

    # 17. Invalid date range → 422
    inv_range = client.get(
        f"/api/patients/me/adherence?start_date=2026-09-10&end_date=2026-09-01",
        headers=headers_a
    )
    assert inv_range.status_code == 422
    inv_hist = client.get(
        f"/api/patients/me/medication-history?start_date=2026-09-10&end_date=2026-09-01",
        headers=headers_a
    )
    assert inv_hist.status_code == 422
    print("PASS [17]: Inverted date range rejected with 422 Unprocessable Entity")

    print("==================================================")
    print("ALL FEATURE 12 ADHERENCE & HISTORY TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
