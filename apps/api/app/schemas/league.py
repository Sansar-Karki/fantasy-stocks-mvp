from datetime import date, datetime

from pydantic import BaseModel, Field


class LeagueCreateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    max_members: int = Field(default=6, ge=2, le=12)
    trade_deadline: date | None = None


class LeagueJoinRequest(BaseModel):
    invite_code: str = Field(min_length=6, max_length=12)


class LeaguePublic(BaseModel):
    id: int
    name: str
    invite_code: str
    owner_id: int
    max_members: int
    season_status: str
    trade_deadline: date | None
    created_at: datetime

    model_config = {"from_attributes": True}


class LeagueMemberPublic(BaseModel):
    id: int
    league_id: int
    user_id: int
    display_name: str
    wins: int
    losses: int
    created_at: datetime

    model_config = {"from_attributes": True}


class LeagueDetailResponse(BaseModel):
    league: LeaguePublic
    members: list[LeagueMemberPublic]


class LeagueStandingRow(BaseModel):
    user_id: int
    display_name: str
    wins: int
    losses: int


class LeagueStandingsResponse(BaseModel):
    league_id: int
    rows: list[LeagueStandingRow]


class SeasonStatusUpdateRequest(BaseModel):
    season_status: str = Field(pattern="^(setup|regular|playoffs|complete|paused)$")


class TradeDeadlineUpdateRequest(BaseModel):
    trade_deadline: date | None = None
