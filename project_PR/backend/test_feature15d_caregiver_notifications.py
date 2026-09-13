import os
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import select

from main import app
from app.core.database import SessionLocal
from app.models.user import User, PatientProfile, CaregiverProfile, CaregiverPatientAssignment
from app.models.notification import Notification
from app.services.notification_service import create_notification


def run_tests():
    print("==================================================")
    print("RUNNING PILLSYNC FEATURE 15D: CAREGIVER ALERTS TESTS")
    print("==================================================")

    with TestClient(app) as client:
        # 0. Health checks
        assert client.get("/api/health").status_code == 200
        print("PASS: Health check verified (200 OK)")

        # 1. Setup Caregivers & Patients
        rand = uuid.uuid4().hex[:6]
        cg_a_email = f"cg_15d_a_{rand}@example.com"
        cg_b_email = f"cg_15d_b_{rand}@example.com"
        pt_a_email = f"pt_15d_a_{rand}@example.com"
        pt_b_email = f"pt_15d_b_{rand}@example.com"
        pwd = "Password123!"

        # Register Caregiver A
        r_cg_a = client.post("/api/auth/register", json={
            "first_name": "Alice",
            "last_name": "Caregiver",
            "email": cg_a_email,
            "password": pwd,
            "role": "CAREGIVER"
        })
        assert r_cg_a.status_code == 201

        # Register Caregiver B
        r_cg_b = client.post("/api/auth/register", json={
            "first_name": "Bob",
            "last_name": "Caregiver",
            "email": cg_b_email,
            "password": pwd,
            "role": "CAREGIVER"
        })
        assert r_cg_b.status_code == 201

        # Register Patient A
        r_pt_a = client.post("/api/auth/register", json={
            "first_name": "Charlie",
            "last_name": "Patient",
            "email": pt_a_email,
            "password": pwd,
            "role": "PATIENT"
        })
        assert r_pt_a.status_code == 201

        # Register Patient B
        r_pt_b = client.post("/api/auth/register", json={
            "first_name": "Diana",
            "last_name": "Patient",
            "email": pt_b_email,
            "password": pwd,
            "role": "PATIENT"
        })
        assert r_pt_b.status_code == 201

        # Logins
        cg_a_tok = client.post("/api/auth/login", json={"email": cg_a_email, "password": pwd}).json()["access_token"]
        cg_b_tok = client.post("/api/auth/login", json={"email": cg_b_email, "password": pwd}).json()["access_token"]
        pt_a_tok = client.post("/api/auth/login", json={"email": pt_a_email, "password": pwd}).json()["access_token"]
        pt_b_tok = client.post("/api/auth/login", json={"email": pt_b_email, "password": pwd}).json()["access_token"]

        cg_a_headers = {"Authorization": f"Bearer {cg_a_tok}"}
        cg_b_headers = {"Authorization": f"Bearer {cg_b_tok}"}
        pt_a_headers = {"Authorization": f"Bearer {pt_a_tok}"}

        print("PASS 1/8: Users registered and authenticated")

        # Database setups: find Caregiver Profiles & Patient Profiles
        db = SessionLocal()
        try:
            cg_a_user = db.execute(select(User).where(User.email == cg_a_email)).scalar_one()
            cg_b_user = db.execute(select(User).where(User.email == cg_b_email)).scalar_one()
            pt_a_user = db.execute(select(User).where(User.email == pt_a_email)).scalar_one()
            pt_b_user = db.execute(select(User).where(User.email == pt_b_email)).scalar_one()

            cg_a_prof = db.execute(select(CaregiverProfile).where(CaregiverProfile.user_id == cg_a_user.id)).scalar_one_or_none()
            if not cg_a_prof:
                cg_a_prof = CaregiverProfile(user_id=cg_a_user.id)
                db.add(cg_a_prof)

            cg_b_prof = db.execute(select(CaregiverProfile).where(CaregiverProfile.user_id == cg_b_user.id)).scalar_one_or_none()
            if not cg_b_prof:
                cg_b_prof = CaregiverProfile(user_id=cg_b_user.id)
                db.add(cg_b_prof)

            pt_a_prof = db.execute(select(PatientProfile).where(PatientProfile.user_id == pt_a_user.id)).scalar_one_or_none()
            if not pt_a_prof:
                pt_a_prof = PatientProfile(user_id=pt_a_user.id)
                db.add(pt_a_prof)

            pt_b_prof = db.execute(select(PatientProfile).where(PatientProfile.user_id == pt_b_user.id)).scalar_one_or_none()
            if not pt_b_prof:
                pt_b_prof = PatientProfile(user_id=pt_b_user.id)
                db.add(pt_b_prof)

            db.commit()

            link_a = CaregiverPatientAssignment(
                caregiver_id=cg_a_prof.id,
                patient_id=pt_a_prof.id,
                relationship_type="Family",
                permission_level="FULL_ACCESS",
                is_active=True,
            )
            link_b = CaregiverPatientAssignment(
                caregiver_id=cg_b_prof.id,
                patient_id=pt_b_prof.id,
                relationship_type="Nurse",
                permission_level="FULL_ACCESS",
                is_active=True,
            )
            db.add_all([link_a, link_b])
            db.commit()

            # Create notifications for Patient A
            notif_a1 = create_notification(
                db=db,
                patient_id=pt_a_prof.id,
                notification_type="MEDICATION_DUE",
                title="Medication Due",
                message="Your Aspirin dose is due now.",
            )
            notif_a2 = create_notification(
                db=db,
                patient_id=pt_a_prof.id,
                notification_type="MISSED_DOSE",
                title="Missed Dose",
                message="You missed your scheduled dose for Metformin.",
            )
            notif_a3 = create_notification(
                db=db,
                patient_id=pt_a_prof.id,
                notification_type="MEDICATION_UPCOMING",
                title="Upcoming Medication",
                message="You have an upcoming dose for Lisinopril.",
            )

            # Create notification for Patient B
            notif_b1 = create_notification(
                db=db,
                patient_id=pt_b_prof.id,
                notification_type="MEDICATION_DUE",
                title="Medication Due",
                message="Your Lipitor dose is due now.",
            )

            notif_a1_id = str(notif_a1.id)
            notif_a2_id = str(notif_a2.id)
            notif_b1_id = str(notif_b1.id)
            pt_a_id = str(pt_a_prof.id)
        finally:
            db.close()

        print("PASS 2/8: Caregiver links and test notifications established")

        # 3. Caregiver A lists notifications
        r_list_a = client.get("/api/caregivers/me/notifications", headers=cg_a_headers)
        assert r_list_a.status_code == 200, f"Expected 200, got: {r_list_a.text}"
        data_a = r_list_a.json()
        assert data_a["total_count"] == 3
        assert data_a["unread_count"] == 3
        assert len(data_a["items"]) == 3

        # Verify patient details attached
        item0 = data_a["items"][0]
        assert item0["patient_id"] == pt_a_id
        assert "Charlie Patient" in item0["patient_name"]
        print("PASS 3/8: Caregiver A received all 3 notifications with patient info")

        # 4. Caregiver A unread count endpoint
        r_unread_a = client.get("/api/caregivers/me/notifications/unread-count", headers=cg_a_headers)
        assert r_unread_a.status_code == 200
        assert r_unread_a.json()["unread_count"] == 3
        print("PASS 4/8: Caregiver A unread-count endpoint returns 3")

        # 5. Caregiver A marks single notification as read
        r_mark_one = client.patch(f"/api/caregivers/me/notifications/{notif_a1_id}/read", headers=cg_a_headers)
        assert r_mark_one.status_code == 200
        assert r_mark_one.json()["is_read"] is True

        # Verify unread count is now 2
        r_unread_after = client.get("/api/caregivers/me/notifications/unread-count", headers=cg_a_headers)
        assert r_unread_after.json()["unread_count"] == 2
        print("PASS 5/8: Caregiver A marked single alert read and unread count reduced to 2")

        # 6. Caregiver A marks all as read
        r_mark_all = client.patch("/api/caregivers/me/notifications/read-all", headers=cg_a_headers)
        assert r_mark_all.status_code == 200
        assert r_mark_all.json()["unread_count"] == 0

        # Verify list shows 0 unread
        r_list_all_read = client.get("/api/caregivers/me/notifications", headers=cg_a_headers)
        assert r_list_all_read.json()["unread_count"] == 0
        print("PASS 6/8: Caregiver A marked all alerts read")

        # 7. Security Isolation:
        # Caregiver A cannot view or mark Patient B's notification
        r_illegal_read = client.patch(f"/api/caregivers/me/notifications/{notif_b1_id}/read", headers=cg_a_headers)
        assert r_illegal_read.status_code == 404, f"Expected 404 for unlinked patient notification, got: {r_illegal_read.status_code}"

        # Caregiver B only sees Patient B's 1 notification
        r_list_b = client.get("/api/caregivers/me/notifications", headers=cg_b_headers)
        assert r_list_b.status_code == 200
        data_b = r_list_b.json()
        assert data_b["total_count"] == 1
        assert data_b["items"][0]["id"] == notif_b1_id
        print("PASS 7/8: Strict caregiver isolation enforced (Caregiver A cannot read/access Patient B's notifications)")

        # 8. Patient role isolation
        r_patient_forbidden = client.get("/api/caregivers/me/notifications", headers=pt_a_headers)
        assert r_patient_forbidden.status_code == 403, f"Expected 403 Forbidden for patient, got: {r_patient_forbidden.status_code}"

        # Existing patient notification endpoint still works
        r_pt_own_notifs = client.get("/api/patients/me/notifications", headers=pt_a_headers)
        assert r_pt_own_notifs.status_code == 200
        print("PASS 8/8: Role boundary verified (Patients cannot access caregiver notifications; Patient notification API remains functional)")

    print("==================================================")
    print("ALL FEATURE 15D TESTS PASSED SUCCESSFULLY (8/8)!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
