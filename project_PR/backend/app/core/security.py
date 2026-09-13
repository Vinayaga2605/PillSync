import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import bcrypt
import jwt
from dotenv import load_dotenv

_backend_dir = Path(__file__).resolve().parent.parent.parent
load_dotenv(_backend_dir / ".env")
load_dotenv(_backend_dir.parent / ".env")
load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "default-fallback-secret-key-for-dev-only")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))


def hash_password(password: str) -> str:
    """
    Hashes a plain-text password using bcrypt with a securely generated salt.
    """
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    return hashed_bytes.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain-text password against a bcrypt hashed password.
    """
    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(
    data: dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> tuple[str, int]:
    """
    Creates an encoded JWT access token with expiration and issued-at timestamps.
    Returns a tuple of (encoded_token_string, expires_in_seconds).
    """
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)

    if expires_delta:
        expire = now_utc + expires_delta
        expires_in = int(expires_delta.total_seconds())
    else:
        expire = now_utc + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        expires_in = JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60

    to_encode.update({
        "exp": expire,
        "iat": now_utc,
    })

    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt, expires_in


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decodes and validates a JWT token's signature and expiration.
    Raises jwt.PyJWTError (ExpiredSignatureError, InvalidTokenError, etc.) on failure.
    """
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
