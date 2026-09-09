from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.sql import func

from app.database import Base


class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(BigInteger, primary_key=True, index=True)

    user_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    action = Column(String(60), nullable=False, index=True)

    entity = Column(String(60))

    entity_id = Column(BigInteger)

    details = Column(Text)

    created_at = Column(
        DateTime,
        server_default=func.now(),
        index=True
    )


class LoginHistory(Base):
    __tablename__ = "login_history"

    id = Column(BigInteger, primary_key=True, index=True)

    user_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    email = Column(String(150))

    role = Column(String(20))

    success = Column(Integer, default=1)

    ip_address = Column(String(45))

    created_at = Column(
        DateTime,
        server_default=func.now(),
        index=True
    )


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(BigInteger, primary_key=True, index=True)

    user_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    channel = Column(String(20), default="push", index=True)

    type = Column(String(30), index=True)

    status = Column(String(20), default="sent", index=True)

    message = Column(Text)

    created_at = Column(
        DateTime,
        server_default=func.now(),
        index=True
    )


class AdherenceReport(Base):
    __tablename__ = "adherence_reports"

    id = Column(BigInteger, primary_key=True, index=True)

    patient_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    period = Column(String(20), default="daily", index=True)

    period_start = Column(DateTime)

    period_end = Column(DateTime)

    scheduled = Column(Integer, default=0)

    taken = Column(Integer, default=0)

    missed = Column(Integer, default=0)

    adherence_pct = Column(Integer, default=0)

    created_at = Column(
        DateTime,
        server_default=func.now()
    )


class RefillPrediction(Base):
    __tablename__ = "refill_predictions"

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
        nullable=False,
        index=True
    )

    schedule_id = Column(
        BigInteger,
        ForeignKey("medication_schedules.id"),
        nullable=True,
        index=True
    )

    remaining_qty = Column(Integer, default=0)

    daily_consumption = Column(Integer, default=1)

    remaining_days = Column(Integer, default=0)

    predicted_refill_date = Column(DateTime)

    status = Column(String(20), default="healthy", index=True)

    created_at = Column(
        DateTime,
        server_default=func.now()
    )


class OCRUpload(Base):
    __tablename__ = "ocr_uploads"

    id = Column(BigInteger, primary_key=True, index=True)

    patient_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    user_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    filename = Column(String(255))

    status = Column(String(20), default="success", index=True)

    items_detected = Column(Integer, default=0)

    processing_time_ms = Column(Integer, default=0)

    created_at = Column(
        DateTime,
        server_default=func.now(),
        index=True
    )


class MedicalCondition(Base):
    __tablename__ = "medical_conditions"

    id = Column(BigInteger, primary_key=True, index=True)

    patient_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    condition = Column(String(150), nullable=False)

    severity = Column(String(20), default="moderate")

    created_at = Column(
        DateTime,
        server_default=func.now()
    )


class Role(Base):
    __tablename__ = "roles"

    id = Column(BigInteger, primary_key=True, index=True)

    name = Column(String(50), unique=True, nullable=False, index=True)

    description = Column(String(255))

    created_at = Column(
        DateTime,
        server_default=func.now()
    )


class UserAssignment(Base):
    __tablename__ = "user_assignments"

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

    status = Column(String(20), default="active", index=True)

    created_at = Column(
        DateTime,
        server_default=func.now()
    )


class MedicineCategory(Base):
    __tablename__ = "medicine_categories"

    id = Column(BigInteger, primary_key=True, index=True)

    name = Column(String(100), unique=True, nullable=False, index=True)

    description = Column(String(255))

    created_at = Column(
        DateTime,
        server_default=func.now()
    )


class AnalyticsCache(Base):
    __tablename__ = "analytics_cache"

    id = Column(BigInteger, primary_key=True, index=True)

    cache_key = Column(String(150), unique=True, nullable=False, index=True)

    payload = Column(Text)

    created_at = Column(
        DateTime,
        server_default=func.now()
    )