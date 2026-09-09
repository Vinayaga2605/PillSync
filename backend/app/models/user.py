from sqlalchemy import BigInteger
from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import String
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True)

    full_name = Column(String(150), nullable=False)

    email = Column(String(150), unique=True, nullable=False)

    password_hash = Column(String(255), nullable=False)

    phone = Column(String(20))

    role = Column(String(20), nullable=False)

    is_active = Column(Boolean, default=True)

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )