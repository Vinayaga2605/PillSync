from sqlalchemy import BigInteger
from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import String
from sqlalchemy.sql import func

from app.database import Base


class MedicationSchedule(Base):
    __tablename__ = "medication_schedules"

    id = Column(BigInteger, primary_key=True, index=True)

    patient_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    medicine_id = Column(
        BigInteger,
        ForeignKey("medicines.id"),
        nullable=False
    )

    dosage = Column(String(50), nullable=False)

    time_of_day = Column(
        String(20),
        nullable=False
    )

    notes = Column(String(255))

    is_active = Column(Boolean, default=True)

    created_at = Column(
        DateTime,
        server_default=func.now()
    )
