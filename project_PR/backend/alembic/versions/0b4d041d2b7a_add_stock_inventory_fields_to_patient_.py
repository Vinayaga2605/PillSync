"""add_stock_inventory_fields_to_patient_medications

Revision ID: 0b4d041d2b7a
Revises: 02ef60f9e40d
Create Date: 2026-09-04 15:09:33.081413

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0b4d041d2b7a'
down_revision: Union[str, Sequence[str], None] = '02ef60f9e40d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to include stock and inventory management fields on patient_medications."""
    op.add_column(
        'patient_medications',
        sa.Column('initial_quantity', sa.Numeric(8, 2), nullable=True, server_default=sa.text("'0.0'"))
    )
    op.add_column(
        'patient_medications',
        sa.Column('current_quantity', sa.Numeric(8, 2), nullable=True, server_default=sa.text("'0.0'"))
    )
    op.add_column(
        'patient_medications',
        sa.Column('quantity_per_dose', sa.Numeric(8, 2), nullable=False, server_default=sa.text("'1.0'"))
    )
    op.add_column(
        'patient_medications',
        sa.Column('stock_unit', sa.String(30), nullable=True)
    )
    op.add_column(
        'patient_medications',
        sa.Column('low_stock_threshold', sa.Numeric(8, 2), nullable=False, server_default=sa.text("'5.0'"))
    )

    # Initialize stock_unit from existing dosage_unit for historical data
    op.execute(
        "UPDATE patient_medications SET stock_unit = dosage_unit WHERE stock_unit IS NULL"
    )

    # Add constraints
    op.create_check_constraint(
        'ck_patient_med_quantity_per_dose',
        'patient_medications',
        'quantity_per_dose > 0'
    )
    op.create_check_constraint(
        'ck_patient_med_current_quantity',
        'patient_medications',
        'current_quantity IS NULL OR current_quantity >= 0'
    )
    op.create_check_constraint(
        'ck_patient_med_initial_quantity',
        'patient_medications',
        'initial_quantity IS NULL OR initial_quantity >= 0'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('ck_patient_med_initial_quantity', 'patient_medications', type_='check')
    op.drop_constraint('ck_patient_med_current_quantity', 'patient_medications', type_='check')
    op.drop_constraint('ck_patient_med_quantity_per_dose', 'patient_medications', type_='check')
    op.drop_column('patient_medications', 'low_stock_threshold')
    op.drop_column('patient_medications', 'stock_unit')
    op.drop_column('patient_medications', 'quantity_per_dose')
    op.drop_column('patient_medications', 'current_quantity')
    op.drop_column('patient_medications', 'initial_quantity')
