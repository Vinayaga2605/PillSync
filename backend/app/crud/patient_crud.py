from sqlalchemy.orm import Session

from app.models.user import User
from app.models.patient import PatientProfile
from app.models.caregiver import CaregiverPatient


def get_patients(
    db: Session
):
    return (
        db.query(User)
        .filter(User.role == "patient", User.is_active == True)  # noqa: E712
        .order_by(User.full_name.asc())
        .all()
    )


def get_patient_profile(
    db: Session,
    user_id: int
):
    return (
        db.query(PatientProfile)
        .filter(PatientProfile.user_id == user_id)
        .first()
    )


def upsert_patient_profile(
    db: Session,
    user_id: int,
    dob=None,
    gender=None,
    blood_group=None,
    emergency_contact=None
):
    profile = get_patient_profile(db, user_id)

    if profile is None:
        profile = PatientProfile(user_id=user_id)
        db.add(profile)

    if dob is not None:
        profile.dob = dob
    if gender is not None:
        profile.gender = gender
    if blood_group is not None:
        profile.blood_group = blood_group
    if emergency_contact is not None:
        profile.emergency_contact = emergency_contact

    db.commit()
    db.refresh(profile)

    return profile


def get_caregiver_patients(
    db: Session,
    caregiver_id: int
):
    return (
        db.query(User)
        .join(CaregiverPatient, CaregiverPatient.patient_id == User.id)
        .filter(
            CaregiverPatient.caregiver_id == caregiver_id,
            CaregiverPatient.status == "active"
        )
        .order_by(User.full_name.asc())
        .all()
    )


def get_caregiver_requests(
    db: Session,
    caregiver_id: int
):
    return (
        db.query(CaregiverPatient)
        .filter(
            CaregiverPatient.caregiver_id == caregiver_id,
            CaregiverPatient.status == "pending"
        )
        .order_by(CaregiverPatient.created_at.asc())
        .all()
    )


def request_caregiver(
    db: Session,
    patient_id: int,
    caregiver_id: int
):
    assignment = (
        db.query(CaregiverPatient)
        .filter(
            CaregiverPatient.caregiver_id == caregiver_id,
            CaregiverPatient.patient_id == patient_id
        )
        .first()
    )

    if assignment is None:
        assignment = CaregiverPatient(
            caregiver_id=caregiver_id,
            patient_id=patient_id,
            status="pending"
        )
        db.add(assignment)
    else:
        if assignment.status in ("declined",):
            assignment.status = "pending"
        elif assignment.status == "pending":
            return assignment, False

    db.commit()
    db.refresh(assignment)

    return assignment, True


def accept_caregiver_request(
    db: Session,
    caregiver_id: int,
    patient_id: int
):
    assignment = (
        db.query(CaregiverPatient)
        .filter(
            CaregiverPatient.caregiver_id == caregiver_id,
            CaregiverPatient.patient_id == patient_id,
            CaregiverPatient.status == "pending"
        )
        .first()
    )

    if assignment is None:
        return None

    assignment.status = "active"
    db.commit()
    db.refresh(assignment)

    return assignment


def decline_caregiver_request(
    db: Session,
    caregiver_id: int,
    patient_id: int
):
    assignment = (
        db.query(CaregiverPatient)
        .filter(
            CaregiverPatient.caregiver_id == caregiver_id,
            CaregiverPatient.patient_id == patient_id,
            CaregiverPatient.status == "pending"
        )
        .first()
    )

    if assignment is None:
        return None

    assignment.status = "declined"
    db.commit()
    db.refresh(assignment)

    return assignment


def assign_caregiver(
    db: Session,
    caregiver_id: int,
    patient_id: int
):
    assignment = (
        db.query(CaregiverPatient)
        .filter(
            CaregiverPatient.caregiver_id == caregiver_id,
            CaregiverPatient.patient_id == patient_id
        )
        .first()
    )

    if assignment is None:
        assignment = CaregiverPatient(
            caregiver_id=caregiver_id,
            patient_id=patient_id
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)

    return assignment
