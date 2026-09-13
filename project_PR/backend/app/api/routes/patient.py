import uuid
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import User, PatientProfile
from app.schemas.user import UserRole
from app.schemas.patient import PatientProfileResponse, PatientProfileUpdateRequest
from app.schemas.medication_intelligence import (
    PatientMedicationIntelligenceResponse,
    PatientMedicationHistoryResponse,
)
from app.schemas.medication_suggestions import PatientMedicationSuggestionsResponse
from app.services.patient_service import get_patient_profile, update_patient_profile
from app.services import medication_intelligence_service, medication_suggestion_service

router = APIRouter(prefix="/patients", tags=["Patient Profile & Intelligence"])


def _get_patient_profile_id(current_user: User, db: Session) -> uuid.UUID:
    """Helper to ensure and retrieve patient profile ID."""
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
    "/me/profile",
    response_model=PatientProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated patient profile",
    description="Retrieves the detailed patient profile for the currently authenticated patient. Requires PATIENT role."
)
def get_my_patient_profile(
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
    db: Session = Depends(get_db)
):
    """
    Returns the patient profile associated with the authenticated patient session.
    """
    return get_patient_profile(db, current_user)


@router.patch(
    "/me/profile",
    response_model=PatientProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Update authenticated patient profile",
    description="Partially updates the patient profile and contact info for the currently authenticated patient. Requires PATIENT role."
)
def update_my_patient_profile(
    request: PatientProfileUpdateRequest,
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
    db: Session = Depends(get_db)
):
    """
    Updates patient profile attributes for the authenticated patient session.
    """
    return update_patient_profile(db, current_user, request)


@router.get(
    "/me/intelligence/summary",
    response_model=PatientMedicationIntelligenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get smart medication intelligence and adherence insights",
    description="Analyzes medication schedules, dose histories, and adherence velocity to generate explainable medication-management insights and attention indicators. Requires PATIENT role."
)
def get_my_medication_intelligence(
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
    db: Session = Depends(get_db)
):
    """
    Computes explainable medication intelligence and attention scores for the authenticated patient.
    """
    patient_id = _get_patient_profile_id(current_user, db)
    return medication_intelligence_service.get_patient_intelligence_summary(db, patient_id)


@router.get(
    "/me/intelligence/history",
    response_model=PatientMedicationHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get long-term historical medication intelligence and adherence trends",
    description="Provides daily and weekly historical adherence timelines, medication-level performance, and period comparisons over 7, 30, or 90 days. Requires PATIENT role."
)
def get_my_medication_intelligence_history(
    days: int = Query(30, description="Historical period in days (7, 30, or 90)"),
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
    db: Session = Depends(get_db)
):
    """
    Computes historical medication-taking intelligence for the authenticated patient over 7, 30, or 90 days.
    """
    patient_id = _get_patient_profile_id(current_user, db)
    return medication_intelligence_service.get_patient_intelligence_history(db, patient_id, days=days)


@router.get(
    "/me/intelligence/suggestions",
    response_model=PatientMedicationSuggestionsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get actionable, non-clinical medication management suggestions",
    description="Provides deterministic, explainable medication management suggestions derived from recorded adherence patterns. Requires PATIENT role."
)
def get_my_medication_intelligence_suggestions(
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
    db: Session = Depends(get_db)
):
    """
    Generates actionable, non-clinical medication management suggestions for the authenticated patient.
    """
    patient_id = _get_patient_profile_id(current_user, db)
    return medication_suggestion_service.get_patient_medication_suggestions(db, patient_id)


