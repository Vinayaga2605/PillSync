from sqlalchemy.orm import Session
from fastapi import HTTPException
from fastapi import status

from app.crud.user_crud import create_user
from app.crud.user_crud import get_user_by_email

from app.schemas.user_schema import UserRegister

from app.utils.password import hash_password
from app.utils.password import verify_password
from app.utils.jwt_handler import create_access_token

from app.crud.module7_crud import record_login


def register_user(
    db: Session,
    user: UserRegister
):
    existing_user = get_user_by_email(
        db,
        user.email
    )

    if existing_user:
        return {
            "message": "Registration Successful",
            "user_id": existing_user.id,
            "role": existing_user.role,
        }

    hashed_password = hash_password(
        user.password
    )

    new_user = create_user(
        db=db,
        full_name=user.full_name,
        email=user.email,
        password_hash=hashed_password,
        phone=user.phone,
        role=user.role
    )

    return {
        "message": "Registration Successful",
        "user_id": new_user.id,
        "role": new_user.role
    }


def login_user(
    db: Session,
    email: str,
    password: str,
    role: str
):
    user = get_user_by_email(
        db,
        email
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not verify_password(
        password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    token = create_access_token(
        data={"sub": str(user.id), "role": user.role}
    )

    record_login(
        db,
        user_id=user.id,
        email=user.email,
        role=user.role,
        success=True,
    )

    return {
        "message": "Login Successful",
        "user_id": user.id,
        "role": user.role,
        "full_name": user.full_name,
        "access_token": token,
        "token_type": "bearer"
    }