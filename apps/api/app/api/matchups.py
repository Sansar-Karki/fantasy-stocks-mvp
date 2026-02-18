from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.league import League, LeagueMember
from app.models.matchup import MatchupResult, MatchupWeek, StockSnapshot
from app.models.roster import RosterSlot
from app.models.user import User
from app.schemas.matchup import (
    MatchupResultPublic,
    MatchupWeekCreateRequest,
    MatchupWeekDetailResponse,
    MatchupWeekPublic,
    SnapshotUpsertRequest,
)
from app.services.scoring import create_week_pairings, score_week
from app.services.market_data import fetch_close_price_for_date

router = APIRouter(prefix="/leagues/{league_id}/matchups", tags=["matchups"])


@router.post("/weeks", response_model=MatchupWeekPublic, status_code=status.HTTP_201_CREATED)
def create_week(
    league_id: int,
    payload: MatchupWeekCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MatchupWeekPublic:
    league = db.scalar(select(League).where(League.id == league_id))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if league.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only league owner can create matchup week")

    week = create_week_pairings(
        db, league_id, payload.week_number, payload.week_start_date, payload.week_end_date
    )
    return MatchupWeekPublic.model_validate(week)


@router.get("/weeks/{week_number}", response_model=MatchupWeekDetailResponse)
def get_week(
    league_id: int,
    week_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MatchupWeekDetailResponse:
    _assert_member(db, league_id, current_user.id)

    week = db.scalar(
        select(MatchupWeek).where(MatchupWeek.league_id == league_id, MatchupWeek.week_number == week_number)
    )
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")

    results = (
        db.query(MatchupResult)
        .filter(MatchupResult.matchup_week_id == week.id)
        .order_by(MatchupResult.id.asc())
        .all()
    )
    return MatchupWeekDetailResponse(
        week=MatchupWeekPublic.model_validate(week),
        results=[MatchupResultPublic.model_validate(row) for row in results],
    )


@router.get("/latest", response_model=MatchupWeekDetailResponse)
def get_latest_week(
    league_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MatchupWeekDetailResponse:
    _assert_member(db, league_id, current_user.id)

    week = db.scalar(
        select(MatchupWeek)
        .where(MatchupWeek.league_id == league_id)
        .order_by(MatchupWeek.week_number.desc())
        .limit(1)
    )
    if not week:
        raise HTTPException(status_code=404, detail="No matchup week found")

    results = (
        db.query(MatchupResult)
        .filter(MatchupResult.matchup_week_id == week.id)
        .order_by(MatchupResult.id.asc())
        .all()
    )
    return MatchupWeekDetailResponse(
        week=MatchupWeekPublic.model_validate(week),
        results=[MatchupResultPublic.model_validate(row) for row in results],
    )


@router.post("/weeks/{week_number}/snapshots", status_code=status.HTTP_201_CREATED)
def upsert_snapshot(
    league_id: int,
    week_number: int,
    payload: SnapshotUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    league = db.scalar(select(League).where(League.id == league_id))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if league.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only league owner can upsert snapshots")

    week = db.scalar(
        select(MatchupWeek).where(MatchupWeek.league_id == league_id, MatchupWeek.week_number == week_number)
    )
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")

    ticker = payload.ticker.strip().upper()
    existing = db.scalar(
        select(StockSnapshot).where(
            StockSnapshot.matchup_week_id == week.id,
            StockSnapshot.ticker == ticker,
            StockSnapshot.snapshot_type == payload.snapshot_type,
        )
    )

    if existing:
        existing.close_price = payload.close_price
        existing.captured_at = datetime.now(timezone.utc)
    else:
        db.add(
            StockSnapshot(
                matchup_week_id=week.id,
                league_id=league_id,
                ticker=ticker,
                snapshot_type=payload.snapshot_type,
                close_price=payload.close_price,
            )
        )

    db.commit()
    return {"message": "snapshot stored"}


@router.post("/weeks/{week_number}/snapshots/auto", status_code=status.HTTP_201_CREATED)
def auto_snapshots(
    league_id: int,
    week_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    league = db.scalar(select(League).where(League.id == league_id))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if league.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only league owner can run auto snapshots")

    week = db.scalar(
        select(MatchupWeek).where(MatchupWeek.league_id == league_id, MatchupWeek.week_number == week_number)
    )
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")

    active_tickers = {
        slot.ticker
        for slot in db.query(RosterSlot)
        .filter(RosterSlot.league_id == league_id, RosterSlot.slot_type == "active")
        .all()
    }

    stored = 0
    failed = 0
    for ticker in active_tickers:
        prices: list[tuple[str, float]] = []
        for snapshot_type, on_date in (
            ("monday_close", week.week_start_date),
            ("friday_close", week.week_end_date),
        ):
            try:
                price = fetch_close_price_for_date(ticker, on_date)
                prices.append((snapshot_type, price))
            except ValueError:
                failed += 1

        for snapshot_type, price in prices:
            existing = db.scalar(
                select(StockSnapshot).where(
                    StockSnapshot.matchup_week_id == week.id,
                    StockSnapshot.ticker == ticker,
                    StockSnapshot.snapshot_type == snapshot_type,
                )
            )
            if existing:
                existing.close_price = price
            else:
                db.add(
                    StockSnapshot(
                        matchup_week_id=week.id,
                        league_id=league_id,
                        ticker=ticker,
                        snapshot_type=snapshot_type,
                        close_price=price,
                    )
                )
            stored += 1

    db.commit()
    return {"stored": stored, "failed": failed}


@router.post("/weeks/{week_number}/score", response_model=MatchupWeekDetailResponse)
def run_scoring(
    league_id: int,
    week_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MatchupWeekDetailResponse:
    league = db.scalar(select(League).where(League.id == league_id))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if league.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only league owner can run scoring")

    week = score_week(db, league_id, week_number)
    results = (
        db.query(MatchupResult)
        .filter(MatchupResult.matchup_week_id == week.id)
        .order_by(MatchupResult.id.asc())
        .all()
    )

    return MatchupWeekDetailResponse(
        week=MatchupWeekPublic.model_validate(week),
        results=[MatchupResultPublic.model_validate(row) for row in results],
    )


def _assert_member(db: Session, league_id: int, user_id: int) -> None:
    member = db.scalar(
        select(LeagueMember).where(LeagueMember.league_id == league_id, LeagueMember.user_id == user_id)
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this league")
