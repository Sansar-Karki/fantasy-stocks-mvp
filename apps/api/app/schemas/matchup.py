from datetime import date, datetime

from pydantic import BaseModel, Field


class MatchupWeekCreateRequest(BaseModel):
    week_number: int = Field(ge=1, le=52)
    week_start_date: date
    week_end_date: date


class SnapshotUpsertRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=12)
    snapshot_type: str = Field(pattern="^(monday_close|friday_close)$")
    close_price: float = Field(gt=0)


class MatchupWeekPublic(BaseModel):
    id: int
    league_id: int
    week_number: int
    status: str
    week_start_date: date
    week_end_date: date
    created_at: datetime

    model_config = {"from_attributes": True}


class MatchupResultPublic(BaseModel):
    id: int
    matchup_week_id: int
    league_id: int
    home_user_id: int
    away_user_id: int | None
    home_score: float
    away_score: float
    winner_user_id: int | None
    scored_at: datetime | None

    model_config = {"from_attributes": True}


class MatchupWeekDetailResponse(BaseModel):
    week: MatchupWeekPublic
    results: list[MatchupResultPublic]
