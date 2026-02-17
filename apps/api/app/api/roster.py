from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.league import LeagueMember
from app.models.roster import RosterSlot
from app.models.user import User
from app.schemas.roster import LineupUpdateRequest, RosterResponse, RosterSlotPublic
from app.services.time_rules import is_lineup_edit_window

router = APIRouter(prefix="/leagues/{league_id}/roster", tags=["roster"])


@router.get("", response_model=RosterResponse)
def get_my_roster(
    league_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RosterResponse:
    _assert_member(db, league_id, current_user.id)
    slots = _get_user_slots(db, league_id, current_user.id)
    return _to_response(slots)


@router.post("/lineup", response_model=RosterResponse)
def update_lineup(
    league_id: int,
    payload: LineupUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RosterResponse:
    _assert_member(db, league_id, current_user.id)

    if not is_lineup_edit_window():
        raise HTTPException(status_code=400, detail="Lineup changes allowed only on Saturday/Sunday")

    slots = _get_user_slots(db, league_id, current_user.id)
    if len(slots) != 8:
        raise HTTPException(status_code=400, detail="Roster must have exactly 8 slots")

    normalized = [ticker.strip().upper() for ticker in payload.active_tickers if ticker.strip()]
    if len(normalized) != 5 or len(set(normalized)) != 5:
        raise HTTPException(status_code=400, detail="active_tickers must contain 5 unique tickers")

    owned = {slot.ticker for slot in slots}
    if not set(normalized).issubset(owned):
        raise HTTPException(status_code=400, detail="All active tickers must be owned by user")

    now = datetime.now(timezone.utc)
    for slot in slots:
        slot.slot_type = "active" if slot.ticker in normalized else "bench"
        slot.updated_at = now

    db.commit()
    updated = _get_user_slots(db, league_id, current_user.id)
    return _to_response(updated)


def _assert_member(db: Session, league_id: int, user_id: int) -> None:
    member = db.scalar(
        select(LeagueMember).where(LeagueMember.league_id == league_id, LeagueMember.user_id == user_id)
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this league")


def _get_user_slots(db: Session, league_id: int, user_id: int) -> list[RosterSlot]:
    return (
        db.query(RosterSlot)
        .filter(RosterSlot.league_id == league_id, RosterSlot.user_id == user_id)
        .order_by(RosterSlot.acquired_at.asc(), RosterSlot.id.asc())
        .all()
    )


def _to_response(slots: list[RosterSlot]) -> RosterResponse:
    active = [RosterSlotPublic.model_validate(slot) for slot in slots if slot.slot_type == "active"]
    bench = [RosterSlotPublic.model_validate(slot) for slot in slots if slot.slot_type == "bench"]
    return RosterResponse(active=active, bench=bench)
