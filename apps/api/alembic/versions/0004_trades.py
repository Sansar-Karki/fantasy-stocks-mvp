"""add trade system

Revision ID: 0004_trades
Revises: 0003_roster_and_matchups
Create Date: 2026-02-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0004_trades"
down_revision: Union[str, None] = "0003_roster_and_matchups"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("leagues", sa.Column("trade_deadline", sa.Date(), nullable=True))

    op.create_table(
        "trade_proposals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("league_id", sa.Integer(), sa.ForeignKey("leagues.id"), nullable=False),
        sa.Column("proposer_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("counterparty_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("effective_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_trade_proposals_league_id", "trade_proposals", ["league_id"], unique=False)
    op.create_index(
        "ix_trade_proposals_proposer_user_id", "trade_proposals", ["proposer_user_id"], unique=False
    )
    op.create_index(
        "ix_trade_proposals_counterparty_user_id",
        "trade_proposals",
        ["counterparty_user_id"],
        unique=False,
    )

    op.create_table(
        "trade_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("proposal_id", sa.Integer(), sa.ForeignKey("trade_proposals.id"), nullable=False),
        sa.Column("league_id", sa.Integer(), sa.ForeignKey("leagues.id"), nullable=False),
        sa.Column("sending_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("receiving_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ticker", sa.String(length=12), nullable=False),
    )
    op.create_index("ix_trade_items_proposal_id", "trade_items", ["proposal_id"], unique=False)
    op.create_index("ix_trade_items_league_id", "trade_items", ["league_id"], unique=False)
    op.create_index("ix_trade_items_sending_user_id", "trade_items", ["sending_user_id"], unique=False)
    op.create_index("ix_trade_items_receiving_user_id", "trade_items", ["receiving_user_id"], unique=False)
    op.create_index("ix_trade_items_ticker", "trade_items", ["ticker"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_trade_items_ticker", table_name="trade_items")
    op.drop_index("ix_trade_items_receiving_user_id", table_name="trade_items")
    op.drop_index("ix_trade_items_sending_user_id", table_name="trade_items")
    op.drop_index("ix_trade_items_league_id", table_name="trade_items")
    op.drop_index("ix_trade_items_proposal_id", table_name="trade_items")
    op.drop_table("trade_items")

    op.drop_index("ix_trade_proposals_counterparty_user_id", table_name="trade_proposals")
    op.drop_index("ix_trade_proposals_proposer_user_id", table_name="trade_proposals")
    op.drop_index("ix_trade_proposals_league_id", table_name="trade_proposals")
    op.drop_table("trade_proposals")

    op.drop_column("leagues", "trade_deadline")
