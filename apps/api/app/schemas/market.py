from pydantic import BaseModel


class MarketSearchResult(BaseModel):
    ticker: str
    name: str
    exchange: str | None = None


class MarketQuoteResponse(BaseModel):
    ticker: str
    name: str
    current_price: float | None = None
    daily_change_percent: float | None = None
    market_cap: float | None = None
    sector: str | None = None
    pe_ratio: float | None = None
    fifty_two_week_high: float | None = None
    fifty_two_week_low: float | None = None
