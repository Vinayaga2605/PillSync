from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import String
from sqlalchemy.sql import func

from app.database import Base


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(BigInteger, primary_key=True, index=True)

    user_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        unique=True,
        nullable=False
    )

    dob = Column(Date)

    gender = Column(String(20))

    blood_group = Column(String(10))

    emergency_contact = Column(String(20))

    created_at = Column(
        DateTime,
        server_default=func.now()
    )
