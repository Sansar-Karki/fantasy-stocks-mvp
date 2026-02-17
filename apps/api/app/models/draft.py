from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Draft(Base):
    __tablename__ = "drafts"
    __table_args__ = (UniqueConstraint("league_id", name="uq_draft_league"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("leagues.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    total_rounds: Mapped[int] = mapped_column(Integer, default=8)
    pick_seconds: Mapped[int] = mapped_column(Integer, default=60)
    current_pick_number: Mapped[int] = mapped_column(Integer, default=1)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class DraftPick(Base):
    __tablename__ = "draft_picks"
    __table_args__ = (
        UniqueConstraint("draft_id", "pick_number", name="uq_draft_pick_number"),
        UniqueConstraint("draft_id", "ticker", name="uq_draft_ticker"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    draft_id: Mapped[int] = mapped_column(ForeignKey("drafts.id"), index=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("leagues.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    pick_number: Mapped[int] = mapped_column(Integer)
    round_number: Mapped[int] = mapped_column(Integer)
    ticker: Mapped[str] = mapped_column(String(12), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
