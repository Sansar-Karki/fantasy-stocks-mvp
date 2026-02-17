from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TradeProposal(Base):
    __tablename__ = "trade_proposals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("leagues.id"), index=True)
    proposer_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    counterparty_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    effective_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class TradeItem(Base):
    __tablename__ = "trade_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    proposal_id: Mapped[int] = mapped_column(ForeignKey("trade_proposals.id"), index=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("leagues.id"), index=True)
    sending_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    receiving_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    ticker: Mapped[str] = mapped_column(String(12), index=True)
