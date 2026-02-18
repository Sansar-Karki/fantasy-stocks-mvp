"""add draft current pick timer column

Revision ID: 0006_draft_turn_timer
Revises: 0005_playoffs
Create Date: 2026-02-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0006_draft_turn_timer"
down_revision: Union[str, None] = "0005_playoffs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("drafts", sa.Column("current_pick_started_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE drafts SET current_pick_started_at = started_at WHERE current_pick_started_at IS NULL")


def downgrade() -> None:
    op.drop_column("drafts", "current_pick_started_at")
