import os
import asyncio
import logging
from datetime import datetime
from typing import Optional, Dict, Any

from app.core.database import SessionLocal
from app.services.reminder_service import get_app_timezone
from app.services.notification_engine import run_notification_engine

logger = logging.getLogger("pillsync.notification_scheduler")


def is_scheduler_enabled() -> bool:
    """Reads whether the background notification scheduler is enabled from environment."""
    return os.getenv("NOTIFICATION_ENGINE_ENABLED", "true").lower() in ("true", "1", "yes")


def get_scheduler_interval() -> int:
    """Reads the scheduler execution interval in seconds (default 60)."""
    raw = os.getenv("NOTIFICATION_ENGINE_INTERVAL_SECONDS", "60")
    try:
        val = int(raw)
        return max(1, val)
    except (ValueError, TypeError):
        return 60


class NotificationScheduler:
    """
    In-process async background scheduler that executes the notification engine at configured intervals.
    Provides lifecycle control, error isolation, execution locking, and status telemetry.
    """

    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._is_running: bool = False
        self._lock: Optional[asyncio.Lock] = None
        self._last_run_at: Optional[datetime] = None
        self._last_run_status: Optional[str] = None
        self._last_run_summary: Optional[Dict[str, Any]] = None
        self._last_error: Optional[str] = None

    def _get_lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    async def execute_cycle(self) -> Dict[str, Any]:
        """
        Executes a single engine execution cycle with in-process lock and isolated DB session.
        If a previous execution is still running, skips overlap safely.
        """
        lock = self._get_lock()
        if lock.locked():
            logger.warning("Notification engine cycle skipped: previous execution still in progress.")
            return {
                "status": "skipped_lock",
                "message": "Execution skipped because another cycle is currently running",
            }

        async with lock:
            tz = get_app_timezone()
            now = datetime.now(tz)
            db = None
            try:
                db = SessionLocal()
                # Run the synchronous database engine in a thread pool to avoid blocking the event loop
                summary = await asyncio.to_thread(run_notification_engine, db=db)
                self._last_run_at = now
                self._last_run_status = "success"
                self._last_run_summary = summary
                self._last_error = None
                logger.info(
                    f"Notification engine background cycle completed successfully: "
                    f"processed={summary.get('processed_doses', 0)}, created={summary.get('total_notifications_created', 0)}"
                )
                return {
                    "status": "success",
                    "timestamp": now.isoformat(),
                    "summary": summary,
                }
            except Exception as exc:
                self._last_run_at = now
                self._last_run_status = "failed"
                self._last_error = str(exc)
                logger.error(f"Notification engine background cycle failed: {exc}", exc_info=True)
                return {
                    "status": "failed",
                    "timestamp": now.isoformat(),
                    "error": str(exc),
                }
            finally:
                if db:
                    db.close()


    async def _loop(self):
        """Continuous background execution loop."""
        interval = get_scheduler_interval()
        logger.info(f"Notification background scheduler loop started (interval={interval}s)")

        while self._is_running:
            try:
                await self.execute_cycle()
            except Exception as e:
                logger.error(f"Unexpected error in scheduler loop: {e}", exc_info=True)

            try:
                await asyncio.sleep(get_scheduler_interval())
            except asyncio.CancelledError:
                break

        logger.info("Notification background scheduler loop exited.")

    def start(self):
        """Starts the background scheduler task if enabled."""
        if not is_scheduler_enabled():
            logger.info("Notification background scheduler is disabled (NOTIFICATION_ENGINE_ENABLED=false).")
            return

        if self._is_running and self._task and not self._task.done():
            logger.warning("Notification background scheduler is already running.")
            return

        self._is_running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("Notification background scheduler initialized and started.")

    async def stop(self):
        """Stops and cancels the background scheduler task cleanly."""
        if not self._is_running:
            return

        logger.info("Stopping notification background scheduler...")
        self._is_running = False

        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await asyncio.gather(self._task, return_exceptions=True)
            except Exception as e:
                logger.debug(f"Scheduler task cancellation clean: {e}")

        logger.info("Notification background scheduler stopped.")

    def get_status(self) -> Dict[str, Any]:
        """Returns the current runtime status of the scheduler."""
        return {
            "enabled": is_scheduler_enabled(),
            "running": self._is_running and (self._task is not None and not self._task.done()),
            "interval_seconds": get_scheduler_interval(),
            "last_run_at": self._last_run_at.isoformat() if self._last_run_at else None,
            "last_run_status": self._last_run_status,
            "last_run_summary": self._last_run_summary,
            "last_error": self._last_error,
        }


# Global singleton instance
scheduler = NotificationScheduler()


def start_scheduler():
    """Convenience function to start the global scheduler."""
    scheduler.start()


async def stop_scheduler():
    """Convenience function to stop the global scheduler."""
    await scheduler.stop()


def get_scheduler_status() -> Dict[str, Any]:
    """Convenience function to query global scheduler status."""
    return scheduler.get_status()
