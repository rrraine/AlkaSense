"""Module 4: session_reports and correction_log sync tables

Revision ID: c7d3f1a2b8e9
Revises: 5de445b23c39
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c7d3f1a2b8e9'
down_revision: Union[str, Sequence[str], None] = '5de445b23c39'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'session_reports',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('evaluator_id', sa.String(), nullable=False),
        sa.Column('total_samples', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_classified', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_rejected', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_corrections', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('asv_distribution', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('gt_distribution', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('csv_file_path', sa.String(), nullable=True),
        sa.Column(
            'upload_status',
            sa.String(),
            nullable=False,
            server_default='UPLOADED',
        ),
        sa.Column('uploaded_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_session_reports_id', 'session_reports', ['id'], unique=False)
    op.create_index('ix_session_reports_session_id', 'session_reports', ['session_id'], unique=False)

    op.create_table(
        'correction_log',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('sample_id', sa.String(), nullable=False),
        sa.Column('evaluator_id', sa.String(), nullable=False),
        sa.Column('original_asv_score', sa.Integer(), nullable=False),
        sa.Column('corrected_asv_score', sa.Integer(), nullable=False),
        sa.Column('correction_remark', sa.Text(), nullable=False),
        sa.Column('confirmed_score_id', sa.String(), nullable=True),
        sa.Column('deviation_remark', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('NOW()')),
        sa.Column('synced_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_correction_log_id', 'correction_log', ['id'], unique=False)
    op.create_index('ix_correction_log_session_id', 'correction_log', ['session_id'], unique=False)
    op.create_index('ix_correction_log_sample_id', 'correction_log', ['sample_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_correction_log_sample_id', table_name='correction_log')
    op.drop_index('ix_correction_log_session_id', table_name='correction_log')
    op.drop_index('ix_correction_log_id', table_name='correction_log')
    op.drop_table('correction_log')

    op.drop_index('ix_session_reports_session_id', table_name='session_reports')
    op.drop_index('ix_session_reports_id', table_name='session_reports')
    op.drop_table('session_reports')
