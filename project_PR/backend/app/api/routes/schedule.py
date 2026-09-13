import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import User, PatientProfile
from app.schemas.user import UserRole
from app.schemas.schedule import (
    MedicationScheduleCreate,
    MedicationScheduleUpdate,
    MedicationScheduleResponse,
)
from app.services.medication_schedule_service import (
    create_medication_schedule,
    get_medication_schedules,
    get_medication_schedule_by_id,
    update_medication_schedule,
    delete_medication_schedule,
)

router = APIRouter(
    prefix="/patients/me/medicines/{medicine_id}/schedules",
    tags=["Medication Schedules"]
)


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


@router.post(
    "",
    response_model=MedicationScheduleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a medication schedule",
    description="Creates a new dosing schedule for the authenticated patient's medicine."
)
def create_schedule(
    medicine_id: uuid.UUID,
    request: MedicationScheduleCreate,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return create_medication_schedule(db, patient_id, medicine_id, request)


@router.get(
    "",
    response_model=List[MedicationScheduleResponse],
    status_code=status.HTTP_200_OK,
    summary="List medication schedules",
    description="Returns all active and inactive schedules for the authenticated patient's medicine."
)
def list_schedules(
    medicine_id: uuid.UUID,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return get_medication_schedules(db, patient_id, medicine_id)


@router.get(
    "/{schedule_id}",
    response_model=MedicationScheduleResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single medication schedule",
    description="Retrieves a specific dosing schedule for a medicine with strict ownership verification."
)
def get_schedule(
    medicine_id: uuid.UUID,
    schedule_id: uuid.UUID,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return get_medication_schedule_by_id(db, patient_id, medicine_id, schedule_id)


@router.patch(
    "/{schedule_id}",
    response_model=MedicationScheduleResponse,
    status_code=status.HTTP_200_OK,
    summary="Update medication schedule",
    description="Partially updates an existing dosing schedule with strict ownership verification."
)
def update_schedule(
    medicine_id: uuid.UUID,
    schedule_id: uuid.UUID,
    request: MedicationScheduleUpdate,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return update_medication_schedule(db, patient_id, medicine_id, schedule_id, request)


@router.delete(
    "/{schedule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete medication schedule",
    description="Deletes a specific dosing schedule with strict ownership verification."
)
def delete_schedule(
    medicine_id: uuid.UUID,
    schedule_id: uuid.UUID,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    delete_medication_schedule(db, patient_id, medicine_id, schedule_id)
    return None
