from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status

from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth_dependency import get_current_user
from app.dependencies.auth_dependency import require_role

from app.schemas.medicine_schema import MedicineCreate
from app.schemas.medicine_schema import MedicineOut

from app.crud.medicine_crud import get_medicines
from app.crud.medicine_crud import create_medicine

router = APIRouter(
    prefix="/api/medicines",
    tags=["Medicines"]
)


@router.get("", response_model=list[MedicineOut])
def list_medicines(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return get_medicines(db)


@router.post("", response_model=MedicineOut)
def add_medicine(
    data: MedicineCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    if not data.name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Medicine name is required"
        )

    return create_medicine(
        db,
        name=data.name.strip(),
        brand=data.brand,
        description=data.description,
        default_dosage=data.default_dosage
    )
