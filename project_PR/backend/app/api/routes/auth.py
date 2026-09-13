from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token
from app.schemas.user import (
    UserRegisterRequest,
    UserResponse,
    UserRole,
    LoginRequest,
    LoginResponse,
)
from app.services.user_service import create_user, authenticate_user
from app.api.deps import get_current_user, require_roles
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    description="Registers a new patient, caregiver, or admin user. Password is encrypted using bcrypt."
)
def register_user(
    request: UserRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Registers a new user and returns the created user profile (without sensitive credentials).
    """
    user = create_user(db, request)
    return user


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="User login with email and password",
    description="Authenticates credentials and returns a JWT Bearer access token with user details."
)
def login_user(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Validates user credentials, checks active status, and returns a signed JWT access token.
    """
    user = authenticate_user(db, request.email, request.password)

    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
    }

    access_token, expires_in = create_access_token(data=token_payload)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user",
    description="Validates the Bearer token in the Authorization header and returns current user details."
)
def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    Returns the currently authenticated user profile.
    """
    return current_user


# =====================================================================
# TEMPORARY ROLE VERIFICATION TEST ENDPOINTS (Step 5C Verification Only)
# =====================================================================

@router.get(
    "/test/patient",
    status_code=status.HTTP_200_OK,
    summary="[TEST ONLY] Patient-only protected endpoint",
    description="Accessible only by authenticated users with the PATIENT role."
)
def test_patient_endpoint(
    current_user: User = Depends(require_roles(UserRole.PATIENT))
):
    return {
        "status": "ok",
        "message": "Access granted: Patient role verified",
        "user_id": str(current_user.id),
        "role": current_user.role,
    }


@router.get(
    "/test/caregiver",
    status_code=status.HTTP_200_OK,
    summary="[TEST ONLY] Caregiver-only protected endpoint",
    description="Accessible only by authenticated users with the CAREGIVER role."
)
def test_caregiver_endpoint(
    current_user: User = Depends(require_roles(UserRole.CAREGIVER))
):
    return {
        "status": "ok",
        "message": "Access granted: Caregiver role verified",
        "user_id": str(current_user.id),
        "role": current_user.role,
    }


@router.get(
    "/test/admin",
    status_code=status.HTTP_200_OK,
    summary="[TEST ONLY] Admin-only protected endpoint",
    description="Accessible only by authenticated users with the ADMIN role."
)
def test_admin_endpoint(
    current_user: User = Depends(require_roles(UserRole.ADMIN))
):
    return {
        "status": "ok",
        "message": "Access granted: Admin role verified",
        "user_id": str(current_user.id),
        "role": current_user.role,
    }
