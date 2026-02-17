from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.league import LeagueMember
from app.models.matchup import MatchupResult, MatchupWeek, StockSnapshot
from app.models.roster import RosterSlot


def create_week_pairings(
    db: Session, league_id: int, week_number: int, week_start_date, week_end_date
) -> MatchupWeek:
    existing = db.scalar(
        select(MatchupWeek).where(MatchupWeek.league_id == league_id, MatchupWeek.week_number == week_number)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Week already exists")

    members = (
        db.query(LeagueMember)
        .filter(LeagueMember.league_id == league_id)
        .order_by(LeagueMember.created_at.asc(), LeagueMember.id.asc())
        .all()
    )
    if len(members) < 2:
        raise HTTPException(status_code=400, detail="At least 2 members required")

    week = MatchupWeek(
        league_id=league_id,
        week_number=week_number,
        status="scheduled",
        week_start_date=week_start_date,
        week_end_date=week_end_date,
    )
    db.add(week)
    db.flush()

    user_ids = [m.user_id for m in members]
    for i in range(0, len(user_ids), 2):
        home = user_ids[i]
        away = user_ids[i + 1] if i + 1 < len(user_ids) else None
        db.add(
            MatchupResult(
                matchup_week_id=week.id,
                league_id=league_id,
                home_user_id=home,
                away_user_id=away,
                home_score=Decimal("0"),
                away_score=Decimal("0"),
            )
        )

    db.commit()
    db.refresh(week)
    return week


def score_week(db: Session, league_id: int, week_number: int) -> MatchupWeek:
    week = db.scalar(
        select(MatchupWeek).where(MatchupWeek.league_id == league_id, MatchupWeek.week_number == week_number)
    )
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    if week.status == "scored":
        raise HTTPException(status_code=400, detail="Week already scored")

    results = (
        db.query(MatchupResult)
        .filter(MatchupResult.matchup_week_id == week.id)
        .order_by(MatchupResult.id.asc())
        .all()
    )

    for result in results:
        home_score = _team_score(db, league_id, week.id, result.home_user_id)
        away_score = _team_score(db, league_id, week.id, result.away_user_id) if result.away_user_id else 0.0

        result.home_score = Decimal(str(round(home_score, 4)))
        result.away_score = Decimal(str(round(away_score, 4)))

        if result.away_user_id is None:
            result.winner_user_id = result.home_user_id
        elif home_score > away_score:
            result.winner_user_id = result.home_user_id
        elif away_score > home_score:
            result.winner_user_id = result.away_user_id
        else:
            result.winner_user_id = None

        result.scored_at = datetime.now(timezone.utc)

        if result.winner_user_id is not None:
            winner = db.scalar(
                select(LeagueMember).where(
                    LeagueMember.league_id == league_id,
                    LeagueMember.user_id == result.winner_user_id,
                )
            )
            if winner:
                winner.wins += 1

            loser_id = None
            if result.away_user_id is None:
                loser_id = None
            elif result.winner_user_id == result.home_user_id:
                loser_id = result.away_user_id
            else:
                loser_id = result.home_user_id

            if loser_id is not None:
                loser = db.scalar(
                    select(LeagueMember).where(
                        LeagueMember.league_id == league_id,
                        LeagueMember.user_id == loser_id,
                    )
                )
                if loser:
                    loser.losses += 1

    week.status = "scored"
    db.commit()
    db.refresh(week)
    return week


def _team_score(db: Session, league_id: int, week_id: int, user_id: int | None) -> float:
    if user_id is None:
        return 0.0

    active_slots = (
        db.query(RosterSlot)
        .filter(
            RosterSlot.league_id == league_id,
            RosterSlot.user_id == user_id,
            RosterSlot.slot_type == "active",
        )
        .order_by(RosterSlot.id.asc())
        .all()
    )
    if not active_slots:
        return 0.0

    total = 0.0
    for slot in active_slots:
        monday = db.scalar(
            select(StockSnapshot).where(
                StockSnapshot.matchup_week_id == week_id,
                StockSnapshot.ticker == slot.ticker,
                StockSnapshot.snapshot_type == "monday_close",
            )
        )
        friday = db.scalar(
            select(StockSnapshot).where(
                StockSnapshot.matchup_week_id == week_id,
                StockSnapshot.ticker == slot.ticker,
                StockSnapshot.snapshot_type == "friday_close",
            )
        )

        if not monday or not friday:
            raise HTTPException(status_code=400, detail=f"Missing snapshots for {slot.ticker}")

        monday_price = float(monday.close_price)
        friday_price = float(friday.close_price)
        total += ((friday_price - monday_price) / monday_price) * 100.0

    return total
