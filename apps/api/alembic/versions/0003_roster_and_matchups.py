"""add roster and matchup tables

Revision ID: 0003_roster_and_matchups
Revises: 0002_draft_tables
Create Date: 2026-02-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003_roster_and_matchups"
down_revision: Union[str, None] = "0002_draft_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roster_slots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("league_id", sa.Integer(), sa.ForeignKey("leagues.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ticker", sa.String(length=12), nullable=False),
        sa.Column("slot_type", sa.String(length=10), nullable=False, server_default="bench"),
        sa.Column("draft_pick_id", sa.Integer(), sa.ForeignKey("draft_picks.id"), nullable=True),
        sa.Column("acquired_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("league_id", "ticker", name="uq_roster_league_ticker"),
        sa.UniqueConstraint("league_id", "user_id", "ticker", name="uq_roster_user_ticker"),
    )
    op.create_index("ix_roster_slots_league_id", "roster_slots", ["league_id"], unique=False)
    op.create_index("ix_roster_slots_user_id", "roster_slots", ["user_id"], unique=False)
    op.create_index("ix_roster_slots_ticker", "roster_slots", ["ticker"], unique=False)

    op.create_table(
        "matchup_weeks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("league_id", sa.Integer(), sa.ForeignKey("leagues.id"), nullable=False),
        sa.Column("week_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="scheduled"),
        sa.Column("week_start_date", sa.Date(), nullable=False),
        sa.Column("week_end_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("league_id", "week_number", name="uq_league_week_number"),
    )
    op.create_index("ix_matchup_weeks_league_id", "matchup_weeks", ["league_id"], unique=False)
    op.create_index("ix_matchup_weeks_week_number", "matchup_weeks", ["week_number"], unique=False)

    op.create_table(
        "matchup_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("matchup_week_id", sa.Integer(), sa.ForeignKey("matchup_weeks.id"), nullable=False),
        sa.Column("league_id", sa.Integer(), sa.ForeignKey("leagues.id"), nullable=False),
        sa.Column("home_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("away_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("home_score", sa.Numeric(12, 4), nullable=False, server_default="0"),
        sa.Column("away_score", sa.Numeric(12, 4), nullable=False, server_default="0"),
        sa.Column("winner_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("scored_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "matchup_week_id", "home_user_id", "away_user_id", name="uq_matchup_pairing_per_week"
        ),
    )
    op.create_index("ix_matchup_results_matchup_week_id", "matchup_results", ["matchup_week_id"], unique=False)
    op.create_index("ix_matchup_results_league_id", "matchup_results", ["league_id"], unique=False)
    op.create_index("ix_matchup_results_home_user_id", "matchup_results", ["home_user_id"], unique=False)
    op.create_index("ix_matchup_results_away_user_id", "matchup_results", ["away_user_id"], unique=False)

    op.create_table(
        "stock_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("matchup_week_id", sa.Integer(), sa.ForeignKey("matchup_weeks.id"), nullable=False),
        sa.Column("league_id", sa.Integer(), sa.ForeignKey("leagues.id"), nullable=False),
        sa.Column("ticker", sa.String(length=12), nullable=False),
        sa.Column("snapshot_type", sa.String(length=20), nullable=False),
        sa.Column("close_price", sa.Numeric(12, 4), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint(
            "matchup_week_id", "ticker", "snapshot_type", name="uq_snapshot_week_ticker_type"
        ),
    )
    op.create_index("ix_stock_snapshots_matchup_week_id", "stock_snapshots", ["matchup_week_id"], unique=False)
    op.create_index("ix_stock_snapshots_league_id", "stock_snapshots", ["league_id"], unique=False)
    op.create_index("ix_stock_snapshots_ticker", "stock_snapshots", ["ticker"], unique=False)
    op.create_index("ix_stock_snapshots_snapshot_type", "stock_snapshots", ["snapshot_type"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_stock_snapshots_snapshot_type", table_name="stock_snapshots")
    op.drop_index("ix_stock_snapshots_ticker", table_name="stock_snapshots")
    op.drop_index("ix_stock_snapshots_league_id", table_name="stock_snapshots")
    op.drop_index("ix_stock_snapshots_matchup_week_id", table_name="stock_snapshots")
    op.drop_table("stock_snapshots")

    op.drop_index("ix_matchup_results_away_user_id", table_name="matchup_results")
    op.drop_index("ix_matchup_results_home_user_id", table_name="matchup_results")
    op.drop_index("ix_matchup_results_league_id", table_name="matchup_results")
    op.drop_index("ix_matchup_results_matchup_week_id", table_name="matchup_results")
    op.drop_table("matchup_results")

    op.drop_index("ix_matchup_weeks_week_number", table_name="matchup_weeks")
    op.drop_index("ix_matchup_weeks_league_id", table_name="matchup_weeks")
    op.drop_table("matchup_weeks")

    op.drop_index("ix_roster_slots_ticker", table_name="roster_slots")
    op.drop_index("ix_roster_slots_user_id", table_name="roster_slots")
    op.drop_index("ix_roster_slots_league_id", table_name="roster_slots")
    op.drop_table("roster_slots")
