from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth_dependency import require_role

from app.crud.patient_crud import get_caregiver_patients
from app.crud.patient_crud import get_caregiver_requests
from app.crud.patient_crud import accept_caregiver_request
from app.crud.patient_crud import decline_caregiver_request
from app.crud.patient_crud import get_patient_profile
from app.crud.patient_crud import get_patients
from app.crud.notification_crud import create_notification
from app.crud.notification_crud import get_notifications
from app.crud.module7_crud import log_notification

from app.models.user import User
from app.models.module7 import UserAssignment
from app.models.module7 import MedicalCondition
from app.models.caregiver import CaregiverPatient

from app.services.medication_service import get_patient_schedule
from app.services.notification_service import check_missed_doses

from app.utils.adherence import calculate_adherence

router = APIRouter(
    prefix="/api/caregiver",
    tags=["Caregiver"]
)


@router.get("/patients")
def my_patients(
    db: Session = Depends(get_db),
    caregiver=Depends(require_role("caregiver", "admin"))
):
    patients = get_caregiver_patients(db, caregiver.id)
    if caregiver.role and caregiver.role.lower() == "admin" and not patients:
        patients = get_patients(db)

    result = []

    for patient in patients:
        profile = get_patient_profile(db, patient.id)
        schedule = get_patient_schedule(db, patient.id)
        taken = sum(1 for item in schedule if item["taken"])
        stats = calculate_adherence(len(schedule), taken)

        result.append({
            "user_id": patient.id,
            "full_name": patient.full_name,
            "email": patient.email,
            "phone": patient.phone,
            "dob": str(profile.dob) if profile and profile.dob else None,
            "gender": profile.gender if profile else None,
            "blood_group": profile.blood_group if profile else None,
            "emergency_contact": profile.emergency_contact if profile else None,
            "medications": schedule,
            "taken_count": stats["taken"],
            "total_count": stats["scheduled"],
            "missed_count": stats["missed"],
            "adherence_percent": stats["adherence_percentage"],
        })

    return result


@router.get("/patients/{patient_id}/medications")
def patient_medications(
    patient_id: int,
    db: Session = Depends(get_db),
    caregiver=Depends(require_role("caregiver", "admin"))
):
    if caregiver.role and caregiver.role.lower() != "admin":
        patients = get_caregiver_patients(db, caregiver.id)
        patient_ids = {p.id for p in patients}

        if patient_id not in patient_ids:
            raise HTTPException(
                status_code=403,
                detail="This patient is not assigned to you"
            )

    return get_patient_schedule(db, patient_id)


@router.get("/alerts")
def my_alerts(
    db: Session = Depends(get_db),
    caregiver=Depends(require_role("caregiver", "admin"))
):
    check_missed_doses(db, caregiver.id)

    return get_notifications(db, caregiver.id)


def _patient_request_payload(db, assignment, caregiver):
    patient = db.query(User).filter(User.id == assignment.patient_id).first()
    if patient is None:
        return None
    profile = get_patient_profile(db, patient.id)
    schedule = get_patient_schedule(db, patient.id)
    conditions = [
        {
            "condition": c.condition,
            "severity": c.severity,
        }
        for c in db.query(MedicalCondition).filter(
            MedicalCondition.patient_id == patient.id
        ).all()
    ]

    return {
        "user_id": patient.id,
        "full_name": patient.full_name,
        "email": patient.email,
        "phone": patient.phone,
        "dob": str(profile.dob) if profile and profile.dob else None,
        "gender": profile.gender if profile else None,
        "blood_group": profile.blood_group if profile else None,
        "emergency_contact": profile.emergency_contact if profile else None,
        "medication_count": len(schedule),
        "conditions": conditions,
        "requested_at": str(assignment.created_at) if assignment.created_at else None,
    }


@router.get("/requests")
def my_requests(
    db: Session = Depends(get_db),
    caregiver=Depends(require_role("caregiver", "admin"))
):
    requests = get_caregiver_requests(db, caregiver.id)
    if caregiver.role and caregiver.role.lower() == "admin" and not requests:
        requests = (
            db.query(CaregiverPatient)
            .filter(CaregiverPatient.status == "pending")
            .order_by(CaregiverPatient.created_at.asc())
            .all()
        )

    result = []
    for assignment in requests:
        payload = _patient_request_payload(db, assignment, caregiver)
        if payload:
            result.append(payload)

    return result


def _sync_user_assignment(db, caregiver_id, patient_id, status):
    assignment = (
        db.query(UserAssignment)
        .filter(
            UserAssignment.caregiver_id == caregiver_id,
            UserAssignment.patient_id == patient_id,
        )
        .first()
    )
    if assignment is None:
        assignment = UserAssignment(
            caregiver_id=caregiver_id,
            patient_id=patient_id,
            status=status,
        )
        db.add(assignment)
    else:
        assignment.status = status
    db.commit()
    db.refresh(assignment)
    return assignment


@router.post("/requests/{patient_id}/accept")
def accept_request(
    patient_id: int,
    db: Session = Depends(get_db),
    caregiver=Depends(require_role("caregiver", "admin"))
):
    assignment = accept_caregiver_request(db, caregiver.id, patient_id)

    if assignment is None and caregiver.role and caregiver.role.lower() == "admin":
        assignment = (
            db.query(CaregiverPatient)
            .filter(
                CaregiverPatient.patient_id == patient_id,
                CaregiverPatient.status == "pending"
            )
            .first()
        )
        if assignment:
            assignment.status = "active"
            db.commit()
            db.refresh(assignment)

    if assignment is None:
        raise HTTPException(
            status_code=404,
            detail="No pending request from this patient"
        )

    _sync_user_assignment(db, assignment.caregiver_id, patient_id, "active")

    message = (
        f"{caregiver.full_name} accepted your request and is now your caregiver."
    )
    create_notification(
        db,
        user_id=patient_id,
        message=message,
        type="summary",
        patient_id=patient_id,
    )
    log_notification(
        db,
        user_id=patient_id,
        channel="push",
        type="summary",
        message=message,
    )

    return {"message": "Patient request accepted", "status": "active"}


@router.post("/requests/{patient_id}/decline")
def decline_request(
    patient_id: int,
    db: Session = Depends(get_db),
    caregiver=Depends(require_role("caregiver", "admin"))
):
    assignment = decline_caregiver_request(db, caregiver.id, patient_id)

    if assignment is None and caregiver.role and caregiver.role.lower() == "admin":
        assignment = (
            db.query(CaregiverPatient)
            .filter(
                CaregiverPatient.patient_id == patient_id,
                CaregiverPatient.status == "pending"
            )
            .first()
        )
        if assignment:
            assignment.status = "declined"
            db.commit()
            db.refresh(assignment)

    if assignment is None:
        raise HTTPException(
            status_code=404,
            detail="No pending request from this patient"
        )

    _sync_user_assignment(db, assignment.caregiver_id, patient_id, "declined")

    message = (
        f"{caregiver.full_name} declined your caregiver request."
    )
    create_notification(
        db,
        user_id=patient_id,
        message=message,
        type="summary",
        patient_id=patient_id,
    )
    log_notification(
        db,
        user_id=patient_id,
        channel="push",
        type="summary",
        message=message,
    )

    return {"message": "Patient request declined", "status": "declined"}


@router.post("/patients/{patient_id}/add")
def add_patient_to_caregiver(
    patient_id: int,
    db: Session = Depends(get_db),
    caregiver=Depends(require_role("caregiver", "admin"))
):
    patient = db.query(User).filter(User.id == patient_id, User.role == "patient").first()
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient user not found")

    assignment = (
        db.query(CaregiverPatient)
        .filter(
            CaregiverPatient.caregiver_id == caregiver.id,
            CaregiverPatient.patient_id == patient_id,
        )
        .first()
    )

    if assignment is None:
        assignment = CaregiverPatient(
            caregiver_id=caregiver.id,
            patient_id=patient_id,
            status="active"
        )
        db.add(assignment)
    else:
        assignment.status = "active"

    db.commit()
    db.refresh(assignment)

    _sync_user_assignment(db, caregiver.id, patient_id, "active")

    message = f"{caregiver.full_name} added you to their care team."
    create_notification(
        db,
        user_id=patient_id,
        message=message,
        type="summary",
        patient_id=patient_id,
    )

    return {
        "message": f"Patient {patient.full_name} added to your active patient list.",
        "status": "active",
        "patient_id": patient_id,
        "full_name": patient.full_name
    }

