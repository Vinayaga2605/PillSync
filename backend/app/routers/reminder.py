from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth_dependency import get_current_user

from app.services.reminder_service import get_today_reminders

router = APIRouter(
    prefix="/api/reminders",
    tags=["Reminders"]
)


@router.get("")
def my_reminders(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    if user.role not in ("patient", "admin"):
        raise HTTPException(
            status_code=403,
            detail="Only patients can view reminders"
        )

    return get_today_reminders(db, user.id)
