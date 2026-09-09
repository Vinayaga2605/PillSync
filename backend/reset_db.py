"""Full database reset for PillSync.

Drops every table (CASCADE) and recreates the schema, then runs the
complete idempotent seed so all data is consistent and synced.

Run:  python reset_db.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text

from app.database import Base
from app.database import engine

import app.models  # noqa: F401  (register all tables on Base.metadata)

from seed_all import seed_all


def reset():
    print("Dropping all tables (CASCADE) ...")
    with engine.connect() as conn:
        conn.execute(text(
            "DROP SCHEMA public CASCADE;"
        ))
        conn.execute(text(
            "CREATE SCHEMA public;"
        ))
        conn.execute(text(
            "GRANT ALL ON SCHEMA public TO postgres;"
        ))
        conn.execute(text(
            "GRANT ALL ON SCHEMA public TO public;"
        ))
        conn.commit()
    print("Schema rebuilt.")
    print("Creating tables & seeding ...")
    seed_all()


if __name__ == "__main__":
    reset()