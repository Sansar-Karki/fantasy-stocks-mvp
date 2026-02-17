from datetime import datetime

from pydantic import BaseModel


class PlayoffMatchPublic(BaseModel):
    id: int
    league_id: int
    round_number: int
    matchup_number: int
    home_user_id: int
    away_user_id: int
    winner_user_id: int | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PlayoffBracketResponse(BaseModel):
    league_id: int
    matches: list[PlayoffMatchPublic]
    champion_user_id: int | None


class PlayoffResultRequest(BaseModel):
    winner_user_id: int
