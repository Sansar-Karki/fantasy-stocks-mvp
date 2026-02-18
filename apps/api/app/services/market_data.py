from datetime import date, timedelta

import yfinance as yf


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
        try:
            return float(close_row)
        except (TypeError, ValueError):
            continue

    raise ValueError(f"No close price found for {normalized} near {on_date.isoformat()}")


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
