import uuid
from datetime import date, datetime
from typing import List, Optional
from decimal import Decimal
from sqlalchemy import (
    String, Text, Boolean, Date, DateTime, Numeric,
    ForeignKey, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Medicine(Base):
    __tablename__ = "medicines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    generic_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    brand_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    standard_strength: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    manufacturer: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    patient_medications: Mapped[List["PatientMedication"]] = relationship(
        "PatientMedication", back_populates="medicine"
    )


class PatientMedication(Base):
    __tablename__ = "patient_medications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    medicine_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("medicines.id", ondelete="SET NULL"), nullable=True
    )
    prescription_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("prescriptions.id", ondelete="SET NULL"), nullable=True
    )
    custom_medicine_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    dosage_amount: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    dosage_unit: Mapped[str] = mapped_column(String(30), nullable=False)
    instructions: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    initial_quantity: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 2), nullable=True, default=Decimal("0.0")
    )
    current_quantity: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 2), nullable=True, default=Decimal("0.0")
    )
    quantity_per_dose: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=False, default=Decimal("1.0")
    )
    stock_unit: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    low_stock_threshold: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=False, default=Decimal("5.0")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("dosage_amount > 0", name="ck_patient_med_dosage_amount"),
        CheckConstraint("end_date IS NULL OR end_date >= start_date", name="ck_patient_med_dates"),
        CheckConstraint("quantity_per_dose > 0", name="ck_patient_med_quantity_per_dose"),
        CheckConstraint("current_quantity IS NULL OR current_quantity >= 0", name="ck_patient_med_current_quantity"),
        CheckConstraint("initial_quantity IS NULL OR initial_quantity >= 0", name="ck_patient_med_initial_quantity"),
        Index("idx_patient_medications_patient_active", "patient_id", "is_active"),
    )

    # Relationships
    patient: Mapped["PatientProfile"] = relationship(
        "PatientProfile", back_populates="patient_medications"
    )
    medicine: Mapped[Optional["Medicine"]] = relationship(
        "Medicine", back_populates="patient_medications"
    )
    prescription: Mapped[Optional["Prescription"]] = relationship(
        "Prescription", back_populates="patient_medications"
    )
    schedules: Mapped[List["MedicationSchedule"]] = relationship(
        "MedicationSchedule", back_populates="patient_medication", cascade="all, delete-orphan"
    )
    dose_events: Mapped[List["MedicationDoseEvent"]] = relationship(
        "MedicationDoseEvent", back_populates="patient_medication", cascade="all, delete-orphan"
    )
    inventory: Mapped[Optional["MedicineInventory"]] = relationship(
        "MedicineInventory", back_populates="patient_medication", uselist=False, cascade="all, delete-orphan"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="patient_medication"
    )
