from dataclasses import dataclass
from datetime import date, timedelta

import yfinance as yf


@dataclass
class QuoteResult:
    ticker: str
    name: str
    current_price: float | None
    daily_change_percent: float | None
    market_cap: float | None
    sector: str | None
    pe_ratio: float | None
    fifty_two_week_high: float | None
    fifty_two_week_low: float | None


@dataclass
class SearchResult:
    ticker: str
    name: str
    exchange: str | None


def fetch_close_price_for_date(ticker: str, on_date: date) -> float:
    normalized = ticker.strip().upper()
    if not normalized:
        raise ValueError("Ticker cannot be empty")

    # Markets can be closed on weekends/holidays. Walk back a few days.
    for offset in range(0, 8):
        candidate = on_date - timedelta(days=offset)
        data = _download_day(normalized, candidate)
        if data is None or data.empty or "Close" not in data:
            continue

        close_row = data["Close"].iloc[-1]
        price = _to_float(close_row)
        if price is not None:
            return price

    raise ValueError(f"No close price found for {normalized} near {on_date.isoformat()}")


def fetch_quote(ticker: str) -> QuoteResult:
    normalized = ticker.strip().upper()
    if not normalized:
        raise ValueError("Ticker cannot be empty")

    try:
        yf_ticker = yf.Ticker(normalized)
        fast_info = dict(getattr(yf_ticker, "fast_info", {}) or {})
        info = yf_ticker.get_info() or {}
    except Exception as exc:  # pragma: no cover - external API wrapper
        raise ValueError(f"Failed to fetch market data for {normalized}: {exc}") from exc

    name = _first_str(info, ["longName", "shortName"]) or normalized
    current_price = _first_float(fast_info, ["last_price", "regular_market_price"])
    if current_price is None:
        current_price = _first_float(info, ["currentPrice", "regularMarketPrice"])

    daily_change_percent = _first_float(fast_info, ["regular_market_change_percent"])
    if daily_change_percent is None:
        daily_change_percent = _first_float(info, ["regularMarketChangePercent"])

    market_cap = _first_float(fast_info, ["market_cap"])
    if market_cap is None:
        market_cap = _first_float(info, ["marketCap"])

    pe_ratio = _first_float(fast_info, ["trailing_pe"])
    if pe_ratio is None:
        pe_ratio = _first_float(info, ["trailingPE"])

    fifty_two_week_high = _first_float(fast_info, ["year_high"])
    if fifty_two_week_high is None:
        fifty_two_week_high = _first_float(info, ["fiftyTwoWeekHigh"])

    fifty_two_week_low = _first_float(fast_info, ["year_low"])
    if fifty_two_week_low is None:
        fifty_two_week_low = _first_float(info, ["fiftyTwoWeekLow"])

    return QuoteResult(
        ticker=normalized,
        name=name,
        current_price=current_price,
        daily_change_percent=daily_change_percent,
        market_cap=market_cap,
        sector=_first_str(info, ["sector"]),
        pe_ratio=pe_ratio,
        fifty_two_week_high=fifty_two_week_high,
        fifty_two_week_low=fifty_two_week_low,
    )


def search_tickers(query: str, limit: int = 10) -> list[SearchResult]:
    normalized = query.strip()
    if not normalized:
        return []

    max_results = min(max(limit, 1), 20)
    results: list[SearchResult] = []

    try:
        search = yf.Search(query=normalized, max_results=max_results, news_count=0)
        quotes = getattr(search, "quotes", []) or []
    except Exception:
        quotes = []

    for quote in quotes:
        symbol = quote.get("symbol")
        if not symbol:
            continue

        results.append(
            SearchResult(
                ticker=str(symbol).upper(),
                name=str(quote.get("shortname") or quote.get("longname") or symbol),
                exchange=quote.get("exchange") or quote.get("exchDisp"),
            )
        )

    # Fallback to direct ticker lookup when search yields no rows.
    if not results and normalized.isalpha() and len(normalized) <= 8:
        try:
            quote = fetch_quote(normalized)
            results.append(SearchResult(ticker=quote.ticker, name=quote.name, exchange=None))
        except ValueError:
            pass

    return results[:max_results]


def _first_float(payload: dict, keys: list[str]) -> float | None:
    for key in keys:
        if key not in payload:
            continue
        value = _to_float(payload.get(key))
        if value is not None:
            return value
    return None


def _first_str(payload: dict, keys: list[str]) -> str | None:
    for key in keys:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _to_float(value: object) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _download_day(ticker: str, for_date: date):
    start = for_date.isoformat()
    end = (for_date + timedelta(days=1)).isoformat()
    try:
        return yf.download(
            ticker,
            start=start,
            end=end,
            progress=False,
            auto_adjust=False,
            threads=False,
        )
    except Exception as exc:  # pragma: no cover - defensive wrapper over external dependency.
        raise ValueError(f"Failed to fetch market data for {ticker}: {exc}") from exc
