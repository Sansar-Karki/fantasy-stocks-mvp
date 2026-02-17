"""add draft tables

Revision ID: 0002_draft_tables
Revises: 0001_initial
Create Date: 2026-02-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0002_draft_tables"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "drafts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("league_id", sa.Integer(), sa.ForeignKey("leagues.id"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("total_rounds", sa.Integer(), nullable=False, server_default="8"),
        sa.Column("pick_seconds", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("current_pick_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("league_id", name="uq_draft_league"),
    )
    op.create_index("ix_drafts_league_id", "drafts", ["league_id"], unique=False)

    op.create_table(
        "draft_picks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("draft_id", sa.Integer(), sa.ForeignKey("drafts.id"), nullable=False),
        sa.Column("league_id", sa.Integer(), sa.ForeignKey("leagues.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("pick_number", sa.Integer(), nullable=False),
        sa.Column("round_number", sa.Integer(), nullable=False),
        sa.Column("ticker", sa.String(length=12), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("draft_id", "pick_number", name="uq_draft_pick_number"),
        sa.UniqueConstraint("draft_id", "ticker", name="uq_draft_ticker"),
    )
    op.create_index("ix_draft_picks_draft_id", "draft_picks", ["draft_id"], unique=False)
    op.create_index("ix_draft_picks_league_id", "draft_picks", ["league_id"], unique=False)
    op.create_index("ix_draft_picks_ticker", "draft_picks", ["ticker"], unique=False)
    op.create_index("ix_draft_picks_user_id", "draft_picks", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_draft_picks_user_id", table_name="draft_picks")
    op.drop_index("ix_draft_picks_ticker", table_name="draft_picks")
    op.drop_index("ix_draft_picks_league_id", table_name="draft_picks")
    op.drop_index("ix_draft_picks_draft_id", table_name="draft_picks")
    op.drop_table("draft_picks")
    op.drop_index("ix_drafts_league_id", table_name="drafts")
    op.drop_table("drafts")
