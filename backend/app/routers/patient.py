from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth_dependency import get_current_user
from app.dependencies.auth_dependency import require_role

from app.schemas.patient_schema import PatientOut
from app.schemas.patient_schema import PatientProfileCreate

from app.crud.patient_crud import get_patients
from app.crud.patient_crud import get_patient_profile
from app.crud.patient_crud import upsert_patient_profile
from app.crud.notification_crud import create_notification
from app.crud.module7_crud import log_notification

from app.models.user import User
from app.models.module7 import UserAssignment
from app.models.caregiver import CaregiverPatient

from app.services.medication_service import get_patient_schedule

router = APIRouter(
    prefix="/api/patients",
    tags=["Patients"]
)


def serialize_patient(user: User, profile=None):
    return {
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "dob": str(profile.dob) if profile and profile.dob else None,
        "gender": profile.gender if profile else None,
        "blood_group": profile.blood_group if profile else None,
        "emergency_contact": profile.emergency_contact if profile else None,
    }


@router.get("", response_model=list[PatientOut])
def list_patients(
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "caregiver"))
):
    patients = get_patients(db)
    result = []

    for patient in patients:
        profile = get_patient_profile(db, patient.id)
        result.append(serialize_patient(patient, profile))

    return result


@router.get("/me", response_model=PatientOut)
@router.get("/dashboard")
def my_profile(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    profile = get_patient_profile(db, user.id)
    return serialize_patient(user, profile)



@router.get("/with-medications")
def patients_with_medications(
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "caregiver"))
):
    patients = get_patients(db)
    result = []

    for patient in patients:
        profile = get_patient_profile(db, patient.id)
        schedule = get_patient_schedule(db, patient.id)

        result.append({
            **serialize_patient(patient, profile),
            "medications": schedule,
        })

    return result


@router.post("/me", response_model=PatientOut)
def save_profile(
    data: PatientProfileCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    upsert_patient_profile(
        db,
        user_id=user.id,
        dob=data.dob,
        gender=data.gender,
        blood_group=data.blood_group,
        emergency_contact=data.emergency_contact
    )

    profile = get_patient_profile(db, user.id)
    return serialize_patient(user, profile)


@router.get("/caregivers")
def available_caregivers(
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "caregiver", "patient"))
):
    caregivers = (
        db.query(User)
        .filter(User.role == "caregiver", User.is_active == True)  # noqa: E712
        .order_by(User.full_name.asc())
        .all()
    )
    return [
        {
            "user_id": c.id,
            "full_name": c.full_name,
            "email": c.email,
            "phone": c.phone,
        }
        for c in caregivers
    ]


@router.post("/request-caregiver")
def request_caregiver(
    caregiver_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    if user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can request a caregiver")

    caregiver = db.query(User).filter(User.id == caregiver_id).first()
    if not caregiver or caregiver.role != "caregiver":
        raise HTTPException(status_code=404, detail="Caregiver not found")

    existing = (
        db.query(CaregiverPatient)
        .filter(
            CaregiverPatient.patient_id == user.id,
            CaregiverPatient.caregiver_id == caregiver_id,
            CaregiverPatient.status.in_(["active", "pending"]),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Request already active or pending with this caregiver"
        )

    db.add(CaregiverPatient(
        caregiver_id=caregiver_id,
        patient_id=user.id,
        status="pending",
    ))
    db.commit()

    user_assignment = (
        db.query(UserAssignment)
        .filter(
            UserAssignment.caregiver_id == caregiver_id,
            UserAssignment.patient_id == user.id,
        )
        .first()
    )
    if user_assignment is None:
        db.add(UserAssignment(
            caregiver_id=caregiver_id,
            patient_id=user.id,
            status="pending",
        ))
    else:
        user_assignment.status = "pending"
    db.commit()

    message = (
        f"New request: {user.full_name} would like you to be their caregiver."
    )
    create_notification(
        db,
        user_id=caregiver_id,
        patient_id=user.id,
        type="summary",
        message=message,
    )
    log_notification(
        db,
        user_id=caregiver_id,
        channel="push",
        type="summary",
        message=message,
    )

    return {"message": "Caregiver request sent", "status": "pending"}
