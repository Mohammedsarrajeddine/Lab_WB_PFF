"""operator auth schema

Revision ID: 20260325_0002
Revises: 20260325_0001
Create Date: 2026-03-25 22:40:00

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260325_0002"
down_revision: str | None = "20260325_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

operator_role_enum = postgresql.ENUM(
    "intake_operator",
    "intake_manager",
    "admin",
    name="operator_role_enum",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    operator_role_enum.create(bind, checkfirst=True)

    op.create_table(
        "operator_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=True),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column(
            "role",
            operator_role_enum,
            nullable=False,
            server_default="intake_operator",
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_operator_users_email"),
    )
    op.create_index(
        "ix_operator_users_role_active",
        "operator_users",
        ["role", "is_active"],
        unique=False,
    )


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_index("ix_operator_users_role_active", table_name="operator_users")
    op.drop_table("operator_users")

    operator_role_enum.drop(bind, checkfirst=True)
