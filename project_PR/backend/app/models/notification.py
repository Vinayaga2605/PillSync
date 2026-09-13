import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Text, Boolean, DateTime, ForeignKey,
    CheckConstraint, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recipient_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    related_dose_event_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("medication_dose_events.id", ondelete="SET NULL"), nullable=True, index=True
    )
    related_medicine_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_medications.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        CheckConstraint(
            "type IN ('MEDICATION_DUE', 'MEDICATION_UPCOMING', 'MISSED_DOSE', 'SYSTEM')",
            name="ck_notification_type"
        ),
        Index("idx_notifications_patient_created", "patient_id", "created_at"),
        Index("idx_notifications_patient_unread", "patient_id", "is_read"),
        Index(
            "uq_notifications_dose_event_type",
            "related_dose_event_id",
            "type",
            unique=True,
            postgresql_where=(related_dose_event_id.isnot(None)),
        ),
    )

    # Relationships
    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="notifications")
    recipient_user: Mapped[Optional["User"]] = relationship("User", back_populates="notifications")
    patient_medication: Mapped[Optional["PatientMedication"]] = relationship(
        "PatientMedication", back_populates="notifications", foreign_keys=[related_medicine_id]
    )
    dose_event: Mapped[Optional["MedicationDoseEvent"]] = relationship(
        "MedicationDoseEvent", back_populates="notifications", foreign_keys=[related_dose_event_id]
    )


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    medication_due_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    missed_dose_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    medication_upcoming_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    system_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    patient: Mapped["PatientProfile"] = relationship(
        "PatientProfile", back_populates="notification_preferences"
    )
