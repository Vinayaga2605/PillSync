import uuid
from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import User, PatientProfile
from app.schemas.user import UserRole
from app.schemas.medicine import (
    MedicineCreateRequest,
    MedicineUpdateRequest,
    MedicineResponse,
    StockUpdateRequest,
    StockAddRequest,
    StockConsumeRequest,
    StockResponse,
)
from app.services.medicine_service import (
    create_patient_medicine,
    get_patient_medicines,
    get_patient_medicine_by_id,
    update_patient_medicine,
    delete_patient_medicine,
    get_patient_medicine_stock,
    update_patient_medicine_stock,
    add_patient_medicine_stock,
    consume_patient_medicine_stock,
)

router = APIRouter(prefix="/patients/me/medicines", tags=["Medicine Management"])
medications_alias_router = APIRouter(prefix="/medications", tags=["Medication Stock"])


def get_current_patient_id(
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
    db: Session = Depends(get_db)
) -> uuid.UUID:
    """
    Resolves the PatientProfile.id associated with the authenticated patient.
    """
    if current_user.patient_profile:
        return current_user.patient_profile.id

    # Fallback lookup / auto-initialization
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
    response_model=MedicineResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new medicine",
    description="Adds a new medicine record belonging strictly to the authenticated patient."
)
def add_medicine(
    request: MedicineCreateRequest,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return create_patient_medicine(db, patient_id, request)


@router.get(
    "",
    response_model=List[MedicineResponse],
    status_code=status.HTTP_200_OK,
    summary="List patient medicines",
    description="Returns all medication records belonging to the authenticated patient, newest first."
)
def list_medicines(
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return get_patient_medicines(db, patient_id)


@router.get(
    "/{medicine_id}",
    response_model=MedicineResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single medicine",
    description="Retrieves a specific medicine record with strict ownership verification (returns 404 if unauthorized or not found)."
)
def get_medicine(
    medicine_id: uuid.UUID,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return get_patient_medicine_by_id(db, patient_id, medicine_id)


@router.patch(
    "/{medicine_id}",
    response_model=MedicineResponse,
    status_code=status.HTTP_200_OK,
    summary="Update medicine details",
    description="Partially updates a specific medicine record with strict ownership verification."
)
def update_medicine(
    medicine_id: uuid.UUID,
    request: MedicineUpdateRequest,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return update_patient_medicine(db, patient_id, medicine_id, request)


@router.delete(
    "/{medicine_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete medicine",
    description="Deletes a specific medicine record with strict ownership verification."
)
def delete_medicine(
    medicine_id: uuid.UUID,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    delete_patient_medicine(db, patient_id, medicine_id)
    return None


# =========================================================================
# Feature 18: Stock and Inventory API Endpoints
# =========================================================================

@router.get(
    "/{medicine_id}/stock",
    response_model=StockResponse,
    status_code=status.HTTP_200_OK,
    summary="Get medication stock",
    description="Retrieves current inventory stock and status for a specific medication."
)
def get_stock(
    medicine_id: uuid.UUID,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return get_patient_medicine_stock(db, patient_id, medicine_id)


@router.patch(
    "/{medicine_id}/stock",
    response_model=StockResponse,
    status_code=status.HTTP_200_OK,
    summary="Update medication stock",
    description="Manually updates stock levels (e.g. current_quantity, initial_quantity, quantity_per_dose)."
)
def update_stock(
    medicine_id: uuid.UUID,
    request: StockUpdateRequest,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return update_patient_medicine_stock(db, patient_id, medicine_id, request)


@router.post(
    "/{medicine_id}/stock/add",
    response_model=StockResponse,
    status_code=status.HTTP_200_OK,
    summary="Add stock to medication",
    description="Adds positive quantity to current medication stock."
)
def add_stock(
    medicine_id: uuid.UUID,
    request: StockAddRequest,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return add_patient_medicine_stock(db, patient_id, medicine_id, request)


@router.post(
    "/{medicine_id}/stock/consume",
    response_model=StockResponse,
    status_code=status.HTTP_200_OK,
    summary="Consume medication stock",
    description="Consumes quantity from medication stock (defaults to quantity_per_dose), preventing negative stock."
)
def consume_stock(
    medicine_id: uuid.UUID,
    request: StockConsumeRequest = StockConsumeRequest(),
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return consume_patient_medicine_stock(db, patient_id, medicine_id, request)


# =========================================================================
# Route Aliases for /api/medications/{medication_id}/stock...
# =========================================================================

@medications_alias_router.get(
    "/{medication_id}/stock",
    response_model=StockResponse,
    status_code=status.HTTP_200_OK,
    summary="Get medication stock (alias)",
)
def alias_get_stock(
    medication_id: uuid.UUID,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return get_patient_medicine_stock(db, patient_id, medication_id)


@medications_alias_router.patch(
    "/{medication_id}/stock",
    response_model=StockResponse,
    status_code=status.HTTP_200_OK,
    summary="Update medication stock (alias)",
)
def alias_update_stock(
    medication_id: uuid.UUID,
    request: StockUpdateRequest,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return update_patient_medicine_stock(db, patient_id, medication_id, request)


@medications_alias_router.post(
    "/{medication_id}/stock/add",
    response_model=StockResponse,
    status_code=status.HTTP_200_OK,
    summary="Add stock to medication (alias)",
)
def alias_add_stock(
    medication_id: uuid.UUID,
    request: StockAddRequest,
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return add_patient_medicine_stock(db, patient_id, medication_id, request)


@medications_alias_router.post(
    "/{medication_id}/stock/consume",
    response_model=StockResponse,
    status_code=status.HTTP_200_OK,
    summary="Consume medication stock (alias)",
)
def alias_consume_stock(
    medication_id: uuid.UUID,
    request: StockConsumeRequest = StockConsumeRequest(),
    patient_id: uuid.UUID = Depends(get_current_patient_id),
    db: Session = Depends(get_db)
):
    return consume_patient_medicine_stock(db, patient_id, medication_id, request)
