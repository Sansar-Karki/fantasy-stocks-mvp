from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MatchupWeek(Base):
    __tablename__ = "matchup_weeks"
    __table_args__ = (UniqueConstraint("league_id", "week_number", name="uq_league_week_number"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("leagues.id"), index=True)
    week_number: Mapped[int] = mapped_column(index=True)
    status: Mapped[str] = mapped_column(String(20), default="scheduled")
    week_start_date: Mapped[date] = mapped_column(Date)
    week_end_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class MatchupResult(Base):
    __tablename__ = "matchup_results"
    __table_args__ = (
        UniqueConstraint(
            "matchup_week_id", "home_user_id", "away_user_id", name="uq_matchup_pairing_per_week"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    matchup_week_id: Mapped[int] = mapped_column(ForeignKey("matchup_weeks.id"), index=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("leagues.id"), index=True)
    home_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    away_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    home_score: Mapped[float] = mapped_column(Numeric(12, 4), default=0)
    away_score: Mapped[float] = mapped_column(Numeric(12, 4), default=0)
    winner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    scored_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class StockSnapshot(Base):
    __tablename__ = "stock_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "matchup_week_id", "ticker", "snapshot_type", name="uq_snapshot_week_ticker_type"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    matchup_week_id: Mapped[int] = mapped_column(ForeignKey("matchup_weeks.id"), index=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("leagues.id"), index=True)
    ticker: Mapped[str] = mapped_column(String(12), index=True)
    snapshot_type: Mapped[str] = mapped_column(String(20), index=True)
    close_price: Mapped[float] = mapped_column(Numeric(12, 4))
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
