from sqlalchemy import BigInteger
from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import String
from sqlalchemy.sql import func

from app.database import Base


class MedicationLog(Base):
    __tablename__ = "medication_logs"

    id = Column(BigInteger, primary_key=True, index=True)

    schedule_id = Column(
        BigInteger,
        ForeignKey("medication_schedules.id"),
        nullable=False
    )

    patient_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False
    )

    taken = Column(Boolean, default=False)

    log_date = Column(Date, default=func.current_date(), nullable=False)

    time_of_day = Column(String(20), default="morning")

    taken_at = Column(
        DateTime,
        server_default=func.now()
    )
