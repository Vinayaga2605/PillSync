import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import User, PatientProfile
from app.models.medicine import PatientMedication
from app.schemas.user import UserRole
from app.schemas.refill import (
    MedicineRefillPrediction,
    PatientRefillSummaryResponse,
)
from app.services.refill_service import (
    get_patient_refill_predictions,
    get_medicine_refill_prediction,
)

router = APIRouter(tags=["Refill Predictions"])


def get_current_patient_id(
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
    db: Session = Depends(get_db)
) -> uuid.UUID:
    """
    Resolves the PatientProfile.id associated with the authenticated patient user.
    Strictly derives patient identity from JWT.
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
    "/patients/me/refill-predictions",
    response_model=PatientRefillSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get AI refill predictions for patient medications",
    description="Continuously estimates average daily consumption, remaining days of supply, depletion date, and recommended refill date based on stock and actual TAKEN doses."
)
def get_my_refill_predictions(
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return get_patient_refill_predictions(db, patient_id)


# Alias routes for /patients/me/refills/predictions
@router.get(
    "/patients/me/refills/predictions",
    response_model=PatientRefillSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get AI refill predictions (alias)",
)
def get_my_refill_predictions_alias(
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return get_patient_refill_predictions(db, patient_id)


@router.get(
    "/patients/me/refills/medicines/{medicine_id}",
    response_model=MedicineRefillPrediction,
    status_code=status.HTTP_200_OK,
    summary="Get refill prediction for a specific medication",
    description="Returns consumption analysis, estimated depletion date, and refill recommendation for a single medication."
)
def get_single_medicine_refill_prediction(
    medicine_id: uuid.UUID,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    medication = db.execute(
        select(PatientMedication).where(
            PatientMedication.id == medicine_id,
            PatientMedication.patient_id == patient_id
        )
    ).scalar_one_or_none()

    if not medication:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication record not found"
        )

    return get_medicine_refill_prediction(db, medication)
