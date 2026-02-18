import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.draft import Draft, DraftPick
from app.models.league import League, LeagueMember
from app.models.roster import RosterSlot
from app.models.user import User
from app.schemas.draft import (
    DraftCreateRequest,
    DraftPickRequest,
    DraftPickPublic,
    DraftPublic,
    DraftRoomResponse,
)

router = APIRouter(prefix="/leagues/{league_id}/draft", tags=["draft"])


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/start", response_model=DraftPublic, status_code=status.HTTP_201_CREATED)
def start_draft(
    league_id: int,
    payload: DraftCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DraftPublic:
    league = db.scalar(select(League).where(League.id == league_id))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    if league.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only league owner can start draft")

    existing_draft = db.scalar(select(Draft).where(Draft.league_id == league_id))
    if existing_draft:
        raise HTTPException(status_code=400, detail="Draft already exists")

    members = _get_members_in_order(db, league_id)
    if len(members) < 2:
        raise HTTPException(status_code=400, detail="At least 2 members required to start draft")

    now = _now_utc()
    draft = Draft(
        league_id=league_id,
        status="live",
        total_rounds=8,
        pick_seconds=payload.pick_seconds,
        current_pick_number=1,
        current_pick_started_at=now,
        started_at=now,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return DraftPublic.model_validate(draft)


@router.get("", response_model=DraftRoomResponse)
def get_draft_room(
    league_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DraftRoomResponse:
    _assert_member(db, league_id, current_user.id)

    draft = db.scalar(select(Draft).where(Draft.league_id == league_id))
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    members = _get_members_in_order(db, league_id)
    total_picks = len(members) * draft.total_rounds
    if _apply_turn_timeouts(db, draft, total_picks):
        db.commit()
        db.refresh(draft)

    return _build_draft_room_response(db, draft, members)


@router.post("/picks", response_model=DraftRoomResponse)
def submit_pick(
    league_id: int,
    payload: DraftPickRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DraftRoomResponse:
    _assert_member(db, league_id, current_user.id)

    draft = db.scalar(select(Draft).where(Draft.league_id == league_id))
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if draft.status != "live":
        raise HTTPException(status_code=400, detail="Draft is not live")

    members = _get_members_in_order(db, league_id)
    total_picks = len(members) * draft.total_rounds
    if _apply_turn_timeouts(db, draft, total_picks):
        db.flush()

    round_number, expected_user_id = _current_turn(draft.current_pick_number, members, total_picks)
    if expected_user_id is None or round_number is None:
        raise HTTPException(status_code=400, detail="Draft already completed")

    if current_user.id != expected_user_id:
        raise HTTPException(status_code=400, detail="Not your turn")

    ticker = payload.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker is required")

    existing_ticker = db.scalar(
        select(DraftPick).where(DraftPick.draft_id == draft.id, DraftPick.ticker == ticker)
    )
    if existing_ticker:
        raise HTTPException(status_code=400, detail="Ticker already drafted")

    pick = DraftPick(
        draft_id=draft.id,
        league_id=league_id,
        user_id=current_user.id,
        pick_number=draft.current_pick_number,
        round_number=round_number,
        ticker=ticker,
    )
    db.add(pick)
    db.flush()

    user_slot_count = (
        db.query(RosterSlot)
        .filter(RosterSlot.league_id == league_id, RosterSlot.user_id == current_user.id)
        .count()
    )
    slot_type = "active" if user_slot_count < 5 else "bench"
    db.add(
        RosterSlot(
            league_id=league_id,
            user_id=current_user.id,
            ticker=ticker,
            slot_type=slot_type,
            draft_pick_id=pick.id,
        )
    )

    draft.current_pick_number += 1
    if draft.current_pick_number > total_picks:
        draft.status = "completed"
        draft.completed_at = _now_utc()
        draft.current_pick_started_at = None
    else:
        draft.current_pick_started_at = _now_utc()

    db.commit()
    db.refresh(draft)
    return _build_draft_room_response(db, draft, members)


@router.websocket("/ws")
async def draft_room_ws(
    websocket: WebSocket,
    league_id: int,
    token: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> None:
    if not token:
        await websocket.close(code=4401)
        return

    user = _get_user_from_token(db, token)
    if not user:
        await websocket.close(code=4401)
        return

    try:
        _assert_member(db, league_id, user.id)
    except HTTPException:
        await websocket.close(code=4403)
        return

    await websocket.accept()

    last_signature: tuple[int | None, int, str, int | None] | None = None
    try:
        while True:
            draft = db.scalar(select(Draft).where(Draft.league_id == league_id))
            if draft:
                members = _get_members_in_order(db, league_id)
                total_picks = len(members) * draft.total_rounds
                if _apply_turn_timeouts(db, draft, total_picks):
                    db.commit()
                    db.refresh(draft)

                room = _build_draft_room_response(db, draft, members)
                signature = (
                    room.draft.current_pick_number,
                    len(room.picks),
                    room.draft.status,
                    room.current_picker_user_id,
                )
                if signature != last_signature:
                    await websocket.send_json(room.model_dump(mode="json"))
                    last_signature = signature

            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
            except TimeoutError:
                continue
    except WebSocketDisconnect:
        return


def _get_user_from_token(db: Session, token: str) -> User | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    return db.query(User).filter(User.id == int(user_id)).first()


def _build_draft_room_response(
    db: Session, draft: Draft, members: list[LeagueMember]
) -> DraftRoomResponse:
    picks = (
        db.query(DraftPick)
        .filter(DraftPick.draft_id == draft.id)
        .order_by(DraftPick.pick_number.asc())
        .all()
    )
    total_picks = len(members) * draft.total_rounds
    current_round, current_picker_user_id = _current_turn(
        draft.current_pick_number, members, total_picks
    )

    return DraftRoomResponse(
        draft=DraftPublic.model_validate(draft),
        current_picker_user_id=current_picker_user_id,
        current_round=current_round,
        total_picks=total_picks,
        picks=[DraftPickPublic.model_validate(pick) for pick in picks],
    )


def _apply_turn_timeouts(db: Session, draft: Draft, total_picks: int) -> bool:
    if draft.status != "live" or draft.current_pick_started_at is None:
        return False

    now = _now_utc()
    turn_start = draft.current_pick_started_at
    changed = False

    while draft.current_pick_number <= total_picks and now >= (
        turn_start + timedelta(seconds=draft.pick_seconds)
    ):
        draft.current_pick_number += 1
        changed = True
        turn_start = turn_start + timedelta(seconds=draft.pick_seconds)

    if not changed:
        return False

    if draft.current_pick_number > total_picks:
        draft.status = "completed"
        draft.completed_at = now
        draft.current_pick_started_at = None
    else:
        draft.current_pick_started_at = turn_start

    db.add(draft)
    return True


def _assert_member(db: Session, league_id: int, user_id: int) -> None:
    member = db.scalar(
        select(LeagueMember).where(LeagueMember.league_id == league_id, LeagueMember.user_id == user_id)
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this league")


def _get_members_in_order(db: Session, league_id: int) -> list[LeagueMember]:
    return (
        db.query(LeagueMember)
        .filter(LeagueMember.league_id == league_id)
        .order_by(LeagueMember.created_at.asc(), LeagueMember.id.asc())
        .all()
    )


def _current_turn(
    current_pick_number: int, members: list[LeagueMember], total_picks: int
) -> tuple[int | None, int | None]:
    if not members or current_pick_number > total_picks:
        return None, None

    member_count = len(members)
    round_number = ((current_pick_number - 1) // member_count) + 1
    idx_in_round = (current_pick_number - 1) % member_count

    if round_number % 2 == 1:
        user_id = members[idx_in_round].user_id
    else:
        user_id = members[member_count - 1 - idx_in_round].user_id

    return round_number, user_id
