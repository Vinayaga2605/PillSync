from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import User
from app.schemas.user import UserRole
from app.services.notification_engine import run_notification_engine
from app.services.notification_scheduler import get_scheduler_status

router = APIRouter(prefix="/internal", tags=["Internal Admin Engine"])


@router.post(
    "/notifications/run",
    summary="Trigger automatic notification engine run (Admin only)",
    description="Processes all active patients and medication schedules globally, generating UPCOMING, DUE, and MISSED notifications safely without duplicates.",
)
def trigger_notification_engine(
    upcoming_minutes: int = Query(30, ge=1, description="Minutes before scheduled time to send upcoming notification"),
    missed_after_minutes: int = Query(60, ge=1, description="Grace period in minutes after scheduled time before missed notification"),
    due_window_hours: int = Query(4, ge=1, description="Active due window hours"),
    current_admin: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    summary = run_notification_engine(
        db=db,
        upcoming_minutes=upcoming_minutes,
        missed_after_minutes=missed_after_minutes,
        due_window_hours=due_window_hours,
    )
    return summary


@router.get(
    "/notifications/status",
    summary="Get background notification scheduler status (Admin only)",
    description="Retrieves the current running status, interval, last run timestamp, and telemetry summary of the background notification scheduler.",
)
def get_engine_status(
    current_admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    return get_scheduler_status()

