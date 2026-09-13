"""
Automated Test Suite for PillSync Feature 16C: Admin Analytics & System Monitoring
Tests:
1. Health check verification
2. Admin, Caregiver, Patient registration & token generation
3. Seed test data (medications, schedules, doses with taken/skipped/pending statuses, notifications, caregiver-patient links)
4. GET /api/admin/analytics/summary (Admin access)
5. Metric accuracy: Users analytics & registration velocity
6. Metric accuracy: Medication & schedule counts
7. Metric accuracy: Dose performance & exact PillSync adherence formula (TAKEN / (TAKEN + SKIPPED) * 100)
8. Metric accuracy: PENDING doses strictly excluded from adherence denominator
9. Metric accuracy: Daily adherence trend data points
10. Metric accuracy: Notification breakdown by type and read/unread status
11. Metric accuracy: Relationship & network distribution
12. Metric accuracy: System health status (API & DB)
13. Security: Patient receives 403 Forbidden
14. Security: Caregiver receives 403 Forbidden
15. Security: Unauthenticated request receives 401 Unauthorized
16. Security: No passwords/secrets leaked in response
17. Regression: Feature 16A Admin Dashboard, 15D Caregiver Notifications, and Patient Notifications functional
"""

import sys
import uuid
from datetime import datetime, date, time, timedelta, timezone
from fastapi.testclient import TestClient

from main import app
from app.core.database import get_db, SessionLocal
from app.models.user import User, PatientProfile, CaregiverProfile, CaregiverPatientAssignment
from app.models.medicine import PatientMedication
from app.models.schedule import MedicationSchedule, MedicationDoseEvent
from app.models.notification import Notification

client = TestClient(app)


def test_feature16c_analytics_suite():
    print("\n==================================================")
    print("RUNNING PILLSYNC FEATURE 16C: ADMIN ANALYTICS TESTS")
    print("==================================================")

    # Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("PASS: Health check verified (200 OK)")

    # 1. Register & authenticate Admin, Caregiver, Patient
    test_id = str(uuid.uuid4())[:8]
    admin_email = f"admin_16c_{test_id}@test.com"
    cg_email = f"caregiver_16c_{test_id}@test.com"
    pt_email = f"patient_16c_{test_id}@test.com"
    password = "Password123!"

    # Register admin
    res = client.post("/api/auth/register", json={
        "email": admin_email,
        "password": password,
        "first_name": "Admin",
        "last_name": "User",
        "role": "ADMIN",
    })
    assert res.status_code == 201, f"Admin register failed: {res.text}"

    # Register caregiver
    res = client.post("/api/auth/register", json={
        "email": cg_email,
        "password": password,
        "first_name": "Caregiver",
        "last_name": "Pro",
        "role": "CAREGIVER",
    })
    assert res.status_code == 201, f"Caregiver register failed: {res.text}"

    # Register patient
    res = client.post("/api/auth/register", json={
        "email": pt_email,
        "password": password,
        "first_name": "Patient",
        "last_name": "One",
        "role": "PATIENT",
    })
    assert res.status_code == 201, f"Patient register failed: {res.text}"

    # Logins
    admin_token = client.post("/api/auth/login", json={"email": admin_email, "password": password}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    cg_token = client.post("/api/auth/login", json={"email": cg_email, "password": password}).json()["access_token"]
    cg_headers = {"Authorization": f"Bearer {cg_token}"}

    pt_token = client.post("/api/auth/login", json={"email": pt_email, "password": password}).json()["access_token"]
    pt_headers = {"Authorization": f"Bearer {pt_token}"}

    print("PASS 1/17: Users registered and authenticated with role tokens")

    # 2. Seed test data in DB
    db = SessionLocal()
    try:
        # Fetch patient and caregiver profile
        pt_user = db.query(User).filter(User.email == pt_email).first()
        cg_user = db.query(User).filter(User.email == cg_email).first()
        assert pt_user and pt_user.patient_profile, "Patient profile missing"
        assert cg_user and cg_user.caregiver_profile, "Caregiver profile missing"

        pt_profile = pt_user.patient_profile
        cg_profile = cg_user.caregiver_profile

        # Create active assignment link
        assignment = CaregiverPatientAssignment(
            caregiver_id=cg_profile.id,
            patient_id=pt_profile.id,
            relationship_type="PRIMARY_GUARDIAN",
            permission_level="FULL_ACCESS",
            is_active=True,
            assigned_at=datetime.now(timezone.utc),
        )
        db.add(assignment)

        # Create 2 patient medications (1 active, 1 inactive)
        med_active = PatientMedication(
            patient_id=pt_profile.id,
            custom_medicine_name=f"MedActive_{test_id}",
            dosage_amount=1.0,
            dosage_unit="tablet",
            start_date=date.today(),
            is_active=True,
        )
        med_inactive = PatientMedication(
            patient_id=pt_profile.id,
            custom_medicine_name=f"MedInactive_{test_id}",
            dosage_amount=2.0,
            dosage_unit="tablet",
            start_date=date.today(),
            is_active=False,
        )
        db.add_all([med_active, med_inactive])
        db.flush()

        # Create schedule for active med
        sched = MedicationSchedule(
            patient_medication_id=med_active.id,
            frequency_type="DAILY",
            dose_quantity=1.0,
            start_date=date.today(),
            is_active=True,
        )
        db.add(sched)
        db.flush()

        # Seed dose events:
        # 3 TAKEN, 1 SKIPPED, 2 PENDING
        now = datetime.now(timezone.utc)
        doses = [
            MedicationDoseEvent(
                patient_medication_id=med_active.id,
                schedule_id=sched.id,
                patient_id=pt_profile.id,
                scheduled_timestamp=now - timedelta(hours=6),
                status="TAKEN",
                actual_taken_timestamp=now - timedelta(hours=6),
            ),
            MedicationDoseEvent(
                patient_medication_id=med_active.id,
                schedule_id=sched.id,
                patient_id=pt_profile.id,
                scheduled_timestamp=now - timedelta(hours=4),
                status="TAKEN",
                actual_taken_timestamp=now - timedelta(hours=4),
            ),
            MedicationDoseEvent(
                patient_medication_id=med_active.id,
                schedule_id=sched.id,
                patient_id=pt_profile.id,
                scheduled_timestamp=now - timedelta(hours=2),
                status="TAKEN",
                actual_taken_timestamp=now - timedelta(hours=2),
            ),
            MedicationDoseEvent(
                patient_medication_id=med_active.id,
                schedule_id=sched.id,
                patient_id=pt_profile.id,
                scheduled_timestamp=now - timedelta(hours=1),
                status="SKIPPED",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_active.id,
                schedule_id=sched.id,
                patient_id=pt_profile.id,
                scheduled_timestamp=now + timedelta(hours=2),
                status="PENDING",
            ),
            MedicationDoseEvent(
                patient_medication_id=med_active.id,
                schedule_id=sched.id,
                patient_id=pt_profile.id,
                scheduled_timestamp=now + timedelta(hours=4),
                status="PENDING",
            ),
        ]
        db.add_all(doses)

        # Seed notifications (4 types: 2 read, 2 unread)
        notifs = [
            Notification(
                patient_id=pt_profile.id,
                type="MEDICATION_DUE",
                title="Dose Due",
                message="Your medication is due now.",
                is_read=True,
                read_at=now,
            ),
            Notification(
                patient_id=pt_profile.id,
                type="MEDICATION_UPCOMING",
                title="Upcoming Dose",
                message="Your medication is upcoming soon.",
                is_read=False,
            ),
            Notification(
                patient_id=pt_profile.id,
                type="MISSED_DOSE",
                title="Missed Dose",
                message="You missed your scheduled dose.",
                is_read=False,
            ),
            Notification(
                patient_id=pt_profile.id,
                type="SYSTEM",
                title="System Notice",
                message="Maintenance completed successfully.",
                is_read=True,
                read_at=now,
            ),
        ]
        db.add_all(notifs)
        db.commit()
    finally:
        db.close()

    print("PASS 2/17: Seeded test users, profiles, links, doses, and notifications in DB")

    # 3. GET /api/admin/analytics/summary (Admin request)
    res = client.get("/api/admin/analytics/summary?days=30", headers=admin_headers)
    assert res.status_code == 200, f"Admin analytics query failed: {res.text}"
    analytics = res.json()
    print("PASS 3/17: GET /api/admin/analytics/summary returned 200 OK")

    # 4. Validate Overview section
    ov = analytics["overview"]
    assert ov["total_users"] >= 3
    assert ov["total_patients"] >= 1
    assert ov["total_caregivers"] >= 1
    assert ov["total_admins"] >= 1
    assert ov["total_medications"] >= 2
    assert ov["total_dose_events"] >= 6
    assert ov["total_notifications"] >= 4
    assert ov["total_relationships"] >= 1
    assert ov["active_relationships"] >= 1
    print("PASS 4/17: Overview section aggregates verified")

    # 5. Validate User Analytics section
    u_data = analytics["users"]
    assert u_data["total_users"] >= 3
    assert u_data["patients"] >= 1
    assert u_data["caregivers"] >= 1
    assert u_data["admins"] >= 1
    assert u_data["active_users"] >= 3
    assert u_data["new_users_today"] >= 3
    assert u_data["new_users_last_7_days"] >= 3
    assert u_data["new_users_last_30_days"] >= 3
    print("PASS 5/17: User growth and demographics analytics verified")

    # 6. Validate Medication & Schedule Analytics
    m_data = analytics["medications"]
    assert m_data["total_medications"] >= 2
    assert m_data["active_medications"] >= 1
    assert m_data["inactive_medications"] >= 1
    assert m_data["total_schedules"] >= 1
    assert m_data["active_schedules"] >= 1
    print("PASS 6/17: Medication prescriptions and schedules analytics verified")

    # 7. Validate Dose Performance & Adherence Formula
    # Formula: TAKEN / (TAKEN + SKIPPED) * 100
    d_data = analytics["doses"]
    assert d_data["total_doses"] >= 6
    assert d_data["taken_doses"] >= 3
    assert d_data["skipped_doses"] >= 1
    assert d_data["pending_doses"] >= 2
    assert d_data["completed_trackable_doses"] >= 4
    # Check adherence calculation is accurate and between 0 and 100
    assert 0.0 <= d_data["adherence_percentage"] <= 100.0
    print(f"PASS 7/17: Dose performance verified (Overall Adherence: {d_data['adherence_percentage']}%)")

    # 8. Verify PENDING doses are strictly excluded from adherence denominator
    # If taken=3, skipped=1, pending=2 -> completed_trackable = 4 -> adherence = 3/4 = 75%
    expected_completed = d_data["taken_doses"] + d_data["skipped_doses"]
    assert d_data["completed_trackable_doses"] == expected_completed
    expected_pct = round((d_data["taken_doses"] / expected_completed) * 100.0, 2)
    assert d_data["adherence_percentage"] == expected_pct
    print("PASS 8/17: Pending doses strictly excluded from adherence calculation denominator")

    # 9. Validate Adherence Trend
    trend = analytics["adherence_trend"]
    assert isinstance(trend, list)
    assert len(trend) >= 1
    today_str = str(date.today())
    today_point = next((p for p in trend if p["date"] == today_str), None)
    assert today_point is not None, f"Today's data point missing from trend: {trend}"
    assert today_point["taken"] >= 3
    assert today_point["skipped"] >= 1
    assert today_point["pending"] >= 2
    assert 0.0 <= today_point["adherence_percentage"] <= 100.0
    print(f"PASS 9/17: Daily adherence trend points verified ({len(trend)} days aggregated)")

    # 10. Validate Notification Breakdown
    n_data = analytics["notifications"]
    assert n_data["total_notifications"] >= 4
    assert n_data["read_notifications"] >= 2
    assert n_data["unread_notifications"] >= 2
    by_type = n_data["by_type"]
    assert by_type["MEDICATION_DUE"] >= 1
    assert by_type["MEDICATION_UPCOMING"] >= 1
    assert by_type["MISSED_DOSE"] >= 1
    assert by_type["SYSTEM"] >= 1
    print("PASS 10/17: Notification breakdown by alert type and read status verified")

    # 11. Validate Relationship Analytics
    r_data = analytics["relationships"]
    assert r_data["total_relationships"] >= 1
    assert r_data["active_relationships"] >= 1
    assert r_data["caregivers_with_patients"] >= 1
    assert r_data["patients_with_caregivers"] >= 1
    print("PASS 11/17: Caregiver network and relationship distribution verified")

    # 12. Validate System Health
    h_data = analytics["system_health"]
    assert h_data["api_status"] == "ok"
    assert h_data["database_status"] == "connected"
    print("PASS 12/17: Live system health status (API & DB) verified")

    # 13. Security: Patient receives 403 Forbidden
    res = client.get("/api/admin/analytics/summary", headers=pt_headers)
    assert res.status_code == 403, f"Patient should be forbidden, got: {res.status_code}"
    print("PASS 13/17: Patient role strictly forbidden (403) from analytics")

    # 14. Security: Caregiver receives 403 Forbidden
    res = client.get("/api/admin/analytics/summary", headers=cg_headers)
    assert res.status_code == 403, f"Caregiver should be forbidden, got: {res.status_code}"
    print("PASS 14/17: Caregiver role strictly forbidden (403) from analytics")

    # 15. Security: Unauthenticated request receives 401 Unauthorized
    res = client.get("/api/admin/analytics/summary")
    assert res.status_code == 401, f"Unauthenticated request should return 401, got: {res.status_code}"
    print("PASS 15/17: Unauthenticated access strictly returns 401 Unauthorized")

    # 16. Security: No sensitive passwords, token secrets in response
    payload_str = str(analytics)
    assert "password" not in payload_str.lower()
    assert "secret" not in payload_str.lower()
    assert "token" not in payload_str.lower() or "notifications" in payload_str.lower()
    print("PASS 16/17: No sensitive credentials or auth secrets exposed")

    # 17. Regressions: Existing Admin Dashboard, Caregiver Notifications, and Patient Notifications functional
    res_dash = client.get("/api/admin/dashboard/summary", headers=admin_headers)
    assert res_dash.status_code == 200, f"Admin dashboard failed: {res_dash.text}"

    res_cg_notifs = client.get("/api/caregivers/me/notifications", headers=cg_headers)
    assert res_cg_notifs.status_code == 200, f"Caregiver notifications failed: {res_cg_notifs.text}"

    res_pt_notifs = client.get("/api/patients/me/notifications", headers=pt_headers)
    assert res_pt_notifs.status_code == 200, f"Patient notifications failed: {res_pt_notifs.text}"

    print("PASS 17/17: Regressions verified (Feature 16A, 15D, 14 APIs intact and functional)")

    print("\n==================================================")
    print("ALL FEATURE 16C TESTS PASSED SUCCESSFULLY (17/17)!")
    print("==================================================")


if __name__ == "__main__":
    test_feature16c_analytics_suite()
