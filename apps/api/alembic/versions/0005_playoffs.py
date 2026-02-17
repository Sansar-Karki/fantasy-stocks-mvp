"""add playoffs table

Revision ID: 0005_playoffs
Revises: 0004_trades
Create Date: 2026-02-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0005_playoffs"
down_revision: Union[str, None] = "0004_trades"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "playoff_matches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("league_id", sa.Integer(), sa.ForeignKey("leagues.id"), nullable=False),
        sa.Column("round_number", sa.Integer(), nullable=False),
        sa.Column("matchup_number", sa.Integer(), nullable=False),
        sa.Column("home_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("away_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("winner_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="scheduled"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_playoff_matches_league_id", "playoff_matches", ["league_id"], unique=False)
    op.create_index("ix_playoff_matches_round_number", "playoff_matches", ["round_number"], unique=False)
    op.create_index("ix_playoff_matches_home_user_id", "playoff_matches", ["home_user_id"], unique=False)
    op.create_index("ix_playoff_matches_away_user_id", "playoff_matches", ["away_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_playoff_matches_away_user_id", table_name="playoff_matches")
    op.drop_index("ix_playoff_matches_home_user_id", table_name="playoff_matches")
    op.drop_index("ix_playoff_matches_round_number", table_name="playoff_matches")
    op.drop_index("ix_playoff_matches_league_id", table_name="playoff_matches")
    op.drop_table("playoff_matches")
