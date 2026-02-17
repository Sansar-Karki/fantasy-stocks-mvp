from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.league import League, LeagueMember
from app.models.playoff import PlayoffMatch
from app.models.user import User
from app.schemas.playoff import PlayoffBracketResponse, PlayoffMatchPublic, PlayoffResultRequest

router = APIRouter(prefix="/leagues/{league_id}/playoffs", tags=["playoffs"])


@router.post("/generate", response_model=PlayoffBracketResponse, status_code=status.HTTP_201_CREATED)
def generate_bracket(
    league_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlayoffBracketResponse:
    league = db.scalar(select(League).where(League.id == league_id))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if league.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only league owner can generate bracket")

    existing = db.query(PlayoffMatch).filter(PlayoffMatch.league_id == league_id).count()
    if existing > 0:
        raise HTTPException(status_code=400, detail="Playoff bracket already exists")

    standings = (
        db.query(LeagueMember)
        .filter(LeagueMember.league_id == league_id)
        .order_by(LeagueMember.wins.desc(), LeagueMember.losses.asc(), LeagueMember.created_at.asc())
        .limit(4)
        .all()
    )
    if len(standings) < 4:
        raise HTTPException(status_code=400, detail="Need at least 4 teams for playoffs")

    seed_ids = [row.user_id for row in standings]
    db.add(
        PlayoffMatch(
            league_id=league_id,
            round_number=1,
            matchup_number=1,
            home_user_id=seed_ids[0],
            away_user_id=seed_ids[3],
        )
    )
    db.add(
        PlayoffMatch(
            league_id=league_id,
            round_number=1,
            matchup_number=2,
            home_user_id=seed_ids[1],
            away_user_id=seed_ids[2],
        )
    )
    league.season_status = "playoffs"
    db.commit()

    matches = (
        db.query(PlayoffMatch)
        .filter(PlayoffMatch.league_id == league_id)
        .order_by(PlayoffMatch.round_number.asc(), PlayoffMatch.matchup_number.asc())
        .all()
    )
    return PlayoffBracketResponse(
        league_id=league_id,
        matches=[PlayoffMatchPublic.model_validate(match) for match in matches],
        champion_user_id=None,
    )


@router.get("", response_model=PlayoffBracketResponse)
def get_bracket(
    league_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlayoffBracketResponse:
    _assert_member(db, league_id, current_user.id)

    matches = (
        db.query(PlayoffMatch)
        .filter(PlayoffMatch.league_id == league_id)
        .order_by(PlayoffMatch.round_number.asc(), PlayoffMatch.matchup_number.asc())
        .all()
    )
    champion = _champion_user_id(matches)
    return PlayoffBracketResponse(
        league_id=league_id,
        matches=[PlayoffMatchPublic.model_validate(match) for match in matches],
        champion_user_id=champion,
    )


@router.post("/matches/{match_id}/result", response_model=PlayoffBracketResponse)
def record_result(
    league_id: int,
    match_id: int,
    payload: PlayoffResultRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlayoffBracketResponse:
    league = db.scalar(select(League).where(League.id == league_id))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if league.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only league owner can record playoff results")

    match = db.scalar(select(PlayoffMatch).where(PlayoffMatch.id == match_id, PlayoffMatch.league_id == league_id))
    if not match:
        raise HTTPException(status_code=404, detail="Playoff match not found")

    if payload.winner_user_id not in (match.home_user_id, match.away_user_id):
        raise HTTPException(status_code=400, detail="Winner must be one of matchup users")

    match.winner_user_id = payload.winner_user_id
    match.status = "completed"

    if match.round_number == 1:
        semifinals = (
            db.query(PlayoffMatch)
            .filter(PlayoffMatch.league_id == league_id, PlayoffMatch.round_number == 1)
            .order_by(PlayoffMatch.matchup_number.asc())
            .all()
        )
        if len(semifinals) == 2 and all(m.winner_user_id for m in semifinals):
            final_exists = (
                db.query(PlayoffMatch)
                .filter(PlayoffMatch.league_id == league_id, PlayoffMatch.round_number == 2)
                .count()
            )
            if final_exists == 0:
                db.add(
                    PlayoffMatch(
                        league_id=league_id,
                        round_number=2,
                        matchup_number=1,
                        home_user_id=semifinals[0].winner_user_id,
                        away_user_id=semifinals[1].winner_user_id,
                    )
                )

    if match.round_number == 2:
        league.season_status = "complete"

    db.commit()

    matches = (
        db.query(PlayoffMatch)
        .filter(PlayoffMatch.league_id == league_id)
        .order_by(PlayoffMatch.round_number.asc(), PlayoffMatch.matchup_number.asc())
        .all()
    )
    champion = _champion_user_id(matches)
    return PlayoffBracketResponse(
        league_id=league_id,
        matches=[PlayoffMatchPublic.model_validate(m) for m in matches],
        champion_user_id=champion,
    )


def _assert_member(db: Session, league_id: int, user_id: int) -> None:
    member = db.scalar(
        select(LeagueMember).where(LeagueMember.league_id == league_id, LeagueMember.user_id == user_id)
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this league")


def _champion_user_id(matches: list[PlayoffMatch]) -> int | None:
    finals = [m for m in matches if m.round_number == 2]
    if finals and finals[0].winner_user_id:
        return finals[0].winner_user_id
    return None
