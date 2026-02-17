from datetime import date

import yfinance as yf


def fetch_close_price_for_date(ticker: str, on_date: date) -> float:
    start = on_date.isoformat()
    end = on_date.isoformat()
    data = yf.download(
        ticker,
        start=start,
        end=(on_date.fromordinal(on_date.toordinal() + 1)).isoformat(),
        progress=False,
        auto_adjust=False,
    )
    if data.empty:
        raise ValueError(f"No price data for {ticker} on {on_date.isoformat()}")

    close_value = data["Close"].iloc[-1]
    return float(close_value)
