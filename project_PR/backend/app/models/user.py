import uuid
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import (
    String, Text, Boolean, Date, DateTime, ForeignKey,
    CheckConstraint, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("role IN ('PATIENT', 'CAREGIVER', 'ADMIN')", name="ck_users_role"),
    )

    # Relationships
    patient_profile: Mapped[Optional["PatientProfile"]] = relationship(
        "PatientProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    caregiver_profile: Mapped[Optional["CaregiverProfile"]] = relationship(
        "CaregiverProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="recipient_user", cascade="all, delete-orphan"
    )


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    allergies: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    medical_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "gender IN ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY') OR gender IS NULL",
            name="ck_patient_gender"
        ),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="patient_profile")
    caregiver_assignments: Mapped[List["CaregiverPatientAssignment"]] = relationship(
        "CaregiverPatientAssignment", back_populates="patient", cascade="all, delete-orphan"
    )
    prescriptions: Mapped[List["Prescription"]] = relationship(
        "Prescription", back_populates="patient", cascade="all, delete-orphan"
    )
    patient_medications: Mapped[List["PatientMedication"]] = relationship(
        "PatientMedication", back_populates="patient", cascade="all, delete-orphan"
    )
    dose_events: Mapped[List["MedicationDoseEvent"]] = relationship(
        "MedicationDoseEvent", back_populates="patient", cascade="all, delete-orphan"
    )
    inventories: Mapped[List["MedicineInventory"]] = relationship(
        "MedicineInventory", back_populates="patient", cascade="all, delete-orphan"
    )
    ocr_scans: Mapped[List["OCRScan"]] = relationship(
        "OCRScan", back_populates="patient", cascade="all, delete-orphan"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="patient", cascade="all, delete-orphan"
    )
    notification_preferences: Mapped[Optional["NotificationPreference"]] = relationship(
        "NotificationPreference", back_populates="patient", uselist=False, cascade="all, delete-orphan"
    )


class CaregiverProfile(Base):
    __tablename__ = "caregiver_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    relationship_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    organization: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="caregiver_profile")
    patient_assignments: Mapped[List["CaregiverPatientAssignment"]] = relationship(
        "CaregiverPatientAssignment", back_populates="caregiver", cascade="all, delete-orphan"
    )


class CaregiverPatientAssignment(Base):
    __tablename__ = "caregiver_patient_assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    caregiver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("caregiver_profiles.id", ondelete="CASCADE"), nullable=False
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False
    )
    relationship_type: Mapped[Optional[str]] = mapped_column("relationship", String(50), nullable=True)
    permission_level: Mapped[str] = mapped_column(
        String(30), nullable=False, default="FULL_ACCESS"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("caregiver_id", "patient_id", name="uq_caregiver_patient"),
        CheckConstraint(
            "permission_level IN ('VIEW_ONLY', 'FULL_ACCESS', 'ALERTS_ONLY')",
            name="ck_caregiver_permission"
        ),
    )

    # Relationships
    caregiver: Mapped["CaregiverProfile"] = relationship(
        "CaregiverProfile", back_populates="patient_assignments"
    )
    patient: Mapped["PatientProfile"] = relationship(
        "PatientProfile", back_populates="caregiver_assignments"
    )
