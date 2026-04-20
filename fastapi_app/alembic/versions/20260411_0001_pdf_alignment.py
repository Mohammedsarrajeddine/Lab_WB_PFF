"""PDF alignment — add assurances, channels, analysis_tests, internal_notes tables
and missing columns on patients + conversations.

Revision ID: c3d4e5f60811
Revises: b2c3d4e5f607
Create Date: 2026-04-11 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f60811'
down_revision: Union[str, None] = 'b2c3d4e5f607'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. New reference tables
    # ------------------------------------------------------------------
    op.create_table(
        'assurances',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('code', sa.String(20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )

    op.create_table(
        'channels',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )

    # ------------------------------------------------------------------
    # 2. New columns on patients
    # ------------------------------------------------------------------
    op.add_column('patients', sa.Column('date_of_birth', sa.Date(), nullable=True))
    op.add_column('patients', sa.Column('gender', sa.String(10), nullable=True))
    op.add_column('patients', sa.Column('address', sa.Text(), nullable=True))
    op.add_column('patients', sa.Column('city', sa.String(100), nullable=True))
    op.add_column('patients', sa.Column('reference_number', sa.String(50), nullable=True))
    op.add_column('patients', sa.Column('insurance_id', sa.UUID(), nullable=True))
    op.add_column('patients', sa.Column('channel_id', sa.UUID(), nullable=True))

    op.create_unique_constraint('uq_patients_reference_number', 'patients', ['reference_number'])
    op.create_foreign_key('fk_patients_insurance_id', 'patients', 'assurances', ['insurance_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_patients_channel_id', 'patients', 'channels', ['channel_id'], ['id'], ondelete='SET NULL')

    # ------------------------------------------------------------------
    # 3. New columns on conversations
    # ------------------------------------------------------------------
    op.add_column('conversations', sa.Column('assigned_to', sa.UUID(), nullable=True))
    op.add_column('conversations', sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('conversations', sa.Column('is_ai_managed', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('conversations', sa.Column('needs_human_attention', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('conversations', sa.Column('is_after_hours', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('conversations', sa.Column('started_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('conversations', sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True))

    op.create_foreign_key('fk_conversations_assigned_to', 'conversations', 'operator_users', ['assigned_to'], ['id'], ondelete='SET NULL')

    # ------------------------------------------------------------------
    # 4. New enum + analysis_tests table
    # ------------------------------------------------------------------
    analysis_test_origin_enum = postgresql.ENUM('ai', 'manual', name='analysis_test_origin_enum', create_type=False)
    op.execute("CREATE TYPE analysis_test_origin_enum AS ENUM ('ai', 'manual')")

    op.create_table(
        'analysis_tests',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('analysis_request_id', sa.UUID(), nullable=False),
        sa.Column('catalog_item_id', sa.UUID(), nullable=True),
        sa.Column('origin', analysis_test_origin_enum, nullable=False, server_default='ai'),
        sa.Column('is_validated', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_corrected', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('corrected_by', sa.UUID(), nullable=True),
        sa.Column('tube_type', sa.String(50), nullable=True),
        sa.Column('sample_type', sa.String(50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['analysis_request_id'], ['analysis_requests.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['catalog_item_id'], ['analysis_catalog.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['corrected_by'], ['operator_users.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_analysis_tests_analysis_request_id', 'analysis_tests', ['analysis_request_id'])

    # ------------------------------------------------------------------
    # 5. internal_notes table
    # ------------------------------------------------------------------
    op.create_table(
        'internal_notes',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('conversation_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['operator_users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_internal_notes_conversation_id', 'internal_notes', ['conversation_id'])


def downgrade() -> None:
    op.drop_table('internal_notes')
    op.drop_index('ix_analysis_tests_analysis_request_id', table_name='analysis_tests')
    op.drop_table('analysis_tests')
    op.execute('DROP TYPE IF EXISTS analysis_test_origin_enum')

    op.drop_constraint('fk_conversations_assigned_to', 'conversations', type_='foreignkey')
    op.drop_column('conversations', 'closed_at')
    op.drop_column('conversations', 'started_at')
    op.drop_column('conversations', 'is_after_hours')
    op.drop_column('conversations', 'needs_human_attention')
    op.drop_column('conversations', 'is_ai_managed')
    op.drop_column('conversations', 'assigned_at')
    op.drop_column('conversations', 'assigned_to')

    op.drop_constraint('fk_patients_channel_id', 'patients', type_='foreignkey')
    op.drop_constraint('fk_patients_insurance_id', 'patients', type_='foreignkey')
    op.drop_constraint('uq_patients_reference_number', 'patients', type_='unique')
    op.drop_column('patients', 'channel_id')
    op.drop_column('patients', 'insurance_id')
    op.drop_column('patients', 'reference_number')
    op.drop_column('patients', 'city')
    op.drop_column('patients', 'address')
    op.drop_column('patients', 'gender')
    op.drop_column('patients', 'date_of_birth')

    op.drop_table('channels')
    op.drop_table('assurances')
