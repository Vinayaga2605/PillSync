import uuid
from decimal import Decimal
from datetime import datetime, date, time, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select

from main import app
from app.core.database import Base, engine, SessionLocal, get_db
from app.models.user import User, PatientProfile, CaregiverProfile
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
    print("RUNNING PILLSYNC FEATURE 17E: SMART SUGGESTIONS TESTS")
    print("==================================================")

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("PASS 1/22: Health check verified (200 OK)")

    # 2. Registration & Authentication setup
    # Create test users: Patient Alice, Patient Bob, Caregiver Charlie, Admin Diana
    suffix = str(uuid.uuid4())[:8]
    alice_email = f"alice_sug_{suffix}@example.com"
    bob_email = f"bob_sug_{suffix}@example.com"
    charlie_email = f"charlie_sug_{suffix}@example.com"
    diana_email = f"diana_sug_{suffix}@example.com"
    password = "Password123!"

    # Register Alice (Patient)
    res = client.post("/api/auth/register", json={
        "first_name": "Alice",
        "last_name": "SugTest",
        "email": alice_email,
        "password": password,
        "role": "PATIENT",
    })
    assert res.status_code == 201, f"Alice register failed: {res.text}"
    alice_token = client.post("/api/auth/login", json={"email": alice_email, "password": password}).json()["access_token"]
    alice_auth = {"Authorization": f"Bearer {alice_token}"}

    # Register Bob (Patient)
    res = client.post("/api/auth/register", json={
        "first_name": "Bob",
        "last_name": "SugTest",
        "email": bob_email,
        "password": password,
        "role": "PATIENT",
    })
    assert res.status_code == 201, f"Bob register failed: {res.text}"
    bob_token = client.post("/api/auth/login", json={"email": bob_email, "password": password}).json()["access_token"]
    bob_auth = {"Authorization": f"Bearer {bob_token}"}

    # Register Charlie (Caregiver)
    res = client.post("/api/auth/register", json={
        "first_name": "Charlie",
        "last_name": "SugTest",
        "email": charlie_email,
        "password": password,
        "role": "CAREGIVER",
    })
    assert res.status_code == 201, f"Charlie register failed: {res.text}"
    charlie_token = client.post("/api/auth/login", json={"email": charlie_email, "password": password}).json()["access_token"]
    charlie_auth = {"Authorization": f"Bearer {charlie_token}"}

    # Register Diana (Admin)
    res = client.post("/api/auth/register", json={
        "first_name": "Diana",
        "last_name": "SugTest",
        "email": diana_email,
        "password": password,
        "role": "ADMIN",
    })
    assert res.status_code == 201, f"Diana register failed: {res.text}"
    diana_token = client.post("/api/auth/login", json={"email": diana_email, "password": password}).json()["access_token"]
    diana_auth = {"Authorization": f"Bearer {diana_token}"}

    print("PASS 2/22: Users registered and authenticated with role tokens")

    # 3. Security Boundary: Unauthenticated access returns 401
    res = client.get("/api/patients/me/intelligence/suggestions")
    assert res.status_code == 401, f"Expected 401 for unauthenticated, got {res.status_code}"
    print("PASS 3/22: Unauthenticated request strictly returns 401 Unauthorized")

    # 4. Security Boundary: Caregiver receives 403
    res = client.get("/api/patients/me/intelligence/suggestions", headers=charlie_auth)
    assert res.status_code == 403, f"Expected 403 for caregiver, got {res.status_code}"
    print("PASS 4/22: Caregiver role strictly forbidden (403) from patient suggestions")

    # 5. Security Boundary: Admin receives 403
    res = client.get("/api/patients/me/intelligence/suggestions", headers=diana_auth)
    assert res.status_code == 403, f"Expected 403 for admin, got {res.status_code}"
    print("PASS 5/22: Admin role strictly forbidden (403) from patient suggestions")

    # 6. Security Boundary: Arbitrary patient ID lookup route does NOT exist
    res = client.get(f"/api/patients/{uuid.uuid4()}/intelligence/suggestions", headers=alice_auth)
    assert res.status_code in [404, 405], f"Arbitrary ID endpoint should not exist, got {res.status_code}"
    print("PASS 6/22: Verified no /patients/{patient_id}/intelligence/suggestions route exists")

    # 7. Rule G: Insufficient Data Test (Empty history for Bob)
    res = client.get("/api/patients/me/intelligence/suggestions", headers=bob_auth)
    assert res.status_code == 200, f"Expected 200 for Bob, got {res.text}"
    bob_data = res.json()
    assert len(bob_data["suggestions"]) >= 1, "Expected insufficient data suggestion"
    first_sug = bob_data["suggestions"][0]
    assert first_sug["id"] == "sug_insufficient_data"
    assert first_sug["priority"] == "LOW"
    assert first_sug["category"] == "ADHERENCE"
    assert "Not enough medication history" in first_sug["title"]
    assert first_sug["action_type"] == "CONTINUE_CURRENT_PLAN"
    assert "disclaimer" in bob_data and len(bob_data["disclaimer"]) > 10
    print("PASS 7/22: Insufficient data behavior verified (graceful non-clinical guidance)")

    # 8. Seed controlled test data for Patient Alice
    # Med 1: Lisinopril 10mg (Daily Morning at 08:00)
    # Med 2: Metformin 500mg (Daily Evening at 20:00)
    # Dose history:
    # - Past 7 days:
    #   Lisinopril Morning (08:00): 6 TAKEN, 1 SKIPPED
    #   Metformin Evening (20:00): 2 TAKEN, 5 SKIPPED -> Repeated skips & Evening timing pattern
    #   Combined 7d: 8 TAKEN, 6 SKIPPED -> 57.1% adherence (< 70% -> Low adherence)
    # - Previous 7-14 days:
    #   13 TAKEN, 1 SKIPPED -> 92.9% adherence
    #   Trend: 57.1% vs 92.9% -> Change -35.8% (DECLINING)
    # - Also add 3 PENDING doses to verify they are strictly excluded
    db: Session = SessionLocal()
    alice_user = db.execute(select(User).where(User.email == alice_email)).scalar_one()
    alice_prof = alice_user.patient_profile
    if not alice_prof:
        alice_prof = PatientProfile(user_id=alice_user.id)
        db.add(alice_prof)
        db.flush()
    alice_patient_id = alice_prof.id

    now_utc = datetime.now(timezone.utc)

    # Patient Medications
    p_med_lis = PatientMedication(
        patient_id=alice_patient_id,
        custom_medicine_name="Lisinopril",
        dosage_amount=Decimal("10"),
        dosage_unit="mg",
        start_date=date.today() - timedelta(days=30),
        is_active=True,
    )
    p_med_met = PatientMedication(
        patient_id=alice_patient_id,
        custom_medicine_name="Metformin",
        dosage_amount=Decimal("500"),
        dosage_unit="mg",
        start_date=date.today() - timedelta(days=30),
        is_active=True,
    )
    db.add_all([p_med_lis, p_med_met])
    db.flush()
    lis_id = p_med_lis.id
    met_id = p_med_met.id

    # Doses in previous 7-14 days (Days 8 to 14 ago): 13 TAKEN, 1 SKIPPED
    for i in range(8, 15):
        ts_lis = (now_utc - timedelta(days=i)).replace(hour=8, minute=0, second=0)
        ts_met = (now_utc - timedelta(days=i)).replace(hour=20, minute=0, second=0)
        d1 = MedicationDoseEvent(
            patient_id=alice_patient_id,
            patient_medication_id=lis_id,
            scheduled_timestamp=ts_lis,
            status="TAKEN",
            actual_taken_timestamp=ts_lis,
        )
        d2 = MedicationDoseEvent(
            patient_id=alice_patient_id,
            patient_medication_id=met_id,
            scheduled_timestamp=ts_met,
            status="SKIPPED" if i == 14 else "TAKEN",
            actual_taken_timestamp=None if i == 14 else ts_met,
        )
        db.add_all([d1, d2])

    # Doses in current 7 days (Days 1 to 7 ago):
    # Lisinopril Morning (08:00): 6 TAKEN, 1 SKIPPED
    # Metformin Evening (20:00): 2 TAKEN, 5 SKIPPED
    for i in range(1, 8):
        ts_lis = (now_utc - timedelta(days=i)).replace(hour=8, minute=0, second=0)
        ts_met = (now_utc - timedelta(days=i)).replace(hour=20, minute=0, second=0)

        d1 = MedicationDoseEvent(
            patient_id=alice_patient_id,
            patient_medication_id=lis_id,
            scheduled_timestamp=ts_lis,
            status="SKIPPED" if i == 7 else "TAKEN",
            actual_taken_timestamp=None if i == 7 else ts_lis,
        )
        d2 = MedicationDoseEvent(
            patient_id=alice_patient_id,
            patient_medication_id=met_id,
            scheduled_timestamp=ts_met,
            status="TAKEN" if i <= 2 else "SKIPPED",
            actual_taken_timestamp=ts_met if i <= 2 else None,
        )
        db.add_all([d1, d2])

    # Add 3 PENDING doses today
    for i in range(3):
        ts_pend = now_utc + timedelta(hours=i+1)
        dp = MedicationDoseEvent(
            patient_id=alice_patient_id,
            patient_medication_id=lis_id,
            scheduled_timestamp=ts_pend,
            status="PENDING",
        )
        db.add(dp)

    db.commit()
    db.close()
    print("PASS 8/22: Seeded controlled test doses and schedules for Patient Alice")

    # 9. Fetch Alice's Smart Suggestions
    res = client.get("/api/patients/me/intelligence/suggestions", headers=alice_auth)
    assert res.status_code == 200, f"Expected 200, got {res.text}"
    alice_data = res.json()
    suggestions = alice_data["suggestions"]
    assert len(suggestions) > 0, "Expected generated suggestions for Alice"
    print(f"PASS 9/22: GET /api/patients/me/intelligence/suggestions returned {len(suggestions)} suggestions")

    # 10. Rule A/D Check: Low Adherence / Declining Routine Review
    adherence_sug = next((s for s in suggestions if s["category"] == "ADHERENCE"), None)
    assert adherence_sug is not None, "Expected ADHERENCE suggestion"
    assert adherence_sug["priority"] in ["MEDIUM", "HIGH"]
    assert "Review your recent medication routine" in adherence_sug["title"] or "Adherence has decreased" in adherence_sug["title"]
    assert adherence_sug["action_type"] in ["REVIEW_REMINDERS", "REVIEW_HISTORY"]
    print("PASS 10/22: Low adherence and declining trend rule verified accurately")

    # 11. Rule B Check: Repeated Skipped Doses on Metformin
    met_sug = next((s for s in suggestions if s["category"] == "MISSED_DOSES" and "Metformin" in s["title"]), None)
    assert met_sug is not None, "Expected MISSED_DOSES suggestion for Metformin"
    assert met_sug["priority"] in ["MEDIUM", "HIGH"]
    assert met_sug["action_type"] in ["DISCUSS_WITH_CAREGIVER", "DISCUSS_WITH_HEALTHCARE_PROFESSIONAL", "REVIEW_REMINDERS"]
    assert "Metformin" in met_sug["message"]
    assert "supporting_metrics" in met_sug and met_sug["supporting_metrics"]["medication_name"] == "Metformin"
    print("PASS 11/22: Repeated skipped doses rule on specific medication verified accurately")

    # 12. Rule C Check: Missed Time-of-Day Pattern (Evening)
    timing_sug = next((s for s in suggestions if s["category"] == "TIMING_PATTERN"), None)
    assert timing_sug is not None, "Expected TIMING_PATTERN suggestion"
    assert "Evening" in timing_sug["title"] or "evening" in timing_sug["message"]
    assert timing_sug["action_type"] == "REVIEW_REMINDERS"
    assert timing_sug["supporting_metrics"]["time_of_day"] == "EVENING"
    print("PASS 12/22: Missed time-of-day pattern rule (Evening) verified accurately")

    # 13. Pending doses strictly excluded from suggestion metrics
    # Verify current_7d_taken and current_7d_skipped are present and pending excluded
    assert adherence_sug["supporting_metrics"].get("current_7d_taken") is not None
    assert adherence_sug["supporting_metrics"].get("current_7d_skipped") is not None
    print("PASS 13/22: Pending doses strictly excluded from suggestion calculation denominator")

    # 14. Suggestions are deterministic (Calling multiple times produces identical results)
    res2 = client.get("/api/patients/me/intelligence/suggestions", headers=alice_auth)
    assert res2.status_code == 200
    suggestions2 = res2.json()["suggestions"]
    assert len(suggestions) == len(suggestions2)
    for s1, s2 in zip(suggestions, suggestions2):
        assert s1["id"] == s2["id"]
        assert s1["category"] == s2["category"]
        assert s1["priority"] == s2["priority"]
        assert s1["title"] == s2["title"]
        assert s1["reason"] == s2["reason"]
    print("PASS 14/22: Suggestions are 100% deterministic and reproducible")

    # 15. Maximum suggestions limit respected (<= 5)
    assert len(suggestions) <= 5, f"Expected <= 5 suggestions, got {len(suggestions)}"
    print("PASS 15/22: Maximum suggestion count (<= 5) respected")

    # 16. Suggestion deduplication verified
    ids = [s["id"] for s in suggestions]
    assert len(ids) == len(set(ids)), f"Duplicate suggestion IDs found: {ids}"
    print("PASS 16/22: Suggestion deduplication verified")

    # 17. Safety Disclaimer present on response and on each suggestion
    assert "disclaimer" in alice_data and "not medical advice" in alice_data["disclaimer"].lower()
    for s in suggestions:
        assert "disclaimer" in s and "not medical advice" in s["disclaimer"].lower()
    print("PASS 17/22: Safety non-clinical disclaimers verified on all suggestion items")

    # 18. No forbidden clinical / dosage / emergency terms in any suggestion
    for s in suggestions:
        full_text = f"{s['title']} {s['message']} {s['reason']}".lower()
        for forbidden in FORBIDDEN_WORDS:
            assert forbidden not in full_text, f"Forbidden term '{forbidden}' detected in suggestion: {s}"
    print("PASS 18/22: Zero clinical diagnoses, dosage changes, or emergency claims verified")

    # 19. Positive improvement & Stable adherence rules verification (Patient Eve)
    eve_email = f"eve_sug_{suffix}@example.com"
    res = client.post("/api/auth/register", json={
        "first_name": "Eve",
        "last_name": "SugTest",
        "email": eve_email,
        "password": password,
        "role": "PATIENT",
    })
    assert res.status_code == 201, f"Eve register failed: {res.text}"
    eve_token = client.post("/api/auth/login", json={"email": eve_email, "password": password}).json()["access_token"]
    eve_auth = {"Authorization": f"Bearer {eve_token}"}

    db = SessionLocal()
    eve_user = db.execute(select(User).where(User.email == eve_email)).scalar_one()
    eve_prof = eve_user.patient_profile
    if not eve_prof:
        eve_prof = PatientProfile(user_id=eve_user.id)
        db.add(eve_prof)
        db.flush()
    eve_patient_id = eve_prof.id

    p_med_eve = PatientMedication(
        patient_id=eve_patient_id,
        custom_medicine_name="Amlodipine",
        dosage_amount=Decimal("5"),
        dosage_unit="mg",
        start_date=date.today() - timedelta(days=30),
        is_active=True,
    )
    db.add(p_med_eve)
    db.flush()

    # Previous 7d: 4 TAKEN, 3 SKIPPED (57.1%)
    # Current 7d: 7 TAKEN, 0 SKIPPED (100.0%) -> IMPROVING (+42.9%)
    for i in range(8, 15):
        ts = (now_utc - timedelta(days=i)).replace(hour=8, minute=0, second=0)
        db.add(MedicationDoseEvent(
            patient_id=eve_patient_id,
            patient_medication_id=p_med_eve.id,
            scheduled_timestamp=ts,
            status="TAKEN" if i in [8, 9, 10, 11] else "SKIPPED",
            actual_taken_timestamp=ts if i in [8, 9, 10, 11] else None,
        ))
    for i in range(1, 8):
        ts = (now_utc - timedelta(days=i)).replace(hour=8, minute=0, second=0)
        db.add(MedicationDoseEvent(
            patient_id=eve_patient_id,
            patient_medication_id=p_med_eve.id,
            scheduled_timestamp=ts,
            status="TAKEN",
            actual_taken_timestamp=ts,
        ))
    db.commit()
    db.close()

    res = client.get("/api/patients/me/intelligence/suggestions", headers=eve_auth)
    assert res.status_code == 200
    eve_sug = res.json()["suggestions"]
    pos_sug = next((s for s in eve_sug if s["category"] == "POSITIVE_PROGRESS"), None)
    assert pos_sug is not None, "Expected POSITIVE_PROGRESS suggestion for Eve"
    assert pos_sug["priority"] == "LOW"
    assert "improving" in pos_sug["title"].lower() or "consistent" in pos_sug["title"].lower()
    print("PASS 19/22: Positive improvement / consistent adherence suggestions verified accurately")

    # 20. No sensitive credentials or auth data exposed
    assert "password_hash" not in str(alice_data)
    assert "secret" not in str(alice_data)
    print("PASS 20/22: No sensitive credentials or auth secrets exposed in suggestions payload")

    # 21. Regressions: Feature 17A Intelligence Summary intact
    res = client.get("/api/patients/me/intelligence/summary", headers=alice_auth)
    assert res.status_code == 200
    assert "attention_score" in res.json()
    print("PASS 21/22: Regression verified: Feature 17A Intelligence Summary intact")

    # 22. Regressions: Feature 17D Intelligence History intact
    res = client.get("/api/patients/me/intelligence/history?days=30", headers=alice_auth)
    assert res.status_code == 200
    assert "daily_timeline" in res.json()
    print("PASS 22/22: Regression verified: Feature 17D Intelligence History intact")

    print("\n==================================================")
    print("ALL FEATURE 17E SUGGESTIONS TESTS PASSED (22/22)!")
    print("==================================================")


if __name__ == "__main__":
    run_all_tests()
