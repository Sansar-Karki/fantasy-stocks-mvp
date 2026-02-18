"use client";

import { useEffect, useState } from "react";

import { getMarketQuote, searchMarket } from "../../../lib/api";
import type { MarketQuote, MarketSearchResult } from "../../../lib/types";

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MarketSearchResult[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<MarketQuote | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const rows = await searchMarket(query, 8);
        setResults(rows);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  async function handleSelectTicker(ticker: string) {
    try {
      setQuoteLoading(true);
      const quote = await getMarketQuote(ticker);
      setSelectedQuote(quote);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quote");
    } finally {
      setQuoteLoading(false);
    }
  }

  return (
    <div className="container app-container phone-canvas">
      <header className="topbar">
        <div>
          <p className="muted">Stock Research</p>
          <h1>Explore</h1>
        </div>
      </header>

      <section className="sheet-card stack-sm">
        <label>
          Search Stocks
          <input
            type="text"
            placeholder="AAPL, TSLA, NVIDIA..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {searchLoading ? <p className="muted">Searching...</p> : null}
      </section>

      {error ? <p className="error card">{error}</p> : null}

      <section className="sheet-card">
        <div className="section-head">
          <h2>Results</h2>
          <span className="muted">{results.length}</span>
        </div>
        {results.length === 0 ? <p className="muted">Type a ticker or company name to search.</p> : null}
        <ul className="tx-list">
          {results.map((stock) => (
            <li key={stock.ticker} className="tx-item">
              <div>
                <strong>{stock.ticker}</strong>
                <p className="muted">
                  {stock.name}
                  {stock.exchange ? ` · ${stock.exchange}` : ""}
                </p>
              </div>
              <button className="button button-secondary" type="button" onClick={() => void handleSelectTicker(stock.ticker)}>
                View
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selectedQuote ? (
        <section className="sheet-card">
          <div className="section-head">
            <h2>{selectedQuote.ticker}</h2>
            <span className={
              selectedQuote.daily_change_percent !== null && selectedQuote.daily_change_percent < 0 ? "down" : "up"
            }>
              {selectedQuote.daily_change_percent !== null
                ? `${selectedQuote.daily_change_percent.toFixed(2)}%`
                : "-"}
            </span>
          </div>
          {quoteLoading ? <p className="muted">Loading quote...</p> : null}
          <ul className="tx-list">
            <li className="tx-item"><span>Name</span><strong>{selectedQuote.name}</strong></li>
            <li className="tx-item"><span>Price</span><strong>{formatMoney(selectedQuote.current_price)}</strong></li>
            <li className="tx-item"><span>Market Cap</span><strong>{formatCompactMoney(selectedQuote.market_cap)}</strong></li>
            <li className="tx-item"><span>Sector</span><strong>{selectedQuote.sector ?? "-"}</strong></li>
            <li className="tx-item"><span>P/E</span><strong>{formatNumber(selectedQuote.pe_ratio)}</strong></li>
            <li className="tx-item">
              <span>52W Range</span>
              <strong>{formatMoney(selectedQuote.fifty_two_week_low)} - {formatMoney(selectedQuote.fifty_two_week_high)}</strong>
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function formatMoney(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatCompactMoney(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function formatNumber(value: number | null): string {
  if (value === null) return "-";
  return value.toFixed(2);
}
