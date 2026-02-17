from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.league import League, LeagueMember
from app.models.user import User
from app.schemas.league import (
    LeagueCreateRequest,
    LeagueDetailResponse,
    LeagueJoinRequest,
    LeagueMemberPublic,
    LeagueStandingRow,
    LeagueStandingsResponse,
    LeaguePublic,
    SeasonStatusUpdateRequest,
    TradeDeadlineUpdateRequest,
)
from app.services.invite_code import generate_invite_code

router = APIRouter(prefix="/leagues", tags=["leagues"])


@router.post("", response_model=LeaguePublic, status_code=status.HTTP_201_CREATED)
def create_league(
    payload: LeagueCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeaguePublic:
    invite_code = _generate_unique_invite_code(db)
    league = League(
        name=payload.name,
        invite_code=invite_code,
        owner_id=current_user.id,
        max_members=payload.max_members,
        trade_deadline=payload.trade_deadline,
    )
    db.add(league)
    db.flush()

    owner_membership = LeagueMember(
        league_id=league.id,
        user_id=current_user.id,
        display_name=current_user.username,
    )
    db.add(owner_membership)
    db.commit()
    db.refresh(league)

    return LeaguePublic.model_validate(league)


@router.post("/join", response_model=LeaguePublic)
def join_league(
    payload: LeagueJoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeaguePublic:
    invite_code = payload.invite_code.upper()
    league = db.scalar(select(League).where(League.invite_code == invite_code))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    existing_membership = db.scalar(
        select(LeagueMember).where(
            LeagueMember.league_id == league.id, LeagueMember.user_id == current_user.id
        )
    )
    if existing_membership:
        raise HTTPException(status_code=400, detail="Already in league")

    member_count = db.query(LeagueMember).filter(LeagueMember.league_id == league.id).count()
    if member_count >= league.max_members:
        raise HTTPException(status_code=400, detail="League is full")

    membership = LeagueMember(
        league_id=league.id,
        user_id=current_user.id,
        display_name=current_user.username,
    )
    db.add(membership)
    db.commit()
    db.refresh(league)
    return LeaguePublic.model_validate(league)


@router.get("", response_model=list[LeaguePublic])
def list_my_leagues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LeaguePublic]:
    leagues = (
        db.query(League)
        .join(LeagueMember, LeagueMember.league_id == League.id)
        .filter(LeagueMember.user_id == current_user.id)
        .order_by(League.created_at.desc())
        .all()
    )
    return [LeaguePublic.model_validate(league) for league in leagues]


@router.get("/{league_id}", response_model=LeagueDetailResponse)
def get_league(
    league_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeagueDetailResponse:
    league = db.scalar(select(League).where(League.id == league_id))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    membership = db.scalar(
        select(LeagueMember).where(
            LeagueMember.league_id == league.id, LeagueMember.user_id == current_user.id
        )
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this league")

    members = (
        db.query(LeagueMember)
        .filter(LeagueMember.league_id == league.id)
        .order_by(LeagueMember.created_at.asc())
        .all()
    )
    return LeagueDetailResponse(
        league=LeaguePublic.model_validate(league),
        members=[LeagueMemberPublic.model_validate(member) for member in members],
    )


@router.get("/{league_id}/standings", response_model=LeagueStandingsResponse)
def get_standings(
    league_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeagueStandingsResponse:
    league = db.scalar(select(League).where(League.id == league_id))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    _assert_member(db, league_id, current_user.id)

    members = (
        db.query(LeagueMember)
        .filter(LeagueMember.league_id == league_id)
        .order_by(LeagueMember.wins.desc(), LeagueMember.losses.asc(), LeagueMember.created_at.asc())
        .all()
    )
    return LeagueStandingsResponse(
        league_id=league_id,
        rows=[
            LeagueStandingRow(
                user_id=member.user_id,
                display_name=member.display_name,
                wins=member.wins,
                losses=member.losses,
            )
            for member in members
        ],
    )


@router.patch("/{league_id}/season", response_model=LeaguePublic)
def update_season_status(
    league_id: int,
    payload: SeasonStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeaguePublic:
    league = db.scalar(select(League).where(League.id == league_id))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    _assert_owner(league, current_user.id)
    league.season_status = payload.season_status
    db.commit()
    db.refresh(league)
    return LeaguePublic.model_validate(league)


@router.patch("/{league_id}/trade-deadline", response_model=LeaguePublic)
def update_trade_deadline(
    league_id: int,
    payload: TradeDeadlineUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeaguePublic:
    league = db.scalar(select(League).where(League.id == league_id))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    _assert_owner(league, current_user.id)
    league.trade_deadline = payload.trade_deadline
    db.commit()
    db.refresh(league)
    return LeaguePublic.model_validate(league)


@router.delete("/{league_id}/members/{member_user_id}", response_model=dict[str, str])
def kick_member(
    league_id: int,
    member_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    league = db.scalar(select(League).where(League.id == league_id))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    _assert_owner(league, current_user.id)
    if member_user_id == league.owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove league owner")

    member = db.scalar(
        select(LeagueMember).where(
            LeagueMember.league_id == league_id, LeagueMember.user_id == member_user_id
        )
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"message": "member removed"}


def _generate_unique_invite_code(db: Session) -> str:
    for _ in range(10):
        code = generate_invite_code()
        exists = db.scalar(select(League).where(League.invite_code == code))
        if not exists:
            return code
    raise HTTPException(status_code=500, detail="Unable to generate invite code")


def _assert_member(db: Session, league_id: int, user_id: int) -> None:
    member = db.scalar(
        select(LeagueMember).where(LeagueMember.league_id == league_id, LeagueMember.user_id == user_id)
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this league")


def _assert_owner(league: League, user_id: int) -> None:
    if league.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only league owner can perform this action")
