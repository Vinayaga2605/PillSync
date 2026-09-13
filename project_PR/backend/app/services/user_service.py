import logging
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.user import User, PatientProfile, CaregiverProfile
from app.schemas.user import UserRegisterRequest, UserRole
from app.core.security import hash_password, verify_password

logger = logging.getLogger("pillsync.auth")


def get_user_by_email(db: Session, email: str) -> User | None:
    """Finds a user by normalized email address."""
    return db.execute(select(User).where(User.email == email.lower().strip())).scalar_one_or_none()


def create_user(db: Session, request: UserRegisterRequest) -> User:
    """
    Registers a new user:
    1. Checks for duplicate email (returns HTTP 409).
    2. Hashes password using bcrypt.
    3. Persists User record and creates initial role profile (PatientProfile or CaregiverProfile).
    """
    normalized_email = request.email.lower().strip()

    # Pre-check for duplicate email
    if get_user_by_email(db, normalized_email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )

    hashed_pw = hash_password(request.password)

    new_user = User(
        email=normalized_email,
        password_hash=hashed_pw,
        role=request.role.value if isinstance(request.role, UserRole) else str(request.role),
        first_name=request.first_name.strip(),
        last_name=request.last_name.strip(),
        phone_number=request.phone_number.strip() if request.phone_number else None,
        is_active=True,
    )

    db.add(new_user)
    db.flush()  # Flushes to assign new_user.id for child profiles

    # Initialize corresponding profile based on role
    if new_user.role == UserRole.PATIENT.value:
        patient_profile = PatientProfile(user_id=new_user.id)
        db.add(patient_profile)
    elif new_user.role == UserRole.CAREGIVER.value:
        caregiver_profile = CaregiverProfile(user_id=new_user.id)
        db.add(caregiver_profile)

    try:
        db.commit()
        db.refresh(new_user)
        logger.info(f"User registered successfully: id={new_user.id}, role={new_user.role}")
        return new_user
    except IntegrityError as e:
        db.rollback()
        logger.warning(f"IntegrityError during user registration: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during user registration: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete user registration"
        )


def authenticate_user(db: Session, email: str, password: str) -> User:
    """
    Authenticates user credentials:
    1. Looks up user by normalized email.
    2. Validates password hash with bcrypt.
    3. Verifies active account status.
    Returns the authenticated User or raises HTTP 401 Unauthorized with generic error.
    """
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        # Generic error message to prevent account enumeration
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive. Please contact support.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
