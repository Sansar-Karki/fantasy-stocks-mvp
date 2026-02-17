from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.league import League, LeagueMember
from app.models.roster import RosterSlot
from app.models.trade import TradeItem, TradeProposal
from app.models.user import User
from app.schemas.trade import (
    TradeCreateRequest,
    TradeDetailResponse,
    TradeItemPublic,
    TradeProposalPublic,
    TradeRespondRequest,
)
from app.services.trade_rules import next_saturday_utc

router = APIRouter(prefix="/leagues/{league_id}/trades", tags=["trades"])


@router.post("", response_model=TradeDetailResponse, status_code=status.HTTP_201_CREATED)
def create_trade(
    league_id: int,
    payload: TradeCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TradeDetailResponse:
    league = _assert_member_and_get_league(db, league_id, current_user.id)
    _assert_trading_open(league)

    if payload.counterparty_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot trade with yourself")

    counterparty_member = db.scalar(
        select(LeagueMember).where(
            LeagueMember.league_id == league_id,
            LeagueMember.user_id == payload.counterparty_user_id,
        )
    )
    if not counterparty_member:
        raise HTTPException(status_code=404, detail="Counterparty is not in league")

    proposer_tickers = _normalize_unique(payload.proposer_tickers)
    counterparty_tickers = _normalize_unique(payload.counterparty_tickers)

    if len(proposer_tickers) != len(counterparty_tickers):
        raise HTTPException(status_code=400, detail="MVP rule: equal number of stocks on each side")

    _assert_user_owns_tickers(db, league_id, current_user.id, proposer_tickers)
    _assert_user_owns_tickers(db, league_id, payload.counterparty_user_id, counterparty_tickers)

    proposal = TradeProposal(
        league_id=league_id,
        proposer_user_id=current_user.id,
        counterparty_user_id=payload.counterparty_user_id,
        status="pending",
    )
    db.add(proposal)
    db.flush()

    for ticker in proposer_tickers:
        db.add(
            TradeItem(
                proposal_id=proposal.id,
                league_id=league_id,
                sending_user_id=current_user.id,
                receiving_user_id=payload.counterparty_user_id,
                ticker=ticker,
            )
        )
    for ticker in counterparty_tickers:
        db.add(
            TradeItem(
                proposal_id=proposal.id,
                league_id=league_id,
                sending_user_id=payload.counterparty_user_id,
                receiving_user_id=current_user.id,
                ticker=ticker,
            )
        )

    db.commit()
    items = (
        db.query(TradeItem)
        .filter(TradeItem.proposal_id == proposal.id)
        .order_by(TradeItem.id.asc())
        .all()
    )
    return TradeDetailResponse(
        proposal=TradeProposalPublic.model_validate(proposal),
        items=[TradeItemPublic.model_validate(item) for item in items],
    )


@router.get("", response_model=list[TradeDetailResponse])
def list_trades(
    league_id: int,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TradeDetailResponse]:
    _assert_member_and_get_league(db, league_id, current_user.id)

    query = db.query(TradeProposal).filter(
        TradeProposal.league_id == league_id,
        or_(
            TradeProposal.proposer_user_id == current_user.id,
            TradeProposal.counterparty_user_id == current_user.id,
        ),
    )
    if status_filter:
        query = query.filter(TradeProposal.status == status_filter)

    proposals = query.order_by(TradeProposal.created_at.desc()).all()
    results: list[TradeDetailResponse] = []
    for proposal in proposals:
        items = (
            db.query(TradeItem)
            .filter(TradeItem.proposal_id == proposal.id)
            .order_by(TradeItem.id.asc())
            .all()
        )
        results.append(
            TradeDetailResponse(
                proposal=TradeProposalPublic.model_validate(proposal),
                items=[TradeItemPublic.model_validate(item) for item in items],
            )
        )
    return results


@router.post("/{proposal_id}/respond", response_model=TradeDetailResponse)
def respond_trade(
    league_id: int,
    proposal_id: int,
    payload: TradeRespondRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TradeDetailResponse:
    league = _assert_member_and_get_league(db, league_id, current_user.id)
    _assert_trading_open(league)

    proposal = db.scalar(
        select(TradeProposal).where(TradeProposal.id == proposal_id, TradeProposal.league_id == league_id)
    )
    if not proposal:
        raise HTTPException(status_code=404, detail="Trade proposal not found")

    if proposal.counterparty_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only counterparty can respond")

    if proposal.status != "pending":
        raise HTTPException(status_code=400, detail="Trade is no longer pending")

    proposal.responded_at = datetime.now(timezone.utc)
    if payload.action == "accept":
        proposal.status = "accepted"
        proposal.effective_at = next_saturday_utc()
    else:
        proposal.status = "declined"

    db.commit()
    items = (
        db.query(TradeItem)
        .filter(TradeItem.proposal_id == proposal.id)
        .order_by(TradeItem.id.asc())
        .all()
    )
    return TradeDetailResponse(
        proposal=TradeProposalPublic.model_validate(proposal),
        items=[TradeItemPublic.model_validate(item) for item in items],
    )


@router.post("/process-due", response_model=dict[str, int])
def process_due_trades(
    league_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    league = db.scalar(select(League).where(League.id == league_id))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if league.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only league owner can process due trades")

    now = datetime.now(timezone.utc)
    due = (
        db.query(TradeProposal)
        .filter(
            TradeProposal.league_id == league_id,
            TradeProposal.status == "accepted",
            TradeProposal.effective_at.is_not(None),
            TradeProposal.effective_at <= now,
            TradeProposal.processed_at.is_(None),
        )
        .order_by(TradeProposal.effective_at.asc())
        .all()
    )

    processed = 0
    for proposal in due:
        items = db.query(TradeItem).filter(TradeItem.proposal_id == proposal.id).all()

        # Ensure every source user still owns the offered ticker.
        for item in items:
            slot = db.scalar(
                select(RosterSlot).where(
                    RosterSlot.league_id == league_id,
                    RosterSlot.user_id == item.sending_user_id,
                    RosterSlot.ticker == item.ticker,
                )
            )
            if not slot:
                proposal.status = "failed"
                proposal.processed_at = now
                break

        if proposal.status == "failed":
            continue

        for item in items:
            slot = db.scalar(
                select(RosterSlot).where(
                    RosterSlot.league_id == league_id,
                    RosterSlot.user_id == item.sending_user_id,
                    RosterSlot.ticker == item.ticker,
                )
            )
            if not slot:
                continue
            slot.user_id = item.receiving_user_id
            slot.slot_type = "bench"
            slot.updated_at = now

        proposal.status = "processed"
        proposal.processed_at = now
        processed += 1

    db.commit()
    return {"processed": processed}


def _assert_member_and_get_league(db: Session, league_id: int, user_id: int) -> League:
    league = db.scalar(select(League).where(League.id == league_id))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    membership = db.scalar(
        select(LeagueMember).where(LeagueMember.league_id == league_id, LeagueMember.user_id == user_id)
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this league")

    return league


def _normalize_unique(tickers: list[str]) -> list[str]:
    normalized = [ticker.strip().upper() for ticker in tickers if ticker.strip()]
    if len(normalized) != len(set(normalized)):
        raise HTTPException(status_code=400, detail="Tickers must be unique per side")
    return normalized


def _assert_user_owns_tickers(db: Session, league_id: int, user_id: int, tickers: list[str]) -> None:
    slots = (
        db.query(RosterSlot)
        .filter(
            RosterSlot.league_id == league_id,
            RosterSlot.user_id == user_id,
            RosterSlot.ticker.in_(tickers),
        )
        .all()
    )
    owned = {slot.ticker for slot in slots}
    missing = [ticker for ticker in tickers if ticker not in owned]
    if missing:
        raise HTTPException(status_code=400, detail=f"User does not own tickers: {', '.join(missing)}")


def _assert_trading_open(league: League) -> None:
    if league.trade_deadline is None:
        return
    if datetime.now(timezone.utc).date() > league.trade_deadline:
        raise HTTPException(status_code=400, detail="Trade deadline has passed")
