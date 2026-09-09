import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text(
        "ALTER TABLE medicines ADD COLUMN IF NOT EXISTS "
        "category VARCHAR(80) DEFAULT 'General'"
    ))
    conn.execute(text(
        "ALTER TABLE medicines ADD COLUMN IF NOT EXISTS "
        "stock_quantity INTEGER DEFAULT 100"
    ))
    conn.execute(text(
        "ALTER TABLE medicines ADD COLUMN IF NOT EXISTS "
        "reorder_level INTEGER DEFAULT 20"
    ))
    conn.commit()

print("medicines migration ok")
