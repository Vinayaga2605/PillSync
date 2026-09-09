from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from app.database import get_db

from app.schemas.user_schema import UserRegister
from app.schemas.auth_schema import LoginRequest

from app.services.auth_service import register_user
from app.services.auth_service import login_user

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


@router.post("/register")
def register(
    user: UserRegister,
    db: Session = Depends(get_db)
):
    return register_user(
        db=db,
        user=user
    )


@router.post("/login")
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    return login_user(
        db=db,
        email=request.email,
        password=request.password,
        role=request.role
    )