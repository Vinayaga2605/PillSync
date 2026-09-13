import uuid
from decimal import Decimal
from datetime import datetime, date, time, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select

from main import app
from app.core.database import Base, engine, SessionLocal, get_db
from app.models.user import User, PatientProfile, CaregiverProfile, CaregiverPatientAssignment
from app.models.medicine import PatientMedication
from app.models.schedule import MedicationDoseEvent
from app.schemas.user import UserRole


client = TestClient(app)

FORBIDDEN_WORDS = [
    "increase your dosage",
    "reduce your dosage",
    "stop taking",
    "start taking",
    "take two tablets",
    "change your prescription",
    "high medical risk",
    "emergency treatment",
    "seizure",
    "medical diagnosis",
]


def run_all_tests():
    print("\n==================================================")
    print("RUNNING PILLSYNC FEATURE 17F: CAREGIVER INTELLIGENCE TESTS")
    print("==================================================")

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("PASS 1/26: Health check verified (200 OK)")

    # 2. Setup Test Users
    suffix = str(uuid.uuid4())[:8]
    pt_alice_email = f"alice_cg_intel_{suffix}@test.com"
    pt_bob_email = f"bob_cg_intel_{suffix}@test.com"
    cg_charlie_email = f"charlie_cg_intel_{suffix}@test.com"
    cg_david_email = f"david_cg_intel_{suffix}@test.com"
    adm_diana_email = f"diana_cg_intel_{suffix}@test.com"
    pwd = "Password123!"

    for email, role, fname in [
        (pt_alice_email, "PATIENT", "Alice"),
        (pt_bob_email, "PATIENT", "Bob"),
        (cg_charlie_email, "CAREGIVER", "Charlie"),
        (cg_david_email, "CAREGIVER", "David"),
        (adm_diana_email, "ADMIN", "Diana"),
    ]:
        r = client.post("/api/auth/register", json={
            "first_name": fname,
            "last_name": "IntelTest",
            "email": email,
            "password": pwd,
            "role": role,
        })
        assert r.status_code == 201, f"Failed to register {role}: {r.text}"

    alice_token = client.post("/api/auth/login", json={"email": pt_alice_email, "password": pwd}).json()["access_token"]
    alice_auth = {"Authorization": f"Bearer {alice_token}"}

    bob_token = client.post("/api/auth/login", json={"email": pt_bob_email, "password": pwd}).json()["access_token"]
    bob_auth = {"Authorization": f"Bearer {bob_token}"}

    charlie_token = client.post("/api/auth/login", json={"email": cg_charlie_email, "password": pwd}).json()["access_token"]
    charlie_auth = {"Authorization": f"Bearer {charlie_token}"}

    david_token = client.post("/api/auth/login", json={"email": cg_david_email, "password": pwd}).json()["access_token"]
    david_auth = {"Authorization": f"Bearer {david_token}"}

    diana_token = client.post("/api/auth/login", json={"email": adm_diana_email, "password": pwd}).json()["access_token"]
    diana_auth = {"Authorization": f"Bearer {diana_token}"}

    print("PASS 2/26: Users registered and authenticated with role tokens")

    # 3. Establish Caregiver-Patient Links
    db: Session = SessionLocal()
    alice_user = db.execute(select(User).where(User.email == pt_alice_email)).scalar_one()
    alice_prof = alice_user.patient_profile or PatientProfile(user_id=alice_user.id)
    if not alice_user.patient_profile:
        db.add(alice_prof)
        db.flush()
    alice_id = alice_prof.id

    bob_user = db.execute(select(User).where(User.email == pt_bob_email)).scalar_one()
    bob_prof = bob_user.patient_profile or PatientProfile(user_id=bob_user.id)
    if not bob_user.patient_profile:
        db.add(bob_prof)
        db.flush()
    bob_id = bob_prof.id

    charlie_user = db.execute(select(User).where(User.email == cg_charlie_email)).scalar_one()
    charlie_prof = charlie_user.caregiver_profile or CaregiverProfile(user_id=charlie_user.id)
    if not charlie_user.caregiver_profile:
        db.add(charlie_prof)
        db.flush()
    charlie_id = charlie_prof.id

    david_user = db.execute(select(User).where(User.email == cg_david_email)).scalar_one()
    david_prof = david_user.caregiver_profile or CaregiverProfile(user_id=david_user.id)
    if not david_user.caregiver_profile:
        db.add(david_prof)
        db.flush()
    david_id = david_prof.id

    # Charlie -> Alice (Active link)
    link_charlie_alice = CaregiverPatientAssignment(
        caregiver_id=charlie_id,
        patient_id=alice_id,
        relationship_type="FAMILY",
        permission_level="FULL_ACCESS",
        is_active=True,
    )
    # David -> Bob (Active link)
    link_david_bob = CaregiverPatientAssignment(
        caregiver_id=david_id,
        patient_id=bob_id,
        relationship_type="PROFESSIONAL",
        permission_level="FULL_ACCESS",
        is_active=True,
    )
    db.add_all([link_charlie_alice, link_david_bob])
    db.commit()
    db.close()
    print("PASS 3/26: Caregiver links established (Charlie -> Alice, David -> Bob)")

    # 4. Caregiver Charlie can access linked Patient Alice's intelligence summary
    res = client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/summary", headers=charlie_auth)
    assert res.status_code == 200, f"Expected 200 for summary, got: {res.text}"
    alice_summary_data = res.json()
    assert "summary" in alice_summary_data
    assert "attention_score" in alice_summary_data
    assert "insights" in alice_summary_data
    assert "trend" in alice_summary_data
    print("PASS 4/26: Caregiver Charlie accessed linked Patient Alice's intelligence summary")

    # 5. Caregiver Charlie can access linked Patient Alice's intelligence history
    res = client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/history?days=30", headers=charlie_auth)
    assert res.status_code == 200, f"Expected 200 for history, got: {res.text}"
    alice_hist_data = res.json()
    assert "summary" in alice_hist_data
    assert "daily_timeline" in alice_hist_data
    assert "comparison" in alice_hist_data
    assert alice_hist_data["summary"]["selected_period_days"] == 30
    print("PASS 5/26: Caregiver Charlie accessed linked Patient Alice's intelligence history")

    # 6. Caregiver Charlie can access linked Patient Alice's intelligence suggestions
    res = client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/suggestions", headers=charlie_auth)
    assert res.status_code == 200, f"Expected 200 for suggestions, got: {res.text}"
    alice_sug_data = res.json()
    assert "suggestions" in alice_sug_data
    assert "disclaimer" in alice_sug_data
    print("PASS 6/26: Caregiver Charlie accessed linked Patient Alice's intelligence suggestions")

    # 7, 8, 9. Unauthenticated requests return 401
    assert client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/summary").status_code == 401
    assert client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/history?days=30").status_code == 401
    assert client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/suggestions").status_code == 401
    print("PASS 7,8,9/26: Unauthenticated requests strictly return 401 Unauthorized")

    # 10, 11. Role boundaries: Patient and Admin roles forbidden (403)
    assert client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/summary", headers=alice_auth).status_code == 403
    assert client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/history?days=30", headers=alice_auth).status_code == 403
    assert client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/suggestions", headers=alice_auth).status_code == 403

    assert client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/summary", headers=diana_auth).status_code == 403
    assert client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/history?days=30", headers=diana_auth).status_code == 403
    assert client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/suggestions", headers=diana_auth).status_code == 403
    print("PASS 10,11/26: Patient and Admin roles strictly forbidden (403) from caregiver intelligence routes")

    # 12. Unlinked Patient access returns 404 (Charlie requesting Bob's intelligence)
    res_unlinked_sum = client.get(f"/api/caregivers/me/patients/{bob_id}/intelligence/summary", headers=charlie_auth)
    assert res_unlinked_sum.status_code == 404, f"Expected 404 for unlinked patient summary, got {res_unlinked_sum.status_code}"
    res_unlinked_hist = client.get(f"/api/caregivers/me/patients/{bob_id}/intelligence/history", headers=charlie_auth)
    assert res_unlinked_hist.status_code == 404, f"Expected 404 for unlinked patient history, got {res_unlinked_hist.status_code}"
    res_unlinked_sug = client.get(f"/api/caregivers/me/patients/{bob_id}/intelligence/suggestions", headers=charlie_auth)
    assert res_unlinked_sug.status_code == 404, f"Expected 404 for unlinked patient suggestions, got {res_unlinked_sug.status_code}"
    print("PASS 12/26: Unlinked patient access strictly returns 404 Not Found")

    # 13, 14. Inactive relationship test
    db = SessionLocal()
    link = db.execute(
        select(CaregiverPatientAssignment).where(
            CaregiverPatientAssignment.caregiver_id == charlie_id,
            CaregiverPatientAssignment.patient_id == alice_id,
        )
    ).scalar_one()
    link.is_active = False
    db.commit()
    db.close()

    res_inactive = client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/summary", headers=charlie_auth)
    assert res_inactive.status_code == 404, f"Expected 404 for inactive link, got {res_inactive.status_code}"
    print("PASS 13/26: Deactivated relationship access strictly returns 404 Not Found")

    # Reactivate relationship
    db = SessionLocal()
    link = db.execute(
        select(CaregiverPatientAssignment).where(
            CaregiverPatientAssignment.caregiver_id == charlie_id,
            CaregiverPatientAssignment.patient_id == alice_id,
        )
    ).scalar_one()
    link.is_active = True
    db.commit()
    db.close()
    print("PASS 14/26: Relationship reactivated successfully")

    # 15. Arbitrary non-existent patient UUID returns 404
    fake_uuid = uuid.uuid4()
    assert client.get(f"/api/caregivers/me/patients/{fake_uuid}/intelligence/summary", headers=charlie_auth).status_code == 404
    assert client.get(f"/api/caregivers/me/patients/{fake_uuid}/intelligence/history", headers=charlie_auth).status_code == 404
    assert client.get(f"/api/caregivers/me/patients/{fake_uuid}/intelligence/suggestions", headers=charlie_auth).status_code == 404
    print("PASS 15/26: Arbitrary patient IDs return 404 Not Found without relationship bypass")

    # 16. Cross-caregiver isolation: David cannot access Alice (Alice is linked to Charlie)
    assert client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/summary", headers=david_auth).status_code == 404
    assert client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/history", headers=david_auth).status_code == 404
    assert client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/suggestions", headers=david_auth).status_code == 404
    print("PASS 16/26: Cross-caregiver patient isolation enforced (Caregiver David blocked from Patient Alice)")

    # 17. Seed controlled rich dose history for Patient Alice
    # Med: Lisinopril 10mg
    # Past 7d: 5 TAKEN, 2 SKIPPED (71.4% adherence)
    # Prev 7-14d: 7 TAKEN, 0 SKIPPED (100.0% adherence) -> DECLINING trend
    # 3 PENDING doses
    db = SessionLocal()
    now_utc = datetime.now(timezone.utc)

    p_med_lis = PatientMedication(
        patient_id=alice_id,
        custom_medicine_name="Lisinopril",
        dosage_amount=Decimal("10"),
        dosage_unit="mg",
        start_date=date.today() - timedelta(days=30),
        is_active=True,
    )
    db.add(p_med_lis)
    db.flush()
    lis_id = p_med_lis.id

    # Previous 7-14d doses: 7 TAKEN
    for i in range(8, 15):
        ts = (now_utc - timedelta(days=i)).replace(hour=8, minute=0, second=0)
        db.add(MedicationDoseEvent(
            patient_id=alice_id,
            patient_medication_id=lis_id,
            scheduled_timestamp=ts,
            status="TAKEN",
            actual_taken_timestamp=ts,
        ))

    # Current 7d doses: 5 TAKEN, 2 SKIPPED (Evening skips at 20:00)
    for i in range(1, 8):
        ts = (now_utc - timedelta(days=i)).replace(hour=20, minute=0, second=0)
        db.add(MedicationDoseEvent(
            patient_id=alice_id,
            patient_medication_id=lis_id,
            scheduled_timestamp=ts,
            status="SKIPPED" if i in [1, 2] else "TAKEN",
            actual_taken_timestamp=None if i in [1, 2] else ts,
        ))

    # 3 PENDING doses
    for i in range(3):
        ts = now_utc + timedelta(hours=i+1)
        db.add(MedicationDoseEvent(
            patient_id=alice_id,
            patient_medication_id=lis_id,
            scheduled_timestamp=ts,
            status="PENDING",
        ))

    db.commit()
    db.close()
    print("PASS 17/26: Seeded rich dose history for Patient Alice")

    # 18. Summary uses existing Feature 17A intelligence calculations
    res = client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/summary", headers=charlie_auth)
    assert res.status_code == 200
    sum_data = res.json()
    assert sum_data["trend"]["trend_direction"] == "DECLINING"
    assert sum_data["trend"]["current_7d_adherence"] == 71.43
    assert sum_data["trend"]["previous_7d_adherence"] == 100.0
    assert sum_data["trend"]["current_7d_taken"] == 5
    assert sum_data["trend"]["current_7d_skipped"] == 2
    assert "attention_score" in sum_data
    print("PASS 18/26: Summary uses existing 17A intelligence metrics accurately")

    # 19. History uses existing Feature 17D calculations
    for period_days in [7, 30, 90]:
        res = client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/history?days={period_days}", headers=charlie_auth)
        assert res.status_code == 200
        hist_data = res.json()
        assert hist_data["summary"]["selected_period_days"] == period_days
        assert len(hist_data["daily_timeline"]) == period_days
    print("PASS 19/26: History period calculations (7, 30, 90 days) verified accurately")

    # 20. History rejects invalid days query with 422
    assert client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/history?days=14", headers=charlie_auth).status_code == 422
    assert client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/history?days=365", headers=charlie_auth).status_code == 422
    print("PASS 20/26: Invalid historical periods cleanly rejected with 422 Unprocessable Entity")

    # 21. History distinguishes zero-dose days as null adherence
    res = client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/history?days=30", headers=charlie_auth)
    assert res.status_code == 200
    hist_pts = res.json()["daily_timeline"]
    # Day 25 ago has 0 completed doses -> adherence should be None/null
    zero_dose_pt = next((pt for pt in hist_pts if pt["completed_count"] == 0), None)
    assert zero_dose_pt is not None
    assert zero_dose_pt["adherence_percentage"] is None, "Days with 0 completed doses must return null adherence"
    print("PASS 21/26: Daily timeline correctly represents zero-dose days as null adherence")

    # 22. Suggestions use existing Feature 17E deterministic rules
    res = client.get(f"/api/caregivers/me/patients/{alice_id}/intelligence/suggestions", headers=charlie_auth)
    assert res.status_code == 200
    sugs = res.json()["suggestions"]
    assert len(sugs) > 0
    for s in sugs:
        assert s["category"] in ["ADHERENCE", "MISSED_DOSES", "REMINDER_REVIEW", "TIMING_PATTERN", "POSITIVE_PROGRESS", "CAREGIVER_DISCUSSION"]
        assert s["priority"] in ["LOW", "MEDIUM", "HIGH"]
        assert "disclaimer" in s
    print("PASS 22/26: Suggestions use existing 17E deterministic rules accurately")

    # 23. Pending doses strictly excluded from completed dose denominator
    assert sum_data["trend"]["current_7d_taken"] + sum_data["trend"]["current_7d_skipped"] == 7
    print("PASS 23/26: Pending doses strictly excluded from completed denominator")

    # 24. No sensitive credentials or auth secrets exposed
    assert "password_hash" not in str(sum_data)
    assert "secret" not in str(sum_data)
    print("PASS 24/26: No sensitive credentials or secrets exposed in caregiver intelligence payloads")

    # 25. Caregiver Dashboard intelligence overview endpoint
    res = client.get("/api/caregivers/me/dashboard/intelligence-overview", headers=charlie_auth)
    assert res.status_code == 200
    cg_overview = res.json()
    assert isinstance(cg_overview, list)
    assert len(cg_overview) == 1
    assert cg_overview[0]["patient_id"] == str(alice_id)
    assert "Alice" in cg_overview[0]["patient_name"]
    assert "attention_level" in cg_overview[0]
    print("PASS 25/26: Caregiver dashboard intelligence overview endpoint verified accurately")

    # 26. Safety boundaries verified: Zero clinical diagnosis, emergency prediction, or dosage change recommendations
    for s in sugs:
        full_text = f"{s['title']} {s['message']} {s['reason']}".lower()
        for forbidden in FORBIDDEN_WORDS:
            assert forbidden not in full_text, f"Forbidden term '{forbidden}' detected in caregiver suggestion: {s}"
    print("PASS 26/26: Safety boundaries verified (No diagnoses, emergency predictions, or dosage changes)")

    print("\n==================================================")
    print("ALL FEATURE 17F CAREGIVER INTELLIGENCE TESTS PASSED (26/26)!")
    print("==================================================")


if __name__ == "__main__":
    run_all_tests()
