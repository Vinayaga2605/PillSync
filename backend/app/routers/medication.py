from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth_dependency import get_current_user

from app.schemas.medication_schema import ScheduleCreate
from app.schemas.medication_schema import TakeMedicineResponse

from app.services.medication_service import get_patient_schedule
from app.services.medication_service import add_schedule
from app.services.medication_service import take_medicine

router = APIRouter(
    prefix="/api/medications",
    tags=["Medications"]
)


@router.get("/schedule")
@router.get("/schedules")
def my_schedule(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    if user.role == "patient":
        return get_patient_schedule(db, user.id)

    if user.role == "caregiver":
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail="Caregivers must use the caregiver endpoints"
        )

    return []


@router.post("/schedules")
def create_schedule(
    data: ScheduleCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    if user.role not in ("admin", "patient"):
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail="You cannot create medication schedules"
        )

    patient_id = user.id if user.role == "patient" else data.patient_id

    return add_schedule(
        db,
        patient_id=patient_id,
        medicine_id=data.medicine_id,
        dosage=data.dosage,
        time_of_day=data.time_of_day,
        notes=data.notes
    )


@router.post("/{schedule_id}/take", response_model=TakeMedicineResponse)
@router.post("/take-dose/{schedule_id}", response_model=TakeMedicineResponse)
def mark_taken(
    schedule_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    if user.role != "patient":
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail="Only patients can mark medicines as taken"
        )

    return take_medicine(
        db,
        schedule_id=schedule_id,
        patient_id=user.id
    )
