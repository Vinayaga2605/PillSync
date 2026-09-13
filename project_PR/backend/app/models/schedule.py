import uuid
from datetime import time, date, datetime
from typing import List, Optional
from decimal import Decimal
from sqlalchemy import (
    String, Text, Boolean, Time, Date, DateTime, Numeric, Integer,
    ForeignKey, CheckConstraint, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, INTEGER as PG_INTEGER
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base


class MedicationSchedule(Base):
    __tablename__ = "medication_schedules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_medication_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_medications.id", ondelete="CASCADE"), nullable=False
    )
    frequency_type: Mapped[str] = mapped_column(String(30), nullable=False)
    dose_quantity: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("1.0"))
    dosage_unit: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    days_of_week: Mapped[Optional[List[int]]] = mapped_column(ARRAY(PG_INTEGER), nullable=True)
    interval_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Legacy fields retained as nullable for backward compatibility with schema
    time_of_day_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    scheduled_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "frequency_type IN ('DAILY', 'WEEKLY', 'SPECIFIC_DAYS', 'INTERVAL_DAYS', 'AS_NEEDED', 'CUSTOM')",
            name="ck_schedule_frequency_type"
        ),
        CheckConstraint("dose_quantity > 0", name="ck_schedule_dose_quantity"),
        CheckConstraint("end_date IS NULL OR end_date >= start_date", name="ck_schedule_date_range"),
        Index("idx_medication_schedules_med_active", "patient_medication_id", "is_active"),
    )

    # Relationships
    patient_medication: Mapped["PatientMedication"] = relationship(
        "PatientMedication", back_populates="schedules"
    )
    schedule_times: Mapped[List["MedicationScheduleTime"]] = relationship(
        "MedicationScheduleTime",
        back_populates="schedule",
        cascade="all, delete-orphan",
        order_by="MedicationScheduleTime.scheduled_time"
    )
    dose_events: Mapped[List["MedicationDoseEvent"]] = relationship(
        "MedicationDoseEvent", back_populates="schedule"
    )


class MedicationScheduleTime(Base):
    __tablename__ = "medication_schedule_times"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    schedule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("medication_schedules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scheduled_time: Mapped[time] = mapped_column(Time, nullable=False)
    time_of_day_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    dose_quantity: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "time_of_day_type IS NULL OR time_of_day_type IN ('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'CUSTOM')",
            name="ck_schedule_time_time_of_day"
        ),
        CheckConstraint(
            "dose_quantity IS NULL OR dose_quantity > 0",
            name="ck_schedule_time_dose_quantity"
        ),
        Index("idx_schedule_times_sched_time", "schedule_id", "scheduled_time"),
    )

    # Relationships
    schedule: Mapped["MedicationSchedule"] = relationship(
        "MedicationSchedule", back_populates="schedule_times"
    )


class MedicationDoseEvent(Base):
    __tablename__ = "medication_dose_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_medication_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_medications.id", ondelete="CASCADE"), nullable=False
    )
    schedule_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("medication_schedules.id", ondelete="SET NULL"), nullable=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False
    )
    scheduled_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    actual_taken_timestamp: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    snoozed_until_timestamp: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    dose_quantity_taken: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    recorded_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'TAKEN', 'MISSED', 'SNOOZED', 'SKIPPED')",
            name="ck_dose_event_status"
        ),
        UniqueConstraint("schedule_id", "scheduled_timestamp", name="uq_dose_event_schedule_timestamp"),
        Index("idx_dose_events_patient_schedule", "patient_id", "scheduled_timestamp"),
        Index("idx_dose_events_med_status_time", "patient_medication_id", "status", "scheduled_timestamp"),
    )

    # Relationships
    patient_medication: Mapped["PatientMedication"] = relationship(
        "PatientMedication", back_populates="dose_events"
    )
    schedule: Mapped[Optional["MedicationSchedule"]] = relationship(
        "MedicationSchedule", back_populates="dose_events"
    )
    patient: Mapped["PatientProfile"] = relationship(
        "PatientProfile", back_populates="dose_events"
    )
    recorded_by_user: Mapped[Optional["User"]] = relationship("User")
    inventory_transactions: Mapped[List["InventoryTransaction"]] = relationship(
        "InventoryTransaction", back_populates="dose_event"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="dose_event"
    )
