from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.sql import func

from app.database import Base


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(BigInteger, primary_key=True, index=True)

    name = Column(String(150), nullable=False)

    brand = Column(String(150))

    description = Column(Text)

    default_dosage = Column(String(50))

    category = Column(String(80), default="General")

    stock_quantity = Column(Integer, default=100)

    reorder_level = Column(Integer, default=20)

    created_at = Column(
        DateTime,
        server_default=func.now()
    )
