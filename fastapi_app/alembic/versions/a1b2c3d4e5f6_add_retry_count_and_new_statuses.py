"""Add retry_count + new result statuses (sending, delivery_failed)

Revision ID: a1b2c3d4e5f6
Revises: 843ff2bd9b06
Create Date: 2026-03-31 03:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '843ff2bd9b06'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add retry_count column with default 0
    op.add_column(
        'lab_results',
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
    )

    # 2. Expand the result_status_enum to include 'sending' and 'delivery_failed'
    #    PostgreSQL enums need ALTER TYPE ... ADD VALUE
    op.execute("ALTER TYPE result_status_enum ADD VALUE IF NOT EXISTS 'sending'")
    op.execute("ALTER TYPE result_status_enum ADD VALUE IF NOT EXISTS 'delivery_failed'")


def downgrade() -> None:
    # Remove the retry_count column
    op.drop_column('lab_results', 'retry_count')

    # Note: PostgreSQL does not support removing values from an enum type.
    # The 'sending' and 'delivery_failed' values will remain in the enum
    # but will not be used by the application after downgrade.
