from datetime import datetime

from pydantic import BaseModel


class RosterSlotPublic(BaseModel):
    id: int
    league_id: int
    user_id: int
    ticker: str
    slot_type: str
    draft_pick_id: int | None
    acquired_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RosterResponse(BaseModel):
    active: list[RosterSlotPublic]
    bench: list[RosterSlotPublic]


class LineupUpdateRequest(BaseModel):
    active_tickers: list[str]
