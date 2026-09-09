from sqlalchemy.orm import Session

from app.models.medicine import Medicine


def get_medicines(
    db: Session
):
    return (
        db.query(Medicine)
        .order_by(Medicine.name.asc())
        .all()
    )


def get_medicine_by_id(
    db: Session,
    medicine_id: int
):
    return (
        db.query(Medicine)
        .filter(Medicine.id == medicine_id)
        .first()
    )


def create_medicine(
    db: Session,
    name: str,
    brand: str,
    description: str,
    default_dosage: str
):
    medicine = Medicine(
        name=name,
        brand=brand,
        description=description,
        default_dosage=default_dosage
    )

    db.add(medicine)
    db.commit()
    db.refresh(medicine)

    return medicine
