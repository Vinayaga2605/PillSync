from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import String
from sqlalchemy import UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class CaregiverPatient(Base):
    __tablename__ = "caregiver_patients"

    __table_args__ = (
        UniqueConstraint(
            "caregiver_id",
            "patient_id",
            name="uq_caregiver_patient"
        ),
    )

    id = Column(BigInteger, primary_key=True, index=True)

    caregiver_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    patient_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    status = Column(
        String(20),
        default="active",
        index=True
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )
