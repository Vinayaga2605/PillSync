import uuid
import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.medicine import Medicine, PatientMedication
from app.schemas.medicine import (
    MedicineCreateRequest,
    MedicineUpdateRequest,
    MedicineResponse,
    StockUpdateRequest,
    StockAddRequest,
    StockConsumeRequest,
    StockResponse,
    compute_stock_status,
)

logger = logging.getLogger("pillsync.medicine")


def _to_medicine_response(med: PatientMedication) -> MedicineResponse:
    """Helper to convert a PatientMedication model instance to a MedicineResponse schema."""
    resolved_name = med.custom_medicine_name or (med.medicine.name if med.medicine else "Unknown Medicine")
    generic_name = med.medicine.generic_name if med.medicine else None
    stock_unit = med.stock_unit or med.dosage_unit
    current_qty = med.current_quantity if med.current_quantity is not None else Decimal("0.0")
    initial_qty = med.initial_quantity if med.initial_quantity is not None else Decimal("0.0")
    qty_per_dose = med.quantity_per_dose if med.quantity_per_dose is not None else Decimal("1.0")
    low_stock_thresh = med.low_stock_threshold if med.low_stock_threshold is not None else Decimal("5.0")
    stock_status = compute_stock_status(current_qty, low_stock_thresh)

    return MedicineResponse(
        id=med.id,
        patient_id=med.patient_id,
        medicine_id=med.medicine_id,
        name=resolved_name,
        generic_name=generic_name,
        dosage_amount=med.dosage_amount,
        dosage_unit=med.dosage_unit,
        instructions=med.instructions,
        start_date=med.start_date,
        end_date=med.end_date,
        is_active=med.is_active,
        initial_quantity=initial_qty,
        current_quantity=current_qty,
        quantity_per_dose=qty_per_dose,
        stock_unit=stock_unit,
        low_stock_threshold=low_stock_thresh,
        stock_status=stock_status,
        created_at=med.created_at,
        updated_at=med.updated_at,
    )


def _to_stock_response(med: PatientMedication) -> StockResponse:
    """Helper to convert a PatientMedication model instance to a StockResponse schema."""
    resolved_name = med.custom_medicine_name or (med.medicine.name if med.medicine else "Unknown Medicine")
    stock_unit = med.stock_unit or med.dosage_unit
    current_qty = med.current_quantity if med.current_quantity is not None else Decimal("0.0")
    initial_qty = med.initial_quantity if med.initial_quantity is not None else Decimal("0.0")
    qty_per_dose = med.quantity_per_dose if med.quantity_per_dose is not None else Decimal("1.0")
    low_stock_thresh = med.low_stock_threshold if med.low_stock_threshold is not None else Decimal("5.0")
    stock_status = compute_stock_status(current_qty, low_stock_thresh)

    return StockResponse(
        medication_id=med.id,
        patient_id=med.patient_id,
        medicine_name=resolved_name,
        initial_quantity=initial_qty,
        current_quantity=current_qty,
        quantity_per_dose=qty_per_dose,
        stock_unit=stock_unit,
        low_stock_threshold=low_stock_thresh,
        stock_status=stock_status,
        updated_at=med.updated_at,
    )


def create_patient_medicine(
    db: Session, patient_id: uuid.UUID, data: MedicineCreateRequest
) -> MedicineResponse:
    """
    Creates a new patient medication record for the authenticated patient.
    """
    # Link or record catalog medicine if generic/catalog details are present
    medicine_catalog_id = None
    if data.name:
        catalog_entry = db.execute(
            select(Medicine).where(Medicine.name.ilike(data.name.strip()))
        ).scalars().first()

        if not catalog_entry:
            catalog_entry = Medicine(
                name=data.name.strip(),
                generic_name=data.generic_name.strip() if data.generic_name else None,
                category="Prescription/OTC",
                is_active=True,
            )
            db.add(catalog_entry)
            db.flush()
        medicine_catalog_id = catalog_entry.id

    # Stock fields initialization
    init_qty = data.initial_quantity if data.initial_quantity is not None else (data.current_quantity or Decimal("0.0"))
    curr_qty = data.current_quantity if data.current_quantity is not None else (data.initial_quantity or Decimal("0.0"))
    stock_unit = (data.stock_unit.strip() if data.stock_unit else None) or data.dosage_unit.strip()
    qty_per_dose = data.quantity_per_dose if data.quantity_per_dose is not None else Decimal("1.0")
    low_stock_thresh = data.low_stock_threshold if data.low_stock_threshold is not None else Decimal("5.0")

    new_med = PatientMedication(
        patient_id=patient_id,
        medicine_id=medicine_catalog_id,
        custom_medicine_name=data.name.strip(),
        dosage_amount=data.dosage_amount,
        dosage_unit=data.dosage_unit.strip(),
        instructions=data.instructions.strip() if data.instructions else None,
        start_date=data.start_date or date.today(),
        end_date=data.end_date,
        is_active=data.is_active,
        initial_quantity=init_qty,
        current_quantity=curr_qty,
        quantity_per_dose=qty_per_dose,
        stock_unit=stock_unit,
        low_stock_threshold=low_stock_thresh,
    )

    db.add(new_med)
    try:
        db.commit()
        db.refresh(new_med)
        logger.info(f"Created patient medication: id={new_med.id} for patient_id={patient_id} with stock={curr_qty}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating patient medication: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save medicine record",
        )

    return _to_medicine_response(new_med)


def get_patient_medicines(
    db: Session, patient_id: uuid.UUID
) -> List[MedicineResponse]:
    """
    Lists all medications belonging to the authenticated patient, newest first.
    """
    medications = db.execute(
        select(PatientMedication)
        .options(joinedload(PatientMedication.medicine))
        .where(PatientMedication.patient_id == patient_id)
        .order_by(PatientMedication.created_at.desc())
    ).scalars().all()

    return [_to_medicine_response(m) for m in medications]


def get_patient_medicine_by_id(
    db: Session, patient_id: uuid.UUID, medicine_id: uuid.UUID
) -> MedicineResponse:
    """
    Retrieves a single medication with strict patient ownership check.
    Returns HTTP 404 if not found or if the medicine belongs to another patient.
    """
    med = db.execute(
        select(PatientMedication)
        .options(joinedload(PatientMedication.medicine))
        .where(
            PatientMedication.id == medicine_id,
            PatientMedication.patient_id == patient_id,
        )
    ).scalars().first()

    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine record not found",
        )

    return _to_medicine_response(med)


def update_patient_medicine(
    db: Session,
    patient_id: uuid.UUID,
    medicine_id: uuid.UUID,
    data: MedicineUpdateRequest,
) -> MedicineResponse:
    """
    Partially updates a patient medication record with strict ownership check.
    """
    med = db.execute(
        select(PatientMedication)
        .options(joinedload(PatientMedication.medicine))
        .where(
            PatientMedication.id == medicine_id,
            PatientMedication.patient_id == patient_id,
        )
    ).scalars().first()

    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine record not found",
        )

    update_dict = data.model_dump(exclude_unset=True)

    # Validate composite date constraints before mutating
    new_start = update_dict.get("start_date") or med.start_date
    new_end = update_dict["end_date"] if "end_date" in update_dict else med.end_date
    if new_end and new_start and new_end < new_start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="End date cannot be earlier than start date",
        )

    if "name" in update_dict and update_dict["name"] is not None:
        med.custom_medicine_name = update_dict["name"]
    if "dosage_amount" in update_dict and update_dict["dosage_amount"] is not None:
        med.dosage_amount = update_dict["dosage_amount"]
    if "dosage_unit" in update_dict and update_dict["dosage_unit"] is not None:
        med.dosage_unit = update_dict["dosage_unit"]
    if "instructions" in update_dict:
        med.instructions = update_dict["instructions"]
    if "start_date" in update_dict and update_dict["start_date"] is not None:
        med.start_date = update_dict["start_date"]
    if "end_date" in update_dict:
        med.end_date = update_dict["end_date"]
    if "is_active" in update_dict and update_dict["is_active"] is not None:
        med.is_active = update_dict["is_active"]

    # Stock fields update
    if "initial_quantity" in update_dict and update_dict["initial_quantity"] is not None:
        med.initial_quantity = update_dict["initial_quantity"]
    if "current_quantity" in update_dict and update_dict["current_quantity"] is not None:
        med.current_quantity = update_dict["current_quantity"]
    if "quantity_per_dose" in update_dict and update_dict["quantity_per_dose"] is not None:
        med.quantity_per_dose = update_dict["quantity_per_dose"]
    if "stock_unit" in update_dict and update_dict["stock_unit"] is not None:
        med.stock_unit = update_dict["stock_unit"]
    if "low_stock_threshold" in update_dict and update_dict["low_stock_threshold"] is not None:
        med.low_stock_threshold = update_dict["low_stock_threshold"]

    if "name" in update_dict or "generic_name" in update_dict:
        name_to_use = med.custom_medicine_name or (med.medicine.name if med.medicine else None)
        generic_to_use = update_dict.get("generic_name") or (med.medicine.generic_name if med.medicine else None)
        if name_to_use:
            catalog_entry = db.execute(
                select(Medicine).where(Medicine.name.ilike(name_to_use.strip()))
            ).scalars().first()
            if not catalog_entry:
                catalog_entry = Medicine(
                    name=name_to_use.strip(),
                    generic_name=generic_to_use.strip() if generic_to_use else None,
                    category="Prescription/OTC",
                    is_active=True,
                )
                db.add(catalog_entry)
                db.flush()
            elif "generic_name" in update_dict and update_dict["generic_name"]:
                catalog_entry.generic_name = update_dict["generic_name"].strip()
            med.medicine_id = catalog_entry.id
            med.medicine = catalog_entry

    try:
        db.commit()
        db.refresh(med)
        logger.info(f"Updated patient medication: id={med.id} for patient_id={patient_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating medication: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update medicine record",
        )

    return _to_medicine_response(med)


def delete_patient_medicine(
    db: Session, patient_id: uuid.UUID, medicine_id: uuid.UUID
) -> None:
    """
    Deletes a patient medication record with strict ownership check.
    """
    med = db.execute(
        select(PatientMedication).where(
            PatientMedication.id == medicine_id,
            PatientMedication.patient_id == patient_id,
        )
    ).scalars().first()

    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine record not found",
        )

    try:
        db.delete(med)
        db.commit()
        logger.info(f"Deleted patient medication: id={medicine_id} for patient_id={patient_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting medication: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete medicine record",
        )


# =========================================================================
# Feature 18: Dedicated Stock / Inventory Management Service Functions
# =========================================================================

def get_patient_medicine_stock(
    db: Session, patient_id: uuid.UUID, medicine_id: uuid.UUID
) -> StockResponse:
    """
    Retrieves inventory stock info for a medication with strict patient ownership check.
    """
    med = db.execute(
        select(PatientMedication)
        .options(joinedload(PatientMedication.medicine))
        .where(
            PatientMedication.id == medicine_id,
            PatientMedication.patient_id == patient_id,
        )
    ).scalars().first()

    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine record not found",
        )

    return _to_stock_response(med)


def update_patient_medicine_stock(
    db: Session,
    patient_id: uuid.UUID,
    medicine_id: uuid.UUID,
    data: StockUpdateRequest,
) -> StockResponse:
    """
    Manually updates stock levels (e.g. current_quantity, initial_quantity, quantity_per_dose, etc.)
    with strict ownership check.
    """
    med = db.execute(
        select(PatientMedication)
        .options(joinedload(PatientMedication.medicine))
        .where(
            PatientMedication.id == medicine_id,
            PatientMedication.patient_id == patient_id,
        )
    ).scalars().first()

    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine record not found",
        )

    update_dict = data.model_dump(exclude_unset=True)

    if "current_quantity" in update_dict and update_dict["current_quantity"] is not None:
        if update_dict["current_quantity"] < Decimal("0.0"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Current quantity cannot be negative",
            )
        med.current_quantity = update_dict["current_quantity"]

    if "initial_quantity" in update_dict and update_dict["initial_quantity"] is not None:
        if update_dict["initial_quantity"] < Decimal("0.0"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Initial quantity cannot be negative",
            )
        med.initial_quantity = update_dict["initial_quantity"]

    if "quantity_per_dose" in update_dict and update_dict["quantity_per_dose"] is not None:
        if update_dict["quantity_per_dose"] <= Decimal("0.0"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Quantity per dose must be greater than zero",
            )
        med.quantity_per_dose = update_dict["quantity_per_dose"]

    if "stock_unit" in update_dict and update_dict["stock_unit"] is not None:
        med.stock_unit = update_dict["stock_unit"]

    if "low_stock_threshold" in update_dict and update_dict["low_stock_threshold"] is not None:
        if update_dict["low_stock_threshold"] < Decimal("0.0"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Low stock threshold cannot be negative",
            )
        med.low_stock_threshold = update_dict["low_stock_threshold"]

    try:
        db.commit()
        db.refresh(med)
        logger.info(f"Updated stock for medication {med.id}: current_quantity={med.current_quantity}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating medication stock: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update stock information",
        )

    return _to_stock_response(med)


def add_patient_medicine_stock(
    db: Session,
    patient_id: uuid.UUID,
    medicine_id: uuid.UUID,
    data: StockAddRequest,
) -> StockResponse:
    """
    Adds quantity to current stock with strict ownership check.
    """
    if data.quantity <= Decimal("0.0"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Quantity to add must be greater than zero",
        )

    med = db.execute(
        select(PatientMedication)
        .options(joinedload(PatientMedication.medicine))
        .where(
            PatientMedication.id == medicine_id,
            PatientMedication.patient_id == patient_id,
        )
    ).scalars().first()

    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine record not found",
        )

    existing_qty = med.current_quantity if med.current_quantity is not None else Decimal("0.0")
    med.current_quantity = existing_qty + data.quantity

    try:
        db.commit()
        db.refresh(med)
        logger.info(f"Added {data.quantity} stock to medication {med.id}, new total: {med.current_quantity}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding medication stock: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add stock",
        )

    return _to_stock_response(med)


def consume_patient_medicine_stock(
    db: Session,
    patient_id: uuid.UUID,
    medicine_id: uuid.UUID,
    data: StockConsumeRequest,
) -> StockResponse:
    """
    Manually consumes/deducts stock for a medication.
    Deducts data.quantity (or quantity_per_dose if omitted).
    Prevents stock from becoming negative (clamped at 0.0).
    """
    med = db.execute(
        select(PatientMedication)
        .options(joinedload(PatientMedication.medicine))
        .where(
            PatientMedication.id == medicine_id,
            PatientMedication.patient_id == patient_id,
        )
    ).scalars().first()

    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine record not found",
        )

    qty_to_consume = data.quantity if (data and data.quantity is not None) else (med.quantity_per_dose or Decimal("1.0"))
    if qty_to_consume <= Decimal("0.0"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Quantity to consume must be greater than zero",
        )

    existing_qty = med.current_quantity if med.current_quantity is not None else Decimal("0.0")
    new_qty = max(Decimal("0.0"), existing_qty - qty_to_consume)
    med.current_quantity = new_qty

    try:
        db.commit()
        db.refresh(med)
        logger.info(f"Consumed {qty_to_consume} stock from medication {med.id}, remaining: {med.current_quantity}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error consuming medication stock: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to consume stock",
        )

    return _to_stock_response(med)
