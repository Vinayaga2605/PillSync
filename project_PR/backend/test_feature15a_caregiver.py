import os
import uuid
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from main import app
from app.core.database import SessionLocal
from app.models.user import User, PatientProfile, CaregiverProfile, CaregiverPatientAssignment
from app.models.caregiver import CaregiverPatientLink
from app.models.medicine import Medicine, PatientMedication
from app.models.schedule import MedicationSchedule, MedicationScheduleTime, MedicationDoseEvent
from app.schemas.schedule import ScheduleFrequencyType, TimeOfDayType
from app.schemas.dose import DoseStatusEnum
from app.services.reminder_service import get_app_timezone


def run_tests():
    print("==================================================")
    print("RUNNING PILLSYNC FEATURE 15A: CAREGIVER BACKEND TESTS")
    print("==================================================")

    tz = get_app_timezone()
    today = date.today()

    with TestClient(app) as client:
        # 0. Health checks
        assert client.get("/api/health").status_code == 200
        assert client.get("/api/health/db").status_code == 200
        print("PASS: Health checks verified (200 OK)")

        # 1. Register Caregivers & Patients
        rand = uuid.uuid4().hex[:6]
        cg_a_email = f"cg_a_{rand}@example.com"
        cg_b_email = f"cg_b_{rand}@example.com"
        pt_a_email = f"pt_a_{rand}@example.com"
        pt_b_email = f"pt_b_{rand}@example.com"
        pwd = "Password123!"

        # Register Caregiver A
        r_cg_a = client.post("/api/auth/register", json={
            "first_name": "Alice",
            "last_name": "Caregiver",
            "email": cg_a_email,
            "password": pwd,
            "role": "CAREGIVER"
        })
        assert r_cg_a.status_code == 201, f"Failed to register CG A: {r_cg_a.text}"

        # Register Caregiver B
        r_cg_b = client.post("/api/auth/register", json={
            "first_name": "Bob",
            "last_name": "Caregiver",
            "email": cg_b_email,
            "password": pwd,
            "role": "CAREGIVER"
        })
        assert r_cg_b.status_code == 201, f"Failed to register CG B: {r_cg_b.text}"

        # Register Patient A
        r_pt_a = client.post("/api/auth/register", json={
            "first_name": "Charlie",
            "last_name": "Patient",
            "email": pt_a_email,
            "password": pwd,
            "role": "PATIENT"
        })
        assert r_pt_a.status_code == 201, f"Failed to register PT A: {r_pt_a.text}"

        # Register Patient B
        r_pt_b = client.post("/api/auth/register", json={
            "first_name": "Diana",
            "last_name": "Patient",
            "email": pt_b_email,
            "password": pwd,
            "role": "PATIENT"
        })
        assert r_pt_b.status_code == 201, f"Failed to register PT B: {r_pt_b.text}"

        # Logins
        cg_a_tok = client.post("/api/auth/login", json={"email": cg_a_email, "password": pwd}).json()["access_token"]
        cg_b_tok = client.post("/api/auth/login", json={"email": cg_b_email, "password": pwd}).json()["access_token"]
        pt_a_tok = client.post("/api/auth/login", json={"email": pt_a_email, "password": pwd}).json()["access_token"]
        pt_b_tok = client.post("/api/auth/login", json={"email": pt_b_email, "password": pwd}).json()["access_token"]

        cg_a_headers = {"Authorization": f"Bearer {cg_a_tok}"}
        cg_b_headers = {"Authorization": f"Bearer {cg_b_tok}"}
        pt_a_headers = {"Authorization": f"Bearer {pt_a_tok}"}
        pt_b_headers = {"Authorization": f"Bearer {pt_b_tok}"}

        print("PASS 1/24: Caregiver registration and login successful")

        # Database setups: find Caregiver Profiles & Patient Profiles
        db = SessionLocal()
        try:
            cg_a_user = db.execute(select(User).where(User.email == cg_a_email)).scalar_one()
            cg_b_user = db.execute(select(User).where(User.email == cg_b_email)).scalar_one()
            pt_a_user = db.execute(select(User).where(User.email == pt_a_email)).scalar_one()
            pt_b_user = db.execute(select(User).where(User.email == pt_b_email)).scalar_one()

            cg_a_prof = cg_a_user.caregiver_profile
            cg_b_prof = cg_b_user.caregiver_profile
            pt_a_prof = pt_a_user.patient_profile
            pt_b_prof = pt_b_user.patient_profile

            assert cg_a_prof is not None, "Caregiver A profile missing"
            assert cg_b_prof is not None, "Caregiver B profile missing"
            assert pt_a_prof is not None, "Patient A profile missing"
            assert pt_b_prof is not None, "Patient B profile missing"

            # 2. Link Caregiver A -> Patient A
            link_a = CaregiverPatientAssignment(
                caregiver_id=cg_a_prof.id,
                patient_id=pt_a_prof.id,
                relationship_type="DAUGHTER",
                permission_level="FULL_ACCESS",
                is_active=True,
            )
            db.add(link_a)

            # Link Caregiver B -> Patient B
            link_b = CaregiverPatientLink(  # Testing the alias
                caregiver_id=cg_b_prof.id,
                patient_id=pt_b_prof.id,
                relationship_type="SON",
                permission_level="FULL_ACCESS",
                is_active=True,
            )
            db.add(link_b)
            db.commit()
            print("PASS 2/24: Caregiver-patient links created successfully (using both Assignment and Link alias)")

            # 3. Duplicate Caregiver-Patient Link prevention
            duplicate_link = CaregiverPatientAssignment(
                caregiver_id=cg_a_prof.id,
                patient_id=pt_a_prof.id,
                relationship_type="OTHER",
            )
            db.add(duplicate_link)
            try:
                db.commit()
                assert False, "Should have failed unique constraint"
            except IntegrityError:
                db.rollback()
                print("PASS 3/24: Duplicate caregiver-patient link prevented by unique constraint")

            # Add sample medicine, schedule, doses for Patient A
            med_a = PatientMedication(
                patient_id=pt_a_prof.id,
                custom_medicine_name="Amoxicillin 500mg",
                dosage_amount=Decimal("500.00"),
                dosage_unit="mg",
                instructions="Take with water after food",
                start_date=today - timedelta(days=5),
                end_date=today + timedelta(days=10),
                is_active=True,
            )
            db.add(med_a)
            db.flush()

            sched_a = MedicationSchedule(
                patient_medication_id=med_a.id,
                frequency_type=ScheduleFrequencyType.DAILY.value,
                dose_quantity=Decimal("1.00"),
                dosage_unit="capsule",
                start_date=today - timedelta(days=5),
                end_date=today + timedelta(days=10),
                instructions="After meals",
                is_active=True,
            )
            db.add(sched_a)
            db.flush()

            time_a1 = MedicationScheduleTime(
                schedule_id=sched_a.id,
                scheduled_time=time(8, 0),
                time_of_day_type=TimeOfDayType.MORNING.value,
                dose_quantity=Decimal("1.00"),
            )
            time_a2 = MedicationScheduleTime(
                schedule_id=sched_a.id,
                scheduled_time=time(20, 0),
                time_of_day_type=TimeOfDayType.NIGHT.value,
                dose_quantity=Decimal("1.00"),
            )
            db.add_all([time_a1, time_a2])
            db.flush()

            # Add recorded doses for today
            dose_today_taken = MedicationDoseEvent(
                patient_id=pt_a_prof.id,
                patient_medication_id=med_a.id,
                schedule_id=sched_a.id,
                scheduled_timestamp=datetime.combine(today, time(8, 0)).replace(tzinfo=tz),
                status=DoseStatusEnum.TAKEN.value,
                actual_taken_timestamp=datetime.combine(today, time(8, 15)).replace(tzinfo=tz),
                dose_quantity_taken=Decimal("1.00"),
            )
            db.add(dose_today_taken)
            db.commit()

            pt_a_id_str = str(pt_a_prof.id)
            pt_b_id_str = str(pt_b_prof.id)
        finally:
            db.close()

        # 4. Caregiver A can list linked patients
        res = client.get("/api/caregivers/me/patients", headers=cg_a_headers)
        assert res.status_code == 200, f"Error: {res.text}"
        data = res.json()
        assert len(data) == 1
        assert data[0]["id"] == pt_a_id_str
        assert data[0]["first_name"] == "Charlie"
        assert data[0]["relationship_type"] == "DAUGHTER"
        print("PASS 4/24: Caregiver A lists linked Patient A")

        # 5. Unlinked Patient B is not returned in Caregiver A's patient list
        linked_ids_a = [p["id"] for p in data]
        assert pt_b_id_str not in linked_ids_a
        print("PASS 5/24: Unlinked Patient B is not in Caregiver A's list")

        # 6. Caregiver A can retrieve linked Patient A details
        res = client.get(f"/api/caregivers/me/patients/{pt_a_id_str}", headers=cg_a_headers)
        assert res.status_code == 200
        p_detail = res.json()
        assert p_detail["id"] == pt_a_id_str
        assert p_detail["first_name"] == "Charlie"
        assert p_detail["relationship_type"] == "DAUGHTER"
        print("PASS 6/24: Caregiver A retrieves linked Patient A details")

        # 7. Caregiver A cannot retrieve unlinked Patient B (404 Not Found)
        res = client.get(f"/api/caregivers/me/patients/{pt_b_id_str}", headers=cg_a_headers)
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"
        # Also test non-existent UUID
        fake_id = str(uuid.uuid4())
        res_fake = client.get(f"/api/caregivers/me/patients/{fake_id}", headers=cg_a_headers)
        assert res_fake.status_code == 404
        print("PASS 7/24: Caregiver A cannot retrieve unlinked Patient B or arbitrary ID (returns 404)")

        # 8. Caregiver A can view linked Patient A medications
        res = client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/medications", headers=cg_a_headers)
        assert res.status_code == 200
        meds = res.json()
        assert len(meds) >= 1
        assert meds[0]["name"] == "Amoxicillin 500mg"
        print("PASS 8/24: Caregiver A views linked Patient A medications")

        # 9. Caregiver A can view linked Patient A schedules
        res = client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/schedules", headers=cg_a_headers)
        assert res.status_code == 200
        scheds = res.json()
        assert len(scheds) >= 1
        assert len(scheds[0]["times"]) == 2
        print("PASS 9/24: Caregiver A views linked Patient A schedules")

        # 10. Caregiver A can view linked Patient A due reminders
        # Test with reference_time at 21:00 today (so 08:00 and 20:00 doses are due)
        ref_evening = datetime.combine(today, time(21, 0)).isoformat()
        res = client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/reminders/due?reference_time={ref_evening}", headers=cg_a_headers)
        assert res.status_code == 200
        due_doses = res.json()
        assert len(due_doses) >= 1
        print("PASS 10/24: Caregiver A views linked Patient A due reminders")

        # 11. Caregiver A can view linked Patient A upcoming reminders
        ref_morning = datetime.combine(today, time(6, 0)).isoformat()
        res = client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/reminders/upcoming?reference_time={ref_morning}&hours_ahead=24", headers=cg_a_headers)
        assert res.status_code == 200
        upcoming = res.json()
        assert len(upcoming) >= 1
        print("PASS 11/24: Caregiver A views linked Patient A upcoming reminders")

        # 12. Caregiver A can view linked Patient A dose history
        res = client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/doses?target_date={today.isoformat()}", headers=cg_a_headers)
        assert res.status_code == 200
        doses = res.json()
        assert len(doses) >= 1
        assert doses[0]["status"] == "TAKEN"
        print("PASS 12/24: Caregiver A views linked Patient A dose history")

        # 13. Caregiver A can view linked Patient A adherence (today, week, month, range)
        res_today = client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/adherence/today", headers=cg_a_headers)
        assert res_today.status_code == 200
        assert res_today.json()["taken_doses"] >= 1

        res_week = client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/adherence/week", headers=cg_a_headers)
        assert res_week.status_code == 200

        res_month = client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/adherence/month", headers=cg_a_headers)
        assert res_month.status_code == 200

        res_range = client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/adherence?start_date={today.isoformat()}&end_date={today.isoformat()}", headers=cg_a_headers)
        assert res_range.status_code == 200
        print("PASS 13/24: Caregiver A views linked Patient A adherence (today, week, month, custom range)")

        # 14. Caregiver Dashboard Summary
        res_dash = client.get("/api/caregivers/me/dashboard/summary", headers=cg_a_headers)
        assert res_dash.status_code == 200
        dash = res_dash.json()
        assert dash["total_patients"] == 1
        assert dash["taken_doses_today"] >= 1
        print("PASS 14/24: Caregiver A dashboard summary returns accurate aggregate metrics")

        # 15. Patient cannot access caregiver routes (403 Forbidden)
        res = client.get("/api/caregivers/me/patients", headers=pt_a_headers)
        assert res.status_code == 403, f"Expected 403, got {res.status_code}"
        res = client.get("/api/caregivers/me/dashboard/summary", headers=pt_a_headers)
        assert res.status_code == 403
        print("PASS 15/24: Patient role receives 403 Forbidden on caregiver routes")

        # 16. Unauthenticated request returns 401 Unauthorized
        res = client.get("/api/caregivers/me/patients")
        assert res.status_code == 401
        res = client.get("/api/caregivers/me/dashboard/summary")
        assert res.status_code == 401
        print("PASS 16/24: Unauthenticated request receives 401 Unauthorized")

        # 17. Cross-caregiver data isolation
        # Caregiver B can see Patient B, but not Patient A
        res = client.get("/api/caregivers/me/patients", headers=cg_b_headers)
        assert res.status_code == 200
        cg_b_pts = [p["id"] for p in res.json()]
        assert pt_b_id_str in cg_b_pts
        assert pt_a_id_str not in cg_b_pts

        # Caregiver B attempting to access Patient A details or sub-resources gets 404
        assert client.get(f"/api/caregivers/me/patients/{pt_a_id_str}", headers=cg_b_headers).status_code == 404
        assert client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/medications", headers=cg_b_headers).status_code == 404
        assert client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/schedules", headers=cg_b_headers).status_code == 404
        assert client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/reminders/due", headers=cg_b_headers).status_code == 404
        assert client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/reminders/upcoming", headers=cg_b_headers).status_code == 404
        assert client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/doses", headers=cg_b_headers).status_code == 404
        assert client.get(f"/api/caregivers/me/patients/{pt_a_id_str}/adherence/today", headers=cg_b_headers).status_code == 404
        print("PASS 17/24: Cross-caregiver isolation verified (Caregiver B cannot access Patient A resources)")

        # 18. Caregiver cannot modify medication data (no write routes on caregiver portal)
        res = client.post(f"/api/caregivers/me/patients/{pt_a_id_str}/medications", headers=cg_a_headers, json={"name": "Test"})
        assert res.status_code in [404, 405], f"Expected 404/405, got {res.status_code}"
        print("PASS 18/24: Caregiver cannot modify medication data (read-only endpoints)")

        # 19. Caregiver cannot mark doses taken via patient dose API (requires PATIENT role)
        fake_dose_id = str(uuid.uuid4())
        res = client.patch(f"/api/patients/me/doses/{fake_dose_id}/taken", headers=cg_a_headers, json={})
        assert res.status_code == 403, f"Expected 403, got {res.status_code}"
        print("PASS 19/24: Caregiver cannot mark doses taken on patient dose API (403 Forbidden)")

        # 20. Caregiver cannot mark doses skipped via patient dose API (requires PATIENT role)
        res = client.patch(f"/api/patients/me/doses/{fake_dose_id}/skipped", headers=cg_a_headers, json={})
        assert res.status_code == 403, f"Expected 403, got {res.status_code}"
        print("PASS 20/24: Caregiver cannot mark doses skipped on patient dose API (403 Forbidden)")

        # 21. Existing Patient APIs remain functional
        res = client.get("/api/patients/me/profile", headers=pt_a_headers)
        assert res.status_code == 200
        assert res.json()["first_name"] == "Charlie"
        res = client.get("/api/patients/me/medicines", headers=pt_a_headers)
        assert res.status_code == 200
        print("PASS 21/24: Existing Patient APIs remain fully functional")

        # 22. Existing Notification APIs remain functional
        res = client.get("/api/patients/me/notifications/unread-count", headers=pt_a_headers)
        assert res.status_code == 200
        print("PASS 22/24: Existing Notification APIs remain fully functional")

        # 23. Existing Reminder APIs remain functional
        res = client.get("/api/patients/me/reminders/due", headers=pt_a_headers)
        assert res.status_code == 200
        print("PASS 23/24: Existing Reminder APIs remain fully functional")

        # 24. Existing Adherence APIs remain functional
        res = client.get("/api/patients/me/adherence/today", headers=pt_a_headers)
        assert res.status_code == 200
        print("PASS 24/24: Existing Adherence APIs remain fully functional")

    print("==================================================")
    print("ALL 24 FEATURE 15A TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
