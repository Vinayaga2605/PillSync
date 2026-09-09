from sqlalchemy import BigInteger
from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.sql import func

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(BigInteger, primary_key=True, index=True)

    user_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    patient_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=True
    )

    type = Column(String(30), default="alert")

    message = Column(Text, nullable=False)

    is_read = Column(Boolean, default=False)

    created_at = Column(
        DateTime,
        server_default=func.now()
    )
