from fastapi.testclient import TestClient


def test_market_search_endpoint(client: TestClient, monkeypatch) -> None:
    from app.api import market as market_api
    from app.services.market_data import SearchResult

    monkeypatch.setattr(
        market_api,
        "search_tickers",
        lambda query, limit=8: [SearchResult(ticker="AAPL", name="Apple Inc.", exchange="NMS")],
    )

    response = client.get("/api/market/search", params={"q": "apple"})
    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["ticker"] == "AAPL"
    assert payload[0]["name"] == "Apple Inc."


def test_market_quote_endpoint(client: TestClient, monkeypatch) -> None:
    from app.api import market as market_api
    from app.services.market_data import QuoteResult

    monkeypatch.setattr(
        market_api,
        "fetch_quote",
        lambda ticker: QuoteResult(
            ticker=ticker.upper(),
            name="Apple Inc.",
            current_price=210.5,
            daily_change_percent=1.2,
            market_cap=3_200_000_000_000,
            sector="Technology",
            pe_ratio=31.1,
            fifty_two_week_high=237.2,
            fifty_two_week_low=164.1,
        ),
    )

    response = client.get("/api/market/AAPL")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ticker"] == "AAPL"
    assert payload["current_price"] == 210.5
