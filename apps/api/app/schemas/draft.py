from datetime import datetime

from pydantic import BaseModel, Field


class DraftCreateRequest(BaseModel):
    pick_seconds: int = Field(default=60, ge=10, le=300)


class DraftPickRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=12)


class DraftPublic(BaseModel):
    id: int
    league_id: int
    status: str
    total_rounds: int
    pick_seconds: int
    current_pick_number: int
    current_pick_started_at: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DraftPickPublic(BaseModel):
    id: int
    draft_id: int
    league_id: int
    user_id: int
    pick_number: int
    round_number: int
    ticker: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DraftRoomResponse(BaseModel):
    draft: DraftPublic
    current_picker_user_id: int | None
    current_round: int | None
    total_picks: int
    picks: list[DraftPickPublic]
