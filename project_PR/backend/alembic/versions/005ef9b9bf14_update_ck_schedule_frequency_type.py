"""update_ck_schedule_frequency_type

Revision ID: 005ef9b9bf14
Revises: b6b797c9f8e1
Create Date: 2026-08-31 16:00:53.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005ef9b9bf14'
down_revision: Union[str, Sequence[str], None] = 'b6b797c9f8e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('ck_schedule_frequency_type', 'medication_schedules', type_='check')
    op.create_check_constraint(
        'ck_schedule_frequency_type',
        'medication_schedules',
        "frequency_type IN ('DAILY', 'WEEKLY', 'SPECIFIC_DAYS', 'INTERVAL_DAYS', 'AS_NEEDED', 'CUSTOM')"
    )


def downgrade() -> None:
    op.drop_constraint('ck_schedule_frequency_type', 'medication_schedules', type_='check')
    op.create_check_constraint(
        'ck_schedule_frequency_type',
        'medication_schedules',
        "frequency_type IN ('DAILY', 'SPECIFIC_DAYS', 'INTERVAL_DAYS', 'AS_NEEDED')"
    )
