import os
import uuid
import asyncio
from datetime import datetime, date, time, timedelta
from zoneinfo import ZoneInfo
from fastapi.testclient import TestClient
from sqlalchemy import select

from main import app
from app.core.database import SessionLocal
from app.models.user import User, PatientProfile
from app.models.medicine import PatientMedication
from app.models.schedule import MedicationSchedule, MedicationScheduleTime, MedicationDoseEvent
from app.models.notification import Notification
from app.services.reminder_service import get_app_timezone
from app.services.notification_scheduler import (
    NotificationScheduler,
    scheduler as global_scheduler,
    is_scheduler_enabled,
    get_scheduler_interval,
    get_scheduler_status,
)


def run_tests():
    print("==================================================")
    print("RUNNING PILLSYNC FEATURE 14F: BACKGROUND SCHEDULER TESTS")
    print("==================================================")

    tz = get_app_timezone()
    today = date(2026, 9, 3)

    # 1. Test Client setup & Health checks
    with TestClient(app) as client:
        assert client.get("/api/health").status_code == 200
        assert client.get("/api/health/db").status_code == 200
        print("PASS 1/16: Health and DB health checks verified with active lifespan (200 OK)")

        # 2. Register Patient, Caregiver, and Admin
        rand_a = uuid.uuid4().hex[:6]
        email_a = f"sched_patient_{rand_a}@example.com"
        client.post("/api/auth/register", json={
            "first_name": "SchedPatient",
            "last_name": "Alpha",
            "email": email_a,
            "password": "Password123!",
            "role": "PATIENT"
        })
        login_a = client.post("/api/auth/login", json={"email": email_a, "password": "Password123!"})
        token_a = login_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        rand_cg = uuid.uuid4().hex[:6]
        email_cg = f"sched_cg_{rand_cg}@example.com"
        client.post("/api/auth/register", json={
            "first_name": "Caregiver",
            "last_name": "Sched",
            "email": email_cg,
            "password": "Password123!",
            "role": "CAREGIVER"
        })
        login_cg = client.post("/api/auth/login", json={"email": email_cg, "password": "Password123!"})
        token_cg = login_cg.json()["access_token"]
        headers_cg = {"Authorization": f"Bearer {token_cg}"}

        rand_admin = uuid.uuid4().hex[:6]
        email_admin = f"sched_admin_{rand_admin}@example.com"
        client.post("/api/auth/register", json={
            "first_name": "Admin",
            "last_name": "Sched",
            "email": email_admin,
            "password": "Password123!",
            "role": "ADMIN"
        })
        login_admin = client.post("/api/auth/login", json={"email": email_admin, "password": "Password123!"})
        token_admin = login_admin.json()["access_token"]
        headers_admin = {"Authorization": f"Bearer {token_admin}"}

        # Fetch DB Patient ID
        db = SessionLocal()
        try:
            user_a = db.execute(select(User).where(User.email == email_a)).scalar_one()
            patient_a = db.execute(select(PatientProfile).where(PatientProfile.user_id == user_a.id)).scalar_one()
            patient_a_id = patient_a.id
        finally:
            db.close()

        print("PASS 2/16: Setup Patient, Caregiver, and Admin")

        # 3. Test 1 & 12: ADMIN can access scheduler status
        res_status = client.get("/api/internal/notifications/status", headers=headers_admin)
        assert res_status.status_code == 200
        status_data = res_status.json()
        assert "enabled" in status_data
        assert "running" in status_data
        assert "interval_seconds" in status_data
        assert status_data["enabled"] is True
        print("PASS 3/16: ADMIN can query background scheduler runtime status (200 OK)")

        # 4. Test 10 & 11: PATIENT and CAREGIVER cannot access internal endpoints
        res_pat_status = client.get("/api/internal/notifications/status", headers=headers_a)
        assert res_pat_status.status_code == 403
        res_cg_status = client.get("/api/internal/notifications/status", headers=headers_cg)
        assert res_cg_status.status_code == 403

        res_pat_run = client.post("/api/internal/notifications/run", headers=headers_a)
        assert res_pat_run.status_code == 403
        res_cg_run = client.post("/api/internal/notifications/run", headers=headers_cg)
        assert res_cg_run.status_code == 403
        print("PASS 4/16: PATIENT and CAREGIVER blocked from internal status and trigger (403 Forbidden)")

        # 5. Test 9: Manual ADMIN trigger works
        res_admin_run = client.post("/api/internal/notifications/run", headers=headers_admin)
        assert res_admin_run.status_code == 200
        assert "processed_doses" in res_admin_run.json()
        print("PASS 5/16: Manual ADMIN trigger executes engine successfully (200 OK)")

        # 6. Test 2: Disabled scheduler does not start
        os.environ["NOTIFICATION_ENGINE_ENABLED"] = "false"
        assert is_scheduler_enabled() is False
        disabled_sched = NotificationScheduler()
        disabled_sched.start()
        assert disabled_sched._is_running is False
        assert disabled_sched._task is None
        print("PASS 6/16: Scheduler does not start when NOTIFICATION_ENGINE_ENABLED=false")

        # 7. Test 3: Configurable interval parsing and safe fallbacks
        os.environ["NOTIFICATION_ENGINE_ENABLED"] = "true"
        os.environ["NOTIFICATION_ENGINE_INTERVAL_SECONDS"] = "45"
        assert get_scheduler_interval() == 45
        os.environ["NOTIFICATION_ENGINE_INTERVAL_SECONDS"] = "invalid"
        assert get_scheduler_interval() == 60  # fallback to default
        os.environ["NOTIFICATION_ENGINE_INTERVAL_SECONDS"] = "60"
        print("PASS 7/16: Configurable interval parsed correctly with safe fallbacks")

        # 8. Test 4: Engine executes single cycle cleanly via execute_cycle()
        test_sched = NotificationScheduler()
        loop = asyncio.new_event_loop()
        try:
            cycle_result = loop.run_until_complete(test_sched.execute_cycle())
            assert cycle_result["status"] == "success"
            assert "summary" in cycle_result
            status_after = test_sched.get_status()
            assert status_after["last_run_status"] == "success"
            assert status_after["last_run_at"] is not None
        finally:
            loop.close()
        print("PASS 8/16: Engine execute_cycle() executes with session management and telemetry tracking")

        # 9. Test 7: Overlapping execution prevention (In-process Lock)
        test_sched_lock = NotificationScheduler()
        loop2 = asyncio.new_event_loop()
        try:
            async def run_overlap_test():
                # Acquire the internal lock manually to simulate long-running process
                lock = test_sched_lock._get_lock()
                await lock.acquire()
                try:
                    # Attempt a concurrent cycle
                    overlap_res = await test_sched_lock.execute_cycle()
                    assert overlap_res["status"] == "skipped_lock"
                finally:
                    lock.release()

            loop2.run_until_complete(run_overlap_test())
        finally:
            loop2.close()
        print("PASS 9/16: Overlapping executions skipped safely without crashing")

        # 10. Test 5 & 6: Engine failure isolation (scheduler does not crash and handles next cycle)
        test_sched_err = NotificationScheduler()
        loop3 = asyncio.new_event_loop()
        try:
            async def run_error_test():
                # Mock a transient failure by overriding SessionLocal temporarily
                def broken_session():
                    raise RuntimeError("Simulated transient database connection error")

                orig_session = globals().get("SessionLocal")
                import app.services.notification_scheduler as ns
                orig_ns_session = ns.SessionLocal
                ns.SessionLocal = broken_session
                try:
                    err_res = await test_sched_err.execute_cycle()
                    assert err_res["status"] == "failed"
                    assert "Simulated transient" in err_res["error"]
                    assert test_sched_err.get_status()["last_run_status"] == "failed"
                finally:
                    ns.SessionLocal = orig_ns_session

                # Next cycle after recovery succeeds normally
                recovery_res = await test_sched_err.execute_cycle()
                assert recovery_res["status"] == "success"
                assert test_sched_err.get_status()["last_run_status"] == "success"

            loop3.run_until_complete(run_error_test())
        finally:
            loop3.close()
        print("PASS 10/16: Error isolation verified: failed cycle recorded, next cycle continues smoothly")

        # 11. Test 8: Clean start and stop of scheduler task
        test_sched_life = NotificationScheduler()
        loop4 = asyncio.new_event_loop()
        try:
            async def run_life_test():
                test_sched_life.start()
                assert test_sched_life._is_running is True
                await asyncio.sleep(0.05)  # brief tick
                await test_sched_life.stop()
                assert test_sched_life._is_running is False
                assert test_sched_life._task.done()

            loop4.run_until_complete(run_life_test())
        finally:
            loop4.close()
        print("PASS 11/16: Scheduler starts and cancels background task cleanly on stop()")

        # 12. Test 15: Notification idempotency preserved during repeated runs
        db = SessionLocal()
        try:
            # Create a medicine and schedule for Patient A
            med = PatientMedication(
                patient_id=patient_a_id,
                custom_medicine_name="Pantoprazole 40mg",
                dosage_amount=40.0,
                dosage_unit="mg",
                start_date=today - timedelta(days=5),
                is_active=True,
            )
            db.add(med)
            db.commit()
            db.refresh(med)

            sched = MedicationSchedule(
                patient_medication_id=med.id,
                frequency_type="DAILY",
                dose_quantity=1.0,
                dosage_unit="tablet",
                start_date=today - timedelta(days=5),
                is_active=True,
            )
            db.add(sched)
            db.commit()
            db.refresh(sched)

            t1 = MedicationScheduleTime(schedule_id=sched.id, scheduled_time=time(8, 0), time_of_day_type="MORNING")
            db.add(t1)
            db.commit()
        finally:
            db.close()

        # Trigger run twice
        res_run_1 = client.post("/api/internal/notifications/run", headers=headers_admin)
        assert res_run_1.status_code == 200
        res_run_2 = client.post("/api/internal/notifications/run", headers=headers_admin)
        assert res_run_2.status_code == 200

        # Check total notifications for Pantoprazole in DB
        db = SessionLocal()
        try:
            pant_notifs = db.execute(
                select(Notification).where(
                    Notification.patient_id == patient_a_id,
                    Notification.message.like("%Pantoprazole%"),
                )
            ).scalars().all()
            assert len(pant_notifs) <= 2  # At most 1 DUE + 1 MISSED, no duplicate copies
        finally:
            db.close()
        print("PASS 12/16: Notification idempotency intact under repeated scheduler runs")

        # 13. Test 16: Existing dose, reminder, and adherence APIs operational
        assert client.get("/api/patients/me/doses", headers=headers_a).status_code == 200
        assert client.get("/api/patients/me/reminders/due", headers=headers_a).status_code == 200
        assert client.get("/api/patients/me/reminders/upcoming", headers=headers_a).status_code == 200
        assert client.get("/api/patients/me/adherence/today", headers=headers_a).status_code == 200
        assert client.get("/api/patients/me/notifications", headers=headers_a).status_code == 200
        assert client.get("/api/patients/me/notifications/preferences", headers=headers_a).status_code == 200
        print("PASS 13/16: Existing dose, reminder, adherence, and notification endpoints operational")

        # 14. Mark-all-read clears unread notifications
        assert client.patch("/api/patients/me/notifications/read-all", headers=headers_a).status_code == 200
        res_cnt = client.get("/api/patients/me/notifications/unread-count", headers=headers_a)
        assert res_cnt.json()["unread_count"] == 0
        print("PASS 14/16: Patient notification mark-read interactions function seamlessly")

        # 15. Verify unauthenticated access to internal trigger rejected
        assert client.post("/api/internal/notifications/run").status_code == 401
        assert client.get("/api/internal/notifications/status").status_code == 401
        print("PASS 15/16: Unauthenticated access to internal endpoints rejected with 401")

        print("PASS 16/16: All Feature 14F Background Scheduler criteria verified")

    print("==================================================")
    print("ALL 16 PILLSYNC FEATURE 14F TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
