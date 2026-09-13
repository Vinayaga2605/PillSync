import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import User, PatientProfile
from app.schemas.user import UserRole
from app.schemas.reminder import (
    DueMedicationEventResponse,
    UpcomingMedicationEventResponse,
    ReminderSummaryResponse,
    TodayMedicationReminder,
)
from app.services.reminder_service import (
    get_due_doses,
    get_upcoming_doses,
    get_reminders_summary,
    get_today_reminders,
)

router = APIRouter(prefix="/patients/me/reminders", tags=["Medication Reminders"])


def get_current_patient_id(
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
    db: Session = Depends(get_db)
) -> uuid.UUID:
    """
    Resolves the PatientProfile.id associated with the authenticated patient user.
    """
    if current_user.patient_profile:
        return current_user.patient_profile.id

    profile = db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user.id)
    ).scalar_one_or_none()

    if not profile:
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile.id


@router.get(
    "/due",
    response_model=List[DueMedicationEventResponse],
    status_code=status.HTTP_200_OK,
    summary="Get currently due medication doses",
    description="Returns a read-only list of medication doses that are currently due based on active schedules."
)
def list_due_doses(
    reference_time: Optional[datetime] = Query(
        None,
        description="Optional ISO reference timestamp to evaluate due status (defaults to current server time)"
    ),
    due_window_hours: int = Query(
        4,
        ge=1,
        le=24,
        description="Hours before reference time within which scheduled doses are considered due"
    ),
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return get_due_doses(
        db,
        patient_id=patient_id,
        reference_datetime=reference_time,
        due_window_hours=due_window_hours,
    )


@router.get(
    "/upcoming",
    response_model=List[UpcomingMedicationEventResponse],
    status_code=status.HTTP_200_OK,
    summary="Get upcoming medication doses",
    description="Returns a read-only list of upcoming doses for the next N hours, sorted chronologically."
)
def list_upcoming_doses(
    hours: int = Query(
        24,
        ge=1,
        le=168,
        description="Number of hours ahead to forecast upcoming doses (default 24 hours)"
    ),
    reference_time: Optional[datetime] = Query(
        None,
        description="Optional ISO reference timestamp (defaults to current server time)"
    ),
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return get_upcoming_doses(
        db,
        patient_id=patient_id,
        reference_datetime=reference_time,
        hours_ahead=hours,
    )


@router.get(
    "/today",
    response_model=List[TodayMedicationReminder],
    status_code=status.HTTP_200_OK,
    summary="Get today's medication reminders",
    description="Returns all medication reminders for today categorized by time of day (Morning, Afternoon, Evening, Night) and status."
)
def list_today_reminders(
    reference_time: Optional[datetime] = Query(
        None,
        description="Optional ISO reference timestamp (defaults to current server time)"
    ),
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return get_today_reminders(
        db,
        patient_id=patient_id,
        reference_datetime=reference_time,
    )


@router.get(
    "/summary",
    response_model=ReminderSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get unified reminder summary",
    description="Returns due counts, upcoming counts, and lists of due and upcoming doses."
)
def get_reminders_summary_view(
    hours: int = Query(
        24,
        ge=1,
        le=168,
        description="Hours ahead for upcoming forecasts"
    ),
    reference_time: Optional[datetime] = Query(
        None,
        description="Optional ISO reference timestamp"
    ),
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return get_reminders_summary(
        db,
        patient_id=patient_id,
        reference_datetime=reference_time,
        hours_ahead=hours,
    )


