from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PlayoffMatch(Base):
    __tablename__ = "playoff_matches"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("leagues.id"), index=True)
    round_number: Mapped[int] = mapped_column(Integer, index=True)
    matchup_number: Mapped[int] = mapped_column(Integer)
    home_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    away_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    winner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="scheduled")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
