"""merge migration heads

Revision ID: 55f26efa2da1
Revises: c7d3f1a2b8e9, f6545f387ac9
Create Date: 2026-05-28 01:45:12.154552

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '55f26efa2da1'
down_revision: Union[str, Sequence[str], None] = ('c7d3f1a2b8e9', 'f6545f387ac9')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
