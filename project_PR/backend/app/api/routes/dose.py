import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import User, PatientProfile
from app.schemas.user import UserRole
from app.schemas.dose import (
    RecordDoseEventRequest,
    DoseActionRequest,
    DoseEventResponse,
)
from app.services.dose_service import (
    record_dose_event,
    mark_dose_taken,
    mark_dose_skipped,
    mark_dose_snoozed,
    get_patient_doses,
    get_patient_dose_by_id,
)

router = APIRouter(prefix="/patients/me/doses", tags=["Medication Dose Tracking"])


def get_current_patient(
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
    db: Session = Depends(get_db)
) -> tuple[uuid.UUID, uuid.UUID]:
    """
    Returns (patient_profile_id, user_id) for the authenticated patient session.
    """
    if current_user.patient_profile:
        return current_user.patient_profile.id, current_user.id

    profile = db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user.id)
    ).scalar_one_or_none()

    if not profile:
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile.id, current_user.id


@router.post(
    "",
    response_model=DoseEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record or claim a dose occurrence",
    description="Records a persistent dose occurrence for a scheduled medication event (e.g. TAKEN, SKIPPED, SNOOZED)."
)
def record_dose(
    request: RecordDoseEventRequest,
    patient_and_user: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    patient_id, user_id = patient_and_user
    return record_dose_event(db, patient_id=patient_id, user_id=user_id, data=request)


@router.get(
    "",
    response_model=List[DoseEventResponse],
    status_code=status.HTTP_200_OK,
    summary="Get patient dose events",
    description="Lists recorded dose events for the authenticated patient with optional date and status filters."
)
def list_doses(
    date: Optional[date] = Query(None, description="Optional target date to filter doses (e.g. '2026-09-01')"),
    status: Optional[str] = Query(None, description="Optional status filter ('TAKEN', 'SKIPPED', 'PENDING', 'SNOOZED', 'MISSED')"),
    patient_and_user: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    patient_id, _ = patient_and_user
    return get_patient_doses(db, patient_id=patient_id, target_date=date, status_filter=status)


@router.get(
    "/{dose_id}",
    response_model=DoseEventResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single dose event",
    description="Retrieves a specific dose event with strict patient ownership check."
)
def get_dose(
    dose_id: uuid.UUID,
    patient_and_user: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    patient_id, _ = patient_and_user
    return get_patient_dose_by_id(db, patient_id=patient_id, dose_id=dose_id)


@router.patch(
    "/{dose_id}/taken",
    response_model=DoseEventResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark dose as taken",
    description="Updates an existing dose event status to TAKEN with action timestamp and stock deduction."
)
def mark_as_taken(
    dose_id: uuid.UUID,
    request: DoseActionRequest = DoseActionRequest(),
    patient_and_user: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    patient_id, user_id = patient_and_user
    return mark_dose_taken(db, patient_id=patient_id, user_id=user_id, dose_id=dose_id, data=request)


@router.patch(
    "/{dose_id}/skipped",
    response_model=DoseEventResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark dose as skipped",
    description="Updates an existing dose event status to SKIPPED without deducting stock."
)
def mark_as_skipped(
    dose_id: uuid.UUID,
    request: DoseActionRequest = DoseActionRequest(),
    patient_and_user: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    patient_id, user_id = patient_and_user
    return mark_dose_skipped(db, patient_id=patient_id, user_id=user_id, dose_id=dose_id, data=request)


@router.patch(
    "/{dose_id}/snooze",
    response_model=DoseEventResponse,
    status_code=status.HTTP_200_OK,
    summary="Snooze a medication reminder",
    description="Postpones a scheduled dose reminder by a configurable interval (defaults to 10 minutes)."
)
def mark_as_snoozed(
    dose_id: uuid.UUID,
    request: DoseActionRequest = DoseActionRequest(),
    patient_and_user: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    patient_id, user_id = patient_and_user
    return mark_dose_snoozed(db, patient_id=patient_id, user_id=user_id, dose_id=dose_id, data=request)
