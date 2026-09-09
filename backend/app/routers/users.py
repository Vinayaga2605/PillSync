from datetime import date
from typing import Optional

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from pydantic import BaseModel

from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth_dependency import get_current_user

from app.crud.user_crud import get_user_by_id
from app.crud.patient_crud import get_patient_profile
from app.crud.patient_crud import upsert_patient_profile

router = APIRouter(
    prefix="/api/users",
    tags=["Users"]
)


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None


@router.get("/me")
def my_account(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    data = {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "is_active": user.is_active,
    }

    if user.role == "patient":
        profile = get_patient_profile(db, user.id)
        data["profile"] = {
            "dob": str(profile.dob) if profile and profile.dob else None,
            "gender": profile.gender if profile else None,
            "blood_group": profile.blood_group if profile else None,
            "emergency_contact": profile.emergency_contact if profile else None,
        }

    return data


@router.patch("/me")
def update_my_account(
    data: UserProfileUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    if data.full_name is not None:
        if not data.full_name.strip():
            raise HTTPException(status_code=400, detail="Full name is required")
        user.full_name = data.full_name.strip()

    if data.phone is not None:
        user.phone = data.phone.strip() or None

    db.commit()
    db.refresh(user)

    if user.role == "patient":
        upsert_patient_profile(
            db,
            user_id=user.id,
            dob=data.dob,
            gender=data.gender,
            blood_group=data.blood_group,
            emergency_contact=data.emergency_contact
        )

    profile = None
    if user.role == "patient":
        profile = get_patient_profile(db, user.id)

    return {
        "message": "Profile updated successfully",
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "profile": {
            "dob": str(profile.dob) if profile and profile.dob else None,
            "gender": profile.gender if profile else None,
            "blood_group": profile.blood_group if profile else None,
            "emergency_contact": profile.emergency_contact if profile else None,
        } if profile else None,
    }
