from datetime import datetime

from pydantic import BaseModel, Field


class TradeCreateRequest(BaseModel):
    counterparty_user_id: int
    proposer_tickers: list[str] = Field(min_length=1)
    counterparty_tickers: list[str] = Field(min_length=1)


class TradeRespondRequest(BaseModel):
    action: str = Field(pattern="^(accept|decline)$")


class TradeItemPublic(BaseModel):
    id: int
    proposal_id: int
    league_id: int
    sending_user_id: int
    receiving_user_id: int
    ticker: str

    model_config = {"from_attributes": True}


class TradeProposalPublic(BaseModel):
    id: int
    league_id: int
    proposer_user_id: int
    counterparty_user_id: int
    status: str
    created_at: datetime
    responded_at: datetime | None
    effective_at: datetime | None
    processed_at: datetime | None

    model_config = {"from_attributes": True}


class TradeDetailResponse(BaseModel):
    proposal: TradeProposalPublic
    items: list[TradeItemPublic]
