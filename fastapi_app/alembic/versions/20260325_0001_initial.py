"""initial schema

Revision ID: 20260325_0001
Revises:
Create Date: 2026-03-25 20:45:00

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260325_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

conversation_status_enum = postgresql.ENUM(
    "open",
    "pending_review",
    "prepared",
    "closed",
    name="conversation_status_enum",
    create_type=False,
)
message_direction_enum = postgresql.ENUM(
    "incoming",
    "outgoing",
    name="message_direction_enum",
    create_type=False,
)
message_type_enum = postgresql.ENUM(
    "text",
    "image",
    "document",
    "audio",
    "other",
    name="message_type_enum",
    create_type=False,
)
prescription_extraction_status_enum = postgresql.ENUM(
    "pending",
    "completed",
    "failed",
    name="prescription_extraction_status_enum",
    create_type=False,
)
analysis_request_status_enum = postgresql.ENUM(
    "received",
    "prescription_received",
    "in_review",
    "prepared",
    name="analysis_request_status_enum",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()

    conversation_status_enum.create(bind, checkfirst=True)
    message_direction_enum.create(bind, checkfirst=True)
    message_type_enum.create(bind, checkfirst=True)
    prescription_extraction_status_enum.create(bind, checkfirst=True)
    analysis_request_status_enum.create(bind, checkfirst=True)

    op.create_table(
        "patients",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=True),
        sa.Column("phone_e164", sa.String(length=32), nullable=False),
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
        sa.UniqueConstraint("phone_e164", name="uq_patients_phone_e164"),
    )

    op.create_table(
        "conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("whatsapp_chat_id", sa.String(length=128), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "status",
            conversation_status_enum,
            nullable=False,
            server_default="open",
        ),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patients.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("whatsapp_chat_id", name="uq_conversations_whatsapp_chat_id"),
    )
    op.create_index(
        "ix_conversations_last_message_at",
        "conversations",
        ["last_message_at"],
        unique=False,
    )

    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("direction", message_direction_enum, nullable=False),
        sa.Column("message_type", message_type_enum, nullable=False),
        sa.Column("whatsapp_message_id", sa.String(length=128), nullable=True),
        sa.Column("content_text", sa.Text(), nullable=True),
        sa.Column("media_url", sa.Text(), nullable=True),
        sa.Column("mime_type", sa.String(length=128), nullable=True),
        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["conversations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("whatsapp_message_id", name="uq_messages_whatsapp_message_id"),
    )
    op.create_index(
        "ix_messages_conversation_sent_at",
        "messages",
        ["conversation_id", "sent_at"],
        unique=False,
    )

    op.create_table(
        "prescriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("message_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_url", sa.Text(), nullable=True),
        sa.Column("mime_type", sa.String(length=128), nullable=True),
        sa.Column(
            "extraction_status",
            prescription_extraction_status_enum,
            nullable=False,
            server_default="pending",
        ),
        sa.Column("extracted_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["conversations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", name="uq_prescriptions_message_id"),
    )
    op.create_index(
        "ix_prescriptions_extraction_status",
        "prescriptions",
        ["extraction_status"],
        unique=False,
    )

    op.create_table(
        "analysis_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "status",
            analysis_request_status_enum,
            nullable=False,
            server_default="received",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["conversations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("conversation_id", name="uq_analysis_requests_conversation_id"),
    )
    op.create_index(
        "ix_analysis_requests_status",
        "analysis_requests",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_index("ix_analysis_requests_status", table_name="analysis_requests")
    op.drop_table("analysis_requests")

    op.drop_index("ix_prescriptions_extraction_status", table_name="prescriptions")
    op.drop_table("prescriptions")

    op.drop_index("ix_messages_conversation_sent_at", table_name="messages")
    op.drop_table("messages")

    op.drop_index("ix_conversations_last_message_at", table_name="conversations")
    op.drop_table("conversations")

    op.drop_table("patients")

    analysis_request_status_enum.drop(bind, checkfirst=True)
    prescription_extraction_status_enum.drop(bind, checkfirst=True)
    message_type_enum.drop(bind, checkfirst=True)
    message_direction_enum.drop(bind, checkfirst=True)
    conversation_status_enum.drop(bind, checkfirst=True)
