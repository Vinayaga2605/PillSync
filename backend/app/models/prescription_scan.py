from sqlalchemy import BigInteger
from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Float
from sqlalchemy import ForeignKey
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class PrescriptionScan(Base):
    __tablename__ = "prescription_scans"

    id = Column(BigInteger, primary_key=True, index=True)

    patient_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    image_path = Column(String(255), nullable=True)

    raw_ocr_text = Column(Text, nullable=True)

    status = Column(
        String(20),
        default="PENDING_REVIEW",
        nullable=False,
        index=True
    )  # PENDING_REVIEW, CONFIRMED, REJECTED

    created_at = Column(
        DateTime,
        server_default=func.now(),
        index=True
    )

    items = relationship(
        "PrescriptionScanItem",
        back_populates="scan",
        cascade="all, delete-orphan"
    )


class PrescriptionScanItem(Base):
    __tablename__ = "prescription_scan_items"

    id = Column(BigInteger, primary_key=True, index=True)

    scan_id = Column(
        BigInteger,
        ForeignKey("prescription_scans.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    medicine_id = Column(
        BigInteger,
        ForeignKey("medicines.id"),
        nullable=True,
        index=True
    )

    detected_name = Column(String(150), nullable=False)

    matched_name = Column(String(150), nullable=True)

    strength = Column(String(50), nullable=True)

    dosage_form = Column(String(50), nullable=True)

    frequency = Column(String(50), nullable=True)

    duration = Column(String(50), nullable=True)

    instructions = Column(Text, nullable=True)

    confidence = Column(Float, default=0.0)

    confidence_level = Column(String(30), default="Needs review")

    selected = Column(Boolean, default=True, nullable=False)  # Ticked by default

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    scan = relationship("PrescriptionScan", back_populates="items")
