import uuid
from datetime import date, datetime
from typing import List, Optional, Any
from sqlalchemy import (
    String, Text, Date, DateTime, ForeignKey,
    CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False
    )
    doctor_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    clinic_hospital_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    prescribed_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    document_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "expiry_date IS NULL OR expiry_date >= prescribed_date",
            name="ck_prescription_dates"
        ),
    )

    # Relationships
    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="prescriptions")
    patient_medications: Mapped[List["PatientMedication"]] = relationship(
        "PatientMedication", back_populates="prescription"
    )
    ocr_scans: Mapped[List["OCRScan"]] = relationship(
        "OCRScan", back_populates="prescription"
    )


class OCRScan(Base):
    __tablename__ = "ocr_scans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False
    )
    prescription_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("prescriptions.id", ondelete="SET NULL"), nullable=True
    )
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    raw_extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parsed_data_json: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'VERIFIED')",
            name="ck_ocr_status"
        ),
    )

    # Relationships
    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="ocr_scans")
    prescription: Mapped[Optional["Prescription"]] = relationship(
        "Prescription", back_populates="ocr_scans"
    )
