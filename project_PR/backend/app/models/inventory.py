import uuid
from datetime import date, datetime
from typing import List, Optional
from decimal import Decimal
from sqlalchemy import (
    String, Boolean, Date, DateTime, Numeric,
    ForeignKey, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base


class MedicineInventory(Base):
    __tablename__ = "medicine_inventory"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_medication_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_medications.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False
    )
    current_quantity: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=False, default=Decimal("0.0")
    )
    minimum_threshold: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=False, default=Decimal("5.0")
    )
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    last_refill_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    estimated_depletion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    recommended_refill_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    low_stock_alert_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("current_quantity >= 0", name="ck_inventory_current_quantity"),
        CheckConstraint("minimum_threshold >= 0", name="ck_inventory_min_threshold"),
    )

    # Relationships
    patient_medication: Mapped["PatientMedication"] = relationship(
        "PatientMedication", back_populates="inventory"
    )
    patient: Mapped["PatientProfile"] = relationship(
        "PatientProfile", back_populates="inventories"
    )
    transactions: Mapped[List["InventoryTransaction"]] = relationship(
        "InventoryTransaction", back_populates="inventory", cascade="all, delete-orphan"
    )


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    inventory_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("medicine_inventory.id", ondelete="CASCADE"), nullable=False
    )
    dose_event_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("medication_dose_events.id", ondelete="SET NULL"), nullable=True
    )
    transaction_type: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity_change: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "transaction_type IN ('INITIAL_STOCK', 'DOSE_CONSUMPTION', 'MANUAL_REFILL', 'STOCK_ADJUSTMENT', 'DISCARDED')",
            name="ck_inv_tx_type"
        ),
        Index("idx_inventory_tx_created", "inventory_id", "created_at"),
    )

    # Relationships
    inventory: Mapped["MedicineInventory"] = relationship(
        "MedicineInventory", back_populates="transactions"
    )
    dose_event: Mapped[Optional["MedicationDoseEvent"]] = relationship(
        "MedicationDoseEvent", back_populates="inventory_transactions"
    )
