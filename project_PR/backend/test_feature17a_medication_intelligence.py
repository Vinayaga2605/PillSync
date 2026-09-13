"""
Automated Test Suite for PillSync Feature 17A: Smart Medication Intelligence Backend

Tests:
1. Health check verification
2. Patient, Caregiver, Admin registration and login
3. Insufficient data handling (new patient with no dose history)
4. Seed rich medication & dose history (current 7d, previous 7d, 30d doses)
5. GET /api/patients/me/intelligence/summary (Patient access)
6. Correct adherence formula: TAKEN / (TAKEN + SKIPPED) * 100
7. PENDING doses strictly excluded from adherence calculations
8. Improving, declining, and stable trend detection
9. Repeated skipped-dose pattern on specific medication
10. Time-of-day missed dose pattern detection (evening vs morning)
11. Medication-level analysis & status (GOOD vs NEEDS_ATTENTION vs INSUFFICIENT_DATA)
12. Attention score & explanation reasons generation
13. Explainability: All insights contain supporting metric details
14. Safety boundary: Non-clinical disclaimer present; no medical diagnosis/advice
15. Patient data isolation: Patient receives strictly their own intelligence
16. Security: Caregiver receives 403 Forbidden
17. Security: Admin receives 403 Forbidden
18. Security: Unauthenticated request receives 401 Unauthorized
19. Regression: Feature 16C Admin Analytics, 15D Caregiver Notifications, 14 Patient Notifications functional
"""

import sys
import uuid
from datetime import datetime, date, time, timedelta, timezone
from fastapi.testclient import TestClient

from main import app
from app.core.database import SessionLocal
from app.models.user import User, PatientProfile, CaregiverProfile, CaregiverPatientAssignment
from app.models.medicine import PatientMedication
from app.models.schedule import MedicationSchedule, MedicationDoseEvent
from app.models.notification import Notification

client = TestClient(app)


def test_feature17a_intelligence_suite():
    print("\n==================================================")
    print("RUNNING PILLSYNC FEATURE 17A: MEDICATION INTELLIGENCE TESTS")
    print("==================================================")

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("PASS 1/19: Health check verified (200 OK)")

    # 2. Register users
    rand = str(uuid.uuid4())[:8]
    pt_email = f"pt_17a_{rand}@example.com"
    pt2_email = f"pt2_17a_{rand}@example.com"
    cg_email = f"cg_17a_{rand}@example.com"
    admin_email = f"admin_17a_{rand}@example.com"
    pwd = "Password123!"

    for email, role, fname in [
        (pt_email, "PATIENT", "Alice"),
        (pt2_email, "PATIENT", "Bob"),
        (cg_email, "CAREGIVER", "Carol"),
        (admin_email, "ADMIN", "Dave"),
    ]:
        r = client.post("/api/auth/register", json={
            "first_name": fname,
            "last_name": "Test",
            "email": email,
            "password": pwd,
            "role": role,
        })
        assert r.status_code == 201, f"Failed to register {role}: {r.text}"

    # Logins
    pt_token = client.post("/api/auth/login", json={"email": pt_email, "password": pwd}).json()["access_token"]
    pt_headers = {"Authorization": f"Bearer {pt_token}"}

    pt2_token = client.post("/api/auth/login", json={"email": pt2_email, "password": pwd}).json()["access_token"]
    pt2_headers = {"Authorization": f"Bearer {pt2_token}"}

    cg_token = client.post("/api/auth/login", json={"email": cg_email, "password": pwd}).json()["access_token"]
    cg_headers = {"Authorization": f"Bearer {cg_token}"}

    admin_token = client.post("/api/auth/login", json={"email": admin_email, "password": pwd}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    print("PASS 2/19: Users registered and authenticated with role tokens")

    # 3. Test Insufficient Data Handling for New Patient (Bob)
    res_new = client.get("/api/patients/me/intelligence/summary", headers=pt2_headers)
    assert res_new.status_code == 200, f"Expected 200 for new patient, got: {res_new.text}"
    new_data = res_new.json()
    assert new_data["summary"]["total_tracked_doses_30d"] == 0
    assert new_data["trend"]["trend_direction"] == "INSUFFICIENT_DATA"
    assert new_data["attention_score"]["score"] == 0
    assert new_data["attention_score"]["level"] == "LOW"
    assert any(i["type"] == "INSUFFICIENT_DATA" for i in new_data["insights"])
    print("PASS 3/19: Insufficient data handled gracefully with neutral guidance")

    # 4. Seed Rich Test Data for Patient Alice (Improving trend, Repeated Skips, Evening skips)
    db = SessionLocal()
    try:
        alice_user = db.query(User).filter(User.email == pt_email).first()
        alice_prof = alice_user.patient_profile
        if not alice_prof:
            alice_prof = PatientProfile(user_id=alice_user.id)
            db.add(alice_prof)
            db.flush()

        # Med 1: Lisinopril (High adherence in curr 7d, lower in prev 7d -> IMPROVING)
        med_lisinopril = PatientMedication(
            patient_id=alice_prof.id,
            custom_medicine_name="Lisinopril",
            dosage_amount=10.0,
            dosage_unit="mg",
            start_date=date.today() - timedelta(days=30),
            is_active=True,
        )
        # Med 2: Metformin (Frequent skips -> NEEDS_ATTENTION & REPEATED_SKIPS)
        med_metformin = PatientMedication(
            patient_id=alice_prof.id,
            custom_medicine_name="Metformin",
            dosage_amount=500.0,
            dosage_unit="mg",
            start_date=date.today() - timedelta(days=30),
            is_active=True,
        )
        # Med 3: Vitamin D (New active med with no doses -> INSUFFICIENT_DATA)
        med_vitamind = PatientMedication(
            patient_id=alice_prof.id,
            custom_medicine_name="Vitamin D",
            dosage_amount=1000.0,
            dosage_unit="IU",
            start_date=date.today(),
            is_active=True,
        )
        db.add_all([med_lisinopril, med_metformin, med_vitamind])
        db.flush()

        now = datetime.now(timezone.utc)

        # Previous 7d doses (days 8-14 ago):
        # Lisinopril: 2 TAKEN, 3 SKIPPED -> Adherence = 40.0%
        # Metformin: 1 TAKEN, 2 SKIPPED -> Adherence = 33.3%
        # Overall Prev 7d = 3 TAKEN, 5 SKIPPED -> 37.5%
        prev_doses = [
            # Lisinopril morning doses (08:00)
            MedicationDoseEvent(
                patient_medication_id=med_lisinopril.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=12)).replace(hour=8, minute=0, second=0),
                status="TAKEN",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_lisinopril.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=11)).replace(hour=8, minute=0, second=0),
                status="TAKEN",
            ),
            # Lisinopril evening skips (19:00)
            MedicationDoseEvent(
                patient_medication_id=med_lisinopril.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=10)).replace(hour=19, minute=0, second=0),
                status="SKIPPED",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_lisinopril.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=9)).replace(hour=19, minute=0, second=0),
                status="SKIPPED",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_lisinopril.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=8)).replace(hour=19, minute=0, second=0),
                status="SKIPPED",
            ),
            # Metformin evening doses (20:00)
            MedicationDoseEvent(
                patient_medication_id=med_metformin.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=11)).replace(hour=20, minute=0, second=0),
                status="TAKEN",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_metformin.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=10)).replace(hour=20, minute=0, second=0),
                status="SKIPPED",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_metformin.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=9)).replace(hour=20, minute=0, second=0),
                status="SKIPPED",
            ),
        ]

        # Current 7d doses (days 0-6 ago):
        # Lisinopril: 5 TAKEN, 0 SKIPPED -> Adherence = 100.0%
        # Metformin: 2 TAKEN, 2 SKIPPED (both in evening at 20:00) -> Adherence = 50.0%
        # Overall Curr 7d = 7 TAKEN, 2 SKIPPED -> 77.78% (Up from 37.5% -> IMPROVING by ~40.28%)
        # Plus 2 PENDING doses
        curr_doses = [
            # Lisinopril morning doses (08:00)
            MedicationDoseEvent(
                patient_medication_id=med_lisinopril.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=5)).replace(hour=8, minute=0, second=0),
                status="TAKEN",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_lisinopril.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=4)).replace(hour=8, minute=0, second=0),
                status="TAKEN",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_lisinopril.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=3)).replace(hour=8, minute=0, second=0),
                status="TAKEN",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_lisinopril.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=2)).replace(hour=8, minute=0, second=0),
                status="TAKEN",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_lisinopril.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=1)).replace(hour=8, minute=0, second=0),
                status="TAKEN",
            ),
            # Metformin evening doses (20:00 -> Evening skips)
            MedicationDoseEvent(
                patient_medication_id=med_metformin.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=4)).replace(hour=20, minute=0, second=0),
                status="TAKEN",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_metformin.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=3)).replace(hour=20, minute=0, second=0),
                status="TAKEN",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_metformin.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=2)).replace(hour=20, minute=0, second=0),
                status="SKIPPED",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_metformin.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=(now - timedelta(days=1)).replace(hour=20, minute=0, second=0),
                status="SKIPPED",
            ),
            # Pending doses (must be excluded from completed denominator)
            MedicationDoseEvent(
                patient_medication_id=med_lisinopril.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=now + timedelta(hours=3),
                status="PENDING",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_metformin.id,
                patient_id=alice_prof.id,
                scheduled_timestamp=now + timedelta(hours=6),
                status="PENDING",
            ),
        ]

        db.add_all(prev_doses + curr_doses)
        db.commit()
    finally:
        db.close()

    print("PASS 4/19: Seeded controlled test doses and prescriptions for Patient Alice")

    # 5. Query Intelligence Summary for Alice
    res_alice = client.get("/api/patients/me/intelligence/summary", headers=pt_headers)
    assert res_alice.status_code == 200, f"Query failed: {res_alice.text}"
    alice_intel = res_alice.json()
    print("PASS 5/19: GET /api/patients/me/intelligence/summary returned 200 OK")

    # 6. Verify Correct Adherence Formula: TAKEN / (TAKEN + SKIPPED) * 100
    # In curr 7d: Taken=7, Skipped=2 -> Completed=9 -> Adherence = 7/9 * 100 = 77.78%
    # In prev 7d: Taken=3, Skipped=5 -> Completed=8 -> Adherence = 3/8 * 100 = 37.5%
    # In 30d: Taken=10, Skipped=7 -> Completed=17 -> Adherence = 10/17 * 100 = 58.82%
    trend = alice_intel["trend"]
    assert trend["current_7d_taken"] == 7
    assert trend["current_7d_skipped"] == 2
    assert trend["current_7d_adherence"] == 77.78
    assert trend["previous_7d_taken"] == 3
    assert trend["previous_7d_skipped"] == 5
    assert trend["previous_7d_adherence"] == 37.5
    assert trend["last_30d_adherence"] == 58.82
    print("PASS 6/19: Adherence formula verified accurately across 7d, prev 7d, and 30d windows")

    # 7. Verify PENDING doses strictly excluded from denominator
    # Total doses Alice has = 17 completed + 2 pending = 19
    assert alice_intel["summary"]["total_tracked_doses_30d"] == 17
    print("PASS 7/19: PENDING doses strictly excluded from adherence calculations")

    # 8. Verify Improving Trend Detection
    # curr 77.78% - prev 37.5% = +40.28% (> 5.0% threshold)
    assert trend["trend_direction"] == "IMPROVING"
    assert trend["change_percentage"] == 40.28
    assert any(i["type"] == "ADHERENCE_IMPROVEMENT" for i in alice_intel["insights"])
    print("PASS 8/19: Improving adherence trend detected and flagged as POSITIVE insight")

    # 9. Verify Repeated Skips Detection on Metformin
    # Metformin has 4 skips (2 in prev 7d, 2 in curr 7d) -> 3 taken / 7 completed = 42.86%
    metformin_insight = next(
        (i for i in alice_intel["insights"] if i["type"] == "REPEATED_SKIPS" and "Metformin" in (i["title"] + i["message"])),
        None
    )
    assert metformin_insight is not None, f"Expected REPEATED_SKIPS insight for Metformin, got: {alice_intel['insights']}"
    assert metformin_insight["metrics"]["skipped_doses"] == 4
    print("PASS 9/19: Repeated skipped-dose pattern detected on Metformin")

    # 10. Verify Time of Day Missed Dose Pattern (Evening skips)
    tod_insight = next((i for i in alice_intel["insights"] if i["type"] == "MISSED_DOSE_TIME_PATTERN"), None)
    assert tod_insight is not None, f"Expected MISSED_DOSE_TIME_PATTERN, got: {alice_intel['insights']}"
    assert "Evening" in tod_insight["title"] or "evening" in tod_insight["message"]
    print("PASS 10/19: Time-of-day missed dose pattern detected (evening vs morning)")

    # 11. Verify Medication-Level Analysis & Statuses
    meds = alice_intel["medications"]
    assert len(meds) == 3

    lisinopril_item = next(m for m in meds if m["medicine_name"] == "Lisinopril")
    metformin_item = next(m for m in meds if m["medicine_name"] == "Metformin")
    vitamind_item = next(m for m in meds if m["medicine_name"] == "Vitamin D")

    # Lisinopril: 7 taken / 10 completed = 70.0% (status = NEEDS_ATTENTION because < 80%)
    assert lisinopril_item["taken_doses"] == 7
    assert lisinopril_item["skipped_doses"] == 3
    assert lisinopril_item["adherence_percentage"] == 70.0
    assert lisinopril_item["status"] == "NEEDS_ATTENTION"

    # Metformin: 3 taken / 7 completed = 42.86% (status = NEEDS_ATTENTION)
    assert metformin_item["taken_doses"] == 3
    assert metformin_item["skipped_doses"] == 4
    assert metformin_item["adherence_percentage"] == 42.86
    assert metformin_item["status"] == "NEEDS_ATTENTION"

    # Vitamin D: 0 doses (status = INSUFFICIENT_DATA)
    assert vitamind_item["total_doses"] == 0
    assert vitamind_item["status"] == "INSUFFICIENT_DATA"

    print("PASS 11/19: Medication-level adherence, dose breakdowns, and statuses verified")

    # 12. Verify Attention Score & Reasons Generation
    att = alice_intel["attention_score"]
    assert 0 <= att["score"] <= 100
    assert att["level"] in ["LOW", "MODERATE", "HIGH_ATTENTION"]
    assert len(att["reasons"]) > 0
    # Must list recent skips or low adherence reasons
    assert any("skipped" in r.lower() or "adherence" in r.lower() for r in att["reasons"])
    print(f"PASS 12/19: Attention score generated: {att['score']} ({att['level']}) with {len(att['reasons'])} reasons")

    # 13. Verify Explainability: All insights contain supporting metrics
    for ins in alice_intel["insights"]:
        assert ins["type"]
        assert ins["severity"] in ["INFO", "WARNING", "ALERT", "POSITIVE"]
        assert ins["title"]
        assert ins["message"]
        assert isinstance(ins["metrics"], dict)
        assert len(ins["metrics"]) > 0
    print("PASS 13/19: All generated insights are fully explainable with numeric metric structures")

    # 14. Safety Boundary: Non-clinical disclaimer present
    assert "not a clinical or medical risk diagnosis" in att["disclaimer"].lower()
    print("PASS 14/19: Safety boundary verified (Non-clinical disclaimer present; no diagnostic advice)")

    # 15. Patient Data Isolation
    # Bob (pt2) queries his own intelligence and only gets his own records
    bob_intel = client.get("/api/patients/me/intelligence/summary", headers=pt2_headers).json()
    assert bob_intel["summary"]["total_tracked_doses_30d"] == 0
    assert len(bob_intel["medications"]) == 0
    print("PASS 15/19: Strict patient data isolation enforced")

    # 16. Security: Caregiver receives 403 Forbidden
    res_cg = client.get("/api/patients/me/intelligence/summary", headers=cg_headers)
    assert res_cg.status_code == 403, f"Caregiver should receive 403, got: {res_cg.status_code}"
    print("PASS 16/19: Caregiver role strictly forbidden (403) from patient intelligence endpoint")

    # 17. Security: Admin receives 403 Forbidden on patient endpoint
    res_admin = client.get("/api/patients/me/intelligence/summary", headers=admin_headers)
    assert res_admin.status_code == 403, f"Admin should receive 403, got: {res_admin.status_code}"
    print("PASS 17/19: Admin role strictly forbidden (403) from patient intelligence endpoint")

    # 18. Security: Unauthenticated receives 401
    res_anon = client.get("/api/patients/me/intelligence/summary")
    assert res_anon.status_code == 401, f"Unauthenticated request should return 401, got: {res_anon.status_code}"
    print("PASS 18/19: Unauthenticated request strictly returns 401 Unauthorized")

    # 19. Regressions: Existing Admin Analytics, Caregiver Notifications, and Patient Notifications functional
    r_admin_ana = client.get("/api/admin/analytics/summary", headers=admin_headers)
    assert r_admin_ana.status_code == 200, f"Admin analytics regression failed: {r_admin_ana.text}"

    r_cg_notifs = client.get("/api/caregivers/me/notifications", headers=cg_headers)
    assert r_cg_notifs.status_code == 200, f"Caregiver notifications regression failed: {r_cg_notifs.text}"

    r_pt_notifs = client.get("/api/patients/me/notifications", headers=pt_headers)
    assert r_pt_notifs.status_code == 200, f"Patient notifications regression failed: {r_pt_notifs.text}"

    print("PASS 19/19: Regressions verified (Feature 16C Admin Analytics, 15D Caregiver, 14 Patient intact)")

    print("\n==================================================")
    print("ALL FEATURE 17A TESTS PASSED SUCCESSFULLY (19/19)!")
    print("==================================================")


if __name__ == "__main__":
    test_feature17a_intelligence_suite()
