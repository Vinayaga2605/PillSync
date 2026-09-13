import uuid
from decimal import Decimal
from datetime import datetime, date, time, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import select

from main import app
from app.core.database import Base, engine, get_db
from app.models.user import User, PatientProfile, CaregiverProfile
from app.models.medicine import Medicine, PatientMedication
from app.models.schedule import MedicationSchedule, MedicationDoseEvent
from app.schemas.user import UserRole


def test_feature17d_history_suite():
    client = TestClient(app)

    # 1. Health check
    res_health = client.get("/api/health")
    assert res_health.status_code == 200, f"Health check failed: {res_health.text}"
    print("PASS 1/19: Health check verified (200 OK)")

    # 2. Setup Test Users
    suffix = uuid.uuid4().hex[:8]
    pt_email = f"patient.hist.{suffix}@test.com"
    cg_email = f"caregiver.hist.{suffix}@test.com"
    adm_email = f"admin.hist.{suffix}@test.com"
    pwd = "Password123!"

    for email, role, fname in [
        (pt_email, "PATIENT", "Alice"),
        (cg_email, "CAREGIVER", "Bob"),
        (adm_email, "ADMIN", "Carol"),
    ]:
        r = client.post("/api/auth/register", json={
            "first_name": fname,
            "last_name": "HistoryTest",
            "email": email,
            "password": pwd,
            "role": role,
        })
        assert r.status_code == 201, f"Failed to register {role}: {r.text}"

    pt_token = client.post("/api/auth/login", json={"email": pt_email, "password": pwd}).json()["access_token"]
    pt_headers = {"Authorization": f"Bearer {pt_token}"}

    cg_token = client.post("/api/auth/login", json={"email": cg_email, "password": pwd}).json()["access_token"]
    cg_headers = {"Authorization": f"Bearer {cg_token}"}

    adm_token = client.post("/api/auth/login", json={"email": adm_email, "password": pwd}).json()["access_token"]
    adm_headers = {"Authorization": f"Bearer {adm_token}"}
    print("PASS 2/19: Users registered and authenticated with role tokens")

    # 3. Empty History Test (Patient with 0 doses)
    res_empty = client.get("/api/patients/me/intelligence/history", headers=pt_headers)
    assert res_empty.status_code == 200, f"Empty history query failed: {res_empty.text}"
    empty_data = res_empty.json()
    assert empty_data["summary"]["total_taken"] == 0
    assert empty_data["summary"]["total_skipped"] == 0
    assert empty_data["summary"]["total_completed"] == 0
    assert empty_data["summary"]["overall_adherence"] is None, "Empty history adherence should be null, not 0%"
    assert empty_data["comparison"]["trend_direction"] == "INSUFFICIENT_DATA"
    assert len(empty_data["daily_timeline"]) == 30, "Default 30 days daily timeline length should be 30"
    for day_item in empty_data["daily_timeline"]:
        assert day_item["completed_count"] == 0
        assert day_item["adherence_percentage"] is None, "Days with 0 completed doses must have null adherence"
    print("PASS 3/19: Empty history handles zero doses gracefully with null adherence")

    # 4. Seed Seeded Dose and Medication Data for Alice
    db = next(get_db())
    try:
        alice_user = db.execute(select(User).where(User.email == pt_email)).scalar_one()
        alice_prof = db.execute(select(PatientProfile).where(PatientProfile.user_id == alice_user.id)).scalar_one()

        med_atorvastatin = PatientMedication(
            patient_id=alice_prof.id,
            custom_medicine_name="Atorvastatin",
            dosage_amount=Decimal("20"),
            dosage_unit="mg",
            start_date=date.today() - timedelta(days=120),
            is_active=True,
        )
        med_amlodipine = PatientMedication(
            patient_id=alice_prof.id,
            custom_medicine_name="Amlodipine",
            dosage_amount=Decimal("5"),
            dosage_unit="mg",
            start_date=date.today() - timedelta(days=120),
            is_active=True,
        )
        db.add_all([med_atorvastatin, med_amlodipine])
        db.commit()
        db.refresh(med_atorvastatin)
        db.refresh(med_amlodipine)

        now = datetime.now(timezone.utc)

        # Seed 60 days of historical doses:
        # Previous 30-day window (days 31 to 60 ago):
        # Atorvastatin: 20 TAKEN, 10 SKIPPED -> Adherence = 20/30 = 66.67%
        # Amlodipine: 15 TAKEN, 15 SKIPPED -> Adherence = 15/30 = 50.00%
        # Previous 30d total: 35 TAKEN, 25 SKIPPED = 60 completed -> 35/60 = 58.33%
        doses_prev_30 = []
        for d in range(31, 61):
            day_dt = (now - timedelta(days=d)).replace(hour=9, minute=0, second=0)
            # Atorvastatin: taken for d % 3 != 0 (20 taken, 10 skipped)
            status_ator = "SKIPPED" if d % 3 == 0 else "TAKEN"
            doses_prev_30.append(
                MedicationDoseEvent(
                    patient_medication_id=med_atorvastatin.id,
                    patient_id=alice_prof.id,
                    scheduled_timestamp=day_dt,
                    status=status_ator,
                )
            )
            # Amlodipine: taken for d % 2 == 0 (15 taken, 15 skipped)
            status_amlo = "TAKEN" if d % 2 == 0 else "SKIPPED"
            doses_prev_30.append(
                MedicationDoseEvent(
                    patient_medication_id=med_amlodipine.id,
                    patient_id=alice_prof.id,
                    scheduled_timestamp=day_dt.replace(hour=20),
                    status=status_amlo,
                )
            )

        # Current 30-day window (days 1 to 30 ago):
        # Atorvastatin: 27 TAKEN, 3 SKIPPED -> Adherence = 27/30 = 90.00% (IMPROVING!)
        # Amlodipine: 24 TAKEN, 6 SKIPPED -> Adherence = 24/30 = 80.00% (IMPROVING!)
        # Current 30d total: 51 TAKEN, 9 SKIPPED = 60 completed -> 51/60 = 85.00%
        doses_curr_30 = []
        for d in range(1, 31):
            day_dt = (now - timedelta(days=d)).replace(hour=9, minute=0, second=0)
            # Atorvastatin: skipped only on days 5, 15, 25 (3 skips)
            status_ator = "SKIPPED" if d in (5, 15, 25) else "TAKEN"
            doses_curr_30.append(
                MedicationDoseEvent(
                    patient_medication_id=med_atorvastatin.id,
                    patient_id=alice_prof.id,
                    scheduled_timestamp=day_dt,
                    status=status_ator,
                )
            )
            # Amlodipine: skipped on days 4, 8, 12, 16, 20, 24 (6 skips)
            status_amlo = "SKIPPED" if d in (4, 8, 12, 16, 20, 24) else "TAKEN"
            doses_curr_30.append(
                MedicationDoseEvent(
                    patient_medication_id=med_amlodipine.id,
                    patient_id=alice_prof.id,
                    scheduled_timestamp=day_dt.replace(hour=20),
                    status=status_amlo,
                )
            )

        # Pending future doses (must be excluded from completed counts)
        doses_pending = [
            MedicationDoseEvent(
                patient_medication_id=med_atorvastatin.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=now + timedelta(hours=2),
                status="PENDING",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_amlodipine.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=now + timedelta(hours=6),
                status="PENDING",
            ),
        ]

        alice_prof_id = alice_prof.id
        db.add_all(doses_prev_30 + doses_curr_30 + doses_pending)
        db.commit()
    finally:
        db.close()

    print("PASS 4/19: Seeded controlled 60-day historical doses for Patient Alice")

    # 5. Query Default 30-Day History for Alice
    res_30 = client.get("/api/patients/me/intelligence/history", headers=pt_headers)
    assert res_30.status_code == 200, f"History query failed: {res_30.text}"
    data_30 = res_30.json()
    assert data_30["summary"]["selected_period_days"] == 30
    assert data_30["summary"]["total_taken"] == 51
    assert data_30["summary"]["total_skipped"] == 9
    assert data_30["summary"]["total_completed"] == 60
    assert data_30["summary"]["overall_adherence"] == 85.0
    print("PASS 5/19: Default 30-day historical query returns accurate aggregate metrics")

    # 6. Verify 30-Day vs Previous 30-Day Period Comparison
    comp = data_30["comparison"]
    assert comp["current_period_days"] == 30
    assert comp["current_taken"] == 51
    assert comp["current_skipped"] == 9
    assert comp["current_adherence"] == 85.0
    assert comp["previous_taken"] == 35
    assert comp["previous_skipped"] == 25
    assert comp["previous_adherence"] == 58.33
    assert comp["change_percentage"] == 26.67  # 85.0 - 58.33 = +26.67%
    assert comp["trend_direction"] == "IMPROVING"
    print("PASS 6/19: 30-Day period comparison and improving trend verified accurately")

    # 7. Query 7-Day History (?days=7)
    res_7 = client.get("/api/patients/me/intelligence/history?days=7", headers=pt_headers)
    assert res_7.status_code == 200
    data_7 = res_7.json()
    assert data_7["summary"]["selected_period_days"] == 7
    assert len(data_7["daily_timeline"]) == 7
    # In last 7 days (days 1 to 7):
    # Atorvastatin: skip on day 5 -> 6 taken, 1 skipped
    # Amlodipine: skip on day 4 -> 6 taken, 1 skipped
    # Total 7d = 12 taken, 2 skipped = 14 completed -> 12/14 * 100 = 85.71%
    assert data_7["summary"]["total_taken"] == 12
    assert data_7["summary"]["total_skipped"] == 2
    assert data_7["summary"]["total_completed"] == 14
    assert data_7["summary"]["overall_adherence"] == 85.71
    print("PASS 7/19: 7-day period query (?days=7) verified accurately")

    # 8. Query 90-Day History (?days=90)
    res_90 = client.get("/api/patients/me/intelligence/history?days=90", headers=pt_headers)
    assert res_90.status_code == 200
    data_90 = res_90.json()
    assert data_90["summary"]["selected_period_days"] == 90
    assert len(data_90["daily_timeline"]) == 90
    print("PASS 8/19: 90-day period query (?days=90) verified accurately")

    # 9. Invalid Period Rejected
    res_bad_15 = client.get("/api/patients/me/intelligence/history?days=15", headers=pt_headers)
    assert res_bad_15.status_code == 422, f"Expected 422 for days=15, got {res_bad_15.status_code}"
    res_bad_100 = client.get("/api/patients/me/intelligence/history?days=100", headers=pt_headers)
    assert res_bad_100.status_code == 422, f"Expected 422 for days=100, got {res_bad_100.status_code}"
    print("PASS 9/19: Invalid historical periods cleanly rejected with 422 Unprocessable Entity")

    # 10. Verify Pending Doses Strictly Excluded
    # Total completed doses in 30d is exactly 60 (pending doses are not in completed)
    assert data_30["summary"]["total_completed"] == 60
    print("PASS 10/19: Pending doses strictly excluded from completed dose denominator")

    # 11. Verify Daily Timeline & Null Adherence for Days with 0 Doses
    # In 90-day history, days 61-90 have 0 doses. Their adherence_percentage must be None (null)
    null_days = [d for d in data_90["daily_timeline"] if d["completed_count"] == 0]
    assert len(null_days) > 0
    for nd in null_days:
        assert nd["adherence_percentage"] is None, "Days with 0 doses must return null adherence, not 0%"
    # Days with doses must have float adherence
    active_days = [d for d in data_90["daily_timeline"] if d["completed_count"] > 0]
    assert len(active_days) == 60
    for ad in active_days:
        assert isinstance(ad["adherence_percentage"], float)
    print("PASS 11/19: Daily timeline distinguishes zero-dose days (null) from genuine adherence %")

    # 12. Verify Weekly Aggregation Logic (sum taken / sum completed * 100)
    weekly = data_30["weekly_timeline"]
    assert len(weekly) > 0
    for w in weekly:
        assert w["week_label"].startswith("Week of ")
        if w["completed_count"] > 0:
            expected_adh = round(w["taken_count"] / w["completed_count"] * 100.0, 2)
            assert w["adherence_percentage"] == expected_adh
        else:
            assert w["adherence_percentage"] is None
    print("PASS 12/19: Weekly timeline aggregation formula (sum taken / sum completed * 100) verified")

    # 13. Verify Medication-Level Historical Breakdown
    meds = data_30["medications"]
    assert len(meds) == 2
    ator = next(m for m in meds if m["medicine_name"] == "Atorvastatin")
    amlo = next(m for m in meds if m["medicine_name"] == "Amlodipine")

    assert ator["taken_count"] == 27
    assert ator["skipped_count"] == 3
    assert ator["adherence_percentage"] == 90.0
    assert ator["status"] == "GOOD"
    assert ator["trend"] == "IMPROVING"  # 90.0% vs 66.67% in previous 30d

    assert amlo["taken_count"] == 24
    assert amlo["skipped_count"] == 6
    assert amlo["adherence_percentage"] == 80.0
    assert amlo["status"] == "GOOD"
    assert amlo["trend"] == "IMPROVING"  # 80.0% vs 50.0% in previous 30d
    print("PASS 13/19: Medication-level adherence, statuses, and trends verified accurately")

    # 14. Verify Role Protection: Caregiver Blocked (403)
    res_cg_block = client.get("/api/patients/me/intelligence/history", headers=cg_headers)
    assert res_cg_block.status_code == 403, f"Expected 403 for caregiver, got {res_cg_block.status_code}"
    print("PASS 14/19: Caregiver role strictly forbidden (403) from patient history endpoint")

    # 15. Verify Role Protection: Admin Blocked (403)
    res_adm_block = client.get("/api/patients/me/intelligence/history", headers=adm_headers)
    assert res_adm_block.status_code == 403, f"Expected 403 for admin, got {res_adm_block.status_code}"
    print("PASS 15/19: Admin role strictly forbidden (403) from patient history endpoint")

    # 16. Verify Unauthenticated Request Returns 401
    res_unauth = client.get("/api/patients/me/intelligence/history")
    assert res_unauth.status_code == 401
    print("PASS 16/19: Unauthenticated request strictly returns 401 Unauthorized")

    # 17. Verify No Patient ID URL Parameter Allowed
    res_id_path = client.get(f"/api/patients/{alice_prof_id}/intelligence/history", headers=pt_headers)
    assert res_id_path.status_code in [404, 405], f"Expected 404/405, got {res_id_path.status_code}"
    print("PASS 17/19: Verified no /patients/{patient_id}/intelligence/history route exists")

    # 18. Verify No Sensitive Credentials or Secrets Exposed
    history_str = str(data_30)
    assert "password_hash" not in history_str
    assert "secret" not in history_str
    print("PASS 18/19: Verified no sensitive passwords or auth credentials exposed in history payload")

    # 19. Verify Regressions Intact
    res_summary = client.get("/api/patients/me/intelligence/summary", headers=pt_headers)
    assert res_summary.status_code == 200
    res_reminders = client.get("/api/patients/me/reminders/summary", headers=pt_headers)
    assert res_reminders.status_code == 200
    print("PASS 19/19: Regressions verified: Feature 17A Intelligence and Feature 10 Reminders intact")

    print("\n==================================================")
    print("ALL FEATURE 17D BACKEND TESTS PASSED (19/19)!")
    print("==================================================")


if __name__ == "__main__":
    test_feature17d_history_suite()
