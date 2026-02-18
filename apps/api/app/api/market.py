from fastapi import APIRouter, HTTPException, Query

from app.schemas.market import MarketQuoteResponse, MarketSearchResult
from app.services.market_data import fetch_quote, search_tickers

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/search", response_model=list[MarketSearchResult])
def search_market(
    q: str = Query(min_length=1),
    limit: int = Query(default=8, ge=1, le=20),
) -> list[MarketSearchResult]:
    rows = search_tickers(q, limit=limit)
    return [
        MarketSearchResult(ticker=row.ticker, name=row.name, exchange=row.exchange)
        for row in rows
    ]


@router.get("/{ticker}", response_model=MarketQuoteResponse)
def get_market_quote(ticker: str) -> MarketQuoteResponse:
    try:
        quote = fetch_quote(ticker)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return MarketQuoteResponse(
        ticker=quote.ticker,
        name=quote.name,
        current_price=quote.current_price,
        daily_change_percent=quote.daily_change_percent,
        market_cap=quote.market_cap,
        sector=quote.sector,
        pe_ratio=quote.pe_ratio,
        fifty_two_week_high=quote.fifty_two_week_high,
        fifty_two_week_low=quote.fifty_two_week_low,
    )
