import os
import uuid
from datetime import datetime, date, timezone
from fastapi.testclient import TestClient
from sqlalchemy import select

from main import app
from app.core.database import SessionLocal
from app.models.user import User, PatientProfile, CaregiverProfile, CaregiverPatientAssignment
from app.models.medicine import Medicine, PatientMedication
from app.models.schedule import MedicationSchedule, MedicationScheduleTime, MedicationDoseEvent
from app.models.notification import Notification
from app.schemas.schedule import ScheduleFrequencyType, TimeOfDayType
from app.services.notification_service import create_notification


def run_tests():
    print("==================================================")
    print("RUNNING PILLSYNC FEATURE 16A: ADMIN BACKEND TESTS")
    print("==================================================")

    with TestClient(app) as client:
        # 0. Health checks
        assert client.get("/api/health").status_code == 200
        print("PASS: Health check verified (200 OK)")

        # 1. Setup Users: Admin, Caregiver, Patient
        rand = uuid.uuid4().hex[:6]
        admin_email = f"admin_16a_{rand}@example.com"
        cg_email = f"cg_16a_{rand}@example.com"
        pt_email = f"pt_16a_{rand}@example.com"
        pwd = "Password123!"

        # Register Admin
        r_admin = client.post("/api/auth/register", json={
            "first_name": "Super",
            "last_name": "Admin",
            "email": admin_email,
            "password": pwd,
            "role": "ADMIN"
        })
        assert r_admin.status_code == 201, f"Failed to register Admin: {r_admin.text}"

        # Register Caregiver
        r_cg = client.post("/api/auth/register", json={
            "first_name": "Gwen",
            "last_name": "Caregiver",
            "email": cg_email,
            "password": pwd,
            "role": "CAREGIVER"
        })
        assert r_cg.status_code == 201

        # Register Patient
        r_pt = client.post("/api/auth/register", json={
            "first_name": "Peter",
            "last_name": "Parker",
            "email": pt_email,
            "password": pwd,
            "role": "PATIENT"
        })
        assert r_pt.status_code == 201

        # Logins
        admin_tok = client.post("/api/auth/login", json={"email": admin_email, "password": pwd}).json()["access_token"]
        cg_tok = client.post("/api/auth/login", json={"email": cg_email, "password": pwd}).json()["access_token"]
        pt_tok = client.post("/api/auth/login", json={"email": pt_email, "password": pwd}).json()["access_token"]

        admin_headers = {"Authorization": f"Bearer {admin_tok}"}
        cg_headers = {"Authorization": f"Bearer {cg_tok}"}
        pt_headers = {"Authorization": f"Bearer {pt_tok}"}

        print("PASS 1/15: Admin, Caregiver, Patient registered and authenticated")

        # 2. Database records setup: link caregiver to patient, add medication & schedule
        db = SessionLocal()
        try:
            admin_user = db.execute(select(User).where(User.email == admin_email)).scalar_one()
            cg_user = db.execute(select(User).where(User.email == cg_email)).scalar_one()
            pt_user = db.execute(select(User).where(User.email == pt_email)).scalar_one()

            cg_prof = db.execute(select(CaregiverProfile).where(CaregiverProfile.user_id == cg_user.id)).scalar_one()
            pt_prof = db.execute(select(PatientProfile).where(PatientProfile.user_id == pt_user.id)).scalar_one()

            # Set organization on caregiver
            cg_prof.organization = "Community Health"
            # Set medical condition on patient
            pt_prof.medical_conditions = "Hypertension"
            db.commit()

            link = CaregiverPatientAssignment(
                caregiver_id=cg_prof.id,
                patient_id=pt_prof.id,
                relationship_type="Guardian",
                permission_level="FULL_ACCESS",
                is_active=True,
            )
            db.add(link)
            db.commit()

            # Add medicine & patient medication
            med = Medicine(
                name=f"AdminMed_{rand}",
                category="Cardiovascular",
                standard_strength="10mg",
            )
            db.add(med)
            db.commit()

            pmed = PatientMedication(
                patient_id=pt_prof.id,
                medicine_id=med.id,
                dosage_amount=10.0,
                dosage_unit="mg",
                start_date=date.today(),
                is_active=True,
            )
            db.add(pmed)
            db.commit()

            # Add schedule
            sched = MedicationSchedule(
                patient_medication_id=pmed.id,
                frequency_type="DAILY",
                dose_quantity=1.0,
                dosage_unit="mg",
                start_date=date.today(),
                is_active=True,
            )
            db.add(sched)
            db.commit()

            # Add notification
            notif = create_notification(
                db=db,
                patient_id=pt_prof.id,
                notification_type="SYSTEM",
                title="System Test Alert",
                message="Welcome to PillSync Admin Monitoring.",
            )

            admin_user_id = str(admin_user.id)
            cg_prof_id = str(cg_prof.id)
            pt_prof_id = str(pt_prof.id)
            link_id = str(link.id)
        finally:
            db.close()

        print("PASS 2/15: Test data created in DB")

        # 3. GET /api/admin/dashboard/summary
        r_sum = client.get("/api/admin/dashboard/summary", headers=admin_headers)
        assert r_sum.status_code == 200, f"Dashboard summary failed: {r_sum.text}"
        sum_data = r_sum.json()
        assert sum_data["total_users"] >= 3
        assert sum_data["total_patients"] >= 1
        assert sum_data["total_caregivers"] >= 1
        assert sum_data["total_admins"] >= 1
        assert sum_data["total_active_medications"] >= 1
        assert sum_data["total_active_schedules"] >= 1
        assert sum_data["active_caregiver_patient_links"] >= 1
        print("PASS 3/15: GET /api/admin/dashboard/summary returned valid aggregate metrics")

        # 4. GET /api/admin/users
        r_users = client.get("/api/admin/users", headers=admin_headers)
        assert r_users.status_code == 200
        u_data = r_users.json()
        assert u_data["total_count"] >= 3
        assert len(u_data["items"]) >= 3

        # Verify no password hash or secrets
        for u in u_data["items"]:
            assert "password" not in u
            assert "password_hash" not in u
            assert "token" not in u

        # Test filtering by role
        r_pt_users = client.get("/api/admin/users?role=PATIENT", headers=admin_headers)
        assert r_pt_users.status_code == 200
        assert all(item["role"] == "PATIENT" for item in r_pt_users.json()["items"])

        # Test search
        r_search_user = client.get(f"/api/admin/users?search={admin_email}", headers=admin_headers)
        assert r_search_user.status_code == 200
        assert len(r_search_user.json()["items"]) == 1
        assert r_search_user.json()["items"][0]["email"] == admin_email
        print("PASS 4/15: GET /api/admin/users returned safe directory with filters and search")

        # 5. GET /api/admin/users/{user_id}
        r_user_det = client.get(f"/api/admin/users/{admin_user_id}", headers=admin_headers)
        assert r_user_det.status_code == 200
        det_data = r_user_det.json()
        assert det_data["id"] == admin_user_id
        assert det_data["email"] == admin_email
        assert "password_hash" not in det_data
        print("PASS 5/15: GET /api/admin/users/{user_id} returned safe user details")

        # 6. GET /api/admin/patients
        r_pts = client.get("/api/admin/patients", headers=admin_headers)
        assert r_pts.status_code == 200
        pts_data = r_pts.json()
        assert pts_data["total_count"] >= 1
        matched_pt = next((p for p in pts_data["items"] if p["id"] == pt_prof_id), None)
        assert matched_pt is not None
        assert matched_pt["first_name"] == "Peter"
        assert matched_pt["linked_caregivers_count"] >= 1
        assert matched_pt["active_medications_count"] >= 1

        # Search patient
        r_search_pt = client.get("/api/admin/patients?search=Parker", headers=admin_headers)
        assert r_search_pt.status_code == 200
        assert any(p["id"] == pt_prof_id for p in r_search_pt.json()["items"])
        print("PASS 6/15: GET /api/admin/patients returned safe patient profiles with metrics")

        # 7. GET /api/admin/patients/{patient_id}
        r_pt_det = client.get(f"/api/admin/patients/{pt_prof_id}", headers=admin_headers)
        assert r_pt_det.status_code == 200
        pt_det_data = r_pt_det.json()
        assert pt_det_data["id"] == pt_prof_id
        assert pt_det_data["medical_conditions"] == "Hypertension"
        assert pt_det_data["linked_caregivers_count"] >= 1
        print("PASS 7/15: GET /api/admin/patients/{patient_id} returned detailed patient info")

        # 8. GET /api/admin/caregivers
        r_cgs = client.get("/api/admin/caregivers", headers=admin_headers)
        assert r_cgs.status_code == 200
        cgs_data = r_cgs.json()
        assert cgs_data["total_count"] >= 1
        matched_cg = next((c for c in cgs_data["items"] if c["id"] == cg_prof_id), None)
        assert matched_cg is not None
        assert matched_cg["organization"] == "Community Health"
        assert matched_cg["linked_patients_count"] >= 1

        # Search caregiver
        r_search_cg = client.get("/api/admin/caregivers?search=Community", headers=admin_headers)
        assert r_search_cg.status_code == 200
        assert any(c["id"] == cg_prof_id for c in r_search_cg.json()["items"])
        print("PASS 8/15: GET /api/admin/caregivers returned safe caregiver profiles")

        # 9. GET /api/admin/caregivers/{caregiver_id}
        r_cg_det = client.get(f"/api/admin/caregivers/{cg_prof_id}", headers=admin_headers)
        assert r_cg_det.status_code == 200
        cg_det_data = r_cg_det.json()
        assert cg_det_data["id"] == cg_prof_id
        assert cg_det_data["organization"] == "Community Health"
        assert cg_det_data["linked_patients_count"] >= 1
        print("PASS 9/15: GET /api/admin/caregivers/{caregiver_id} returned detailed caregiver info")

        # 10. GET /api/admin/relationships
        r_rel = client.get("/api/admin/relationships", headers=admin_headers)
        assert r_rel.status_code == 200
        rel_data = r_rel.json()
        assert rel_data["total_count"] >= 1
        matched_rel = next((rel for rel in rel_data["items"] if rel["id"] == link_id), None)
        assert matched_rel is not None
        assert matched_rel["relationship_type"] == "Guardian"
        assert matched_rel["permission_level"] == "FULL_ACCESS"
        assert "Gwen Caregiver" in matched_rel["caregiver_name"]
        assert "Peter Parker" in matched_rel["patient_name"]

        # Filter by caregiver_id
        r_rel_cg = client.get(f"/api/admin/relationships?caregiver_id={cg_prof_id}", headers=admin_headers)
        assert r_rel_cg.status_code == 200
        assert all(rel["caregiver_id"] == cg_prof_id for rel in r_rel_cg.json()["items"])
        print("PASS 10/15: GET /api/admin/relationships returned correct links and filters")

        # 11. Security Role Boundary: Patient gets 403 Forbidden
        assert client.get("/api/admin/dashboard/summary", headers=pt_headers).status_code == 403
        assert client.get("/api/admin/users", headers=pt_headers).status_code == 403
        assert client.get("/api/admin/patients", headers=pt_headers).status_code == 403
        assert client.get("/api/admin/caregivers", headers=pt_headers).status_code == 403
        assert client.get("/api/admin/relationships", headers=pt_headers).status_code == 403
        print("PASS 11/15: Patient role strictly forbidden (403) from all admin routes")

        # 12. Security Role Boundary: Caregiver gets 403 Forbidden
        assert client.get("/api/admin/dashboard/summary", headers=cg_headers).status_code == 403
        assert client.get("/api/admin/users", headers=cg_headers).status_code == 403
        assert client.get("/api/admin/patients", headers=cg_headers).status_code == 403
        assert client.get("/api/admin/caregivers", headers=cg_headers).status_code == 403
        assert client.get("/api/admin/relationships", headers=cg_headers).status_code == 403
        print("PASS 12/15: Caregiver role strictly forbidden (403) from all admin routes")

        # 13. Security: Unauthenticated gets 401 Unauthorized
        assert client.get("/api/admin/dashboard/summary").status_code == 401
        assert client.get("/api/admin/users").status_code == 401
        assert client.get("/api/admin/patients").status_code == 401
        assert client.get("/api/admin/caregivers").status_code == 401
        assert client.get("/api/admin/relationships").status_code == 401
        print("PASS 13/15: Unauthenticated access strictly returns 401 Unauthorized")

        # 14. Non-existent IDs return 404
        fake_uuid = str(uuid.uuid4())
        assert client.get(f"/api/admin/users/{fake_uuid}", headers=admin_headers).status_code == 404
        assert client.get(f"/api/admin/patients/{fake_uuid}", headers=admin_headers).status_code == 404
        assert client.get(f"/api/admin/caregivers/{fake_uuid}", headers=admin_headers).status_code == 404
        print("PASS 14/15: Non-existent IDs return 404 Not Found")

        # 15. Regression check: Existing patient, caregiver, notification APIs remain functional
        assert client.get("/api/caregivers/me/patients", headers=cg_headers).status_code == 200
        assert client.get("/api/patients/me/profile", headers=pt_headers).status_code == 200
        assert client.get("/api/patients/me/notifications", headers=pt_headers).status_code == 200
        assert client.get("/api/caregivers/me/notifications", headers=cg_headers).status_code == 200
        print("PASS 15/15: Regression verified: Patient, Caregiver, and Notification APIs fully functional")

    print("==================================================")
    print("ALL FEATURE 16A TESTS PASSED SUCCESSFULLY (15/15)!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
