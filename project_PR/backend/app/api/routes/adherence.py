import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import User, PatientProfile
from app.schemas.user import UserRole
from app.schemas.adherence import (
    AdherenceSummaryResponse,
    MedicationAdherenceResponse,
    MedicationHistoryResponse,
)
from app.services.adherence_service import (
    calculate_today_adherence,
    calculate_week_adherence,
    calculate_month_adherence,
    calculate_custom_range_adherence,
    calculate_medication_adherence,
    get_medication_history,
)

router = APIRouter(prefix="/patients/me", tags=["Medication Adherence & History"])


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


@router.get(
    "/adherence/today",
    response_model=AdherenceSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get today's adherence",
    description="Calculates adherence statistics for today in the application timezone."
)
def get_today_adherence(
    medicine_id: Optional[uuid.UUID] = Query(None, description="Optional medication ID filter"),
    patient_and_user: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    patient_id, _ = patient_and_user
    return calculate_today_adherence(db, patient_id=patient_id, medicine_id=medicine_id)


@router.get(
    "/adherence/week",
    response_model=AdherenceSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current week's adherence",
    description="Calculates adherence statistics for the current week (Monday to Sunday) in the application timezone."
)
def get_week_adherence(
    medicine_id: Optional[uuid.UUID] = Query(None, description="Optional medication ID filter"),
    patient_and_user: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    patient_id, _ = patient_and_user
    return calculate_week_adherence(db, patient_id=patient_id, medicine_id=medicine_id)


@router.get(
    "/adherence/month",
    response_model=AdherenceSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current month's adherence",
    description="Calculates adherence statistics for the current calendar month in the application timezone."
)
def get_month_adherence(
    medicine_id: Optional[uuid.UUID] = Query(None, description="Optional medication ID filter"),
    patient_and_user: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    patient_id, _ = patient_and_user
    return calculate_month_adherence(db, patient_id=patient_id, medicine_id=medicine_id)


@router.get(
    "/adherence/medications",
    response_model=MedicationAdherenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get medication-specific adherence",
    description="Calculates adherence grouped by each of the patient's individual medications."
)
def get_medication_specific_adherence(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    medicine_id: Optional[uuid.UUID] = Query(None, description="Optional medication ID filter"),
    patient_and_user: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    patient_id, _ = patient_and_user
    return calculate_medication_adherence(
        db,
        patient_id=patient_id,
        start_date=start_date,
        end_date=end_date,
        medicine_id=medicine_id,
    )


@router.get(
    "/adherence/by-medication",
    response_model=MedicationAdherenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Alias for medication-specific adherence",
    description="Alias for /adherence/medications."
)
def get_by_medication_adherence(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    medicine_id: Optional[uuid.UUID] = Query(None, description="Optional medication ID filter"),
    patient_and_user: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    patient_id, _ = patient_and_user
    return calculate_medication_adherence(
        db,
        patient_id=patient_id,
        start_date=start_date,
        end_date=end_date,
        medicine_id=medicine_id,
    )


@router.get(
    "/adherence",
    response_model=AdherenceSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get adherence for custom range or default today",
    description="Calculates adherence statistics for a custom date range (start_date to end_date). Defaults to today if omitted."
)
def get_custom_or_default_adherence(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    medicine_id: Optional[uuid.UUID] = Query(None, description="Optional medication ID filter"),
    patient_and_user: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    patient_id, _ = patient_and_user

    if start_date is not None and end_date is not None:
        return calculate_custom_range_adherence(
            db,
            patient_id=patient_id,
            start_date=start_date,
            end_date=end_date,
            medicine_id=medicine_id,
        )
    elif start_date is not None:
        return calculate_custom_range_adherence(
            db,
            patient_id=patient_id,
            start_date=start_date,
            end_date=start_date,
            medicine_id=medicine_id,
        )
    elif end_date is not None:
        return calculate_custom_range_adherence(
            db,
            patient_id=patient_id,
            start_date=end_date,
            end_date=end_date,
            medicine_id=medicine_id,
        )
    else:
        return calculate_today_adherence(
            db,
            patient_id=patient_id,
            medicine_id=medicine_id,
        )


@router.get(
    "/medication-history",
    response_model=MedicationHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get medication dose history",
    description="Retrieves medication dose history for the authenticated patient with optional date range, medicine, and status filters."
)
def get_patient_medication_history(
    start_date: Optional[date] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date filter (YYYY-MM-DD)"),
    medicine_id: Optional[uuid.UUID] = Query(None, description="Filter by patient medication or medicine ID"),
    status: Optional[str] = Query(None, description="Filter by status (e.g. TAKEN, SKIPPED, PENDING)"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return (1-500)"),
    offset: int = Query(0, ge=0, description="Records offset for pagination"),
    patient_and_user: tuple[uuid.UUID, uuid.UUID] = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    patient_id, _ = patient_and_user
    return get_medication_history(
        db,
        patient_id=patient_id,
        start_date=start_date,
        end_date=end_date,
        medicine_id=medicine_id,
        status_filter=status,
        limit=limit,
        offset=offset,
    )
