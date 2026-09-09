from datetime import datetime
from datetime import timedelta
from datetime import timezone

from jose import jwt
from jose import JWTError

from app.config import SECRET_KEY
from app.config import ALGORITHM
from app.config import ACCESS_TOKEN_EXPIRE_MINUTES


def create_access_token(
    data: dict
) -> str:
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def decode_access_token(
    token: str
) -> dict:
    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM]
    )