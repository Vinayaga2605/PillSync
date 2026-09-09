import base64
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.crud.module7_crud import log_notification
from app.crud.notification_crud import create_notification
from app.database import get_db
from app.dependencies.auth_dependency import get_current_user
from app.models.medication_schedule import MedicationSchedule
from app.models.medicine import Medicine
from app.models.module7 import OCRUpload, SystemLog
from app.models.prescription_scan import PrescriptionScan, PrescriptionScanItem
from app.models.user import User
from app.schemas.prescription_schema import (
    ConfirmPrescriptionRequest,
    PrescriptionItemOut,
    PrescriptionScanOut,
    ScanItemUpdate,
)
from app.services.ocr_service import process_prescription_ocr

router = APIRouter(
    prefix="/api/prescriptions",
    tags=["Prescriptions"]
)

# Upload directory outside frontend static files
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "prescriptions")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class CameraScanRequest(BaseModel):
    image_data: str  # Base64 dataURL string


@router.post("/upload", response_model=PrescriptionScanOut)
async def upload_prescription_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Option A: File Upload Endpoint (PNG, JPG, JPEG, TIFF)
    """
    if user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can scan prescription images."
        )

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".tiff", ".tif"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image format. Please upload JPG, PNG, or TIFF."
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload or capture a prescription image."
        )

    # Generate safe non-clashing filename
    safe_filename = f"scan_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, safe_filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    start_time = os.times().elapsed
    try:
        scan = process_prescription_ocr(db, user.id, contents, safe_filename)
        elapsed_ms = int((os.times().elapsed - start_time) * 1000)

        # Log to OCR uploads for admin analytics
        db.add(OCRUpload(
            patient_id=user.id,
            user_id=user.id,
            filename=safe_filename,
            status="success",
            items_detected=len(scan.items),
            processing_time_ms=max(elapsed_ms, 120)
        ))
        db.commit()
        db.refresh(scan)
        return scan
    except Exception as e:
        db.add(OCRUpload(
            patient_id=user.id,
            user_id=user.id,
            filename=safe_filename,
            status="failed",
            items_detected=0,
            processing_time_ms=300
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"We couldn't read the prescription clearly. Please retake photo with better lighting. Error: {str(e)}"
        )


@router.post("/camera", response_model=PrescriptionScanOut)
async def scan_prescription_camera(
    payload: CameraScanRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Option B: Camera Photo Capture Endpoint
    """
    if user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can scan prescription images."
        )

    image_str = payload.image_data
    if "," in image_str:
        image_str = image_str.split(",")[1]

    try:
        image_bytes = base64.b64decode(image_str)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image encoding from camera capture."
        )

    safe_filename = f"camera_{uuid.uuid4().hex}.png"
    filepath = os.path.join(UPLOAD_DIR, safe_filename)

    with open(filepath, "wb") as f:
        f.write(image_bytes)

    try:
        scan = process_prescription_ocr(db, user.id, image_bytes, safe_filename)
        db.add(OCRUpload(
            patient_id=user.id,
            user_id=user.id,
            filename=safe_filename,
            status="success",
            items_detected=len(scan.items),
            processing_time_ms=180
        ))
        db.commit()
        db.refresh(scan)
        return scan
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"We couldn't process the captured prescription. Please retake the photo. Detail: {str(e)}"
        )


@router.get("/{scan_id}", response_model=PrescriptionScanOut)
def get_prescription_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Fetch temporary scan review state by ID. Ensures user ownership.
    """
    scan = db.query(PrescriptionScan).filter(PrescriptionScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Prescription scan not found.")

    if scan.patient_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized access to prescription scan.")

    return scan


@router.patch("/{scan_id}/items/{item_id}", response_model=PrescriptionItemOut)
def update_scan_item(
    scan_id: int,
    item_id: int,
    payload: ScanItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Edit temporary item before confirmation (medicine selection, dosage, time, selected check).
    """
    scan = db.query(PrescriptionScan).filter(PrescriptionScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found.")

    if scan.patient_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized edit of prescription item.")

    item = db.query(PrescriptionScanItem).filter(
        PrescriptionScanItem.id == item_id,
        PrescriptionScanItem.scan_id == scan_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Prescription item not found.")

    if payload.selected is not None:
        item.selected = payload.selected
    if payload.medicine_id is not None:
        med = db.query(Medicine).filter(Medicine.id == payload.medicine_id).first()
        if med:
            item.medicine_id = med.id
            item.matched_name = med.name
    if payload.matched_name is not None:
        item.matched_name = payload.matched_name
    if payload.strength is not None:
        item.strength = payload.strength
    if payload.dosage_form is not None:
        item.dosage_form = payload.dosage_form
    if payload.frequency is not None:
        item.frequency = payload.frequency
    if payload.duration is not None:
        item.duration = payload.duration
    if payload.instructions is not None:
        item.instructions = payload.instructions

    db.commit()
    db.refresh(item)
    return item


@router.post("/{scan_id}/confirm")
def confirm_prescription_scan(
    scan_id: int,
    payload: ConfirmPrescriptionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Confirms selected temporary medicines and creates permanent MedicationSchedule entries.
    """
    scan = db.query(PrescriptionScan).filter(PrescriptionScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Prescription scan not found.")

    if scan.patient_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized confirmation of prescription scan.")

    created_schedules = []

    for item_data in payload.items:
        if not item_data.selected:
            continue

        item = db.query(PrescriptionScanItem).filter(
            PrescriptionScanItem.id == item_data.scan_item_id,
            PrescriptionScanItem.scan_id == scan_id
        ).first()

        if item:
            item.selected = True

        medicine = db.query(Medicine).filter(Medicine.id == item_data.medicine_id).first()
        if not medicine:
            continue

        # Convert frequency or user selection to valid time_of_day
        time_of_day = (item_data.time_of_day or "morning").lower()
        if time_of_day not in ["morning", "afternoon", "evening", "night"]:
            time_of_day = "morning"

        # Check existing schedule to avoid exact duplicates
        existing = db.query(MedicationSchedule).filter(
            MedicationSchedule.patient_id == user.id,
            MedicationSchedule.medicine_id == medicine.id,
            MedicationSchedule.time_of_day == time_of_day,
            MedicationSchedule.is_active == True  # noqa: E712
        ).first()

        if not existing:
            schedule = MedicationSchedule(
                patient_id=user.id,
                medicine_id=medicine.id,
                dosage=item_data.dosage or item.strength or "500 mg",
                time_of_day=time_of_day,
                notes=item_data.notes or (item.instructions if item else "Added via OCR scan"),
                is_active=True
            )
            db.add(schedule)
            db.flush()
            created_schedules.append(schedule)

    scan.status = "CONFIRMED"
    
    # Audit log
    db.add(SystemLog(
        user_id=user.id,
        action="CONFIRM_OCR_SCAN",
        entity="prescription_scans",
        entity_id=scan.id,
        details=f"Confirmed {len(created_schedules)} medicines from scan #{scan.id}"
    ))

    # Send confirmation notification
    conf_msg = f"Prescription scan #{scan.id} confirmed: {len(created_schedules)} new medicines added to your schedule."
    create_notification(db, user_id=user.id, patient_id=user.id, type="confirmation", message=conf_msg)
    log_notification(db, user_id=user.id, channel="push", type="confirmation", message=conf_msg)

    db.commit()

    return {
        "scan_id": scan.id,
        "status": "CONFIRMED",
        "added_count": len(created_schedules),
        "message": f"Successfully added {len(created_schedules)} medicines to your active schedule."
    }
