import logging
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User, PatientProfile
from app.schemas.patient import PatientProfileResponse, PatientProfileUpdateRequest

logger = logging.getLogger("pillsync.patient")


def get_patient_profile(db: Session, user: User) -> PatientProfileResponse:
    """
    Retrieves the patient profile for the authenticated patient user.
    """
    profile = db.execute(
        select(PatientProfile).where(PatientProfile.user_id == user.id)
    ).scalar_one_or_none()

    if not profile:
        # Fallback: create empty profile if missing
        profile = PatientProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return PatientProfileResponse(
        id=profile.id,
        user_id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone_number=user.phone_number,
        date_of_birth=profile.date_of_birth,
        gender=profile.gender,
        blood_group=profile.blood_group,
        allergies=profile.allergies,
        medical_conditions=profile.medical_conditions,
        emergency_contact_name=profile.emergency_contact_name,
        emergency_contact_phone=profile.emergency_contact_phone,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def update_patient_profile(
    db: Session, user: User, data: PatientProfileUpdateRequest
) -> PatientProfileResponse:
    """
    Updates the patient profile and user contact attributes for the authenticated patient.
    """
    profile = db.execute(
        select(PatientProfile).where(PatientProfile.user_id == user.id)
    ).scalar_one_or_none()

    if not profile:
        profile = PatientProfile(user_id=user.id)
        db.add(profile)

    update_dict = data.model_dump(exclude_unset=True)

    # Update User attributes if supplied
    if "first_name" in update_dict and update_dict["first_name"] is not None:
        user.first_name = update_dict["first_name"]
    if "last_name" in update_dict and update_dict["last_name"] is not None:
        user.last_name = update_dict["last_name"]
    if "phone_number" in update_dict:
        user.phone_number = update_dict["phone_number"]

    # Update PatientProfile attributes if supplied
    patient_fields = [
        "date_of_birth",
        "gender",
        "blood_group",
        "allergies",
        "medical_conditions",
        "emergency_contact_name",
        "emergency_contact_phone",
    ]

    for field in patient_fields:
        if field in update_dict:
            val = update_dict[field]
            if field == "gender" and val is not None:
                val = val.value if hasattr(val, "value") else str(val)
            setattr(profile, field, val)

    try:
        db.commit()
        db.refresh(user)
        db.refresh(profile)
        logger.info(f"Patient profile updated for user_id={user.id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating patient profile: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update patient profile",
        )

    return PatientProfileResponse(
        id=profile.id,
        user_id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone_number=user.phone_number,
        date_of_birth=profile.date_of_birth,
        gender=profile.gender,
        blood_group=profile.blood_group,
        allergies=profile.allergies,
        medical_conditions=profile.medical_conditions,
        emergency_contact_name=profile.emergency_contact_name,
        emergency_contact_phone=profile.emergency_contact_phone,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )
